import PDFDocument from 'pdfkit';
import type { PoolConnection } from 'mysql2/promise';
import type { Response } from 'express';
import { NotFoundError } from '../../shared/errors/AppError';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { sanitizeOriginalName, storageService, toStorageKey } from '../../shared/storage';
import { studioBillingRepository } from './studio-billing.repository';
import { toNumber, writeBillingAudit } from './studio-billing.shared';

type DocumentType = 'quotation' | 'invoice';
interface PdfLine { description: string; quantity: number; unit_price: number; discount_amount?: number; tax_amount?: number; line_total: number; }
interface PdfRecord {
  document_number: string;
  issue_date: string;
  due_or_valid_until?: string | null;
  currency_code: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount?: number;
  balance_due?: number;
  terms?: string | null;
  notes?: string | null;
  payment_terms?: string | null;
  client_name: string;
  client_code?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  project_code?: string | null;
  project_name?: string | null;
}

const money = (value: number, currency = 'IDR') => new Intl.NumberFormat('id-ID', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
const dateValue = (value?: string | Date | null) => value instanceof Date ? value.toISOString().slice(0, 10) : value ? String(value).slice(0, 10) : null;
const dateLabel = (value?: string | Date | null) => {
  const date = dateValue(value);
  return date ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${date}T00:00:00`)) : '-';
};

const safeName = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, '_');

export class StudioBillingDocumentService {
  private documentKey(type: DocumentType, number: string) {
    const fileName = `${type}-${safeName(number)}.pdf`;
    return { key: toStorageKey(`${type}s`, fileName), fileName };
  }

  /**
   * Renders fully in memory, then hands the buffer to `StorageService.finalizeBuffer`, which
   * stages it under `temp/` and finalizes with a rename — a crash mid-render can never leave a
   * truncated PDF at the official document key.
   */
  private async renderToBuffer(type: DocumentType, record: PdfRecord, lines: PdfLine[]): Promise<Buffer> {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true, info: { Title: `${type === 'quotation' ? 'Penawaran' : 'Invoice'} ${record.document_number}`, Author: 'UNI-INSIDE Studio' } });
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const result = new Promise<Buffer>((resolve, reject) => { doc.once('end', () => resolve(Buffer.concat(chunks))); doc.once('error', reject); });
    this.drawPdf(doc, type, record, lines);
    doc.end();
    return result;
  }

  private drawPdf(doc: PDFKit.PDFDocument, type: DocumentType, record: PdfRecord, lines: PdfLine[]) {
    const title = type === 'quotation' ? 'PENAWARAN' : 'INVOICE';
    const pageBottom = () => doc.page.height - 52;
    const ensureSpace = (needed: number) => {
      if (doc.y + needed <= pageBottom()) return;
      doc.addPage();
      doc.fontSize(8).fillColor('#6B7280').text(`UNI-INSIDE STUDIO  |  ${record.document_number}`, 48, 38, { width: 499, align: 'right' });
      doc.moveDown(2);
    };
    const tableHeader = () => {
      ensureSpace(28);
      const y = doc.y;
      doc.fillColor('#1F2937').font('Helvetica-Bold').fontSize(8);
      doc.text('DESKRIPSI', 48, y, { width: 235 });
      doc.text('QTY', 286, y, { width: 42, align: 'right' });
      doc.text('HARGA', 334, y, { width: 92, align: 'right' });
      doc.text('TOTAL', 434, y, { width: 113, align: 'right' });
      doc.moveTo(48, y + 16).lineTo(547, y + 16).strokeColor('#D1D5DB').stroke();
      doc.y = y + 24;
    };
    const labelValue = (label: string, value: string, x: number, y: number) => {
      doc.fillColor('#6B7280').font('Helvetica').fontSize(8).text(label.toUpperCase(), x, y);
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9).text(value, x, y + 11, { width: 220 });
    };

    doc.fillColor('#B88B00').font('Helvetica-Bold').fontSize(11).text('UNI-NEXUS', 48, 48);
    doc.fillColor('#111827').fontSize(8).text('UNI-INSIDE STUDIO', 48, 64);
    doc.fontSize(25).text(title, 330, 46, { width: 217, align: 'right' });
    doc.fillColor('#6B7280').font('Helvetica').fontSize(9).text(record.document_number, 330, 78, { width: 217, align: 'right' });
    doc.moveTo(48, 101).lineTo(547, 101).strokeColor('#D1D5DB').stroke();
    labelValue('Ditujukan kepada', record.client_name, 48, 116);
    doc.fillColor('#4B5563').font('Helvetica').fontSize(8).text([record.client_code, record.client_email, record.client_phone].filter(Boolean).join('  •  ') || '-', 48, 140, { width: 250 });
    labelValue('Tanggal terbit', dateLabel(record.issue_date), 330, 116);
    labelValue(type === 'quotation' ? 'Berlaku sampai' : 'Jatuh tempo', dateLabel(record.due_or_valid_until), 330, 154);
    if (record.project_name || record.project_code) {
      doc.fillColor('#6B7280').font('Helvetica').fontSize(8).text('PROYEK', 48, 174);
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9).text([record.project_code, record.project_name].filter(Boolean).join(' — '), 48, 185, { width: 280 });
    }
    doc.y = 220;
    tableHeader();
    lines.forEach((line, index) => {
      const descriptionHeight = doc.heightOfString(line.description, { width: 235, align: 'left' });
      const rowHeight = Math.max(24, descriptionHeight + 8);
      ensureSpace(rowHeight + 8);
      const y = doc.y;
      doc.fillColor('#111827').font('Helvetica').fontSize(8.5).text(line.description, 48, y, { width: 235 });
      doc.text(new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(line.quantity), 286, y, { width: 42, align: 'right' });
      doc.text(money(line.unit_price, record.currency_code), 334, y, { width: 92, align: 'right' });
      doc.font('Helvetica-Bold').text(money(line.line_total, record.currency_code), 434, y, { width: 113, align: 'right' });
      doc.font('Helvetica').moveTo(48, y + rowHeight).lineTo(547, y + rowHeight).strokeColor('#E5E7EB').stroke();
      doc.y = y + rowHeight + 7;
      if (index < lines.length - 1 && doc.y + 35 > pageBottom()) { doc.addPage(); doc.y = 62; tableHeader(); }
    });
    ensureSpace(132);
    const totalsY = doc.y + 4;
    const totalRow = (label: string, value: string, y: number, bold = false) => {
      doc.fillColor('#4B5563').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10 : 8.5).text(label, 355, y, { width: 90, align: 'right' });
      doc.fillColor('#111827').text(value, 450, y, { width: 97, align: 'right' });
    };
    totalRow('Subtotal', money(record.subtotal, record.currency_code), totalsY);
    if (record.discount_amount > 0) totalRow('Diskon', `- ${money(record.discount_amount, record.currency_code)}`, totalsY + 18);
    if (record.tax_amount > 0) totalRow('Pajak', money(record.tax_amount, record.currency_code), totalsY + (record.discount_amount > 0 ? 36 : 18));
    const totalY = totalsY + (record.discount_amount > 0 ? 54 : 36);
    doc.moveTo(355, totalY - 5).lineTo(547, totalY - 5).strokeColor('#9CA3AF').stroke();
    totalRow('TOTAL', money(record.total_amount, record.currency_code), totalY, true);
    if (type === 'invoice') totalRow('Sisa Tagihan', money(record.balance_due || 0, record.currency_code), totalY + 22, true);
    const narrative = type === 'quotation' ? record.terms : record.payment_terms;
    if (narrative || record.notes) {
      ensureSpace(92);
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9).text(type === 'quotation' ? 'Ketentuan' : 'Ketentuan Pembayaran', 48, doc.y + 22);
      doc.fillColor('#4B5563').font('Helvetica').fontSize(8.5).text(narrative || '-', 48, doc.y + 5, { width: 499 });
      if (record.notes) {
        doc.moveDown(0.6).fillColor('#111827').font('Helvetica-Bold').fontSize(9).text('Catatan');
        doc.fillColor('#4B5563').font('Helvetica').fontSize(8.5).text(record.notes, { width: 499 });
      }
    }
    const pageCount = (doc as any).bufferedPageRange?.().count || 1;
    for (let i = 0; i < pageCount; i += 1) {
      doc.switchToPage(i);
      doc.fillColor('#6B7280').font('Helvetica').fontSize(7).text(`Dokumen komersial UNI-INSIDE Studio • ${record.document_number}`, 48, doc.page.height - 36, { width: 420 });
      doc.text(`${i + 1}/${pageCount}`, 470, doc.page.height - 36, { width: 77, align: 'right' });
    }
  }

  private recordFor(type: DocumentType, header: any): PdfRecord {
    return {
      document_number: type === 'quotation' ? header.quotation_number : header.invoice_number,
      issue_date: dateValue(header.issue_date) || '',
      due_or_valid_until: dateValue(type === 'quotation' ? header.valid_until : header.due_date),
      currency_code: header.currency_code || 'IDR',
      subtotal: toNumber(header.subtotal), discount_amount: toNumber(header.discount_amount), tax_amount: toNumber(header.tax_amount), total_amount: toNumber(header.total_amount),
      paid_amount: toNumber(header.paid_amount), balance_due: toNumber(header.balance_due), terms: header.terms, notes: header.notes, payment_terms: header.payment_terms,
      client_name: header.client_name || header.display_name || 'Klien Studio', client_code: header.client_code || header.code, client_email: header.client_email || header.email, client_phone: header.client_phone || header.phone,
      project_code: header.project_code, project_name: header.project_name,
    };
  }

  async createOfficial(connection: PoolConnection, type: DocumentType, header: any, items: any[], studio: BusinessUnitContext, userId: number | null) {
    const id = Number(header.id);
    const number = type === 'quotation' ? String(header.quotation_number) : String(header.invoice_number);
    const [existing]: any = await connection.execute(
      `SELECT * FROM documents WHERE organization_id = ? AND business_unit_id = ? AND document_type = ? AND entity_type = ? AND entity_id = ? ORDER BY version_no DESC, id DESC LIMIT 1 FOR UPDATE`,
      [studio.organizationId, studio.id, type, type, id],
    );
    if (existing.length && await storageService.exists(existing[0].storage_path)) return existing[0];

    const { key } = this.documentKey(type, number);
    const buffer = await this.renderToBuffer(type, this.recordFor(type, header), items.map(line => ({ description: line.description, quantity: toNumber(line.quantity), unit_price: toNumber(line.unit_price), discount_amount: toNumber(line.discount_amount), tax_amount: toNumber(line.tax_amount), line_total: toNumber(line.line_total) })));
    const stored = await storageService.finalizeBuffer(key, buffer);
    const version = existing.length ? Number(existing[0].version_no) : 1;
    if (existing.length) {
      await connection.execute(`UPDATE documents SET document_code = ?, title = ?, file_name = ?, storage_path = ?, mime_type = 'application/pdf', file_size_bytes = ?, uploaded_by = ? WHERE id = ?`, [number, `${type === 'quotation' ? 'Penawaran' : 'Invoice'} ${number}`, stored.fileName, stored.key, stored.sizeBytes, userId, existing[0].id]);
    } else {
      await connection.execute(
        `INSERT INTO documents (organization_id, business_unit_id, document_code, document_type, title, file_name, storage_path, mime_type, file_size_bytes, entity_type, entity_id, version_no, is_template, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'application/pdf', ?, ?, ?, ?, 0, ?)`,
        [studio.organizationId, studio.id, number, type, `${type === 'quotation' ? 'Penawaran' : 'Invoice'} ${number}`, stored.fileName, stored.key, stored.sizeBytes, type, id, version, userId],
      );
    }
    if (type === 'invoice') await connection.execute('UPDATE invoices SET pdf_path = ? WHERE id = ?', [stored.key, id]);
    await writeBillingAudit(connection, studio, userId, type === 'quotation' ? 'studio.quotation_pdf_generate' : 'studio.invoice_pdf_generate', type, id, number, `Membuat PDF resmi ${type === 'quotation' ? 'penawaran' : 'invoice'} ${number}.`);
    return { storage_path: stored.key, file_name: stored.fileName };
  }

  async preview(type: DocumentType, header: any, items: any[], res: Response) {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const result = new Promise<Buffer>((resolve, reject) => { doc.once('end', () => resolve(Buffer.concat(chunks))); doc.once('error', reject); });
    this.drawPdf(doc, type, this.recordFor(type, header), items.map(line => ({ description: line.description, quantity: toNumber(line.quantity), unit_price: toNumber(line.unit_price), discount_amount: toNumber(line.discount_amount), tax_amount: toNumber(line.tax_amount), line_total: toNumber(line.line_total) })));
    doc.end();
    const buffer = await result;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeName(this.recordFor(type, header).document_number)}.pdf"`);
    res.send(buffer);
  }

  async sendOfficial(type: DocumentType, id: number, studio: BusinessUnitContext, res: Response) {
    const document = await studioBillingRepository.getDocument(type, id, studio);
    if (!document) throw new NotFoundError('PDF resmi belum tersedia untuk dokumen ini.');
    if (!(await storageService.exists(document.storage_path))) throw new NotFoundError('File PDF tidak ditemukan di penyimpanan aman.');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeOriginalName(document.file_name)}"`);
    res.sendFile(storageService.absolutePath(document.storage_path));
  }
}

export const studioBillingDocumentService = new StudioBillingDocumentService();
