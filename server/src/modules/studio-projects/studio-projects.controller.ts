import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { getStudioBusinessUnit, parseNumericId } from './studio-projects.helpers';
import {
  clientDuplicateSchema, createProjectSchema, deliverableStatusSchema, externalAssignmentEndSchema,
  externalAssignmentSchema, externalAssignmentUpdateSchema, milestoneReorderSchema, milestoneStatusSchema,
  projectCancelSchema, projectDeliverableInputSchema, projectDeliverableUpdateSchema, projectMemberInputSchema,
  projectMemberUpdateSchema, projectMilestoneInputSchema, projectMilestoneUpdateSchema, projectServiceInputSchema,
  projectServiceUpdateSchema, projectStatusSchema, quickClientSchema, updateProjectSchema,
} from './studio-projects.schema';
import { studioProjectDeliverablesService } from './studio-project-deliverables.service';
import { studioProjectExternalService } from './studio-project-external.service';
import { studioProjectMembersService } from './studio-project-members.service';
import { studioProjectMilestonesService } from './studio-project-milestones.service';
import { studioProjectServicesService } from './studio-project-services.service';
import { studioProjectsService } from './studio-projects.service';
import type { DeliverableStatus, ProjectStatus } from './studio-projects.types';

const asValidationError = (error: unknown, message: string) =>
  error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', message, error.issues) : error;

const actorId = (req: Request) => Number((req as any).user?.id);

const parseOptionalInt = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export class StudioProjectsController {
  private projectId = (req: Request) => parseNumericId(req.params.id, 'ID proyek');

  // ---------------------------------------------------------------- read

  getOverview = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioProjectsService.overview(await getStudioBusinessUnit()));
    } catch (error) { next(error); }
  };

  getProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      sendSuccess(res, await studioProjectsService.list({
        page: parseOptionalInt(req.query.page) || 1,
        limit: parseOptionalInt(req.query.limit) || 20,
        search: (req.query.search as string) || undefined,
        status: (req.query.status as string) || undefined,
        statuses: typeof req.query.statuses === 'string' ? req.query.statuses.split(',').filter(Boolean) : undefined,
        priority: (req.query.priority as string) || undefined,
        projectType: (req.query.project_type as string) || undefined,
        clientId: parseOptionalInt(req.query.client_id),
        managerId: parseOptionalInt(req.query.manager_id),
        serviceId: parseOptionalInt(req.query.service_id),
        paymentStatus: (req.query.payment_status as string) || undefined,
        overdue: req.query.overdue === 'true',
        startDate: (req.query.start_date as string) || undefined,
        endDate: (req.query.end_date as string) || undefined,
        deadlineFrom: (req.query.deadline_from as string) || undefined,
        deadlineTo: (req.query.deadline_to as string) || undefined,
        sortBy: (req.query.sort_by as string) || undefined,
        sortOrder: req.query.sort_order === 'asc' ? 'asc' : 'desc',
      }, studio));
    } catch (error) { next(error); }
  };

  getActiveProjects = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioProjectsService.activeBoard(await getStudioBusinessUnit()));
    } catch (error) { next(error); }
  };

  getMilestoneBoard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      sendSuccess(res, await studioProjectMilestonesService.board({
        projectId: parseOptionalInt(req.query.project_id),
        clientId: parseOptionalInt(req.query.client_id),
        managerId: parseOptionalInt(req.query.manager_id),
        status: (req.query.status as string) || undefined,
        dueFrom: (req.query.due_from as string) || undefined,
        dueTo: (req.query.due_to as string) || undefined,
      }, studio));
    } catch (error) { next(error); }
  };

  getProjectTypes = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioProjectsService.projectTypes(await getStudioBusinessUnit()));
    } catch (error) { next(error); }
  };

  getProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioProjectsService.getProjectDetail(this.projectId(req), await getStudioBusinessUnit()));
    } catch (error) { next(error); }
  };

  getActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioProjectsService.getActivity(this.projectId(req), await getStudioBusinessUnit()));
    } catch (error) { next(error); }
  };

  // -------------------------------------------------------------- project

  createProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = createProjectSchema.parse(req.body);
      sendSuccess(res, await studioProjectsService.createProject(data as any, actorId(req), studio), undefined, 201);
    } catch (error) { next(asValidationError(error, 'Data proyek tidak valid.')); }
  };

  updateProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = updateProjectSchema.parse(req.body);
      await studioProjectsService.updateProject(this.projectId(req), data, actorId(req), studio);
      sendSuccess(res, { message: 'Proyek berhasil diperbarui.' });
    } catch (error) { next(asValidationError(error, 'Data proyek tidak valid.')); }
  };

  changeStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = projectStatusSchema.parse(req.body);
      sendSuccess(res, await studioProjectsService.changeStatus(this.projectId(req), data.status as ProjectStatus, data.reason || null, actorId(req), studio));
    } catch (error) { next(asValidationError(error, 'Perubahan status proyek tidak valid.')); }
  };

  cancelProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = projectCancelSchema.parse(req.body);
      sendSuccess(res, await studioProjectsService.cancelProject(this.projectId(req), data.reason, actorId(req), studio));
    } catch (error) { next(asValidationError(error, 'Data pembatalan proyek tidak valid.')); }
  };

  // --------------------------------------------------------------- scope

  addService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = projectServiceInputSchema.parse(req.body);
      sendSuccess(res, await studioProjectServicesService.addService(this.projectId(req), data as any, actorId(req), studio), undefined, 201);
    } catch (error) { next(asValidationError(error, 'Data layanan proyek tidak valid.')); }
  };

  updateService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = projectServiceUpdateSchema.parse(req.body);
      sendSuccess(res, await studioProjectServicesService.updateService(this.projectId(req), parseNumericId(req.params.serviceId, 'ID layanan proyek'), data as any, actorId(req), studio));
    } catch (error) { next(asValidationError(error, 'Data layanan proyek tidak valid.')); }
  };

  removeService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      sendSuccess(res, await studioProjectServicesService.removeService(this.projectId(req), parseNumericId(req.params.serviceId, 'ID layanan proyek'), actorId(req), studio));
    } catch (error) { next(error); }
  };

  syncContractValue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      sendSuccess(res, await studioProjectServicesService.syncContractValue(this.projectId(req), actorId(req), studio));
    } catch (error) { next(error); }
  };

  // ---------------------------------------------------------------- team

  addMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = projectMemberInputSchema.parse(req.body);
      sendSuccess(res, await studioProjectMembersService.addMember(this.projectId(req), data, actorId(req), studio), undefined, 201);
    } catch (error) { next(asValidationError(error, 'Data anggota tim tidak valid.')); }
  };

  updateMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = projectMemberUpdateSchema.parse(req.body);
      sendSuccess(res, await studioProjectMembersService.updateMember(this.projectId(req), parseNumericId(req.params.userId, 'ID pengguna'), data, actorId(req), studio));
    } catch (error) { next(asValidationError(error, 'Data anggota tim tidak valid.')); }
  };

  endMembership = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      sendSuccess(res, await studioProjectMembersService.endMembership(this.projectId(req), parseNumericId(req.params.userId, 'ID pengguna'), actorId(req), studio));
    } catch (error) { next(error); }
  };

  // ----------------------------------------------------------- milestones

  createMilestone = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = projectMilestoneInputSchema.parse(req.body);
      sendSuccess(res, await studioProjectMilestonesService.createMilestone(this.projectId(req), data, actorId(req), studio), undefined, 201);
    } catch (error) { next(asValidationError(error, 'Data tahapan proyek tidak valid.')); }
  };

  updateMilestone = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = projectMilestoneUpdateSchema.parse(req.body);
      sendSuccess(res, await studioProjectMilestonesService.updateMilestone(this.projectId(req), parseNumericId(req.params.milestoneId, 'ID tahapan'), data, actorId(req), studio));
    } catch (error) { next(asValidationError(error, 'Data tahapan proyek tidak valid.')); }
  };

  changeMilestoneStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = milestoneStatusSchema.parse(req.body);
      sendSuccess(res, await studioProjectMilestonesService.changeStatus(this.projectId(req), parseNumericId(req.params.milestoneId, 'ID tahapan'), data.status, data.reason || null, actorId(req), studio));
    } catch (error) { next(asValidationError(error, 'Perubahan status tahapan tidak valid.')); }
  };

  reorderMilestones = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = milestoneReorderSchema.parse(req.body);
      sendSuccess(res, await studioProjectMilestonesService.reorder(this.projectId(req), data.milestone_ids, actorId(req), studio));
    } catch (error) { next(asValidationError(error, 'Urutan tahapan tidak valid.')); }
  };

  deleteMilestone = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      sendSuccess(res, await studioProjectMilestonesService.deleteMilestone(this.projectId(req), parseNumericId(req.params.milestoneId, 'ID tahapan'), actorId(req), studio));
    } catch (error) { next(error); }
  };

  // --------------------------------------------------------- deliverables

  createDeliverable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = projectDeliverableInputSchema.parse(req.body);
      sendSuccess(res, await studioProjectDeliverablesService.createDeliverable(this.projectId(req), data, actorId(req), studio), undefined, 201);
    } catch (error) { next(asValidationError(error, 'Data deliverable tidak valid.')); }
  };

  updateDeliverable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = projectDeliverableUpdateSchema.parse(req.body);
      sendSuccess(res, await studioProjectDeliverablesService.updateDeliverable(this.projectId(req), parseNumericId(req.params.deliverableId, 'ID deliverable'), data, actorId(req), studio));
    } catch (error) { next(asValidationError(error, 'Data deliverable tidak valid.')); }
  };

  changeDeliverableStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = deliverableStatusSchema.parse(req.body);
      sendSuccess(res, await studioProjectDeliverablesService.changeStatus(this.projectId(req), parseNumericId(req.params.deliverableId, 'ID deliverable'), data.status as DeliverableStatus, data.reason || null, actorId(req), studio));
    } catch (error) { next(asValidationError(error, 'Perubahan status deliverable tidak valid.')); }
  };

  uploadDeliverableFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = (req as any).file;
      if (!file) throw new AppError(400, 'FILE_REQUIRED', 'File hasil kerja wajib diunggah.');
      const studio = await getStudioBusinessUnit();
      sendSuccess(res, await studioProjectDeliverablesService.attachFile(this.projectId(req), parseNumericId(req.params.deliverableId, 'ID deliverable'), file, actorId(req), studio));
    } catch (error) { next(error); }
  };

  downloadDeliverableFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const target = await studioProjectDeliverablesService.getDownloadTarget(this.projectId(req), parseNumericId(req.params.deliverableId, 'ID deliverable'), studio);
      // Quote-escaped filename keeps the header well-formed for any original name.
      res.setHeader('Content-Disposition', `attachment; filename="${target.fileName.replace(/["\\]/g, '_')}"`);
      res.sendFile(target.absolutePath, error => { if (error) next(error); });
    } catch (error) { next(error); }
  };

  deleteDeliverable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      sendSuccess(res, await studioProjectDeliverablesService.deleteDeliverable(this.projectId(req), parseNumericId(req.params.deliverableId, 'ID deliverable'), actorId(req), studio));
    } catch (error) { next(error); }
  };

  // ------------------------------------------------------------ externals

  addExternalAssignment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = externalAssignmentSchema.parse(req.body);
      sendSuccess(res, await studioProjectExternalService.addAssignment(this.projectId(req), data as any, actorId(req), studio), undefined, 201);
    } catch (error) { next(asValidationError(error, 'Data kolaborator eksternal tidak valid.')); }
  };

  updateExternalAssignment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = externalAssignmentUpdateSchema.parse(req.body);
      sendSuccess(res, await studioProjectExternalService.updateAssignment(this.projectId(req), parseNumericId(req.params.assignmentId, 'ID penugasan'), data as any, actorId(req), studio));
    } catch (error) { next(asValidationError(error, 'Data kolaborator eksternal tidak valid.')); }
  };

  endExternalAssignment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = externalAssignmentEndSchema.parse(req.body ?? {});
      sendSuccess(res, await studioProjectExternalService.endAssignment(this.projectId(req), parseNumericId(req.params.assignmentId, 'ID penugasan'), data.end_date || null, actorId(req), studio));
    } catch (error) { next(asValidationError(error, 'Data pengakhiran penugasan tidak valid.')); }
  };

  // -------------------------------------------------------- quick client

  quickCreateClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = quickClientSchema.parse(req.body);
      sendSuccess(res, await studioProjectsService.quickCreateClient({ ...data, email: data.email || null } as any, actorId(req), studio), undefined, 201);
    } catch (error) { next(asValidationError(error, 'Data klien tidak valid.')); }
  };

  findClientDuplicates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const data = clientDuplicateSchema.parse(req.body ?? {});
      sendSuccess(res, await studioProjectsService.findClientDuplicates({ display_name: '', ...data } as any, studio));
    } catch (error) { next(asValidationError(error, 'Data pengecekan duplikat tidak valid.')); }
  };
}
