import { randomUUID } from 'crypto';
import { pool } from '../src/config/database';

async function main() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [businessUnits]: any = await connection.execute(`SELECT id, organization_id FROM business_units WHERE code = 'CRAFT' AND is_active = 1 LIMIT 1`);
    if (!businessUnits.length) throw new Error('Business unit CRAFT tidak tersedia.');
    const craft = businessUnits[0];
    const [tables]: any = await connection.execute(`SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('printers', 'printer_maintenance_schedules', 'printer_maintenance_records', 'printer_issues', 'print_jobs', 'calendar_events', 'audit_logs')`);
    if (tables.length !== 7) throw new Error('Tabel Craft Printer canonical tidak lengkap.');
    const [views]: any = await connection.execute(`SELECT table_name FROM information_schema.views WHERE table_schema = DATABASE() AND table_name = 'v_printer_current_activity'`);
    if (views.length !== 1) throw new Error('View v_printer_current_activity tidak tersedia.');

    const token = randomUUID();
    const [created]: any = await connection.execute(`INSERT INTO printers (business_unit_id, code, name, printer_type, status_code, is_active) VALUES (?, ?, 'Rollback smoke printer', 'FDM', 'available', 1)`, [craft.id, `TMP-SMOKE-${token}`]);
    const printerId = Number(created.insertId);
    const [schedule]: any = await connection.execute(`INSERT INTO printer_maintenance_schedules (printer_id, maintenance_type, trigger_type, interval_value, next_due_at, is_active) VALUES (?, 'Nozzle cleanup', 'date', 30, DATE_ADD(NOW(), INTERVAL 30 DAY), 1)`, [printerId]);
    await connection.execute(`INSERT INTO printer_maintenance_records (printer_id, schedule_id, maintenance_type, performed_at, cost, print_hours_at_service) VALUES (?, ?, 'Nozzle cleanup', NOW(), 0, 0)`, [printerId, schedule.insertId]);
    const [issue]: any = await connection.execute(`INSERT INTO printer_issues (printer_id, issue_code, title, severity_code, status_code, reported_at) VALUES (?, ?, 'Rollback smoke issue', 'low', 'open', NOW())`, [printerId, `TMP-ISS-${token}`]);
    await connection.execute('UPDATE printer_issues SET issue_code = ? WHERE id = ?', [`ISS-${String(issue.insertId).padStart(6, '0')}`, issue.insertId]);
    await connection.execute(`INSERT INTO calendar_events (organization_id, business_unit_id, title, event_type, start_at, all_day, source_type, source_id) VALUES (?, ?, 'Rollback maintenance event', 'maintenance', NOW(), 1, 'printer_maintenance_schedule', ?)`, [craft.organization_id, craft.id, schedule.insertId]);
    const [readRows]: any = await connection.execute(`SELECT p.id, s.id AS schedule_id, i.id AS issue_id FROM printers p JOIN printer_maintenance_schedules s ON s.printer_id = p.id JOIN printer_issues i ON i.printer_id = p.id WHERE p.id = ? AND p.business_unit_id = ?`, [printerId, craft.id]);
    if (readRows.length !== 1) throw new Error('Kontrak relasi printer tidak sesuai.');
    await connection.rollback();
    console.log('Craft Printers smoke test passed (transaction rolled back; no sample printer persisted).');
  } catch (error) {
    await connection.rollback(); throw error;
  } finally { connection.release(); await pool.end(); }
}
void main().catch(error => { console.error('Craft Printers smoke test failed:', error instanceof Error ? error.message : error); process.exitCode = 1; });
