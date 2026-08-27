import { Router } from 'express';
import { requireAnyPermission, requireAuth } from '../../middleware/auth.middleware';
import { StudioReferencesController } from './studio-references.controller';

const router = Router();
const controller = new StudioReferencesController();

/**
 * Shared Studio lookup endpoints.
 *
 * Any Studio reader may use them, so future Clients, Services, Billing, Vendor
 * and Finance modules can reuse these selectors without new plumbing.
 */
router.use(requireAuth, requireAnyPermission('studio.projects.read', 'studio.clients.read', 'studio.finance.read'));

router.get('/clients', controller.getClients);
router.get('/services', controller.getServices);
router.get('/service-packages', controller.getServicePackages);
router.get('/users', controller.getUsers);
router.get('/external-parties', controller.getExternalParties);

export const studioReferencesRoutes = router;
