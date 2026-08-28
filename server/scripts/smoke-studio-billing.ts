import { randomBytes } from 'node:crypto';
import { pool } from '../src/config/database';
import { studioInvoiceService } from '../src/modules/studio-billing/studio-invoice.service';
import { studioBillingRepository } from '../src/modules/studio-billing/studio-billing.repository';
import { getStudioBillingBusinessUnit } from '../src/modules/studio-billing/studio-billing.shared';
import { studioQuotationService } from '../src/modules/studio-billing/studio-quotation.service';
import { studioQuotationTemplateService } from '../src/modules/studio-billing/studio-quotation-template.service';
import { studioClientService } from '../src/shared/party/studio-client.service';
import { storageService } from '../src/shared/storage';

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new Error(message); };
const token = randomBytes(4).toString('hex').toUpperCase();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const days = (offset: number) => { const date = new Date(`${today}T00:00:00`); date.setDate(date.getDate() + offset); return date.toISOString().slice(0, 10); };

async function billingActor() {
  const [rows]: any = await pool.execute(
    `SELECT DISTINCT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN role_permissions rp ON rp.role_id = ur.role_id JOIN permissions p ON p.id = rp.permission_id
     WHERE u.deleted_at IS NULL AND u.status_code = 'active' AND u.approval_status_code = 'approved' AND p.code = 'studio.billing.write' LIMIT 1`,
  );
  assert(rows.length, 'No active user has studio.billing.write.');
  return Number(rows[0].id);
}

/** Remove only unreferenced metadata/files left by an interrupted Billing smoke run. */
async function cleanupOrphanBillingArtifacts() {
  const [orphanDocuments]: any = await pool.execute(
    `SELECT d.id, d.storage_path FROM documents d
     LEFT JOIN quotations q ON d.entity_type = 'quotation' AND q.id = d.entity_id
     LEFT JOIN invoices i ON d.entity_type = 'invoice' AND i.id = d.entity_id
     WHERE (d.storage_path LIKE 'quotations/%' OR d.storage_path LIKE 'invoices/%')
       AND ((d.entity_type = 'quotation' AND q.id IS NULL) OR (d.entity_type = 'invoice' AND i.id IS NULL))`,
  );
  if (orphanDocuments.length) {
    await pool.execute(`DELETE FROM documents WHERE id IN (${orphanDocuments.map(() => '?').join(',')})`, orphanDocuments.map((document: any) => document.id));
  }
  await Promise.all(orphanDocuments.map((document: any) => storageService.delete(String(document.storage_path))));
}

async function run() {
  const studio = await getStudioBillingBusinessUnit(); const actor = await billingActor();
  await cleanupOrphanBillingArtifacts();
  let partyId = 0; let projectId = 0; let serviceId = 0; let quoteId = 0; let duplicateQuoteId = 0; let templateId = 0; let invoiceId = 0; let voidInvoiceId = 0; let paidInvoiceId = 0; let badInvoiceId = 0; const documentPaths: string[] = [];
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const client = await studioClientService.createStudioClient(connection, { display_name: `Client Smoke Billing ${token}`, party_kind: 'company', email: `billing-${token.toLowerCase()}@example.test` }, studio);
      partyId = client.id;
      const [service]: any = await connection.execute(`INSERT INTO studio_services (business_unit_id, code, name, description, pricing_model, base_price, unit_label, is_active) VALUES (?, ?, ?, ?, 'hourly', 250000, 'jam', 1)`, [studio.id, `SVC-BILL-${token}`, `Video Editing Smoke ${token}`, 'Service fixture Billing']);
      serviceId = Number(service.insertId);
      const [project]: any = await connection.execute(`INSERT INTO studio_projects (business_unit_id, project_code, client_party_id, project_name, status_code, priority_code, currency_code, contract_value) VALUES (?, ?, ?, ?, 'lead', 'normal', 'IDR', 5000000)`, [studio.id, `SMK-BILL-${token}`, partyId, `Project Billing ${token}`]);
      projectId = Number(project.insertId);
      await connection.execute(`INSERT INTO studio_project_services (project_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 20, 250000, 5000000)`, [projectId, serviceId, 'Video Editing snapshot']);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }

    const template = await studioQuotationTemplateService.create({ name: `Template Dokumentasi ${token}`, default_valid_days: 14, terms_text: 'Ketentuan fixture.', items: [{ service_id: serviceId, description: 'Video Editing', quantity: 1, unit_price: 250000 }] }, actor);
    templateId = template.id;
    const templateDetail = await studioQuotationTemplateService.get(templateId);
    assert(templateDetail.items.length === 1 && templateDetail.is_active, 'Quotation template was not persisted correctly.');

    const quote = await studioQuotationService.create({ party_id: partyId, project_id: projectId, issue_date: today, valid_until: days(14), currency_code: 'IDR', discount_amount: 0, tax_amount: 0, terms: 'Pembayaran sesuai kesepakatan.', items: [{ service_id: serviceId, description: 'Video Editing', quantity: 20, unit_price: 250000, discount_amount: 0 }] }, actor);
    quoteId = quote.id;
    assert(quote.quotation_number === `QTN-${String(quoteId).padStart(6, '0')}`, 'Quotation numbering did not use safe inserted-ID numbering.');
    assert(quote.total_amount === 5000000, 'Quotation total is incorrect.');
    await pool.execute('UPDATE studio_services SET base_price = 300000 WHERE id = ?', [serviceId]);
    const quoteDetailBeforeSend = await studioQuotationService.detail(quoteId);
    assert(quoteDetailBeforeSend.items[0].unit_price === 250000, 'Catalog price change rewrote quotation snapshot.');
    await studioQuotationService.send(quoteId, actor, true);
    const sent = await studioQuotationService.detail(quoteId);
    assert(sent.quotation.status_code === 'sent' && sent.document, 'Sending quotation did not create official PDF metadata.');
    const [projectStatus]: any = await pool.execute('SELECT status_code FROM studio_projects WHERE id = ?', [projectId]);
    assert(projectStatus[0]?.status_code === 'quotation', 'Sent quotation did not safely advance lead project to quotation.');
    let locked = false;
    try { await studioQuotationService.update(quoteId, { items: [{ description: 'Not allowed', quantity: 1, unit_price: 1 }] }, actor); } catch (error: any) { locked = error?.code === 'QUOTATION_COMMERCIAL_LOCKED'; }
    assert(locked, 'Sent quotation could still be commercially edited.');
    const duplicate = await studioQuotationService.duplicate(quoteId, actor); duplicateQuoteId = duplicate.id;
    assert(duplicate.quotation_number.startsWith('QTN-'), 'Duplicate quotation did not create a safe new number.');
    await studioQuotationService.accept(quoteId, actor, true);
    const accepted = await studioQuotationService.detail(quoteId);
    assert(accepted.quotation.status_code === 'accepted' && accepted.quotation.accepted_at, 'Quotation acceptance did not persist accepted state.');
    const [approvedProject]: any = await pool.execute('SELECT status_code FROM studio_projects WHERE id = ?', [projectId]);
    assert(approvedProject[0]?.status_code === 'approved', 'Accepted quotation did not use canonical project approval transition.');
    let secondAcceptedBlocked = false;
    await studioQuotationService.send(duplicateQuoteId, actor, true);
    try { await studioQuotationService.accept(duplicateQuoteId, actor, true); } catch (error: any) { secondAcceptedBlocked = error?.code === 'PROJECT_ALREADY_HAS_ACCEPTED_QUOTATION'; }
    assert(secondAcceptedBlocked, 'A second accepted quotation for one project was not blocked.');

    const invoice = await studioInvoiceService.create({ party_id: partyId, quotation_id: quoteId, source_type: 'studio_project', source_id: projectId, issue_date: today, due_date: days(14), discount_amount: 0, payment_terms: '14 hari', items: [{ service_id: serviceId, description: 'Termin pertama Video Editing', quantity: 1, unit_price: 2500000, discount_amount: 0, tax_amount: 0 }], schedules: [{ label: 'DP', due_date: days(7), amount: 1000000 }, { label: 'Termin 2', due_date: days(14), amount: 1000000 }, { label: 'Pelunasan', due_date: days(21), amount: 500000 }] }, actor);
    invoiceId = invoice.id;
    assert(invoice.invoice_number === `INV-${String(invoiceId).padStart(6, '0')}`, 'Invoice numbering did not use safe inserted-ID numbering.');
    await studioInvoiceService.issue(invoiceId, actor);
    const issued = await studioInvoiceService.detail(invoiceId);
    assert(issued.invoice.status_code === 'issued' && issued.invoice.paid_amount === 0 && issued.invoice.balance_due === 2500000 && issued.document, 'Invoice issue did not create the expected non-cash commercial document state.');
    assert(issued.schedules.length === 3 && issued.schedules.reduce((sum, schedule) => sum + schedule.amount, 0) === 2500000, 'Payment schedules were not persisted correctly.');
    const issueAgain = await studioInvoiceService.issue(invoiceId, actor);
    assert(issueAgain.already_issued, 'Invoice issue is not idempotent.');
    const outstanding = await studioBillingRepository.listOutstanding({ limit: 50 }, studio);
    assert(outstanding.items.some(item => item.id === invoiceId && item.balance_due === 2500000), 'Issued unpaid invoice is missing from outstanding view.');

    const bad = await studioInvoiceService.create({ party_id: partyId, source_type: 'studio_project', source_id: projectId, issue_date: today, due_date: days(14), discount_amount: 0, items: [{ description: 'Overinvoice fixture', quantity: 1, unit_price: 3000000, discount_amount: 0, tax_amount: 0 }], schedules: [] }, actor);
    badInvoiceId = bad.id;
    let overInvoiceBlocked = false;
    try { await studioInvoiceService.issue(badInvoiceId, actor); } catch (error: any) { overInvoiceBlocked = error?.code === 'BILLING_OVER_INVOICE'; }
    assert(overInvoiceBlocked, 'Project/quotation over-invoice protection did not block excess billing.');

    const voidInvoice = await studioInvoiceService.create({ party_id: partyId, source_type: 'manual', source_id: null, issue_date: today, due_date: days(14), discount_amount: 0, items: [{ description: 'Void fixture', quantity: 1, unit_price: 50000, discount_amount: 0, tax_amount: 0 }], schedules: [] }, actor);
    voidInvoiceId = voidInvoice.id;
    await studioInvoiceService.issue(voidInvoiceId, actor);
    await studioInvoiceService.void(voidInvoiceId, 'Fixture void tanpa pembayaran.', actor);
    const voidDetail = await studioInvoiceService.detail(voidInvoiceId);
    assert(voidDetail.invoice.status_code === 'void', 'Unpaid invoice could not be safely voided.');

    const paidInvoice = await studioInvoiceService.create({ party_id: partyId, source_type: 'manual', source_id: null, issue_date: today, due_date: days(14), discount_amount: 0, items: [{ description: 'Payment read-only fixture', quantity: 1, unit_price: 75000, discount_amount: 0, tax_amount: 0 }], schedules: [] }, actor);
    paidInvoiceId = paidInvoice.id;
    await studioInvoiceService.issue(paidInvoiceId, actor);
    await pool.execute(`INSERT INTO payments (organization_id, business_unit_id, payment_code, invoice_id, party_id, payment_direction, payment_date, amount, currency_code, status_code, notes) VALUES (?, ?, ?, ?, ?, 'in', UTC_TIMESTAMP(3), 1000, 'IDR', 'confirmed', 'Fixture canonical payment')`, [studio.organizationId, studio.id, `PAY-BILL-${token}`, paidInvoiceId, partyId]);
    const paidDetail = await studioInvoiceService.detail(paidInvoiceId);
    assert(paidDetail.payments.length === 1, 'Canonical payment is not visible read-only on invoice detail.');
    let paidVoidBlocked = false;
    try { await studioInvoiceService.void(paidInvoiceId, 'Should be blocked.', actor); } catch (error: any) { paidVoidBlocked = error?.code === 'INVOICE_HAS_PAYMENTS'; }
    assert(paidVoidBlocked, 'Invoice with canonical payment could be voided through Billing.');
    console.log('Studio Billing smoke test passed.');
  } finally {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const invoiceIds = [invoiceId, voidInvoiceId, paidInvoiceId, badInvoiceId].filter(Boolean);
      const quoteIds = [quoteId, duplicateQuoteId].filter(Boolean);
      if (invoiceIds.length) {
        const marks = invoiceIds.map(() => '?').join(',');
        const [documents]: any = await connection.execute(`SELECT storage_path FROM documents WHERE entity_type = 'invoice' AND entity_id IN (${marks})`, invoiceIds);
        documentPaths.push(...documents.map((document: any) => String(document.storage_path)));
        await connection.execute(`DELETE FROM payments WHERE invoice_id IN (${marks})`, invoiceIds);
        await connection.execute(`DELETE FROM invoice_payment_schedules WHERE invoice_id IN (${marks})`, invoiceIds);
        await connection.execute(`DELETE FROM invoice_items WHERE invoice_id IN (${marks})`, invoiceIds);
        await connection.execute(`DELETE FROM documents WHERE entity_type = 'invoice' AND entity_id IN (${marks})`, invoiceIds);
        await connection.execute(`DELETE FROM audit_logs WHERE module_code = 'studio_billing' AND entity_type = 'invoice' AND entity_id IN (${marks})`, invoiceIds);
        await connection.execute(`DELETE FROM domain_events WHERE module_code = 'studio_billing' AND entity_type = 'invoice' AND entity_id IN (${marks})`, invoiceIds);
        await connection.execute(`DELETE FROM invoices WHERE id IN (${marks})`, invoiceIds);
      }
      if (quoteIds.length) {
        const marks = quoteIds.map(() => '?').join(',');
        const [documents]: any = await connection.execute(`SELECT storage_path FROM documents WHERE entity_type = 'quotation' AND entity_id IN (${marks})`, quoteIds);
        documentPaths.push(...documents.map((document: any) => String(document.storage_path)));
        await connection.execute(`DELETE FROM quotation_items WHERE quotation_id IN (${marks})`, quoteIds);
        await connection.execute(`DELETE FROM documents WHERE entity_type = 'quotation' AND entity_id IN (${marks})`, quoteIds);
        await connection.execute(`DELETE FROM audit_logs WHERE module_code = 'studio_billing' AND entity_type = 'quotation' AND entity_id IN (${marks})`, quoteIds);
        await connection.execute(`DELETE FROM domain_events WHERE module_code = 'studio_billing' AND entity_type = 'quotation' AND entity_id IN (${marks})`, quoteIds);
        await connection.execute(`DELETE FROM quotations WHERE id IN (${marks})`, quoteIds);
      }
      if (templateId) { await connection.execute(`DELETE FROM quotation_template_items WHERE template_id = ?`, [templateId]); await connection.execute(`DELETE FROM audit_logs WHERE module_code = 'studio_billing' AND entity_type = 'quotation_template' AND entity_id = ?`, [templateId]); await connection.execute(`DELETE FROM quotation_templates WHERE id = ?`, [templateId]); }
      if (projectId) { await connection.execute('DELETE FROM studio_project_services WHERE project_id = ?', [projectId]); await connection.execute('DELETE FROM studio_project_status_history WHERE project_id = ?', [projectId]); await connection.execute(`DELETE FROM audit_logs WHERE module_code = 'studio_projects' AND entity_type = 'studio_project' AND entity_id = ?`, [projectId]); await connection.execute(`DELETE FROM domain_events WHERE module_code = 'studio_projects' AND entity_type = 'studio_project' AND entity_id = ?`, [projectId]); await connection.execute('DELETE FROM studio_projects WHERE id = ?', [projectId]); }
      if (serviceId) await connection.execute('DELETE FROM studio_services WHERE id = ?', [serviceId]);
      if (partyId) { await connection.execute('DELETE FROM party_roles WHERE party_id = ?', [partyId]); await connection.execute('DELETE FROM parties WHERE id = ?', [partyId]); }
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    for (const storagePath of documentPaths) await storageService.delete(storagePath);
  }
}

run().then(() => pool.end()).catch(async error => { console.error(error); await pool.end(); process.exit(1); });
