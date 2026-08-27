import { randomBytes } from 'node:crypto';
import { pool } from '../src/config/database';
import { studioEquipmentService } from '../src/modules/studio-equipment/studio-equipment.service';
import { studioProjectCommercialService } from '../src/modules/studio-projects/studio-project-commercial.service';
import { getStudioBusinessUnit } from '../src/modules/studio-projects/studio-projects.helpers';
import { studioClientService } from '../src/shared/party/studio-client.service';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const suffix = randomBytes(4).toString('hex').toUpperCase();
const utc = (offsetMinutes: number) => new Date(Date.now() + offsetMinutes * 60_000).toISOString().slice(0, 19);

async function actorWithWrite() {
  const [rows]: any = await pool.execute(
    `SELECT DISTINCT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id
     JOIN role_permissions rp ON rp.role_id = ur.role_id JOIN permissions p ON p.id = rp.permission_id
     WHERE u.deleted_at IS NULL AND u.status_code = 'active' AND u.approval_status_code = 'approved'
       AND p.code = 'studio.equipment.write' LIMIT 1`,
  );
  assert(rows.length, 'No active user has studio.equipment.write.');
  return Number(rows[0].id);
}

async function run() {
  const studio = await getStudioBusinessUnit(); const actor = await actorWithWrite(); let partyId = 0; let projectId = 0; let assetId = 0;
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const party = await studioClientService.createStudioClient(connection, { display_name: `Client Smoke Equipment ${suffix}`, party_kind: 'company', email: `smoke-equipment-${suffix.toLowerCase()}@example.test` }, studio);
      partyId = party.id;
      const [project]: any = await connection.execute(
        `INSERT INTO studio_projects (business_unit_id, project_code, client_party_id, project_name, status_code, priority_code, currency_code, contract_value)
         VALUES (?, ?, ?, ?, 'approved', 'normal', 'IDR', 0)`,
        [studio.id, `SMK-EQP-${suffix}`, partyId, `Project Smoke Equipment ${suffix}`],
      );
      projectId = Number(project.insertId); await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }

    const created = await studioEquipmentService.createAsset({ name: `Sony A7 IV Smoke ${suffix}`, category: 'Kamera', brand: 'Sony', model: 'A7 IV', serial_number: `SN-${suffix}`, location_name: 'Studio Utama', purchase_cost: 12_000_000, current_book_value: 8_000_000, depreciation_method: 'straight_line', purchase_date: '2025-01-01', useful_life_months: 36 }, actor, studio);
    assetId = created.id;
    assert(created.asset_code === `AST-${String(assetId).padStart(6, '0')}`, 'Asset code did not use safe AST-{ID} generation.');
    await studioEquipmentService.updateAsset(assetId, { assigned_user_id: actor }, actor, studio);
    const detail = await studioEquipmentService.getAssetDetail(assetId, studio);
    assert(detail.assigned_user_id === actor && detail.current_book_value === 8_000_000, 'Custodian or book value did not persist.');

    const active = await studioEquipmentService.createAssignment(assetId, { project_id: projectId, assigned_from: utc(-60), assigned_until: utc(120), notes: 'Fixture penugasan aktif.' }, actor, studio);
    let conflict = false;
    try { await studioEquipmentService.createAssignment(assetId, { project_id: projectId, assigned_from: utc(0), assigned_until: utc(180) }, actor, studio); } catch (error: any) { conflict = error?.code === 'ASSET_ASSIGNMENT_CONFLICT'; }
    assert(conflict, 'Overlapping assignment was not rejected.');
    const commercial = await studioProjectCommercialService.getSummary(projectId, studio.organizationId);
    assert(commercial.assets.some((asset: any) => Number(asset.asset_id) === assetId), 'Existing Project commercial asset integration cannot read the assignment.');
    await studioEquipmentService.returnAssignment(active.id, utc(0), actor, studio);

    const future = await studioEquipmentService.createAssignment(assetId, { project_id: projectId, assigned_from: utc(24 * 60), assigned_until: utc(25 * 60) }, actor, studio);
    const afterFuture = await studioEquipmentService.getAssetDetail(assetId, studio);
    assert(afterFuture.status_code === 'available', 'Future booking prematurely persisted the asset as in_use.');
    await studioEquipmentService.cancelFutureAssignment(future.id, actor, studio);

    const historical = await studioEquipmentService.addHistoricalMaintenance(assetId, { maintenance_type: 'Sensor Cleaning', performed_at: utc(-10 * 24 * 60), cost: 250_000, next_due_at: utc(-24 * 60), notes: 'Fixture perawatan historis.' }, actor, studio);
    const dueRecords = await studioEquipmentService.getMaintenance(assetId, studio);
    assert(dueRecords.some(record => record.id === historical.id && record.maintenance_state === 'overdue'), 'Overdue maintenance is not derived from the record.');
    await studioEquipmentService.startMaintenance(assetId, actor, studio);
    const completed = await studioEquipmentService.completeMaintenance(assetId, { maintenance_type: 'Sensor Cleaning', performed_at: utc(-5), cost: 250_000, next_due_at: utc(90 * 24 * 60) }, undefined, actor, studio);
    assert(completed.status_code === 'available', 'Completed maintenance did not return a healthy asset to available.');

    await studioEquipmentService.changeStatus(assetId, 'lost', 'Fixture kehilangan sementara.', null, actor, studio);
    let lostBlocked = false;
    try { await studioEquipmentService.createAssignment(assetId, { project_id: projectId, assigned_from: utc(60), assigned_until: utc(120) }, actor, studio); } catch (error: any) { lostBlocked = error?.code === 'ASSET_LOST'; }
    assert(lostBlocked, 'Lost asset was still assignable.');
    await studioEquipmentService.changeStatus(assetId, 'available', 'Ditemukan kembali.', null, actor, studio);
    await studioEquipmentService.changeStatus(assetId, 'retired', 'Fixture akhir masa manfaat.', null, actor, studio);
    const history = await studioEquipmentService.getAssignments(assetId, studio);
    assert(history.length > 0, 'Retiring an asset removed project history.');
    console.log('Studio Equipment smoke test passed.');
  } finally {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (assetId) {
        await connection.execute('DELETE FROM asset_project_assignments WHERE asset_id = ?', [assetId]);
        await connection.execute('DELETE FROM asset_maintenance_records WHERE asset_id = ?', [assetId]);
        await connection.execute("DELETE FROM audit_logs WHERE module_code = 'studio_equipment' AND entity_type = 'asset' AND entity_id = ?", [assetId]);
        await connection.execute("DELETE FROM domain_events WHERE module_code = 'studio_equipment' AND entity_type = 'asset' AND entity_id = ?", [assetId]);
        await connection.execute('DELETE FROM assets WHERE id = ?', [assetId]);
      }
      if (projectId) await connection.execute('DELETE FROM studio_projects WHERE id = ?', [projectId]);
      if (partyId) { await connection.execute('DELETE FROM party_roles WHERE party_id = ?', [partyId]); await connection.execute('DELETE FROM parties WHERE id = ?', [partyId]); }
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }
}

run().then(() => pool.end()).catch(async error => { console.error(error); await pool.end(); process.exit(1); });
