import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { CraftAnalyticsController } from './craft-analytics.controller';

const controller = new CraftAnalyticsController();
export const craftAnalyticsRoutes = Router();
craftAnalyticsRoutes.use(requireAuth, requirePermission('craft.analytics.read'));
craftAnalyticsRoutes.get('/overview', controller.overview);
craftAnalyticsRoutes.get('/sales', controller.sales);
craftAnalyticsRoutes.get('/orders', controller.orders);
craftAnalyticsRoutes.get('/production', controller.production);
craftAnalyticsRoutes.get('/profitability', controller.profitability);
(['products', 'channels', 'customers', 'printers', 'materials', 'procurement'] as const).forEach(path => craftAnalyticsRoutes.get(`/${path}`, controller.list(path)));
