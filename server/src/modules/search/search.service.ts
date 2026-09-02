import { pool } from '../../config/database';
import { getBusinessUnitByCodeForOrganization } from '../../shared/utils/business-unit';
import type { SearchResultItem, SearchResultType } from './search.types';

export interface SearchActor {
  organizationId: number;
  permissions: string[];
}

const MIN_QUERY_LENGTH = 2;
const PER_CATEGORY_LIMIT = 8;

/** Escapes LIKE wildcards so a search term is matched literally, not as a pattern. */
const likeTerm = (term: string) => `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

async function craftOrders(actor: SearchActor, term: string): Promise<SearchResultItem[]> {
  const craft = await getBusinessUnitByCodeForOrganization(actor.organizationId, 'CRAFT').catch(() => null);
  if (!craft) return [];
  const [rows]: any = await pool.execute(
    `SELECT o.id, o.order_code, o.total_amount, p.display_name AS customer_name
     FROM craft_orders o
     LEFT JOIN parties p ON p.id = o.customer_party_id
     WHERE o.business_unit_id = ? AND o.deleted_at IS NULL
       AND (o.order_code LIKE ? ESCAPE '\\\\' OR p.display_name LIKE ? ESCAPE '\\\\')
     ORDER BY o.order_date DESC LIMIT ${PER_CATEGORY_LIMIT}`,
    [craft.id, likeTerm(term), likeTerm(term)],
  );
  return rows.map((row: any) => ({
    type: 'craft_order' as SearchResultType,
    id: Number(row.id),
    title: row.order_code,
    subtitle: row.customer_name || null,
    route: `/app/craft/orders/${row.id}`,
    module: 'craft_orders',
  }));
}

async function studioProjects(actor: SearchActor, term: string): Promise<SearchResultItem[]> {
  const studio = await getBusinessUnitByCodeForOrganization(actor.organizationId, 'STUDIO').catch(() => null);
  if (!studio) return [];
  const [rows]: any = await pool.execute(
    `SELECT p.id, p.project_code, p.project_name, client.display_name AS client_name
     FROM studio_projects p
     LEFT JOIN parties client ON client.id = p.client_party_id
     WHERE p.business_unit_id = ? AND p.deleted_at IS NULL
       AND (p.project_code LIKE ? ESCAPE '\\\\' OR p.project_name LIKE ? ESCAPE '\\\\')
     ORDER BY p.created_at DESC LIMIT ${PER_CATEGORY_LIMIT}`,
    [studio.id, likeTerm(term), likeTerm(term)],
  );
  return rows.map((row: any) => ({
    type: 'studio_project' as SearchResultType,
    id: Number(row.id),
    title: row.project_name || row.project_code,
    subtitle: row.client_name || null,
    route: `/app/studio/projects/${row.id}`,
    module: 'studio_projects',
  }));
}

async function craftCustomers(actor: SearchActor, term: string): Promise<SearchResultItem[]> {
  const craft = await getBusinessUnitByCodeForOrganization(actor.organizationId, 'CRAFT').catch(() => null);
  if (!craft) return [];
  const [rows]: any = await pool.execute(
    `SELECT DISTINCT p.id, p.display_name, p.email, p.phone
     FROM parties p
     JOIN party_roles pr ON pr.party_id = p.id AND pr.business_unit_id = ? AND pr.role_code IN ('craft_customer', 'craft_partner')
     WHERE p.organization_id = ?
       AND (p.display_name LIKE ? ESCAPE '\\\\' OR p.email LIKE ? ESCAPE '\\\\' OR p.phone LIKE ? ESCAPE '\\\\')
     LIMIT ${PER_CATEGORY_LIMIT}`,
    [craft.id, actor.organizationId, likeTerm(term), likeTerm(term), likeTerm(term)],
  );
  return rows.map((row: any) => ({
    type: 'craft_customer' as SearchResultType,
    id: Number(row.id),
    title: row.display_name,
    subtitle: row.email || row.phone || null,
    route: `/app/craft/customers/${row.id}`,
    module: 'craft_customers',
  }));
}

async function studioClients(actor: SearchActor, term: string): Promise<SearchResultItem[]> {
  const studio = await getBusinessUnitByCodeForOrganization(actor.organizationId, 'STUDIO').catch(() => null);
  if (!studio) return [];
  const [rows]: any = await pool.execute(
    `SELECT DISTINCT p.id, p.display_name, p.email, p.phone
     FROM parties p
     JOIN party_roles pr ON pr.party_id = p.id AND pr.business_unit_id = ? AND pr.role_code = 'studio_client'
     WHERE p.organization_id = ?
       AND (p.display_name LIKE ? ESCAPE '\\\\' OR p.email LIKE ? ESCAPE '\\\\' OR p.phone LIKE ? ESCAPE '\\\\')
     LIMIT ${PER_CATEGORY_LIMIT}`,
    [studio.id, actor.organizationId, likeTerm(term), likeTerm(term), likeTerm(term)],
  );
  return rows.map((row: any) => ({
    type: 'studio_client' as SearchResultType,
    id: Number(row.id),
    title: row.display_name,
    subtitle: row.email || row.phone || null,
    route: `/app/studio/clients/${row.id}`,
    module: 'studio_clients',
  }));
}

/** Category → permission required to see it, and the query it runs when the actor holds that permission. */
const CATEGORIES: { permission: string; run: (actor: SearchActor, term: string) => Promise<SearchResultItem[]> }[] = [
  { permission: 'craft.orders.read', run: craftOrders },
  { permission: 'studio.projects.read', run: studioProjects },
  { permission: 'craft.customers.read', run: craftCustomers },
  { permission: 'studio.clients.read', run: studioClients },
];

export class SearchService {
  async search(actor: SearchActor, rawQuery: string) {
    const term = rawQuery.trim().slice(0, 120);
    if (term.length < MIN_QUERY_LENGTH) {
      return { query: term, results: [], categories: {} as Record<SearchResultType, number> };
    }

    // Every category is gated on the actor actually holding its read permission — a user
    // must never receive results (titles, ids, counts) from a module they cannot read.
    const runnable = CATEGORIES.filter((category) => actor.permissions.includes(category.permission));
    const resultSets = await Promise.all(runnable.map((category) => category.run(actor, term)));

    const results = resultSets.flat();
    const categories = {} as Record<SearchResultType, number>;
    for (const set of resultSets) {
      for (const item of set) categories[item.type] = (categories[item.type] || 0) + 1;
    }

    return { query: term, results, categories };
  }
}

export const searchService = new SearchService();
