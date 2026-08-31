import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { pool } from '../../config/database';
import { CraftAnalyticsService } from '../craft-analytics/craft-analytics.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { unifiedFinanceService } from '../finance/finance.service';
import { StudioAnalyticsService } from '../studio-analytics/studio-analytics.service';
import { normalizeFilters as normalizeStudioFilters } from '../studio-analytics/studio-analytics.shared';
import { AuditService } from '../../shared/audit/audit.service';
import { documentRegistryService } from '../../shared/documents/document-registry.service';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { storageService } from '../../shared/storage';
import { reportAccessService } from './reports-access.service';
import { registeredReport } from './reports.registry';
import type { ExportFormat, ReportAccess, ReportActor, ReportFilters, ReportKpi, ReportPreview, ReportTable } from './reports.types';

const EXPORT_CAP = 20_000;
const craftAnalytics = new CraftAnalyticsService();
const studioAnalytics = new StudioAnalyticsService();
const dashboard = new DashboardService();
const number = (value: unknown) => Number(value ?? 0);
const safeText = (value: unknown) => { const text = String(value ?? ''); return /^[=+\-@]/.test(text) ? `'${text}` : text; };
const safeFile = (value: string) => value.normalize('NFKD').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'report';
const dateNow = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const addDays = (date: string, amount: number) => { const value = new Date(`${date}T00:00:00.000Z`); value.setUTCDate(value.getUTCDate() + amount); return value.toISOString().slice(0, 10); };
const monthStart = (date: string) => `${date.slice(0, 7)}-01`;
const quarterStart = (date: string) => { const month = Number(date.slice(5, 7)); return `${date.slice(0, 4)}-${String(Math.floor((month - 1) / 3) * 3 + 1).padStart(2, '0')}-01`; };
const periodFor = (filters: ReportFilters) => {
  const today = dateNow();
  if (filters.period === 'custom') return { start_date: filters.start_date!, end_date: filters.end_date! };
  if (filters.period === 'today') return { start_date: today, end_date: today };
  if (filters.period === 'week') { const day = new Date(`${today}T00:00:00.000Z`).getUTCDay(); return { start_date: addDays(today, -(day === 0 ? 6 : day - 1)), end_date: today }; }
  if (filters.period === 'month') return { start_date: monthStart(today), end_date: today };
  if (filters.period === 'quarter') return { start_date: quarterStart(today), end_date: today };
  if (filters.period === 'year') return { start_date: `${today.slice(0, 4)}-01-01`, end_date: today };
  return { start_date: addDays(today, -29), end_date: today };
};
const primitive = (value: unknown): string | number | boolean | null => value == null ? null : typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean' ? value : safeText(JSON.stringify(value));
const rowsOf = (raw: any) => {
  const candidates = [raw.rows, raw.items, raw.breakdown, raw.series, raw.channels, raw.statuses, raw.printers, raw.categories, raw.top_products, raw.rankings?.highest_commercial_value, raw.trend];
  const rows = candidates.find(Array.isArray) || [];
  return rows.map((row: any) => Object.fromEntries(Object.entries(row || {}).filter(([, value]) => value == null || ['string', 'number', 'boolean'].includes(typeof value)).map(([key, value]) => [key, primitive(value)])));
};
const label = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, item => item.toUpperCase());
const tableFor = (raw: any, filters: ReportFilters): ReportTable => {
  const rows = rowsOf(raw);
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))].map(key => ({ key, label: label(key), format: /rate|margin|percent/.test(key) ? 'percent' as const : /amount|value|income|expense|cash|cost|profit|balance|revenue|paid|outstanding|total|result/.test(key) ? 'currency' as const : 'number' as const }));
  const meta = raw.detail_meta || raw.meta || raw.pagination;
  return { columns, rows, ...(meta ? { pagination: { page: Number(meta.page || filters.page), limit: Number(meta.limit || filters.limit), total: Number(meta.total || rows.length), total_pages: Number(meta.totalPages || meta.total_pages || 1) } } : {}) };
};
const kpisFor = (raw: any): ReportKpi[] => {
  if (Array.isArray(raw.kpis)) return raw.kpis.map((item: any) => ({ label: String(item.label || 'Metrik'), value: item.value == null ? null : primitive(item.value) as string | number, definition: item.definition, currency: item.currency_code || null, format: /rate|margin|percent/i.test(String(item.label)) ? 'percent' : undefined }));
  const source = raw.metrics || raw.summary || raw.kpis || raw;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return [];
  return Object.entries(source).filter(([, value]) => value == null || ['number', 'string', 'boolean'].includes(typeof value)).slice(0, 12).map(([key, value]) => ({ label: label(key), value: primitive(value) as string | number | null, format: /rate|margin|percent/i.test(key) ? 'percent' : /amount|value|income|expense|cash|cost|profit|balance|revenue|paid|outstanding|total|result/i.test(key) ? 'currency' : 'number' }));
};
const chartFor = (raw: any) => {
  const rows = [raw.trend, raw.trends?.invoiced_value, raw.series, raw.revenue_breakdown?.buckets].find(Array.isArray);
  if (!rows?.length) return null;
  const clean = rows.slice(0, 180).map((row: any) => Object.fromEntries(Object.entries(row || {}).filter(([, value]) => value == null || ['string', 'number'].includes(typeof value)).map(([key, value]) => [key, primitive(value) as string | number | null])));
  return { title: 'Tren periode', rows: clean };
};

export class ReportsService {
  private normalize(filters: ReportFilters, access: ReportAccess) {
    const period = periodFor(filters); const days = Math.floor((Date.parse(`${period.end_date}T00:00:00Z`) - Date.parse(`${period.start_date}T00:00:00Z`)) / 86400000) + 1;
    if (days < 1) throw new AppError(400, 'REPORT_INVALID_PERIOD', 'Tanggal mulai harus sebelum tanggal akhir.');
    if (days > access.registry.maxRangeDays) throw new AppError(400, 'REPORT_RANGE_TOO_LARGE', 'Rentang periode laporan terlalu panjang.');
    return { ...filters, ...period };
  }

  private async source(access: ReportAccess, filters: ReportFilters): Promise<any> {
    const entry = access.registry;
    if (entry.group === 'craft') {
      const craft = access.units.find(unit => unit.code === 'CRAFT')!;
      const context = { id: craft.id, organizationId: access.actor.organization_id, code: 'CRAFT' };
      const input = { start_date: filters.start_date, end_date: filters.end_date };
      if (entry.reportKey === 'overview') return craftAnalytics.overview(context, input);
      if (entry.reportKey === 'sales') return craftAnalytics.sales(context, input);
      if (entry.reportKey === 'orders') return craftAnalytics.orders(context, input);
      if (entry.reportKey === 'production') return craftAnalytics.production(context, input);
      if (entry.reportKey === 'profitability') return craftAnalytics.profitability(context, input);
      return craftAnalytics.list(context, entry.reportKey, input);
    }
    if (entry.group === 'studio') {
      const studio = access.units.find(unit => unit.code === 'STUDIO')!;
      const context = { id: studio.id, organizationId: access.actor.organization_id, code: 'STUDIO' as const, userId: access.actor.id };
      const input = normalizeStudioFilters({ startDate: filters.start_date, endDate: filters.end_date, compare: filters.compare, currency: filters.currency, clientId: filters.client_id, serviceId: filters.service_id, projectType: filters.project_type, page: filters.page, limit: filters.limit });
      return (studioAnalytics[entry.reportKey as keyof StudioAnalyticsService] as any)(context, input);
    }
    if (entry.group === 'unified_finance') {
      const financePeriod = filters.period === 'custom' || filters.start_date !== undefined ? 'custom' : filters.period === 'last_30_days' || filters.period === 'quarter' ? 'custom' : filters.period;
      const input = { period: financePeriod, from: filters.start_date, to: filters.end_date, workspace: filters.workspace, currency: filters.currency, page: filters.page, limit: filters.limit } as any;
      return (unifiedFinanceService[entry.reportKey as keyof typeof unifiedFinanceService] as any)(access.actor, input);
    }
    const range = filters.period === 'last_30_days' || filters.period === 'quarter' ? 'custom' : filters.period;
    return dashboard.overview({ range: range as any, start_date: filters.start_date, end_date: filters.end_date, currency: filters.currency }, access.actor);
  }

  async preview(access: ReportAccess, requested: ReportFilters): Promise<ReportPreview> {
    const filters = this.normalize(requested, access); const raw = await this.source(access, filters); const period = raw.period || { start_date: filters.start_date!, end_date: filters.end_date!, timezone: 'Asia/Jakarta', currency: filters.currency || null };
    const notes: string[] = Array.isArray(raw.notes) ? raw.notes.map(String) : [];
    if (!tableFor(raw, filters).rows.length) notes.push('Belum ada data pada periode ini.');
    return { report: { code: access.registry.reportCode, name: access.definition.name || access.registry.displayName, description: access.registry.description, group: access.registry.group, source_module: access.registry.sourceModule, source_path: access.registry.sourcePath }, generated_at: new Date().toISOString(), period: { start_date: String(period.start_date || filters.start_date), end_date: String(period.end_date || filters.end_date), timezone: 'Asia/Jakarta', currency: period.currency || filters.currency || null }, filters: { period: filters.period, currency: filters.currency || null, workspace: filters.workspace, compare: filters.compare }, kpis: kpisFor(raw), chart: chartFor(raw), table: tableFor(raw, filters), notes };
  }

  catalog(actor: ReportActor) { return reportAccessService.catalog(actor); }

  async overview(actor: ReportActor) {
    const entries = await this.catalog(actor); const [recentRows]: any = await pool.execute(`SELECT re.id,re.report_name,re.export_format,re.generated_at,re.status_code FROM report_exports re WHERE re.organization_id=? ORDER BY re.generated_at DESC,re.id DESC LIMIT 12`, [actor.organization_id]);
    const groups = Object.fromEntries(['global', 'unified_finance', 'craft', 'studio'].map(group => [group, entries.filter(item => item.registry.group === group).length]));
    return { available_report_count: entries.length, available_groups: Object.entries(groups).filter(([, count]) => count > 0).map(([group]) => group), report_counts: groups, recent_exports: recentRows.map((row: any) => ({ id: Number(row.id), report_name: row.report_name, export_format: row.export_format, generated_at: row.generated_at, status_code: row.status_code })), quick_reports: entries.slice(0, 6).map(item => ({ report_code: item.registry.reportCode, name: item.definition.name, group: item.registry.group })) };
  }

  async meta(actor: ReportActor) { const entries = await this.catalog(actor); return { period_presets: ['today', 'week', 'month', 'last_30_days', 'quarter', 'year', 'custom'], supported_formats: ['csv', 'xlsx', 'pdf'], groups: [...new Set(entries.map(item => item.registry.group))], workspaces: [...new Set(entries.flatMap(item => item.registry.businessUnitCode ? [item.registry.businessUnitCode.toLowerCase()] : ['all']))] }; }

  private csv(preview: ReportPreview) {
    const header = preview.table.columns.map(column => `"${safeText(column.label).replaceAll('"', '""')}"`).join(',');
    const rows = preview.table.rows.map(row => preview.table.columns.map(column => `"${safeText(row[column.key]).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    return Buffer.from(`\uFEFFUNI-NEXUS — ${safeText(preview.report.name)}\r\nPeriode,${preview.period.start_date} — ${preview.period.end_date}\r\n${header}${rows ? `\r\n${rows}` : ''}`, 'utf8');
  }

  private async xlsx(preview: ReportPreview) {
    const workbook = new ExcelJS.Workbook(); workbook.creator = 'UNI-NEXUS'; workbook.created = new Date();
    const summary = workbook.addWorksheet('Ringkasan'); summary.columns = [{ width: 32 }, { width: 50 }];
    summary.addRows([['Laporan', preview.report.name], ['Kategori', preview.report.group], ['Periode', `${preview.period.start_date} — ${preview.period.end_date}`], ['Dibuat', new Date(preview.generated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })], ['Mata Uang', preview.period.currency || '—'], ...preview.kpis.map(item => [item.label, typeof item.value === 'string' ? safeText(item.value) : item.value])]);
    summary.getRow(1).font = { bold: true }; summary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4CF' } };
    const data = workbook.addWorksheet('Data'); data.columns = preview.table.columns.map(column => ({ header: column.label, key: column.key, width: Math.min(35, Math.max(14, column.label.length + 3)) }));
    preview.table.rows.forEach(row => data.addRow(Object.fromEntries(preview.table.columns.map(column => [column.key, typeof row[column.key] === 'string' ? safeText(row[column.key]) : row[column.key]]))));
    data.views = [{ state: 'frozen', ySplit: 1 }]; data.autoFilter = preview.table.columns.length ? { from: 'A1', to: `${String.fromCharCode(64 + Math.min(preview.table.columns.length, 26))}1` } : undefined; data.getRow(1).font = { bold: true }; data.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4CF' } };
    preview.table.columns.forEach((column, index) => { if (column.format === 'currency') data.getColumn(index + 1).numFmt = '#,##0.00'; if (column.format === 'percent') data.getColumn(index + 1).numFmt = '0.00%'; });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private pdf(preview: ReportPreview) { return new Promise<Buffer>((resolve, reject) => { const document = new PDFDocument({ margin: 42, size: 'A4' }); const chunks: Buffer[] = []; document.on('data', chunk => chunks.push(Buffer.from(chunk))); document.on('error', reject); document.on('end', () => resolve(Buffer.concat(chunks))); document.fontSize(19).fillColor('#242424').text('UNI-NEXUS'); document.fontSize(15).text(preview.report.name); document.fontSize(9).fillColor('#555555').text(`${preview.report.group} • ${preview.period.start_date} — ${preview.period.end_date} • ${new Date(preview.generated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`); document.moveDown(); document.fillColor('#242424').fontSize(12).text('Ringkasan'); preview.kpis.slice(0, 10).forEach(item => document.fontSize(9).text(`${item.label}: ${item.value ?? '—'}`)); document.moveDown(); document.fontSize(12).text('Data utama'); if (!preview.table.rows.length) document.fontSize(9).text('Belum ada data pada periode ini.'); preview.table.rows.slice(0, 80).forEach((row, index) => { const text = preview.table.columns.slice(0, 5).map(column => `${column.label}: ${safeText(row[column.key])}`).join('  |  '); if (document.y > 740) { document.addPage(); document.fontSize(10).text(`${preview.report.name} (lanjutan)`); } document.fontSize(8).text(`${index + 1}. ${text}`, { width: 510 }); }); if (preview.table.rows.length > 80) document.moveDown().fontSize(8).fillColor('#555555').text(`PDF menampilkan 80 dari ${preview.table.rows.length} baris. Gunakan XLSX atau CSV untuk data tabular lengkap.`); document.end(); }); }

  private async binary(format: ExportFormat, preview: ReportPreview) { if (preview.table.rows.length > EXPORT_CAP) throw new AppError(413, 'REPORT_EXPORT_LIMIT_EXCEEDED', 'Terlalu banyak data untuk diekspor. Persempit filter laporan.'); if (format === 'csv') return { body: this.csv(preview), mimeType: 'text/csv; charset=utf-8' }; if (format === 'xlsx') return { body: await this.xlsx(preview), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }; return { body: await this.pdf(preview), mimeType: 'application/pdf' }; }

  async export(access: ReportAccess, filters: ReportFilters, format: ExportFormat) {
    if (!access.registry.supportedFormats.includes(format)) throw new AppError(400, 'REPORT_INVALID_FORMAT', 'Format laporan tidak didukung.');
    const preview = await this.preview(access, filters); const generated = await this.binary(format, preview); const filename = `UNI-NEXUS_${safeFile(preview.report.name)}_${preview.period.start_date}_${preview.period.end_date}.${format}`; const saved = await storageService.writeBuffer('report_export', generated.body, filename); const connection = await pool.getConnection();
    try { await connection.beginTransaction(); const [result]: any = await connection.execute(`INSERT INTO report_exports (report_definition_id,organization_id,business_unit_id,report_name,export_format,filter_json,storage_path,status_code,generated_by,generated_at) VALUES (?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(3))`, [access.definition.id, access.actor.organization_id, access.registry.businessUnitCode ? access.units.find(unit => unit.code === access.registry.businessUnitCode)?.id || null : null, preview.report.name, format, JSON.stringify(preview.filters), saved.key, 'generated', access.actor.id]); const id = Number(result.insertId); await documentRegistryService.registerSourceDocument({ organizationId: access.actor.organization_id, businessUnitId: access.registry.businessUnitCode ? access.units.find(unit => unit.code === access.registry.businessUnitCode)?.id || null : null, sourceModuleCode: access.registry.sourceModule, documentType: 'report', title: preview.report.name, description: `Ekspor ${format.toUpperCase()} Pusat Laporan.`, fileName: filename, storagePath: saved.key, mimeType: saved.mime_type, fileSizeBytes: saved.size_bytes, checksumSha256: saved.checksum_sha256, entityType: 'report_export', entityId: id, entityCode: `${access.registry.reportCode}:${format}`, uploadedBy: access.actor.id }, connection); await AuditService.write({ organizationId: access.actor.organization_id, businessUnitId: access.registry.businessUnitCode ? access.units.find(unit => unit.code === access.registry.businessUnitCode)?.id || null : null, userId: access.actor.id, moduleCode: 'reports', actionCode: 'reports.export', entityType: 'report_export', entityId: id, entityCode: `${access.registry.reportCode}:${format}`, description: 'Mengekspor laporan melalui Pusat Laporan.', newValues: { report_code: access.registry.reportCode, format, period: preview.period } }, connection); await connection.commit(); return { id, file_name: filename, format, generated_at: preview.generated_at, download_path: `/reports/exports/${id}/download` }; } catch (error) { await connection.rollback(); await storageService.delete(saved.key).catch(() => undefined); throw new AppError(500, 'REPORT_EXPORT_FAILED', 'Laporan gagal disimpan secara aman.'); } finally { connection.release(); }
  }

  private async historyRow(actor: ReportActor, id: number) { const [rows]: any = await pool.execute(`SELECT re.*,rd.report_code,rd.name definition_name,d.source_module_code FROM report_exports re LEFT JOIN report_definitions rd ON rd.id=re.report_definition_id AND rd.organization_id=re.organization_id LEFT JOIN documents d ON d.organization_id=re.organization_id AND d.entity_type='report_export' AND d.entity_id=re.id WHERE re.id=? AND re.organization_id=? LIMIT 1`, [id, actor.organization_id]); return rows[0] || null; }
  private async permittedHistory(actor: ReportActor, row: any) { if (!row) return false; if (row.report_code && registeredReport(row.report_code)) { try { await reportAccessService.resolve(actor, row.report_code); return true; } catch { return false; } } const source = String(row.source_module_code || ''); const permission = source === 'studio_analytics' ? 'studio.analytics.read' : source === 'craft_analytics' ? 'craft.analytics.read' : source === 'finance' ? 'finance.read' : source === 'dashboard' ? 'dashboard.read' : null; return Boolean(permission && actor.permissions.includes('reports.read') && actor.permissions.includes(permission)); }
  async history(actor: ReportActor, input: { page: number; limit: number; format?: string; q?: string; from?: string; to?: string; status?: string }) { const where = ['re.organization_id=?']; const params: Array<string | number> = [actor.organization_id]; if (input.format) { where.push('re.export_format=?'); params.push(input.format); } if (input.status) { where.push('re.status_code=?'); params.push(input.status); } if (input.q) { where.push('re.report_name LIKE ?'); params.push(`%${input.q}%`); } if (input.from) { where.push('DATE(re.generated_at)>=?'); params.push(input.from); } if (input.to) { where.push('DATE(re.generated_at)<=?'); params.push(input.to); } const [rows]: any = await pool.execute(`SELECT re.*,rd.report_code,bu.code business_unit_code,u.full_name generated_by_name,d.source_module_code FROM report_exports re LEFT JOIN report_definitions rd ON rd.id=re.report_definition_id AND rd.organization_id=re.organization_id LEFT JOIN business_units bu ON bu.id=re.business_unit_id LEFT JOIN users u ON u.id=re.generated_by LEFT JOIN documents d ON d.organization_id=re.organization_id AND d.entity_type='report_export' AND d.entity_id=re.id WHERE ${where.join(' AND ')} ORDER BY re.generated_at DESC,re.id DESC LIMIT 500`, params); const permitted = []; for (const row of rows) if (await this.permittedHistory(actor, row)) permitted.push({ id: Number(row.id), report_code: row.report_code || null, report_name: row.report_name, export_format: row.export_format, status_code: row.status_code, generated_at: row.generated_at, workspace: row.business_unit_code || 'global', generated_by: row.generated_by_name || 'Pengguna' }); const offset = (input.page - 1) * input.limit; return { items: permitted.slice(offset, offset + input.limit), pagination: { page: input.page, limit: input.limit, total: permitted.length, total_pages: Math.max(1, Math.ceil(permitted.length / input.limit)) } }; }
  async exportDetail(actor: ReportActor, id: number) { const row = await this.historyRow(actor, id); if (!await this.permittedHistory(actor, row)) throw new NotFoundError('Ekspor laporan tidak ditemukan.'); return { id: Number(row.id), report_name: row.report_name, export_format: row.export_format, status_code: row.status_code, generated_at: row.generated_at, can_download: row.status_code === 'generated' && Boolean(row.storage_path) }; }
  async download(actor: ReportActor, id: number, res: any) { const row = await this.historyRow(actor, id); if (!await this.permittedHistory(actor, row)) throw new NotFoundError('Ekspor laporan tidak ditemukan.'); if (row.status_code !== 'generated' || !row.storage_path || !await storageService.exists(row.storage_path)) throw new NotFoundError('File ekspor tidak ditemukan pada penyimpanan aman.'); await storageService.streamToResponse(res, row.storage_path, { filename: `${safeFile(row.report_name)}.${row.export_format}`, disposition: 'attachment' }); }
}

export const reportsService = new ReportsService();
