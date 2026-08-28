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
  /** An event is only visible to its workspace (or to both for shared events). */
  scope?: 'craft' | 'studio' | 'shared';
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
  ...['order.created', 'order.status_changed', 'order.priority_changed', 'order.completed', 'order.cancelled', 'order.returned', 'order.deadline_approaching'].map((code) => ({ code, label: code.replace('order.', 'Pesanan: '), module: 'craft_orders', description: 'Peristiwa pesanan Craft.', triggerType: code === 'order.deadline_approaching' ? 'sensor' as const : 'event' as const, entityType: 'craft_order', fields: orderFields, recommendedActions: ['notification.create', 'order.priority.set', 'order.priority.recalculate', 'production.enqueue_order_items', 'tasks.create'], scope: 'craft' as const })),
  ...['production.job_created', 'production.job_started', 'production.job_completed', 'production.job_failed', 'production.qc_passed', 'production.qc_failed'].map((code) => ({ code, label: code.replace('production.', 'Produksi: '), module: 'craft_production', description: 'Peristiwa pekerjaan produksi.', triggerType: 'event' as const, entityType: 'print_job', fields: productionFields, recommendedActions: ['notification.create', 'tasks.create'], scope: 'craft' as const })),
  ...['printer.status_changed', 'printer.issue_created', 'printer.maintenance_recorded', 'printer.maintenance_due'].map((code) => ({ code, label: code.replace('printer.', 'Printer: '), module: 'craft_printers', description: 'Peristiwa printer atau perawatan.', triggerType: code === 'printer.maintenance_due' ? 'sensor' as const : 'event' as const, entityType: 'printer', fields: printerFields, recommendedActions: ['notification.create', 'tasks.create'], scope: 'craft' as const })),
  ...['material.stock_changed', 'material.low_stock', 'material.out_of_stock', 'material.waste_recorded', 'material.stock_received'].map((code) => ({ code, label: code.replace('material.', 'Material: '), module: 'craft_materials', description: 'Peristiwa persediaan material.', triggerType: 'event' as const, entityType: 'material', fields: materialFields, recommendedActions: ['notification.create', 'procurement.create_purchase_request', 'tasks.create'], scope: 'craft' as const })),
  ...['procurement.request_created', 'procurement.request_submitted', 'procurement.request_approved', 'procurement.po_created', 'procurement.goods_received', 'procurement.supplier_invoice_created', 'procurement.supplier_invoice_overdue'].map((code) => ({ code, label: code.replace('procurement.', 'Pengadaan: '), module: 'craft_procurement', description: 'Peristiwa pengadaan.', triggerType: code.endsWith('_overdue') ? 'sensor' as const : 'event' as const, entityType: 'purchase_request', fields: invoiceFields, recommendedActions: ['notification.create', 'tasks.create'], scope: 'craft' as const })),
  ...['finance.customer_payment_confirmed', 'finance.supplier_payment_confirmed', 'finance.expense_paid', 'finance.customer_invoice_overdue'].map((code) => ({ code, label: code.replace('finance.', 'Keuangan: '), module: 'craft_finance', description: 'Peristiwa keuangan yang telah diposting.', triggerType: code.endsWith('_overdue') ? 'sensor' as const : 'event' as const, entityType: 'invoice', fields: invoiceFields, recommendedActions: ['notification.create', 'tasks.create'], scope: 'craft' as const })),
  ...['marketplace.order_imported', 'marketplace.sync_completed', 'marketplace.sync_failed', 'marketplace.settlement_received', 'marketplace.settlement_reconciled'].map((code) => ({ code, label: code.replace('marketplace.', 'Marketplace: '), module: 'craft_marketplace', description: 'Peristiwa kanal penjualan.', triggerType: 'event' as const, entityType: 'marketplace', fields: [], recommendedActions: ['notification.create', 'tasks.create'], scope: 'craft' as const })),
  ...[
    ['studio.project.created', 'Proyek dibuat', 'event'], ['studio.project.status_changed', 'Status proyek berubah', 'event'], ['studio.project.started', 'Proyek dimulai', 'event'], ['studio.project.review_started', 'Proyek masuk review', 'event'], ['studio.project.completed', 'Proyek selesai', 'event'], ['studio.project.cancelled', 'Proyek dibatalkan', 'event'], ['studio.project.deadline_approaching', 'Tenggat proyek mendekat', 'sensor'], ['studio.project.overdue', 'Proyek terlambat', 'sensor'],
  ].map(([code, label, triggerType]) => ({ code, label: `Studio: ${label}`, module: 'studio_projects', description: 'Peristiwa atau sensor proyek Uni-Inside Studio.', triggerType: triggerType as AutomationEventDefinition['triggerType'], entityType: 'studio_project', fields: [
    { field: 'project.project_code', label: 'Kode proyek', type: 'string' as const }, { field: 'project.project_name', label: 'Nama proyek', type: 'string' as const }, { field: 'project.status_code', label: 'Status proyek', type: 'enum' as const, values: ['lead', 'quotation', 'approved', 'in_progress', 'review', 'completed', 'paid', 'cancelled'] }, { field: 'project.old_status', label: 'Status sebelumnya', type: 'string' as const }, { field: 'project.new_status', label: 'Status baru', type: 'string' as const }, { field: 'project.priority_code', label: 'Prioritas', type: 'enum' as const, values: ['low', 'normal', 'high', 'critical'] }, { field: 'project.deadline_at', label: 'Tenggat', type: 'date' as const }, { field: 'project.contract_value', label: 'Nilai kontrak', type: 'number' as const },
  ], recommendedActions: ['notification.create', 'tasks.create', 'studio.project.priority.set', 'studio.project.try_mark_paid'], scope: 'studio' as const })),
  ...[
    ['studio.project.milestone_due', 'Milestone jatuh tempo'], ['studio.project.deliverable_overdue', 'Deliverable terlambat'],
  ].map(([code, label]) => ({ code, label: `Studio: ${label}`, module: 'studio_projects', description: 'Sensor operasional proyek Studio.', triggerType: 'sensor' as const, entityType: 'studio_project', fields: [{ field: 'project.project_code', label: 'Kode proyek', type: 'string' as const }, { field: 'project.deadline_at', label: 'Tenggat', type: 'date' as const }], recommendedActions: ['notification.create', 'tasks.create'], scope: 'studio' as const })),
  ...['studio.quotation.created', 'studio.quotation.sent', 'studio.quotation.accepted', 'studio.quotation.rejected', 'studio.quotation.expiring', 'studio.quotation.expired'].map((code) => ({ code, label: `Studio: ${code.replace('studio.quotation.', 'Penawaran ')}`, module: 'studio_billing', description: 'Peristiwa atau sensor penawaran Studio.', triggerType: code.endsWith('expiring') || code.endsWith('expired') ? 'sensor' as const : 'event' as const, entityType: 'quotation', fields: [{ field: 'quotation.quotation_number', label: 'Nomor penawaran', type: 'string' as const }, { field: 'quotation.status_code', label: 'Status penawaran', type: 'string' as const }, { field: 'quotation.valid_until', label: 'Berlaku hingga', type: 'date' as const }, { field: 'quotation.total_amount', label: 'Total penawaran', type: 'number' as const }], recommendedActions: ['notification.create', 'tasks.create', 'studio.project.create_from_quotation'], scope: 'studio' as const })),
  ...['studio.invoice.created', 'studio.invoice.issued', 'studio.invoice.voided', 'studio.invoice.due_soon', 'studio.invoice.overdue', 'studio.invoice.payment_schedule_due'].map((code) => ({ code, label: `Studio: ${code.replace('studio.invoice.', 'Invoice ')}`, module: 'studio_billing', description: 'Peristiwa atau sensor invoice Studio.', triggerType: code.endsWith('due_soon') || code.endsWith('overdue') || code.endsWith('schedule_due') ? 'sensor' as const : 'event' as const, entityType: 'invoice', fields: invoiceFields, recommendedActions: ['notification.create', 'tasks.create'], scope: 'studio' as const })),
  ...['studio.finance.payment_received', 'studio.finance.expense_paid', 'studio.finance.external_fee_paid', 'studio.finance.treasury_transfer_completed'].map((code) => ({ code, label: `Studio: ${code.replace('studio.finance.', 'Keuangan ')}`, module: 'studio_finance', description: 'Peristiwa keuangan Studio setelah transaksi tercatat; tidak dapat memindahkan uang.', triggerType: 'event' as const, entityType: 'payment', fields: [{ field: 'payment.payment_code', label: 'Kode pembayaran', type: 'string' as const }, { field: 'payment.amount', label: 'Nilai pembayaran', type: 'number' as const }, { field: 'payment.invoice_id', label: 'ID invoice', type: 'number' as const }], recommendedActions: ['notification.create', 'tasks.create', 'studio.project.try_mark_paid'], scope: 'studio' as const })),
  ...['studio.asset.assigned', 'studio.asset.returned', 'studio.asset.maintenance_started', 'studio.asset.maintenance_completed', 'studio.asset.maintenance_due', 'studio.asset.return_overdue'].map((code) => ({ code, label: `Studio: ${code.replace('studio.asset.', 'Aset ')}`, module: 'studio_equipment', description: 'Peristiwa atau sensor aset Studio.', triggerType: code.endsWith('_due') || code.endsWith('overdue') ? 'sensor' as const : 'event' as const, entityType: 'asset', fields: [{ field: 'asset.asset_code', label: 'Kode aset', type: 'string' as const }, { field: 'asset.name', label: 'Nama aset', type: 'string' as const }, { field: 'asset.status_code', label: 'Status aset', type: 'string' as const }, { field: 'asset.next_due_at', label: 'Perawatan berikutnya', type: 'date' as const }], recommendedActions: ['notification.create', 'tasks.create'], scope: 'studio' as const })),
];

export const automationEventRegistry = {
  all: (businessUnitCode?: string) => {
    const scope = businessUnitCode?.toLowerCase();
    return !scope ? AUTOMATION_EVENTS : AUTOMATION_EVENTS.filter((event) => event.scope === 'shared' || event.scope === scope);
  },
  get: (code: string, businessUnitCode?: string) => automationEventRegistry.all(businessUnitCode).find((event) => event.code === code),
  fieldsFor: (code: string, businessUnitCode?: string) => automationEventRegistry.get(code, businessUnitCode)?.fields || [],
};
