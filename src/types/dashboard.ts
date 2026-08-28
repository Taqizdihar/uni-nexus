export type DashboardRange = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DashboardKpi {
  key: 'total_cash' | 'gross_revenue' | 'total_expenses' | 'net_result';
  label: string;
  value: number;
  currency_code: string;
  snapshot: boolean;
  description: string;
  comparison: { previous_value: number; delta_value: number; delta_percent: number | null } | null;
}

export interface DashboardOverview {
  generated_at: string;
  period: { range: DashboardRange; start_date: string; end_date: string; timezone: string };
  comparison_period: { start_date: string; end_date: string };
  available_currencies: string[];
  selected_currency: string | null;
  visibility: Record<string, boolean>;
  kpis: DashboardKpi[];
  revenue_breakdown: { series: string[]; buckets: Array<{ label: string; craft?: number; studio?: number; shared?: number }> } | null;
  cash_flow: { cash_in: number; cash_out: number; net_cash_flow: number } | null;
  craft_summary: Record<string, number> | null;
  studio_summary: Record<string, number> | null;
  production: Array<{ id: number; job_code: string; job_name: string; progress_percent: number; started_at: string | null; estimated_finish_at: string | null; printer_code: string | null; printer_name: string | null }>;
  attention: Array<{ id: string; severity: 'critical' | 'warning' | 'info'; title: string; description: string; entity_code: string; action_url: string; due_at: string | null }>;
  quick_links: Array<{ id: number; label: string; url: string; icon_key: string }>;
  recent: {
    craft_orders: Array<{ id: number; order_code: string; customer_name: string; channel_name: string; item_summary: string; status_code: string; total_amount: number; currency_code: string; order_date: string }>;
    studio_projects: Array<{ id: number; project_code: string; project_name: string; client_name: string; project_type: string; status_code: string; deadline_at: string | null; contract_value: number; currency_code: string; payment_status_code: string }>;
  };
}
