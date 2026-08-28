export type DashboardRange = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DashboardFilters {
  range: DashboardRange;
  start_date?: string;
  end_date?: string;
  currency?: string;
}

export interface DashboardActor {
  id: number;
  organization_id: number;
  permissions: string[];
}

export interface DashboardPeriod {
  range: DashboardRange;
  start_date: string;
  end_date: string;
  timezone: 'Asia/Jakarta';
  start_at_utc: string;
  end_at_utc: string;
}

export interface AccessibleBusinessUnits {
  craftId: number | null;
  studioId: number | null;
  sharedId: number | null;
}
