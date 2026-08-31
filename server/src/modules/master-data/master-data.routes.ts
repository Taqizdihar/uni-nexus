import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { MasterDataController } from './master-data.controller';

export const masterDataRoutes = Router();
const controller = new MasterDataController();

masterDataRoutes.use(requireAuth, requirePermission('master_data.read'));

masterDataRoutes.get('/overview', controller.overview);
masterDataRoutes.get('/meta', controller.meta);
masterDataRoutes.get('/export', requirePermission('reports.export'), controller.export);

masterDataRoutes.get('/:dataset/:id/usage', controller.usage);
masterDataRoutes.post('/:dataset/:id/activate', requirePermission('master_data.manage'), controller.activate);
masterDataRoutes.post('/:dataset/:id/deactivate', requirePermission('master_data.manage'), controller.deactivate);
masterDataRoutes.get('/:dataset/:id', controller.detail);
masterDataRoutes.patch('/:dataset/:id', requirePermission('master_data.manage'), controller.update);
masterDataRoutes.get('/:dataset', controller.list);
masterDataRoutes.post('/:dataset', requirePermission('master_data.manage'), controller.create);
