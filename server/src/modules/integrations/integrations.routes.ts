import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { IntegrationsController } from './integrations.controller';

const router = Router();
const controller = new IntegrationsController();

router.use(requireAuth);

router.get('/overview', requirePermission('integrations.read'), controller.overview);
router.get('/meta', requirePermission('integrations.read'), controller.meta);
router.get('/providers', requirePermission('integrations.read'), controller.providers);

router.get('/connections', requirePermission('integrations.read'), controller.listConnections);
router.post('/connections', requirePermission('integrations.manage'), controller.createConnection);
router.get('/connections/:id', requirePermission('integrations.read'), controller.getConnection);
router.patch('/connections/:id', requirePermission('integrations.manage'), controller.updateConnection);
router.post('/connections/:id/credentials', requirePermission('integrations.manage'), controller.updateCredentials);
router.delete('/connections/:id/credentials/:secretName', requirePermission('integrations.manage'), controller.deleteCredential);
router.post('/connections/:id/test', requirePermission('integrations.sync'), controller.testConnection);
router.post('/connections/:id/sync', requirePermission('integrations.sync'), controller.syncConnection);
router.post('/connections/:id/enable', requirePermission('integrations.manage'), controller.enable);
router.post('/connections/:id/disable', requirePermission('integrations.manage'), controller.disable);
router.post('/connections/:id/disconnect', requirePermission('integrations.manage'), controller.disconnect);

router.get('/logs', requirePermission('integrations.read'), controller.listLogs);
router.get('/logs/:id', requirePermission('integrations.read'), controller.getLog);

export const integrationsRoutes = router;
