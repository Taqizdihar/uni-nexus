import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';

type Executor = Pick<PoolConnection, 'execute'>;
export type SourceDocumentInput = {
  organizationId: number; businessUnitId?: number | null; sourceModuleCode: string; documentType: string;
  title: string; description?: string | null; fileName: string; storagePath: string; mimeType?: string | null;
  fileSizeBytes?: number | null; checksumSha256?: string | null; entityType: string; entityId: number; entityCode?: string | null;
  uploadedBy?: number | null;
};

const trim = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max) || null;
const sourceCode = (input: SourceDocumentInput) => `SRC-${trim(input.sourceModuleCode, 28)}-${trim(input.entityType, 20)}-${Number(input.entityId)}`.slice(0, 80);

/** Metadata-only registry. It never moves, copies, or deletes source-owned storage. */
export class DocumentRegistryService {
  async registerSourceDocument(input: SourceDocumentInput, connection: Executor = pool): Promise<number> {
    const code = sourceCode(input);
    const [current]: any = await connection.execute(
      `SELECT id FROM documents WHERE organization_id=? AND entity_type=? AND entity_id=? AND (source_module_code=? OR source_module_code IS NULL) ORDER BY source_module_code IS NULL, id DESC LIMIT 1 FOR UPDATE`,
      [input.organizationId, trim(input.entityType, 60), Number(input.entityId), trim(input.sourceModuleCode, 80)],
    );
    const values = [input.businessUnitId ?? null, code, trim(input.documentType, 60) || 'other', trim(input.sourceModuleCode, 80), trim(input.title, 220) || 'Dokumen', trim(input.description, 500), trim(input.fileName, 255) || 'file', trim(input.storagePath, 500), trim(input.mimeType, 120), input.fileSizeBytes ?? null, trim(input.checksumSha256, 64), trim(input.entityType, 60), Number(input.entityId), trim(input.entityCode, 120), input.uploadedBy ?? null];
    if (current.length) {
      await connection.execute(`UPDATE documents SET business_unit_id=?,document_code=?,document_type=?,source_module_code=?,title=?,description=?,file_name=?,storage_path=?,mime_type=?,file_size_bytes=?,checksum_sha256=?,entity_type=?,entity_id=?,entity_code=?,uploaded_by=?,archived_at=NULL,archived_by=NULL WHERE id=?`, [...values, current[0].id]);
      return Number(current[0].id);
    }
    const [result]: any = await connection.execute(`INSERT INTO documents (organization_id,business_unit_id,document_code,document_type,source_module_code,title,description,file_name,storage_path,mime_type,file_size_bytes,checksum_sha256,entity_type,entity_id,entity_code,version_no,is_template,uploaded_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`, [input.organizationId, ...values]);
    return Number(result.insertId);
  }

  updateSourceDocument(input: SourceDocumentInput, connection: Executor = pool) { return this.registerSourceDocument(input, connection); }

  async removeSourceDocument(organizationId: number, sourceModuleCode: string, entityType: string, entityId: number, connection: Executor = pool) {
    await connection.execute(`DELETE FROM documents WHERE organization_id=? AND source_module_code=? AND entity_type=? AND entity_id=?`, [organizationId, trim(sourceModuleCode, 80), trim(entityType, 60), Number(entityId)]);
  }

  async getSourceRegistryRecord(organizationId: number, sourceModuleCode: string, entityType: string, entityId: number, connection: Executor = pool) {
    const [rows]: any = await connection.execute(`SELECT * FROM documents WHERE organization_id=? AND source_module_code=? AND entity_type=? AND entity_id=? LIMIT 1`, [organizationId, trim(sourceModuleCode, 80), trim(entityType, 60), Number(entityId)]);
    return rows[0] || null;
  }
}
export const documentRegistryService = new DocumentRegistryService();
