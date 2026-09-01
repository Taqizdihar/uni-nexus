import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { getSettingDefinition } from '../../shared/settings/settings.registry';
import type { SettingScope } from '../../shared/settings/settings.types';
import { groupUpdateSchema, organizationUpdateSchema } from './settings.schema';
import { organizationSettingsService, settingsService, type SettingsActor } from './settings.service';

const scopes = new Set<SettingScope>(['organization', 'craft', 'studio']);
const actor = (req: AuthRequest): SettingsActor => ({ id: Number(req.user!.id), organizationId: Number(req.user!.organization_id), ip: req.ip, userAgent: req.get('user-agent') || undefined });
const scope = (value: string): SettingScope => { if (!scopes.has(value as SettingScope)) throw new AppError(404, 'SETTINGS_SCOPE_NOT_FOUND', 'Scope pengaturan tidak dikenal.'); return value as SettingScope; };
const handled = (error: unknown) => error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data pengaturan tidak valid.', error.issues) : error;

const snapshotResponse = (snapshot: Awaited<ReturnType<typeof settingsService.snapshot>>) => ({
  business_units: snapshot.businessUnits,
  settings: snapshot.settings.map(item => ({ scope: item.definition.scope, group: item.definition.group, key: item.definition.key, label: item.definition.label, description: item.definition.description, default_value: item.definition.isSecret ? null : item.definition.defaultValue, value: item.definition.isSecret ? null : item.value, configured: item.definition.isSecret ? item.source === 'override' : undefined, source: item.source, updated_at: item.updatedAt, updated_by: item.updatedBy, consumer_notes: item.definition.consumerNotes })),
});

export class SettingsController {
  get = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const currentActor = actor(req); sendSuccess(res, { organization: await organizationSettingsService.get(currentActor), ...snapshotResponse(await settingsService.snapshot(currentActor.organizationId)) }); } catch (error) { next(error); } };
  updateOrganization = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await organizationSettingsService.update(actor(req), organizationUpdateSchema.parse(req.body))); } catch (error) { next(handled(error)); } };
  updateGroup = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const currentScope = scope(String(req.params.scope)); const group = String(req.params.group); const result = await settingsService.updateGroup(actor(req), currentScope, group, groupUpdateSchema.parse(req.body).values); sendSuccess(res, snapshotResponse(result)); } catch (error) { next(handled(error)); } };
  reset = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const currentScope = scope(String(req.params.scope)); const group = String(req.params.group); const key = String(req.params.key); if (!getSettingDefinition(currentScope, group, key)) throw new AppError(404, 'SETTINGS_NOT_FOUND', 'Pengaturan tidak dikenal.'); sendSuccess(res, snapshotResponse(await settingsService.reset(actor(req), currentScope, group, key))); } catch (error) { next(error); } };
  uploadLogo = async (req: AuthRequest, res: Response, next: NextFunction) => { try { if (!req.file) throw new AppError(400, 'UPLOAD_REQUIRED', 'Logo organisasi wajib diunggah.'); sendSuccess(res, await organizationSettingsService.uploadLogo(actor(req), req.file)); } catch (error) { next(error); } };
  deleteLogo = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await organizationSettingsService.deleteLogo(actor(req))); } catch (error) { next(error); } };
  logo = async (req: AuthRequest, res: Response, next: NextFunction) => { try { await organizationSettingsService.streamLogo(actor(req), res); } catch (error) { next(error); } };
}
