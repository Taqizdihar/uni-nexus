import { pool } from '../../config/database';
import { studioReferencesService } from '../studio-references/studio-references.service';
import { studioBillingRepository } from './studio-billing.repository';
import { getStudioBillingBusinessUnit, toNumber } from './studio-billing.shared';
import { settingsService } from '../../shared/settings/settings.service';

export class StudioBillingReferencesService {
  async getAll() {
    const studio = await getStudioBillingBusinessUnit();
    const [clients, services, packages, templates, projectRows, organizationRows, quotationDefaultValidDays, invoiceDefaultDueDays, paymentScheduleIntervalDays] = await Promise.all([
      studioReferencesService.getClients(studio, undefined, 200),
      studioReferencesService.getServices(studio),
      studioReferencesService.getServicePackages(studio),
      studioBillingRepository.listTemplates({ page: 1, limit: 200, active: 'true' }, studio),
      pool.execute(
        `SELECT p.id, p.project_code, p.project_name, p.status_code, p.client_party_id, p.contract_value, p.currency_code,
                c.code AS client_code, c.display_name AS client_name,
                (SELECT COUNT(*) FROM studio_project_services sps WHERE sps.project_id = p.id) AS service_count
         FROM studio_projects p JOIN parties c ON c.id = p.client_party_id
         WHERE p.business_unit_id = ? AND p.deleted_at IS NULL AND p.status_code <> 'cancelled'
         ORDER BY p.created_at DESC, p.id DESC LIMIT 300`, [studio.id],
      ),
      pool.execute('SELECT id, name, legal_name, address, city, province, postal_code, country_code, currency_code FROM organizations WHERE id = ? LIMIT 1', [studio.organizationId]),
      settingsService.value<number>(studio.organizationId, 'studio', 'studio', 'quotation_default_valid_days'),
      settingsService.value<number>(studio.organizationId, 'studio', 'studio', 'invoice_default_due_days'),
      settingsService.value<number>(studio.organizationId, 'studio', 'studio', 'payment_schedule_interval_days'),
    ]);
    const projects = (projectRows[0] as any[]).map(row => ({ ...row, contract_value: toNumber(row.contract_value), service_count: toNumber(row.service_count) }));
    const organization = (organizationRows[0] as any[])[0] || { currency_code: 'IDR' };
    return { clients, projects, services, service_packages: packages, quotation_templates: templates.items, organization, defaults: { quotation_valid_days: quotationDefaultValidDays, invoice_due_days: invoiceDefaultDueDays, payment_schedule_interval_days: paymentScheduleIntervalDays } };
  }

  async getProjectScope(projectId: number) {
    const studio = await getStudioBillingBusinessUnit();
    const [projects]: any = await pool.execute(
      `SELECT p.id, p.project_code, p.project_name, p.status_code, p.client_party_id, p.contract_value, p.currency_code, c.display_name AS client_name
       FROM studio_projects p JOIN parties c ON c.id = p.client_party_id
       WHERE p.id = ? AND p.business_unit_id = ? AND p.deleted_at IS NULL LIMIT 1`, [projectId, studio.id],
    );
    if (!projects.length) return null;
    const [services]: any = await pool.execute(
      `SELECT sps.id, sps.service_id, sps.package_id, sps.description, sps.quantity, sps.unit_price, sps.line_total,
              ss.code AS service_code, ss.name AS service_name, pkg.code AS package_code, pkg.name AS package_name
       FROM studio_project_services sps LEFT JOIN studio_services ss ON ss.id = sps.service_id LEFT JOIN service_packages pkg ON pkg.id = sps.package_id
       WHERE sps.project_id = ? ORDER BY sps.id ASC`, [projectId],
    );
    return { project: { ...projects[0], contract_value: toNumber(projects[0].contract_value) }, services: (services as any[]).map(row => ({ ...row, quantity: toNumber(row.quantity), unit_price: toNumber(row.unit_price), line_total: toNumber(row.line_total) })) };
  }
}

export const studioBillingReferencesService = new StudioBillingReferencesService();
