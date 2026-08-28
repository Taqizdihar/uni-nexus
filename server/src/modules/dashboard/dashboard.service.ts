import { pool } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import type { AccessibleBusinessUnits, DashboardActor, DashboardFilters, DashboardPeriod, DashboardRange } from './dashboard.types';

const TIMEZONE = 'Asia/Jakarta' as const;
const DAY_MS = 86_400_000;
const TERMINAL_ORDER_STATUSES = ['completed', 'packed', 'shipped', 'cancelled', 'returned'];
const ACTIVE_PROJECT_STATUSES = ['approved', 'in_progress', 'review'];
const TERMINAL_PROJECT_STATUSES = ['completed', 'paid', 'cancelled'];

const number = (value: unknown) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const sqlDateTime = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');
const ymd = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);
const placeholders = (values: unknown[]) => values.map(() => '?').join(', ');
const inList = (values: number[]) => values.length ? `IN (${placeholders(values)})` : 'IN (NULL)';

function jakartaDay() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts();
  const part = (name: string) => parts.find(item => item.type === name)?.value || '';
  return new Date(Date.UTC(Number(part('year')), Number(part('month')) - 1, Number(part('day'))));
}

function localDateToUtc(date: Date) {
  return new Date(date.getTime() - 7 * 60 * 60 * 1000);
}

function parseYmd(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (ymd(parsed) !== value) throw new AppError(400, 'DASHBOARD_INVALID_DATE', 'Tanggal tidak valid.');
  return parsed;
}

function makePeriod(range: DashboardRange, startDay: Date, endDay: Date): DashboardPeriod {
  const startUtc = localDateToUtc(startDay);
  const endUtc = localDateToUtc(addDays(endDay, 1));
  return { range, start_date: ymd(startDay), end_date: ymd(endDay), timezone: TIMEZONE, start_at_utc: sqlDateTime(startUtc), end_at_utc: sqlDateTime(endUtc) };
}

function periods(filters: DashboardFilters) {
  const today = jakartaDay();
  let start = today;
  let end = today;
  if (filters.range === 'week') {
    const mondayOffset = (today.getUTCDay() + 6) % 7;
    start = addDays(today, -mondayOffset); end = addDays(start, 6);
  } else if (filters.range === 'month') {
    start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
  } else if (filters.range === 'year') {
    start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
    end = new Date(Date.UTC(today.getUTCFullYear(), 11, 31));
  } else if (filters.range === 'custom') {
    start = parseYmd(filters.start_date!); end = parseYmd(filters.end_date!);
    if (end < start) throw new AppError(400, 'DASHBOARD_INVALID_RANGE', 'Tanggal akhir harus setelah tanggal mulai.');
    if (end.getTime() - start.getTime() > 5 * 366 * DAY_MS) throw new AppError(400, 'DASHBOARD_RANGE_TOO_LARGE', 'Rentang Dasbor dibatasi hingga lima tahun.');
  }
  const current = makePeriod(filters.range, start, end);
  const duration = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  let previousStart = addDays(start, -duration);
  let previousEnd = addDays(start, -1);
  if (filters.range === 'month') {
    previousStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1));
    previousEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 0));
  } else if (filters.range === 'year') {
    previousStart = new Date(Date.UTC(start.getUTCFullYear() - 1, 0, 1));
    previousEnd = new Date(Date.UTC(start.getUTCFullYear() - 1, 11, 31));
  }
  const previous = makePeriod(filters.range, previousStart, previousEnd);
  return { current, previous, duration };
}

function metric(key: string, label: string, value: number, currencyCode: string, previousValue: number | null, description: string, snapshot = false) {
  const deltaValue = previousValue === null ? null : number(value - previousValue);
  return {
    key, label, value: number(value), currency_code: currencyCode, snapshot, description,
    comparison: previousValue === null ? null : {
      previous_value: number(previousValue), delta_value: deltaValue,
      delta_percent: previousValue === 0 ? null : number((deltaValue! / previousValue) * 100),
    },
  };
}

function safeUrl(value: string) {
  if (value.startsWith('/app/')) return value;
  try { return new URL(value).protocol === 'https:' ? value : null; } catch { return null; }
}

export class DashboardService {
  private can(actor: DashboardActor, code: string) { return actor.permissions.includes(code); }

  private async units(actor: DashboardActor): Promise<AccessibleBusinessUnits> {
    const [rows]: any = await pool.execute(
      `SELECT bu.id, bu.code FROM business_units bu
       JOIN user_business_units ubu ON ubu.business_unit_id = bu.id AND ubu.user_id = ? AND ubu.can_access = 1
       WHERE bu.organization_id = ? AND bu.is_active = 1 AND bu.code IN ('CRAFT', 'STUDIO', 'SHARED')`,
      [actor.id, actor.organization_id],
    );
    const byCode = new Map<string, number>(rows.map((row: any): [string, number] => [String(row.code).toUpperCase(), Number(row.id)]));
    return { craftId: byCode.get('CRAFT') || null, studioId: byCode.get('STUDIO') || null, sharedId: byCode.get('SHARED') || null };
  }

  private async currencies(actor: DashboardActor, unitIds: number[]) {
    if (!unitIds.length) return [] as string[];
    const [rows]: any = await pool.execute(
      `SELECT DISTINCT currency_code FROM (
         SELECT currency_code FROM financial_transactions WHERE organization_id = ? AND business_unit_id ${inList(unitIds)} AND status_code = 'posted'
         UNION DISTINCT
         SELECT currency_code FROM treasury_accounts WHERE organization_id = ? AND business_unit_id ${inList(unitIds)}
       ) currencies WHERE currency_code IS NOT NULL ORDER BY currency_code`,
      [actor.organization_id, ...unitIds, actor.organization_id, ...unitIds],
    );
    return rows.map((row: any) => String(row.currency_code));
  }

  private financeParams(actor: DashboardActor, unitIds: number[], period: DashboardPeriod, currency: string) {
    return [actor.organization_id, ...unitIds, period.start_at_utc, period.end_at_utc, currency];
  }

  private async financialTotals(actor: DashboardActor, unitIds: number[], period: DashboardPeriod, currency: string) {
    if (!unitIds.length) return { revenue: 0, expense: 0, reversal: 0 };
    const [rows]: any = await pool.execute(
      `SELECT
         COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) AS revenue,
         COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) AS expense,
         COALESCE(SUM(CASE WHEN transaction_type = 'adjustment' AND source_type = 'studio_expense_reversal' THEN amount ELSE 0 END), 0) AS reversal
       FROM financial_transactions
       WHERE organization_id = ? AND business_unit_id ${inList(unitIds)}
         AND status_code = 'posted' AND transaction_date >= ? AND transaction_date < ? AND currency_code = ?`,
      this.financeParams(actor, unitIds, period, currency),
    );
    return { revenue: number(rows[0].revenue), expense: number(rows[0].expense), reversal: number(rows[0].reversal) };
  }

  private async cashSnapshot(actor: DashboardActor, unitIds: number[], currency: string) {
    if (!unitIds.length) return 0;
    const [rows]: any = await pool.execute(
      `SELECT COALESCE(SUM(current_balance), 0) AS total FROM treasury_accounts
       WHERE organization_id = ? AND business_unit_id ${inList(unitIds)} AND currency_code = ?`,
      [actor.organization_id, ...unitIds, currency],
    );
    return number(rows[0].total);
  }

  private async revenueBreakdown(actor: DashboardActor, unitIds: number[], period: DashboardPeriod, currency: string, duration: number) {
    if (!unitIds.length) return { series: [] as string[], buckets: [] as any[] };
    const localTime = "CONVERT_TZ(transaction_date, '+00:00', '+07:00')";
    const label = duration <= 1 ? `DATE_FORMAT(${localTime}, '%H:00')` : duration <= 45 ? `DATE_FORMAT(${localTime}, '%Y-%m-%d')` : duration <= 180 ? `DATE_FORMAT(DATE_SUB(DATE(${localTime}), INTERVAL WEEKDAY(${localTime}) DAY), '%Y-%m-%d')` : `DATE_FORMAT(${localTime}, '%Y-%m')`;
    const [rows]: any = await pool.execute(
      `SELECT ${label} AS label, bu.code, COALESCE(SUM(ft.amount), 0) AS value
       FROM financial_transactions ft JOIN business_units bu ON bu.id = ft.business_unit_id
       WHERE ft.organization_id = ? AND ft.business_unit_id ${inList(unitIds)} AND ft.status_code = 'posted'
         AND ft.transaction_type = 'income' AND ft.transaction_date >= ? AND ft.transaction_date < ? AND ft.currency_code = ?
       GROUP BY label, bu.code ORDER BY label`,
      this.financeParams(actor, unitIds, period, currency),
    );
    const map = new Map<string, any>();
    const series = [...new Set(rows.map((row: any) => String(row.code)))];
    for (const row of rows) {
      const item = map.get(row.label) || { label: row.label };
      item[String(row.code).toLowerCase()] = number(row.value);
      map.set(row.label, item);
    }
    return { series, buckets: [...map.values()] };
  }

  private async cashFlow(actor: DashboardActor, unitIds: number[], period: DashboardPeriod, currency: string) {
    if (!unitIds.length) return { cash_in: 0, cash_out: 0, net_cash_flow: 0 };
    const [rows]: any = await pool.execute(
      `SELECT
         COALESCE(SUM(CASE WHEN transaction_type = 'income' OR (transaction_type = 'adjustment' AND source_type = 'studio_expense_reversal') THEN amount ELSE 0 END), 0) AS cash_in,
         COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) AS cash_out
       FROM financial_transactions
       WHERE organization_id = ? AND business_unit_id ${inList(unitIds)} AND status_code = 'posted'
         AND transaction_date >= ? AND transaction_date < ? AND currency_code = ?`,
      this.financeParams(actor, unitIds, period, currency),
    );
    const cashIn = number(rows[0].cash_in); const cashOut = number(rows[0].cash_out);
    return { cash_in: cashIn, cash_out: cashOut, net_cash_flow: number(cashIn - cashOut) };
  }

  private async craftSummary(craftId: number | null, period: DashboardPeriod, visibility: any) {
    if (!craftId) return null;
    const values: any = {};
    const tasks: Promise<void>[] = [];
    if (visibility.craft_orders) tasks.push(pool.execute(
      `SELECT COUNT(*) AS received, SUM(status_code IN ('new', 'confirmed', 'waiting', 'ready')) AS waiting,
         SUM(deadline_at IS NOT NULL AND deadline_at < UTC_TIMESTAMP(3) AND status_code NOT IN (${TERMINAL_ORDER_STATUSES.map(() => '?').join(',')})) AS overdue
       FROM craft_orders WHERE business_unit_id = ? AND deleted_at IS NULL AND order_date >= ? AND order_date < ?`,
      [...TERMINAL_ORDER_STATUSES, craftId, period.start_at_utc, period.end_at_utc],
    ).then(([rows]: any) => Object.assign(values, { orders_received: Number(rows[0].received), waiting_production: Number(rows[0].waiting), overdue_orders: Number(rows[0].overdue) })).then(() => undefined));
    if (visibility.craft_production) tasks.push(pool.execute(
      `SELECT COUNT(*) AS printing FROM print_jobs WHERE business_unit_id = ? AND status_code = 'printing'`, [craftId],
    ).then(([rows]: any) => Object.assign(values, { printing_now: Number(rows[0].printing) })).then(() => undefined));
    if (visibility.craft_materials) tasks.push(pool.execute(
      `SELECT COUNT(*) AS low_stock FROM v_material_stock vs JOIN materials m ON m.id = vs.material_id
       WHERE vs.business_unit_id = ? AND m.deleted_at IS NULL AND m.is_active = 1
         AND (BINARY vs.stock_status = BINARY 'low_stock' OR BINARY vs.stock_status = BINARY 'out_of_stock')`, [craftId],
    ).then(([rows]: any) => Object.assign(values, { low_stock: Number(rows[0].low_stock) })).then(() => undefined));
    await Promise.all(tasks);
    return values;
  }

  private async studioSummary(studioId: number | null, period: DashboardPeriod, visibility: any) {
    if (!studioId || !visibility.studio_projects) return null;
    const [rows]: any = await pool.execute(
      `SELECT
         SUM(status_code IN (${ACTIVE_PROJECT_STATUSES.map(() => '?').join(',')})) AS active_projects,
         SUM(status_code IN (${ACTIVE_PROJECT_STATUSES.map(() => '?').join(',')}) AND deadline_at >= UTC_TIMESTAMP(3) AND deadline_at < DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 7 DAY)) AS due_soon,
         SUM(status_code IN (${ACTIVE_PROJECT_STATUSES.map(() => '?').join(',')}) AND deadline_at < UTC_TIMESTAMP(3)) AS overdue_projects,
         SUM(status_code IN (${ACTIVE_PROJECT_STATUSES.map(() => '?').join(',')}) AND payment_status_code IN ('unpaid', 'partial')) AS unpaid_projects,
         SUM(completed_at >= ? AND completed_at < ?) AS completed_in_period
       FROM studio_projects WHERE business_unit_id = ? AND deleted_at IS NULL`,
      [...ACTIVE_PROJECT_STATUSES, ...ACTIVE_PROJECT_STATUSES, ...ACTIVE_PROJECT_STATUSES, ...ACTIVE_PROJECT_STATUSES, period.start_at_utc, period.end_at_utc, studioId],
    );
    const item = rows[0];
    return Object.fromEntries(Object.entries(item).map(([key, value]) => [key, Number(value || 0)]));
  }

  private async production(craftId: number | null, canReadProduction: boolean, canReadPrinters: boolean) {
    if (!craftId || !canReadProduction) return [];
    const [rows]: any = await pool.execute(
      `SELECT pj.id, pj.job_code, pj.job_name, pj.progress_percent, pj.started_at, pj.estimated_finish_at,
              ${canReadPrinters ? 'p.code AS printer_code, p.name AS printer_name' : 'NULL AS printer_code, NULL AS printer_name'}
       FROM print_jobs pj ${canReadPrinters ? 'LEFT JOIN printers p ON p.id = pj.printer_id' : ''}
       WHERE pj.business_unit_id = ? AND pj.status_code = 'printing' ORDER BY pj.started_at ASC LIMIT 8`, [craftId],
    );
    return rows.map((row: any) => ({ ...row, id: Number(row.id), progress_percent: number(row.progress_percent) }));
  }

  private attentionItem(id: string, module: string, type: string, severity: 'critical' | 'warning' | 'info', title: string, description: string, entityCode: string, actionUrl: string, dueAt: unknown) {
    return { id, module, type, severity, title, description, entity_code: entityCode, action_url: actionUrl, due_at: dueAt || null };
  }

  private async attention(actor: DashboardActor, units: AccessibleBusinessUnits, visibility: any) {
    const tasks: Promise<any[]>[] = [];
    if (visibility.craft_orders && units.craftId) tasks.push(pool.execute(
      `SELECT id, order_code, deadline_at FROM craft_orders WHERE business_unit_id = ? AND deleted_at IS NULL
       AND deadline_at < UTC_TIMESTAMP(3) AND status_code NOT IN (${TERMINAL_ORDER_STATUSES.map(() => '?').join(',')})
       ORDER BY deadline_at ASC LIMIT 4`, [units.craftId, ...TERMINAL_ORDER_STATUSES],
    ).then(([rows]: any) => rows.map((row: any) => this.attentionItem(`craft-order-${row.id}`, 'craft_orders', 'overdue_order', 'critical', 'Pesanan terlambat', `${row.order_code} telah melewati tenggat.`, row.order_code, `/app/craft/orders/${row.id}`, row.deadline_at))));
    if (visibility.craft_materials && units.craftId) tasks.push(pool.execute(
      `SELECT vs.material_id, m.sku, m.name, vs.stock_status FROM v_material_stock vs JOIN materials m ON m.id = vs.material_id
       WHERE vs.business_unit_id = ? AND m.deleted_at IS NULL AND m.is_active = 1
         AND (BINARY vs.stock_status = BINARY 'low_stock' OR BINARY vs.stock_status = BINARY 'out_of_stock')
       ORDER BY BINARY vs.stock_status = BINARY 'out_of_stock' DESC, vs.available_qty ASC LIMIT 4`, [units.craftId],
    ).then(([rows]: any) => rows.map((row: any) => this.attentionItem(`material-${row.material_id}`, 'craft_materials', row.stock_status, row.stock_status === 'out_of_stock' ? 'critical' : 'warning', row.stock_status === 'out_of_stock' ? 'Material habis' : 'Stok material menipis', `${row.sku} — ${row.name}`, row.sku, '/app/craft/materials/low-stock', null))));
    if (visibility.craft_printers && units.craftId) tasks.push(pool.execute(
      `SELECT pi.id, pi.issue_code, pi.title, pi.severity_code FROM printer_issues pi JOIN printers p ON p.id = pi.printer_id
       WHERE p.business_unit_id = ? AND pi.status_code IN ('open', 'investigating') AND pi.severity_code IN ('high', 'critical')
       ORDER BY pi.severity_code = 'critical' DESC, pi.id DESC LIMIT 3`, [units.craftId],
    ).then(([rows]: any) => rows.map((row: any) => this.attentionItem(`printer-issue-${row.id}`, 'craft_printers', 'printer_issue', row.severity_code === 'critical' ? 'critical' : 'warning', 'Masalah printer aktif', `${row.issue_code}: ${row.title}`, row.issue_code, '/app/craft/printers/issues', null))));
    if (visibility.studio_projects && units.studioId) tasks.push(pool.execute(
      `SELECT id, project_code, project_name, deadline_at FROM studio_projects WHERE business_unit_id = ? AND deleted_at IS NULL
       AND status_code NOT IN (${TERMINAL_PROJECT_STATUSES.map(() => '?').join(',')}) AND deadline_at < UTC_TIMESTAMP(3)
       ORDER BY deadline_at ASC LIMIT 4`, [units.studioId, ...TERMINAL_PROJECT_STATUSES],
    ).then(([rows]: any) => rows.map((row: any) => this.attentionItem(`studio-project-${row.id}`, 'studio_projects', 'overdue_project', 'critical', 'Proyek terlambat', `${row.project_code} — ${row.project_name}`, row.project_code, `/app/studio/projects/${row.id}`, row.deadline_at))));
    if (visibility.studio_billing && units.studioId) tasks.push(pool.execute(
      `SELECT id, invoice_number, due_date FROM invoices WHERE organization_id = ? AND business_unit_id = ? AND balance_due > 0.005
       AND status_code NOT IN ('void', 'refunded') AND due_date < DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))
       ORDER BY due_date ASC LIMIT 4`, [actor.organization_id, units.studioId],
    ).then(([rows]: any) => rows.map((row: any) => this.attentionItem(`invoice-${row.id}`, 'studio_billing', 'overdue_invoice', 'warning', 'Invoice terlambat', `${row.invoice_number} belum lunas.`, row.invoice_number, '/app/studio/billing/outstanding', row.due_date))));
    const lists = await Promise.all(tasks);
    const rank = { critical: 0, warning: 1, info: 2 } as Record<string, number>;
    return lists.flat().sort((a, b) => rank[a.severity] - rank[b.severity] || String(a.due_at || '').localeCompare(String(b.due_at || ''))).slice(0, 10);
  }

  private async quickLinks(actor: DashboardActor, units: AccessibleBusinessUnits) {
    const ids = [units.craftId, units.studioId, units.sharedId].filter((id): id is number => Boolean(id));
    const [rows]: any = await pool.execute(
      `SELECT id, label, url, icon_key, business_unit_id FROM quick_links
       WHERE organization_id = ? AND is_active = 1 AND (business_unit_id IS NULL ${ids.length ? `OR business_unit_id ${inList(ids)}` : ''})
       ORDER BY sort_order, id LIMIT 12`, [actor.organization_id, ...ids],
    );
    return rows.map((row: any) => ({ id: Number(row.id), label: row.label, url: safeUrl(String(row.url)) || null, icon_key: row.icon_key || 'link' })).filter((row: any) => row.url);
  }

  private async recentOrders(craftId: number | null, visible: boolean) {
    if (!craftId || !visible) return [];
    const [rows]: any = await pool.execute(
      `SELECT o.id, o.order_code, p.display_name AS customer_name, sc.name AS channel_name, o.status_code, o.total_amount, o.currency_code, o.order_date,
              COALESCE(GROUP_CONCAT(coi.item_name ORDER BY coi.id SEPARATOR ', '), '') AS item_summary
       FROM craft_orders o JOIN parties p ON p.id = o.customer_party_id JOIN sales_channels sc ON sc.id = o.sales_channel_id
       LEFT JOIN craft_order_items coi ON coi.order_id = o.id
       WHERE o.business_unit_id = ? AND o.deleted_at IS NULL
       GROUP BY o.id, o.order_code, p.display_name, sc.name, o.status_code, o.total_amount, o.currency_code, o.order_date
       ORDER BY o.order_date DESC, o.id DESC LIMIT 5`, [craftId],
    );
    return rows.map((row: any) => ({ ...row, id: Number(row.id), total_amount: number(row.total_amount) }));
  }

  private async recentProjects(studioId: number | null, visible: boolean) {
    if (!studioId || !visible) return [];
    const [rows]: any = await pool.execute(
      `SELECT sp.id, sp.project_code, sp.project_name, p.display_name AS client_name, sp.project_type, sp.status_code, sp.deadline_at,
              sp.contract_value, sp.currency_code, sp.payment_status_code
       FROM studio_projects sp JOIN parties p ON p.id = sp.client_party_id
       WHERE sp.business_unit_id = ? AND sp.deleted_at IS NULL AND sp.status_code IN (${ACTIVE_PROJECT_STATUSES.map(() => '?').join(',')})
       ORDER BY sp.deadline_at IS NULL, sp.deadline_at, sp.updated_at DESC LIMIT 5`, [studioId, ...ACTIVE_PROJECT_STATUSES],
    );
    return rows.map((row: any) => ({ ...row, id: Number(row.id), contract_value: number(row.contract_value) }));
  }

  async overview(filters: DashboardFilters, actor: DashboardActor) {
    const { current, previous, duration } = periods(filters);
    const units = await this.units(actor);
    const financeUnits = [units.craftId, units.studioId, units.sharedId].filter((id): id is number => Boolean(id));
    const visibility = {
      finance: this.can(actor, 'finance.unified.read') && financeUnits.length > 0,
      craft_orders: this.can(actor, 'craft.orders.read') && Boolean(units.craftId),
      craft_production: this.can(actor, 'craft.production.read') && Boolean(units.craftId),
      craft_printers: this.can(actor, 'craft.printers.read') && Boolean(units.craftId),
      craft_materials: this.can(actor, 'craft.materials.read') && Boolean(units.craftId),
      studio_projects: this.can(actor, 'studio.projects.read') && Boolean(units.studioId),
      studio_billing: (this.can(actor, 'studio.billing.read') || this.can(actor, 'studio.finance.read')) && Boolean(units.studioId),
    };
    const availableCurrencies = visibility.finance ? await this.currencies(actor, financeUnits) : [];
    const selectedCurrency = visibility.finance ? (filters.currency || (availableCurrencies.includes('IDR') ? 'IDR' : availableCurrencies[0] || null)) : null;
    if (filters.currency && (!visibility.finance || !availableCurrencies.includes(filters.currency))) throw new AppError(400, 'DASHBOARD_INVALID_CURRENCY', 'Mata uang tidak tersedia untuk Dasbor.');

    const finance = visibility.finance && selectedCurrency
      ? Promise.all([this.financialTotals(actor, financeUnits, current, selectedCurrency), this.financialTotals(actor, financeUnits, previous, selectedCurrency), this.cashSnapshot(actor, financeUnits, selectedCurrency), this.revenueBreakdown(actor, financeUnits, current, selectedCurrency, duration), this.cashFlow(actor, financeUnits, current, selectedCurrency)])
      : Promise.resolve(null);
    const [financial, craftSummary, studioSummary, production, attention, quickLinks, craftOrders, studioProjects] = await Promise.all([
      finance,
      this.craftSummary(units.craftId, current, visibility),
      this.studioSummary(units.studioId, current, visibility),
      this.production(units.craftId, visibility.craft_production, visibility.craft_printers),
      this.attention(actor, units, visibility),
      this.quickLinks(actor, units),
      this.recentOrders(units.craftId, visibility.craft_orders),
      this.recentProjects(units.studioId, visibility.studio_projects),
    ]);

    let kpis: any[] = [];
    let revenueBreakdown: any = null;
    let cashFlow: any = null;
    if (financial && selectedCurrency) {
      const [now, before, totalCash, chart, cash] = financial;
      const expense = number(now.expense - now.reversal); const previousExpense = number(before.expense - before.reversal);
      kpis = [
        metric('total_cash', 'Total Kas', totalCash, selectedCurrency, null, 'Saldo saat ini dari seluruh akun kas organisasi.', true),
        metric('gross_revenue', 'Pendapatan Kotor', now.revenue, selectedCurrency, before.revenue, 'Pendapatan posted pada periode yang dipilih.'),
        metric('total_expenses', 'Total Pengeluaran', expense, selectedCurrency, previousExpense, 'Pengeluaran posted dikurangi pembalikan resmi pada periode yang dipilih.'),
        metric('net_result', 'Pendapatan Bersih', number(now.revenue - expense), selectedCurrency, number(before.revenue - previousExpense), 'Pendapatan posted dikurangi pengeluaran posted pada periode yang dipilih.'),
      ];
      revenueBreakdown = chart; cashFlow = cash;
    }
    return {
      generated_at: new Date().toISOString(), period: current, comparison_period: previous,
      available_currencies: availableCurrencies, selected_currency: selectedCurrency, visibility, kpis,
      revenue_breakdown: revenueBreakdown, cash_flow: cashFlow, craft_summary: craftSummary, studio_summary: studioSummary,
      production, attention, quick_links: quickLinks, recent: { craft_orders: craftOrders, studio_projects: studioProjects },
    };
  }
}
