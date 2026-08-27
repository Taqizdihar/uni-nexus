import type { PoolConnection } from 'mysql2/promise';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { getStudioBillingBusinessUnit, assignCommercialNumber, tempCode, toNumber, withBillingTransaction, writeBillingAudit } from './studio-billing.shared';
import { studioBillingRepository } from './studio-billing.repository';
import type { QuotationTemplateInput } from './studio-billing.types';

export class StudioQuotationTemplateService {
  private async assertService(connection: PoolConnection, serviceId: number | null | undefined, studioId: number) {
    if (!serviceId) return;
    const [rows]: any = await connection.execute('SELECT id FROM studio_services WHERE id = ? AND business_unit_id = ? AND is_active = 1 LIMIT 1', [serviceId, studioId]);
    if (!rows.length) throw new AppError(400, 'INVALID_SERVICE', 'Layanan Studio tidak ditemukan atau tidak aktif.');
  }

  private async replaceItems(connection: PoolConnection, templateId: number, input: QuotationTemplateInput, studioId: number) {
    await connection.execute('DELETE FROM quotation_template_items WHERE template_id = ?', [templateId]);
    for (let index = 0; index < input.items.length; index += 1) {
      const item = input.items[index];
      await this.assertService(connection, item.service_id, studioId);
      const quantity = Number(item.quantity);
      const price = item.unit_price === null || item.unit_price === undefined ? null : Number(item.unit_price);
      if (!(quantity > 0)) throw new AppError(400, 'INVALID_QUANTITY', 'Jumlah template harus lebih besar dari 0.');
      if (price !== null && price < 0) throw new AppError(400, 'INVALID_UNIT_PRICE', 'Harga default tidak boleh negatif.');
      await connection.execute(
        `INSERT INTO quotation_template_items (template_id, service_id, product_id, description, default_quantity, default_unit_price, sort_order)
         VALUES (?, ?, NULL, ?, ?, ?, ?)`,
        [templateId, item.service_id || null, item.description.trim(), quantity, price, index],
      );
    }
  }

  async list(filters: { page?: number; limit?: number; search?: string; active?: string }) {
    return studioBillingRepository.listTemplates(filters, await getStudioBillingBusinessUnit());
  }

  async get(id: number) {
    const template = await studioBillingRepository.getTemplate(id, await getStudioBillingBusinessUnit());
    if (!template) throw new NotFoundError('Template penawaran tidak ditemukan.');
    return template;
  }

  async create(input: QuotationTemplateInput, userId: number) {
    const studio = await getStudioBillingBusinessUnit();
    return withBillingTransaction(async connection => {
      const [result]: any = await connection.execute(
        `INSERT INTO quotation_templates (organization_id, business_unit_id, template_code, name, title_template, intro_text, terms_text, footer_text, default_valid_days, config_json, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [studio.organizationId, studio.id, tempCode(), input.name.trim(), input.title_template || null, input.intro_text || null, input.terms_text || null, input.footer_text || null, Number(input.default_valid_days ?? 14), input.config_json ? JSON.stringify(input.config_json) : null, input.is_active === false ? 0 : 1, userId],
      );
      const id = Number(result.insertId);
      const code = await assignCommercialNumber(connection, 'quotation_templates', id, 'QTM');
      await this.replaceItems(connection, id, input, studio.id);
      await writeBillingAudit(connection, studio, userId, 'studio.quotation_template_create', 'quotation_template', id, code, `Membuat template penawaran ${code}.`, undefined, { name: input.name, item_count: input.items.length });
      return { id, template_code: code };
    });
  }

  async update(id: number, input: Partial<QuotationTemplateInput>, userId: number) {
    const studio = await getStudioBillingBusinessUnit();
    return withBillingTransaction(async connection => {
      const [rows]: any = await connection.execute('SELECT * FROM quotation_templates WHERE id = ? AND organization_id = ? AND business_unit_id = ? LIMIT 1 FOR UPDATE', [id, studio.organizationId, studio.id]);
      if (!rows.length) throw new NotFoundError('Template penawaran tidak ditemukan.');
      const current = rows[0];
      const fields: Array<[string, unknown]> = [];
      if (input.name !== undefined) fields.push(['name', input.name.trim()]);
      if (input.title_template !== undefined) fields.push(['title_template', input.title_template || null]);
      if (input.intro_text !== undefined) fields.push(['intro_text', input.intro_text || null]);
      if (input.terms_text !== undefined) fields.push(['terms_text', input.terms_text || null]);
      if (input.footer_text !== undefined) fields.push(['footer_text', input.footer_text || null]);
      if (input.default_valid_days !== undefined) fields.push(['default_valid_days', Number(input.default_valid_days)]);
      if (input.config_json !== undefined) fields.push(['config_json', input.config_json ? JSON.stringify(input.config_json) : null]);
      if (input.is_active !== undefined) fields.push(['is_active', input.is_active ? 1 : 0]);
      if (fields.length) await connection.execute(`UPDATE quotation_templates SET ${fields.map(([field]) => `${field} = ?`).join(', ')} WHERE id = ?`, [...fields.map(([, value]) => value), id] as any[]);
      if (input.items !== undefined) await this.replaceItems(connection, id, input as QuotationTemplateInput, studio.id);
      await writeBillingAudit(connection, studio, userId, 'studio.quotation_template_update', 'quotation_template', id, current.template_code, `Memperbarui template penawaran ${current.template_code}.`, undefined, { fields: fields.map(([field]) => field), items_replaced: input.items !== undefined });
      return { id };
    });
  }

  async setActive(id: number, active: boolean, userId: number) {
    const studio = await getStudioBillingBusinessUnit();
    return withBillingTransaction(async connection => {
      const [rows]: any = await connection.execute('SELECT id, template_code, is_active FROM quotation_templates WHERE id = ? AND organization_id = ? AND business_unit_id = ? LIMIT 1 FOR UPDATE', [id, studio.organizationId, studio.id]);
      if (!rows.length) throw new NotFoundError('Template penawaran tidak ditemukan.');
      const current = rows[0];
      if (Boolean(Number(current.is_active)) !== active) await connection.execute('UPDATE quotation_templates SET is_active = ? WHERE id = ?', [active ? 1 : 0, id]);
      await writeBillingAudit(connection, studio, userId, active ? 'studio.quotation_template_activate' : 'studio.quotation_template_deactivate', 'quotation_template', id, current.template_code, `${active ? 'Mengaktifkan' : 'Menonaktifkan'} template penawaran ${current.template_code}.`, { is_active: Boolean(Number(current.is_active)) }, { is_active: active });
      return { id, is_active: active };
    });
  }

  /** A template remains a source of defaults; this returns its independent snapshot values. */
  async useAsDraft(id: number) {
    const template = await this.get(id);
    if (!template.is_active) throw new AppError(409, 'TEMPLATE_INACTIVE', 'Template penawaran ini tidak aktif.');
    return {
      template_id: template.id,
      name: template.name,
      title_template: template.title_template,
      intro_text: template.intro_text,
      terms: template.terms_text,
      footer_text: template.footer_text,
      default_valid_days: toNumber(template.default_valid_days),
      items: template.items.map((item: any) => ({ service_id: item.service_id, description: item.description, quantity: toNumber(item.default_quantity), unit_price: item.default_unit_price === null ? 0 : toNumber(item.default_unit_price), discount_amount: 0 })),
    };
  }
}

export const studioQuotationTemplateService = new StudioQuotationTemplateService();
