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
      case 'studio.project.deadline_approaching': {
        const [rows]: any = await executor.execute(`SELECT id,project_code,project_name,status_code,priority_code,deadline_at,contract_value,project_manager_user_id FROM studio_projects
          WHERE business_unit_id=? AND deleted_at IS NULL AND status_code NOT IN ('completed','paid','cancelled')
            AND deadline_at BETWEEN UTC_TIMESTAMP(3) AND DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 24 HOUR)`, [businessUnitId]);
        return rows.map((row: any) => ({ entityType: 'studio_project', entityId: Number(row.id), entityCode: row.project_code, context: { project: { id: Number(row.id), project_code: row.project_code, project_name: row.project_name, status_code: row.status_code, priority_code: row.priority_code, deadline_at: row.deadline_at, contract_value: Number(row.contract_value), project_manager_user_id: row.project_manager_user_id ? Number(row.project_manager_user_id) : null } } }));
      }
      case 'studio.project.overdue': {
        const [rows]: any = await executor.execute(`SELECT id,project_code,project_name,status_code,priority_code,deadline_at,contract_value,project_manager_user_id FROM studio_projects
          WHERE business_unit_id=? AND deleted_at IS NULL AND status_code NOT IN ('completed','paid','cancelled') AND deadline_at<UTC_TIMESTAMP(3)`, [businessUnitId]);
        return rows.map((row: any) => ({ entityType: 'studio_project', entityId: Number(row.id), entityCode: row.project_code, context: { project: { id: Number(row.id), project_code: row.project_code, project_name: row.project_name, status_code: row.status_code, priority_code: row.priority_code, deadline_at: row.deadline_at, contract_value: Number(row.contract_value), project_manager_user_id: row.project_manager_user_id ? Number(row.project_manager_user_id) : null } } }));
      }
      case 'studio.project.milestone_due': {
        const [rows]: any = await executor.execute(`SELECT pm.id milestone_id,pm.title milestone_title,pm.due_at,p.id,p.project_code,p.project_name,p.status_code,p.deadline_at FROM project_milestones pm
          JOIN studio_projects p ON p.id=pm.project_id WHERE p.business_unit_id=? AND p.deleted_at IS NULL AND p.status_code NOT IN ('completed','paid','cancelled')
          AND pm.status_code NOT IN ('completed','cancelled') AND pm.due_at BETWEEN UTC_TIMESTAMP(3) AND DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 24 HOUR)`, [businessUnitId]);
        return rows.map((row: any) => ({ entityType: 'studio_project', entityId: Number(row.id), entityCode: row.project_code, context: { project: { id: Number(row.id), project_code: row.project_code, project_name: row.project_name, status_code: row.status_code, deadline_at: row.deadline_at }, milestone: { id: Number(row.milestone_id), title: row.milestone_title, due_at: row.due_at } } }));
      }
      case 'studio.project.deliverable_overdue': {
        const [rows]: any = await executor.execute(`SELECT pd.id deliverable_id,pd.title deliverable_title,pd.due_at,p.id,p.project_code,p.project_name,p.status_code,p.deadline_at FROM project_deliverables pd
          JOIN studio_projects p ON p.id=pd.project_id WHERE p.business_unit_id=? AND p.deleted_at IS NULL AND p.status_code NOT IN ('completed','paid','cancelled')
          AND pd.status_code NOT IN ('approved','delivered') AND pd.due_at<UTC_TIMESTAMP(3)`, [businessUnitId]);
        return rows.map((row: any) => ({ entityType: 'studio_project', entityId: Number(row.id), entityCode: row.project_code, context: { project: { id: Number(row.id), project_code: row.project_code, project_name: row.project_name, status_code: row.status_code, deadline_at: row.deadline_at }, deliverable: { id: Number(row.deliverable_id), title: row.deliverable_title, due_at: row.due_at } } }));
      }
      case 'studio.quotation.expiring': {
        const [rows]: any = await executor.execute(`SELECT id,quotation_number,party_id,project_id,status_code,valid_until,total_amount,currency_code FROM quotations
          WHERE business_unit_id=? AND status_code='sent' AND valid_until BETWEEN UTC_DATE() AND DATE_ADD(UTC_DATE(), INTERVAL 3 DAY)`, [businessUnitId]);
        return rows.map((row: any) => ({ entityType: 'quotation', entityId: Number(row.id), entityCode: row.quotation_number, context: { quotation: { id: Number(row.id), quotation_number: row.quotation_number, party_id: Number(row.party_id), project_id: row.project_id ? Number(row.project_id) : null, status_code: row.status_code, valid_until: row.valid_until, total_amount: Number(row.total_amount), currency_code: row.currency_code } } }));
      }
      case 'studio.quotation.expired': {
        const [rows]: any = await executor.execute(`SELECT id,quotation_number,party_id,project_id,status_code,valid_until,total_amount,currency_code FROM quotations
          WHERE business_unit_id=? AND status_code='sent' AND valid_until<UTC_DATE()`, [businessUnitId]);
        return rows.map((row: any) => ({ entityType: 'quotation', entityId: Number(row.id), entityCode: row.quotation_number, context: { quotation: { id: Number(row.id), quotation_number: row.quotation_number, party_id: Number(row.party_id), project_id: row.project_id ? Number(row.project_id) : null, status_code: 'expired', valid_until: row.valid_until, total_amount: Number(row.total_amount), currency_code: row.currency_code } } }));
      }
      case 'studio.invoice.due_soon': {
        const [rows]: any = await executor.execute(`SELECT id,invoice_number,due_date,balance_due,total_amount,status_code,source_id FROM invoices
          WHERE business_unit_id=? AND status_code NOT IN ('draft','paid','void','refunded') AND balance_due>0 AND due_date BETWEEN UTC_DATE() AND DATE_ADD(UTC_DATE(), INTERVAL 3 DAY)`, [businessUnitId]);
        return rows.map((row: any) => ({ entityType: 'invoice', entityId: Number(row.id), entityCode: row.invoice_number, context: { invoice: { id: Number(row.id), invoice_code: row.invoice_number, due_date: row.due_date, outstanding_amount: Number(row.balance_due), total_amount: Number(row.total_amount), status_code: row.status_code, project_id: row.source_id ? Number(row.source_id) : null } } }));
      }
      case 'studio.invoice.overdue': {
        const [rows]: any = await executor.execute(`SELECT id,invoice_number,due_date,balance_due,total_amount,status_code,source_id FROM invoices
          WHERE business_unit_id=? AND status_code NOT IN ('draft','paid','void','refunded') AND balance_due>0 AND due_date<UTC_DATE()`, [businessUnitId]);
        return rows.map((row: any) => ({ entityType: 'invoice', entityId: Number(row.id), entityCode: row.invoice_number, context: { invoice: { id: Number(row.id), invoice_code: row.invoice_number, due_date: row.due_date, outstanding_amount: Number(row.balance_due), total_amount: Number(row.total_amount), status_code: row.status_code, project_id: row.source_id ? Number(row.source_id) : null } } }));
      }
      case 'studio.invoice.payment_schedule_due': {
        const [rows]: any = await executor.execute(`SELECT ips.id schedule_id,ips.label,ips.due_date,ips.amount,ips.paid_amount,i.id,i.invoice_number,i.balance_due,i.source_id FROM invoice_payment_schedules ips
          JOIN invoices i ON i.id=ips.invoice_id WHERE i.business_unit_id=? AND ips.status_code NOT IN ('paid','cancelled') AND ips.amount>ips.paid_amount AND ips.due_date<=DATE_ADD(UTC_DATE(), INTERVAL 1 DAY)`, [businessUnitId]);
        return rows.map((row: any) => ({ entityType: 'invoice', entityId: Number(row.id), entityCode: row.invoice_number, context: { invoice: { id: Number(row.id), invoice_code: row.invoice_number, outstanding_amount: Number(row.balance_due), project_id: row.source_id ? Number(row.source_id) : null }, payment_schedule: { id: Number(row.schedule_id), label: row.label, due_date: row.due_date, amount: Number(row.amount), paid_amount: Number(row.paid_amount) } } }));
      }
      case 'studio.asset.maintenance_due': {
        const [rows]: any = await executor.execute(`SELECT a.id,a.asset_code,a.name,a.status_code,m.next_due_at FROM assets a JOIN asset_maintenance_records m ON m.id=(SELECT lm.id FROM asset_maintenance_records lm WHERE lm.asset_id=a.id ORDER BY lm.performed_at DESC,lm.id DESC LIMIT 1)
          WHERE a.business_unit_id=? AND a.deleted_at IS NULL AND m.next_due_at<=DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 7 DAY)`, [businessUnitId]);
        return rows.map((row: any) => ({ entityType: 'asset', entityId: Number(row.id), entityCode: row.asset_code, context: { asset: { id: Number(row.id), asset_code: row.asset_code, name: row.name, status_code: row.status_code, next_due_at: row.next_due_at } } }));
      }
      case 'studio.asset.return_overdue': {
        const [rows]: any = await executor.execute(`SELECT apa.id assignment_id,apa.assigned_until,a.id,a.asset_code,a.name,a.status_code,p.id project_id,p.project_code FROM asset_project_assignments apa
          JOIN assets a ON a.id=apa.asset_id JOIN studio_projects p ON p.id=apa.project_id WHERE a.business_unit_id=? AND a.deleted_at IS NULL AND apa.returned_at IS NULL AND apa.assigned_until<UTC_TIMESTAMP(3)`, [businessUnitId]);
        return rows.map((row: any) => ({ entityType: 'asset', entityId: Number(row.id), entityCode: row.asset_code, context: { asset: { id: Number(row.id), asset_code: row.asset_code, name: row.name, status_code: row.status_code }, assignment: { id: Number(row.assignment_id), assigned_until: row.assigned_until, project_id: Number(row.project_id), project_code: row.project_code } } }));
      }
      default: return [];
    }
  }
}

export const automationSensorService = new AutomationSensorService();
