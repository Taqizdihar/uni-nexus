import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { StudioEquipmentController } from './studio-equipment.controller';

const router = Router();
const controller = new StudioEquipmentController();
const READ = requirePermission('studio.equipment.read');
const WRITE = requirePermission('studio.equipment.write');

router.use(requireAuth);

router.get('/overview', READ, controller.getOverview);
router.get('/references', READ, controller.getReferences);
router.get('/availability', READ, controller.availability);
router.get('/assignments', READ, controller.getAssignments);
router.post('/assignments/:assignmentId/return', WRITE, controller.returnAssignment);
router.delete('/assignments/:assignmentId', WRITE, controller.cancelAssignment);
router.get('/maintenance', READ, controller.getMaintenance);

router.get('/assets', READ, controller.getAssets);
router.post('/assets', WRITE, controller.createAsset);
router.get('/assets/:id', READ, controller.getAsset);
router.patch('/assets/:id', WRITE, controller.updateAsset);
router.post('/assets/:id/status', WRITE, controller.changeStatus);
router.get('/assets/:id/activity', READ, controller.getActivity);
router.get('/assets/:id/assignments', READ, controller.getAssetAssignments);
router.post('/assets/:id/assignments', WRITE, controller.createAssignment);
router.get('/assets/:id/maintenance', READ, controller.getAssetMaintenance);
router.post('/assets/:id/maintenance/start', WRITE, controller.startMaintenance);
router.post('/assets/:id/maintenance/complete', WRITE, controller.completeMaintenance);
router.post('/assets/:id/maintenance/records', WRITE, controller.addMaintenanceRecord);
router.patch('/assets/:id/maintenance/records/:recordId', WRITE, controller.updateMaintenanceRecord);

export const studioEquipmentRoutes = router;
