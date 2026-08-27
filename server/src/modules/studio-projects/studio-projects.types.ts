export type ProjectStatus = 'lead' | 'quotation' | 'approved' | 'in_progress' | 'review' | 'completed' | 'paid' | 'cancelled';
export type ProjectPriority = 'low' | 'normal' | 'high' | 'critical';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'late' | 'cancelled';
export type DeliverableStatus = 'pending' | 'submitted' | 'revision' | 'approved' | 'delivered';
export type ExternalAssignmentRole = 'vendor' | 'freelancer' | 'partner' | 'talent' | 'other';

export const PROJECT_STATUSES: ProjectStatus[] = ['lead', 'quotation', 'approved', 'in_progress', 'review', 'completed', 'paid', 'cancelled'];
export const PROJECT_PRIORITIES: ProjectPriority[] = ['low', 'normal', 'high', 'critical'];
export const MILESTONE_STATUSES: MilestoneStatus[] = ['pending', 'in_progress', 'completed', 'late', 'cancelled'];
export const DELIVERABLE_STATUSES: DeliverableStatus[] = ['pending', 'submitted', 'revision', 'approved', 'delivered'];
export const EXTERNAL_ROLES: ExternalAssignmentRole[] = ['vendor', 'freelancer', 'partner', 'talent', 'other'];

/** Statuses that represent work Studio is actively executing. */
export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = ['approved', 'in_progress', 'review'];

/** Statuses that no longer count as open operational work. */
export const CLOSED_PROJECT_STATUSES: ProjectStatus[] = ['completed', 'paid', 'cancelled'];

export interface ProjectListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  statuses?: string[];
  priority?: string;
  projectType?: string;
  clientId?: number;
  managerId?: number;
  serviceId?: number;
  paymentStatus?: string;
  overdue?: boolean;
  startDate?: string;
  endDate?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MilestoneBoardFilters {
  projectId?: number;
  clientId?: number;
  managerId?: number;
  status?: string;
  dueFrom?: string;
  dueTo?: string;
}

export interface ProjectProgress {
  /** Where the percentage comes from, or `none` when nothing has been planned yet. */
  source: 'milestones' | 'deliverables' | 'status' | 'none';
  completed: number;
  total: number;
  percent: number | null;
}
