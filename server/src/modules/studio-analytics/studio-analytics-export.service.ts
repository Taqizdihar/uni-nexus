import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { pool } from '../../config/database';
import { storageService } from '../../shared/storage';
import { AuditService } from '../../shared/audit/audit.service';
import { safeText } from './studio-analytics.shared';
import type { AnalyticsExportFormat, AnalyticsReport, StudioAnalyticsContext, StudioAnalyticsFilters } from './studio-analytics.types';
import { StudioAnalyticsService } from './studio-analytics.service';

type ReportData = Record<string, unknown>;
type ExportResult = { body: Buffer; contentType: string; filename: string; report_export_id?: number; storage_key?: string };

const titles: Record<AnalyticsReport, string> = {
  overview: 'Ringkasan Analitik', projects: 'Proyek', clients: 'Klien', services: 'Layanan', commercial: 'Penawaran dan Penagihan', revenue: 'Pendapatan dan Arus Kas', profitability: 'Profitabilitas', receivables: 'Piutang', vendors: 'Vendor dan Freelancer', equipment: 'Peralatan dan Aset',
};

const flatten = (value: unknown, prefix = ''): Record<string, string | number | null> => {
  if (value === null || value === undefined) return { [prefix || 'value']: null };
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return { [prefix || 'value']: typeof value === 'boolean' ? String(value) : value };
  if (Array.isArray(value)) return { [prefix || 'value']: JSON.stringify(value) };
  return Object.entries(value as Record<string, unknown>).reduce((result, [key, item]) => ({ ...result, ...flatten(item, prefix ? `${prefix}.${key}` : key) }), {});
};
const asRows = (data: ReportData) => {
  const rows = Array.isArray(data.rows) ? data.rows : [];
  if (rows.length) return rows.slice(0, 50000).map(row => flatten(row));
  const kpis = data.kpis;
  if (Array.isArray(kpis)) return kpis.map(row => flatten(row));
  return Object.entries(data).filter(([key]) => !['rows', 'trend', 'trends'].includes(key)).map(([key, value]) => flatten(value, key));
};
const csvCell = (value: unknown) => `"${safeText(value).replaceAll('"', '""')}"`;
const safeFile = (value: string) => value.replaceAll(/[^a-zA-Z0-9_-]/g, '_').replaceAll(/_+/g, '_');

export class StudioAnalyticsExportService {
  constructor(private readonly analytics: StudioAnalyticsService) {}

  private async data(ctx: StudioAnalyticsContext, report: AnalyticsReport, filters: StudioAnalyticsFilters): Promise<ReportData> {
    return this.analytics[report](ctx, filters) as Promise<ReportData>;
  }

  private async audit(ctx: StudioAnalyticsContext, userId: number, report: AnalyticsReport, format: AnalyticsExportFormat, filters: StudioAnalyticsFilters, connection: { execute: typeof pool.execute } = pool) {
    await AuditService.write({ organizationId: ctx.organizationId, businessUnitId: ctx.id, userId, moduleCode: 'studio_analytics', actionCode: 'studio.analytics_export', entityType: 'analytics_export', entityCode: `${report}:${format}`, description: 'Mengekspor laporan Studio Analytics.', newValues: { report, format, start_date: filters.startDate, end_date: filters.endDate, currency: filters.currency || null, client_id: filters.clientId || null, service_id: filters.serviceId || null, project_type: filters.projectType || null } }, connection);
  }

  private csv(title: string, rows: Array<Record<string, string | number | null>>) {
    const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
    const content = [`UNI-NEXUS — ${title}`, headers.map(csvCell).join(','), ...rows.map(row => headers.map(header => csvCell(row[header])).join(','))].join('\r\n');
    return Buffer.from(`\uFEFF${content}`, 'utf8');
  }

  private async xlsx(title: string, report: ReportData, rows: Array<Record<string, string | number | null>>) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UNI-NEXUS'; workbook.created = new Date();
    const summary = workbook.addWorksheet('Ringkasan');
    summary.columns = [{ width: 30 }, { width: 70 }];
    summary.addRow(['Laporan', title]); summary.addRow(['Workspace', 'Uni-Inside Studio']);
    const reportPeriod = report.period as { start_date?: string; end_date?: string } | undefined;
    summary.addRow(['Periode', reportPeriod ? `${reportPeriod.start_date || ''} — ${reportPeriod.end_date || ''}` : '']); summary.addRow(['Dibuat', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })]);
    const summaryKpis = Array.isArray(report.kpis) ? report.kpis : Object.values(report.kpis || {}).flatMap(value => Array.isArray(value) ? value : []);
    (summaryKpis as Array<Record<string, unknown>>).forEach(item => summary.addRow([safeText(item.label), typeof item.value === 'number' ? item.value : safeText(item.value)]));
    summary.getRow(1).font = { bold: true }; summary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4CF' } };
    const sheet = workbook.addWorksheet('Data'); const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
    sheet.columns = headers.map(header => ({ header, key: header, width: Math.min(32, Math.max(14, header.length + 2)) }));
    rows.forEach(row => sheet.addRow(Object.fromEntries(headers.map(header => [header, typeof row[header] === 'string' ? safeText(row[header]) : row[header]]))));
    sheet.views = [{ state: 'frozen', ySplit: 1 }]; sheet.getRow(1).font = { bold: true }; sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4CF' } };
    headers.forEach((header, index) => { if (/value|amount|cost|margin|fee|collected|outstanding|basis|invoiced/i.test(header)) sheet.getColumn(index + 1).numFmt = '#,##0.00'; });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private pdf(title: string, report: ReportData, rows: Array<Record<string, string | number | null>>) {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 38 }); const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(Buffer.from(chunk))); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
      const reportPeriod = report.period as { start_date?: string; end_date?: string } | undefined;
      doc.fontSize(17).fillColor('#202020').text('UNI-NEXUS'); doc.fontSize(13).text(title); doc.fontSize(9).fillColor('#555555').text(`Workspace: Uni-Inside Studio\nPeriode: ${reportPeriod?.start_date || ''} — ${reportPeriod?.end_date || ''}\nDibuat: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
      doc.moveDown().fillColor('#202020').fontSize(11).text('Ringkasan');
      const kpis = Array.isArray(report.kpis) ? report.kpis : Object.values(report.kpis || {}).flatMap(value => Array.isArray(value) ? value : []);
      (kpis as Array<Record<string, unknown>>).slice(0, 20).forEach(item => doc.fontSize(9).text(`${safeText(item.label)}: ${typeof item.value === 'number' ? item.value.toLocaleString('id-ID') : safeText(item.value)}`));
      doc.addPage().fontSize(11).text('Data');
      rows.slice(0, 300).forEach((row, index) => { const text = Object.entries(row).map(([key, value]) => `${key}: ${safeText(value)}`).join(' | '); if (doc.y > 760) doc.addPage(); doc.fontSize(7).fillColor(index % 2 ? '#333333' : '#555555').text(text, { width: 520 }); });
      doc.end();
    });
  }

  async export(ctx: StudioAnalyticsContext, report: AnalyticsReport, format: AnalyticsExportFormat, filters: StudioAnalyticsFilters, userId: number): Promise<ExportResult> {
    const data = await this.data(ctx, report, filters); const rows = asRows(data); const title = titles[report]; const base = `UNI-NEXUS_Studio_${safeFile(title)}_${filters.startDate}_${filters.endDate}`;
    let result: ExportResult;
    if (format === 'csv') result = { body: this.csv(title, rows), contentType: 'text/csv; charset=utf-8', filename: `${base}.csv` };
    else if (format === 'xlsx') result = { body: await this.xlsx(title, data, rows), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: `${base}.xlsx` };
    else result = { body: await this.pdf(title, data, rows), contentType: 'application/pdf', filename: `${base}.pdf` };
    const saved = await storageService.writeBuffer('report_export', result.body, result.filename);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [inserted]: any = await connection.execute(
        `INSERT INTO report_exports (organization_id,business_unit_id,report_name,export_format,filter_json,storage_path,status_code,generated_by)
         VALUES (?,?,?,?,?,?,'generated',?)`,
        [ctx.organizationId, ctx.id, title, format, JSON.stringify({ start_date: filters.startDate, end_date: filters.endDate, currency: filters.currency || null, client_id: filters.clientId || null, service_id: filters.serviceId || null, project_type: filters.projectType || null }), saved.key, userId],
      );
      await this.audit(ctx, userId, report, format, filters, connection);
      await connection.commit();
      result.report_export_id = Number(inserted.insertId);
      result.storage_key = saved.key;
    } catch (error) {
      await connection.rollback();
      await storageService.delete(saved.key);
      throw error;
    } finally { connection.release(); }
    return result;
  }
}
