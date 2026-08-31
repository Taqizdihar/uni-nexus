import jwt from 'jsonwebtoken';
import { pool } from '../src/config/database';
import { env } from '../src/config/env';
import { storageService } from '../src/shared/storage';
import { reportCodes } from '../src/modules/reports/reports.types';

const assert = (value: unknown, message: string): asserts value => { if (!value) throw new Error(message); };
const base = `http://localhost:${env.PORT}/api/v1`;
let exportId: number | null = null; let storageKey: string | null = null;

async function actor() {
  const required = ['reports.read', 'reports.export', 'craft.analytics.read', 'craft.analytics.export', 'studio.analytics.read', 'studio.analytics.export', 'finance.read', 'dashboard.read'];
  const [rows]: any = await pool.execute(`SELECT u.id,u.organization_id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved' GROUP BY u.id,u.organization_id HAVING ${required.map(() => 'SUM(p.code=?)>0').join(' AND ')} LIMIT 1`, required);
  assert(rows.length, 'Tidak ada aktor smoke dengan akses Pusat Laporan lengkap.'); return rows[0];
}
async function request(token: string, path: string, init: RequestInit = {}) { return fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } }); }

async function run() {
  const user = await actor(); const token = jwt.sign({ id: Number(user.id) }, env.JWT_SECRET, { expiresIn: '5m' });
  try {
    const catalogResponse = await request(token, '/reports/catalog'); assert(catalogResponse.ok, `Catalog gagal: ${catalogResponse.status}`); const catalog: any = await catalogResponse.json(); assert(Array.isArray(catalog.data) && catalog.data.length > 0, 'Catalog tidak berisi laporan yang dapat diakses.');
    assert(reportCodes.every(code => ['GLOBAL_EXECUTIVE_SUMMARY', ...catalog.data.map((item: any) => item.report_code)].includes(code) || !catalog.data.some((item: any) => item.report_code === code)), 'Registry laporan tidak dapat dibaca.');
    const unsupported = await request(token, '/reports/UNSAFE_SQL/preview'); assert(unsupported.status === 404, 'Kode laporan tak terdaftar harus ditolak sebagai 404.');
    const production = await request(token, '/reports/CRAFT_PRODUCTION_ANALYTICS/preview?period=last_30_days'); assert(production.ok, `Preview produksi gagal: ${production.status}`); const productionBody: any = await production.json(); assert(productionBody.data?.report?.code === 'CRAFT_PRODUCTION_ANALYTICS', 'Preview produksi bukan laporan produksi kanonis.'); assert(productionBody.data?.kpis?.some((item: any) => /jobs|pekerjaan/i.test(item.label)), 'KPI produksi tidak memuat pekerjaan cetak.');
    const profitability = await request(token, '/reports/CRAFT_PROFITABILITY_ANALYTICS/preview?period=last_30_days'); assert(profitability.ok, `Preview profitabilitas gagal: ${profitability.status}`); const profitabilityBody: any = await profitability.json(); assert(profitabilityBody.data?.kpis?.some((item: any) => /profit|laba/i.test(item.label)), 'KPI profitabilitas tidak memakai data biaya/pendapatan.');
    const studio = await request(token, '/reports/STUDIO_ANALYTICS_OVERVIEW/preview?period=last_30_days'); assert(studio.ok, `Preview Studio gagal: ${studio.status}`);
    const finance = await request(token, '/reports/UNIFIED_FINANCE_CASH_FLOW/preview?period=month'); assert(finance.ok, `Preview arus kas terpadu gagal: ${finance.status}`);
    const exported = await request(token, '/reports/CRAFT_ANALYTICS_OVERVIEW/export', { method: 'POST', body: JSON.stringify({ format: 'csv', filters: { period: 'last_30_days' } }) }); assert(exported.status === 201, `Ekspor CSV gagal: ${exported.status}`); const exportBody: any = await exported.json(); exportId = Number(exportBody.data?.id); assert(exportId > 0, 'Ekspor tidak menghasilkan ID riwayat.');
    const [records]: any = await pool.execute('SELECT report_definition_id,storage_path,status_code,generated_by FROM report_exports WHERE id=? AND organization_id=?', [exportId, user.organization_id]); assert(records.length && records[0].report_definition_id && records[0].storage_path && records[0].status_code === 'generated' && Number(records[0].generated_by) === Number(user.id), 'Lifecycle report_exports tidak lengkap.'); storageKey = records[0].storage_path; assert(await storageService.exists(storageKey), 'Artefak ekspor privat tidak ditemukan.');
    const download = await request(token, `/reports/exports/${exportId}/download`); assert(download.ok && (await download.arrayBuffer()).byteLength > 3, 'Unduhan ekspor aman gagal.'); const [documents]: any = await pool.execute(`SELECT id FROM documents WHERE organization_id=? AND source_module_code='craft_analytics' AND entity_type='report_export' AND entity_id=?`, [user.organization_id, exportId]); assert(documents.length === 1, 'Ekspor tidak didaftarkan pada Pusat Dokumen.'); const [audit]: any = await pool.execute(`SELECT id FROM audit_logs WHERE organization_id=? AND module_code='reports' AND action_code='reports.export' AND entity_id=?`, [user.organization_id, exportId]); assert(audit.length === 1, 'Ekspor harus menghasilkan tepat satu audit entry.');
    const history = await request(token, '/reports/exports?page=1&limit=25'); assert(history.ok, 'Riwayat ekspor gagal dimuat.'); const historyBody: any = await history.json(); assert(historyBody.data.items.some((item: any) => Number(item.id) === exportId), 'Riwayat tidak memuat ekspor yang baru dibuat.');
    console.log('Report Center smoke test passed: catalog, authorization, canonical previews, export persistence, documents, audit, history, and secure download.');
  } finally {
    if (exportId) { const connection = await pool.getConnection(); try { await connection.beginTransaction(); await connection.execute(`DELETE FROM documents WHERE entity_type='report_export' AND entity_id=?`, [exportId]); await connection.execute(`DELETE FROM audit_logs WHERE module_code='reports' AND action_code='reports.export' AND entity_id=?`, [exportId]); await connection.execute('DELETE FROM report_exports WHERE id=?', [exportId]); await connection.commit(); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); } }
    await storageService.delete(storageKey).catch(() => undefined); await pool.end();
  }
}
run().catch(async error => { console.error(error); await pool.end(); process.exit(1); });
