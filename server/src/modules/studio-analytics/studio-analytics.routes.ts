import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { StudioAnalyticsController } from './studio-analytics.controller';

const controller = new StudioAnalyticsController();
export const studioAnalyticsRoutes = Router();
studioAnalyticsRoutes.use(requireAuth);
studioAnalyticsRoutes.get('/overview', requirePermission('studio.analytics.read'), controller.overview);
studioAnalyticsRoutes.get('/projects', requirePermission('studio.analytics.read'), controller.projects);
studioAnalyticsRoutes.get('/clients', requirePermission('studio.analytics.read'), controller.clients);
studioAnalyticsRoutes.get('/services', requirePermission('studio.analytics.read'), controller.services);
studioAnalyticsRoutes.get('/commercial', requirePermission('studio.analytics.read'), controller.commercial);
studioAnalyticsRoutes.get('/revenue', requirePermission('studio.analytics.read'), controller.revenue);
studioAnalyticsRoutes.get('/profitability', requirePermission('studio.analytics.read'), controller.profitability);
studioAnalyticsRoutes.get('/receivables', requirePermission('studio.analytics.read'), controller.receivables);
studioAnalyticsRoutes.get('/vendors', requirePermission('studio.analytics.read'), controller.vendors);
studioAnalyticsRoutes.get('/equipment', requirePermission('studio.analytics.read'), controller.equipment);
studioAnalyticsRoutes.post('/export', requirePermission('studio.analytics.export'), controller.export);
