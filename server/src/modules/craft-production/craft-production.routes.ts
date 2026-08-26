import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { CraftProductionController } from './craft-production.controller';

const router = Router();
const controller = new CraftProductionController();

router.use(requireAuth);

router.get('/board', requirePermission('craft.production.read'), controller.getBoard);
router.get('/active', requirePermission('craft.production.read'), controller.getActive);
router.get('/queue', requirePermission('craft.production.read'), controller.getQueue);
router.get('/jobs', requirePermission('craft.production.read'), controller.getJobs);
router.get('/jobs/:id', requirePermission('craft.production.read'), controller.getJob);
router.get('/failures', requirePermission('craft.production.read'), controller.getFailures);
router.get('/qc', requirePermission('craft.production.read'), controller.getQcQueue);
router.get('/calendar', requirePermission('craft.production.read'), controller.getCalendar);

// Aggregate reference endpoint used by the Production planner.
router.get('/references', requirePermission('craft.production.read'), controller.getReferences);
// Granular aliases keep the API useful for lightweight selectors and integrations.
router.get('/references/printers', requirePermission('craft.production.read'), controller.getPrinters);
router.get('/references/materials', requirePermission('craft.production.read'), controller.getMaterials);
router.get('/references/operators', requirePermission('craft.production.read'), controller.getOperators);
router.get('/references/print-profiles', requirePermission('craft.production.read'), controller.getPrintProfiles);
router.get('/references/design-files', requirePermission('craft.production.read'), controller.getDesignFiles);
router.get('/references/qc-templates', requirePermission('craft.production.read'), controller.getQcTemplates);

router.post('/jobs', requirePermission('craft.production.write'), controller.createJob);
router.patch('/jobs/:id', requirePermission('craft.production.write'), controller.updateJobPlanning);
router.post('/jobs/:id/ready', requirePermission('craft.production.write'), controller.markReady);
router.post('/jobs/:id/start', requirePermission('craft.production.write'), controller.start);
router.post('/jobs/:id/pause', requirePermission('craft.production.write'), controller.pause);
router.post('/jobs/:id/resume', requirePermission('craft.production.write'), controller.resume);
router.patch('/jobs/:id/progress', requirePermission('craft.production.write'), controller.updateProgress);
router.patch('/jobs/:id/schedule', requirePermission('craft.production.write'), controller.schedule);
router.post('/jobs/:id/finish', requirePermission('craft.production.write'), controller.finish);
router.post('/jobs/:id/fail', requirePermission('craft.production.write'), controller.fail);
router.post('/jobs/:id/cancel', requirePermission('craft.production.write'), controller.cancel);
router.post('/jobs/:id/qc', requirePermission('craft.production.write'), controller.submitQc);
router.post('/failures/:id/reprint', requirePermission('craft.production.write'), controller.createReprint);

export const craftProductionRoutes = router;
