import type { NextFunction, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { documentsService } from './documents.service';

const id = (value: unknown) => { const number = Number.parseInt(String(value || ''), 10); if (!Number.isInteger(number) || number <= 0) throw new AppError(400, 'INVALID_ID', 'ID dokumen tidak valid.'); return number; };
const principal = (req: AuthRequest) => ({ id: Number(req.user!.id), organization_id: Number(req.user!.organization_id), permissions: req.user!.permissions || [] });
const bool = (value: unknown) => String(value || '').toLowerCase() === 'true';
export class DocumentsController {
  list = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await documentsService.list(principal(req), { ...req.query as any, archived: bool(req.query.archived) })); } catch (error) { next(error); } };
  summary = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await documentsService.summary(principal(req))); } catch (error) { next(error); } };
  meta = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await documentsService.meta(principal(req))); } catch (error) { next(error); } };
  get = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await documentsService.get(id(req.params.id), principal(req))); } catch (error) { next(error); } };
  create = async (req: AuthRequest, res: Response, next: NextFunction) => { try { if (!req.file) throw new AppError(400, 'UPLOAD_REQUIRED', 'Pilih file dokumen terlebih dahulu.'); sendSuccess(res, await documentsService.create(principal(req), req.body, req.file), undefined, 201); } catch (error) { next(error); } };
  update = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await documentsService.update(id(req.params.id), principal(req), req.body)); } catch (error) { next(error); } };
  versions = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await documentsService.versions(id(req.params.id), principal(req))); } catch (error) { next(error); } };
  addVersion = async (req: AuthRequest, res: Response, next: NextFunction) => { try { if (!req.file) throw new AppError(400, 'UPLOAD_REQUIRED', 'Pilih file versi terlebih dahulu.'); sendSuccess(res, await documentsService.addVersion(id(req.params.id), principal(req), req.file), undefined, 201); } catch (error) { next(error); } };
  archive = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await documentsService.archive(id(req.params.id), principal(req))); } catch (error) { next(error); } };
  restore = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await documentsService.archive(id(req.params.id), principal(req), true)); } catch (error) { next(error); } };
  preview = async (req: AuthRequest, res: Response, next: NextFunction) => { try { await documentsService.stream(id(req.params.id), principal(req), 'preview', res); } catch (error) { next(error); } };
  download = async (req: AuthRequest, res: Response, next: NextFunction) => { try { await documentsService.stream(id(req.params.id), principal(req), 'download', res); } catch (error) { next(error); } };
}
