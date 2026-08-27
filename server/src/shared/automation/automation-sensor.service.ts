import { pool } from '../../config/database';

export interface SensorCandidate { entityType: string; entityId: number; entityCode?: string | null; context: Record<string, unknown>; }

/** Registered canonical-state sensors only. There is intentionally no user-supplied SQL path. */
export class AutomationSensorService {
  async candidates(eventName: string, businessUnitId: number, executor: any = pool): Promise<SensorCandidate[]> {
    switch (eventName) {
      case 'order.deadline_approaching': {
        const [rows]: any = await executor.execute(`SELECT id,order_code,status_code,order_type,priority_code,deadline_at,total_amount FROM craft_orders WHERE business_unit_id=? AND deleted_at IS NULL AND status_code NOT IN ('completed','packed','shipped','cancelled','returned') AND deadline_at BETWEEN UTC_TIMESTAMP() AND DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR)`, [businessUnitId]);
        return rows.map((row: any) => ({ entityType: 'craft_order', entityId: Number(row.id), entityCode: row.order_code, context: { order: { id: Number(row.id), order_code: row.order_code, status_code: row.status_code, order_type: row.order_type, priority: row.priority_code, deadline_at: row.deadline_at, total_amount: Number(row.total_amount) } } }));
      }
      case 'printer.maintenance_due': {
        const [rows]: any = await executor.execute(`SELECT p.id,p.code,p.name,p.status_code,s.next_due_at FROM printer_maintenance_schedules s JOIN printers p ON p.id=s.printer_id WHERE p.business_unit_id=? AND p.deleted_at IS NULL AND s.is_active=1 AND s.next_due_at IS NOT NULL AND s.next_due_at<=UTC_TIMESTAMP()`, [businessUnitId]);
        return rows.map((row: any) => ({ entityType: 'printer', entityId: Number(row.id), entityCode: row.code, context: { printer: { id: Number(row.id), code: row.code, name: row.name, status_code: row.status_code, next_due_at: row.next_due_at } } }));
      }
      case 'finance.customer_invoice_overdue': {
        const [rows]: any = await executor.execute(`SELECT id,invoice_number,due_date,balance_due FROM invoices WHERE business_unit_id=? AND status_code NOT IN ('paid','void','cancelled') AND balance_due>0 AND due_date<UTC_DATE()`, [businessUnitId]);
        return rows.map((row: any) => ({ entityType: 'invoice', entityId: Number(row.id), entityCode: row.invoice_number, context: { invoice: { id: Number(row.id), invoice_code: row.invoice_number, due_date: row.due_date, outstanding_amount: Number(row.balance_due) } } }));
      }
      case 'procurement.supplier_invoice_overdue': {
        const [rows]: any = await executor.execute(`SELECT id,supplier_invoice_number,due_date,balance_due FROM supplier_invoices WHERE business_unit_id=? AND status_code NOT IN ('paid','void','cancelled') AND balance_due>0 AND due_date<UTC_DATE()`, [businessUnitId]);
        return rows.map((row: any) => ({ entityType: 'supplier_invoice', entityId: Number(row.id), entityCode: row.supplier_invoice_number, context: { invoice: { id: Number(row.id), invoice_code: row.supplier_invoice_number, due_date: row.due_date, outstanding_amount: Number(row.balance_due) } } }));
      }
      default: return [];
    }
  }
}

export const automationSensorService = new AutomationSensorService();
