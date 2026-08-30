import { notificationService, type NotificationSeverity } from './notification.service';

type DomainEvent = {
  id: number;
  organization_id: number;
  business_unit_id: number | null;
  event_name: string;
  entity_type: string | null;
  entity_id: number | null;
  actor_user_id: number | null;
  payload_json?: string | Record<string, unknown> | null;
};

type Policy = {
  code: string;
  moduleCode: string;
  permissionCode: string;
  severity: NotificationSeverity;
  actionUrl: string;
  excludeActor?: boolean;
  content: (context: Record<string, any>) => { title: string; message: string };
};

const value = (context: Record<string, any>, path: string, fallback: string) => {
  const result = path.split('.').reduce<any>((current, key) => current && typeof current === 'object' ? current[key] : undefined, context);
  return result === null || result === undefined || result === '' ? fallback : String(result);
};

const policies: Record<string, Policy> = {
  'order.created': {
    code: 'craft-order-created', moduleCode: 'craft_orders', permissionCode: 'craft.orders.read', severity: 'info', actionUrl: '/app/craft/orders', excludeActor: true,
    content: (c) => ({ title: `Pesanan baru ${value(c, 'order.order_code', 'dibuat')}`, message: 'Pesanan baru telah masuk dan siap ditinjau.' }),
  },
  'production.job_failed': {
    code: 'craft-production-failed', moduleCode: 'craft_production', permissionCode: 'craft.production.read', severity: 'error', actionUrl: '/app/craft/production/failures',
    content: (c) => ({ title: `Cetak gagal: ${value(c, 'production.job_code', 'pekerjaan produksi')}`, message: 'Pekerjaan produksi gagal dan membutuhkan tindak lanjut.' }),
  },
  'production.job_completed': {
    code: 'craft-production-completed', moduleCode: 'craft_production', permissionCode: 'craft.production.read', severity: 'success', actionUrl: '/app/craft/production/jobs',
    content: (c) => ({ title: `Cetak selesai: ${value(c, 'production.job_code', 'pekerjaan produksi')}`, message: 'Pekerjaan produksi selesai dan menunggu atau telah memasuki kontrol kualitas.' }),
  },
  'material.low_stock': {
    code: 'craft-material-low-stock', moduleCode: 'craft_materials', permissionCode: 'craft.materials.read', severity: 'warning', actionUrl: '/app/craft/materials/low-stock',
    content: (c) => ({ title: `Stok menipis: ${value(c, 'material.name', 'material')}`, message: `Stok tersedia ${value(c, 'material.available_qty', '0')} telah mencapai batas pemesanan ulang.` }),
  },
  'material.out_of_stock': {
    code: 'craft-material-out-of-stock', moduleCode: 'craft_materials', permissionCode: 'craft.materials.read', severity: 'critical', actionUrl: '/app/craft/materials/low-stock',
    content: (c) => ({ title: `Stok habis: ${value(c, 'material.name', 'material')}`, message: 'Material tidak lagi tersedia dan dapat menghambat produksi.' }),
  },
  'printer.issue_created': {
    code: 'craft-printer-issue', moduleCode: 'craft_printers', permissionCode: 'craft.printers.read', severity: 'warning', actionUrl: '/app/craft/printers/issues',
    content: (c) => ({ title: `Masalah printer: ${value(c, 'printer.name', 'printer')}`, message: `Masalah ${value(c, 'issue.issue_code', 'baru')} telah dicatat dan perlu ditinjau.` }),
  },
  'studio.project.created': {
    code: 'studio-project-created', moduleCode: 'studio_projects', permissionCode: 'studio.projects.read', severity: 'info', actionUrl: '/app/studio/projects', excludeActor: true,
    content: (c) => ({ title: `Proyek baru ${value(c, 'project.project_code', 'dibuat')}`, message: `${value(c, 'project.project_name', 'Proyek Studio baru')} siap untuk ditinjau.` }),
  },
  'studio.quotation.accepted': {
    code: 'studio-quotation-accepted', moduleCode: 'studio_billing', permissionCode: 'studio.billing.read', severity: 'success', actionUrl: '/app/studio/billing/quotations',
    content: (c) => ({ title: `Penawaran diterima: ${value(c, 'quotation.quotation_number', 'penawaran')}`, message: 'Klien telah menerima penawaran Studio.' }),
  },
  'studio.finance.payment_received': {
    code: 'studio-payment-received', moduleCode: 'studio_finance', permissionCode: 'studio.finance.read', severity: 'success', actionUrl: '/app/studio/finance/income',
    content: (c) => {
      const paymentCode = value(c, 'payment.payment_code', '');
      return { title: 'Pembayaran Studio diterima', message: paymentCode ? `Pembayaran ${paymentCode} telah tercatat pada keuangan Studio.` : 'Pembayaran telah tercatat pada keuangan Studio.' };
    },
  },
};

const contextFor = (event: DomainEvent): Record<string, any> => {
  try {
    const parsed = typeof event.payload_json === 'string' ? JSON.parse(event.payload_json) : event.payload_json;
    return (parsed as any)?.context && typeof (parsed as any).context === 'object' ? (parsed as any).context : (parsed as Record<string, any> || {});
  } catch { return {}; }
};

/** Handles only canonical outbox events; the AutomationWorker remains their sole claimant. */
export class SystemNotificationService {
  async dispatch(event: DomainEvent) {
    const policy = policies[event.event_name];
    if (!policy) return { status: 'skipped' as const, reason: 'NO_SYSTEM_NOTIFICATION_POLICY' };
    const content = policy.content(contextFor(event));
    const outcomes = await notificationService.createFromSystemEvent(event, policy.code, {
      organizationId: Number(event.organization_id), businessUnitId: event.business_unit_id,
      notificationType: 'system', moduleCode: policy.moduleCode, severityCode: policy.severity,
      title: content.title, message: content.message, actionUrl: policy.actionUrl,
      entityType: event.entity_type, entityId: event.entity_id,
    }, {
      businessUnitId: event.business_unit_id,
      permissionCode: policy.permissionCode,
      excludeUserId: policy.excludeActor ? event.actor_user_id : null,
    });
    return { status: 'success' as const, policy: policy.code, recipients: outcomes.filter((row) => row.status === 'created').length };
  }
}

export const systemNotificationService = new SystemNotificationService();
