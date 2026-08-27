import type { PoolConnection } from 'mysql2/promise';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { studioClientService } from '../../shared/party/studio-client.service';
import { studioBillingDocumentService } from './studio-billing-document.service';
import { studioBillingRepository } from './studio-billing.repository';
import { STUDIO_PROJECT_INVOICE_SOURCE, assignCommercialNumber, assertDateOrder, getStudioBillingBusinessUnit, loadStudioProjectForBilling, publishBillingEvent, roundMoney, studioDate, tempCode, toNumber, toSqlDate, withBillingTransaction, writeBillingAudit } from './studio-billing.shared';
import type { CommercialLineInput, InvoiceInput, InvoiceListFilters, PaymentScheduleInput } from './studio-billing.types';

interface InvoiceTotals { subtotal: number; discount_amount: number; tax_amount: number; total_amount: number; }
interface ResolvedInvoiceReferences { partyId: number; quotation: any | null; project: any | null; sourceType: 'studio_project' | 'manual'; sourceId: number | null; }

export class StudioInvoiceService {
  private calculate(items: CommercialLineInput[], headerDiscount: number): { totals: InvoiceTotals; items: Array<CommercialLineInput & { line_total: number }> } {
    const calculated = items.map((line, index) => {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unit_price);
      const discount = roundMoney(Number(line.discount_amount || 0));
      const tax = roundMoney(Number(line.tax_amount || 0));
      if (!(quantity > 0)) throw new AppError(400, 'INVALID_QUANTITY', `Jumlah item ${index + 1} harus lebih besar dari 0.`);
      if (unitPrice < 0) throw new AppError(400, 'INVALID_UNIT_PRICE', `Harga item ${index + 1} tidak boleh negatif.`);
      const gross = roundMoney(quantity * unitPrice);
      if (discount < 0 || discount > gross + 0.005) throw new AppError(400, 'INVALID_LINE_DISCOUNT', `Diskon item ${index + 1} harus berada di antara 0 dan nilai bruto.`);
      return { ...line, quantity, unit_price: unitPrice, discount_amount: discount, tax_amount: tax, line_total: roundMoney(gross - discount + tax) };
    });
    const subtotal = roundMoney(calculated.reduce((sum, item) => sum + roundMoney(item.quantity * item.unit_price - Number(item.discount_amount || 0)), 0));
    const tax = roundMoney(calculated.reduce((sum, item) => sum + Number(item.tax_amount || 0), 0));
    const discount = roundMoney(Number(headerDiscount || 0));
    if (discount > subtotal + 0.005) throw new AppError(400, 'INVALID_HEADER_DISCOUNT', 'Diskon invoice tidak boleh melebihi subtotal.');
    return { totals: { subtotal, discount_amount: discount, tax_amount: tax, total_amount: roundMoney(Math.max(0, subtotal - discount + tax)) }, items: calculated };
  }

  private async validateLines(connection: PoolConnection, lines: CommercialLineInput[], studioId: number) {
    for (const line of lines) {
      if (!line.description.trim()) throw new AppError(400, 'INVALID_LINE_DESCRIPTION', 'Deskripsi item invoice wajib diisi.');
      if (line.service_id) {
        const [rows]: any = await connection.execute('SELECT id FROM studio_services WHERE id = ? AND business_unit_id = ? AND is_active = 1 LIMIT 1', [line.service_id, studioId]);
        if (!rows.length) throw new AppError(400, 'INVALID_SERVICE', 'Layanan Studio tidak ditemukan atau tidak aktif.');
      }
    }
  }

  private async resolveReferences(connection: PoolConnection, input: Pick<InvoiceInput, 'party_id' | 'quotation_id' | 'source_type' | 'source_id'>, studio: Awaited<ReturnType<typeof getStudioBillingBusinessUnit>>, options: { requireAcceptedQuotation?: boolean; requireProjectEligible?: boolean } = {}): Promise<ResolvedInvoiceReferences> {
    const client = await studioClientService.assertStudioClient(connection, Number(input.party_id), studio);
    let quotation: any = null;
    let project: any = null;
    let sourceType = input.source_type || 'manual';
    let sourceId = input.source_id ? Number(input.source_id) : null;
    if (input.quotation_id) {
      const [quotes]: any = await connection.execute('SELECT * FROM quotations WHERE id = ? AND organization_id = ? AND business_unit_id = ? AND order_id IS NULL LIMIT 1 FOR UPDATE', [input.quotation_id, studio.organizationId, studio.id]);
      if (!quotes.length) throw new AppError(400, 'INVALID_QUOTATION', 'Penawaran Studio tidak ditemukan.');
      quotation = quotes[0];
      if (options.requireAcceptedQuotation !== false && quotation.status_code !== 'accepted') throw new AppError(409, 'QUOTATION_NOT_ACCEPTED', 'Invoice hanya dapat dibuat dari penawaran yang telah diterima.');
      if (Number(quotation.party_id) !== Number(input.party_id)) throw new AppError(409, 'QUOTATION_CLIENT_MISMATCH', 'Klien invoice harus sama dengan klien penawaran.');
      if (quotation.project_id) { sourceType = STUDIO_PROJECT_INVOICE_SOURCE; sourceId = Number(quotation.project_id); }
      else { sourceType = 'manual'; sourceId = null; }
    }
    if (sourceType === STUDIO_PROJECT_INVOICE_SOURCE) {
      if (!sourceId) throw new AppError(400, 'PROJECT_REQUIRED', 'Invoice proyek memerlukan proyek Studio.');
      project = await loadStudioProjectForBilling(connection, sourceId, studio);
      if (Number(project.client_party_id) !== Number(client.id)) throw new AppError(409, 'PROJECT_CLIENT_MISMATCH', 'Klien invoice harus sama dengan klien proyek.');
      if (project.status_code === 'cancelled') throw new AppError(409, 'PROJECT_CANCELLED', 'Invoice baru tidak dapat dibuat untuk proyek yang dibatalkan.');
      if (options.requireProjectEligible && !['approved', 'in_progress', 'review', 'completed', 'paid'].includes(project.status_code) && !quotation) throw new AppError(409, 'PROJECT_NOT_BILLABLE', 'Invoice langsung hanya dapat dibuat untuk proyek yang telah disetujui atau sedang berjalan.');
    } else if (sourceType !== 'manual') {
      throw new AppError(400, 'INVALID_INVOICE_SOURCE', 'Sumber invoice Studio tidak valid.');
    }
    return { partyId: Number(client.id), quotation, project, sourceType, sourceId };
  }

  private async rawItems(connection: PoolConnection, invoiceId: number) {
    const [rows]: any = await connection.execute('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC, id ASC', [invoiceId]);
    return (rows as any[]).map(row => ({ ...row, quantity: toNumber(row.quantity), unit_price: toNumber(row.unit_price), discount_amount: toNumber(row.discount_amount), tax_amount: toNumber(row.tax_amount), line_total: toNumber(row.line_total) }));
  }

  private async replaceItems(connection: PoolConnection, invoiceId: number, items: Array<CommercialLineInput & { line_total: number }>) {
    await connection.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      await connection.execute(
        `INSERT INTO invoice_items (invoice_id, product_id, service_id, description, quantity, unit_price, discount_amount, tax_amount, line_total, sort_order)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [invoiceId, item.service_id || null, item.description.trim(), item.quantity, item.unit_price, item.discount_amount || 0, item.tax_amount || 0, item.line_total, index],
      );
    }
  }

  private async rawSchedules(connection: PoolConnection, invoiceId: number) {
    const [rows]: any = await connection.execute('SELECT * FROM invoice_payment_schedules WHERE invoice_id = ? ORDER BY installment_no ASC, id ASC', [invoiceId]);
    return (rows as any[]).map(row => ({ ...row, amount: toNumber(row.amount), paid_amount: toNumber(row.paid_amount) }));
  }

  private async replaceSchedules(connection: PoolConnection, invoiceId: number, schedules: PaymentScheduleInput[]) {
    await connection.execute('DELETE FROM invoice_payment_schedules WHERE invoice_id = ? AND paid_amount = 0 AND status_code = \'pending\'', [invoiceId]);
    for (let index = 0; index < schedules.length; index += 1) {
      const schedule = schedules[index];
      const dueDate = toSqlDate(schedule.due_date);
      if (!dueDate) throw new AppError(400, 'INVALID_SCHEDULE_DATE', 'Tanggal termin wajib diisi.');
      const amount = roundMoney(Number(schedule.amount));
      if (amount < 0) throw new AppError(400, 'INVALID_SCHEDULE_AMOUNT', 'Nilai termin tidak boleh negatif.');
      await connection.execute(`INSERT INTO invoice_payment_schedules (invoice_id, installment_no, label, due_date, amount, paid_amount, status_code, notes) VALUES (?, ?, ?, ?, ?, 0, 'pending', ?)`, [invoiceId, index + 1, schedule.label || null, dueDate, amount, schedule.notes || null]);
    }
  }

  private async documentHeader(connection: PoolConnection, invoice: any, studio: Awaited<ReturnType<typeof getStudioBillingBusinessUnit>>) {
    const [clients]: any = await connection.execute('SELECT code AS client_code, display_name AS client_name, email AS client_email, phone AS client_phone FROM parties WHERE id = ? AND organization_id = ? LIMIT 1', [invoice.party_id, studio.organizationId]);
    const project = invoice.source_type === STUDIO_PROJECT_INVOICE_SOURCE && invoice.source_id ? await loadStudioProjectForBilling(connection, Number(invoice.source_id), studio) : null;
    return { ...invoice, ...(clients[0] || {}), project_code: project?.project_code || null, project_name: project?.project_name || null };
  }

  private async scheduleTotal(connection: PoolConnection, invoiceId: number) {
    const [rows]: any = await connection.execute(`SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM invoice_payment_schedules WHERE invoice_id = ? AND status_code <> 'cancelled'`, [invoiceId]);
    return { count: toNumber(rows[0]?.count), total: roundMoney(toNumber(rows[0]?.total)) };
  }

  private async assertNoOverInvoice(connection: PoolConnection, invoice: any, studio: Awaited<ReturnType<typeof getStudioBillingBusinessUnit>>) {
    if (invoice.source_type !== STUDIO_PROJECT_INVOICE_SOURCE || !invoice.source_id) return { basis: null, already_invoiced: 0, remaining: null };
    const project = await loadStudioProjectForBilling(connection, Number(invoice.source_id), studio);
    let quotation: any = null;
    if (invoice.quotation_id) {
      const [rows]: any = await connection.execute(`SELECT * FROM quotations WHERE id = ? AND organization_id = ? AND business_unit_id = ? AND status_code = 'accepted' LIMIT 1 FOR UPDATE`, [invoice.quotation_id, studio.organizationId, studio.id]);
      quotation = rows[0] || null;
    } else {
      const [rows]: any = await connection.execute(`SELECT * FROM quotations WHERE project_id = ? AND organization_id = ? AND business_unit_id = ? AND status_code = 'accepted' ORDER BY accepted_at DESC, id DESC LIMIT 1 FOR UPDATE`, [project.id, studio.organizationId, studio.id]);
      quotation = rows[0] || null;
    }
    const basis = quotation ? toNumber(quotation.total_amount) : toNumber(project.contract_value);
    if (basis <= 0.005) throw new AppError(409, 'COMMERCIAL_BASIS_NOT_SET', 'Proyek belum memiliki nilai komersial yang ditetapkan. Tetapkan nilai kontrak atau terima penawaran sebelum menerbitkan invoice.');
    const scopeField = invoice.quotation_id ? 'quotation_id' : 'source_id';
    const scopeValue = invoice.quotation_id ? invoice.quotation_id : invoice.source_id;
    const [rows]: any = await connection.execute(`SELECT COALESCE(SUM(total_amount), 0) AS total FROM invoices WHERE ${scopeField} = ? AND business_unit_id = ? AND id <> ? AND status_code NOT IN ('void','refunded')`, [scopeValue, studio.id, invoice.id]);
    const alreadyInvoiced = roundMoney(toNumber(rows[0]?.total));
    const remaining = roundMoney(Math.max(0, basis - alreadyInvoiced));
    if (toNumber(invoice.total_amount) > remaining + 0.01) throw new AppError(409, 'BILLING_OVER_INVOICE', 'Nilai invoice melampaui sisa nilai komersial proyek.', { commercial_basis: basis, already_invoiced: alreadyInvoiced, remaining, requested: toNumber(invoice.total_amount) });
    return { basis, already_invoiced: alreadyInvoiced, remaining };
  }

  async list(filters: InvoiceListFilters) { return studioBillingRepository.listInvoices(filters, await getStudioBillingBusinessUnit()); }

  async detail(id: number) {
    const studio = await getStudioBillingBusinessUnit();
    const invoice = await studioBillingRepository.getInvoice(id, studio);
    if (!invoice) throw new NotFoundError('Invoice Studio tidak ditemukan.');
    const [items, schedules, payments, activity, document] = await Promise.all([studioBillingRepository.getInvoiceItems(id), studioBillingRepository.getSchedules(id), studioBillingRepository.getPayments(id, studio), studioBillingRepository.getActivity('invoice', id, studio), studioBillingRepository.getDocument('invoice', id, studio)]);
    return { invoice, items, schedules, payments, activity, document: document ? { id: Number(document.id), file_name: document.file_name, created_at: document.created_at, version_no: Number(document.version_no) } : null };
  }

  async create(input: InvoiceInput, userId: number) {
    const studio = await getStudioBillingBusinessUnit();
    return withBillingTransaction(async connection => {
      const issueDate = toSqlDate(input.issue_date);
      if (!issueDate) throw new AppError(400, 'INVALID_DATE', 'Tanggal invoice wajib diisi.');
      const dueDate = toSqlDate(input.due_date);
      assertDateOrder(issueDate, dueDate, 'Tanggal jatuh tempo');
      const references = await this.resolveReferences(connection, input, studio, { requireAcceptedQuotation: true, requireProjectEligible: true });
      await this.validateLines(connection, input.items, studio.id);
      const calculation = this.calculate(input.items, Number(input.discount_amount || 0));
      const [result]: any = await connection.execute(
        `INSERT INTO invoices (organization_id, business_unit_id, invoice_number, party_id, quotation_id, source_type, source_id, issue_date, due_date, status_code, currency_code, subtotal, discount_amount, tax_amount, total_amount, paid_amount, balance_due, payment_terms, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        [studio.organizationId, studio.id, tempCode(), references.partyId, references.quotation?.id || null, references.sourceType, references.sourceId, issueDate, dueDate, (input.currency_code || 'IDR').toUpperCase(), calculation.totals.subtotal, calculation.totals.discount_amount, calculation.totals.tax_amount, calculation.totals.total_amount, calculation.totals.total_amount, input.payment_terms || null, input.notes || null, userId],
      );
      const id = Number(result.insertId);
      const number = await assignCommercialNumber(connection, 'invoices', id, 'INV');
      await this.replaceItems(connection, id, calculation.items);
      if (input.schedules?.length) await this.replaceSchedules(connection, id, input.schedules);
      await writeBillingAudit(connection, studio, userId, 'studio.invoice_create', 'invoice', id, number, `Membuat invoice ${number}.`, undefined, { party_id: references.partyId, quotation_id: references.quotation?.id || null, source_type: references.sourceType, source_id: references.sourceId, totals: calculation.totals, item_count: calculation.items.length, schedule_count: input.schedules?.length || 0 });
      await publishBillingEvent(connection, studio, 'studio.invoice.created', 'invoice', id, number, userId, { invoice: { id, invoice_number: number, party_id: references.partyId, quotation_id: references.quotation?.id || null, source_type: references.sourceType, source_id: references.sourceId, total_amount: calculation.totals.total_amount, status_code: 'draft' } });
      return { id, invoice_number: number, ...calculation.totals, paid_amount: 0, balance_due: calculation.totals.total_amount };
    });
  }

  async createFromQuotation(quotationId: number, overrides: Partial<InvoiceInput>, userId: number) {
    const studio = await getStudioBillingBusinessUnit();
    const quotation = await studioBillingRepository.getQuotation(quotationId, studio);
    if (!quotation) throw new NotFoundError('Penawaran Studio tidak ditemukan.');
    if (quotation.status_code !== 'accepted') throw new AppError(409, 'QUOTATION_NOT_ACCEPTED', 'Invoice hanya dapat dibuat dari penawaran yang telah diterima.');
    const quoteItems = await studioBillingRepository.getQuotationItems(quotationId);
    const items = quoteItems.map((item, index) => ({ service_id: item.service_id, description: item.description, quantity: toNumber(item.quantity), unit_price: toNumber(item.unit_price), discount_amount: toNumber(item.discount_amount), tax_amount: index === quoteItems.length - 1 ? toNumber(quotation.tax_amount) : 0 }));
    return this.create({
      party_id: Number(quotation.party_id), quotation_id: quotationId, source_type: quotation.project_id ? STUDIO_PROJECT_INVOICE_SOURCE : 'manual', source_id: quotation.project_id ? Number(quotation.project_id) : null,
      issue_date: overrides.issue_date || studioDate(), due_date: overrides.due_date || null, currency_code: quotation.currency_code, discount_amount: toNumber(quotation.discount_amount), payment_terms: overrides.payment_terms || null, notes: overrides.notes || quotation.notes || null, items, schedules: overrides.schedules || [],
    }, userId);
  }

  async update(id: number, input: Partial<InvoiceInput>, userId: number) {
    const studio = await getStudioBillingBusinessUnit();
    return withBillingTransaction(async connection => {
      const invoice = await studioBillingRepository.getInvoiceForUpdate(connection, id, studio);
      if (!invoice) throw new NotFoundError('Invoice Studio tidak ditemukan.');
      if (invoice.status_code !== 'draft') throw new AppError(409, 'INVOICE_COMMERCIAL_LOCKED', 'Hanya invoice Draft yang dapat diubah. Untuk koreksi invoice terbit, void lalu buat invoice baru.');
      const next = {
        party_id: input.party_id === undefined ? Number(invoice.party_id) : Number(input.party_id), quotation_id: input.quotation_id === undefined ? (invoice.quotation_id ? Number(invoice.quotation_id) : null) : input.quotation_id,
        source_type: input.source_type === undefined ? invoice.source_type : input.source_type, source_id: input.source_id === undefined ? (invoice.source_id ? Number(invoice.source_id) : null) : input.source_id,
        issue_date: input.issue_date === undefined ? String(invoice.issue_date).slice(0, 10) : input.issue_date, due_date: input.due_date === undefined ? (invoice.due_date ? String(invoice.due_date).slice(0, 10) : null) : input.due_date,
        currency_code: input.currency_code === undefined ? invoice.currency_code : input.currency_code, discount_amount: input.discount_amount === undefined ? toNumber(invoice.discount_amount) : input.discount_amount,
        payment_terms: input.payment_terms === undefined ? invoice.payment_terms : input.payment_terms, notes: input.notes === undefined ? invoice.notes : input.notes,
      };
      const issueDate = toSqlDate(next.issue_date);
      if (!issueDate) throw new AppError(400, 'INVALID_DATE', 'Tanggal invoice wajib diisi.');
      const dueDate = toSqlDate(next.due_date);
      assertDateOrder(issueDate, dueDate, 'Tanggal jatuh tempo');
      const references = await this.resolveReferences(connection, next as InvoiceInput, studio, { requireAcceptedQuotation: true, requireProjectEligible: true });
      const suppliedItems = input.items === undefined ? await this.rawItems(connection, id) : input.items;
      await this.validateLines(connection, suppliedItems, studio.id);
      const calculation = this.calculate(suppliedItems, Number(next.discount_amount || 0));
      await connection.execute(`UPDATE invoices SET party_id = ?, quotation_id = ?, source_type = ?, source_id = ?, issue_date = ?, due_date = ?, currency_code = ?, subtotal = ?, discount_amount = ?, tax_amount = ?, total_amount = ?, balance_due = GREATEST(0, ? - paid_amount), payment_terms = ?, notes = ? WHERE id = ?`, [references.partyId, references.quotation?.id || null, references.sourceType, references.sourceId, issueDate, dueDate, String(next.currency_code || 'IDR').toUpperCase(), calculation.totals.subtotal, calculation.totals.discount_amount, calculation.totals.tax_amount, calculation.totals.total_amount, calculation.totals.total_amount, next.payment_terms || null, next.notes || null, id]);
      if (input.items !== undefined) await this.replaceItems(connection, id, calculation.items);
      if (input.schedules !== undefined) await this.replaceSchedules(connection, id, input.schedules || []);
      await writeBillingAudit(connection, studio, userId, 'studio.invoice_update', 'invoice', id, invoice.invoice_number, `Memperbarui invoice Draft ${invoice.invoice_number}.`, undefined, { changed_items: input.items !== undefined, changed_schedules: input.schedules !== undefined, totals: calculation.totals });
      return { id, ...calculation.totals };
    });
  }

  async issue(id: number, userId: number) {
    const studio = await getStudioBillingBusinessUnit();
    return withBillingTransaction(async connection => {
      const invoice = await studioBillingRepository.getInvoiceForUpdate(connection, id, studio);
      if (!invoice) throw new NotFoundError('Invoice Studio tidak ditemukan.');
      if (invoice.status_code !== 'draft') {
        if (['issued', 'partial', 'paid', 'overdue'].includes(invoice.status_code)) return { id, status_code: invoice.status_code, already_issued: true };
        throw new AppError(409, 'INVALID_INVOICE_TRANSITION', 'Invoice void atau refunded tidak dapat diterbitkan.');
      }
      const issueDate = String(invoice.issue_date).slice(0, 10);
      const dueDate = invoice.due_date ? String(invoice.due_date).slice(0, 10) : null;
      assertDateOrder(issueDate, dueDate, 'Tanggal jatuh tempo');
      const references = await this.resolveReferences(connection, { party_id: Number(invoice.party_id), quotation_id: invoice.quotation_id ? Number(invoice.quotation_id) : null, source_type: invoice.source_type, source_id: invoice.source_id ? Number(invoice.source_id) : null }, studio, { requireAcceptedQuotation: true, requireProjectEligible: true });
      const items = await this.rawItems(connection, id);
      if (!items.length) throw new AppError(400, 'INVOICE_ITEMS_REQUIRED', 'Invoice harus memiliki minimal satu item.');
      await this.validateLines(connection, items, studio.id);
      const calculation = this.calculate(items, toNumber(invoice.discount_amount));
      const schedules = await this.scheduleTotal(connection, id);
      if (schedules.count && Math.abs(schedules.total - calculation.totals.total_amount) > 0.01) throw new AppError(409, 'PAYMENT_SCHEDULE_TOTAL_MISMATCH', 'Total termin pembayaran harus sama dengan nilai invoice.', { schedule_total: schedules.total, invoice_total: calculation.totals.total_amount });
      const refreshed = { ...invoice, ...calculation.totals, source_type: references.sourceType, source_id: references.sourceId, quotation_id: references.quotation?.id || null };
      const basis = await this.assertNoOverInvoice(connection, refreshed, studio);
      await connection.execute(`UPDATE invoices SET party_id = ?, quotation_id = ?, source_type = ?, source_id = ?, subtotal = ?, discount_amount = ?, tax_amount = ?, total_amount = ?, balance_due = GREATEST(0, ? - paid_amount), status_code = 'issued', issued_at = UTC_TIMESTAMP(3) WHERE id = ?`, [references.partyId, references.quotation?.id || null, references.sourceType, references.sourceId, calculation.totals.subtotal, calculation.totals.discount_amount, calculation.totals.tax_amount, calculation.totals.total_amount, calculation.totals.total_amount, id]);
      const header = { ...refreshed, id };
      await studioBillingDocumentService.createOfficial(connection, 'invoice', await this.documentHeader(connection, header, studio), calculation.items, studio, userId);
      await writeBillingAudit(connection, studio, userId, 'studio.invoice_issue', 'invoice', id, invoice.invoice_number, `Menerbitkan invoice ${invoice.invoice_number}.`, { status_code: 'draft' }, { status_code: 'issued', totals: calculation.totals, billing_basis: basis });
      await publishBillingEvent(connection, studio, 'studio.invoice.issued', 'invoice', id, invoice.invoice_number, userId, { invoice: { id, invoice_number: invoice.invoice_number, party_id: references.partyId, quotation_id: references.quotation?.id || null, source_type: references.sourceType, source_id: references.sourceId, total_amount: calculation.totals.total_amount, balance_due: calculation.totals.total_amount, status_code: 'issued' } });
      return { id, status_code: 'issued', ...calculation.totals, paid_amount: 0, balance_due: calculation.totals.total_amount };
    });
  }

  async void(id: number, reason: string, userId: number) {
    const studio = await getStudioBillingBusinessUnit();
    return withBillingTransaction(async connection => {
      const invoice = await studioBillingRepository.getInvoiceForUpdate(connection, id, studio);
      if (!invoice) throw new NotFoundError('Invoice Studio tidak ditemukan.');
      if (invoice.status_code === 'void') return { id, status_code: 'void', already_void: true };
      if (!['draft', 'issued'].includes(invoice.status_code)) throw new AppError(409, 'INVALID_INVOICE_TRANSITION', 'Invoice ini tidak dapat di-void dari status saat ini.');
      const [payments]: any = await connection.execute(`SELECT id FROM payments WHERE invoice_id = ? AND organization_id = ? AND business_unit_id = ? AND status_code NOT IN ('cancelled','void','rejected','failed') LIMIT 1 FOR UPDATE`, [id, studio.organizationId, studio.id]);
      if (toNumber(invoice.paid_amount) > 0.005 || payments.length) throw new AppError(409, 'INVOICE_HAS_PAYMENTS', 'Invoice yang sudah memiliki pembayaran resmi tidak dapat di-void dari Billing. Koreksi/refund ditangani Studio Finance.');
      await connection.execute(`UPDATE invoices SET status_code = 'void' WHERE id = ?`, [id]);
      await connection.execute(`UPDATE invoice_payment_schedules SET status_code = 'cancelled' WHERE invoice_id = ? AND status_code NOT IN ('paid','cancelled')`, [id]);
      await writeBillingAudit(connection, studio, userId, 'studio.invoice_void', 'invoice', id, invoice.invoice_number, `Membatalkan invoice ${invoice.invoice_number}.`, { status_code: invoice.status_code }, { status_code: 'void', reason });
      await publishBillingEvent(connection, studio, 'studio.invoice.voided', 'invoice', id, invoice.invoice_number, userId, { invoice: { id, invoice_number: invoice.invoice_number, status_code: 'void', reason } });
      return { id, status_code: 'void' };
    });
  }

  async schedules(id: number) {
    const studio = await getStudioBillingBusinessUnit();
    const invoice = await studioBillingRepository.getInvoice(id, studio);
    if (!invoice) throw new NotFoundError('Invoice Studio tidak ditemukan.');
    return studioBillingRepository.getSchedules(id);
  }

  async payments(id: number) {
    const studio = await getStudioBillingBusinessUnit();
    const invoice = await studioBillingRepository.getInvoice(id, studio);
    if (!invoice) throw new NotFoundError('Invoice Studio tidak ditemukan.');
    return studioBillingRepository.getPayments(id, studio);
  }

  async pdf(id: number, res: import('express').Response) {
    const studio = await getStudioBillingBusinessUnit();
    const invoice = await studioBillingRepository.getInvoice(id, studio);
    if (!invoice) throw new NotFoundError('Invoice Studio tidak ditemukan.');
    if (invoice.status_code === 'draft') return studioBillingDocumentService.preview('invoice', invoice, await studioBillingRepository.getInvoiceItems(id), res);
    return studioBillingDocumentService.sendOfficial('invoice', id, studio, res);
  }
}

export const studioInvoiceService = new StudioInvoiceService();
