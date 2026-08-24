import PDFDocument from 'pdfkit';
import { Response } from 'express';

export class OrderDocumentsService {
  async generateInvoicePdf(invoice: any, items: any[], res: Response) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoice_number}.pdf"`);

    doc.pipe(res);

    // Header
    doc
      .fontSize(20)
      .text('INVOICE', { align: 'right' })
      .moveDown();

    doc
      .fontSize(10)
      .text(`Invoice Number: ${invoice.invoice_number}`, { align: 'right' })
      .text(`Date: ${new Date(invoice.issue_date).toLocaleDateString()}`, { align: 'right' })
      .text(`Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}`, { align: 'right' })
      .moveDown(2);

    // Company & Client Info
    const topPos = doc.y;
    
    doc.text('UNI-INSIDE CRAFT', 50, topPos);
    doc.text('Jl. Telekomunikasi No. 1, Bandung', 50, topPos + 15);
    
    doc.text('Bill To:', 300, topPos);
    doc.text(invoice.customer_name || 'Customer', 300, topPos + 15);
    if (invoice.customer_email) doc.text(invoice.customer_email, 300, topPos + 30);
    if (invoice.customer_phone) doc.text(invoice.customer_phone, 300, topPos + 45);

    doc.moveDown(3);

    // Table Header
    const tableTop = doc.y + 10;
    doc.font('Helvetica-Bold');
    this.generateTableRow(doc, tableTop, 'Item Description', 'Qty', 'Unit Price', 'Total');
    doc.font('Helvetica');
    this.generateHr(doc, tableTop + 20);

    // Table Rows
    let itemY = tableTop + 30;
    for (const item of items) {
      this.generateTableRow(
        doc,
        itemY,
        item.description,
        item.quantity.toString(),
        this.formatCurrency(item.unit_price),
        this.formatCurrency(item.line_total)
      );
      itemY += 20;
    }

    this.generateHr(doc, itemY + 10);
    
    // Totals
    const totalPos = itemY + 20;
    doc.font('Helvetica-Bold');
    this.generateTableRow(doc, totalPos, '', '', 'Subtotal', this.formatCurrency(invoice.subtotal));
    if (invoice.discount_amount > 0) {
      this.generateTableRow(doc, totalPos + 20, '', '', 'Discount', `-${this.formatCurrency(invoice.discount_amount)}`);
    }
    this.generateTableRow(doc, totalPos + 40, '', '', 'Total', this.formatCurrency(invoice.total_amount));
    
    const balanceDue = Number(invoice.total_amount) - Number(invoice.paid_amount);
    doc.font('Helvetica-Bold').fontSize(12);
    this.generateTableRow(doc, totalPos + 70, '', '', 'Balance Due', this.formatCurrency(balanceDue));

    doc.end();
  }

  async generateReceiptPdf(receipt: any, res: Response) {
    const doc = new PDFDocument({ margin: 50, size: 'A5', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="receipt-${receipt.payment_code}.pdf"`);

    doc.pipe(res);

    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke();

    doc.fontSize(18).font('Helvetica-Bold').text('KWITANSI', 0, 40, { align: 'center' });
    doc.moveDown();

    doc.fontSize(10).font('Helvetica');
    const startX = 50;
    let currentY = 90;

    doc.text(`No. Kwitansi: ${receipt.payment_code}`, startX, currentY);
    currentY += 20;
    
    doc.text(`Telah diterima dari: ${receipt.customer_name}`, startX, currentY);
    currentY += 20;

    doc.text(`Uang sejumlah: `, startX, currentY);
    doc.font('Helvetica-Bold').text(`${this.formatCurrency(receipt.amount)}`, startX + 100, currentY);
    doc.font('Helvetica');
    currentY += 20;

    doc.text(`Untuk pembayaran: Pembayaran pesanan ${receipt.order_code}`, startX, currentY);
    if (receipt.notes) {
      currentY += 20;
      doc.text(`Catatan: ${receipt.notes}`, startX, currentY);
    }

    currentY += 50;
    doc.text(`Bandung, ${new Date(receipt.payment_date).toLocaleDateString('id-ID')}`, doc.page.width - 200, currentY);
    doc.text(`Penerima`, doc.page.width - 200, currentY + 15);
    
    doc.text(`( ${receipt.receiver_name || 'UNI-INSIDE CRAFT'} )`, doc.page.width - 200, currentY + 70);

    doc.end();
  }

  private generateTableRow(doc: PDFKit.PDFDocument, y: number, item: string, qty: string, unitPrice: string, total: string) {
    doc
      .text(item, 50, y, { width: 250 })
      .text(qty, 300, y, { width: 50, align: 'right' })
      .text(unitPrice, 370, y, { width: 70, align: 'right' })
      .text(total, 450, y, { width: 90, align: 'right' });
  }

  private generateHr(doc: PDFKit.PDFDocument, y: number) {
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, y).lineTo(540, y).stroke();
  }

  private formatCurrency(amount: number | string) {
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
  }
}
