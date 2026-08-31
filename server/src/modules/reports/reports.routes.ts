import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { ReportsController } from './reports.controller';

const controller = new ReportsController();
export const reportsRoutes = Router();
reportsRoutes.use(requireAuth, requirePermission('reports.read'));
reportsRoutes.get('/overview', controller.overview);
reportsRoutes.get('/catalog', controller.catalog);
reportsRoutes.get('/meta', controller.meta);
reportsRoutes.get('/exports', controller.history);
reportsRoutes.get('/exports/:id', controller.exportDetail);
reportsRoutes.get('/exports/:id/download', controller.download);
reportsRoutes.get('/:reportCode/preview', controller.preview);
reportsRoutes.post('/:reportCode/export', controller.export);
