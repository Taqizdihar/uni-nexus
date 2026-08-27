import { pool } from '../../config/database';
import { ACTIVE_INVOICE_SQL, ACTIVE_PROJECT_STATUSES, assertSingleCurrency, dateBounds, dateOnly, metric, money, nullableNumber, number, percentile, period, previousPeriod, PROJECT_STATUSES } from './studio-analytics.shared';
import type { StudioAnalyticsContext, StudioAnalyticsFilters } from './studio-analytics.types';

type Row = Record<string, unknown>;
const terminalDeliverables = "('approved','delivered','cancelled')";
const sqlBoolean = (value: unknown) => Boolean(Number(value || 0));
const rowMoney = (row: Row, keys: string[]) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, keys.includes(key) ? money(value) : value]));

/**
 * Read-only Studio reporting facade.  Financial domains are pre-aggregated before
 * joining to projects so service lines, invoices, expenses and assignments cannot
 * multiply one another.
 */
export class StudioAnalyticsService {
  private async ready(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    await assertSingleCurrency(ctx, filters);
  }

  private moneyFilter(alias: string, filters: StudioAnalyticsFilters, params: any[]) {
    if (!filters.currency) return '';
    params.push(filters.currency);
    return ` AND ${alias}.currency_code=?`;
  }

  private projectFilters(alias: string, filters: StudioAnalyticsFilters, params: any[], dateColumn?: string) {
    let where = ` ${alias}.business_unit_id=? AND ${alias}.deleted_at IS NULL`;
    if (filters.currency) { where += ` AND ${alias}.currency_code=?`; params.push(filters.currency); }
    if (filters.projectType) { where += ` AND COALESCE(${alias}.project_type,'')=?`; params.push(filters.projectType); }
    if (filters.clientId) { where += ` AND ${alias}.client_party_id=?`; params.push(filters.clientId); }
    if (filters.serviceId) { where += ` AND EXISTS (SELECT 1 FROM studio_project_services filter_sps WHERE filter_sps.project_id=${alias}.id AND filter_sps.service_id=?)`; params.push(filters.serviceId); }
    if (dateColumn) { const [start, end] = dateBounds(filters); where += ` AND ${dateColumn} BETWEEN ? AND ?`; params.push(start, end); }
    return where;
  }

  private async projectFinancialRows(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters, dateColumn = 'p.created_at') {
    const params: any[] = [ctx.organizationId, ctx.id];
    const quoteCurrency = this.moneyFilter('q', filters, params);
    params.push(ctx.organizationId, ctx.id);
    const invoiceCurrency = this.moneyFilter('i', filters, params);
    params.push(ctx.organizationId, ctx.id);
    const expenseCurrency = this.moneyFilter('e', filters, params);
    params.push(ctx.id, ctx.organizationId, ctx.id);
    const payoutCurrency = this.moneyFilter('ft', filters, params);
    const projectParams: any[] = [ctx.id];
    const projectWhere = this.projectFilters('p', filters, projectParams, dateColumn);
    const [rows]: any = await pool.execute(
      `WITH accepted_quotes AS (
         SELECT q.project_id, MAX(q.total_amount) accepted_value
         FROM quotations q WHERE q.organization_id=? AND q.business_unit_id=? AND q.order_id IS NULL AND q.status_code='accepted'${quoteCurrency}
         GROUP BY q.project_id
       ), invoice_totals AS (
         SELECT i.source_id AS project_id, SUM(i.total_amount) invoiced, SUM(i.paid_amount) collected, SUM(i.balance_due) outstanding
         FROM invoices i WHERE i.organization_id=? AND i.business_unit_id=? AND i.source_type='studio_project' AND ${ACTIVE_INVOICE_SQL}${invoiceCurrency}
         GROUP BY i.source_id
       ), paid_expenses AS (
         SELECT e.studio_project_id AS project_id, SUM(e.amount+e.tax_amount) actual_cost
         FROM expenses e WHERE e.organization_id=? AND e.business_unit_id=? AND e.studio_project_id IS NOT NULL AND e.status_code='paid'${expenseCurrency}
         GROUP BY e.studio_project_id
       ), external_fees AS (
         SELECT pea.project_id, SUM(pea.agreed_fee) agreed_external_fee,
           SUM(COALESCE(payout.paid_amount,0)) external_payout
         FROM project_external_assignments pea
         JOIN studio_projects fee_project ON fee_project.id=pea.project_id AND fee_project.business_unit_id=? AND fee_project.deleted_at IS NULL
         LEFT JOIN (
           SELECT ft.source_code, SUM(ft.amount) paid_amount FROM financial_transactions ft
           WHERE ft.organization_id=? AND ft.business_unit_id=? AND ft.source_type='studio_external_payout' AND ft.status_code='posted'${payoutCurrency}
           GROUP BY ft.source_code
         ) payout ON payout.source_code=CONCAT('ASSIGN-', pea.id)
         GROUP BY pea.project_id
       )
       SELECT p.id,p.project_code,p.project_name,p.client_party_id,client.display_name client_name,p.project_type,p.status_code,p.start_date,p.deadline_at,p.completed_at,p.created_at,
         p.contract_value,COALESCE(aq.accepted_value,p.contract_value) commercial_basis,COALESCE(it.invoiced,0) invoiced,COALESCE(it.collected,0) collected,
         COALESCE(it.outstanding,0) outstanding,COALESCE(pe.actual_cost,0) actual_cost,COALESCE(ef.agreed_external_fee,0) agreed_external_fee,COALESCE(ef.external_payout,0) external_payout
       FROM studio_projects p JOIN parties client ON client.id=p.client_party_id
       LEFT JOIN accepted_quotes aq ON aq.project_id=p.id LEFT JOIN invoice_totals it ON it.project_id=p.id
       LEFT JOIN paid_expenses pe ON pe.project_id=p.id LEFT JOIN external_fees ef ON ef.project_id=p.id
       WHERE ${projectWhere} ORDER BY p.created_at DESC,p.id DESC`,
      [...params, ...projectParams],
    );
    return (rows as Row[]).map(row => ({ ...row,
      id: number(row.id), client_party_id: number(row.client_party_id), contract_value: money(row.contract_value), commercial_basis: money(row.commercial_basis), invoiced: money(row.invoiced), collected: money(row.collected), outstanding: money(row.outstanding), actual_cost: money(row.actual_cost), agreed_external_fee: money(row.agreed_external_fee), external_payout: money(row.external_payout),
    }));
  }

  private async projectSnapshot(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    const params: any[] = [ctx.id];
    const where = this.projectFilters('p', { ...filters, projectType: undefined, serviceId: undefined }, params);
    const [rows]: any = await pool.execute(`SELECT COUNT(*) active_projects,COUNT(DISTINCT CASE WHEN p.status_code IN ('approved','in_progress','review') THEN p.client_party_id END) active_clients FROM studio_projects p WHERE ${where} AND p.status_code IN ('approved','in_progress','review')`, params);
    return { active_projects: number(rows[0]?.active_projects), active_clients: number(rows[0]?.active_clients) };
  }

  private async periodNumbers(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    const [startAt, endAt] = dateBounds(filters); const [startDay, endDay] = dateOnly(filters);
    const projectParams: any[] = [ctx.id]; const projectWhere = this.projectFilters('p', filters, projectParams, 'p.created_at');
    const costCurrency = filters.currency ? ' AND e.currency_code=?' : '';
    const quoteCurrency = filters.currency ? ' AND q.currency_code=?' : '';
    const invoiceCurrency = filters.currency ? ' AND i.currency_code=?' : '';
    const cashCurrency = filters.currency ? ' AND ft.currency_code=?' : '';
    const [projects, accepted, invoices, cash, costs]: any = await Promise.all([
      pool.execute(`SELECT COUNT(*) project_created, SUM(p.status_code='cancelled') cancelled, SUM(p.status_code IN ('completed','paid')) completed, SUM(p.status_code IN ('completed','paid') AND p.deadline_at IS NOT NULL) completed_with_deadline, SUM(p.status_code IN ('completed','paid') AND p.deadline_at IS NOT NULL AND p.completed_at<=p.deadline_at) completed_on_time FROM studio_projects p WHERE ${projectWhere}`, projectParams),
      pool.execute(`SELECT COALESCE(SUM(q.total_amount),0) accepted_value FROM quotations q WHERE q.organization_id=? AND q.business_unit_id=? AND q.order_id IS NULL AND q.status_code='accepted' AND q.accepted_at BETWEEN ? AND ?${quoteCurrency}`, filters.currency ? [ctx.organizationId,ctx.id,startAt,endAt,filters.currency] : [ctx.organizationId,ctx.id,startAt,endAt]),
      pool.execute(`SELECT COUNT(*) invoice_count,COALESCE(SUM(i.total_amount),0) invoiced_value,COALESCE(SUM(i.paid_amount),0) cohort_paid FROM invoices i WHERE i.organization_id=? AND i.business_unit_id=? AND ${ACTIVE_INVOICE_SQL} AND i.issue_date BETWEEN ? AND ?${invoiceCurrency}`, filters.currency ? [ctx.organizationId,ctx.id,startDay,endDay,filters.currency] : [ctx.organizationId,ctx.id,startDay,endDay]),
      pool.execute(`SELECT COALESCE(SUM(ft.amount),0) cash_collected FROM financial_transactions ft WHERE ft.organization_id=? AND ft.business_unit_id=? AND ft.status_code='posted' AND ft.source_type='studio_customer_payment' AND ft.transaction_date BETWEEN ? AND ?${cashCurrency}`, filters.currency ? [ctx.organizationId,ctx.id,startAt,endAt,filters.currency] : [ctx.organizationId,ctx.id,startAt,endAt]),
      pool.execute(`SELECT COALESCE(SUM(e.amount+e.tax_amount),0) actual_cost FROM expenses e WHERE e.organization_id=? AND e.business_unit_id=? AND e.status_code='paid' AND e.expense_date BETWEEN ? AND ?${costCurrency}`, filters.currency ? [ctx.organizationId,ctx.id,startAt,endAt,filters.currency] : [ctx.organizationId,ctx.id,startAt,endAt]),
    ]);
    const p = projects[0][0] || {}, a = accepted[0][0] || {}, i = invoices[0][0] || {}, c = cash[0][0] || {}, e = costs[0][0] || {};
    return { project_created: number(p.project_created), cancelled: number(p.cancelled), completed: number(p.completed), completed_with_deadline: number(p.completed_with_deadline), completed_on_time: number(p.completed_on_time), accepted_value: money(a.accepted_value), invoice_count: number(i.invoice_count), invoiced_value: money(i.invoiced_value), cohort_paid: money(i.cohort_paid), cash_collected: money(c.cash_collected), actual_cost: money(e.actual_cost) };
  }

  private async outstandingSnapshot(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    const params: any[] = [ctx.organizationId, ctx.id]; const currency = this.moneyFilter('i', filters, params);
    const [rows]: any = await pool.execute(`SELECT COALESCE(SUM(i.balance_due),0) outstanding FROM invoices i WHERE i.organization_id=? AND i.business_unit_id=? AND ${ACTIVE_INVOICE_SQL} AND i.balance_due>0${currency}`, params);
    return money(rows[0]?.outstanding);
  }

  private trendLabel(column: string, filters: StudioAnalyticsFilters) {
    const days = Math.floor((Date.parse(`${filters.endDate}T00:00:00Z`) - Date.parse(`${filters.startDate}T00:00:00Z`)) / 86400000) + 1;
    if (days <= 45) return `DATE(${column})`;
    if (days <= 180) return `DATE_SUB(DATE(${column}), INTERVAL WEEKDAY(${column}) DAY)`;
    return `DATE_FORMAT(${column},'%Y-%m-01')`;
  }

  async overview(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    await this.ready(ctx, filters);
    const previous = filters.compare ? await this.periodNumbers(ctx, previousPeriod(filters)) : null;
    const [current, snapshot, outstanding, projects, trendRows, topClients, topServices, attention]: any = await Promise.all([
      this.periodNumbers(ctx, filters), this.projectSnapshot(ctx, filters), this.outstandingSnapshot(ctx, filters), this.projectFinancialRows(ctx, filters), this.overviewTrends(ctx, filters), this.topClients(ctx, filters), this.topServices(ctx, filters), this.attention(ctx, filters),
    ]);
    const avgValue = projects.length ? projects.reduce((sum: number, project: any) => sum + project.commercial_basis, 0) / projects.length : 0;
    const repeatClients = new Set(projects.reduce((map: Map<number, number>, project: any) => map.set(project.client_party_id, (map.get(project.client_party_id) || 0) + 1), new Map<number, number>())).size
      ? [...projects.reduce((map: Map<number, number>, project: any) => map.set(project.client_party_id, (map.get(project.client_party_id) || 0) + 1), new Map<number, number>()).values()].filter(value => value >= 2).length : 0;
    const contractMargin = projects.reduce((sum: number, item: any) => sum + item.commercial_basis - item.actual_cost, 0);
    const cashMargin = current.cash_collected - current.actual_cost;
    return {
      generated_at: new Date().toISOString(), period: period(filters), comparison: filters.compare ? period(previousPeriod(filters)) : null,
      kpis: {
        projects: [metric('Proyek Baru', current.project_created, 'Jumlah proyek yang dibuat dalam periode.', previous?.project_created), metric('Proyek Aktif Saat Ini', snapshot.active_projects, 'Snapshot proyek berstatus approved, in_progress, atau review.', undefined, true), metric('Proyek Selesai', current.completed, 'Proyek cohort periode yang kini completed atau paid.', previous?.completed), metric('Completion Rate', current.project_created ? current.completed / current.project_created * 100 : null, 'Completed atau paid dibagi proyek baru dalam periode.', previous && previous.project_created ? previous.completed / previous.project_created * 100 : null), metric('On-Time Completion Rate', current.completed_with_deadline ? current.completed_on_time / current.completed_with_deadline * 100 : null, 'Selesai pada/sebelum deadline; proyek tanpa deadline dikecualikan.', previous && previous.completed_with_deadline ? previous.completed_on_time / previous.completed_with_deadline * 100 : null)],
        commercial: [metric('Nilai Penawaran Diterima', current.accepted_value, 'Total quotation accepted berdasarkan accepted_at.', previous?.accepted_value), metric('Nilai Invoice', current.invoiced_value, 'Total invoice aktif berdasarkan issue_date.', previous?.invoiced_value), metric('Kas Terkumpul', current.cash_collected, 'Customer-payment posted berdasarkan tanggal transaksi.', previous?.cash_collected), metric('Outstanding Receivables', outstanding, 'Snapshot saldo invoice aktif yang belum dibayar.', undefined, true)],
        profit: [metric('Biaya Aktual', current.actual_cost, 'Expense proyek berstatus paid dalam periode.', previous?.actual_cost), metric('Recorded Contract Margin', contractMargin, 'Commercial basis dikurangi biaya proyek tercatat untuk cohort.', undefined), metric('Cash Margin', cashMargin, 'Kas customer payment dalam periode dikurangi expense paid dalam periode.', previous ? previous.cash_collected - previous.actual_cost : null)],
        clients: [metric('Klien dengan Proyek Aktif', snapshot.active_clients, 'Snapshot klien dengan setidaknya satu proyek aktif.', undefined, true), metric('Repeat Clients', repeatClients, 'Klien cohort dengan sedikitnya dua proyek berbeda.', undefined), metric('Average Project Value', avgValue, 'Rata-rata commercial basis proyek cohort.', undefined)],
      }, trends: trendRows, top_clients: topClients, top_services: topServices, project_status: await this.statusDistribution(ctx, filters), attention,
    };
  }

  private async overviewTrends(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    const [startAt, endAt] = dateBounds(filters); const [startDay, endDay] = dateOnly(filters);
    const projectLabel = this.trendLabel('p.created_at', filters), invoiceLabel = this.trendLabel('i.issue_date', filters), cashLabel = this.trendLabel('ft.transaction_date', filters), costLabel = this.trendLabel('e.expense_date', filters);
    const projectParams: any[] = [ctx.id]; const projectWhere = this.projectFilters('p', filters, projectParams, 'p.created_at');
    const invCurrency = filters.currency ? ' AND i.currency_code=?' : '';
    const cashCurrency = filters.currency ? ' AND ft.currency_code=?' : '';
    const costCurrency = filters.currency ? ' AND e.currency_code=?' : '';
    const [projects, invoices, cash, costs]: any = await Promise.all([
      pool.execute(`SELECT ${projectLabel} label,COUNT(*) value FROM studio_projects p WHERE ${projectWhere} GROUP BY label ORDER BY label`, projectParams),
      pool.execute(`SELECT ${invoiceLabel} label,SUM(i.total_amount) value FROM invoices i WHERE i.organization_id=? AND i.business_unit_id=? AND ${ACTIVE_INVOICE_SQL} AND i.issue_date BETWEEN ? AND ?${invCurrency} GROUP BY label ORDER BY label`, filters.currency ? [ctx.organizationId,ctx.id,startDay,endDay,filters.currency] : [ctx.organizationId,ctx.id,startDay,endDay]),
      pool.execute(`SELECT ${cashLabel} label,SUM(ft.amount) value FROM financial_transactions ft WHERE ft.organization_id=? AND ft.business_unit_id=? AND ft.status_code='posted' AND ft.source_type='studio_customer_payment' AND ft.transaction_date BETWEEN ? AND ?${cashCurrency} GROUP BY label ORDER BY label`, filters.currency ? [ctx.organizationId,ctx.id,startAt,endAt,filters.currency] : [ctx.organizationId,ctx.id,startAt,endAt]),
      pool.execute(`SELECT ${costLabel} label,SUM(e.amount+e.tax_amount) value FROM expenses e WHERE e.organization_id=? AND e.business_unit_id=? AND e.status_code='paid' AND e.expense_date BETWEEN ? AND ?${costCurrency} GROUP BY label ORDER BY label`, filters.currency ? [ctx.organizationId,ctx.id,startAt,endAt,filters.currency] : [ctx.organizationId,ctx.id,startAt,endAt]),
    ]);
    return { projects_created: projects[0].map((row: Row) => ({ label: row.label, value: number(row.value) })), invoiced_value: invoices[0].map((row: Row) => ({ label: row.label, value: money(row.value) })), cash_collected: cash[0].map((row: Row) => ({ label: row.label, value: money(row.value) })), actual_cost: costs[0].map((row: Row) => ({ label: row.label, value: money(row.value) })) };
  }

  private async topClients(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    const rows = await this.projectFinancialRows(ctx, filters);
    const map = new Map<number, any>();
    rows.forEach((row: any) => { const existing = map.get(row.client_party_id) || { id: row.client_party_id, name: row.client_name, project_count: 0, commercial_basis: 0, invoiced: 0, collected: 0, outstanding: 0 }; existing.project_count += 1; existing.commercial_basis += row.commercial_basis; existing.invoiced += row.invoiced; existing.collected += row.collected; existing.outstanding += row.outstanding; map.set(row.client_party_id, existing); });
    return [...map.values()].sort((a, b) => b.commercial_basis - a.commercial_basis).slice(0, 10);
  }

  private async topServices(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    const params: any[] = [ctx.id]; const projectWhere = this.projectFilters('p', filters, params, 'p.created_at');
    const [rows]: any = await pool.execute(`SELECT COALESCE(s.name, sps.description, 'Custom / Non-Katalog') name, COUNT(DISTINCT sps.project_id) project_count, COALESCE(SUM(sps.line_total),0) scope_value FROM studio_project_services sps JOIN studio_projects p ON p.id=sps.project_id LEFT JOIN studio_services s ON s.id=sps.service_id WHERE ${projectWhere} GROUP BY sps.service_id,s.name,sps.description ORDER BY scope_value DESC LIMIT 10`, params);
    return rows.map((row: Row) => ({ ...row, project_count: number(row.project_count), scope_value: money(row.scope_value) }));
  }

  private async attention(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    const [projects, deliverables, receivables, negative, fees, maintenance]: any = await Promise.all([
      pool.execute(`SELECT p.id,p.project_name,p.deadline_at,'overdue_project' kind FROM studio_projects p WHERE p.business_unit_id=? AND p.deleted_at IS NULL AND p.deadline_at<UTC_TIMESTAMP(3) AND p.status_code NOT IN ('completed','paid','cancelled') ORDER BY p.deadline_at LIMIT 10`, [ctx.id]),
      pool.execute(`SELECT d.id,d.title,d.due_at,p.project_name,'overdue_deliverable' kind FROM project_deliverables d JOIN studio_projects p ON p.id=d.project_id WHERE p.business_unit_id=? AND p.deleted_at IS NULL AND d.due_at<UTC_TIMESTAMP(3) AND d.status_code NOT IN ${terminalDeliverables} ORDER BY d.due_at LIMIT 10`, [ctx.id]),
      pool.execute(`SELECT i.id,i.invoice_number,i.due_date,p.display_name client_name,'overdue_receivable' kind FROM invoices i JOIN parties p ON p.id=i.party_id WHERE i.organization_id=? AND i.business_unit_id=? AND ${ACTIVE_INVOICE_SQL} AND i.balance_due>0 AND i.due_date<DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+07:00')) ORDER BY i.due_date LIMIT 10`, [ctx.organizationId,ctx.id]),
      pool.execute(`SELECT p.id,p.project_name,'negative_margin' kind FROM studio_projects p WHERE p.business_unit_id=? AND p.deleted_at IS NULL AND p.actual_cost>p.contract_value ORDER BY p.actual_cost-p.contract_value DESC LIMIT 10`, [ctx.id]),
      pool.execute(`SELECT pea.id,p.display_name party_name,pea.agreed_fee,'high_external_commitment' kind FROM project_external_assignments pea JOIN studio_projects sp ON sp.id=pea.project_id JOIN parties p ON p.id=pea.party_id WHERE sp.business_unit_id=? AND sp.deleted_at IS NULL ORDER BY pea.agreed_fee DESC LIMIT 5`, [ctx.id]),
      pool.execute(`SELECT mr.id,a.name asset_name,mr.next_due_at,'maintenance_due' kind FROM asset_maintenance_records mr JOIN assets a ON a.id=mr.asset_id WHERE a.business_unit_id=? AND a.deleted_at IS NULL AND mr.next_due_at IS NOT NULL AND mr.next_due_at<=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 7 DAY) ORDER BY mr.next_due_at LIMIT 10`, [ctx.id]),
    ]);
    return [...projects[0], ...deliverables[0], ...receivables[0], ...negative[0], ...fees[0], ...maintenance[0]].slice(0, 30);
  }

  private async statusDistribution(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    const params: any[] = [ctx.id]; const where = this.projectFilters('p', filters, params, 'p.created_at');
    const [rows]: any = await pool.execute(`SELECT p.status_code label,COUNT(*) value FROM studio_projects p WHERE ${where} GROUP BY p.status_code`, params);
    const found = new Map(rows.map((row: Row) => [String(row.label), number(row.value)]));
    return PROJECT_STATUSES.map(label => ({ label, value: found.get(label) || 0 }));
  }

  async projects(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    await this.ready(ctx, filters);
    const [rows, statusDistribution, milestones, deliverables]: any = await Promise.all([this.projectFinancialRows(ctx, filters), this.statusDistribution(ctx, filters), this.projectMilestones(ctx, filters), this.projectDeliverables(ctx, filters)]);
    const completed = rows.filter((row: any) => ['completed', 'paid'].includes(row.status_code));
    const timed = completed.filter((row: any) => row.deadline_at && row.completed_at);
    const cycles = completed.filter((row: any) => row.start_date && row.completed_at).map((row: any) => (Date.parse(String(row.completed_at)) - Date.parse(`${String(row.start_date).slice(0, 10)}T00:00:00`)) / 86400000).filter((value: number) => Number.isFinite(value) && value >= 0);
    const byType = new Map<string, any>();
    rows.forEach((row: any) => { const key = row.project_type || 'Tidak Dikategorikan'; const item = byType.get(key) || { label: key, project_count: 0, commercial_basis: 0, invoiced: 0, collected: 0, actual_cost: 0, margin: 0 }; item.project_count += 1; item.commercial_basis += row.commercial_basis; item.invoiced += row.invoiced; item.collected += row.collected; item.actual_cost += row.actual_cost; item.margin += row.commercial_basis - row.actual_cost; byType.set(key, item); });
    const params: any[] = [ctx.id]; const cohortWhere = this.projectFilters('p', filters, params, 'p.created_at');
    const [funnelRows]: any = await pool.execute(`SELECT h.to_status_code label,COUNT(DISTINCT h.project_id) value FROM studio_project_status_history h JOIN studio_projects p ON p.id=h.project_id WHERE ${cohortWhere} AND h.to_status_code IN ('lead','quotation','approved','in_progress','review','completed','paid') GROUP BY h.to_status_code`, params);
    const funnelMap = new Map(funnelRows.map((row: Row) => [String(row.label), number(row.value)]));
    const limit = filters.limit, offset = (filters.page - 1) * limit;
    const detail = rows.slice(offset, offset + limit).map((row: any) => ({ ...row, recorded_margin: row.commercial_basis - row.actual_cost, on_time_state: !row.deadline_at || !row.completed_at ? 'Data Belum Lengkap' : new Date(row.completed_at) <= new Date(row.deadline_at) ? 'On Time' : 'Late' }));
    return { period: period(filters), kpis: [metric('Proyek Baru', rows.length, 'Proyek dibuat dalam periode.'), metric('Cancellation Rate', rows.length ? rows.filter((row: any) => row.status_code === 'cancelled').length / rows.length * 100 : null, 'Cancelled dibagi proyek cohort.'), metric('Completion Rate', rows.length ? completed.length / rows.length * 100 : null, 'Completed atau paid dibagi proyek cohort.'), metric('On-Time Completion Rate', timed.length ? timed.filter((row: any) => new Date(row.completed_at) <= new Date(row.deadline_at)).length / timed.length * 100 : null, 'Proyek tanpa deadline atau completed_at dikecualikan.'), metric('Average Cycle Time', cycles.length ? cycles.reduce((sum: number, value: number) => sum + value, 0) / cycles.length : null, 'Hari start_date hingga completed_at.'), metric('Median Cycle Time', percentile(cycles, .5), 'Median hari start_date hingga completed_at.'), metric('P90 Cycle Time', percentile(cycles, .9), 'Persentil ke-90 hari start_date hingga completed_at.')], status_distribution: statusDistribution, funnel: ['lead','quotation','approved','in_progress','review','completed','paid'].map(label => ({ label, value: funnelMap.get(label) || 0, definition: 'Distinct project cohort yang pernah mencapai status menurut status history.' })), project_types: [...byType.values()], cycle_time: { samples: cycles.length, average: cycles.length ? cycles.reduce((sum: number, value: number) => sum + value, 0) / cycles.length : null, median: percentile(cycles,.5), p90: percentile(cycles,.9) }, delivery: { completed: completed.length, with_deadline: timed.length, on_time: timed.filter((row: any) => new Date(row.completed_at) <= new Date(row.deadline_at)).length }, milestones, deliverables, trend: await this.overviewTrends(ctx, filters), rows: detail, detail_meta: { page: filters.page, limit, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / limit)) } };
  }

  private async projectMilestones(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    const params: any[] = [ctx.id]; const where = this.projectFilters('p', filters, params, 'p.created_at');
    const [rows]: any = await pool.execute(`SELECT COUNT(*) total,SUM(m.status_code='completed') completed,SUM(m.due_at<UTC_TIMESTAMP(3) AND m.status_code NOT IN ('completed','cancelled')) overdue,SUM(m.completed_at IS NOT NULL AND m.due_at IS NOT NULL AND m.completed_at<=m.due_at) on_time FROM project_milestones m JOIN studio_projects p ON p.id=m.project_id WHERE ${where} AND m.status_code<>'cancelled'`, params);
    const row = rows[0] || {}; const total = number(row.total), completed = number(row.completed); return { total, completed, overdue: number(row.overdue), completion_rate: total ? completed / total * 100 : null, on_time: number(row.on_time) };
  }

  private async projectDeliverables(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    const params: any[] = [ctx.id]; const where = this.projectFilters('p', filters, params, 'p.created_at');
    const [rows]: any = await pool.execute(`SELECT COUNT(*) total,SUM(d.status_code IN ('approved','delivered')) completed,SUM(d.status_code NOT IN ${terminalDeliverables}) pending,SUM(d.due_at<UTC_TIMESTAMP(3) AND d.status_code NOT IN ${terminalDeliverables}) overdue,SUM(d.delivered_at IS NOT NULL AND d.due_at IS NOT NULL AND d.delivered_at<=d.due_at) on_time FROM project_deliverables d JOIN studio_projects p ON p.id=d.project_id WHERE ${where}`, params);
    const row = rows[0] || {}; const total = number(row.total), completed = number(row.completed); return { total, completed, pending: number(row.pending), overdue: number(row.overdue), completion_rate: total ? completed / total * 100 : null, on_time_delivery_rate: completed ? number(row.on_time) / completed * 100 : null };
  }

  async clients(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    await this.ready(ctx, filters);
    const projects = await this.projectFinancialRows(ctx, filters);
    const clients = new Map<number, any>();
    projects.forEach((project: any) => { const current = clients.get(project.client_party_id) || { id: project.client_party_id, name: project.client_name, project_count: 0, active_project_count: 0, commercial_basis: 0, invoiced: 0, collected: 0, outstanding: 0, actual_cost: 0, first_project: project.created_at, latest_project: project.created_at }; current.project_count++; current.active_project_count += ACTIVE_PROJECT_STATUSES.includes(project.status_code) ? 1 : 0; current.commercial_basis += project.commercial_basis; current.invoiced += project.invoiced; current.collected += project.collected; current.outstanding += project.outstanding; current.actual_cost += project.actual_cost; if (String(project.created_at) < String(current.first_project)) current.first_project = project.created_at; if (String(project.created_at) > String(current.latest_project)) current.latest_project = project.created_at; clients.set(project.client_party_id, current); });
    const items = [...clients.values()].map(item => ({ ...item, average_project_value: item.project_count ? item.commercial_basis / item.project_count : null, repeat: item.project_count >= 2 }));
    const total = items.length, repeat = items.filter(item => item.repeat).length, totalCommercial = items.reduce((sum, item) => sum + item.commercial_basis, 0), top = [...items].sort((a,b) => b.commercial_basis-a.commercial_basis);
    const slice = items.slice((filters.page-1)*filters.limit, filters.page*filters.limit);
    return { period: period(filters), kpis: [metric('Klien Aktif di Periode', total, 'Klien dengan proyek baru dalam periode.'), metric('Repeat Client Rate', total ? repeat / total * 100 : null, 'Klien dengan sedikitnya dua proyek dibagi klien dengan proyek.'), metric('Average Project Value', projects.length ? totalCommercial / projects.length : null, 'Rata-rata commercial basis proyek cohort.')], rankings: { highest_commercial_value: top.slice(0,10), highest_invoiced_value: [...items].sort((a,b)=>b.invoiced-a.invoiced).slice(0,10), highest_cash_collected: [...items].sort((a,b)=>b.collected-a.collected).slice(0,10), highest_outstanding: [...items].sort((a,b)=>b.outstanding-a.outstanding).slice(0,10) }, concentration: { top_1_share: totalCommercial ? top[0]?.commercial_basis / totalCommercial * 100 : null, top_5_share: totalCommercial ? top.slice(0,5).reduce((sum,item)=>sum+item.commercial_basis,0) / totalCommercial * 100 : null }, repeat_rate: total ? repeat / total * 100 : null, trend: await this.overviewTrends(ctx, filters), rows: slice, meta: { page: filters.page, limit: filters.limit, total, totalPages: Math.max(1,Math.ceil(total/filters.limit)) } };
  }

  async services(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    await this.ready(ctx, filters);
    const params: any[] = [ctx.id]; const where = this.projectFilters('p', filters, params, 'p.created_at');
    const [scope, quotations, invoices]: any = await Promise.all([
      pool.execute(`SELECT sps.service_id,COALESCE(s.name,sps.description,'Custom / Non-Katalog') name,sc.name category,COUNT(DISTINCT sps.project_id) projects_used,SUM(sps.quantity) line_quantity,SUM(sps.line_total) project_scope_value FROM studio_project_services sps JOIN studio_projects p ON p.id=sps.project_id LEFT JOIN studio_services s ON s.id=sps.service_id LEFT JOIN studio_service_categories sc ON sc.id=s.category_id WHERE ${where} GROUP BY sps.service_id,s.name,sps.description,sc.name ORDER BY project_scope_value DESC`, params),
      this.serviceDocumentValues(ctx, filters, 'quotation'), this.serviceDocumentValues(ctx, filters, 'invoice'),
    ]);
    const map = new Map<string, any>();
    scope[0].forEach((row: Row) => { const key = `${row.service_id || 'custom'}:${row.name}`; map.set(key, { service_id: row.service_id === null ? null : number(row.service_id), name: row.name, category: row.category || 'Tidak Dikategorikan', projects_used: number(row.projects_used), line_quantity: number(row.line_quantity), project_scope_value: money(row.project_scope_value), quotation_value: 0, accepted_quotation_value: 0, invoiced_item_value: 0 }); });
    quotations.forEach((row: any) => { const key = `${row.service_id || 'custom'}:${row.name}`; const item = map.get(key) || { service_id: row.service_id, name: row.name, category: 'Tidak Dikategorikan', projects_used: 0, line_quantity: 0, project_scope_value: 0, quotation_value: 0, accepted_quotation_value: 0, invoiced_item_value: 0 }; item.quotation_value += row.value; item.accepted_quotation_value += row.accepted_value; map.set(key,item); });
    invoices.forEach((row: any) => { const key = `${row.service_id || 'custom'}:${row.name}`; const item = map.get(key) || { service_id: row.service_id, name: row.name, category: 'Tidak Dikategorikan', projects_used: 0, line_quantity: 0, project_scope_value: 0, quotation_value: 0, accepted_quotation_value: 0, invoiced_item_value: 0 }; item.invoiced_item_value += row.value; map.set(key,item); });
    const rows = [...map.values()].sort((a,b) => b.project_scope_value-a.project_scope_value); const totalScope = rows.reduce((sum,item)=>sum+item.project_scope_value,0);
    return { period: period(filters), kpis: [metric('Layanan Digunakan', rows.length, 'Layanan katalog maupun custom dalam project service line.'), metric('Project Scope Value', totalScope, 'Nilai snapshot project service line.'), metric('Nilai Invoice Item', rows.reduce((sum,item)=>sum+item.invoiced_item_value,0), 'Nilai item invoice aktif dalam periode.')], usage: rows.map(({name,projects_used,line_quantity}: any)=>({label:name,projects_used,line_quantity})), categories: this.groupByCategory(rows), commercial_value: { project_scope: totalScope, quotation: rows.reduce((sum,item)=>sum+item.quotation_value,0), accepted_quotation: rows.reduce((sum,item)=>sum+item.accepted_quotation_value,0), invoiced_item: rows.reduce((sum,item)=>sum+item.invoiced_item_value,0) }, trend: [], rows: rows.slice((filters.page-1)*filters.limit,filters.page*filters.limit), meta: { page: filters.page, limit: filters.limit, total: rows.length, totalPages: Math.max(1,Math.ceil(rows.length/filters.limit)) } };
  }

  private groupByCategory(rows: any[]) { const map = new Map<string, any>(); rows.forEach(row => { const item=map.get(row.category)||{label:row.category,projects_used:0,project_scope_value:0,invoiced_item_value:0}; item.projects_used+=row.projects_used; item.project_scope_value+=row.project_scope_value; item.invoiced_item_value+=row.invoiced_item_value; map.set(row.category,item); }); return [...map.values()]; }

  private async serviceDocumentValues(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters, kind: 'quotation' | 'invoice') {
    const [startDay,endDay] = dateOnly(filters); const table = kind === 'quotation' ? 'quotations' : 'invoices'; const itemTable = kind === 'quotation' ? 'quotation_items' : 'invoice_items'; const alias = kind === 'quotation' ? 'q' : 'i'; const accepted = kind === 'quotation' ? `SUM(CASE WHEN ${alias}.status_code='accepted' THEN line.line_total ELSE 0 END)` : '0'; const active = kind === 'quotation' ? `${alias}.order_id IS NULL` : ACTIVE_INVOICE_SQL;
    const params: any[] = [ctx.organizationId,ctx.id,startDay,endDay]; const currency=this.moneyFilter(alias,filters,params);
    const [rows]: any = await pool.execute(`SELECT line.service_id,COALESCE(s.name,line.description,'Custom / Non-Katalog') name,SUM(line.line_total) value,${accepted} accepted_value FROM ${itemTable} line JOIN ${table} ${alias} ON ${alias}.id=line.${kind}_id LEFT JOIN studio_services s ON s.id=line.service_id WHERE ${alias}.organization_id=? AND ${alias}.business_unit_id=? AND ${active} AND ${alias}.issue_date BETWEEN ? AND ?${currency} GROUP BY line.service_id,s.name,line.description`,params);
    return rows.map((row: Row)=>({service_id:row.service_id===null?null:number(row.service_id),name:String(row.name),value:money(row.value),accepted_value:money(row.accepted_value)}));
  }

  async commercial(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    await this.ready(ctx, filters); const [startAt,endAt]=dateBounds(filters); const [startDay,endDay]=dateOnly(filters);
    const quoteParams: any[]=[ctx.organizationId,ctx.id,startDay,endDay]; const quoteCurrency=this.moneyFilter('q',filters,quoteParams);
    const invoiceParams: any[]=[ctx.organizationId,ctx.id,startDay,endDay]; const invoiceCurrency=this.moneyFilter('i',filters,invoiceParams);
    const cashParams: any[]=[ctx.organizationId,ctx.id,startAt,endAt]; const cashCurrency=this.moneyFilter('ft',filters,cashParams);
    const [quotes,invoices,cash,schedules,pipeline,trends]: any = await Promise.all([
      pool.execute(`SELECT COUNT(*) created,SUM(q.status_code='sent') sent,SUM(q.status_code='accepted') accepted,SUM(q.status_code='rejected') rejected,SUM(q.status_code='sent' AND q.valid_until<DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+07:00'))) effectively_expired,SUM(CASE WHEN q.status_code='accepted' THEN q.total_amount ELSE 0 END) accepted_value FROM quotations q WHERE q.organization_id=? AND q.business_unit_id=? AND q.order_id IS NULL AND q.issue_date BETWEEN ? AND ?${quoteCurrency}`,quoteParams),
      pool.execute(`SELECT COUNT(*) invoices_issued,SUM(i.total_amount) invoiced_value,SUM(i.paid_amount) paid_value,SUM(i.balance_due) outstanding,SUM(CASE WHEN i.balance_due>0 AND i.due_date<DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+07:00')) THEN i.balance_due ELSE 0 END) overdue_balance FROM invoices i WHERE i.organization_id=? AND i.business_unit_id=? AND ${ACTIVE_INVOICE_SQL} AND i.issue_date BETWEEN ? AND ?${invoiceCurrency}`,invoiceParams),
      pool.execute(`SELECT SUM(ft.amount) value FROM financial_transactions ft WHERE ft.organization_id=? AND ft.business_unit_id=? AND ft.status_code='posted' AND ft.source_type='studio_customer_payment' AND ft.transaction_date BETWEEN ? AND ?${cashCurrency}`,cashParams),
      pool.execute(`SELECT SUM(s.amount-s.paid_amount) outstanding_scheduled,SUM(s.status_code NOT IN ('paid','cancelled') AND s.due_date<DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+07:00'))) overdue_installments,SUM(s.status_code NOT IN ('paid','cancelled') AND s.due_date BETWEEN DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+07:00')) AND DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+07:00')),INTERVAL 7 DAY)) upcoming_installments FROM invoice_payment_schedules s JOIN invoices i ON i.id=s.invoice_id WHERE i.organization_id=? AND i.business_unit_id=? AND ${ACTIVE_INVOICE_SQL}`,[ctx.organizationId,ctx.id]),
      pool.execute(`SELECT CASE WHEN q.status_code='sent' AND q.valid_until<DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+07:00')) THEN 'expired' ELSE q.status_code END label,COUNT(*) count,SUM(q.total_amount) value FROM quotations q WHERE q.organization_id=? AND q.business_unit_id=? AND q.order_id IS NULL${filters.currency ? ' AND q.currency_code=?' : ''} GROUP BY label`,filters.currency?[ctx.organizationId,ctx.id,filters.currency]:[ctx.organizationId,ctx.id]),
      this.overviewTrends(ctx,filters),
    ]);
    const q=quotes[0][0]||{},i=invoices[0][0]||{},c=cash[0][0]||{},s=schedules[0][0]||{}; const decided=number(q.sent)+number(q.accepted)+number(q.rejected)+number(q.effectively_expired);
    return { period:period(filters), quotation:{ created:number(q.created),sent:number(q.sent),accepted:number(q.accepted),rejected:number(q.rejected),effectively_expired:number(q.effectively_expired),accepted_value:money(q.accepted_value),conversion_rate:decided?number(q.accepted)/decided*100:null,definition:'Accepted / (sent + accepted + rejected + effectively expired). Draft excluded.' }, invoice:{ invoices_issued:number(i.invoices_issued),invoiced_value:money(i.invoiced_value),paid_value:money(i.paid_value),outstanding:money(i.outstanding),overdue_balance:money(i.overdue_balance),collection_rate:money(i.invoiced_value)?money(i.paid_value)/money(i.invoiced_value)*100:null,definition:'Collection Rate of Invoices Issued in Period: current paid_amount / total_amount.' }, collection:{ cash_collected:money(c.value),definition:'Posted Studio customer payment cash by transaction date.' },schedule:{ upcoming_installments:number(s.upcoming_installments),overdue_installments:number(s.overdue_installments),outstanding_scheduled:money(s.outstanding_scheduled) },funnel:pipeline[0].map((row:Row)=>({label:row.label,count:number(row.count),value:money(row.value)})),trends:{invoiced_value:trends.invoiced_value,cash_collected:trends.cash_collected} };
  }

  async revenue(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    await this.ready(ctx,filters);const [startAt,endAt]=dateBounds(filters);const params:any[]=[ctx.organizationId,ctx.id,startAt,endAt];const currency=this.moneyFilter('ft',filters,params);const label=this.trendLabel('ft.transaction_date',filters);
    const [summary,trend,categories,sources,treasury]:any=await Promise.all([
      pool.execute(`SELECT SUM(ft.transaction_type='income') income_count,SUM(ft.transaction_type='expense') expense_count,COALESCE(SUM(CASE WHEN ft.transaction_type='income' THEN ft.amount ELSE 0 END),0) cash_in,COALESCE(SUM(CASE WHEN ft.transaction_type='expense' THEN ft.amount ELSE 0 END),0) cash_out,COALESCE(SUM(CASE WHEN ft.transaction_type='adjustment' THEN ft.amount ELSE 0 END),0) adjustments FROM financial_transactions ft WHERE ft.organization_id=? AND ft.business_unit_id=? AND ft.status_code='posted' AND ft.transaction_date BETWEEN ? AND ?${currency}`,[...params]),
      pool.execute(`SELECT ${label} label,SUM(CASE WHEN ft.transaction_type='income' THEN ft.amount ELSE 0 END) cash_in,SUM(CASE WHEN ft.transaction_type='expense' THEN ft.amount ELSE 0 END) cash_out FROM financial_transactions ft WHERE ft.organization_id=? AND ft.business_unit_id=? AND ft.status_code='posted' AND ft.transaction_type IN ('income','expense') AND ft.transaction_date BETWEEN ? AND ?${currency} GROUP BY label ORDER BY label`,[...params]),
      pool.execute(`SELECT ft.transaction_type,COALESCE(tc.name,'Tanpa Kategori') label,SUM(ft.amount) value FROM financial_transactions ft LEFT JOIN transaction_categories tc ON tc.id=ft.category_id WHERE ft.organization_id=? AND ft.business_unit_id=? AND ft.status_code='posted' AND ft.transaction_type IN ('income','expense') AND ft.transaction_date BETWEEN ? AND ?${currency} GROUP BY ft.transaction_type,tc.name ORDER BY value DESC`,[...params]),
      pool.execute(`SELECT COALESCE(ft.source_type,'manual') label,SUM(ft.amount) value,ft.transaction_type FROM financial_transactions ft WHERE ft.organization_id=? AND ft.business_unit_id=? AND ft.status_code='posted' AND ft.transaction_type IN ('income','expense') AND ft.transaction_date BETWEEN ? AND ?${currency} GROUP BY ft.source_type,ft.transaction_type ORDER BY value DESC`,[...params]),
      pool.execute(`SELECT COALESCE(SUM(current_balance),0) current_cash FROM treasury_accounts WHERE organization_id=? AND business_unit_id=? AND is_active=1${filters.currency?' AND currency_code=?':''}`,filters.currency?[ctx.organizationId,ctx.id,filters.currency]:[ctx.organizationId,ctx.id]),
    ]);const s=summary[0][0]||{};const days=Math.max(1,Math.floor((Date.parse(filters.endDate)-Date.parse(filters.startDate))/86400000)+1);return{period:period(filters),cash_kpis:[metric('Cash In',money(s.cash_in),'Posted financial_transactions income; transfers and opening balances excluded.'),metric('Cash Out',money(s.cash_out),'Posted financial_transactions expense; transfers excluded.'),metric('Net Cash Flow',money(s.cash_in)-money(s.cash_out),'Cash In dikurangi Cash Out.'),metric('Current Studio Cash',money(treasury[0][0]?.current_cash),'Snapshot total saldo treasury aktif.',undefined,true),metric('Average Daily Cash In',money(s.cash_in)/days,'Cash In dibagi jumlah hari periode.'),metric('Average Daily Cash Out',money(s.cash_out)/days,'Cash Out dibagi jumlah hari periode.')],trend:trend[0].map((row:Row)=>({label:row.label,cash_in:money(row.cash_in),cash_out:money(row.cash_out),net_cash_flow:money(row.cash_in)-money(row.cash_out)})),category_breakdown:categories[0].map((row:Row)=>({...row,value:money(row.value)})),source_breakdown:sources[0].map((row:Row)=>({...row,value:money(row.value)})),treasury_snapshot:{current_cash:money(treasury[0][0]?.current_cash),adjustments:money(s.adjustments)}};
  }

  async profitability(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    await this.ready(ctx,filters);const rows=await this.projectFinancialRows(ctx,filters);const prepared=rows.map((row:any)=>({ ...row, cash_margin:row.collected-row.actual_cost,recorded_contract_margin:row.commercial_basis-row.actual_cost,margin_percent:row.commercial_basis?((row.commercial_basis-row.actual_cost)/row.commercial_basis)*100:null,negative_margin:row.actual_cost>row.commercial_basis }));const summary={commercial_basis:prepared.reduce((sum,item)=>sum+item.commercial_basis,0),invoiced:prepared.reduce((sum,item)=>sum+item.invoiced,0),collected:prepared.reduce((sum,item)=>sum+item.collected,0),actual_cost:prepared.reduce((sum,item)=>sum+item.actual_cost,0),agreed_external_fee:prepared.reduce((sum,item)=>sum+item.agreed_external_fee,0)};const total=prepared.length;return{period:period(filters),summary:{...summary,contract_margin:summary.commercial_basis-summary.actual_cost,cash_margin:summary.collected-summary.actual_cost,margin_percent:summary.commercial_basis?(summary.commercial_basis-summary.actual_cost)/summary.commercial_basis*100:null,definition:'Commercial basis is accepted quotation total when available; otherwise project contract_value. Actual cost is paid, non-void project expense.'},distribution:prepared.map(item=>({label:item.project_name,value:item.recorded_contract_margin})),negative_margin:prepared.filter(item=>item.negative_margin),top_projects:{highest_recorded_margin:[...prepared].sort((a,b)=>b.recorded_contract_margin-a.recorded_contract_margin).slice(0,10),lowest_recorded_margin:[...prepared].sort((a,b)=>a.recorded_contract_margin-b.recorded_contract_margin).slice(0,10),highest_margin_percent:[...prepared].filter(item=>item.margin_percent!==null).sort((a,b)=>(b.margin_percent||0)-(a.margin_percent||0)).slice(0,10),highest_actual_cost:[...prepared].sort((a,b)=>b.actual_cost-a.actual_cost).slice(0,10)},rows:prepared.slice((filters.page-1)*filters.limit,filters.page*filters.limit),meta:{page:filters.page,limit:filters.limit,total,totalPages:Math.max(1,Math.ceil(total/filters.limit))}};
  }

  async receivables(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    await this.ready(ctx,filters);const params:any[]=[ctx.organizationId,ctx.id];const currency=this.moneyFilter('i',filters,params);if(filters.clientId){params.push(filters.clientId);}const [rows]:any=await pool.execute(`SELECT i.id,i.invoice_number,i.issue_date,i.due_date,i.total_amount,i.paid_amount,i.balance_due,i.currency_code,i.status_code,p.id client_id,p.display_name client_name,sp.id project_id,sp.project_name FROM invoices i JOIN parties p ON p.id=i.party_id LEFT JOIN studio_projects sp ON i.source_type='studio_project' AND sp.id=i.source_id WHERE i.organization_id=? AND i.business_unit_id=? AND ${ACTIVE_INVOICE_SQL} AND i.balance_due>0${currency}${filters.clientId?' AND i.party_id=?':''} ORDER BY i.due_date IS NULL,i.due_date,i.id DESC LIMIT 50000`,params);const today=new Date();const data=rows.map((row:Row)=>({...row,id:number(row.id),client_id:number(row.client_id),project_id:row.project_id===null?null:number(row.project_id),total_amount:money(row.total_amount),paid_amount:money(row.paid_amount),balance_due:money(row.balance_due),days_overdue:row.due_date?Math.max(0,Math.floor((today.getTime()-new Date(String(row.due_date)).getTime())/86400000)):0}));const buckets=[{label:'Belum Jatuh Tempo',test:(row:any)=>!row.due_date||row.days_overdue===0},{label:'1–7 Hari Terlambat',test:(row:any)=>row.days_overdue>=1&&row.days_overdue<=7},{label:'8–30 Hari',test:(row:any)=>row.days_overdue>=8&&row.days_overdue<=30},{label:'31–60 Hari',test:(row:any)=>row.days_overdue>=31&&row.days_overdue<=60},{label:'>60 Hari',test:(row:any)=>row.days_overdue>60}].map(bucket=>{const values=data.filter(bucket.test);return{label:bucket.label,invoice_count:values.length,outstanding:values.reduce((sum:number,row:any)=>sum+row.balance_due,0)}});const byClient=this.groupMoney(data,'client_id','client_name');const byProject=this.groupMoney(data.filter((row:any)=>row.project_id),'project_id','project_name');const paidParams:any[]=[ctx.organizationId,ctx.id];const paidCurrency=this.moneyFilter('i',filters,paidParams);const [paidRows]:any=await pool.execute(`SELECT DATEDIFF(i.paid_at,i.issue_date) days FROM invoices i WHERE i.organization_id=? AND i.business_unit_id=? AND ${ACTIVE_INVOICE_SQL} AND i.paid_at IS NOT NULL${paidCurrency}`,paidParams);const speeds=paidRows.map((row:Row)=>number(row.days)).filter((value:number)=>value>=0);const outstanding=data.reduce((sum:number,row:any)=>sum+row.balance_due,0),overdue=data.filter((row:any)=>row.days_overdue>0),notDue=data.filter((row:any)=>!row.due_date||row.days_overdue===0);return{period:period(filters),kpis:[metric('Total Outstanding',outstanding,'Snapshot saldo invoice aktif.'),metric('Overdue Balance',overdue.reduce((sum:number,row:any)=>sum+row.balance_due,0),'Outstanding dengan due_date sebelum hari Studio saat ini.'),metric('Not Yet Due',notDue.reduce((sum:number,row:any)=>sum+row.balance_due,0),'Outstanding tanpa keterlambatan.'),metric('Due in 7 Days',data.filter((row:any)=>row.due_date&&new Date(row.due_date).getTime()-today.getTime()<=7*86400000&&row.days_overdue===0).reduce((sum:number,row:any)=>sum+row.balance_due,0),'Outstanding yang jatuh tempo tujuh hari ke depan.'),metric('Average Outstanding per Invoice',data.length?outstanding/data.length:null,'Total outstanding dibagi invoice outstanding.'),metric('Overdue Invoice Count',overdue.length,'Jumlah invoice outstanding yang terlambat.')],aging:buckets,client_breakdown:byClient,project_breakdown:byProject,collection_speed:{samples:speeds.length,average:speeds.length?speeds.reduce((sum:number,value:number)=>sum+value,0)/speeds.length:null,median:percentile(speeds,.5),p90:percentile(speeds,.9),definition:'Hari dari issue_date ke paid_at untuk invoice paid.'},rows:data.slice((filters.page-1)*filters.limit,filters.page*filters.limit),meta:{page:filters.page,limit:filters.limit,total:data.length,totalPages:Math.max(1,Math.ceil(data.length/filters.limit))}};
  }

  private groupMoney(data:any[], idKey:string, labelKey:string) { const map=new Map<number,any>();data.forEach(row=>{const id=row[idKey];const item=map.get(id)||{id,label:row[labelKey],invoice_count:0,outstanding:0,oldest_due_date:row.due_date||null};item.invoice_count++;item.outstanding+=row.balance_due;if(row.due_date&&(!item.oldest_due_date||String(row.due_date)<String(item.oldest_due_date)))item.oldest_due_date=row.due_date;map.set(id,item);});return[...map.values()].sort((a,b)=>b.outstanding-a.outstanding); }

  async vendors(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    await this.ready(ctx,filters);const [startDay,endDay]=dateOnly(filters);const payoutParams:any[]=[ctx.organizationId,ctx.id];const payoutCurrency=this.moneyFilter('ft',filters,payoutParams);const [rows]:any=await pool.execute(`SELECT pea.id,pea.assignment_role,pea.start_date,pea.end_date,pea.agreed_fee,pea.payment_status_code,p.id party_id,p.display_name party_name,sp.id project_id,sp.project_name,sp.status_code project_status,COALESCE(payout.paid_amount,0) actual_payout FROM project_external_assignments pea JOIN studio_projects sp ON sp.id=pea.project_id AND sp.business_unit_id=? AND sp.deleted_at IS NULL JOIN parties p ON p.id=pea.party_id LEFT JOIN (SELECT ft.source_code,SUM(ft.amount) paid_amount FROM financial_transactions ft WHERE ft.organization_id=? AND ft.business_unit_id=? AND ft.source_type='studio_external_payout' AND ft.status_code='posted'${payoutCurrency} GROUP BY ft.source_code) payout ON payout.source_code=CONCAT('ASSIGN-',pea.id)`,[ctx.id,...payoutParams]);const data=rows.map((row:Row)=>({...row,id:number(row.id),party_id:number(row.party_id),project_id:number(row.project_id),agreed_fee:money(row.agreed_fee),actual_payout:money(row.actual_payout),remaining_commitment:Math.max(0,money(row.agreed_fee)-money(row.actual_payout)),active:!row.end_date&&ACTIVE_PROJECT_STATUSES.includes(String(row.project_status))}));const collaborators=new Set(data.map((row:any)=>row.party_id));const started=data.filter((row:any)=>row.start_date&&String(row.start_date).slice(0,10)>=startDay&&String(row.start_date).slice(0,10)<=endDay);const roles=this.groupCounts(data,'assignment_role');const top=this.groupCollaborators(data);return{period:period(filters),kpis:[metric('Unique External Collaborators',collaborators.size,'Distinct party_id pada penugasan Studio.'),metric('Active Assignments',data.filter((row:any)=>row.active).length,'Snapshot: penugasan tanpa end_date pada proyek aktif.'),metric('Assignments Started',started.length,'Penugasan dengan start_date pada periode.'),metric('Total Agreed Fees',data.reduce((sum:number,row:any)=>sum+row.agreed_fee,0),'Komitmen agreed_fee, bukan kas.'),metric('Actual Payouts',data.reduce((sum:number,row:any)=>sum+row.actual_payout,0),'Posted Studio external payout dari financial_transactions.'),metric('Remaining Commitment',data.reduce((sum:number,row:any)=>sum+row.remaining_commitment,0),'MAX(agreed_fee - actual payout, 0).')],role_distribution:roles,top_collaborators:top,fee_trend:[],rows:data.slice((filters.page-1)*filters.limit,filters.page*filters.limit),meta:{page:filters.page,limit:filters.limit,total:data.length,totalPages:Math.max(1,Math.ceil(data.length/filters.limit))}};
  }

  private groupCounts(data:any[], key:string){const map=new Map<string,number>();data.forEach(row=>map.set(String(row[key]||'other'),(map.get(String(row[key]||'other'))||0)+1));return[...map.entries()].map(([label,value])=>({label,value}));}
  private groupCollaborators(data:any[]){const map=new Map<number,any>();data.forEach(row=>{const item=map.get(row.party_id)||{id:row.party_id,name:row.party_name,project_count:0,assignment_count:0,agreed_fee:0,actual_payout:0};item.project_count+=item._projects?.has(row.project_id)?0:1;item._projects=item._projects||new Set();item._projects.add(row.project_id);item.assignment_count++;item.agreed_fee+=row.agreed_fee;item.actual_payout+=row.actual_payout;map.set(row.party_id,item);});return[...map.values()].map(({_projects,...row})=>row).sort((a,b)=>b.agreed_fee-a.agreed_fee).slice(0,10);}

  async equipment(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
    await this.ready(ctx,filters);const [startAt,endAt]=dateBounds(filters);const [assets,assignments,maintenance]:any=await Promise.all([
      pool.execute(`SELECT id,asset_code,name,category,status_code,purchase_cost,current_book_value FROM assets WHERE business_unit_id=? AND deleted_at IS NULL ORDER BY name`,[ctx.id]),
      pool.execute(`SELECT apa.asset_id,apa.project_id,apa.assigned_from,COALESCE(apa.returned_at,apa.assigned_until,?) assigned_to FROM asset_project_assignments apa JOIN assets a ON a.id=apa.asset_id WHERE a.business_unit_id=? AND a.deleted_at IS NULL AND apa.assigned_from<=? AND COALESCE(apa.returned_at,apa.assigned_until,?)>=? ORDER BY apa.asset_id,apa.assigned_from`,[endAt,ctx.id,endAt,endAt,startAt]),
      pool.execute(`SELECT mr.id,mr.asset_id,mr.performed_at,mr.cost,mr.next_due_at,a.name asset_name FROM asset_maintenance_records mr JOIN assets a ON a.id=mr.asset_id WHERE a.business_unit_id=? AND a.deleted_at IS NULL AND mr.performed_at BETWEEN ? AND ?`,[ctx.id,startAt,endAt]),
    ]);const duration=Math.max(1,new Date(endAt).getTime()-new Date(startAt).getTime());const byAsset=new Map<number,Array<{start:number;end:number;projectId:number}>>();assignments[0].forEach((row:Row)=>{const assetId=number(row.asset_id),start=Math.max(new Date(startAt).getTime(),new Date(String(row.assigned_from)).getTime()),end=Math.min(new Date(endAt).getTime(),new Date(String(row.assigned_to)).getTime());if(end>start){const values=byAsset.get(assetId)||[];values.push({start,end,projectId:number(row.project_id)});byAsset.set(assetId,values);}});const rows=assets[0].map((row:Row)=>{const intervals=(byAsset.get(number(row.id))||[]).sort((a,b)=>a.start-b.start);let assigned=0,last=-Infinity;intervals.forEach(item=>{const begin=Math.max(item.start,last);if(item.end>begin){assigned+=item.end-begin;last=Math.max(last,item.end);}});const utilization=Math.min(100,assigned/duration*100);return{...row,id:number(row.id),purchase_cost:nullableNumber(row.purchase_cost),current_book_value:nullableNumber(row.current_book_value),assignment_count:intervals.length,distinct_projects:new Set(intervals.map(item=>item.projectId)).size,assigned_duration_hours:assigned/3600000,utilization_percent:utilization};});const nextDue=maintenance[0].filter((row:Row)=>row.next_due_at&&new Date(String(row.next_due_at))<=new Date(Date.now()+7*86400000));return{period:period(filters),kpis:[metric('Total Assets',rows.length,'Snapshot aset Studio yang belum dihapus.'),metric('Available',rows.filter((row:any)=>row.status_code==='available').length,'Snapshot asset status available.'),metric('In Use',rows.filter((row:any)=>row.status_code==='in_use').length,'Snapshot asset status in_use.'),metric('Maintenance',rows.filter((row:any)=>row.status_code==='maintenance').length,'Snapshot asset status maintenance.'),metric('Retired/Lost',rows.filter((row:any)=>['retired','lost'].includes(row.status_code)).length,'Snapshot retired atau lost.'),metric('Book Value',rows.reduce((sum:number,row:any)=>sum+(row.current_book_value||0),0),'Recorded current_book_value aset; bukan arus kas.',undefined,true),metric('Purchase Cost',rows.reduce((sum:number,row:any)=>sum+(row.purchase_cost||0),0),'Recorded purchase_cost aset; bukan arus kas.',undefined,true)],status_distribution:this.groupCounts(rows,'status_code'),category_distribution:this.groupCounts(rows,'category'),utilization:{most_used:[...rows].sort((a:any,b:any)=>b.utilization_percent-a.utilization_percent).slice(0,10),least_used:[...rows].sort((a:any,b:any)=>a.utilization_percent-b.utilization_percent).slice(0,10),most_project_assignments:[...rows].sort((a:any,b:any)=>b.assignment_count-a.assignment_count).slice(0,10),definition:'Utilization adalah union interval penugasan yang overlap dengan periode / durasi periode; interval overlap digabung.'},maintenance:{maintenance_count:maintenance[0].length,recorded_maintenance_cost:maintenance[0].reduce((sum:number,row:Row)=>sum+money(row.cost),0),upcoming_maintenance:nextDue.length,top_assets_by_maintenance_cost:this.groupMaintenance(maintenance[0])},rows:rows.slice((filters.page-1)*filters.limit,filters.page*filters.limit),meta:{page:filters.page,limit:filters.limit,total:rows.length,totalPages:Math.max(1,Math.ceil(rows.length/filters.limit))}};
  }

  private groupMaintenance(rows:Row[]){const map=new Map<number,any>();rows.forEach(row=>{const id=number(row.asset_id),item=map.get(id)||{id,name:row.asset_name,maintenance_count:0,cost:0};item.maintenance_count++;item.cost+=money(row.cost);map.set(id,item);});return[...map.values()].sort((a,b)=>b.cost-a.cost).slice(0,10);}
}
