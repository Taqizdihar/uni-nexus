import { pool } from '../../config/database';
import { jakartaDateStartUtc, utcDateTimeSql } from '../time/jakarta-time';
import { calendarRegistry, type CalendarSourceInput } from './calendar-registry.service';

type DbExecutor = { execute: (sql: string, values?: any[]) => Promise<[any, any]> };
type Projection = CalendarSourceInput & { staleKey?: string };

const datePart = (value: any) => typeof value === 'string' ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
const dayRange = (value: any) => { const start = jakartaDateStartUtc(datePart(value)); return { startAt: utcDateTimeSql(start), endAt: utcDateTimeSql(new Date(start.getTime() + 86_400_000)) }; };
const dateText = (value: any) => value == null ? '' : value instanceof Date ? utcDateTimeSql(value) : String(value).replace('T', ' ').slice(0, 23);
const sourceStatus = (status: any, completed: string[], cancelled: string[]) => cancelled.includes(String(status)) ? 'cancelled' as const : completed.includes(String(status)) ? 'completed' as const : 'scheduled' as const;
const sourceModules = ['craft_orders', 'craft_production', 'craft_printers', 'craft_procurement', 'craft_finance', 'studio_projects', 'studio_billing', 'studio_equipment'];

/**
 * Declarative, idempotent source projections. This is used both by the worker
 * for eventual consistency and by the explicit reconciliation command; it
 * never mutates source-domain data.
 */
export class CalendarSourceSyncService {
  private async collect(db: DbExecutor = pool): Promise<Projection[]> {
    const projections: Projection[] = [];
    const add = (value: Projection) => projections.push(value);
    const [orders]: any = await db.execute(`SELECT o.id,o.order_code,o.deadline_at,o.status_code,bu.organization_id,o.business_unit_id FROM craft_orders o JOIN business_units bu ON bu.id=o.business_unit_id WHERE o.deleted_at IS NULL AND o.deadline_at IS NOT NULL`);
    for (const row of orders) add({ organizationId: Number(row.organization_id), businessUnitId: Number(row.business_unit_id), sourceKey: `craft_order_deadline:${row.id}`, sourceModuleCode: 'craft_orders', sourceType: 'craft_order', sourceId: Number(row.id), sourceCode: row.order_code, title: `Tenggat pesanan ${row.order_code}`, eventType: 'order_deadline', startAt: row.deadline_at, allDay: false, statusCode: sourceStatus(row.status_code, ['completed', 'shipped'], ['cancelled', 'returned']) });

    const [jobs]: any = await db.execute(`SELECT pj.id,pj.job_code,pj.job_name,pj.scheduled_start_at,pj.estimated_finish_at,pj.status_code,bu.organization_id,pj.business_unit_id FROM print_jobs pj JOIN business_units bu ON bu.id=pj.business_unit_id WHERE pj.scheduled_start_at IS NOT NULL`);
    for (const row of jobs) add({ organizationId: Number(row.organization_id), businessUnitId: Number(row.business_unit_id), sourceKey: `print_job_schedule:${row.id}`, sourceModuleCode: 'craft_production', sourceType: 'print_job', sourceId: Number(row.id), sourceCode: row.job_code, title: `${row.job_code} - ${row.job_name}`, eventType: 'production', startAt: row.scheduled_start_at, endAt: row.estimated_finish_at, allDay: false, statusCode: sourceStatus(row.status_code, ['completed'], ['failed', 'cancelled']) });

    const [printerSchedules]: any = await db.execute(`SELECT s.id,s.maintenance_type,s.next_due_at,s.notes,p.code AS printer_code,p.name AS printer_name,bu.organization_id,p.business_unit_id FROM printer_maintenance_schedules s JOIN printers p ON p.id=s.printer_id JOIN business_units bu ON bu.id=p.business_unit_id WHERE s.is_active=1 AND s.trigger_type='date' AND s.next_due_at IS NOT NULL AND p.deleted_at IS NULL`);
    for (const row of printerSchedules) add({ organizationId: Number(row.organization_id), businessUnitId: Number(row.business_unit_id), sourceKey: `printer_maintenance:${row.id}`, sourceModuleCode: 'craft_printers', sourceType: 'printer_maintenance_schedule', sourceId: Number(row.id), sourceCode: row.printer_code, title: `Perawatan: ${row.printer_name} - ${row.maintenance_type}`, description: row.notes, eventType: 'maintenance', startAt: row.next_due_at, endAt: row.next_due_at, allDay: true });

    const [purchaseOrders]: any = await db.execute(`SELECT po.id,po.po_number,po.expected_date,po.status_code,bu.organization_id,po.business_unit_id FROM purchase_orders po JOIN business_units bu ON bu.id=po.business_unit_id WHERE po.expected_date IS NOT NULL`);
    for (const row of purchaseOrders) { const day = dayRange(row.expected_date); add({ organizationId: Number(row.organization_id), businessUnitId: Number(row.business_unit_id), sourceKey: `purchase_order_expected:${row.id}`, sourceModuleCode: 'craft_procurement', sourceType: 'purchase_order', sourceId: Number(row.id), sourceCode: row.po_number, title: `Perkiraan penerimaan ${row.po_number}`, eventType: 'other', ...day, allDay: true, statusCode: sourceStatus(row.status_code, ['received', 'closed'], ['cancelled']) }); }

    const [supplierInvoices]: any = await db.execute(`SELECT si.id,si.supplier_invoice_number,si.due_date,si.status_code,bu.organization_id,si.business_unit_id FROM supplier_invoices si JOIN business_units bu ON bu.id=si.business_unit_id WHERE si.due_date IS NOT NULL`);
    for (const row of supplierInvoices) { const day = dayRange(row.due_date); add({ organizationId: Number(row.organization_id), businessUnitId: Number(row.business_unit_id), sourceKey: `supplier_invoice_due:${row.id}`, sourceModuleCode: 'craft_procurement', sourceType: 'supplier_invoice', sourceId: Number(row.id), sourceCode: row.supplier_invoice_number, title: `Jatuh tempo tagihan pemasok ${row.supplier_invoice_number}`, eventType: 'payment', ...day, allDay: true, statusCode: sourceStatus(row.status_code, ['paid'], ['void']) }); }

    const [projects]: any = await db.execute(`SELECT p.id,p.project_code,p.project_name,p.deadline_at,p.status_code,bu.organization_id,p.business_unit_id FROM studio_projects p JOIN business_units bu ON bu.id=p.business_unit_id WHERE p.deleted_at IS NULL AND p.deadline_at IS NOT NULL`);
    for (const row of projects) add({ organizationId: Number(row.organization_id), businessUnitId: Number(row.business_unit_id), sourceKey: `studio_project_deadline:${row.id}`, sourceModuleCode: 'studio_projects', sourceType: 'studio_project', sourceId: Number(row.id), sourceCode: row.project_code, title: `Tenggat proyek ${row.project_code}: ${row.project_name}`, eventType: 'project_deadline', startAt: row.deadline_at, allDay: false, statusCode: sourceStatus(row.status_code, ['completed', 'paid'], ['cancelled']) });

    const [milestones]: any = await db.execute(`SELECT m.id,m.title,m.due_at,m.status_code,p.project_code,bu.organization_id,p.business_unit_id FROM project_milestones m JOIN studio_projects p ON p.id=m.project_id AND p.deleted_at IS NULL JOIN business_units bu ON bu.id=p.business_unit_id WHERE m.due_at IS NOT NULL`);
    for (const row of milestones) add({ organizationId: Number(row.organization_id), businessUnitId: Number(row.business_unit_id), sourceKey: `studio_milestone_due:${row.id}`, sourceModuleCode: 'studio_projects', sourceType: 'project_milestone', sourceId: Number(row.id), sourceCode: row.project_code, title: `Milestone ${row.project_code}: ${row.title}`, eventType: 'project_deadline', startAt: row.due_at, allDay: false, statusCode: sourceStatus(row.status_code, ['completed'], ['cancelled']) });

    const [deliverables]: any = await db.execute(`SELECT d.id,d.title,d.description,d.due_at,d.status_code,p.project_code,bu.organization_id,p.business_unit_id FROM project_deliverables d JOIN studio_projects p ON p.id=d.project_id AND p.deleted_at IS NULL JOIN business_units bu ON bu.id=p.business_unit_id WHERE d.due_at IS NOT NULL`);
    for (const row of deliverables) add({ organizationId: Number(row.organization_id), businessUnitId: Number(row.business_unit_id), sourceKey: `studio_deliverable_due:${row.id}`, sourceModuleCode: 'studio_projects', sourceType: 'project_deliverable', sourceId: Number(row.id), sourceCode: row.project_code, title: `Deliverable ${row.project_code}: ${row.title}`, description: row.description, eventType: 'project_deadline', startAt: row.due_at, allDay: false, statusCode: sourceStatus(row.status_code, ['approved', 'delivered'], []) });

    const [invoices]: any = await db.execute(`SELECT i.id,i.invoice_number,i.due_date,i.status_code,bu.code AS bu_code,i.organization_id,i.business_unit_id FROM invoices i JOIN business_units bu ON bu.id=i.business_unit_id WHERE i.due_date IS NOT NULL`);
    for (const row of invoices) { const day = dayRange(row.due_date); const studio = String(row.bu_code).toUpperCase() === 'STUDIO'; add({ organizationId: Number(row.organization_id), businessUnitId: Number(row.business_unit_id), sourceKey: `${studio ? 'studio' : 'craft'}_invoice_due:${row.id}`, sourceModuleCode: studio ? 'studio_billing' : 'craft_finance', sourceType: 'invoice', sourceId: Number(row.id), sourceCode: row.invoice_number, title: `Jatuh tempo invoice ${row.invoice_number}`, eventType: 'payment', ...day, allDay: true, statusCode: sourceStatus(row.status_code, ['paid'], ['void', 'refunded']) }); }

    const [schedules]: any = await db.execute(`SELECT ips.id,ips.label,ips.due_date,ips.status_code,i.invoice_number,bu.organization_id,i.business_unit_id FROM invoice_payment_schedules ips JOIN invoices i ON i.id=ips.invoice_id JOIN business_units bu ON bu.id=i.business_unit_id WHERE ips.due_date IS NOT NULL AND UPPER(bu.code)='STUDIO'`);
    for (const row of schedules) { const day = dayRange(row.due_date); add({ organizationId: Number(row.organization_id), businessUnitId: Number(row.business_unit_id), sourceKey: `studio_payment_schedule_due:${row.id}`, sourceModuleCode: 'studio_billing', sourceType: 'invoice_payment_schedule', sourceId: Number(row.id), sourceCode: row.invoice_number, title: `Termin ${row.label || ''} invoice ${row.invoice_number}`.trim(), eventType: 'payment', ...day, allDay: true, statusCode: sourceStatus(row.status_code, ['paid'], ['cancelled']) }); }

    const [equipment]: any = await db.execute(`SELECT mr.id,mr.maintenance_type,mr.next_due_at,a.asset_code,a.name,bu.organization_id,a.business_unit_id FROM asset_maintenance_records mr JOIN assets a ON a.id=mr.asset_id AND a.deleted_at IS NULL JOIN business_units bu ON bu.id=a.business_unit_id WHERE mr.next_due_at IS NOT NULL AND UPPER(bu.code)='STUDIO'`);
    for (const row of equipment) add({ organizationId: Number(row.organization_id), businessUnitId: Number(row.business_unit_id), sourceKey: `equipment_maintenance_due:${row.id}`, sourceModuleCode: 'studio_equipment', sourceType: 'asset_maintenance_record', sourceId: Number(row.id), sourceCode: row.asset_code, title: `Perawatan aset ${row.asset_code}: ${row.name}`, description: row.maintenance_type, eventType: 'maintenance', startAt: row.next_due_at, endAt: row.next_due_at, allDay: false });
    return projections;
  }

  async inspect(connection?: DbExecutor) {
    const db = connection || pool; const desired = await this.collect(db); const [existing]: any = await db.execute(`SELECT id,organization_id,source_key,title,start_at,end_at,status_code,deleted_at FROM calendar_events WHERE source_module_code IN (${sourceModules.map(() => '?').join(',')}) AND source_key IS NOT NULL`, sourceModules);
    const wanted = new Map<string, Projection>(desired.map(item => [`${item.organizationId}:${item.sourceKey}`, item])); const current = new Map<string, any>(existing.map((item: any) => [`${item.organization_id}:${item.source_key}`, item]));
    const missing = desired.filter(item => !current.has(`${item.organizationId}:${item.sourceKey}`)); const changed = desired.filter(item => { const row = current.get(`${item.organizationId}:${item.sourceKey}`); return row && (row.deleted_at || row.title !== item.title || dateText(row.start_at) !== dateText(item.startAt) || dateText(row.end_at) !== dateText(item.endAt) || row.status_code !== (item.statusCode || 'scheduled')); }); const already = desired.length - missing.length - changed.length; const stale = existing.filter((row: any) => !row.deleted_at && !wanted.has(`${row.organization_id}:${row.source_key}`));
    return { desired, missing, changed, stale, already };
  }

  async syncAll(connection?: DbExecutor) {
    const db = connection || pool; const inspection = await this.inspect(db); for (const item of inspection.desired) await calendarRegistry.upsertSourceEvent(item, db); for (const row of inspection.stale) await calendarRegistry.removeSourceEvent(Number(row.organization_id), row.source_key, null, db); return { upserted: inspection.desired.length, stale_removed: inspection.stale.length, already_synced: inspection.already };
  }
}
export const calendarSourceSyncService = new CalendarSourceSyncService();
