import { api } from '../../lib/api';
import type { DashboardOverview, DashboardRange } from '../../types/dashboard';

export interface DashboardOverviewQuery {
  range: DashboardRange;
  start_date?: string;
  end_date?: string;
  currency?: string;
}

export const dashboardApi = {
  overview: (query: DashboardOverviewQuery, signal?: AbortSignal) => {
    const params = new URLSearchParams({ range: query.range });
    if (query.start_date) params.set('start_date', query.start_date);
    if (query.end_date) params.set('end_date', query.end_date);
    if (query.currency) params.set('currency', query.currency);
    return api.get<DashboardOverview>(`/dashboard/overview?${params.toString()}`, { signal });
  },
};
