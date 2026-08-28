import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { pool } from '../src/config/database';
import { StudioAnalyticsService } from '../src/modules/studio-analytics/studio-analytics.service';
import { StudioAnalyticsExportService } from '../src/modules/studio-analytics/studio-analytics-export.service';
import { normalizeFilters, studioAnalyticsContext } from '../src/modules/studio-analytics/studio-analytics.shared';
import { storageService } from '../src/shared/storage';

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new Error(message); };
const tag = `SA-${randomBytes(4).toString('hex').toUpperCase()}`;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).reduce((out, part) => ({ ...out, [part.type]: part.value }), {} as Record<string, string>);
const day = `${today.year}-${today.month}-${today.day}`;
const days = (amount: number) => { const date = new Date(`${day}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10); };

async function run() {
  const ctx = await studioAnalyticsContext(1); const analytics = new StudioAnalyticsService();
  let partyId = 0, serviceId = 0, projectId = 0, quoteId = 0, invoiceId = 0, assignmentId = 0, assetId = 0, reportExportId = 0, reportStorageKey = '';
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [party]: any = await connection.execute(`INSERT INTO parties (organization_id,code,party_kind,display_name,status_code) VALUES (?,?, 'company', ?, 'active')`, [ctx.organizationId, tag, `=Client ${tag}`]); partyId = Number(party.insertId);
      await connection.execute(`INSERT INTO party_roles (party_id,business_unit_id,role_code,is_active) VALUES (?,?,'studio_client',1)`, [partyId, ctx.id]);
      const [service]: any = await connection.execute(`INSERT INTO studio_services (business_unit_id,code,name,pricing_model,base_price,is_active) VALUES (?,?,?,'fixed',1000000,1)`, [ctx.id, tag, `Service ${tag}`]); serviceId = Number(service.insertId);
      const [project]: any = await connection.execute(`INSERT INTO studio_projects (business_unit_id,project_code,client_party_id,project_name,status_code,priority_code,start_date,deadline_at,completed_at,currency_code,contract_value,estimated_cost,actual_cost,paid_amount,payment_status_code) VALUES (?,?,?,?, 'completed','normal',?, ?, ?, 'IDR',10000000,0,0,4000000,'partial')`, [ctx.id, tag, partyId, `Project ${tag}`, days(-8), `${days(-1)} 23:59:59`, `${days(-2)} 12:00:00`]); projectId = Number(project.insertId);
      await connection.execute(`INSERT INTO studio_project_status_history (project_id,to_status_code,changed_at) VALUES (?, 'lead', ?),(?, 'quotation', ?),(?, 'approved', ?),(?, 'in_progress', ?),(?, 'completed', ?)`, [projectId, `${days(-8)} 08:00:00`, projectId, `${days(-7)} 08:00:00`, projectId, `${days(-6)} 08:00:00`, projectId, `${days(-5)} 08:00:00`, projectId, `${days(-2)} 12:00:00`]);
      await connection.execute(`INSERT INTO studio_project_services (project_id,service_id,description,quantity,unit_price,line_total) VALUES (?,?,?,1,1000000,1000000)`, [projectId, serviceId, `Scope ${tag}`]);
      const [quote]: any = await connection.execute(`INSERT INTO quotations (organization_id,business_unit_id,quotation_number,party_id,project_id,issue_date,status_code,currency_code,subtotal,discount_amount,tax_amount,total_amount,accepted_at) VALUES (?,?,?,?,?,?,'accepted','IDR',10000000,0,0,10000000,?)`, [ctx.organizationId,ctx.id,tag,partyId,projectId,day,`${day} 09:00:00`]); quoteId=Number(quote.insertId);
      await connection.execute(`INSERT INTO quotation_items (quotation_id,service_id,description,quantity,unit_price,discount_amount,line_total,sort_order) VALUES (?,?,?,1,10000000,0,10000000,0)`,[quoteId,serviceId,`Quote ${tag}`]);
      const [invoice]: any=await connection.execute(`INSERT INTO invoices (organization_id,business_unit_id,invoice_number,party_id,quotation_id,source_type,source_id,issue_date,due_date,status_code,currency_code,subtotal,discount_amount,tax_amount,total_amount,paid_amount,balance_due,issued_at) VALUES (?,?,?,?,?,'studio_project',?,?,?,'partial','IDR',10000000,0,0,10000000,4000000,6000000,?)`,[ctx.organizationId,ctx.id,tag,partyId,quoteId,projectId,day,days(-5),`${day} 09:00:00`]); invoiceId=Number(invoice.insertId);
      await connection.execute(`INSERT INTO invoice_items (invoice_id,service_id,description,quantity,unit_price,discount_amount,tax_amount,line_total,sort_order) VALUES (?,?,?,1,10000000,0,0,10000000,0)`,[invoiceId,serviceId,`Invoice ${tag}`]);
      await connection.execute(`INSERT INTO invoice_payment_schedules (invoice_id,installment_no,label,due_date,amount,paid_amount,status_code) VALUES (?,1,'Termin',?,10000000,4000000,'partial')`,[invoiceId,days(-5)]);
      await connection.execute(`INSERT INTO financial_transactions (organization_id,business_unit_id,transaction_code,transaction_date,transaction_type,amount,currency_code,description,source_type,source_code,status_code) VALUES (?,?,?,?,'income',4000000,'IDR',?,'studio_customer_payment',?,'posted')`,[ctx.organizationId,ctx.id,`${tag}-PAY`,`${day} 10:00:00`,`Payment ${tag}`,`${tag}-PAY`]);
      await connection.execute(`INSERT INTO expenses (organization_id,business_unit_id,expense_code,party_id,studio_project_id,expense_date,description,amount,tax_amount,currency_code,status_code) VALUES (?,?,?,?,?,?,?,3000000,0,'IDR','paid')`,[ctx.organizationId,ctx.id,`${tag}-EXP`,partyId,projectId,`${day} 11:00:00`,`Expense ${tag}`]);
      const [assignment]: any=await connection.execute(`INSERT INTO project_external_assignments (project_id,party_id,assignment_role,agreed_fee,payment_status_code,start_date) VALUES (?,?,'freelancer',2000000,'partial',?)`,[projectId,partyId,days(-4)]);assignmentId=Number(assignment.insertId);
      await connection.execute(`INSERT INTO financial_transactions (organization_id,business_unit_id,transaction_code,transaction_date,transaction_type,amount,currency_code,description,source_type,source_code,status_code) VALUES (?,?,?,?,'expense',1000000,'IDR',?,'studio_external_payout',?,'posted')`,[ctx.organizationId,ctx.id,`${tag}-PAYOUT`,`${day} 11:30:00`,`Payout ${tag}`,`ASSIGN-${assignmentId}`]);
      const [asset]: any=await connection.execute(`INSERT INTO assets (business_unit_id,asset_code,name,category,status_code,purchase_cost,current_book_value) VALUES (?,?,?,?, 'in_use',2000000,1500000)`,[ctx.id,tag,`Asset ${tag}`,'Camera']);assetId=Number(asset.insertId);
      await connection.execute(`INSERT INTO asset_project_assignments (asset_id,project_id,assigned_from,assigned_until) VALUES (?,?,?,?)`,[assetId,projectId,`${day} 00:00:00`,`${day} 23:00:00`]);
      await connection.execute(`INSERT INTO asset_maintenance_records (asset_id,maintenance_type,performed_at,cost,next_due_at) VALUES (?,'routine',?,250000,?)`,[assetId,`${day} 08:00:00`,`${days(2)} 08:00:00`]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }

    const filters = normalizeFilters({ startDate: days(-30), endDate: day, currency: 'IDR', compare: true });
    const before = (await pool.execute(`SELECT updated_at,status_code FROM studio_projects WHERE id=?`,[projectId]) as any)[0][0];
    const [overview, projects, services, commercial, profitability, receivables, vendors, equipment] = await Promise.all([analytics.overview(ctx,filters),analytics.projects(ctx,filters),analytics.services(ctx,filters),analytics.commercial(ctx,filters),analytics.profitability(ctx,filters),analytics.receivables(ctx,filters),analytics.vendors(ctx,filters),analytics.equipment(ctx,filters)]);
    const after = (await pool.execute(`SELECT updated_at,status_code FROM studio_projects WHERE id=?`,[projectId]) as any)[0][0];
    assert(before.updated_at.getTime() === after.updated_at.getTime() && before.status_code === after.status_code, 'Analytics GET mutated a source project.');
    assert(Number(projects.funnel.find(item => item.label === 'completed')?.value || 0) >= 1, 'Project funnel did not use status history.');
    assert((services.rows as Array<{ name: string }>).some(row => row.name.includes(tag)), 'Service snapshot row is absent.');
    assert((commercial.collection as { cash_collected: number }).cash_collected >= 4000000, 'Cash collection is not distinct from invoice value.');
    assert((profitability.rows as Array<{ id: number; recorded_contract_margin: number; cash_margin: number }>).some(row => row.id === projectId && row.recorded_contract_margin === 7000000 && row.cash_margin === 1000000), 'Project profitability has incorrect contract/cash margin.');
    assert((receivables.aging as Array<{ label: string; outstanding: number }>).some(row => row.label === '1–7 Hari Terlambat' && row.outstanding >= 6000000), 'Receivable aging bucket is incorrect.');
    assert((vendors.rows as Array<{ id: number; actual_payout: number; remaining_commitment: number }>).some(row => row.id === assignmentId && row.actual_payout === 1000000 && row.remaining_commitment === 1000000), 'External commitment and payout are not distinct.');
    assert((equipment.rows as Array<{ id: number; utilization_percent: number }>).some(row => row.id === assetId && row.utilization_percent > 0 && row.utilization_percent <= 100), 'Asset utilization is not overlap-safe.');
    assert((overview.kpis as { commercial: Array<{ label: string; value: number }> }).commercial.some(item => item.label === 'Kas Terkumpul' && item.value >= 4000000), 'Overview omitted customer cash collection.');
    const exportResult = await new StudioAnalyticsExportService(analytics).export(ctx, 'overview', 'csv', { ...filters, projectType: tag }, 1);
    reportExportId = Number(exportResult.report_export_id || 0); reportStorageKey = exportResult.storage_key || '';
    assert(exportResult.contentType.startsWith('text/csv') && exportResult.body.length > 10, 'CSV export did not return downloadable content.');
    const [users]: any = await pool.execute(`SELECT DISTINCT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions permission ON permission.id=rp.permission_id WHERE u.status_code='active' AND u.approval_status_code='approved' AND permission.code='studio.analytics.read' LIMIT 1`);
    if (users.length) {
      const token = jwt.sign({ id: Number(users[0].id) }, env.JWT_SECRET, { expiresIn: '5m' });
      const response = await fetch(`http://localhost:${env.PORT}/api/v1/studio/analytics/overview?start=${filters.startDate}&end=${filters.endDate}&currency=IDR`, { headers: { Authorization: `Bearer ${token}` } });
      assert(response.ok, `Analytics overview API returned ${response.status}.`);
    }
    console.log('Studio Analytics smoke test passed. Temporary fixtures will be removed.');
  } finally {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (reportExportId) await connection.execute(`DELETE FROM report_exports WHERE id=?`, [reportExportId]);
      if (assetId) { await connection.execute(`DELETE FROM asset_maintenance_records WHERE asset_id=?`,[assetId]); await connection.execute(`DELETE FROM asset_project_assignments WHERE asset_id=?`,[assetId]); await connection.execute(`DELETE FROM assets WHERE id=?`,[assetId]); }
      await connection.execute(`DELETE FROM financial_transactions WHERE transaction_code LIKE ?`,[`${tag}%`]);
      if (invoiceId) { await connection.execute(`DELETE FROM invoice_payment_schedules WHERE invoice_id=?`,[invoiceId]); await connection.execute(`DELETE FROM invoice_items WHERE invoice_id=?`,[invoiceId]); await connection.execute(`DELETE FROM invoices WHERE id=?`,[invoiceId]); }
      if (quoteId) { await connection.execute(`DELETE FROM quotation_items WHERE quotation_id=?`,[quoteId]); await connection.execute(`DELETE FROM quotations WHERE id=?`,[quoteId]); }
      if (projectId) { await connection.execute(`DELETE FROM expenses WHERE studio_project_id=?`,[projectId]); await connection.execute(`DELETE FROM project_external_assignments WHERE project_id=?`,[projectId]); await connection.execute(`DELETE FROM studio_project_status_history WHERE project_id=?`,[projectId]); await connection.execute(`DELETE FROM studio_project_services WHERE project_id=?`,[projectId]); await connection.execute(`DELETE FROM studio_projects WHERE id=?`,[projectId]); }
      if (serviceId) await connection.execute(`DELETE FROM studio_services WHERE id=?`,[serviceId]);
      if (partyId) { await connection.execute(`DELETE FROM party_roles WHERE party_id=?`,[partyId]); await connection.execute(`DELETE FROM parties WHERE id=?`,[partyId]); }
      await connection.execute(`DELETE FROM audit_logs WHERE module_code='studio_analytics' AND new_values LIKE ?`,[`%${tag}%`]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    await storageService.delete(reportStorageKey);
  }
}
run().then(() => pool.end()).catch(async error => { console.error(error); await pool.end(); process.exit(1); });
