export type FinanceWorkspace = 'all' | 'craft' | 'studio' | 'shared';
export type FinanceActor = { id: number; organization_id: number; permissions: string[] };

export type AccessibleFinanceUnit = {
  id: number;
  code: 'CRAFT' | 'STUDIO' | 'SHARED';
  name: string;
};

export type FinanceAccess = {
  organizationId: number;
  actorId: number;
  units: AccessibleFinanceUnit[];
  byCode: Partial<Record<'CRAFT' | 'STUDIO' | 'SHARED', AccessibleFinanceUnit>>;
  permissions: Set<string>;
};

export type FinanceFilters = {
  period: 'today' | 'week' | 'month' | 'year' | 'custom';
  from?: string;
  to?: string;
  workspace: FinanceWorkspace;
  currency?: string;
  transaction_type?: string;
  category?: string;
  treasury?: number;
  source?: string;
  status?: string;
  q?: string;
  page: number;
  limit: number;
};

export type FinancePeriod = {
  start_at_utc: string;
  end_at_utc: string;
  start_date: string;
  end_date: string;
  range: FinanceFilters['period'];
  timezone: 'Asia/Jakarta';
};
