import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AuditService } from '../../shared/audit/audit.service';
import { moduleReadPermissionFor, moduleReadPermissions } from '../../shared/access/module-read-permissions';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { storageService } from '../../shared/storage';

type Principal = { id: number; organization_id: number; permissions?: string[] };
type Filters = { page?: number; limit?: number; q?: string; document_type?: string; source_module_code?: string; business_unit_id?: number; uploaded_by?: number; from?: string; to?: string; archived?: boolean };
const text = (value: unknown, limit: number) => String(value ?? '').trim().slice(0, limit) || null;
const positive = (value: unknown) => { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; };
const isManual = (row: any) => row.source_module_code === 'documents';
const can = (user: Principal, permission: string) => (user.permissions || []).includes(permission);
const previewable = (mime?: string | null) => mime === 'application/pdf' || /^image\/(jpeg|png|webp)$/.test(String(mime || ''));
const jakartaBoundary = (value: string, end = false) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AppError(400, 'INVALID_DATE', 'Format tanggal harus YYYY-MM-DD.');
  const [year, month, day] = value.split('-').map(Number); return new Date(Date.UTC(year, month - 1, day, end ? 16 : -7, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0)).toISOString().slice(0, 23).replace('T', ' ');
};

/** Secure discovery and manual lifecycle service for the canonical documents registry. */
export class DocumentsService {
  private async accessible(id: number, user: Principal, lock = false) {
    const [rows]: any = await pool.execute(
      `SELECT d.*,bu.code AS business_unit_code,bu.name AS business_unit_name,u.full_name AS uploaded_by_name
       FROM documents d LEFT JOIN business_units bu ON bu.id=d.business_unit_id LEFT JOIN users u ON u.id=d.uploaded_by
       WHERE d.id=? AND d.organization_id=? AND (d.business_unit_id IS NULL OR EXISTS (SELECT 1 FROM user_business_units ubu WHERE ubu.user_id=? AND ubu.business_unit_id=d.business_unit_id AND ubu.can_access=1)) ${lock ? 'FOR UPDATE' : ''}`,
      [id, user.organization_id, user.id],
    );
    if (!rows.length || !this.sourceAllowed(rows[0], user)) throw new NotFoundError('Dokumen tidak ditemukan.');
    return rows[0];
  }

  private sourceAllowed(row: any, user: Principal) {
    if (isManual(row)) return true;
    const permission = moduleReadPermissionFor(row.source_module_code, row.business_unit_code);
    return permission ? can(user, permission) : can(user, 'documents.manage');
  }

  private dto(row: any) {
    return { id: Number(row.id), document_code: row.document_code, document_type: row.document_type, source_module_code: row.source_module_code,
      title: row.title, description: row.description, file_name: row.file_name, mime_type: row.mime_type, file_size_bytes: row.file_size_bytes == null ? null : Number(row.file_size_bytes), checksum_sha256: row.checksum_sha256,
      entity_type: row.entity_type, entity_id: row.entity_id == null ? null : Number(row.entity_id), entity_code: row.entity_code, version_no: Number(row.version_no), is_template: Boolean(row.is_template), archived_at: row.archived_at,
      created_at: row.created_at, updated_at: row.updated_at, previewable: previewable(row.mime_type), source_owned: !isManual(row),
      workspace: row.business_unit_id == null ? null : { id: Number(row.business_unit_id), code: row.business_unit_code, name: row.business_unit_name },
      uploaded_by: row.uploaded_by == null ? null : { id: Number(row.uploaded_by), name: row.uploaded_by_name || 'Pengguna' },
    };
  }

  private scopeSql(user: Principal) {
    const allowed = Object.entries(moduleReadPermissions).filter(([, permission]) => can(user, permission)).map(([code]) => code);
    // documents.read is required by routing middleware, but keep manual rows explicit.
    if (!allowed.includes('documents')) allowed.push('documents');
    const known = allowed.length ? `d.source_module_code IN (${allowed.map(() => '?').join(',')})` : '0';
    return { sql: `(${known}${can(user, 'documents.manage') ? ' OR d.source_module_code IS NULL OR d.source_module_code NOT IN (' + Object.keys(moduleReadPermissions).map(() => '?').join(',') + ')' : ''})`, params: can(user, 'documents.manage') ? [...allowed, ...Object.keys(moduleReadPermissions)] : allowed };
  }

  private listWhere(user: Principal, filters: Filters) {
    const scope = this.scopeSql(user); const where = ['d.organization_id=?', '(d.business_unit_id IS NULL OR EXISTS (SELECT 1 FROM user_business_units ubu WHERE ubu.user_id=? AND ubu.business_unit_id=d.business_unit_id AND ubu.can_access=1))', scope.sql, '(d.document_code IS NULL OR d.version_no=(SELECT MAX(v.version_no) FROM documents v WHERE v.organization_id=d.organization_id AND v.document_code=d.document_code))'];
    const params: any[] = [user.organization_id, user.id, ...scope.params];
    where.push(filters.archived ? 'd.archived_at IS NOT NULL' : 'd.archived_at IS NULL');
    if (filters.q) { where.push('(d.title LIKE ? OR d.document_code LIKE ? OR d.file_name LIKE ? OR d.entity_code LIKE ?)'); const q = `%${text(filters.q, 120)}%`; params.push(q, q, q, q); }
    if (filters.document_type) { where.push('d.document_type=?'); params.push(text(filters.document_type, 60)); }
    if (filters.source_module_code) { where.push('d.source_module_code=?'); params.push(text(filters.source_module_code, 80)); }
    if (filters.business_unit_id === ('global' as any)) where.push('d.business_unit_id IS NULL');
    else if (positive(filters.business_unit_id)) { where.push('d.business_unit_id=?'); params.push(positive(filters.business_unit_id)); }
    if (positive(filters.uploaded_by)) { where.push('d.uploaded_by=?'); params.push(positive(filters.uploaded_by)); }
    if (filters.from) { where.push('d.created_at>=?'); params.push(jakartaBoundary(filters.from)); }
    if (filters.to) { where.push('d.created_at<=?'); params.push(jakartaBoundary(filters.to, true)); }
    return { where: where.join(' AND '), params };
  }

  async list(user: Principal, filters: Filters) {
    const page = Math.max(1, Math.min(100000, Number(filters.page) || 1)); const limit = Math.max(1, Math.min(100, Number(filters.limit) || 25)); const { where, params } = this.listWhere(user, filters);
    const [rows]: any = await pool.execute(`SELECT d.*,bu.code AS business_unit_code,bu.name AS business_unit_name,u.full_name AS uploaded_by_name FROM documents d LEFT JOIN business_units bu ON bu.id=d.business_unit_id LEFT JOIN users u ON u.id=d.uploaded_by WHERE ${where} ORDER BY d.updated_at DESC,d.id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params);
    const [countRows]: any = await pool.execute(`SELECT COUNT(*) AS total FROM documents d WHERE ${where}`, params);
    const total = Number(countRows[0].total); return { items: rows.map((row: any) => this.dto(row)), pagination: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async get(id: number, user: Principal) { return this.dto(await this.accessible(id, user)); }

  private async assertScope(user: Principal, businessUnitId?: number | null, requireManageForGlobal = true) {
    if (businessUnitId == null) { if (requireManageForGlobal && !can(user, 'documents.manage')) throw new AppError(403, 'DOCUMENT_GLOBAL_MANAGE_REQUIRED', 'Izin documents.manage diperlukan untuk dokumen global.'); return null; }
    const [rows]: any = await pool.execute(`SELECT id FROM business_units WHERE id=? AND organization_id=? AND is_active=1 AND EXISTS (SELECT 1 FROM user_business_units ubu WHERE ubu.user_id=? AND ubu.business_unit_id=business_units.id AND ubu.can_access=1)`, [businessUnitId, user.organization_id, user.id]);
    if (!rows.length) throw new NotFoundError('Workspace dokumen tidak ditemukan.'); return Number(businessUnitId);
  }

  async create(user: Principal, input: { title?: string; description?: string; document_type?: string; business_unit_id?: number | null }, file: Express.Multer.File) {
    const scope = await this.assertScope(user, positive(input.business_unit_id) ?? null); const saved = await storageService.saveUploadedFile('generic_document', file); const connection = await pool.getConnection();
    try { await connection.beginTransaction(); const [result]: any = await connection.execute(`INSERT INTO documents (organization_id,business_unit_id,document_code,document_type,source_module_code,title,description,file_name,storage_path,mime_type,file_size_bytes,checksum_sha256,version_no,is_template,uploaded_by) VALUES (?,?,NULL,?,'documents',?,?,?,?,?,?,?,1,0,?)`, [user.organization_id, scope, text(input.document_type, 60) || 'other', text(input.title, 220) || saved.original_name, text(input.description, 500), saved.original_name, saved.key, saved.mime_type, saved.size_bytes, saved.checksum_sha256, user.id]); const id = Number(result.insertId); const documentCode = `DOC-${String(id).padStart(6, '0')}`; await connection.execute('UPDATE documents SET document_code=? WHERE id=?', [documentCode, id]); await AuditService.write({ organizationId: user.organization_id, businessUnitId: scope, userId: user.id, moduleCode: 'documents', actionCode: 'documents.create', entityType: 'document', entityId: id, entityCode: documentCode, description: 'Mengunggah dokumen manual.', newValues: { document_type: text(input.document_type, 60) || 'other', file_name: saved.original_name, checksum_sha256: saved.checksum_sha256 } }, connection); await connection.commit(); return this.get(id, user); } catch (error) { await connection.rollback(); await storageService.delete(saved.key); throw error; } finally { connection.release(); }
  }

  async update(id: number, user: Principal, input: { title?: string; description?: string | null; document_type?: string }) {
    const row = await this.accessible(id, user); if (!isManual(row)) throw new AppError(409, 'SOURCE_DOCUMENT_READ_ONLY', 'Dokumen milik modul sumber hanya dapat diubah dari modul asalnya.'); if (!can(user, 'documents.write')) throw new AppError(403, 'FORBIDDEN', 'Izin documents.write diperlukan.'); await this.assertScope(user, row.business_unit_id, true);
    const title = input.title === undefined ? row.title : text(input.title, 220); if (!title) throw new AppError(400, 'DOCUMENT_TITLE_REQUIRED', 'Judul dokumen wajib diisi.'); const description = input.description === undefined ? row.description : text(input.description, 500); const type = input.document_type === undefined ? row.document_type : text(input.document_type, 60); if (!type) throw new AppError(400, 'DOCUMENT_TYPE_REQUIRED', 'Jenis dokumen wajib diisi.');
    const connection = await pool.getConnection(); try { await connection.beginTransaction(); await connection.execute(`UPDATE documents SET title=?,description=?,document_type=? WHERE organization_id=? AND document_code=? AND source_module_code='documents'`, [title, description, type, user.organization_id, row.document_code]); await AuditService.write({ organizationId: user.organization_id, businessUnitId: row.business_unit_id, userId: user.id, moduleCode: 'documents', actionCode: 'documents.update', entityType: 'document', entityId: id, entityCode: row.document_code, description: 'Memperbarui metadata dokumen manual.', oldValues: { title: row.title, description: row.description, document_type: row.document_type }, newValues: { title, description, document_type: type } }, connection); await connection.commit(); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); } return this.get(id, user);
  }

  async addVersion(id: number, user: Principal, file: Express.Multer.File) {
    const initial = await this.accessible(id, user); if (!isManual(initial)) throw new AppError(409, 'SOURCE_DOCUMENT_READ_ONLY', 'Versi hanya tersedia untuk dokumen manual.'); if (!can(user, 'documents.write')) throw new AppError(403, 'FORBIDDEN', 'Izin documents.write diperlukan.'); await this.assertScope(user, initial.business_unit_id, true);
    const saved = await storageService.saveUploadedFile('generic_document', file); const connection = await pool.getConnection();
    try { await connection.beginTransaction(); const [versions]: any = await connection.execute(`SELECT * FROM documents WHERE organization_id=? AND document_code=? FOR UPDATE`, [user.organization_id, initial.document_code]); if (!versions.length || versions.some((row: any) => row.source_module_code !== 'documents')) throw new NotFoundError('Dokumen tidak ditemukan.'); const latest = versions.reduce((best: any, row: any) => Number(row.version_no) > Number(best.version_no) ? row : best, versions[0]); const next = Number(latest.version_no) + 1; const [inserted]: any = await connection.execute(`INSERT INTO documents (organization_id,business_unit_id,document_code,document_type,source_module_code,title,description,file_name,storage_path,mime_type,file_size_bytes,checksum_sha256,entity_type,entity_id,entity_code,version_no,is_template,uploaded_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)`, [user.organization_id, latest.business_unit_id, latest.document_code, latest.document_type, 'documents', latest.title, latest.description, saved.original_name, saved.key, saved.mime_type, saved.size_bytes, saved.checksum_sha256, latest.entity_type, latest.entity_id, latest.entity_code, next, user.id]); const newId = Number(inserted.insertId); await AuditService.write({ organizationId: user.organization_id, businessUnitId: latest.business_unit_id, userId: user.id, moduleCode: 'documents', actionCode: 'documents.version_create', entityType: 'document', entityId: newId, entityCode: latest.document_code, description: `Menambahkan versi ${next} dokumen manual.`, newValues: { version_no: next, file_name: saved.original_name, checksum_sha256: saved.checksum_sha256 } }, connection); await connection.commit(); return this.get(newId, user); } catch (error: any) { await connection.rollback(); await storageService.delete(saved.key); if (error?.code === 'ER_DUP_ENTRY') throw new AppError(409, 'DOCUMENT_VERSION_CONFLICT', 'Versi dokumen berubah bersamaan. Silakan unggah ulang.'); throw error; } finally { connection.release(); }
  }

  async versions(id: number, user: Principal) { const row = await this.accessible(id, user); const [rows]: any = await pool.execute(`SELECT d.*,bu.code AS business_unit_code,bu.name AS business_unit_name,u.full_name AS uploaded_by_name FROM documents d LEFT JOIN business_units bu ON bu.id=d.business_unit_id LEFT JOIN users u ON u.id=d.uploaded_by WHERE d.organization_id=? AND d.document_code=? ORDER BY d.version_no DESC,d.id DESC`, [user.organization_id, row.document_code]); return rows.filter((item: any) => this.sourceAllowed(item, user)).map((item: any) => this.dto(item)); }

  async archive(id: number, user: Principal, restore = false) { const row = await this.accessible(id, user); if (!isManual(row)) throw new AppError(409, 'SOURCE_DOCUMENT_READ_ONLY', 'Dokumen milik modul sumber tidak dapat diarsipkan di Pusat Dokumen.'); if (!can(user, 'documents.manage')) throw new AppError(403, 'FORBIDDEN', 'Izin documents.manage diperlukan.'); const connection = await pool.getConnection(); try { await connection.beginTransaction(); await connection.execute(`UPDATE documents SET archived_at=${restore ? 'NULL' : 'UTC_TIMESTAMP(3)'},archived_by=? WHERE organization_id=? AND document_code=? AND source_module_code='documents'`, [restore ? null : user.id, user.organization_id, row.document_code]); await AuditService.write({ organizationId: user.organization_id, businessUnitId: row.business_unit_id, userId: user.id, moduleCode: 'documents', actionCode: restore ? 'documents.restore' : 'documents.archive', entityType: 'document', entityId: id, entityCode: row.document_code, description: restore ? 'Memulihkan dokumen manual.' : 'Mengarsipkan seluruh versi dokumen manual.' }, connection); await connection.commit(); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); } return this.get(id, user); }

  async summary(user: Principal) { const active = await this.list(user, { page: 1, limit: 1 }); const archived = await this.list(user, { page: 1, limit: 1, archived: true }); return { active: active.pagination.total, archived: archived.pagination.total, total: active.pagination.total + archived.pagination.total }; }
  async meta(user: Principal) { const [workspaces]: any = await pool.execute(`SELECT b.id,b.code,b.name FROM business_units b WHERE b.organization_id=? AND EXISTS (SELECT 1 FROM user_business_units ubu WHERE ubu.user_id=? AND ubu.business_unit_id=b.id AND ubu.can_access=1) ORDER BY b.name`, [user.organization_id, user.id]); return { document_types: ['invoice','quotation','receipt','report','purchase_order','contract','design','deliverable','attachment','other'], source_modules: Object.keys(moduleReadPermissions).filter(code => code === 'documents' || can(user, moduleReadPermissions[code])), workspaces }; }
  async stream(id: number, user: Principal, mode: 'preview' | 'download', res: any) { const row = await this.accessible(id, user); if (mode === 'preview' && !previewable(row.mime_type)) throw new AppError(409, 'DOCUMENT_PREVIEW_UNSUPPORTED', 'Jenis dokumen ini hanya dapat diunduh.'); if (!await storageService.exists(row.storage_path)) throw new NotFoundError('File tidak ditemukan pada penyimpanan aman.'); await storageService.streamToResponse(res, row.storage_path, { filename: row.file_name, mimeType: row.mime_type || undefined, disposition: mode === 'preview' ? 'inline' : 'attachment' }); }
}
export const documentsService = new DocumentsService();
