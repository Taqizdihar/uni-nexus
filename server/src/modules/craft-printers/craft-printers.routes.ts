import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { CraftPrintersController } from './craft-printers.controller';

const controller = new CraftPrintersController();
export const craftPrintersRoutes = Router();
craftPrintersRoutes.use(requireAuth);

craftPrintersRoutes.get('/', requirePermission('craft.printers.read'), controller.getPrinters);
craftPrintersRoutes.post('/', requirePermission('craft.printers.write'), controller.createPrinter);
craftPrintersRoutes.get('/activity', requirePermission('craft.printers.read'), controller.getActivity);
craftPrintersRoutes.get('/history', requirePermission('craft.printers.read'), controller.getHistory);
craftPrintersRoutes.get('/profiles', requirePermission('craft.printers.read'), controller.getProfiles);
craftPrintersRoutes.get('/technicians', requirePermission('craft.printers.read'), controller.getTechnicians);
craftPrintersRoutes.get('/maintenance', requirePermission('craft.printers.read'), controller.getMaintenance);
craftPrintersRoutes.post('/maintenance/schedules', requirePermission('craft.printers.write'), controller.createSchedule);
craftPrintersRoutes.patch('/maintenance/schedules/:scheduleId', requirePermission('craft.printers.write'), controller.updateSchedule);
craftPrintersRoutes.delete('/maintenance/schedules/:scheduleId', requirePermission('craft.printers.write'), controller.deleteSchedule);
craftPrintersRoutes.get('/issues', requirePermission('craft.printers.read'), controller.getIssues);
craftPrintersRoutes.post('/issues', requirePermission('craft.printers.write'), controller.createIssue);
craftPrintersRoutes.patch('/issues/:issueId', requirePermission('craft.printers.write'), controller.updateIssue);
craftPrintersRoutes.get('/:id', requirePermission('craft.printers.read'), controller.getPrinter);
craftPrintersRoutes.patch('/:id', requirePermission('craft.printers.write'), controller.updatePrinter);
craftPrintersRoutes.delete('/:id', requirePermission('craft.printers.write'), controller.archivePrinter);
craftPrintersRoutes.post('/:id/reactivate', requirePermission('craft.printers.write'), controller.reactivatePrinter);
craftPrintersRoutes.post('/:id/offline', requirePermission('craft.printers.write'), controller.setOffline);
craftPrintersRoutes.post('/:id/available', requirePermission('craft.printers.write'), controller.restoreAvailable);
craftPrintersRoutes.post('/:id/maintenance/start', requirePermission('craft.printers.write'), controller.startMaintenance);
craftPrintersRoutes.post('/:id/maintenance/complete', requirePermission('craft.printers.write'), controller.completeMaintenance);
