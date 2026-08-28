import { randomUUID } from 'crypto';
import { pool } from '../../config/database';
import { CraftOrdersService } from '../../modules/craft-orders/craft-orders.service';
import { OrderPriorityService } from '../../modules/craft-orders/order-priority.service';
import { CraftProcurementService } from '../../modules/craft-procurement/craft-procurement.service';
import { CraftMarketplaceService } from '../../modules/craft-marketplace/craft-marketplace.service';
import { StudioProjectsService } from '../../modules/studio-projects/studio-projects.service';
import { getStudioBusinessUnit } from '../../modules/studio-projects/studio-projects.helpers';
import { StudioAnalyticsService } from '../../modules/studio-analytics/studio-analytics.service';
import { StudioAnalyticsExportService } from '../../modules/studio-analytics/studio-analytics-export.service';
import { normalizeFilters, studioAnalyticsContext } from '../../modules/studio-analytics/studio-analytics.shared';
import { AutomationSkippedError, AutomationValidationError } from './automation-errors';
import { automationEventRegistry } from './automation-event-registry';
import { buildAutomationDomainEvent, parseJson } from './automation-context';
import { domainEvents } from './domain-event-outbox.service';

export type AutomationRisk = 'informational' | 'operational' | 'data_change';
export interface AutomationAction { type: string; config?: Record<string, unknown>; continue_on_error?: boolean; }
export interface AutomationActionDefinition {
  type: string;
  label: string;
  module: string;
  description: string;
  /** `automation.write` resolves to the current workspace's automation permission. */
  requiredPermission: string;
  retrySafe: boolean;
  risk: AutomationRisk;
  supportedEvents?: string[];
  scope: 'shared' | 'craft' | 'studio';
}
export interface AutomationExecutionContext {
  rule: any;
  run: any;
  event?: any | null;
  input: Record<string, any>;
  organizationId: number;
  businessUnitId: number;
  businessUnitCode: 'CRAFT' | 'STUDIO';
  actorUserId: number | null;
}

const definitions: AutomationActionDefinition[] = [
  { type: 'notification.create', label: 'Buat Notifikasi', module: 'automations', description: 'Membuat notifikasi workspace yang dapat dilacak.', requiredPermission: 'automation.write', retrySafe: true, risk: 'informational', scope: 'shared' },
  { type: 'tasks.create', label: 'Buat Tugas Tindak Lanjut', module: 'automations', description: 'Menambahkan tugas tindak lanjut yang dapat dilacak.', requiredPermission: 'automation.write', retrySafe: true, risk: 'data_change', scope: 'shared' },
  { type: 'order.priority.set', label: 'Atur Prioritas Pesanan', module: 'craft_orders', description: 'Menetapkan prioritas manual pada pesanan.', requiredPermission: 'craft.orders.write', retrySafe: true, risk: 'data_change', supportedEvents: ['order.created', 'order.status_changed', 'order.deadline_approaching'], scope: 'craft' },
  { type: 'order.priority.recalculate', label: 'Hitung Ulang Prioritas', module: 'craft_orders', description: 'Menjalankan mesin prioritas pesanan kanonik.', requiredPermission: 'craft.orders.write', retrySafe: true, risk: 'operational', scope: 'craft' },
  { type: 'production.enqueue_order_items', label: 'Masukkan ke Antrean Produksi', module: 'craft_production', description: 'Menambahkan item pesanan Ready ke antrean produksi bila memenuhi syarat.', requiredPermission: 'craft.production.write', retrySafe: true, risk: 'data_change', supportedEvents: ['order.status_changed'], scope: 'craft' },
  { type: 'procurement.create_purchase_request', label: 'Buat Permintaan Pembelian', module: 'craft_procurement', description: 'Membuat draft purchase request; tidak dapat menyetujui atau membayar.', requiredPermission: 'craft.procurement.write', retrySafe: true, risk: 'data_change', supportedEvents: ['material.low_stock'], scope: 'craft' },
  { type: 'marketplace.sync', label: 'Sinkronkan Marketplace', module: 'craft_marketplace', description: 'Memanggil connector marketplace yang benar-benar terhubung.', requiredPermission: 'craft.marketplace.sync', retrySafe: false, risk: 'operational', scope: 'craft' },
  { type: 'analytics.generate_report', label: 'Generate Laporan', module: 'craft_analytics', description: 'Meminta export laporan bila generator tersedia.', requiredPermission: 'craft.analytics.export', retrySafe: false, risk: 'operational', scope: 'craft' },
  { type: 'studio.project.priority.set', label: 'Atur Prioritas Proyek', module: 'studio_projects', description: 'Memakai layanan Proyek kanonik untuk memperbarui prioritas.', requiredPermission: 'studio.projects.write', retrySafe: true, risk: 'data_change', supportedEvents: ['studio.project.created', 'studio.project.status_changed', 'studio.project.deadline_approaching', 'studio.project.overdue'], scope: 'studio' },
  { type: 'studio.project.create_from_quotation', label: 'Buat Proyek dari Penawaran', module: 'studio_projects', description: 'Membuat satu proyek Studio dari penawaran diterima yang belum terhubung.', requiredPermission: 'studio.projects.write', retrySafe: false, risk: 'data_change', supportedEvents: ['studio.quotation.accepted'], scope: 'studio' },
  { type: 'studio.project.try_mark_paid', label: 'Coba Tandai Proyek Lunas', module: 'studio_projects', description: 'Meneruskan status completed → paid hanya bila pemeriksaan komersial kanonik terpenuhi.', requiredPermission: 'studio.projects.write', retrySafe: true, risk: 'data_change', supportedEvents: ['studio.finance.payment_received', 'studio.project.completed'], scope: 'studio' },
  { type: 'studio.analytics.generate_report', label: 'Generate Laporan Studio', module: 'studio_analytics', description: 'Menjalankan exporter Analytics Studio yang terdaftar tanpa webhook eksternal.', requiredPermission: 'studio.analytics.export', retrySafe: false, risk: 'operational', scope: 'studio' },
];

const getPath = (source: Record<string, any>, path: string) => path.split('.').reduce((value, key) => value && typeof value === 'object' ? value[key] : undefined, source);
const template = (text: unknown, trigger: string, context: Record<string, any>) => String(text || '').replace(/{{\s*([\w.]+)\s*}}/g, (_match, path) => {
  if (!automationEventRegistry.fieldsFor(trigger).some((field) => field.field === path)) return '';
  const value = getPath(context, path);
  return value === null || value === undefined ? '' : String(value).slice(0, 500);
});

const orderIdFor = (context: AutomationExecutionContext) => Number(context.input.order?.id || context.input.order_id || (context.event?.entity_type === 'craft_order' ? context.event.entity_id : 0));
const materialIdFor = (context: AutomationExecutionContext) => Number(context.input.material?.id || context.input.material_id || (context.event?.entity_type === 'material' ? context.event.entity_id : 0));
const projectIdFor = (context: AutomationExecutionContext) => Number(context.input.project?.id || context.input.project_id || context.input.quotation?.project_id || (context.event?.entity_type === 'studio_project' ? context.event.entity_id : 0));
const quotationIdFor = (context: AutomationExecutionContext) => Number(context.input.quotation?.id || context.input.quotation_id || (context.event?.entity_type === 'quotation' ? context.event.entity_id : 0));

export class AutomationActionRegistry {
  all(businessUnitCode?: string) {
    const scope = businessUnitCode?.toLowerCase();
    return !scope ? definitions : definitions.filter((action) => action.scope === 'shared' || action.scope === scope);
  }
  get(type: string) { return definitions.find((action) => action.type === type); }
  private permissionFor(definition: AutomationActionDefinition, businessUnitCode: string) {
    return definition.requiredPermission === 'automation.write' ? `${businessUnitCode.toLowerCase()}.automations.write` : definition.requiredPermission;
  }
  requiredPermissions(actions: AutomationAction[], businessUnitCode = 'CRAFT') {
    return [...new Set(actions.map((action) => this.get(action.type)).filter((definition): definition is AutomationActionDefinition => Boolean(definition)).map((definition) => this.permissionFor(definition, businessUnitCode)))];
  }
  assertAvailable(actions: AutomationAction[], businessUnitCode = 'CRAFT') {
    for (const action of actions || []) {
      if (!this.all(businessUnitCode).some((item) => item.type === action.type)) throw new AutomationValidationError(`Aksi ${action.type} tidak tersedia untuk workspace ini.`);
    }
  }

  validate(trigger: string, actions: AutomationAction[], businessUnitCode = 'CRAFT') {
    if (!Array.isArray(actions) || !actions.length || actions.length > 10) throw new AutomationValidationError('Aturan harus memiliki satu hingga sepuluh aksi.');
    for (const action of actions) {
      const definition = this.get(action.type);
      if (!definition) throw new AutomationValidationError(`Aksi ${action.type} tidak diizinkan.`);
      this.assertAvailable([action], businessUnitCode);
      if (definition.supportedEvents && trigger !== 'manual' && trigger !== 'schedule' && !definition.supportedEvents.includes(trigger)) throw new AutomationValidationError(`Aksi ${action.type} tidak mendukung pemicu ${trigger}.`);
      const config = action.config || {};
      if (action.type === 'notification.create' && (!String(config.title_template || '').trim() || !String(config.message_template || '').trim())) throw new AutomationValidationError('Notifikasi membutuhkan judul dan pesan.');
      if (action.type === 'order.priority.set' && !['low', 'normal', 'high', 'critical'].includes(String(config.priority))) throw new AutomationValidationError('Prioritas otomasi tidak valid.');
      if (action.type === 'marketplace.sync' && (!Number.isInteger(Number(config.integration_id)) || Number(config.integration_id) <= 0)) throw new AutomationValidationError('Sinkronisasi marketplace membutuhkan integration_id.');
      if (action.type === 'procurement.create_purchase_request' && Number(config.quantity || 0) < 0) throw new AutomationValidationError('Kuantitas purchase request tidak valid.');
      if (action.type === 'studio.project.priority.set' && !['low', 'normal', 'high', 'critical'].includes(String(config.priority))) throw new AutomationValidationError('Prioritas proyek tidak valid.');
      if (action.type === 'studio.analytics.generate_report' && !['overview', 'projects', 'clients', 'services', 'commercial', 'revenue', 'profitability', 'receivables', 'vendors', 'equipment'].includes(String(config.report || 'overview'))) throw new AutomationValidationError('Laporan Studio tidak terdaftar.');
      if (action.type === 'studio.analytics.generate_report' && !['csv', 'xlsx', 'pdf'].includes(String(config.format || 'xlsx'))) throw new AutomationValidationError('Format laporan Studio tidak didukung.');
    }
  }

  async execute(action: AutomationAction, context: AutomationExecutionContext): Promise<Record<string, unknown>> {
    const config = action.config || {};
    if (!this.all(context.businessUnitCode).some((definition) => definition.type === action.type)) throw new AutomationValidationError(`Aksi ${action.type} tidak tersedia untuk workspace ini.`);
    switch (action.type) {
      case 'notification.create': return this.createNotification(config, context);
      case 'order.priority.set': return this.setOrderPriority(config, context);
      case 'order.priority.recalculate': return this.recalculatePriority(context);
      case 'production.enqueue_order_items': return this.enqueueOrder(config, context);
      case 'procurement.create_purchase_request': return this.createPurchaseRequest(config, context);
      case 'marketplace.sync': return this.syncMarketplace(config, context);
      case 'analytics.generate_report': throw new AutomationSkippedError('ANALYTICS_EXPORT_NOT_AVAILABLE', 'Generator export Analytics belum tersedia untuk otomasi.');
      case 'tasks.create': return this.createTask(config, context);
      case 'studio.project.priority.set': return this.setStudioProjectPriority(config, context);
      case 'studio.project.create_from_quotation': return this.createStudioProjectFromQuotation(context);
      case 'studio.project.try_mark_paid': return this.tryMarkStudioProjectPaid(context);
      case 'studio.analytics.generate_report': return this.generateStudioReport(config, context);
      default: throw new AutomationValidationError(`Aksi ${action.type} tidak terdaftar.`);
    }
  }

  private async createNotification(config: Record<string, unknown>, context: AutomationExecutionContext) {
    const title = template(config.title_template, context.rule.trigger_event, context.input).slice(0, 180);
    const message = template(config.message_template, context.rule.trigger_event, context.input);
    const scope = String(config.recipient_scope || 'workspace_broadcast');
    let userId = scope === 'specific_user' ? Number(config.user_id || 0) || null : null;
    if (scope === 'project_manager') {
      const projectId = projectIdFor(context);
      if (!projectId) throw new AutomationSkippedError('PROJECT_MANAGER_CONTEXT_REQUIRED', 'Penerima Project Manager membutuhkan konteks proyek.');
      const [projects]: any = await pool.execute('SELECT project_manager_user_id FROM studio_projects WHERE id=? AND business_unit_id=? AND deleted_at IS NULL LIMIT 1', [projectId, context.businessUnitId]);
      userId = projects[0]?.project_manager_user_id ? Number(projects[0].project_manager_user_id) : null;
      if (!userId) throw new AutomationSkippedError('PROJECT_MANAGER_NOT_ASSIGNED', 'Proyek tidak memiliki Project Manager aktif.');
    }
    const entityId = context.event?.entity_id || null;
    const [existing]: any = await pool.execute(
      `SELECT id FROM notifications WHERE organization_id=? AND business_unit_id=? AND user_id <=> ? AND notification_type='automation'
       AND title=? AND entity_type <=> ? AND entity_id <=> ? AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 MINUTE) LIMIT 1`,
      [context.organizationId, context.businessUnitId, userId, title, context.event?.entity_type || null, entityId],
    );
    if (existing.length) return { status: 'skipped', reason: 'NOTIFICATION_DUPLICATE', notification_id: Number(existing[0].id) };
    const [result]: any = await pool.execute(
      `INSERT INTO notifications (organization_id,business_unit_id,user_id,notification_type,severity_code,title,message,action_url,entity_type,entity_id)
       VALUES (?,?,?,'automation',?,?,?,?,?,?)`,
      [context.organizationId, context.businessUnitId, userId, config.severity || 'info', title, message, config.action_url || null, context.event?.entity_type || null, entityId],
    );
    return { status: 'success', notification_id: Number(result.insertId) };
  }

  private async setOrderPriority(config: Record<string, unknown>, context: AutomationExecutionContext) {
    const orderId = orderIdFor(context);
    if (!orderId) throw new AutomationSkippedError('ORDER_CONTEXT_REQUIRED', 'Aksi prioritas membutuhkan konteks pesanan.');
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows]: any = await connection.execute('SELECT order_code,priority_code FROM craft_orders WHERE id=? AND business_unit_id=? AND deleted_at IS NULL FOR UPDATE', [orderId, context.businessUnitId]);
      if (!rows.length) throw new AutomationSkippedError('ORDER_NOT_FOUND', 'Pesanan tidak lagi tersedia.');
      const priority = String(config.priority);
      await connection.execute(`UPDATE craft_orders SET priority_code=?,is_priority_manual=1,priority_reason=? WHERE id=?`, [priority, `Executed by Automation ${context.rule.rule_code} (run ${context.run.id})`, orderId]);
      await connection.execute(`INSERT INTO audit_logs (organization_id,business_unit_id,user_id,module_code,action_code,entity_type,entity_id,entity_code,description,new_values)
        VALUES (?,?,?,'craft_automations','automation.order_priority','craft_order',?,?,?,?)`, [context.organizationId, context.businessUnitId, context.actorUserId, orderId, rows[0].order_code, `Executed by Automation ${context.rule.rule_code}.`, JSON.stringify({ priority, automation_run_id: context.run.id })]);
      await domainEvents.publish(connection, buildAutomationDomainEvent({ eventName: 'order.priority_changed', moduleCode: 'craft_orders', organizationId: context.organizationId, businessUnitId: context.businessUnitId, entityType: 'craft_order', entityId: orderId, entityCode: rows[0].order_code, actorUserId: context.actorUserId, payload: { context: { order: { id: orderId, order_code: rows[0].order_code, priority } } } }, { id: context.run.id, correlationId: context.run.correlation_id, chainDepth: context.run.chain_depth }, context.event?.id));
      await connection.commit();
      return { status: 'success', order_id: orderId, priority };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  private async recalculatePriority(context: AutomationExecutionContext) {
    const orderId = orderIdFor(context);
    if (!orderId) throw new AutomationSkippedError('ORDER_CONTEXT_REQUIRED', 'Aksi perhitungan prioritas membutuhkan konteks pesanan.');
    const priority = new OrderPriorityService();
    await priority.calculatePriority(orderId);
    return { status: 'success', order_id: orderId, recalculated: true };
  }

  private async enqueueOrder(config: Record<string, unknown>, context: AutomationExecutionContext) {
    const orderId = orderIdFor(context);
    if (!orderId) throw new AutomationSkippedError('ORDER_CONTEXT_REQUIRED', 'Antrean produksi membutuhkan konteks pesanan.');
    const [items]: any = await pool.execute('SELECT id FROM craft_order_items WHERE order_id=? ORDER BY id', [orderId]);
    if (!items.length) throw new AutomationSkippedError('ORDER_HAS_NO_ITEMS', 'Pesanan tidak memiliki item untuk diantrikan.');
    const requested = Array.isArray(config.order_item_ids) ? config.order_item_ids.map(Number).filter(Number.isInteger) : items.map((item: any) => Number(item.id));
    await new CraftOrdersService().enqueueOrderItems(orderId, requested, context.actorUserId || Number(context.rule.created_by), context.businessUnitId);
    return { status: 'success', order_id: orderId, item_count: requested.length };
  }

  private async createPurchaseRequest(config: Record<string, unknown>, context: AutomationExecutionContext) {
    const materialId = materialIdFor(context);
    if (!materialId) throw new AutomationSkippedError('MATERIAL_CONTEXT_REQUIRED', 'Purchase request membutuhkan konteks material.');
    const [materialRows]: any = await pool.execute('SELECT id,sku,name,base_unit_id,reorder_qty,default_unit_cost FROM materials WHERE id=? AND business_unit_id=? AND deleted_at IS NULL', [materialId, context.businessUnitId]);
    if (!materialRows.length) throw new AutomationSkippedError('MATERIAL_NOT_FOUND', 'Material tidak lagi tersedia.');
    const material = materialRows[0];
    const [open]: any = await pool.execute(`SELECT pr.id,pr.request_code FROM purchase_requests pr JOIN purchase_request_items pri ON pri.purchase_request_id=pr.id WHERE pr.business_unit_id=? AND pri.material_id=? AND pr.status_code IN ('draft','submitted','approved') LIMIT 1`, [context.businessUnitId, materialId]);
    if (open.length) return { status: 'skipped', reason: 'OPEN_PURCHASE_REQUEST_EXISTS', purchase_request_id: Number(open[0].id), request_code: open[0].request_code };
    const quantity = Number(config.quantity || material.reorder_qty || 1);
    if (quantity <= 0) throw new AutomationSkippedError('REORDER_QUANTITY_REQUIRED', 'Kuantitas reorder material belum ditentukan.');
    const result = await new CraftProcurementService().createPurchaseRequest({ purpose: `Automation ${context.rule.rule_code}: stok rendah ${material.sku}.`, items: [{ material_id: materialId, description: `Reorder ${material.name}`, quantity, unit_id: Number(material.base_unit_id), estimated_unit_cost: Number(material.default_unit_cost || 0), notes: `Executed by Automation ${context.rule.rule_code}, run ${context.run.id}.` }] }, { id: context.businessUnitId, organizationId: context.organizationId, code: 'CRAFT', userId: context.actorUserId || Number(context.rule.created_by) });
    return { status: 'success', purchase_request_id: result.id, request_code: result.request_code };
  }

  private async syncMarketplace(config: Record<string, unknown>, context: AutomationExecutionContext) {
    try {
      const result = await new CraftMarketplaceService().syncIntegration(Number(config.integration_id), { organizationId: context.organizationId, businessUnitId: context.businessUnitId, userId: context.actorUserId || Number(context.rule.created_by) });
      return { status: 'success', result };
    } catch (error: any) {
      if (['MARKETPLACE_CONNECTOR_NOT_CONFIGURED', 'MARKETPLACE_CREDENTIALS_NOT_CONFIGURED'].includes(error?.code)) throw new AutomationSkippedError(error.code, error.message);
      throw error;
    }
  }

  private async createTask(config: Record<string, unknown>, context: AutomationExecutionContext) {
    const title = template(config.title_template || 'Tindak lanjut otomasi', context.rule.trigger_event, context.input).slice(0, 220);
    const description = template(config.description_template || '', context.rule.trigger_event, context.input);
    const [result]: any = await pool.execute(`INSERT INTO tasks (organization_id,business_unit_id,task_code,title,description,status_code,priority_code,due_at,source_type,source_id,created_by) VALUES (?,?,?, ?,?,'todo',?,?,?, ?,?)`, [context.organizationId, context.businessUnitId, `TSK-${randomUUID().slice(0, 8).toUpperCase()}`, title, description || null, config.priority || 'normal', config.due_at || null, context.event?.entity_type || 'automation_run', context.event?.entity_id || context.run.id, context.actorUserId || Number(context.rule.created_by)]);
    return { status: 'success', task_id: Number(result.insertId) };
  }

  private async setStudioProjectPriority(config: Record<string, unknown>, context: AutomationExecutionContext) {
    const projectId = projectIdFor(context);
    if (!projectId) throw new AutomationSkippedError('PROJECT_CONTEXT_REQUIRED', 'Aksi prioritas membutuhkan konteks proyek Studio.');
    const studio = await getStudioBusinessUnit();
    if (studio.id !== context.businessUnitId) throw new AutomationSkippedError('STUDIO_CONTEXT_REQUIRED', 'Aksi proyek hanya dapat dijalankan untuk Studio.');
    const result = await new StudioProjectsService().updateProject(projectId, { priority_code: String(config.priority) }, context.actorUserId || Number(context.rule.created_by), studio);
    return { status: 'success', project_id: result.id, priority: String(config.priority) };
  }

  private async createStudioProjectFromQuotation(context: AutomationExecutionContext) {
    const quotationId = quotationIdFor(context);
    if (!quotationId) throw new AutomationSkippedError('QUOTATION_CONTEXT_REQUIRED', 'Aksi ini membutuhkan konteks penawaran.');
    const studio = await getStudioBusinessUnit();
    if (studio.id !== context.businessUnitId) throw new AutomationSkippedError('STUDIO_CONTEXT_REQUIRED', 'Aksi penawaran hanya dapat dijalankan untuk Studio.');
    const [rows]: any = await pool.execute(`SELECT id, quotation_number, party_id, project_id, status_code, currency_code, total_amount
      FROM quotations WHERE id=? AND organization_id=? AND business_unit_id=? LIMIT 1`, [quotationId, context.organizationId, studio.id]);
    const quotation = rows[0];
    if (!quotation) throw new AutomationSkippedError('QUOTATION_NOT_FOUND', 'Penawaran Studio tidak lagi tersedia.');
    if (quotation.project_id) return { status: 'skipped', reason: 'QUOTATION_ALREADY_LINKED_TO_PROJECT', project_id: Number(quotation.project_id) };
    if (quotation.status_code !== 'accepted') throw new AutomationSkippedError('QUOTATION_NOT_ACCEPTED', 'Hanya penawaran yang diterima dapat dibuatkan proyek.');
    const [items]: any = await pool.execute('SELECT service_id, description, quantity, unit_price FROM quotation_items WHERE quotation_id=? ORDER BY id', [quotationId]);
    const actorId = context.actorUserId || Number(context.rule.created_by);
    const project = await new StudioProjectsService().createProject({
      client_party_id: Number(quotation.party_id), project_name: `Proyek ${quotation.quotation_number}`,
      priority_code: 'normal', currency_code: quotation.currency_code, contract_value: Number(quotation.total_amount),
      services: items.map((item: any) => ({ service_id: item.service_id ? Number(item.service_id) : null, description: item.description, quantity: Number(item.quantity), unit_price: Number(item.unit_price) })), members: [], milestones: [], deliverables: [],
    }, actorId, studio);
    const [linked]: any = await pool.execute('UPDATE quotations SET project_id=? WHERE id=? AND project_id IS NULL AND business_unit_id=?', [project.id, quotationId, studio.id]);
    if (!linked.affectedRows) return { status: 'skipped', reason: 'QUOTATION_ALREADY_LINKED_TO_PROJECT' };
    const projects = new StudioProjectsService();
    await projects.changeStatus(project.id, 'quotation', 'Dibuat dari penawaran yang diterima oleh otomasi.', actorId, studio);
    await projects.changeStatus(project.id, 'approved', 'Penawaran Studio telah diterima.', actorId, studio);
    return { status: 'success', project_id: project.id, quotation_id: quotationId, project_code: project.project_code };
  }

  private async tryMarkStudioProjectPaid(context: AutomationExecutionContext) {
    let projectId = projectIdFor(context);
    if (!projectId && context.input.payment?.invoice_id) {
      const [invoices]: any = await pool.execute(`SELECT source_id FROM invoices WHERE id=? AND business_unit_id=? AND source_type='studio_project' LIMIT 1`, [Number(context.input.payment.invoice_id), context.businessUnitId]);
      projectId = Number(invoices[0]?.source_id || 0);
    }
    if (!projectId) throw new AutomationSkippedError('PROJECT_CONTEXT_REQUIRED', 'Tidak ada proyek Studio yang dapat diperiksa.');
    const studio = await getStudioBusinessUnit();
    if (studio.id !== context.businessUnitId) throw new AutomationSkippedError('STUDIO_CONTEXT_REQUIRED', 'Aksi proyek hanya dapat dijalankan untuk Studio.');
    const [projects]: any = await pool.execute('SELECT id,status_code FROM studio_projects WHERE id=? AND business_unit_id=? AND deleted_at IS NULL LIMIT 1', [projectId, studio.id]);
    if (!projects.length) throw new AutomationSkippedError('PROJECT_NOT_FOUND', 'Proyek Studio tidak lagi tersedia.');
    if (projects[0].status_code === 'paid') return { status: 'skipped', reason: 'PROJECT_ALREADY_PAID', project_id: projectId };
    if (projects[0].status_code !== 'completed') throw new AutomationSkippedError('PROJECT_NOT_COMPLETED', 'Proyek harus selesai sebelum dapat ditandai lunas.');
    const result = await new StudioProjectsService().changeStatus(projectId, 'paid', 'Pelunasan diverifikasi oleh aturan otomasi.', context.actorUserId || Number(context.rule.created_by), studio);
    return { status: 'success', project_id: projectId, status_code: result.status_code };
  }

  private async generateStudioReport(config: Record<string, unknown>, context: AutomationExecutionContext) {
    const actorId = context.actorUserId || Number(context.rule.created_by);
    if (!actorId) throw new AutomationSkippedError('AUTOMATION_OWNER_REQUIRED', 'Laporan otomatis memerlukan pemilik aturan aktif.');
    const analytics = new StudioAnalyticsService();
    const exporter = new StudioAnalyticsExportService(analytics);
    const result = await exporter.export(await studioAnalyticsContext(actorId), String(config.report || 'overview') as any, String(config.format || 'xlsx') as any, normalizeFilters({ compare: false, currency: 'IDR', page: 1, limit: 100 }), actorId);
    return { status: 'success', report: config.report || 'overview', format: config.format || 'xlsx', bytes: Buffer.isBuffer(result.body) ? result.body.length : String(result.body).length };
  }
}

export const automationActionRegistry = new AutomationActionRegistry();
