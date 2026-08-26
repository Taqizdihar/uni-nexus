import { CraftProductionRepository } from './craft-production.repository';
import { ProductionFailuresService } from './production-failures.service';
import { ProductionJobsService } from './production-jobs.service';
import { ProductionQcService } from './production-qc.service';
import type {
  CraftContext,
  CreatePrintJobInput,
  FailPrintInput,
  FailureFilters,
  FinishPrintInput,
  ProductionFilters,
  QcInspectionInput,
  UpdatePrintJobPlanningInput,
} from './craft-production.types';

export class CraftProductionService {
  readonly repository = new CraftProductionRepository();
  readonly jobs = new ProductionJobsService();
  readonly failures = new ProductionFailuresService();
  readonly qc = new ProductionQcService();

  getBoard(filters: ProductionFilters, craft: CraftContext) {
    return this.repository.getBoard(filters, craft.id);
  }

  getActive(craft: CraftContext) {
    return this.repository.getActive(craft.id);
  }

  getQueue(craft: CraftContext) {
    return this.repository.getQueue(craft.id);
  }

  getJobs(filters: ProductionFilters, craft: CraftContext) {
    return this.repository.getJobs(filters, craft.id);
  }

  getJob(id: number, craft: CraftContext) {
    return this.repository.getJobDetail(id, craft.id);
  }

  createJob(input: CreatePrintJobInput, userId: number, craft: CraftContext) {
    return this.jobs.createJob(input, userId, craft);
  }

  updateJobPlanning(id: number, input: UpdatePrintJobPlanningInput, userId: number, craft: CraftContext) {
    return this.jobs.updatePlanning(id, input, userId, craft);
  }

  getFailures(filters: FailureFilters, craft: CraftContext) {
    return this.repository.getFailures(filters, craft.id);
  }

  failJob(id: number, input: FailPrintInput, userId: number, craft: CraftContext) {
    return this.failures.fail(id, input, userId, craft);
  }

  createReprint(failureId: number, input: CreatePrintJobInput, userId: number, craft: CraftContext) {
    return this.failures.createReprint(failureId, input, userId, craft);
  }

  getQcQueue(craft: CraftContext) {
    return this.repository.getQcQueue(craft.id);
  }

  submitQc(jobId: number, input: QcInspectionInput, userId: number, craft: CraftContext) {
    return this.qc.submit(jobId, input, userId, craft);
  }

  finishJob(id: number, input: FinishPrintInput, userId: number, craft: CraftContext) {
    return this.jobs.finish(id, input, userId, craft);
  }
}
