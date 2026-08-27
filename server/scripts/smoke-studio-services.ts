import { randomBytes } from 'node:crypto';
import { pool } from '../src/config/database';
import { getStudioBusinessUnit } from '../src/modules/studio-projects/studio-projects.helpers';
import { studioReferencesService } from '../src/modules/studio-references/studio-references.service';
import { studioServicesService } from '../src/modules/studio-services/studio-services.service';
import { studioClientService } from '../src/shared/party/studio-client.service';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const token = randomBytes(4).toString('hex').toUpperCase();

async function actorWithWrite() {
  const [rows]: any = await pool.execute(
    `SELECT DISTINCT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN role_permissions rp ON rp.role_id = ur.role_id JOIN permissions p ON p.id = rp.permission_id
     WHERE u.deleted_at IS NULL AND u.status_code = 'active' AND u.approval_status_code = 'approved' AND p.code = 'studio.services.write' LIMIT 1`,
  );
  assert(rows.length, 'No active user has studio.services.write.');
  return Number(rows[0].id);
}

async function createSmokeClient(studio: Awaited<ReturnType<typeof getStudioBusinessUnit>>) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const client = await studioClientService.createStudioClient(connection, { display_name: `Client Smoke Service ${token}`, party_kind: 'company', email: `smoke-${token.toLowerCase()}@example.test` }, studio);
    await connection.commit();
    return client.id;
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

async function run() {
  const studio = await getStudioBusinessUnit(); const userId = await actorWithWrite(); const clientId = await createSmokeClient(studio);
  let categoryId = 0; let serviceId = 0; let packageId = 0; let projectId = 0;
  try {
    const category = await studioServicesService.createCategory({ name: `Kategori Smoke ${token}`, code: `SMOKE_SERVICE_${token}`, is_active: true }, userId, studio);
    categoryId = category.id;
    const service = await studioServicesService.createService({ name: `Video Editing Smoke ${token}`, category_id: category.id, description: 'Fixture temporary untuk smoke test.', pricing_model: 'hourly', base_price: 250000, unit_label: 'jam', is_active: true }, userId, studio);
    serviceId = service.id;
    assert(service.code === `SVC-${String(service.id).padStart(6, '0')}`, 'Service code did not use the safe SVC-{ID} format.');
    const references = await studioReferencesService.getServices(studio);
    assert(references.some(row => Number(row.id) === serviceId), 'New active service is absent from Studio Project references.');

    const projectCode = `SMK-SVC-${token}`;
    const [projectResult]: any = await pool.execute(
      `INSERT INTO studio_projects (business_unit_id, project_code, client_party_id, project_name, status_code, priority_code, currency_code, contract_value)
       VALUES (?, ?, ?, ?, 'lead', 'normal', 'IDR', 0)`, [studio.id, projectCode, clientId, `Project snapshot ${token}`],
    );
    projectId = Number(projectResult.insertId);
    await pool.execute(
      `INSERT INTO studio_project_services (project_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 10, 250000, 2500000)`,
      [projectId, serviceId, 'Video Editing snapshot'],
    );
    await studioServicesService.updateService(serviceId, { base_price: 300000 }, userId, studio);
    const [snapshotRows]: any = await pool.execute('SELECT unit_price, line_total FROM studio_project_services WHERE project_id = ? AND service_id = ?', [projectId, serviceId]);
    assert(Number(snapshotRows[0]?.unit_price) === 250000 && Number(snapshotRows[0]?.line_total) === 2500000, 'Changing catalog price rewrote a Project snapshot.');

    const servicePackage = await studioServicesService.createPackage({ name: `Paket Smoke ${token}`, description: 'Fixture temporary.', package_price: 270000, is_active: true, items: [{ service_id: serviceId, quantity: 1, notes: 'One service only' }] }, userId, studio);
    packageId = servicePackage.id;
    assert(servicePackage.code === `PKG-${String(packageId).padStart(6, '0')}`, 'Package code did not use the safe PKG-{ID} format.');
    const packageDetail = await studioServicesService.getPackageDetail(packageId, studio);
    assert(packageDetail.package.items.length === 1 && packageDetail.package.reference_value === 300000, 'Package composition/reference value is incorrect.');
    await studioServicesService.updatePackage(packageId, { package_price: 260000, items: [{ service_id: serviceId, quantity: 2, notes: null }] }, userId, studio);
    const updatedPackage = await studioServicesService.getPackageDetail(packageId, studio);
    assert(updatedPackage.package.package_price === 260000 && updatedPackage.package.items[0].quantity === 2, 'Package update did not persist safely.');

    await studioServicesService.deactivatePackage(packageId, userId, studio);
    assert(!(await studioReferencesService.getServicePackages(studio)).some(row => Number(row.id) === packageId), 'Inactive package is still in active references.');
    await studioServicesService.activatePackage(packageId, userId, studio);
    await studioServicesService.deactivateService(serviceId, userId, studio);
    assert(!(await studioReferencesService.getServices(studio)).some(row => Number(row.id) === serviceId), 'Inactive service is still in active references.');
    await studioServicesService.activateService(serviceId, userId, studio);

    let duplicateRejected = false;
    try { await studioServicesService.updatePackage(packageId, { items: [{ service_id: serviceId, quantity: 1 }, { service_id: serviceId, quantity: 1 }] }, userId, studio); }
    catch (error: any) { duplicateRejected = error?.code === 'PACKAGE_SERVICE_DUPLICATE'; }
    assert(duplicateRejected, 'Duplicate package item validation did not reject the request.');
    await studioServicesService.deactivateCategory(categoryId, true, userId, studio);
    await studioServicesService.activateCategory(categoryId, userId, studio);
    console.log('Studio Services smoke test passed.');
  } finally {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (projectId) {
        await connection.execute('DELETE FROM studio_project_services WHERE project_id = ?', [projectId]);
        await connection.execute('DELETE FROM studio_projects WHERE id = ?', [projectId]);
      }
      if (packageId) {
        await connection.execute("DELETE FROM audit_logs WHERE module_code = 'studio_services' AND entity_type = 'service_package' AND entity_id = ?", [packageId]);
        await connection.execute("DELETE FROM domain_events WHERE module_code = 'studio_services' AND entity_type = 'service_package' AND entity_id = ?", [packageId]);
        await connection.execute('DELETE FROM service_packages WHERE id = ?', [packageId]);
      }
      if (serviceId) {
        await connection.execute("DELETE FROM audit_logs WHERE module_code = 'studio_services' AND entity_type = 'studio_service' AND entity_id = ?", [serviceId]);
        await connection.execute("DELETE FROM domain_events WHERE module_code = 'studio_services' AND entity_type = 'studio_service' AND entity_id = ?", [serviceId]);
        await connection.execute('DELETE FROM studio_services WHERE id = ?', [serviceId]);
      }
      if (categoryId) {
        await connection.execute("DELETE FROM audit_logs WHERE module_code = 'studio_services' AND entity_type = 'studio_service_category' AND entity_id = ?", [categoryId]);
        await connection.execute('DELETE FROM studio_service_categories WHERE id = ?', [categoryId]);
      }
      await connection.execute('DELETE FROM party_roles WHERE party_id = ?', [clientId]);
      await connection.execute('DELETE FROM parties WHERE id = ?', [clientId]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }
}

run().then(() => pool.end()).catch(async error => { console.error(error); await pool.end(); process.exit(1); });
