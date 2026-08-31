import { pool } from '../src/config/database';
import { calendarSourceSyncService } from '../src/shared/calendar/calendar-source-sync.service';

/** Reports deterministic source projection drift.  It is dry-run unless --apply is explicit. */
async function main() {
  const apply = process.argv.includes('--apply');
  const report = await calendarSourceSyncService.inspect();
  const summary = { mode: apply ? 'apply' : 'dry-run', missing_projection: report.missing.length, changed_projection: report.changed.length, stale_projection: report.stale.length, already_synced: report.already, ambiguous: 0 };
  console.log(JSON.stringify(summary, null, 2));
  if (apply) {
    const result = await calendarSourceSyncService.syncAll();
    console.log(JSON.stringify({ applied: result }, null, 2));
  }
}
main().catch(error => { console.error('[calendar:reconcile] failed:', error instanceof Error ? error.message : 'unknown error'); process.exitCode = 1; }).finally(async () => { await pool.end(); });
