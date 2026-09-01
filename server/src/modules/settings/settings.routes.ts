import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { createUpload } from '../../shared/storage';
import { SettingsController } from './settings.controller';

const controller = new SettingsController();
export const settingsRoutes = Router();
settingsRoutes.use(requireAuth, requirePermission('settings.manage'));
settingsRoutes.get('/', controller.get);
settingsRoutes.patch('/organization', controller.updateOrganization);
settingsRoutes.get('/organization/logo', controller.logo);
settingsRoutes.post('/organization/logo', createUpload('organization_logo').single('logo'), controller.uploadLogo);
settingsRoutes.delete('/organization/logo', controller.deleteLogo);
settingsRoutes.patch('/groups/:scope/:group', controller.updateGroup);
settingsRoutes.post('/groups/:scope/:group/:key/reset', controller.reset);
