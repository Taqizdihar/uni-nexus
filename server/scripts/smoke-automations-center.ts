import { pool } from '../src/config/database';
import { AppError } from '../src/shared/errors/AppError';
import { UsersService } from '../src/modules/users/users.service';
import { globalAutomationsService } from '../src/modules/automations/automations.service';

type ScopedRule = { id: number; workspace: 'craft' | 'studio'; status_code: string };

async function principalForGlobalAutomation() {
  const required = ['craft.automations.read', 'craft.automations.write', 'craft.automations.run', 'studio.automations.read'];
  const [rows]: any = await pool.execute(`SELECT u.id FROM users u
    JOIN user_roles ur ON ur.user_id=u.id JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id
    WHERE u.status_code='active' AND u.approval_status_code='approved' AND u.deleted_at IS NULL AND p.code IN (${required.map(() => '?').join(',')})
    GROUP BY u.id HAVING COUNT(DISTINCT p.code)=? LIMIT 1`, [...required, required.length]);
  if (!rows.length) throw new Error('Tidak ada pengguna aktif dengan izin smoke Pusat Otomasi yang lengkap.');
  const principal = await UsersService.getAuthPrincipal(Number(rows[0].id));
  if (!principal) throw new Error('Principal smoke tidak dapat dimuat.');
  return principal;
}

async function main() {
  let ruleId: number | null = null;
  try {
    const actor = await principalForGlobalAutomation();
    const meta = await globalAutomationsService.meta(actor);
    if (!meta.capabilities.craft.read || !meta.capabilities.craft.write || !meta.capabilities.studio.read) throw new Error('Capability Craft/Studio tidak dipetakan secara benar.');
    const catalog = await globalAutomationsService.catalog(actor, {});
    if (!catalog.some(item => item.workspace === 'craft') || !catalog.some(item => item.workspace === 'studio')) throw new Error('Katalog global tidak menggabungkan workspace terotorisasi.');
    const created = await globalAutomationsService.create(actor, 'craft', {
      name: 'Smoke Pusat Otomasi', description: 'Fixture sementara smoke global.', trigger_type: 'event', trigger_event: 'order.created', trigger_config_json: null, schedule_timezone: null,
      condition_json: null, action_json: { version: 1, actions: [{ type: 'notification.create', config: { severity: 'info', recipient_scope: 'workspace_broadcast', title_template: 'Smoke {{order.order_code}}', message_template: 'Dry run pusat otomasi.' } }] }, priority: 100, cooldown_seconds: 0, max_retries: 0,
    });
    ruleId = created.id;
    const listed = await globalAutomationsService.rules(actor, { workspace: 'craft', search: 'Smoke Pusat Otomasi' }) as { items: ScopedRule[] };
    if (!listed.items.some(item => item.id === ruleId && item.workspace === 'craft' && item.status_code === 'draft')) throw new Error('Rule draft global tidak ditemukan pada scope Craft.');
    const rule = await globalAutomationsService.rule(actor, ruleId) as { version_no: number };
    const dry = await globalAutomationsService.test(actor, ruleId, { input: { order: { id: 1, order_code: 'SMOKE', status_code: 'new' } } });
    if (dry.dry_run !== true) throw new Error('Dry-run global tidak ditandai aman.');
    await globalAutomationsService.update(actor, ruleId, { description: 'Fixture diperbarui.', expected_version: rule.version_no });
    let conflict = false;
    try { await globalAutomationsService.update(actor, ruleId, { description: 'Perubahan stale.', expected_version: rule.version_no }); }
    catch (error) { conflict = error instanceof AppError && error.code === 'AUTOMATION_VERSION_CONFLICT'; }
    if (!conflict) throw new Error('Optimistic concurrency tidak menolak versi stale.');
    const overview = await globalAutomationsService.overview(actor, { workspace: 'craft' });
    if (!overview.queue_health.note.includes('bukan status proses worker langsung')) throw new Error('Overview mengklaim status worker secara tidak aman.');
    console.log('Global Automations smoke passed: capability isolation, scoped aggregation, draft-first creation, dry-run, optimistic conflict, and non-fictional queue health.');
  } finally {
    if (ruleId) await pool.execute('DELETE FROM automation_runs WHERE rule_id=?', [ruleId]);
    if (ruleId) await pool.execute('DELETE FROM automation_rules WHERE id=?', [ruleId]);
    await pool.end();
  }
}

main().catch(error => { console.error(error); process.exit(1); });
