import type { PoolConnection } from 'mysql2/promise';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { settingsService } from '../../shared/settings/settings.service';
import { studioClientService } from '../../shared/party/studio-client.service';
import { studioProjectsService } from '../studio-projects/studio-projects.service';
import { studioBillingDocumentService } from './studio-billing-document.service';
import { studioBillingRepository } from './studio-billing.repository';
import { assignCommercialNumber, assertDateOrder, effectiveQuotationStatus, getStudioBillingBusinessUnit, loadStudioProjectForBilling, publishBillingEvent, roundMoney, studioDate, tempCode, toNumber, toSqlDate, withBillingTransaction, writeBillingAudit } from './studio-billing.shared';
import type { CommercialLineInput, QuotationInput, QuotationListFilters } from './studio-billing.types';

const plusDays = (date: string, days: number) => { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };

interface QuotationTotals { subtotal: number; discount_amount: number; tax_amount: number; total_amount: number; }

export class StudioQuotationService {
  private calculate(items: CommercialLineInput[], headerDiscount: number, taxAmount: number): { totals: QuotationTotals; items: Array<CommercialLineInput & { line_total: number }> } {
    const calculated = items.map((line, index) => {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unit_price);
      const discount = roundMoney(Number(line.discount_amount || 0));
      if (!(quantity > 0)) throw new AppError(400, 'INVALID_QUANTITY', `Jumlah item ${index + 1} harus lebih besar dari 0.`);
      if (unitPrice < 0) throw new AppError(400, 'INVALID_UNIT_PRICE', `Harga item ${index + 1} tidak boleh negatif.`);
      const gross = roundMoney(quantity * unitPrice);
      if (discount < 0 || discount > gross + 0.005) throw new AppError(400, 'INVALID_LINE_DISCOUNT', `Diskon item ${index + 1} harus berada di antara 0 dan nilai bruto.`);
      return { ...line, quantity, unit_price: unitPrice, discount_amount: discount, line_total: roundMoney(gross - discount) };
    });
    const subtotal = roundMoney(calculated.reduce((sum, item) => sum + item.line_total, 0));
    const discount = roundMoney(Number(headerDiscount || 0));
    const tax = roundMoney(Number(taxAmount || 0));
    if (discount > subtotal + 0.005) throw new AppError(400, 'INVALID_HEADER_DISCOUNT', 'Diskon penawaran tidak boleh melebihi subtotal.');
    return { totals: { subtotal, discount_amount: discount, tax_amount: tax, total_amount: roundMoney(Math.max(0, subtotal - discount + tax)) }, items: calculated };
  }

  private async validateLines(connection: PoolConnection, lines: CommercialLineInput[], studioId: number) {
    for (const line of lines) {
      if (!line.description.trim()) throw new AppError(400, 'INVALID_LINE_DESCRIPTION', 'Deskripsi item penawaran wajib diisi.');
      if (line.service_id) {
        const [services]: any = await connection.execute('SELECT id FROM studio_services WHERE id = ? AND business_unit_id = ? AND is_active = 1 LIMIT 1', [line.service_id, studioId]);
        if (!services.length) throw new AppError(400, 'INVALID_SERVICE', 'Layanan Studio tidak ditemukan atau tidak aktif.');
      }
    }
  }

  private async resolveContext(connection: PoolConnection, partyId: number, projectId: number | null | undefined, studio: Awaited<ReturnType<typeof getStudioBillingBusinessUnit>>) {
    const client = await studioClientService.assertStudioClient(connection, partyId, studio);
    let project: any = null;
    if (projectId) {
      project = await loadStudioProjectForBilling(connection, projectId, studio);
      if (Number(project.client_party_id) !== Number(partyId)) throw new AppError(409, 'PROJECT_CLIENT_MISMATCH', 'Proyek yang dipilih tidak dimiliki oleh klien penawaran.');
    }
    return { client, project };
  }

  private async replaceItems(connection: PoolConnection, quotationId: number, items: Array<CommercialLineInput & { line_total: number }>) {
    await connection.execute('DELETE FROM quotation_items WHERE quotation_id = ?', [quotationId]);
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      await connection.execute(
        `INSERT INTO quotation_items (quotation_id, service_id, product_id, description, quantity, unit_price, discount_amount, line_total, sort_order)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
        [quotationId, item.service_id || null, item.description.trim(), item.quantity, item.unit_price, item.discount_amount || 0, item.line_total, index],
      );
    }
  }

  private async rawItems(connection: PoolConnection, quotationId: number) {
    const [rows]: any = await connection.execute('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order ASC, id ASC', [quotationId]);
    return (rows as any[]).map(row => ({ ...row, quantity: toNumber(row.quantity), unit_price: toNumber(row.unit_price), discount_amount: toNumber(row.discount_amount), line_total: toNumber(row.line_total) }));
  }

  private async documentHeader(connection: PoolConnection, quotation: any, studio: Awaited<ReturnType<typeof getStudioBillingBusinessUnit>>) {
    const [clients]: any = await connection.execute('SELECT code AS client_code, display_name AS client_name, email AS client_email, phone AS client_phone FROM parties WHERE id = ? AND organization_id = ? LIMIT 1', [quotation.party_id, studio.organizationId]);
    const project = quotation.project_id ? await loadStudioProjectForBilling(connection, Number(quotation.project_id), studio) : null;
    return { ...quotation, ...(clients[0] || {}), project_code: project?.project_code || null, project_name: project?.project_name || null };
  }

  async list(filters: QuotationListFilters) { return studioBillingRepository.listQuotations(filters, await getStudioBillingBusinessUnit()); }

  async detail(id: number) {
    const studio = await getStudioBillingBusinessUnit();
    const quotation = await studioBillingRepository.getQuotation(id, studio);
    if (!quotation) throw new NotFoundError('Penawaran Studio tidak ditemukan.');
    const [items, activity, document] = await Promise.all([studioBillingRepository.getQuotationItems(id), studioBillingRepository.getActivity('quotation', id, studio), studioBillingRepository.getDocument('quotation', id, studio)]);
    return { quotation, items, activity, document: document ? { id: Number(document.id), file_name: document.file_name, created_at: document.created_at, version_no: Number(document.version_no) } : null };
  }

  async create(input: QuotationInput, userId: number) {
    const studio = await getStudioBillingBusinessUnit();
    return withBillingTransaction(async connection => {
      const issueDate = toSqlDate(input.issue_date);
      if (!issueDate) throw new AppError(400, 'INVALID_DATE', 'Tanggal penawaran wajib diisi.');
      const defaultDays = input.valid_until === undefined ? await settingsService.value<number>(studio.organizationId, 'studio', 'studio', 'quotation_default_valid_days') : null;
      const validUntil = toSqlDate(input.valid_until === undefined ? plusDays(issueDate, defaultDays!) : input.valid_until);
      assertDateOrder(issueDate, validUntil, 'Tanggal berlaku');
      await this.resolveContext(connection, input.party_id, input.project_id, studio);
      await this.validateLines(connection, input.items, studio.id);
      const calculation = this.calculate(input.items, Number(input.discount_amount || 0), Number(input.tax_amount || 0));
      const [result]: any = await connection.execute(
        `INSERT INTO quotations (organization_id, business_unit_id, quotation_number, party_id, project_id, order_id, issue_date, valid_until, status_code, currency_code, subtotal, discount_amount, tax_amount, total_amount, terms, notes, created_by)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [studio.organizationId, studio.id, tempCode(), input.party_id, input.project_id || null, issueDate, validUntil, (input.currency_code || 'IDR').toUpperCase(), calculation.totals.subtotal, calculation.totals.discount_amount, calculation.totals.tax_amount, calculation.totals.total_amount, input.terms || null, input.notes || null, userId],
      );
      const id = Number(result.insertId);
      const quotationNumber = await assignCommercialNumber(connection, 'quotations', id, 'QTN');
      await this.replaceItems(connection, id, calculation.items);
      await writeBillingAudit(connection, studio, userId, 'studio.quotation_create', 'quotation', id, quotationNumber, `Membuat penawaran ${quotationNumber}.`, undefined, { party_id: input.party_id, project_id: input.project_id || null, totals: calculation.totals, item_count: calculation.items.length });
      await publishBillingEvent(connection, studio, 'studio.quotation.created', 'quotation', id, quotationNumber, userId, { quotation: { id, quotation_number: quotationNumber, party_id: input.party_id, project_id: input.project_id || null, total_amount: calculation.totals.total_amount, status_code: 'draft' } });
      return { id, quotation_number: quotationNumber, ...calculation.totals };
    });
  }

  async update(id: number, input: Partial<QuotationInput>, userId: number) {
    const studio = await getStudioBillingBusinessUnit();
    return withBillingTransaction(async connection => {
      const quotation = await studioBillingRepository.getQuotationForUpdate(connection, id, studio);
      if (!quotation) throw new NotFoundError('Penawaran Studio tidak ditemukan.');
      if (quotation.status_code !== 'draft') throw new AppError(409, 'QUOTATION_COMMERCIAL_LOCKED', 'Hanya penawaran Draft yang dapat diubah secara komersial. Gunakan Duplikat untuk membuat revisi.');
      const next = {
        party_id: input.party_id === undefined ? Number(quotation.party_id) : Number(input.party_id),
        project_id: input.project_id === undefined ? (quotation.project_id ? Number(quotation.project_id) : null) : input.project_id,
        issue_date: input.issue_date === undefined ? String(quotation.issue_date).slice(0, 10) : input.issue_date,
        valid_until: input.valid_until === undefined ? (quotation.valid_until ? String(quotation.valid_until).slice(0, 10) : null) : input.valid_until,
        currency_code: input.currency_code === undefined ? quotation.currency_code : input.currency_code,
        discount_amount: input.discount_amount === undefined ? toNumber(quotation.discount_amount) : input.discount_amount,
        tax_amount: input.tax_amount === undefined ? toNumber(quotation.tax_amount) : input.tax_amount,
        terms: input.terms === undefined ? quotation.terms : input.terms,
        notes: input.notes === undefined ? quotation.notes : input.notes,
      };
      const issueDate = toSqlDate(next.issue_date);
      if (!issueDate) throw new AppError(400, 'INVALID_DATE', 'Tanggal penawaran wajib diisi.');
      const validUntil = toSqlDate(next.valid_until);
      assertDateOrder(issueDate, validUntil, 'Tanggal berlaku');
      await this.resolveContext(connection, next.party_id, next.project_id, studio);
      const suppliedItems = input.items === undefined ? await this.rawItems(connection, id) : input.items;
      await this.validateLines(connection, suppliedItems, studio.id);
      const calculation = this.calculate(suppliedItems, Number(next.discount_amount || 0), Number(next.tax_amount || 0));
      await connection.execute(
        `UPDATE quotations SET party_id = ?, project_id = ?, issue_date = ?, valid_until = ?, currency_code = ?, subtotal = ?, discount_amount = ?, tax_amount = ?, total_amount = ?, terms = ?, notes = ? WHERE id = ?`,
        [next.party_id, next.project_id || null, issueDate, validUntil, String(next.currency_code || 'IDR').toUpperCase(), calculation.totals.subtotal, calculation.totals.discount_amount, calculation.totals.tax_amount, calculation.totals.total_amount, next.terms || null, next.notes || null, id],
      );
      if (input.items !== undefined) await this.replaceItems(connection, id, calculation.items);
      await writeBillingAudit(connection, studio, userId, 'studio.quotation_update', 'quotation', id, quotation.quotation_number, `Memperbarui penawaran Draft ${quotation.quotation_number}.`, undefined, { changed_items: input.items !== undefined, totals: calculation.totals });
      return { id, ...calculation.totals };
    });
  }

  async send(id: number, userId: number, canUpdateProject: boolean) {
    const studio = await getStudioBillingBusinessUnit();
    return withBillingTransaction(async connection => {
      const quotation = await studioBillingRepository.getQuotationForUpdate(connection, id, studio);
      if (!quotation) throw new NotFoundError('Penawaran Studio tidak ditemukan.');
      if (quotation.status_code !== 'draft') throw new AppError(409, 'INVALID_QUOTATION_TRANSITION', 'Hanya penawaran Draft yang dapat dikirim.');
      const issueDate = String(quotation.issue_date).slice(0, 10);
      const validUntil = quotation.valid_until ? String(quotation.valid_until).slice(0, 10) : null;
      assertDateOrder(issueDate, validUntil, 'Tanggal berlaku');
      if (validUntil && validUntil < studioDate()) throw new AppError(409, 'QUOTATION_EXPIRED', 'Penawaran yang sudah kedaluwarsa tidak dapat dikirim. Buat revisi baru.');
      const context = await this.resolveContext(connection, Number(quotation.party_id), quotation.project_id ? Number(quotation.project_id) : null, studio);
      const items = await this.rawItems(connection, id);
      if (!items.length) throw new AppError(400, 'QUOTATION_ITEMS_REQUIRED', 'Penawaran harus memiliki minimal satu item.');
      const recalculated = this.calculate(items, toNumber(quotation.discount_amount), toNumber(quotation.tax_amount));
      await connection.execute('UPDATE quotations SET subtotal = ?, discount_amount = ?, tax_amount = ?, total_amount = ?, status_code = \'sent\' WHERE id = ?', [recalculated.totals.subtotal, recalculated.totals.discount_amount, recalculated.totals.tax_amount, recalculated.totals.total_amount, id]);
      const official = { ...quotation, ...recalculated.totals, status_code: 'sent', ...context.client, project_code: context.project?.project_code || null, project_name: context.project?.project_name || null, id };
      await studioBillingDocumentService.createOfficial(connection, 'quotation', official, recalculated.items, studio, userId);
      if (context.project?.status_code === 'lead' && canUpdateProject) await studioProjectsService.transitionFromCommercial(connection, Number(context.project.id), 'quotation', userId, studio, 'Penawaran Studio dikirim.');
      await writeBillingAudit(connection, studio, userId, 'studio.quotation_send', 'quotation', id, quotation.quotation_number, `Mengirim penawaran ${quotation.quotation_number}.`, { status_code: 'draft' }, { status_code: 'sent' });
      await publishBillingEvent(connection, studio, 'studio.quotation.sent', 'quotation', id, quotation.quotation_number, userId, { quotation: { id, quotation_number: quotation.quotation_number, party_id: Number(quotation.party_id), project_id: quotation.project_id ? Number(quotation.project_id) : null, total_amount: recalculated.totals.total_amount, status_code: 'sent' } });
      return { id, status_code: 'sent', total_amount: recalculated.totals.total_amount };
    });
  }

  async accept(id: number, userId: number, canUpdateProject: boolean) {
    const studio = await getStudioBillingBusinessUnit();
    return withBillingTransaction(async connection => {
      const quotation = await studioBillingRepository.getQuotationForUpdate(connection, id, studio);
      if (!quotation) throw new NotFoundError('Penawaran Studio tidak ditemukan.');
      if (quotation.status_code !== 'sent') throw new AppError(409, 'INVALID_QUOTATION_TRANSITION', 'Hanya penawaran yang sudah dikirim dapat diterima.');
      if (effectiveQuotationStatus(quotation) === 'expired') throw new AppError(409, 'QUOTATION_EXPIRED', 'Penawaran telah kedaluwarsa dan tidak dapat diterima. Buat penawaran revisi.');
      let project: any = null;
      if (quotation.project_id) {
        project = await loadStudioProjectForBilling(connection, Number(quotation.project_id), studio);
        const [accepted]: any = await connection.execute(`SELECT id FROM quotations WHERE project_id = ? AND organization_id = ? AND business_unit_id = ? AND id <> ? AND status_code = 'accepted' LIMIT 1 FOR UPDATE`, [quotation.project_id, studio.organizationId, studio.id, id]);
        if (accepted.length) throw new AppError(409, 'PROJECT_ALREADY_HAS_ACCEPTED_QUOTATION', 'Proyek ini sudah memiliki penawaran utama yang diterima.');
      }
      await connection.execute(`UPDATE quotations SET status_code = 'accepted', accepted_at = UTC_TIMESTAMP(3) WHERE id = ?`, [id]);
      if (project && ['lead', 'quotation'].includes(project.status_code) && canUpdateProject) await studioProjectsService.transitionFromCommercial(connection, Number(project.id), 'approved', userId, studio, 'Penawaran Studio diterima klien.');
      await writeBillingAudit(connection, studio, userId, 'studio.quotation_accept', 'quotation', id, quotation.quotation_number, `Menandai penawaran ${quotation.quotation_number} diterima klien.`, { status_code: 'sent' }, { status_code: 'accepted' });
      await publishBillingEvent(connection, studio, 'studio.quotation.accepted', 'quotation', id, quotation.quotation_number, userId, { quotation: { id, quotation_number: quotation.quotation_number, party_id: Number(quotation.party_id), project_id: quotation.project_id ? Number(quotation.project_id) : null, total_amount: toNumber(quotation.total_amount), status_code: 'accepted' } });
      return { id, status_code: 'accepted' };
    });
  }

  async reject(id: number, reason: string, userId: number) {
    const studio = await getStudioBillingBusinessUnit();
    return withBillingTransaction(async connection => {
      const quotation = await studioBillingRepository.getQuotationForUpdate(connection, id, studio);
      if (!quotation) throw new NotFoundError('Penawaran Studio tidak ditemukan.');
      if (quotation.status_code !== 'sent') throw new AppError(409, 'INVALID_QUOTATION_TRANSITION', 'Hanya penawaran yang sudah dikirim dapat ditolak.');
      await connection.execute(`UPDATE quotations SET status_code = 'rejected' WHERE id = ?`, [id]);
      await writeBillingAudit(connection, studio, userId, 'studio.quotation_reject', 'quotation', id, quotation.quotation_number, `Menandai penawaran ${quotation.quotation_number} ditolak.`, { status_code: 'sent' }, { status_code: 'rejected', reason });
      await publishBillingEvent(connection, studio, 'studio.quotation.rejected', 'quotation', id, quotation.quotation_number, userId, { quotation: { id, quotation_number: quotation.quotation_number, status_code: 'rejected', reason } });
      return { id, status_code: 'rejected' };
    });
  }

  async cancel(id: number, reason: string, userId: number) {
    const studio = await getStudioBillingBusinessUnit();
    return withBillingTransaction(async connection => {
      const quotation = await studioBillingRepository.getQuotationForUpdate(connection, id, studio);
      if (!quotation) throw new NotFoundError('Penawaran Studio tidak ditemukan.');
      if (!['draft', 'sent'].includes(quotation.status_code)) throw new AppError(409, 'INVALID_QUOTATION_TRANSITION', 'Hanya penawaran Draft atau Dikirim yang dapat dibatalkan.');
      await connection.execute(`UPDATE quotations SET status_code = 'cancelled' WHERE id = ?`, [id]);
      await writeBillingAudit(connection, studio, userId, 'studio.quotation_cancel', 'quotation', id, quotation.quotation_number, `Membatalkan penawaran ${quotation.quotation_number}.`, { status_code: quotation.status_code }, { status_code: 'cancelled', reason });
      return { id, status_code: 'cancelled' };
    });
  }

  async duplicate(id: number, userId: number) {
    const studio = await getStudioBillingBusinessUnit();
    return withBillingTransaction(async connection => {
      const quotation = await studioBillingRepository.getQuotationForUpdate(connection, id, studio);
      if (!quotation) throw new NotFoundError('Penawaran Studio tidak ditemukan.');
      const context = await this.resolveContext(connection, Number(quotation.party_id), quotation.project_id ? Number(quotation.project_id) : null, studio);
      const items = await this.rawItems(connection, id);
      const [result]: any = await connection.execute(
        `INSERT INTO quotations (organization_id, business_unit_id, quotation_number, party_id, project_id, order_id, issue_date, valid_until, status_code, currency_code, subtotal, discount_amount, tax_amount, total_amount, terms, notes, created_by)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [studio.organizationId, studio.id, tempCode(), quotation.party_id, quotation.project_id || null, studioDate(), quotation.valid_until || null, quotation.currency_code, quotation.subtotal, quotation.discount_amount, quotation.tax_amount, quotation.total_amount, quotation.terms || null, quotation.notes || null, userId],
      );
      const newId = Number(result.insertId);
      const number = await assignCommercialNumber(connection, 'quotations', newId, 'QTN');
      await this.replaceItems(connection, newId, items.map(item => ({ service_id: item.service_id, description: item.description, quantity: toNumber(item.quantity), unit_price: toNumber(item.unit_price), discount_amount: toNumber(item.discount_amount), line_total: toNumber(item.line_total) })));
      await writeBillingAudit(connection, studio, userId, 'studio.quotation_duplicate', 'quotation', newId, number, `Menduplikasi penawaran ${quotation.quotation_number} menjadi ${number}.`, undefined, { source_quotation_id: id, party_id: context.client.id, project_id: quotation.project_id || null });
      return { id: newId, quotation_number: number };
    });
  }

  async pdf(id: number, res: import('express').Response) {
    const studio = await getStudioBillingBusinessUnit();
    const quotation = await studioBillingRepository.getQuotation(id, studio);
    if (!quotation) throw new NotFoundError('Penawaran Studio tidak ditemukan.');
    if (quotation.status_code === 'draft') return studioBillingDocumentService.preview('quotation', quotation, await studioBillingRepository.getQuotationItems(id), res);
    return studioBillingDocumentService.sendOfficial('quotation', id, studio, res);
  }
}

export const studioQuotationService = new StudioQuotationService();
