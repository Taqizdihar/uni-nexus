import { pool } from '../../config/database';
import type { RowDataPacket } from 'mysql2';
import { automationSensorService, type SensorCandidate } from '../automation/automation-sensor.service';
import { sanitizeAutomationError } from '../automation/automation-errors';
import { notificationService, type NotificationSeverity } from './notification.service';
import { jakartaBusinessDate } from './notification-time';

type BusinessUnit = RowDataPacket & { id: number; organization_id: number; code: string };
type SensorContent = { title: string; message: string };
export type SystemNotificationSensorPolicy = {
  event: string;
  moduleCode: string;
  permissionCode: string;
  severity: NotificationSeverity;
  actionUrl: string;
  workspaceCode: 'CRAFT' | 'STUDIO';
  content: (candidate: SensorCandidate) => SensorContent;
  dedupeIdentity?: (candidate: SensorCandidate) => { entityType: string; entityId: number };
};

export type SystemNotificationSensorRunResult = {
  businessUnits: number;
  policiesChecked: number;
  candidates: number;
  created: number;
  failedPolicies: number;
  failedCandidates: number;
  bucket: string;
};

const contextValue = (candidate: SensorCandidate, path: string, fallback: string) => {
  const value = path.split('.').reduce<unknown>((current, key) => current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, candidate.context);
  return value === undefined || value === null || value === '' ? fallback : String(value);
};

/** Formats a sensor amount only when the candidate supplies a valid currency. */
export const formatSensorCurrency = (amount: unknown, currencyCode?: unknown) => {
  const numericAmount = Number(amount);
  const fallback = Number.isFinite(numericAmount) ? numericAmount.toLocaleString('id-ID') : String(amount ?? '0');
  const code = String(currencyCode || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code) || !Number.isFinite(numericAmount)) return fallback;
  try {
    const supportedCurrencies = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : null;
    if (supportedCurrencies && !supportedCurrencies.includes(code)) return fallback;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: code }).format(numericAmount);
  } catch {
    return fallback;
  }
};

const amount = (candidate: SensorCandidate, path: string, currencyPath = 'invoice.currency_code') => {
  const value = contextValue(candidate, path, '0');
  return formatSensorCurrency(value, contextValue(candidate, currencyPath, ''));
};

const identity = (candidate: SensorCandidate) => ({ entityType: candidate.entityType, entityId: candidate.entityId });
const nestedIdentity = (path: string, entityType: string) => (candidate: SensorCandidate) => {
  const id = Number(contextValue(candidate, path, '0'));
  return id > 0 ? { entityType, entityId: id } : identity(candidate);
};

/** Canonical state/time policies. Their candidates always come from AutomationSensorService. */
export const systemNotificationSensorPolicies: SystemNotificationSensorPolicy[] = [
  { event: 'order.deadline_approaching', workspaceCode: 'CRAFT', moduleCode: 'craft_orders', permissionCode: 'craft.orders.read', severity: 'warning', actionUrl: '/app/craft/orders', content: (c) => ({ title: `Pesanan mendekati tenggat: ${contextValue(c, 'order.order_code', 'Pesanan')}`, message: `Tenggat pesanan ini akan tiba dalam 24 jam (${contextValue(c, 'order.deadline_at', 'segera')}).` }) },
  { event: 'printer.maintenance_due', workspaceCode: 'CRAFT', moduleCode: 'craft_printers', permissionCode: 'craft.printers.read', severity: 'warning', actionUrl: '/app/craft/printers/maintenance', content: (c) => ({ title: `Maintenance printer: ${contextValue(c, 'printer.name', 'Printer')}`, message: 'Jadwal maintenance printer telah jatuh tempo.' }) },
  { event: 'finance.customer_invoice_overdue', workspaceCode: 'CRAFT', moduleCode: 'craft_finance', permissionCode: 'craft.finance.read', severity: 'error', actionUrl: '/app/craft/finance', content: (c) => ({ title: `Invoice pelanggan jatuh tempo: ${contextValue(c, 'invoice.invoice_code', 'Invoice')}`, message: `Tagihan pelanggan sebesar ${amount(c, 'invoice.outstanding_amount')} masih belum dibayar.` }) },
  { event: 'procurement.supplier_invoice_overdue', workspaceCode: 'CRAFT', moduleCode: 'craft_procurement', permissionCode: 'craft.procurement.read', severity: 'warning', actionUrl: '/app/craft/procurement', content: (c) => ({ title: `Invoice pemasok jatuh tempo: ${contextValue(c, 'invoice.invoice_code', 'Invoice')}`, message: `Invoice pemasok sebesar ${amount(c, 'invoice.outstanding_amount')} masih belum dibayar.` }) },
  { event: 'studio.project.deadline_approaching', workspaceCode: 'STUDIO', moduleCode: 'studio_projects', permissionCode: 'studio.projects.read', severity: 'warning', actionUrl: '/app/studio/projects', content: (c) => ({ title: `Proyek mendekati tenggat: ${contextValue(c, 'project.project_code', 'Proyek')}`, message: `${contextValue(c, 'project.project_name', 'Proyek Studio')} memiliki tenggat dalam 24 jam.` }) },
  { event: 'studio.project.overdue', workspaceCode: 'STUDIO', moduleCode: 'studio_projects', permissionCode: 'studio.projects.read', severity: 'critical', actionUrl: '/app/studio/projects', content: (c) => ({ title: `Proyek terlambat: ${contextValue(c, 'project.project_code', 'Proyek')}`, message: `${contextValue(c, 'project.project_name', 'Proyek Studio')} telah melewati tenggat.` }) },
  { event: 'studio.project.milestone_due', workspaceCode: 'STUDIO', moduleCode: 'studio_projects', permissionCode: 'studio.projects.read', severity: 'warning', actionUrl: '/app/studio/projects', dedupeIdentity: nestedIdentity('milestone.id', 'studio_project_milestone'), content: (c) => ({ title: `Tahapan proyek segera jatuh tempo: ${contextValue(c, 'milestone.title', 'Tahapan')}`, message: `Tahapan pada ${contextValue(c, 'project.project_code', 'proyek Studio')} perlu ditindaklanjuti dalam 24 jam.` }) },
  { event: 'studio.project.deliverable_overdue', workspaceCode: 'STUDIO', moduleCode: 'studio_projects', permissionCode: 'studio.projects.read', severity: 'error', actionUrl: '/app/studio/projects', dedupeIdentity: nestedIdentity('deliverable.id', 'studio_project_deliverable'), content: (c) => ({ title: `Deliverable terlambat: ${contextValue(c, 'deliverable.title', 'Deliverable')}`, message: `Deliverable ${contextValue(c, 'project.project_code', 'proyek Studio')} telah melewati tenggat.` }) },
  { event: 'studio.quotation.expiring', workspaceCode: 'STUDIO', moduleCode: 'studio_billing', permissionCode: 'studio.billing.read', severity: 'warning', actionUrl: '/app/studio/billing/quotations', content: (c) => ({ title: `Penawaran segera kedaluwarsa: ${contextValue(c, 'quotation.quotation_number', 'Penawaran')}`, message: `Penawaran berlaku sampai ${contextValue(c, 'quotation.valid_until', 'segera')}.` }) },
  { event: 'studio.quotation.expired', workspaceCode: 'STUDIO', moduleCode: 'studio_billing', permissionCode: 'studio.billing.read', severity: 'error', actionUrl: '/app/studio/billing/quotations', content: (c) => ({ title: `Penawaran kedaluwarsa: ${contextValue(c, 'quotation.quotation_number', 'Penawaran')}`, message: 'Penawaran Studio telah melewati masa berlaku.' }) },
  { event: 'studio.invoice.due_soon', workspaceCode: 'STUDIO', moduleCode: 'studio_billing', permissionCode: 'studio.billing.read', severity: 'warning', actionUrl: '/app/studio/billing/invoices', content: (c) => ({ title: `Invoice segera jatuh tempo: ${contextValue(c, 'invoice.invoice_code', 'Invoice')}`, message: `Tagihan sebesar ${amount(c, 'invoice.outstanding_amount')} akan jatuh tempo dalam 3 hari.` }) },
  { event: 'studio.invoice.overdue', workspaceCode: 'STUDIO', moduleCode: 'studio_billing', permissionCode: 'studio.billing.read', severity: 'error', actionUrl: '/app/studio/billing/invoices', content: (c) => ({ title: `Invoice terlambat: ${contextValue(c, 'invoice.invoice_code', 'Invoice')}`, message: `Tagihan sebesar ${amount(c, 'invoice.outstanding_amount')} telah melewati jatuh tempo.` }) },
  { event: 'studio.invoice.payment_schedule_due', workspaceCode: 'STUDIO', moduleCode: 'studio_billing', permissionCode: 'studio.billing.read', severity: 'warning', actionUrl: '/app/studio/billing/invoices', dedupeIdentity: nestedIdentity('payment_schedule.id', 'invoice_payment_schedule'), content: (c) => ({ title: `Jadwal pembayaran jatuh tempo: ${contextValue(c, 'invoice.invoice_code', 'Invoice')}`, message: `Jadwal ${contextValue(c, 'payment_schedule.label', 'pembayaran')} jatuh tempo pada ${contextValue(c, 'payment_schedule.due_date', 'segera')}.` }) },
  { event: 'studio.asset.maintenance_due', workspaceCode: 'STUDIO', moduleCode: 'studio_equipment', permissionCode: 'studio.equipment.read', severity: 'warning', actionUrl: '/app/studio/equipment/assets', content: (c) => ({ title: `Maintenance aset: ${contextValue(c, 'asset.name', 'Aset')}`, message: `Jadwal maintenance aset jatuh tempo pada ${contextValue(c, 'asset.next_due_at', 'segera')}.` }) },
  { event: 'studio.asset.return_overdue', workspaceCode: 'STUDIO', moduleCode: 'studio_equipment', permissionCode: 'studio.equipment.read', severity: 'error', actionUrl: '/app/studio/equipment/assets', dedupeIdentity: nestedIdentity('assignment.id', 'asset_assignment'), content: (c) => ({ title: `Pengembalian aset terlambat: ${contextValue(c, 'asset.asset_code', 'Aset')}`, message: `Aset masih tercatat pada proyek ${contextValue(c, 'assignment.project_code', 'Studio')} setelah batas pengembalian.` }) },
];

export class SystemNotificationSensorService {
  async runOnce(now = new Date()): Promise<SystemNotificationSensorRunResult> {
    const [rows] = await pool.execute('SELECT id, organization_id, code FROM business_units WHERE is_active = 1 ORDER BY id') as [BusinessUnit[], unknown];
    let policiesChecked = 0;
    let candidateCount = 0;
    let createdCount = 0;
    let failedPolicies = 0;
    let failedCandidates = 0;
    const bucket = jakartaBusinessDate(now);

    for (const businessUnit of rows) {
      for (const policy of systemNotificationSensorPolicies) {
        if (String(businessUnit.code).toUpperCase() !== policy.workspaceCode) continue;
        policiesChecked += 1;
        let candidates: SensorCandidate[];
        try {
          candidates = await automationSensorService.candidates(policy.event, Number(businessUnit.id), Number(businessUnit.organization_id));
        } catch (error) {
          failedPolicies += 1;
          console.warn('[notifications] sensor policy query failed', {
            event: policy.event,
            businessUnitId: Number(businessUnit.id),
            error: sanitizeAutomationError(error),
          });
          continue;
        }
        candidateCount += candidates.length;
        for (const candidate of candidates) {
          try {
            const content = policy.content(candidate);
            const target = policy.dedupeIdentity?.(candidate) || identity(candidate);
            const dedupeKey = `system:sensor:${policy.event}:${Number(businessUnit.id)}:${target.entityType}:${target.entityId}:${bucket}`;
            const outcomes = await notificationService.createForWorkspace({
              organizationId: Number(businessUnit.organization_id), businessUnitId: Number(businessUnit.id),
              notificationType: 'system', moduleCode: policy.moduleCode, severityCode: policy.severity,
              title: content.title, message: content.message, actionUrl: policy.actionUrl,
              entityType: candidate.entityType, entityId: candidate.entityId, dedupeKey,
            }, { businessUnitId: Number(businessUnit.id), permissionCode: policy.permissionCode });
            createdCount += outcomes.filter((outcome) => outcome.status === 'created').length;
          } catch (error) {
            failedCandidates += 1;
            console.warn('[notifications] sensor candidate delivery failed', {
              event: policy.event,
              businessUnitId: Number(businessUnit.id),
              error: sanitizeAutomationError(error),
            });
          }
        }
      }
    }
    return { businessUnits: rows.length, policiesChecked, candidates: candidateCount, created: createdCount, failedPolicies, failedCandidates, bucket };
  }
}

export const systemNotificationSensorService = new SystemNotificationSensorService();
