import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { AppError } from '../../shared/errors/AppError';
import { StudioProjectsController } from './studio-projects.controller';
import { DELIVERABLE_ALLOWED_EXTENSIONS, DELIVERABLE_MAX_BYTES, deliverableDirectory } from './studio-project-deliverables.service';

const router = Router();
const controller = new StudioProjectsController();

const READ = requirePermission('studio.projects.read');
const WRITE = requirePermission('studio.projects.write');
/** Quick client creation crosses into the Clients domain, so it needs that permission too. */
const CLIENT_WRITE = requirePermission('studio.clients.write');

/** Deliverable names are randomized on disk; the original name is kept after `__` for display. */
const safeOriginalName = (originalName: string) =>
  path.basename(originalName).replace(/[^A-Za-z0-9._-]+/g, '_').slice(-120) || 'file';

const deliverableUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, callback) => {
      const projectId = Number.parseInt(String(req.params.id || ''), 10);
      if (!Number.isInteger(projectId) || projectId <= 0) {
        callback(new AppError(400, 'INVALID_ID', 'ID proyek tidak valid.'), '');
        return;
      }
      const target = deliverableDirectory(projectId);
      mkdirSync(target, { recursive: true });
      callback(null, target);
    },
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${randomUUID().slice(0, 8)}__${safeOriginalName(file.originalname)}`),
  }),
  limits: { fileSize: DELIVERABLE_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!DELIVERABLE_ALLOWED_EXTENSIONS.has(extension)) {
      callback(new AppError(400, 'UNSUPPORTED_DELIVERABLE', 'Jenis file tidak didukung. Gunakan PDF, gambar, ZIP, DOCX, XLSX, atau PPTX. Untuk media besar gunakan tautan eksternal.'));
      return;
    }
    callback(null, true);
  },
});

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
router.post('/:id/deliverables/:deliverableId/file', WRITE, deliverableUpload.single('file'), controller.uploadDeliverableFile);
router.delete('/:id/deliverables/:deliverableId', WRITE, controller.deleteDeliverable);

router.post('/:id/externals', WRITE, controller.addExternalAssignment);
router.patch('/:id/externals/:assignmentId', WRITE, controller.updateExternalAssignment);
router.post('/:id/externals/:assignmentId/end', WRITE, controller.endExternalAssignment);

export const studioProjectsRoutes = router;
