import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { CraftMaterialsController } from './craft-materials.controller';

export const craftMaterialsRoutes = Router();
const controller = new CraftMaterialsController();

craftMaterialsRoutes.use(requireAuth);

craftMaterialsRoutes.get('/', requirePermission('craft.materials.read'), controller.getMaterials);
craftMaterialsRoutes.post('/', requirePermission('craft.materials.write'), controller.createMaterial);

// Static endpoints must be registered before /:id.
craftMaterialsRoutes.get('/categories', requirePermission('craft.materials.read'), controller.getCategories);
craftMaterialsRoutes.post('/categories', requirePermission('craft.materials.write'), controller.createCategory);
craftMaterialsRoutes.patch('/categories/:categoryId', requirePermission('craft.materials.write'), controller.updateCategory);
craftMaterialsRoutes.get('/units', requirePermission('craft.materials.read'), controller.getUnits);
craftMaterialsRoutes.get('/suppliers', requirePermission('craft.materials.read'), controller.getSuppliers);
craftMaterialsRoutes.get('/spools', requirePermission('craft.materials.read'), controller.getSpools);
craftMaterialsRoutes.patch('/spools/:spoolId', requirePermission('craft.materials.write'), controller.updateSpool);
craftMaterialsRoutes.get('/movements', requirePermission('craft.materials.read'), controller.getMovements);
craftMaterialsRoutes.get('/low-stock', requirePermission('craft.materials.read'), controller.getLowStock);
craftMaterialsRoutes.get('/waste', requirePermission('craft.materials.read'), controller.getWaste);
craftMaterialsRoutes.post('/waste', requirePermission('craft.materials.write'), controller.recordWaste);

craftMaterialsRoutes.post('/:id/receive', requirePermission('craft.materials.write'), controller.receiveStock);
craftMaterialsRoutes.post('/:id/adjustments', requirePermission('craft.materials.write'), controller.adjustStock);
craftMaterialsRoutes.post('/:id/reactivate', requirePermission('craft.materials.write'), controller.reactivateMaterial);
craftMaterialsRoutes.get('/:id', requirePermission('craft.materials.read'), controller.getMaterial);
craftMaterialsRoutes.patch('/:id', requirePermission('craft.materials.write'), controller.updateMaterial);
craftMaterialsRoutes.delete('/:id', requirePermission('craft.materials.write'), controller.archiveMaterial);
