import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { studioBillingReferencesService } from './studio-billing-references.service';
import { studioBillingSummaryService } from './studio-billing-summary.service';
import { parseBillingId } from './studio-billing.shared';
import { studioInvoiceService } from './studio-invoice.service';
import { studioQuotationService } from './studio-quotation.service';
import { studioQuotationTemplateService } from './studio-quotation-template.service';
import { createInvoiceSchema, createQuotationSchema, createQuotationTemplateSchema, reasonSchema, updateInvoiceSchema, updateQuotationSchema, updateQuotationTemplateSchema } from './studio-billing.schema';

const actor = (req: Request) => Number((req as any).user?.id);
const mayUpdateProjects = (req: Request) => Boolean((req as any).user?.permissions?.includes('studio.projects.write'));
const optionalPositive = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number.parseInt(String(value), 10);
  return Number.isInteger(number) && number > 0 ? number : undefined;
};
const optionalText = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;
const page = (value: unknown, fallback: number) => Math.max(1, optionalPositive(value) || fallback);
const asValidationError = (error: unknown, message: string) => error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', message, error.issues) : error;

export class StudioBillingController {
  overview = async (_req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioBillingSummaryService.overview()); } catch (error) { next(error); } };
  outstanding = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await studioBillingSummaryService.outstanding({ page: page(req.query.page, 1), limit: Math.min(100, page(req.query.limit, 20)), clientId: optionalPositive(req.query.client), projectId: optionalPositive(req.query.project), overdue: req.query.overdue === 'true', dueFrom: optionalText(req.query.due_from), dueTo: optionalText(req.query.due_to), groupBy: req.query.group_by === 'client' || req.query.group_by === 'due_date' ? req.query.group_by : 'invoice' })); }
    catch (error) { next(error); }
  };
  references = async (_req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioBillingReferencesService.getAll()); } catch (error) { next(error); } };
  projectScope = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioBillingReferencesService.getProjectScope(parseBillingId(req.params.id, 'ID proyek'))); } catch (error) { next(error); } };

  quotations = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await studioQuotationService.list({ page: page(req.query.page, 1), limit: Math.min(100, page(req.query.limit, 20)), search: optionalText(req.query.search), status: optionalText(req.query.status), clientId: optionalPositive(req.query.client_id), projectId: optionalPositive(req.query.project_id), issueFrom: optionalText(req.query.issue_from), issueTo: optionalText(req.query.issue_to), validity: optionalText(req.query.validity), sortBy: optionalText(req.query.sort_by), sortOrder: req.query.sort_order === 'asc' ? 'asc' : 'desc' })); }
    catch (error) { next(error); }
  };
  quotation = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioQuotationService.detail(parseBillingId(req.params.id, 'ID penawaran'))); } catch (error) { next(error); } };
  createQuotation = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioQuotationService.create(createQuotationSchema.parse(req.body), actor(req)), undefined, 201); } catch (error) { next(asValidationError(error, 'Data penawaran tidak valid.')); } };
  updateQuotation = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioQuotationService.update(parseBillingId(req.params.id, 'ID penawaran'), updateQuotationSchema.parse(req.body), actor(req))); } catch (error) { next(asValidationError(error, 'Data penawaran tidak valid.')); } };
  sendQuotation = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioQuotationService.send(parseBillingId(req.params.id, 'ID penawaran'), actor(req), mayUpdateProjects(req))); } catch (error) { next(error); } };
  acceptQuotation = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioQuotationService.accept(parseBillingId(req.params.id, 'ID penawaran'), actor(req), mayUpdateProjects(req))); } catch (error) { next(error); } };
  rejectQuotation = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioQuotationService.reject(parseBillingId(req.params.id, 'ID penawaran'), reasonSchema.parse(req.body).reason, actor(req))); } catch (error) { next(asValidationError(error, 'Alasan penolakan tidak valid.')); } };
  cancelQuotation = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioQuotationService.cancel(parseBillingId(req.params.id, 'ID penawaran'), reasonSchema.parse(req.body).reason, actor(req))); } catch (error) { next(asValidationError(error, 'Alasan pembatalan tidak valid.')); } };
  duplicateQuotation = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioQuotationService.duplicate(parseBillingId(req.params.id, 'ID penawaran'), actor(req)), undefined, 201); } catch (error) { next(error); } };
  quotationPdf = async (req: Request, res: Response, next: NextFunction) => { try { await studioQuotationService.pdf(parseBillingId(req.params.id, 'ID penawaran'), res); } catch (error) { next(error); } };

  templates = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioQuotationTemplateService.list({ page: page(req.query.page, 1), limit: Math.min(100, page(req.query.limit, 20)), search: optionalText(req.query.search), active: req.query.active === 'true' || req.query.active === 'false' ? req.query.active : undefined })); } catch (error) { next(error); } };
  template = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioQuotationTemplateService.get(parseBillingId(req.params.id, 'ID template'))); } catch (error) { next(error); } };
  createTemplate = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioQuotationTemplateService.create(createQuotationTemplateSchema.parse(req.body), actor(req)), undefined, 201); } catch (error) { next(asValidationError(error, 'Data template tidak valid.')); } };
  updateTemplate = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioQuotationTemplateService.update(parseBillingId(req.params.id, 'ID template'), updateQuotationTemplateSchema.parse(req.body), actor(req))); } catch (error) { next(asValidationError(error, 'Data template tidak valid.')); } };
  activateTemplate = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioQuotationTemplateService.setActive(parseBillingId(req.params.id, 'ID template'), true, actor(req))); } catch (error) { next(error); } };
  deactivateTemplate = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioQuotationTemplateService.setActive(parseBillingId(req.params.id, 'ID template'), false, actor(req))); } catch (error) { next(error); } };

  invoices = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await studioInvoiceService.list({ page: page(req.query.page, 1), limit: Math.min(100, page(req.query.limit, 20)), search: optionalText(req.query.search), status: optionalText(req.query.status), clientId: optionalPositive(req.query.client_id), projectId: optionalPositive(req.query.project_id), issueFrom: optionalText(req.query.issue_from), issueTo: optionalText(req.query.issue_to), dueFrom: optionalText(req.query.due_from), dueTo: optionalText(req.query.due_to), outstandingOnly: req.query.outstanding_only === 'true', overdueOnly: req.query.overdue_only === 'true', sortBy: optionalText(req.query.sort_by), sortOrder: req.query.sort_order === 'asc' ? 'asc' : 'desc' })); }
    catch (error) { next(error); }
  };
  invoice = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioInvoiceService.detail(parseBillingId(req.params.id, 'ID invoice'))); } catch (error) { next(error); } };
  createInvoice = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioInvoiceService.create(createInvoiceSchema.parse(req.body), actor(req)), undefined, 201); } catch (error) { next(asValidationError(error, 'Data invoice tidak valid.')); } };
  createInvoiceFromQuotation = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioInvoiceService.createFromQuotation(parseBillingId(req.params.id, 'ID penawaran'), req.body || {}, actor(req)), undefined, 201); } catch (error) { next(error); } };
  updateInvoice = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioInvoiceService.update(parseBillingId(req.params.id, 'ID invoice'), updateInvoiceSchema.parse(req.body), actor(req))); } catch (error) { next(asValidationError(error, 'Data invoice tidak valid.')); } };
  issueInvoice = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioInvoiceService.issue(parseBillingId(req.params.id, 'ID invoice'), actor(req))); } catch (error) { next(error); } };
  voidInvoice = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioInvoiceService.void(parseBillingId(req.params.id, 'ID invoice'), reasonSchema.parse(req.body).reason, actor(req))); } catch (error) { next(asValidationError(error, 'Alasan void tidak valid.')); } };
  invoicePdf = async (req: Request, res: Response, next: NextFunction) => { try { await studioInvoiceService.pdf(parseBillingId(req.params.id, 'ID invoice'), res); } catch (error) { next(error); } };
  schedules = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioInvoiceService.schedules(parseBillingId(req.params.id, 'ID invoice'))); } catch (error) { next(error); } };
  payments = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioInvoiceService.payments(parseBillingId(req.params.id, 'ID invoice'))); } catch (error) { next(error); } };
}
