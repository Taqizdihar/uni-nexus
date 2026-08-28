import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { DashboardController } from './dashboard.controller';

const controller = new DashboardController();
export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);
dashboardRoutes.get('/overview', requirePermission('dashboard.read'), controller.overview);
