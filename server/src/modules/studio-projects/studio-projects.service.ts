import { randomUUID } from 'crypto';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { studioClientService, type StudioClientInput } from '../../shared/party/studio-client.service';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { STUDIO_LOCAL_DATE_SQL, roundMoney, toNumber, toSqlDate, toSqlDateTime } from './studio-projects.helpers';
import { StudioProjectsRepository } from './studio-projects.repository';
import { studioProjectCommercialService } from './studio-project-commercial.service';
import { studioProjectDeliverablesService } from './studio-project-deliverables.service';
import { studioProjectMembersService } from './studio-project-members.service';
import { studioProjectMilestonesService } from './studio-project-milestones.service';
import { studioProjectServicesService } from './studio-project-services.service';
import { loadProjectForUpdate, projectRef, publishProjectEvent, withTransaction, writeProjectAudit } from './studio-projects.shared';
import type { ProjectStatus } from './studio-projects.types';

/**
 * Allowed project status transitions.
 *
 * The happy path is lead → quotation → approved → in_progress → review →
 * completed → paid, plus the practical shortcuts Studio actually uses: work
 * agreed without a formal quotation, proposals returning to negotiation, and
 * review sending work back for rework. `paid` and `cancelled` are terminal.
 */
const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  lead: ['quotation', 'approved', 'cancelled'],
  quotation: ['lead', 'approved', 'cancelled'],
  approved: ['in_progress', 'cancelled'],
  in_progress: ['review', 'cancelled'],
  review: ['in_progress', 'completed', 'cancelled'],
  completed: ['review', 'paid'],
  paid: [],
  cancelled: [],
};

/** Transitions that must be explained, because they walk the project backwards or close it. */
const REASON_REQUIRED: Array<{ from: ProjectStatus; to: ProjectStatus }> = [
  { from: 'completed', to: 'review' },
  { from: 'quotation', to: 'lead' },
];

const STATUS_EVENTS: Partial<Record<ProjectStatus, string>> = {
  in_progress: 'studio.project.started',
  review: 'studio.project.review_started',
  completed: 'studio.project.completed',
  cancelled: 'studio.project.cancelled',
};

interface CreateProjectInput {
  client_party_id: number;
  project_name: string;
  project_type?: string | null;
  priority_code: string;
  start_date?: string | null;
  deadline_at?: string | null;
  currency_code: string;
  contract_value?: number | null;
  estimated_cost?: number | null;
  brief?: string | null;
  notes?: string | null;
  project_manager_user_id?: number | null;
  services: Array<{ service_id?: number | null; package_id?: number | null; description: string; quantity: number; unit_price: number }>;
  members: Array<{ user_id: number; role_label?: string | null; allocation_percent?: number | null }>;
  milestones: Array<{ title: string; description?: string | null; due_at?: string | null; sort_order?: number }>;
  deliverables: Array<{ title: string; description?: string | null; due_at?: string | null; external_url?: string | null }>;
}

export class StudioProjectsService {
  private repository = new StudioProjectsRepository();

  /**
   * Project codes are derived from the inserted ID inside the same transaction:
   * a temporary unique code is written first, then replaced with PRJ-{id}. This
   * avoids the MAX(id)+1 race entirely.
   */
  private async assignProjectCode(connection: PoolConnection, projectId: number) {
    const code = `PRJ-${projectId.toString().padStart(6, '0')}`;
    await connection.execute('UPDATE studio_projects SET project_code = ? WHERE id = ?', [code, projectId]);
    return code;
  }

  private async recordStatusChange(connection: PoolConnection, projectId: number, from: string | null, to: string, reason: string | null, userId: number | null) {
    await connection.execute(
      `INSERT INTO studio_project_status_history (project_id, from_status_code, to_status_code, reason, changed_by)
       VALUES (?, ?, ?, ?, ?)`,
      [projectId, from, to, reason ? reason.slice(0, 500) : null, userId],
    );
  }

  /** Everything a new project needs is written atomically — never a half-created project. */
  async createProject(input: CreateProjectInput, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const client = await studioClientService.assertStudioClient(connection, input.client_party_id, studio);
      if (input.project_manager_user_id) {
        await studioProjectMembersService.assertAssignableUser(connection, input.project_manager_user_id, studio.organizationId);
      }

      const serviceSubtotal = roundMoney(input.services.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unit_price), 0));
      // A negotiated contract value always wins; otherwise the scope subtotal seeds it.
      const contractValue = input.contract_value && input.contract_value > 0 ? roundMoney(input.contract_value) : serviceSubtotal;

      const [result]: any = await connection.execute(
        `INSERT INTO studio_projects (
          business_unit_id, project_code, client_party_id, project_name, project_type,
          status_code, priority_code, start_date, deadline_at, currency_code,
          contract_value, estimated_cost, brief, notes, project_manager_user_id, created_by
        ) VALUES (?, ?, ?, ?, ?, 'lead', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          studio.id, `TMP-${randomUUID()}`, input.client_party_id, input.project_name.trim(), input.project_type?.trim() || null,
          input.priority_code, toSqlDate(input.start_date), toSqlDateTime(input.deadline_at), input.currency_code.toUpperCase(),
          contractValue, roundMoney(input.estimated_cost || 0), input.brief || null, input.notes || null,
          input.project_manager_user_id || null, userId,
        ],
      );
      const projectId = Number(result.insertId);
      const projectCode = await this.assignProjectCode(connection, projectId);
      const reference = { id: projectId, project_code: projectCode, status_code: 'lead' };

      for (const line of input.services) {
        await studioProjectServicesService.insertLine(connection, projectId, line, studio);
      }
      await studioProjectMembersService.syncProjectManager(connection, projectId, input.project_manager_user_id || null, studio.organizationId);
      for (const member of input.members) {
        if (member.user_id === input.project_manager_user_id) continue;
        await studioProjectMembersService.assertAssignableUser(connection, member.user_id, studio.organizationId);
        await studioProjectMembersService.upsertMember(connection, projectId, member);
      }
      for (let index = 0; index < input.milestones.length; index += 1) {
        await studioProjectMilestonesService.insertMilestone(connection, projectId, input.milestones[index], index);
      }
      for (const deliverable of input.deliverables) {
        await studioProjectDeliverablesService.insertDeliverable(connection, projectId, deliverable);
      }

      await this.recordStatusChange(connection, projectId, null, 'lead', null, userId);
      await writeProjectAudit(
        connection, studio, userId, 'studio.project_create', reference,
        `Membuat proyek ${projectCode} untuk klien ${client.display_name}.`,
        undefined,
        {
          project_name: input.project_name, client_party_id: input.client_party_id, project_type: input.project_type || null,
          contract_value: contractValue, service_subtotal: serviceSubtotal, priority_code: input.priority_code,
          services: input.services.length, milestones: input.milestones.length, deliverables: input.deliverables.length,
        },
      );
      await publishProjectEvent(connection, studio, 'studio.project.created', reference, userId, {
        project: {
          id: projectId, project_code: projectCode, project_name: input.project_name, status_code: 'lead',
          client_party_id: input.client_party_id, priority_code: input.priority_code,
          deadline_at: toSqlDateTime(input.deadline_at), contract_value: contractValue,
        },
      });

      return { id: projectId, project_code: projectCode, contract_value: contractValue, service_subtotal: serviceSubtotal };
    });
  }

  /**
   * Updates project master fields only. Financial results (actual_cost,
   * paid_amount, payment_status_code) are never writable here.
   */
  async updateProject(projectId: number, input: Record<string, any>, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      if (project.status_code === 'cancelled') {
        throw new AppError(409, 'PROJECT_CANCELLED', 'Proyek yang dibatalkan tidak dapat diubah.');
      }

      const changesPricing = input.contract_value !== undefined && roundMoney(input.contract_value) !== toNumber(project.contract_value);
      if (changesPricing) {
        await studioProjectCommercialService.assertCommercialUnlocked(connection, projectId, studio.organizationId);
      }
      if (input.client_party_id !== undefined && Number(input.client_party_id) !== Number(project.client_party_id)) {
        await studioProjectCommercialService.assertCommercialUnlocked(connection, projectId, studio.organizationId);
        await studioClientService.assertStudioClient(connection, Number(input.client_party_id), studio);
      }
      if (input.project_manager_user_id) {
        await studioProjectMembersService.assertAssignableUser(connection, Number(input.project_manager_user_id), studio.organizationId);
      }

      const columns: Record<string, unknown> = {};
      const assign = (column: string, value: unknown) => { columns[column] = value; };

      if (input.project_name !== undefined) assign('project_name', String(input.project_name).trim());
      if (input.project_type !== undefined) assign('project_type', input.project_type?.trim() || null);
      if (input.priority_code !== undefined) assign('priority_code', input.priority_code);
      if (input.start_date !== undefined) assign('start_date', toSqlDate(input.start_date));
      if (input.deadline_at !== undefined) assign('deadline_at', toSqlDateTime(input.deadline_at));
      if (input.currency_code !== undefined) assign('currency_code', String(input.currency_code).toUpperCase());
      if (input.contract_value !== undefined) assign('contract_value', roundMoney(input.contract_value));
      if (input.estimated_cost !== undefined) assign('estimated_cost', roundMoney(input.estimated_cost));
      if (input.brief !== undefined) assign('brief', input.brief || null);
      if (input.notes !== undefined) assign('notes', input.notes || null);
      if (input.project_manager_user_id !== undefined) assign('project_manager_user_id', input.project_manager_user_id || null);
      if (input.client_party_id !== undefined) assign('client_party_id', Number(input.client_party_id));

      const entries = Object.entries(columns);
      if (!entries.length) throw new AppError(400, 'NO_PROJECT_CHANGES', 'Tidak ada perubahan proyek yang dikirim.');

      await connection.execute(
        `UPDATE studio_projects SET ${entries.map(([column]) => `${column} = ?`).join(', ')} WHERE id = ?`,
        [...entries.map(([, value]) => value), projectId] as any[],
      );
      if (input.project_manager_user_id) {
        await studioProjectMembersService.syncProjectManager(connection, projectId, Number(input.project_manager_user_id), studio.organizationId);
      }

      const previous = Object.fromEntries(entries.map(([column]) => [column, project[column]]));
      await writeProjectAudit(
        connection, studio, userId, 'studio.project_update', projectRef(project),
        `Memperbarui proyek ${project.project_code}.`, previous, columns,
      );
      return { id: projectId };
    });
  }

  /** Applies a controlled status transition; invalid moves are rejected by the server. */
  async changeStatus(projectId: number, target: ProjectStatus, reason: string | null, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      const current = project.status_code as ProjectStatus;

      if (current === target) throw new AppError(409, 'PROJECT_STATUS_UNCHANGED', 'Proyek sudah berada pada status tersebut.');
      const allowed = PROJECT_TRANSITIONS[current] || [];
      if (!allowed.includes(target)) {
        throw new AppError(409, 'INVALID_PROJECT_TRANSITION', `Proyek tidak dapat berpindah dari status "${current}" ke "${target}".`);
      }
      if (target === 'cancelled') {
        throw new AppError(400, 'USE_CANCEL_ENDPOINT', 'Gunakan aksi Batalkan Proyek agar alasan pembatalan tercatat.');
      }
      if (REASON_REQUIRED.some(rule => rule.from === current && rule.to === target) && !reason?.trim()) {
        throw new AppError(400, 'STATUS_REASON_REQUIRED', 'Alasan wajib diisi untuk perubahan status ini.');
      }
      if (target === 'paid') {
        await studioProjectCommercialService.assertFullyPaid(connection, projectId, studio.organizationId, project.payment_status_code);
      }

      const setters: string[] = ['status_code = ?'];
      const params: unknown[] = [target];
      if (target === 'completed') setters.push('completed_at = UTC_TIMESTAMP(3)');
      // Reopening a finished project clears the completion stamp.
      if (current === 'completed' && target === 'review') setters.push('completed_at = NULL');
      // Work starting without a planned start date adopts today; a planned date is kept.
      if (target === 'in_progress' && !project.start_date) setters.push(`start_date = ${STUDIO_LOCAL_DATE_SQL}`);

      await connection.execute(`UPDATE studio_projects SET ${setters.join(', ')} WHERE id = ?`, [...params, projectId] as any[]);
      await this.recordStatusChange(connection, projectId, current, target, reason, userId);

      const reference = projectRef(project);
      await writeProjectAudit(
        connection, studio, userId, 'studio.project_status_change', reference,
        `Status proyek ${project.project_code}: ${current} → ${target}.`,
        { status_code: current }, { status_code: target, reason: reason || null },
      );

      const context = {
        project: {
          id: projectId, project_code: project.project_code, project_name: project.project_name,
          status_code: target, old_status: current, new_status: target,
          client_party_id: Number(project.client_party_id), priority_code: project.priority_code,
          deadline_at: project.deadline_at, contract_value: toNumber(project.contract_value),
        },
      };
      await publishProjectEvent(connection, studio, 'studio.project.status_changed', reference, userId, context);
      const specificEvent = STATUS_EVENTS[target];
      if (specificEvent) await publishProjectEvent(connection, studio, specificEvent, reference, userId, context);

      return { id: projectId, status_code: target };
    });
  }

  /** Cancellation is a status, never a delete — every child record is preserved. */
  async cancelProject(projectId: number, reason: string, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      const current = project.status_code as ProjectStatus;

      if (current === 'cancelled') throw new AppError(409, 'PROJECT_ALREADY_CANCELLED', 'Proyek ini sudah dibatalkan.');
      if (!(PROJECT_TRANSITIONS[current] || []).includes('cancelled')) {
        throw new AppError(409, 'INVALID_PROJECT_TRANSITION', `Proyek berstatus "${current}" tidak dapat dibatalkan.`);
      }

      await connection.execute(`UPDATE studio_projects SET status_code = 'cancelled' WHERE id = ?`, [projectId]);
      await this.recordStatusChange(connection, projectId, current, 'cancelled', reason, userId);

      const reference = projectRef(project);
      await writeProjectAudit(
        connection, studio, userId, 'studio.project_cancel', reference,
        `Membatalkan proyek ${project.project_code}.`, { status_code: current }, { status_code: 'cancelled', reason },
      );
      await publishProjectEvent(connection, studio, 'studio.project.cancelled', reference, userId, {
        project: { id: projectId, project_code: project.project_code, status_code: 'cancelled', old_status: current, reason },
      });
      return { id: projectId, status_code: 'cancelled' };
    });
  }

  /** One round trip per collection — no per-row follow-up queries. */
  async getProjectDetail(projectId: number, studio: BusinessUnitContext) {
    const project = await this.repository.getProject(projectId, studio.id);
    if (!project) throw new NotFoundError('Proyek Studio tidak ditemukan.');

    const [services, members, milestones, deliverables, externals, commercial, statusHistory, lock] = await Promise.all([
      this.repository.getServices(projectId),
      this.repository.getMembers(projectId),
      this.repository.getMilestones(projectId),
      this.repository.getDeliverables(projectId),
      this.repository.getExternalAssignments(projectId),
      studioProjectCommercialService.getSummary(projectId, studio.organizationId),
      this.repository.getStatusHistory(projectId),
      studioProjectCommercialService.getCommercialLock(pool as any, projectId, studio.organizationId),
    ]);

    const serviceSubtotal = roundMoney(services.reduce((sum, line) => sum + line.line_total, 0));

    return {
      project: {
        ...project,
        service_subtotal: serviceSubtotal,
        contract_value_matches_services: Math.abs(serviceSubtotal - project.contract_value) < 0.01,
        available_transitions: (PROJECT_TRANSITIONS[project.status_code as ProjectStatus] || []).filter(status => status !== 'cancelled'),
        can_cancel: (PROJECT_TRANSITIONS[project.status_code as ProjectStatus] || []).includes('cancelled'),
      },
      services,
      members,
      milestones,
      deliverables,
      externals,
      commercial: { ...commercial, lock },
      status_history: statusHistory,
    };
  }

  /** Status history and project audit entries merged into one chronological feed. */
  async getActivity(projectId: number, studio: BusinessUnitContext) {
    const project = await this.repository.getProject(projectId, studio.id);
    if (!project) throw new NotFoundError('Proyek Studio tidak ditemukan.');

    const [statusHistory, auditTrail] = await Promise.all([
      this.repository.getStatusHistory(projectId),
      this.repository.getAuditTrail(projectId, studio.organizationId),
    ]);

    const entries = [
      ...statusHistory.map(row => ({
        kind: 'status' as const,
        id: `status-${row.id}`,
        at: row.changed_at,
        actor: row.changed_by_name || null,
        action_code: 'studio.project_status_change',
        title: row.from_status_code ? `Status: ${row.from_status_code} → ${row.to_status_code}` : `Proyek dibuat dengan status ${row.to_status_code}`,
        detail: row.reason || null,
      })),
      ...auditTrail
        .filter(row => row.action_code !== 'studio.project_status_change')
        .map(row => ({
          kind: 'audit' as const,
          id: `audit-${row.id}`,
          at: row.created_at,
          actor: row.user_name || null,
          action_code: row.action_code,
          title: row.description || row.action_code,
          detail: null,
        })),
    ];
    entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return entries;
  }

  list(filters: any, studio: BusinessUnitContext) {
    return this.repository.getProjects(filters, studio.id);
  }

  overview(studio: BusinessUnitContext) {
    return this.repository.getOverview(studio.id);
  }

  /** Active execution board: approved / in_progress / review. */
  async activeBoard(studio: BusinessUnitContext) {
    const items = await this.repository.getActiveProjects(studio.id);
    return {
      items,
      columns: {
        approved: items.filter(item => item.status_code === 'approved'),
        in_progress: items.filter(item => item.status_code === 'in_progress'),
        review: items.filter(item => item.status_code === 'review'),
      },
    };
  }

  /**
   * Quick-create a Studio client while filling in a project.
   * Delegates to the shared Party helper so the future Studio Clients module
   * reuses the exact same creation and role-activation logic.
   */
  async quickCreateClient(input: StudioClientInput & { use_existing_party_id?: number | null }, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      if (input.use_existing_party_id) {
        const [rows]: any = await connection.execute(
          `SELECT id, code, display_name, party_kind, email, phone FROM parties
           WHERE id = ? AND organization_id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE`,
          [input.use_existing_party_id, studio.organizationId],
        );
        if (!rows.length) throw new AppError(400, 'INVALID_PARTY', 'Party yang dipilih tidak ditemukan.');
        // An existing party keeps its own code; it simply gains the studio_client role.
        await studioClientService.grantStudioClientRole(connection, Number(rows[0].id), studio);
        await connection.execute(
          `INSERT INTO audit_logs (organization_id, business_unit_id, user_id, module_code, action_code, entity_type, entity_id, entity_code, description, new_values)
           VALUES (?, ?, ?, 'studio_clients', 'studio.client_role_grant', 'party', ?, ?, ?, ?)`,
          [
            studio.organizationId, studio.id, userId, rows[0].id, rows[0].code,
            `Mengaktifkan peran Klien Studio untuk ${rows[0].display_name}.`,
            JSON.stringify({ source: 'studio_projects.quick_create' }),
          ],
        );
        return { ...rows[0], reused: true };
      }

      const created = await studioClientService.createStudioClient(connection, input, studio);
      await connection.execute(
        `INSERT INTO audit_logs (organization_id, business_unit_id, user_id, module_code, action_code, entity_type, entity_id, entity_code, description, new_values)
         VALUES (?, ?, ?, 'studio_clients', 'studio.client_create', 'party', ?, ?, ?, ?)`,
        [
          studio.organizationId, studio.id, userId, created.id, created.code,
          `Membuat klien Studio ${created.code} dari form Proyek Baru.`,
          JSON.stringify({ display_name: created.display_name, party_kind: created.party_kind, source: 'studio_projects.quick_create' }),
        ],
      );
      return { ...created, reused: false };
    });
  }

  findClientDuplicates(input: StudioClientInput, studio: BusinessUnitContext) {
    return withTransaction(connection => studioClientService.findDuplicates(connection, input, studio));
  }

  projectTypes(studio: BusinessUnitContext) {
    return this.repository.getUsedProjectTypes(studio.id);
  }
}

export const studioProjectsService = new StudioProjectsService();
