import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { StudioProjectsController } from './studio-projects.controller';
import { getStoragePolicy, singleFileUpload } from '../../shared/storage';

const router = Router();
const controller = new StudioProjectsController();

const READ = requirePermission('studio.projects.read');
const WRITE = requirePermission('studio.projects.write');
/** Quick client creation crosses into the Clients domain, so it needs that permission too. */
const CLIENT_WRITE = requirePermission('studio.clients.write');

const deliverableUpload = singleFileUpload(getStoragePolicy('project_deliverable'), 'file');

router.use(requireAuth);

// Static routes must stay ahead of /:id so they are never captured as a project ID.
router.get('/overview', READ, controller.getOverview);
router.get('/active', READ, controller.getActiveProjects);
router.get('/milestones', READ, controller.getMilestoneBoard);
router.get('/project-types', READ, controller.getProjectTypes);
router.post('/clients/quick', WRITE, CLIENT_WRITE, controller.quickCreateClient);
router.post('/clients/duplicates', WRITE, CLIENT_WRITE, controller.findClientDuplicates);

router.get('/', READ, controller.getProjects);
router.post('/', WRITE, controller.createProject);

router.get('/:id', READ, controller.getProject);
router.get('/:id/activity', READ, controller.getActivity);
router.patch('/:id', WRITE, controller.updateProject);
router.post('/:id/status', WRITE, controller.changeStatus);
router.post('/:id/cancel', WRITE, controller.cancelProject);

router.post('/:id/services', WRITE, controller.addService);
router.post('/:id/services/sync-contract-value', WRITE, controller.syncContractValue);
router.patch('/:id/services/:serviceId', WRITE, controller.updateService);
router.delete('/:id/services/:serviceId', WRITE, controller.removeService);

router.post('/:id/members', WRITE, controller.addMember);
router.patch('/:id/members/:userId', WRITE, controller.updateMember);
router.delete('/:id/members/:userId', WRITE, controller.endMembership);

router.post('/:id/milestones', WRITE, controller.createMilestone);
router.post('/:id/milestones/reorder', WRITE, controller.reorderMilestones);
router.patch('/:id/milestones/:milestoneId', WRITE, controller.updateMilestone);
router.post('/:id/milestones/:milestoneId/status', WRITE, controller.changeMilestoneStatus);
router.delete('/:id/milestones/:milestoneId', WRITE, controller.deleteMilestone);

router.post('/:id/deliverables', WRITE, controller.createDeliverable);
router.get('/:id/deliverables/:deliverableId/download', READ, controller.downloadDeliverableFile);
router.patch('/:id/deliverables/:deliverableId', WRITE, controller.updateDeliverable);
router.post('/:id/deliverables/:deliverableId/status', WRITE, controller.changeDeliverableStatus);
router.post('/:id/deliverables/:deliverableId/file', WRITE, deliverableUpload, controller.uploadDeliverableFile);
router.delete('/:id/deliverables/:deliverableId', WRITE, controller.deleteDeliverable);

router.post('/:id/externals', WRITE, controller.addExternalAssignment);
router.patch('/:id/externals/:assignmentId', WRITE, controller.updateExternalAssignment);
router.post('/:id/externals/:assignmentId/end', WRITE, controller.endExternalAssignment);

export const studioProjectsRoutes = router;
