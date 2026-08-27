import { randomUUID } from 'crypto';
import type { PoolConnection } from 'mysql2/promise';
import { AppError } from '../../shared/errors/AppError';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { studioEquipmentRepository } from './studio-equipment.repository';
import { assetReference, isAtOrBeforeNow, publishAssetEvent, toNumber, toSqlDate, toSqlDateTime, withEquipmentTransaction, writeAssetAudit } from './studio-equipment.shared';
import type { AssetAssignmentInput, AssetCreateInput, AssetMaintenanceInput, AssetUpdateInput, StudioAssetStatus } from './studio-equipment.types';

const blockingStatuses = new Set<StudioAssetStatus>(['maintenance', 'borrowed', 'retired', 'lost']);
const allowedTransitions: Record<StudioAssetStatus, StudioAssetStatus[]> = {
  available: ['maintenance', 'borrowed', 'lost', 'retired'],
  in_use: ['available', 'lost', 'retired'],
  maintenance: ['available', 'retired'],
  borrowed: ['available', 'lost', 'retired'],
  lost: ['available', 'retired'],
  retired: ['available'],
};

const normalizeText = (value?: string | null) => value?.trim() || null;
const money = (value?: number | null) => value === null || value === undefined ? null : Math.round(Number(value) * 100) / 100;
const assetValues = (asset: any) => ({
  name: asset.name, category: asset.category, brand: asset.brand, model: asset.model, serial_number: asset.serial_number,
  purchase_date: asset.purchase_date, purchase_cost: toNumber(asset.purchase_cost), current_book_value: toNumber(asset.current_book_value),
  depreciation_method: asset.depreciation_method, useful_life_months: asset.useful_life_months, location_name: asset.location_name,
  assigned_user_id: asset.assigned_user_id, notes: asset.notes,
});

export class StudioEquipmentService {
  private async requireAsset(assetId: number, studio: BusinessUnitContext, connection?: PoolConnection, lock = false) {
    const asset = await studioEquipmentRepository.getAsset(assetId, studio.id, connection, lock);
    if (!asset) throw new AppError(404, 'STUDIO_ASSET_NOT_FOUND', 'Aset Studio tidak ditemukan.');
    return asset;
  }

  private async validateCustodian(userId: number | null | undefined, studio: BusinessUnitContext, connection: PoolConnection) {
    if (!userId) return;
    if (!await studioEquipmentRepository.isValidCustodian(Number(userId), studio.organizationId, connection)) {
      throw new AppError(400, 'ASSET_CUSTODIAN_INVALID', 'Penanggung jawab harus merupakan pengguna internal aktif yang telah disetujui.');
    }
  }

  private async validateMaintenanceParty(partyId: number | null | undefined, studio: BusinessUnitContext, connection: PoolConnection) {
    if (!partyId) return;
    if (!await studioEquipmentRepository.isValidMaintenanceParty(Number(partyId), studio.organizationId, connection)) {
      throw new AppError(400, 'INVALID_MAINTENANCE_PARTY', 'Penyedia perawatan tidak ditemukan atau tidak aktif.');
    }
  }

  private async validateSerial(serial: string | null, studio: BusinessUnitContext, connection: PoolConnection, excludeAssetId?: number) {
    if (!serial) return;
    if (await studioEquipmentRepository.serialExists(serial, studio.id, excludeAssetId, connection)) {
      throw new AppError(409, 'ASSET_SERIAL_DUPLICATE', 'Nomor serial sudah digunakan oleh aset Studio aktif lainnya.');
    }
  }

  private async assignCode(connection: PoolConnection, assetId: number) {
    const assetCode = `AST-${String(assetId).padStart(6, '0')}`;
    await connection.execute('UPDATE assets SET asset_code = ? WHERE id = ?', [assetCode, assetId]);
    return assetCode;
  }

  async createAsset(input: AssetCreateInput, actorId: number, studio: BusinessUnitContext) {
    return withEquipmentTransaction(async connection => {
      const serial = normalizeText(input.serial_number); await this.validateCustodian(input.assigned_user_id, studio, connection); await this.validateSerial(serial, studio, connection);
      const purchaseCost = money(input.purchase_cost); const bookValue = input.current_book_value === undefined || input.current_book_value === null ? purchaseCost : money(input.current_book_value);
      const [result]: any = await connection.execute(
        `INSERT INTO assets (business_unit_id, asset_code, name, category, brand, model, serial_number, status_code, purchase_date, purchase_cost, current_book_value, depreciation_method, useful_life_months, location_name, assigned_user_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [studio.id, `TMP-${randomUUID()}`, input.name.trim(), input.category.trim(), normalizeText(input.brand), normalizeText(input.model), serial, input.initial_status || 'available', toSqlDate(input.purchase_date), purchaseCost, bookValue, normalizeText(input.depreciation_method), input.useful_life_months || null, normalizeText(input.location_name), input.assigned_user_id || null, normalizeText(input.notes)],
      );
      const id = Number(result.insertId); const assetCode = await this.assignCode(connection, id); const asset = { id, asset_code: assetCode };
      const values = { ...input, serial_number: serial, purchase_cost: purchaseCost, current_book_value: bookValue, status_code: input.initial_status || 'available' };
      await writeAssetAudit(connection, studio, actorId, 'studio.asset_create', asset, `Membuat aset ${assetCode}: ${input.name.trim()}.`, undefined, values);
      await publishAssetEvent(connection, studio, 'studio.asset.created', asset, actorId, { asset: { id, asset_code: assetCode, name: input.name.trim(), category: input.category.trim(), status_code: input.initial_status || 'available' } });
      return { id, asset_code: assetCode };
    });
  }

  async updateAsset(assetId: number, input: AssetUpdateInput, actorId: number, studio: BusinessUnitContext) {
    return withEquipmentTransaction(async connection => {
      const asset = await this.requireAsset(assetId, studio, connection, true);
      if (input.assigned_user_id !== undefined) await this.validateCustodian(input.assigned_user_id, studio, connection);
      const serial = input.serial_number !== undefined ? normalizeText(input.serial_number) : asset.serial_number;
      if (input.serial_number !== undefined) await this.validateSerial(serial, studio, connection, assetId);
      const columns: Record<string, unknown> = {};
      const set = (key: string, value: unknown) => { columns[key] = value; };
      if (input.name !== undefined) set('name', input.name.trim()); if (input.category !== undefined) set('category', input.category.trim());
      if (input.brand !== undefined) set('brand', normalizeText(input.brand)); if (input.model !== undefined) set('model', normalizeText(input.model)); if (input.serial_number !== undefined) set('serial_number', serial);
      if (input.purchase_date !== undefined) set('purchase_date', toSqlDate(input.purchase_date)); if (input.purchase_cost !== undefined) set('purchase_cost', money(input.purchase_cost)); if (input.current_book_value !== undefined) set('current_book_value', money(input.current_book_value));
      if (input.depreciation_method !== undefined) set('depreciation_method', normalizeText(input.depreciation_method)); if (input.useful_life_months !== undefined) set('useful_life_months', input.useful_life_months || null);
      if (input.location_name !== undefined) set('location_name', normalizeText(input.location_name)); if (input.assigned_user_id !== undefined) set('assigned_user_id', input.assigned_user_id || null); if (input.notes !== undefined) set('notes', normalizeText(input.notes));
      const entries = Object.entries(columns); if (!entries.length) throw new AppError(400, 'NO_ASSET_CHANGES', 'Tidak ada perubahan aset yang dikirim.');
      await connection.execute(`UPDATE assets SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`, [...entries.map(([, value]) => value), assetId] as any[]);
      const previous = Object.fromEntries(entries.map(([key]) => [key, (asset as any)[key]])); const ref = assetReference(asset);
      await writeAssetAudit(connection, studio, actorId, 'studio.asset_update', ref, `Memperbarui aset ${asset.asset_code}.`, previous, columns);
      if (input.assigned_user_id !== undefined && Number(asset.assigned_user_id || 0) !== Number(input.assigned_user_id || 0)) await writeAssetAudit(connection, studio, actorId, 'studio.asset_custodian_change', ref, `Mengubah penanggung jawab aset ${asset.asset_code}.`, { assigned_user_id: asset.assigned_user_id }, { assigned_user_id: input.assigned_user_id || null });
      await publishAssetEvent(connection, studio, 'studio.asset.updated', ref, actorId, { asset: { id: assetId, asset_code: asset.asset_code, changes: columns } });
      return { id: assetId };
    });
  }

  async changeStatus(assetId: number, target: StudioAssetStatus, reason: string | null | undefined, notes: string | null | undefined, actorId: number, studio: BusinessUnitContext) {
    return withEquipmentTransaction(async connection => {
      const asset = await this.requireAsset(assetId, studio, connection, true); const current = asset.status_code as StudioAssetStatus;
      if (current === target) throw new AppError(409, 'ASSET_STATUS_UNCHANGED', 'Status aset sudah sama.');
      if (target === 'in_use') throw new AppError(400, 'USE_ASSIGNMENT_ENDPOINT', 'Gunakan penugasan proyek untuk menandai aset sedang digunakan.');
      if (!(allowedTransitions[current] || []).includes(target)) throw new AppError(409, 'ASSET_STATUS_TRANSITION_INVALID', `Aset tidak dapat berpindah dari ${current} ke ${target}.`);
      if ((target === 'borrowed' || (current === 'retired' && target === 'available')) && !reason?.trim()) throw new AppError(400, 'STATUS_REASON_REQUIRED', 'Alasan wajib diisi untuk perubahan status ini.');
      if (target === 'lost' || target === 'retired') {
        const unresolved = await studioEquipmentRepository.hasUnresolvedAssignments(assetId, connection);
        if (unresolved.length) throw new AppError(409, 'ASSET_MAINTENANCE_REQUIRED_RESOLUTION', 'Selesaikan atau batalkan semua jadwal proyek aset sebelum menandai hilang/dipensiunkan.', unresolved);
      }
      const note = notes !== undefined ? normalizeText(notes) : asset.notes;
      await connection.execute('UPDATE assets SET status_code = ?, notes = ? WHERE id = ?', [target, note, assetId]); const ref = assetReference(asset);
      await writeAssetAudit(connection, studio, actorId, 'studio.asset_status_change', ref, `Status aset ${asset.asset_code}: ${current} → ${target}.`, { status_code: current }, { status_code: target, reason: normalizeText(reason), notes: note });
      await publishAssetEvent(connection, studio, 'studio.asset.status_changed', ref, actorId, { asset: { id: assetId, asset_code: asset.asset_code, old_status: current, status_code: target }, reason: normalizeText(reason) });
      return { id: assetId, status_code: target };
    });
  }

  async createAssignment(assetId: number, input: AssetAssignmentInput, actorId: number, studio: BusinessUnitContext) {
    return withEquipmentTransaction(async connection => {
      const asset = await this.requireAsset(assetId, studio, connection, true); const ref = assetReference(asset);
      if (blockingStatuses.has(asset.status_code as StudioAssetStatus)) {
        const code = asset.status_code === 'retired' ? 'ASSET_RETIRED' : asset.status_code === 'lost' ? 'ASSET_LOST' : 'STUDIO_ASSET_UNAVAILABLE';
        throw new AppError(409, code, `Aset berstatus ${asset.status_code} tidak dapat dijadwalkan untuk proyek.`);
      }
      if (asset.status_code === 'in_use' && !await studioEquipmentRepository.hasCurrentAssignment(assetId, connection)) throw new AppError(409, 'STUDIO_ASSET_UNAVAILABLE', 'Aset sedang digunakan di luar penugasan proyek dan belum dilepas.');
      const project = await studioEquipmentRepository.getProjectForAssignment(input.project_id, studio.id, connection);
      if (!project || !['approved', 'in_progress', 'review'].includes(project.status_code)) throw new AppError(400, 'ASSET_ASSIGNMENT_PROJECT_INVALID', 'Aset hanya dapat dijadwalkan ke proyek Studio yang disetujui, berjalan, atau direview.');
      const from = toSqlDateTime(input.assigned_from); const until = toSqlDateTime(input.assigned_until);
      if (!from) throw new AppError(400, 'INVALID_DATE', 'Waktu mulai penugasan tidak valid.');
      const conflict = await studioEquipmentRepository.findAssignmentConflict(assetId, from, until, connection);
      if (conflict) throw new AppError(409, 'ASSET_ASSIGNMENT_CONFLICT', `Aset sudah dijadwalkan untuk proyek ${conflict.project_code}.`, { project_code: conflict.project_code, project_name: conflict.project_name, assigned_from: conflict.assigned_from, assigned_until: conflict.assigned_until });
      const [result]: any = await connection.execute(`INSERT INTO asset_project_assignments (asset_id, project_id, assigned_from, assigned_until, assigned_by, notes) VALUES (?, ?, ?, ?, ?, ?)`, [assetId, input.project_id, from, until, actorId, normalizeText(input.notes)]);
      const assignmentId = Number(result.insertId); const immediate = isAtOrBeforeNow(from);
      if (immediate && asset.status_code === 'available') await connection.execute(`UPDATE assets SET status_code = 'in_use' WHERE id = ?`, [assetId]);
      await writeAssetAudit(connection, studio, actorId, 'studio.asset_assignment_create', ref, `Menjadwalkan aset ${asset.asset_code} ke proyek ${project.project_code}.`, undefined, { assignment_id: assignmentId, project_id: input.project_id, project_code: project.project_code, assigned_from: from, assigned_until: until, notes: normalizeText(input.notes) });
      await publishAssetEvent(connection, studio, 'studio.asset.assigned', ref, actorId, { asset: { id: assetId, asset_code: asset.asset_code }, assignment: { id: assignmentId, project_id: input.project_id, project_code: project.project_code, assigned_from: from, assigned_until: until } });
      return { id: assignmentId, asset_id: assetId, project_id: input.project_id, assigned_from: from, assigned_until: until };
    });
  }

  async returnAssignment(assignmentId: number, returnedAt: string | null | undefined, actorId: number, studio: BusinessUnitContext) {
    return withEquipmentTransaction(async connection => {
      const assignment = await studioEquipmentRepository.getAssignment(assignmentId, studio.id, connection, true);
      if (!assignment) throw new AppError(404, 'ASSET_ASSIGNMENT_NOT_FOUND', 'Penugasan aset tidak ditemukan.');
      const asset = await this.requireAsset(Number(assignment.asset_id), studio, connection, true); const ref = assetReference(asset);
      if (assignment.returned_at) throw new AppError(409, 'ASSET_ASSIGNMENT_ALREADY_RETURNED', 'Aset pada penugasan ini sudah dikembalikan.');
      if (!isAtOrBeforeNow(assignment.assigned_from)) throw new AppError(409, 'ASSET_ASSIGNMENT_NOT_STARTED', 'Jadwal yang belum dimulai harus dibatalkan, bukan dikembalikan.');
      const actual = toSqlDateTime(returnedAt) || new Date().toISOString().slice(0, 19).replace('T', ' ');
      if (new Date(`${actual}Z`).getTime() < new Date(assignment.assigned_from).getTime()) throw new AppError(400, 'INVALID_RETURN_TIME', 'Waktu pengembalian tidak boleh sebelum waktu mulai penugasan.');
      await connection.execute('UPDATE asset_project_assignments SET returned_at = ? WHERE id = ?', [actual, assignmentId]);
      if (asset.status_code === 'in_use' && !await studioEquipmentRepository.hasCurrentAssignment(asset.id, connection)) await connection.execute(`UPDATE assets SET status_code = 'available' WHERE id = ?`, [asset.id]);
      await writeAssetAudit(connection, studio, actorId, 'studio.asset_assignment_return', ref, `Menerima pengembalian aset ${asset.asset_code}.`, { assignment_id: assignmentId, returned_at: null }, { assignment_id: assignmentId, returned_at: actual });
      await publishAssetEvent(connection, studio, 'studio.asset.returned', ref, actorId, { asset: { id: asset.id, asset_code: asset.asset_code }, assignment: { id: assignmentId, returned_at: actual } });
      return { id: assignmentId, returned_at: actual, asset_status: asset.status_code === 'in_use' ? 'available' : asset.status_code };
    });
  }

  async cancelFutureAssignment(assignmentId: number, actorId: number, studio: BusinessUnitContext) {
    return withEquipmentTransaction(async connection => {
      const assignment = await studioEquipmentRepository.getAssignment(assignmentId, studio.id, connection, true);
      if (!assignment) throw new AppError(404, 'ASSET_ASSIGNMENT_NOT_FOUND', 'Penugasan aset tidak ditemukan.');
      if (assignment.returned_at) throw new AppError(409, 'ASSET_ASSIGNMENT_ALREADY_RETURNED', 'Penugasan yang sudah dikembalikan tidak dapat dibatalkan.');
      if (isAtOrBeforeNow(assignment.assigned_from)) throw new AppError(409, 'ASSET_ASSIGNMENT_NOT_STARTED', 'Penugasan yang sudah dimulai tidak dapat dihapus; gunakan pengembalian aset.');
      const asset = await this.requireAsset(Number(assignment.asset_id), studio, connection, true); const ref = assetReference(asset);
      await connection.execute('DELETE FROM asset_project_assignments WHERE id = ?', [assignmentId]);
      await writeAssetAudit(connection, studio, actorId, 'studio.asset_assignment_cancel', ref, `Membatalkan jadwal aset ${asset.asset_code}.`, { assignment_id: assignmentId, project_id: assignment.project_id, assigned_from: assignment.assigned_from }, undefined);
      return { id: assignmentId, cancelled: true };
    });
  }

  async startMaintenance(assetId: number, actorId: number, studio: BusinessUnitContext) {
    return withEquipmentTransaction(async connection => {
      const asset = await this.requireAsset(assetId, studio, connection, true); const ref = assetReference(asset);
      if (asset.status_code === 'maintenance') throw new AppError(409, 'ASSET_MAINTENANCE_ALREADY_ACTIVE', 'Aset sudah berada dalam perawatan.');
      if (await studioEquipmentRepository.hasCurrentAssignment(assetId, connection)) throw new AppError(409, 'ASSET_CURRENTLY_ASSIGNED', 'Aset sedang digunakan dalam proyek dan harus dikembalikan terlebih dahulu.');
      if (asset.status_code === 'retired') throw new AppError(409, 'ASSET_RETIRED', 'Aset yang dipensiunkan tidak dapat memulai perawatan normal.'); if (asset.status_code === 'lost') throw new AppError(409, 'ASSET_LOST', 'Aset hilang tidak dapat memulai perawatan.'); if (asset.status_code === 'borrowed' || asset.status_code === 'in_use') throw new AppError(409, 'STUDIO_ASSET_UNAVAILABLE', 'Aset belum tersedia untuk perawatan.');
      const future = await studioEquipmentRepository.hasUnresolvedAssignments(assetId, connection);
      await connection.execute(`UPDATE assets SET status_code = 'maintenance' WHERE id = ?`, [assetId]);
      await writeAssetAudit(connection, studio, actorId, 'studio.asset_maintenance_start', ref, `Memulai perawatan aset ${asset.asset_code}.`, { status_code: asset.status_code }, { status_code: 'maintenance', future_assignment_count: future.filter((row: any) => !isAtOrBeforeNow(row.assigned_from)).length });
      await publishAssetEvent(connection, studio, 'studio.asset.maintenance_started', ref, actorId, { asset: { id: assetId, asset_code: asset.asset_code }, future_assignment_count: future.filter((row: any) => !isAtOrBeforeNow(row.assigned_from)).length });
      return { id: assetId, status_code: 'maintenance', future_bookings: future.filter((row: any) => !isAtOrBeforeNow(row.assigned_from)).length };
    });
  }

  private async insertMaintenanceRecord(connection: PoolConnection, assetId: number, input: AssetMaintenanceInput) {
    const performedAt = toSqlDateTime(input.performed_at); const nextDue = toSqlDateTime(input.next_due_at);
    if (!performedAt) throw new AppError(400, 'INVALID_DATE', 'Waktu perawatan tidak valid.');
    const [result]: any = await connection.execute(`INSERT INTO asset_maintenance_records (asset_id, maintenance_type, performed_at, performed_by_party_id, cost, next_due_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`, [assetId, input.maintenance_type.trim(), performedAt, input.performed_by_party_id || null, money(input.cost) || 0, nextDue, normalizeText(input.notes)]);
    return { id: Number(result.insertId), performed_at: performedAt, next_due_at: nextDue };
  }

  async completeMaintenance(assetId: number, input: AssetMaintenanceInput, outcomeStatus: 'available' | 'retired' | 'lost' | undefined, actorId: number, studio: BusinessUnitContext) {
    return withEquipmentTransaction(async connection => {
      const asset = await this.requireAsset(assetId, studio, connection, true); const ref = assetReference(asset);
      if (asset.status_code !== 'maintenance') throw new AppError(409, 'ASSET_NOT_IN_MAINTENANCE', 'Aset tidak sedang dalam perawatan.');
      await this.validateMaintenanceParty(input.performed_by_party_id, studio, connection); const record = await this.insertMaintenanceRecord(connection, assetId, input); const target = outcomeStatus || 'available';
      await connection.execute('UPDATE assets SET status_code = ? WHERE id = ?', [target, assetId]);
      await writeAssetAudit(connection, studio, actorId, 'studio.asset_maintenance_complete', ref, `Menyelesaikan perawatan aset ${asset.asset_code}.`, { status_code: 'maintenance' }, { status_code: target, maintenance_record_id: record.id, ...input, performed_at: record.performed_at, next_due_at: record.next_due_at });
      await publishAssetEvent(connection, studio, 'studio.asset.maintenance_completed', ref, actorId, { asset: { id: assetId, asset_code: asset.asset_code, status_code: target }, maintenance_record: record });
      return { asset_id: assetId, status_code: target, ...record };
    });
  }

  async addHistoricalMaintenance(assetId: number, input: AssetMaintenanceInput, actorId: number, studio: BusinessUnitContext) {
    return withEquipmentTransaction(async connection => {
      const asset = await this.requireAsset(assetId, studio, connection, true); const ref = assetReference(asset); await this.validateMaintenanceParty(input.performed_by_party_id, studio, connection);
      const record = await this.insertMaintenanceRecord(connection, assetId, input);
      await writeAssetAudit(connection, studio, actorId, 'studio.asset_maintenance_record_create', ref, `Mencatat riwayat perawatan aset ${asset.asset_code}.`, undefined, { maintenance_record_id: record.id, ...input, performed_at: record.performed_at, next_due_at: record.next_due_at });
      return { asset_id: assetId, ...record };
    });
  }

  async updateMaintenanceRecord(assetId: number, recordId: number, input: Partial<AssetMaintenanceInput>, actorId: number, studio: BusinessUnitContext) {
    return withEquipmentTransaction(async connection => {
      const asset = await this.requireAsset(assetId, studio, connection, true); const record = await studioEquipmentRepository.getMaintenanceRecord(recordId, assetId, studio.id, connection, true);
      if (!record) throw new AppError(404, 'ASSET_MAINTENANCE_RECORD_NOT_FOUND', 'Riwayat perawatan tidak ditemukan.');
      if (input.performed_by_party_id !== undefined) await this.validateMaintenanceParty(input.performed_by_party_id, studio, connection);
      const performedAt = input.performed_at !== undefined ? toSqlDateTime(input.performed_at) : record.performed_at; const nextDue = input.next_due_at !== undefined ? toSqlDateTime(input.next_due_at) : record.next_due_at;
      if (nextDue && new Date(`${nextDue}Z`).getTime() <= new Date(`${performedAt}Z`).getTime()) throw new AppError(400, 'INVALID_MAINTENANCE_DUE', 'Jadwal berikutnya harus setelah waktu perawatan.');
      const columns: Record<string, unknown> = {};
      if (input.maintenance_type !== undefined) columns.maintenance_type = input.maintenance_type.trim(); if (input.performed_at !== undefined) columns.performed_at = performedAt;
      if (input.performed_by_party_id !== undefined) columns.performed_by_party_id = input.performed_by_party_id || null; if (input.cost !== undefined) columns.cost = money(input.cost) || 0;
      if (input.next_due_at !== undefined) columns.next_due_at = nextDue; if (input.notes !== undefined) columns.notes = normalizeText(input.notes);
      const entries = Object.entries(columns); if (!entries.length) throw new AppError(400, 'NO_MAINTENANCE_CHANGES', 'Tidak ada perubahan riwayat perawatan.');
      await connection.execute(`UPDATE asset_maintenance_records SET ${entries.map(([column]) => `${column} = ?`).join(', ')} WHERE id = ?`, [...entries.map(([, value]) => value), recordId] as any[]);
      await writeAssetAudit(connection, studio, actorId, 'studio.asset_maintenance_record_update', assetReference(asset), `Memperbarui riwayat perawatan aset ${asset.asset_code}.`, record, columns);
      return { id: recordId };
    });
  }

  getOverview(studio: BusinessUnitContext) { return studioEquipmentRepository.getOverview(studio.id); }
  listAssets(studio: BusinessUnitContext, filters: any) { return studioEquipmentRepository.listAssets(studio.id, filters); }
  async getAssetDetail(assetId: number, studio: BusinessUnitContext) { const result = await studioEquipmentRepository.getAssetDetail(assetId, studio.id); if (!result) throw new AppError(404, 'STUDIO_ASSET_NOT_FOUND', 'Aset Studio tidak ditemukan.'); return result; }
  async getAssignments(assetId: number, studio: BusinessUnitContext) { await this.getAssetDetail(assetId, studio); return studioEquipmentRepository.listAssetAssignments(assetId, studio.id); }
  async getMaintenance(assetId: number, studio: BusinessUnitContext) { await this.getAssetDetail(assetId, studio); return studioEquipmentRepository.listAssetMaintenance(assetId, studio.id); }
  async getActivity(assetId: number, studio: BusinessUnitContext) { await this.getAssetDetail(assetId, studio); return studioEquipmentRepository.listActivity(assetId, studio.id); }
  listAssignments(studio: BusinessUnitContext, filters: any) { return studioEquipmentRepository.listAssignments(studio.id, filters); }
  listMaintenance(studio: BusinessUnitContext, filters: any) { return studioEquipmentRepository.listMaintenance(studio.id, filters); }
  getReferences(studio: BusinessUnitContext) { return studioEquipmentRepository.getReferences(studio.id, studio.organizationId); }
  availability(studio: BusinessUnitContext, from: string, until: string, category?: string) { return studioEquipmentRepository.availableAssets(studio.id, from, until, category); }
}

export const studioEquipmentService = new StudioEquipmentService();
