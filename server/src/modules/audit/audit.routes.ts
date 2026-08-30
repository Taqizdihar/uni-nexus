import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { AuditController } from './audit.controller';
import { auditExportSchema, auditIdSchema, auditListSchema, auditMetaSchema, auditSummarySchema } from './audit.schema';

const router = Router();
router.use(requireAuth, requirePermission('audit.read'));
router.get('/', validateRequest(auditListSchema), AuditController.list);
router.get('/summary', validateRequest(auditSummarySchema), AuditController.summary);
router.get('/meta', validateRequest(auditMetaSchema), AuditController.meta);
router.get('/export', requirePermission('reports.export'), validateRequest(auditExportSchema), AuditController.export);
router.get('/:id', validateRequest(auditIdSchema), AuditController.detail);

export default router;

