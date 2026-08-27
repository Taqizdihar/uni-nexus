export type AutomationFieldType = 'string' | 'number' | 'date' | 'boolean' | 'enum';

export interface AutomationConditionField {
  field: string;
  label: string;
  type: AutomationFieldType;
  values?: string[];
}

export interface AutomationEventDefinition {
  code: string;
  label: string;
  module: string;
  description: string;
  triggerType: 'event' | 'sensor' | 'manual' | 'schedule';
  entityType: string;
  fields: AutomationConditionField[];
  recommendedActions: string[];
}

const orderFields: AutomationConditionField[] = [
  { field: 'order.order_code', label: 'Kode pesanan', type: 'string' },
  { field: 'order.status_code', label: 'Status pesanan', type: 'enum', values: ['new', 'confirmed', 'waiting', 'ready', 'in_production', 'qc', 'completed', 'packed', 'shipped', 'cancelled', 'returned'] },
  { field: 'order.old_status', label: 'Status sebelumnya', type: 'string' },
  { field: 'order.new_status', label: 'Status baru', type: 'string' },
  { field: 'order.order_type', label: 'Tipe pesanan', type: 'string' },
  { field: 'order.priority', label: 'Prioritas', type: 'enum', values: ['low', 'normal', 'high', 'critical'] },
  { field: 'order.deadline_at', label: 'Tenggat waktu', type: 'date' },
  { field: 'order.total_amount', label: 'Total pesanan', type: 'number' },
];
const productionFields: AutomationConditionField[] = [
  { field: 'production.job_code', label: 'Kode pekerjaan cetak', type: 'string' },
  { field: 'production.status_code', label: 'Status pekerjaan', type: 'string' },
  { field: 'production.failure_type', label: 'Jenis kegagalan', type: 'string' },
  { field: 'production.requires_reprint', label: 'Perlu cetak ulang', type: 'boolean' },
];
const materialFields: AutomationConditionField[] = [
  { field: 'material.material_code', label: 'Kode material', type: 'string' },
  { field: 'material.name', label: 'Nama material', type: 'string' },
  { field: 'material.available_qty', label: 'Stok tersedia', type: 'number' },
  { field: 'material.reorder_point', label: 'Titik pesan ulang', type: 'number' },
];
const printerFields: AutomationConditionField[] = [
  { field: 'printer.code', label: 'Kode printer', type: 'string' },
  { field: 'printer.name', label: 'Nama printer', type: 'string' },
  { field: 'printer.status_code', label: 'Status printer', type: 'string' },
  { field: 'printer.next_due_at', label: 'Perawatan berikutnya', type: 'date' },
];
const invoiceFields: AutomationConditionField[] = [
  { field: 'invoice.invoice_code', label: 'Kode invoice', type: 'string' },
  { field: 'invoice.due_date', label: 'Tanggal jatuh tempo', type: 'date' },
  { field: 'invoice.outstanding_amount', label: 'Nilai tertunggak', type: 'number' },
];

export const AUTOMATION_EVENTS: AutomationEventDefinition[] = [
  ...['order.created', 'order.status_changed', 'order.priority_changed', 'order.completed', 'order.cancelled', 'order.returned', 'order.deadline_approaching'].map((code) => ({ code, label: code.replace('order.', 'Pesanan: '), module: 'craft_orders', description: 'Peristiwa pesanan Craft.', triggerType: code === 'order.deadline_approaching' ? 'sensor' as const : 'event' as const, entityType: 'craft_order', fields: orderFields, recommendedActions: ['notification.create', 'order.priority.set', 'order.priority.recalculate', 'production.enqueue_order_items', 'tasks.create'] })),
  ...['production.job_created', 'production.job_started', 'production.job_completed', 'production.job_failed', 'production.qc_passed', 'production.qc_failed'].map((code) => ({ code, label: code.replace('production.', 'Produksi: '), module: 'craft_production', description: 'Peristiwa pekerjaan produksi.', triggerType: 'event' as const, entityType: 'print_job', fields: productionFields, recommendedActions: ['notification.create', 'tasks.create'] })),
  ...['printer.status_changed', 'printer.issue_created', 'printer.maintenance_recorded', 'printer.maintenance_due'].map((code) => ({ code, label: code.replace('printer.', 'Printer: '), module: 'craft_printers', description: 'Peristiwa printer atau perawatan.', triggerType: code === 'printer.maintenance_due' ? 'sensor' as const : 'event' as const, entityType: 'printer', fields: printerFields, recommendedActions: ['notification.create', 'tasks.create'] })),
  ...['material.stock_changed', 'material.low_stock', 'material.out_of_stock', 'material.waste_recorded', 'material.stock_received'].map((code) => ({ code, label: code.replace('material.', 'Material: '), module: 'craft_materials', description: 'Peristiwa persediaan material.', triggerType: 'event' as const, entityType: 'material', fields: materialFields, recommendedActions: ['notification.create', 'procurement.create_purchase_request', 'tasks.create'] })),
  ...['procurement.request_created', 'procurement.request_submitted', 'procurement.request_approved', 'procurement.po_created', 'procurement.goods_received', 'procurement.supplier_invoice_created', 'procurement.supplier_invoice_overdue'].map((code) => ({ code, label: code.replace('procurement.', 'Pengadaan: '), module: 'craft_procurement', description: 'Peristiwa pengadaan.', triggerType: code.endsWith('_overdue') ? 'sensor' as const : 'event' as const, entityType: 'purchase_request', fields: invoiceFields, recommendedActions: ['notification.create', 'tasks.create'] })),
  ...['finance.customer_payment_confirmed', 'finance.supplier_payment_confirmed', 'finance.expense_paid', 'finance.customer_invoice_overdue'].map((code) => ({ code, label: code.replace('finance.', 'Keuangan: '), module: 'craft_finance', description: 'Peristiwa keuangan yang telah diposting.', triggerType: code.endsWith('_overdue') ? 'sensor' as const : 'event' as const, entityType: 'invoice', fields: invoiceFields, recommendedActions: ['notification.create', 'tasks.create'] })),
  ...['marketplace.order_imported', 'marketplace.sync_completed', 'marketplace.sync_failed', 'marketplace.settlement_received', 'marketplace.settlement_reconciled'].map((code) => ({ code, label: code.replace('marketplace.', 'Marketplace: '), module: 'craft_marketplace', description: 'Peristiwa kanal penjualan.', triggerType: 'event' as const, entityType: 'marketplace', fields: [], recommendedActions: ['notification.create', 'tasks.create'] })),
];

export const automationEventRegistry = {
  all: () => AUTOMATION_EVENTS,
  get: (code: string) => AUTOMATION_EVENTS.find((event) => event.code === code),
  fieldsFor: (code: string) => automationEventRegistry.get(code)?.fields || [],
};
