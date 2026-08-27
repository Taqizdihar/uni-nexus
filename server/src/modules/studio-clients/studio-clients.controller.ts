import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { getStudioBusinessUnit, parseNumericId } from './studio-clients.helpers';
import {
  clientContactUpdateSchema, clientDuplicateSchema, createClientSchema, deactivateClientSchema,
  updateClientSchema, clientContactInputSchema,
} from './studio-clients.schema';
import { studioClientActivityService } from './studio-client-activity.service';
import { studioClientCommercialService } from './studio-client-commercial.service';
import { studioClientContactsService } from './studio-client-contacts.service';
import { studioClientsService } from './studio-clients.service';
import type { ClientProjectFilters } from './studio-clients.types';

const asValidationError = (error: unknown, message: string) =>
  error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', message, error.issues) : error;

const actorId = (req: Request) => Number((req as any).user?.id);

const parseOptionalInt = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

/** Escapes CSV cells and neutralizes leading =, +, -, @ so exported files can't carry spreadsheet formulas. */
const csvCell = (value: unknown) => {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

export class StudioClientsController {
  private clientId = (req: Request) => parseNumericId(req.params.id, 'ID klien');

  getSummary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioClientsService.summary(await getStudioBusinessUnit()));
    } catch (error) { next(error); }
  };

  getClients = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      sendSuccess(res, await studioClientsService.list({
        page: parseOptionalInt(req.query.page) || 1,
        limit: parseOptionalInt(req.query.limit) || 20,
        search: (req.query.search as string) || undefined,
        relationshipStatus: (req.query.relationship_status as any) || undefined,
        partyKind: (req.query.party_kind as string) || undefined,
        city: (req.query.city as string) || undefined,
        hasActiveProject: req.query.has_active_project === 'true',
        repeatClient: req.query.repeat_client === 'true',
        hasOutstanding: req.query.has_outstanding === 'true',
        sortBy: (req.query.sort_by as string) || undefined,
        sortOrder: req.query.sort_order === 'desc' ? 'desc' : 'asc',
      }, studio));
    } catch (error) { next(error); }
  };

  exportClients = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const result = await studioClientsService.list({
        page: 1, limit: 100,
        search: (req.query.search as string) || undefined,
        relationshipStatus: (req.query.relationship_status as any) || undefined,
        partyKind: (req.query.party_kind as string) || undefined,
        city: (req.query.city as string) || undefined,
        hasActiveProject: req.query.has_active_project === 'true',
        repeatClient: req.query.repeat_client === 'true',
        hasOutstanding: req.query.has_outstanding === 'true',
        sortBy: (req.query.sort_by as string) || undefined,
        sortOrder: req.query.sort_order === 'desc' ? 'desc' : 'asc',
      }, studio);
      const relationshipLabels: Record<string, string> = { active: 'Aktif', role_inactive: 'Nonaktif sebagai Klien Studio', party_inactive: 'Party Nonaktif' };
      const partyKindLabels: Record<string, string> = { individual: 'Perorangan', company: 'Perusahaan', institution: 'Institusi' };
      const header = ['Kode Klien', 'Nama', 'Jenis', 'Email', 'Telepon', 'Kota', 'Kontak Utama', 'Proyek Aktif', 'Total Proyek', 'Nilai Kontrak', 'Outstanding', 'Status Hubungan'];
      const rows = result.items.map(item => [
        item.code, item.display_name, partyKindLabels[item.party_kind] || item.party_kind, item.email, item.phone, item.city,
        item.primary_contact_name, item.active_project_count, item.total_project_count, item.committed_contract_value,
        item.outstanding_balance, relationshipLabels[item.relationship_status] || item.relationship_status,
      ]);
      res.status(200).type('text/csv; charset=utf-8').attachment('studio-clients.csv')
        .send(`﻿${[header, ...rows].map(row => row.map(csvCell).join(',')).join('\n')}`);
    } catch (error) { next(error); }
  };

  findDuplicates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = clientDuplicateSchema.parse(req.body ?? {});
      sendSuccess(res, await studioClientsService.findDuplicates(data, studio));
    } catch (error) { next(asValidationError(error, 'Data pengecekan duplikat tidak valid.')); }
  };

  createClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = createClientSchema.parse(req.body);
      sendSuccess(res, await studioClientsService.createClient({ ...data, email: data.email || null, website: data.website || null }, actorId(req), studio), undefined, 201);
    } catch (error) { next(asValidationError(error, 'Data klien tidak valid.')); }
  };

  getClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioClientsService.getClientDetail(this.clientId(req), await getStudioBusinessUnit()));
    } catch (error) { next(error); }
  };

  updateClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = updateClientSchema.parse(req.body);
      // Only normalize '' -> null for keys the caller actually sent; never introduce
      // a key that wasn't in the request, or a partial patch would touch untouched fields.
      const payload: Record<string, unknown> = { ...data };
      if (Object.prototype.hasOwnProperty.call(data, 'email') && data.email === '') payload.email = null;
      if (Object.prototype.hasOwnProperty.call(data, 'website') && data.website === '') payload.website = null;
      sendSuccess(res, await studioClientsService.updateClient(this.clientId(req), payload, actorId(req), studio));
    } catch (error) { next(asValidationError(error, 'Data klien tidak valid.')); }
  };

  activateClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioClientsService.activateClient(this.clientId(req), actorId(req), await getStudioBusinessUnit()));
    } catch (error) { next(error); }
  };

  deactivateClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = deactivateClientSchema.parse(req.body ?? {});
      sendSuccess(res, await studioClientsService.deactivateClient(this.clientId(req), data.reason || null, data.confirm_active_projects, actorId(req), studio));
    } catch (error) { next(asValidationError(error, 'Data penonaktifan klien tidak valid.')); }
  };

  getContacts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = this.clientId(req);
      await studioClientsService.assertClientExists(clientId, await getStudioBusinessUnit());
      sendSuccess(res, await studioClientContactsService.list(clientId));
    } catch (error) { next(error); }
  };

  createContact = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = clientContactInputSchema.parse(req.body);
      sendSuccess(res, await studioClientContactsService.createContact(this.clientId(req), data, actorId(req), studio), undefined, 201);
    } catch (error) { next(asValidationError(error, 'Data kontak tidak valid.')); }
  };

  updateContact = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = clientContactUpdateSchema.parse(req.body);
      sendSuccess(res, await studioClientContactsService.updateContact(this.clientId(req), parseNumericId(req.params.contactId, 'ID kontak'), data, actorId(req), studio));
    } catch (error) { next(asValidationError(error, 'Data kontak tidak valid.')); }
  };

  deleteContact = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      sendSuccess(res, await studioClientContactsService.deleteContact(this.clientId(req), parseNumericId(req.params.contactId, 'ID kontak'), actorId(req), studio));
    } catch (error) { next(error); }
  };

  getProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const filters: ClientProjectFilters = {
        status: (['all', 'active', 'completed', 'cancelled'].includes(req.query.status as string) ? req.query.status : 'all') as ClientProjectFilters['status'],
        page: parseOptionalInt(req.query.page) || 1,
        limit: parseOptionalInt(req.query.limit) || 20,
      };
      sendSuccess(res, await studioClientsService.getProjects(this.clientId(req), filters, studio));
    } catch (error) { next(error); }
  };

  getCommercialSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioClientCommercialService.getSummary(this.clientId(req), await getStudioBusinessUnit()));
    } catch (error) { next(error); }
  };

  getQuotations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioClientCommercialService.getQuotations(this.clientId(req), await getStudioBusinessUnit()));
    } catch (error) { next(error); }
  };

  getInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioClientCommercialService.getInvoices(this.clientId(req), await getStudioBusinessUnit()));
    } catch (error) { next(error); }
  };

  getActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioClientActivityService.getActivity(this.clientId(req), await getStudioBusinessUnit()));
    } catch (error) { next(error); }
  };
}
