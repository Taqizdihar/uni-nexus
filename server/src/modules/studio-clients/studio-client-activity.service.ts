import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { StudioClientsRepository } from './studio-clients.repository';

const STATUS_LABELS: Record<string, string> = {
  lead: 'Prospek', quotation: 'Penawaran', approved: 'Disetujui', in_progress: 'Sedang Dikerjakan',
  review: 'Tinjauan', completed: 'Selesai', paid: 'Lunas', cancelled: 'Dibatalkan',
};

/**
 * Merges real client-relationship audit entries with the status history of every
 * project this client owns into one chronological feed. Nothing here is invented —
 * an empty result means nothing has happened yet, and the tab says so.
 */
export class StudioClientActivityService {
  private repository = new StudioClientsRepository();

  async getActivity(partyId: number, studio: BusinessUnitContext) {
    const [auditTrail, projectActivity] = await Promise.all([
      this.repository.getAuditTrail(partyId, studio.organizationId),
      this.repository.getProjectActivity(partyId, studio),
    ]);

    const entries = [
      ...auditTrail.map(row => ({
        kind: 'audit' as const,
        id: `audit-${row.id}`,
        at: row.created_at,
        actor: row.user_name || null,
        action_code: row.action_code,
        title: row.description || row.action_code,
        detail: null as string | null,
      })),
      ...projectActivity.map(row => ({
        kind: 'project' as const,
        id: `project-${row.id}`,
        at: row.changed_at,
        actor: row.changed_by_name || null,
        action_code: 'studio.project_status_change',
        title: row.from_status_code
          ? `${row.project_code} — ${STATUS_LABELS[row.from_status_code] || row.from_status_code} → ${STATUS_LABELS[row.to_status_code] || row.to_status_code}`
          : `Proyek ${row.project_code} dibuat (${STATUS_LABELS[row.to_status_code] || row.to_status_code})`,
        detail: row.reason || null,
      })),
    ];
    entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return entries.slice(0, 200);
  }
}

export const studioClientActivityService = new StudioClientActivityService();
