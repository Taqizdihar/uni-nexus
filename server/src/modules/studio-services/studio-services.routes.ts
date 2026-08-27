import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { StudioServicesController } from './studio-services.controller';

const router = Router();
const controller = new StudioServicesController();
const READ = requirePermission('studio.services.read');
const WRITE = requirePermission('studio.services.write');

router.use(requireAuth);

// Static routes always precede /:id so identifiers cannot capture route names.
router.get('/overview', READ, controller.getOverview);

router.get('/categories', READ, controller.getCategories);
router.post('/categories', WRITE, controller.createCategory);
router.patch('/categories/:categoryId', WRITE, controller.updateCategory);
router.post('/categories/:categoryId/activate', WRITE, controller.activateCategory);
router.post('/categories/:categoryId/deactivate', WRITE, controller.deactivateCategory);

router.get('/packages', READ, controller.getPackages);
router.post('/packages', WRITE, controller.createPackage);
router.get('/packages/:packageId', READ, controller.getPackage);
router.patch('/packages/:packageId', WRITE, controller.updatePackage);
router.post('/packages/:packageId/activate', WRITE, controller.activatePackage);
router.post('/packages/:packageId/deactivate', WRITE, controller.deactivatePackage);
router.get('/packages/:packageId/projects', READ, controller.getPackageProjects);

router.get('/', READ, controller.getServices);
router.post('/', WRITE, controller.createService);
router.get('/:id', READ, controller.getService);
router.patch('/:id', WRITE, controller.updateService);
router.post('/:id/activate', WRITE, controller.activateService);
router.post('/:id/deactivate', WRITE, controller.deactivateService);
router.get('/:id/projects', READ, controller.getServiceProjects);
router.get('/:id/packages', READ, controller.getServicePackages);
router.get('/:id/commercial-usage', READ, controller.getServiceCommercialUsage);
router.get('/:id/activity', READ, controller.getServiceActivity);

export const studioServicesRoutes = router;
