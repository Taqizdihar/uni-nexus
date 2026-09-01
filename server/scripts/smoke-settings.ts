import jwt from 'jsonwebtoken';
import { pool } from '../src/config/database';
import { env } from '../src/config/env';

const assert: (value: unknown, message: string) => asserts value = (value, message) => { if (!value) throw new Error(message); };
const base = `http://localhost:${env.PORT}/api/v1`;

async function request(token: string, path: string, init: RequestInit = {}) {
  return fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
}

async function actor() {
  const [rows]: any = await pool.execute(`SELECT u.id,u.organization_id FROM users u WHERE u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved'
    AND EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=u.id AND p.code='settings.manage')
    AND EXISTS (SELECT 1 FROM user_business_units ubu JOIN business_units bu ON bu.id=ubu.business_unit_id WHERE ubu.user_id=u.id AND ubu.can_access=1 AND bu.organization_id=u.organization_id AND bu.code='CRAFT')
    AND EXISTS (SELECT 1 FROM user_business_units ubu JOIN business_units bu ON bu.id=ubu.business_unit_id WHERE ubu.user_id=u.id AND ubu.can_access=1 AND bu.organization_id=u.organization_id AND bu.code='STUDIO') LIMIT 1`);
  assert(rows.length, 'Tidak ada aktor smoke settings dengan settings.manage dan akses Craft/Studio.'); return rows[0];
}

async function run() {
  const user = await actor(); const token = jwt.sign({ id: Number(user.id) }, env.JWT_SECRET, { expiresIn: '5m' });
  const [auditBeforeRows]: any = await pool.execute('SELECT COALESCE(MAX(id),0) AS id FROM audit_logs'); const auditBefore = Number(auditBeforeRows[0].id);
  let original: any = null;
  try {
    const loaded = await request(token, '/settings'); assert(loaded.ok, `GET /settings gagal: ${loaded.status}`); const body: any = await loaded.json();
    assert(body.data?.organization?.code, 'Profil organisasi tidak dikembalikan.');
    original = body.data.settings.find((item: any) => item.scope === 'craft' && item.group === 'notifications' && item.key === 'order_deadline_warning_hours');
    assert(original, 'Registry Craft notification tidak dikembalikan.'); assert(original.value === 24 && original.source === 'default', 'Default Craft harus 24 tanpa override awal.');
    const rejected = await request(token, '/settings/groups/craft/unknown', { method: 'PATCH', body: JSON.stringify({ values: { arbitrary: true } }) }); assert(rejected.status === 404, 'Grup arbitrary harus ditolak.');
    const saved = await request(token, '/settings/groups/craft/notifications', { method: 'PATCH', body: JSON.stringify({ values: { order_deadline_warning_hours: 36 } }) }); assert(saved.ok, `PATCH pengaturan Craft gagal: ${saved.status}`); const savedBody: any = await saved.json(); const overridden = savedBody.data.settings.find((item: any) => item.scope === 'craft' && item.group === 'notifications' && item.key === 'order_deadline_warning_hours'); assert(overridden?.value === 36 && overridden.source === 'override', 'Override Craft tidak efektif.');
    const [rows]: any = await pool.execute(`SELECT COUNT(*) AS total FROM system_settings ss JOIN business_units bu ON bu.id=ss.business_unit_id WHERE ss.organization_id=? AND bu.code='CRAFT' AND ss.setting_group='notifications' AND ss.setting_key='order_deadline_warning_hours'`, [user.organization_id]); assert(Number(rows[0].total) === 1, 'Override harus tepat satu baris efektif.');
    const reset = await request(token, '/settings/groups/craft/notifications/order_deadline_warning_hours/reset', { method: 'POST', body: '{}' }); assert(reset.ok, `Reset pengaturan Craft gagal: ${reset.status}`); const resetBody: any = await reset.json(); const defaulted = resetBody.data.settings.find((item: any) => item.scope === 'craft' && item.group === 'notifications' && item.key === 'order_deadline_warning_hours'); assert(defaulted?.value === 24 && defaulted.source === 'default', 'Reset harus mengembalikan registry default.');
    console.log('Global Settings smoke: PASS (authenticated snapshot, closed registry rejection, scoped override, unique persistence, reset, and cleanup).');
  } finally {
    if (original?.source === 'override') await request(token, '/settings/groups/craft/notifications', { method: 'PATCH', body: JSON.stringify({ values: { order_deadline_warning_hours: original.value } }) }).catch(() => undefined);
    else await request(token, '/settings/groups/craft/notifications/order_deadline_warning_hours/reset', { method: 'POST', body: '{}' }).catch(() => undefined);
    await pool.execute('DELETE FROM audit_logs WHERE id>? AND module_code=\'settings\'', [auditBefore]).catch(() => undefined);
    await pool.end();
  }
}

run().catch(async error => { console.error('Global Settings smoke: FAIL', error); await pool.end(); process.exit(1); });
