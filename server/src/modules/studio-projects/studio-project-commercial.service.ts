import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { toNumber } from './studio-projects.helpers';

/** Invoices are linked to a project through the generic invoice source columns. */
export const PROJECT_INVOICE_SOURCE = 'studio_project';

type Queryable = Pick<PoolConnection, 'execute'>;

/**
 * Read-only commercial view of a project.
 *
 * Quotations, invoices, payments and expenses stay owned by Billing and Finance —
 * this service only reports what already exists and decides when project pricing
 * has become commercially locked.
 */
export class StudioProjectCommercialService {
  async getSummary(projectId: number, organizationId: number) {
    const [quotations]: any = await pool.execute(
      `SELECT id, quotation_number, issue_date, valid_until, status_code, total_amount, accepted_at
       FROM quotations WHERE project_id = ? AND organization_id = ?
       ORDER BY issue_date DESC, id DESC LIMIT 50`,
      [projectId, organizationId],
    );

    const [invoices]: any = await pool.execute(
      `SELECT id, invoice_number, issue_date, due_date, status_code, total_amount, paid_amount, balance_due, paid_at
       FROM invoices WHERE source_type = ? AND source_id = ? AND organization_id = ?
       ORDER BY issue_date DESC, id DESC LIMIT 50`,
      [PROJECT_INVOICE_SOURCE, projectId, organizationId],
    );

    const [expenses]: any = await pool.execute(
      `SELECT id, expense_code, expense_date, description, amount, status_code
       FROM expenses WHERE studio_project_id = ? AND organization_id = ?
       ORDER BY expense_date DESC, id DESC LIMIT 50`,
      [projectId, organizationId],
    );

    const [externalFees]: any = await pool.execute(
      `SELECT COUNT(*) AS count, COALESCE(SUM(agreed_fee), 0) AS total
       FROM project_external_assignments WHERE project_id = ?`,
      [projectId],
    );

    const [assets]: any = await pool.execute(
      `SELECT apa.id, apa.asset_id, apa.assigned_from, apa.assigned_until, apa.returned_at, apa.notes,
              a.asset_code, a.name AS asset_name, a.category
       FROM asset_project_assignments apa
       JOIN assets a ON a.id = apa.asset_id
       WHERE apa.project_id = ?
       ORDER BY apa.assigned_from DESC, apa.id DESC LIMIT 50`,
      [projectId],
    );

    const billable = (invoices as any[]).filter(invoice => !['void', 'cancelled'].includes(invoice.status_code));
    const totalInvoiced = billable.reduce((sum, invoice) => sum + toNumber(invoice.total_amount), 0);
    const totalInvoicePaid = billable.reduce((sum, invoice) => sum + toNumber(invoice.paid_amount), 0);
    const paidExpenses = (expenses as any[]).filter(expense => expense.status_code !== 'cancelled');

    return {
      quotations: (quotations as any[]).map(row => ({ ...row, total_amount: toNumber(row.total_amount) })),
      invoices: billable.map(row => ({ ...row, total_amount: toNumber(row.total_amount), paid_amount: toNumber(row.paid_amount), balance_due: toNumber(row.balance_due) })),
      invoice_summary: {
        count: billable.length,
        total_invoiced: totalInvoiced,
        total_paid: totalInvoicePaid,
        outstanding: Math.max(0, totalInvoiced - totalInvoicePaid),
      },
      expenses: paidExpenses.map(row => ({ ...row, amount: toNumber(row.amount) })),
      expense_summary: {
        count: paidExpenses.length,
        total: paidExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0),
      },
      external_fee_summary: {
        count: toNumber(externalFees[0]?.count),
        total_agreed_fee: toNumber(externalFees[0]?.total),
      },
      assets: assets as any[],
    };
  }

  /**
   * A project becomes commercially locked once a quotation has been issued or
   * accepted, or an invoice exists that is not void/cancelled. Operational data
   * stays editable; only pricing is frozen.
   */
  async getCommercialLock(connection: Queryable, projectId: number, organizationId: number) {
    const [quotations]: any = await connection.execute(
      `SELECT quotation_number, status_code FROM quotations
       WHERE project_id = ? AND organization_id = ? AND status_code IN ('sent', 'accepted')
       LIMIT 5`,
      [projectId, organizationId],
    );
    const [invoices]: any = await connection.execute(
      `SELECT invoice_number, status_code FROM invoices
       WHERE source_type = ? AND source_id = ? AND organization_id = ? AND status_code NOT IN ('void', 'cancelled')
       LIMIT 5`,
      [PROJECT_INVOICE_SOURCE, projectId, organizationId],
    );

    const reasons = [
      ...(quotations as any[]).map(row => `Penawaran ${row.quotation_number} berstatus ${row.status_code}`),
      ...(invoices as any[]).map(row => `Invoice ${row.invoice_number} berstatus ${row.status_code}`),
    ];
    return { locked: reasons.length > 0, reasons };
  }

  /** Guards every write that would change project pricing. */
  async assertCommercialUnlocked(connection: Queryable, projectId: number, organizationId: number) {
    const lock = await this.getCommercialLock(connection, projectId, organizationId);
    if (lock.locked) {
      throw new AppError(
        409,
        'PROJECT_COMMERCIAL_LOCKED',
        'Nilai komersial proyek ini sudah terkunci karena penawaran/invoice yang berjalan. Ubah melalui modul Penawaran & Penagihan.',
        lock.reasons,
      );
    }
  }

  /**
   * `paid` is only reachable when canonical financial data says the project is settled —
   * Projects never marks money as received on its own.
   */
  async assertFullyPaid(connection: Queryable, projectId: number, organizationId: number, paymentStatusCode: string) {
    if (paymentStatusCode === 'paid') return;

    const [rows]: any = await connection.execute(
      `SELECT COALESCE(SUM(total_amount), 0) AS invoiced, COALESCE(SUM(paid_amount), 0) AS paid, COUNT(*) AS count
       FROM invoices
       WHERE source_type = ? AND source_id = ? AND organization_id = ? AND status_code NOT IN ('void', 'cancelled')`,
      [PROJECT_INVOICE_SOURCE, projectId, organizationId],
    );
    const invoiced = toNumber(rows[0]?.invoiced);
    const paid = toNumber(rows[0]?.paid);

    if (!toNumber(rows[0]?.count) || invoiced <= 0 || paid + 0.005 < invoiced) {
      throw new AppError(
        409,
        'PROJECT_PAYMENT_NOT_SETTLED',
        'Status "Lunas" hanya dapat dipilih setelah data pembayaran resmi menyatakan proyek ini lunas. Gunakan status "Selesai" untuk menutup pekerjaan operasional.',
      );
    }
  }
}

export const studioProjectCommercialService = new StudioProjectCommercialService();
