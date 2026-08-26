import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { getCraftBusinessUnit } from '../craft-orders/craft-orders.helpers';
import { contactSchema, contactUpdateSchema, customerCreateSchema, customerUpdateSchema, partnerPriceRuleSchema, partnerPriceRuleUpdateSchema, partnerSchema } from './craft-customers.schema';
import { CraftCustomersRepository } from './craft-customers.repository';
import { CraftCustomersService } from './craft-customers.service';
import type { CustomerFilters } from './craft-customers.types';

const parseId = (value: string, label = 'ID'): number => {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'INVALID_ID', `${label} tidak valid.`);
  return id;
};

const parseBoolean = (value: unknown) => value === 'true' || value === true;

export class CraftCustomersController {
  private repository = new CraftCustomersRepository();
  private service = new CraftCustomersService();

  private filtersFromQuery(query: Request['query'], partnersOnly = false): CustomerFilters {
    const validSorts = new Set(['name', 'last_order', 'order_value', 'order_count', 'created_at']);
    const page = query.page ? Number.parseInt(String(query.page), 10) : 1;
    const limit = query.limit ? Number.parseInt(String(query.limit), 10) : 24;
    return {
      page: Number.isFinite(page) ? page : 1, limit: Number.isFinite(limit) ? limit : 24,
      search: typeof query.search === 'string' ? query.search : undefined,
      kind: ['individual', 'company', 'institution'].includes(String(query.kind)) ? query.kind as CustomerFilters['kind'] : undefined,
      relationship: ['customer', 'partner'].includes(String(query.relationship)) ? query.relationship as CustomerFilters['relationship'] : undefined,
      status: ['active', 'inactive'].includes(String(query.status)) ? query.status as CustomerFilters['status'] : undefined,
      hasActiveOrder: parseBoolean(query.hasActiveOrder),
      salesChannelId: query.salesChannelId ? parseId(String(query.salesChannelId), 'Kanal penjualan') : undefined,
      sortBy: validSorts.has(String(query.sortBy)) ? query.sortBy as CustomerFilters['sortBy'] : 'name',
      sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc', partnersOnly,
    };
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); sendSuccess(res, await this.repository.getCustomers(this.filtersFromQuery(req.query), craft)); } catch (error) { next(error); }
  };
  partners = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); sendSuccess(res, await this.repository.getCustomers(this.filtersFromQuery(req.query, true), craft)); } catch (error) { next(error); }
  };
  summary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); sendSuccess(res, await this.repository.getSummary(craft)); } catch (error) { next(error); }
  };
  duplicates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const input = z.object({ display_name: z.string().trim().min(1).max(200), legal_name: z.string().trim().max(250).nullable().optional(), email: z.string().email().nullable().optional().or(z.literal('')), phone: z.string().trim().max(50).nullable().optional(), tax_id: z.string().trim().max(100).nullable().optional() }).parse(req.body);
      sendSuccess(res, await this.repository.findDuplicates({ ...input, email: input.email || null }, craft));
    } catch (error) { next(error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data pengecekan duplikat tidak valid.', error.issues) : error); }
  };
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); const data = customerCreateSchema.parse(req.body); const result = await this.service.createCustomer(data, (req as any).user.id, craft); sendSuccess(res, result, undefined, 201); } catch (error) { next(error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data pelanggan tidak valid.', error.issues) : error); }
  };
  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit(); const partyId = parseId(req.params.id as string, 'ID pelanggan'); const customer = await this.repository.getCustomer(partyId, craft);
      if (!customer) throw new NotFoundError('Pelanggan Craft tidak ditemukan.');
      const [contacts, orders, commercial, priceRules] = await Promise.all([this.repository.getContacts(partyId), this.repository.getOrders(partyId, craft), this.repository.getCommercialSummary(partyId, craft), this.repository.getPriceRules(partyId, craft)]);
      sendSuccess(res, { customer, contacts, orders, commercial, price_rules: priceRules });
    } catch (error) { next(error); }
  };
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); await this.service.updateCustomer(parseId(req.params.id as string, 'ID pelanggan'), customerUpdateSchema.parse(req.body), (req as any).user.id, craft); sendSuccess(res, { message: 'Pelanggan berhasil diperbarui.' }); } catch (error) { next(error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data pelanggan tidak valid.', error.issues) : error); }
  };
  setStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); const data = z.object({ active: z.boolean() }).parse(req.body); await this.service.setCustomerStatus(parseId(req.params.id as string, 'ID pelanggan'), data.active, (req as any).user.id, craft); sendSuccess(res, { message: data.active ? 'Pelanggan Craft diaktifkan.' : 'Pelanggan Craft dinonaktifkan.' }); } catch (error) { next(error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Status pelanggan tidak valid.', error.issues) : error); }
  };
  getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); sendSuccess(res, await this.repository.getOrders(parseId(req.params.id as string, 'ID pelanggan'), craft, req.query.page ? parseId(String(req.query.page), 'Halaman') : 1, req.query.limit ? parseId(String(req.query.limit), 'Batas') : 20)); } catch (error) { next(error); }
  };
  getCommercial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); const partyId = parseId(req.params.id as string, 'ID pelanggan'); if (!await this.repository.getCustomer(partyId, craft)) throw new NotFoundError('Pelanggan Craft tidak ditemukan.'); sendSuccess(res, await this.repository.getCommercialSummary(partyId, craft)); } catch (error) { next(error); }
  };
  createContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); const result = await this.service.createContact(parseId(req.params.id as string, 'ID pelanggan'), contactSchema.parse(req.body), (req as any).user.id, craft); sendSuccess(res, result, undefined, 201); } catch (error) { next(error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data kontak tidak valid.', error.issues) : error); }
  };
  updateContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); await this.service.updateContact(parseId(req.params.id as string, 'ID pelanggan'), parseId(req.params.contactId as string, 'ID kontak'), contactUpdateSchema.parse(req.body), (req as any).user.id, craft); sendSuccess(res, { message: 'Kontak berhasil diperbarui.' }); } catch (error) { next(error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data kontak tidak valid.', error.issues) : error); }
  };
  deleteContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); await this.service.deleteContact(parseId(req.params.id as string, 'ID pelanggan'), parseId(req.params.contactId as string, 'ID kontak'), (req as any).user.id, craft); sendSuccess(res, { message: 'Kontak berhasil dihapus.' }); } catch (error) { next(error); }
  };
  promotePartner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); await this.service.promoteToPartner(parseId(req.params.id as string, 'ID pelanggan'), partnerSchema.parse(req.body), (req as any).user.id, craft); sendSuccess(res, { message: 'Pelanggan berhasil menjadi Mitra Craft.' }); } catch (error) { next(error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data kemitraan tidak valid.', error.issues) : error); }
  };
  updatePartner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); await this.service.updatePartner(parseId(req.params.id as string, 'ID pelanggan'), partnerSchema.parse(req.body), (req as any).user.id, craft); sendSuccess(res, { message: 'Kemitraan berhasil diperbarui.' }); } catch (error) { next(error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data kemitraan tidak valid.', error.issues) : error); }
  };
  endPartner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); const data = z.object({ end_date: z.string().date().nullable().optional() }).parse(req.body); await this.service.endPartnership(parseId(req.params.id as string, 'ID pelanggan'), data.end_date, (req as any).user.id, craft); sendSuccess(res, { message: 'Kemitraan telah diakhiri. Pelanggan Craft tetap aktif.' }); } catch (error) { next(error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Tanggal kemitraan tidak valid.', error.issues) : error); }
  };
  getPrices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); const partyId = parseId(req.params.id as string, 'ID pelanggan'); if (!await this.repository.getCustomer(partyId, craft)) throw new NotFoundError('Pelanggan Craft tidak ditemukan.'); sendSuccess(res, await this.repository.getPriceRules(partyId, craft)); } catch (error) { next(error); }
  };
  createPrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); const result = await this.service.createPriceRule(parseId(req.params.id as string, 'ID pelanggan'), partnerPriceRuleSchema.parse(req.body), (req as any).user.id, craft); sendSuccess(res, result, undefined, 201); } catch (error) { next(error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Aturan harga Mitra tidak valid.', error.issues) : error); }
  };
  updatePrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); await this.service.updatePriceRule(parseId(req.params.id as string, 'ID pelanggan'), parseId(req.params.ruleId as string, 'ID aturan harga'), partnerPriceRuleUpdateSchema.parse(req.body), (req as any).user.id, craft); sendSuccess(res, { message: 'Aturan harga Mitra berhasil diperbarui.' }); } catch (error) { next(error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Aturan harga Mitra tidak valid.', error.issues) : error); }
  };
  deactivatePrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const craft = await getCraftBusinessUnit(); await this.service.deactivatePriceRule(parseId(req.params.id as string, 'ID pelanggan'), parseId(req.params.ruleId as string, 'ID aturan harga'), (req as any).user.id, craft); sendSuccess(res, { message: 'Aturan harga Mitra dinonaktifkan.' }); } catch (error) { next(error); }
  };
  resolvePrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit(); const partyId = parseId(req.params.id as string, 'ID pelanggan'); const productId = parseId(String(req.query.productId), 'ID produk');
      const variantId = req.query.variantId ? parseId(String(req.query.variantId), 'ID varian') : null; const quantity = Number(req.query.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new AppError(400, 'INVALID_QUANTITY', 'Kuantitas harus lebih dari nol.');
      sendSuccess(res, await this.service.pricing.resolveWithPool(partyId, productId, variantId, quantity, craft.id));
    } catch (error) { next(error); }
  };
  exportCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit(); const result = await this.repository.getCustomers({ ...this.filtersFromQuery(req.query), page: 1, limit: 100 }, craft);
      const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
      const header = ['Code', 'Name', 'Kind', 'Email', 'Phone', 'Partner status', 'Total Orders', 'Order Value', 'Last Order'];
      const rows = result.items.map(item => [item.code, item.display_name, item.party_kind, item.email || item.primary_contact_email, item.phone || item.primary_contact_phone, item.is_partner ? 'Mitra' : 'Pelanggan', item.total_orders, item.total_order_value, item.last_order_at]);
      res.status(200).type('text/csv; charset=utf-8').attachment('craft-customers.csv').send(`\uFEFF${[header, ...rows].map(row => row.map(escape).join(',')).join('\n')}`);
    } catch (error) { next(error); }
  };
}
