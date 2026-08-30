import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';
import { AuditService } from '../../shared/audit/audit.service';
import { auditRequestMeta } from '../../shared/audit/audit-request-meta';
import { auditReadService } from './audit.service';

const actor = (req: AuthRequest) => ({ id: Number(req.user.id), organization_id: Number(req.user.organization_id) });

export class AuditController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) { try { return sendSuccess(res, await auditReadService.list(actor(req), req.query as any)); } catch (error) { next(error); } }
  static async summary(req: AuthRequest, res: Response, next: NextFunction) { try { return sendSuccess(res, await auditReadService.summary(actor(req), req.query as any)); } catch (error) { next(error); } }
  static async meta(req: AuthRequest, res: Response, next: NextFunction) { try { return sendSuccess(res, await auditReadService.meta(actor(req), req.query as any)); } catch (error) { next(error); } }
  static async detail(req: AuthRequest, res: Response, next: NextFunction) { try { return sendSuccess(res, await auditReadService.detail(actor(req), Number(req.params.id))); } catch (error) { next(error); } }
  static async export(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const format = String(req.query.format) as 'csv' | 'xlsx';
      const result = await auditReadService.export(actor(req), req.query as any, format);
      await AuditService.write({ organizationId: Number(req.user.organization_id), userId: Number(req.user.id), moduleCode: 'audit', actionCode: 'audit.export', entityType: 'audit_export', entityCode: format, description: `Mengekspor ${result.total} baris Log Audit.`, newValues: { format, total_rows: result.total }, ...auditRequestMeta(req) });
      res.status(200).setHeader('Content-Type', result.contentType).setHeader('Content-Disposition', `attachment; filename="${result.filename}"`).send(result.body);
    } catch (error) { next(error); }
  }
}

