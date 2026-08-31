import assert from 'node:assert/strict';
import { pool } from '../src/config/database';
import { moduleReadPermissionFor } from '../src/shared/access/module-read-permissions';

async function main() {
  const requiredColumns = ['source_module_code','description','checksum_sha256','entity_code','archived_at','archived_by'];
  const [columns]: any = await pool.execute(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='documents'`);
  const available = new Set(columns.map((row: any) => row.COLUMN_NAME)); requiredColumns.forEach(column => assert(available.has(column), `documents.${column} is missing`));
  const [indexes]: any = await pool.execute(`SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='documents'`);
  const indexNames = new Set(indexes.map((row: any) => row.INDEX_NAME)); ['uq_documents_org_code_version','idx_documents_org_scope_archive_time','idx_documents_org_module_archive_time'].forEach(index => assert(indexNames.has(index), `documents.${index} is missing`));
  const [permissions]: any = await pool.execute(`SELECT code FROM permissions WHERE code IN ('documents.read','documents.write','documents.manage')`);
  assert.equal(permissions.length, 3, 'Document Center permissions are missing');
  assert.equal(moduleReadPermissionFor('studio_billing'), 'studio.billing.read'); assert.equal(moduleReadPermissionFor('craft_procurement'), 'craft.procurement.read'); assert.equal(moduleReadPermissionFor('documents'), 'documents.read');
  console.log('Documents smoke: PASS (schema/RBAC/access mapping verified; no fixture data written).');
}
main().catch(error => { console.error('Documents smoke: FAIL', error); process.exitCode = 1; }).finally(() => pool.end());
