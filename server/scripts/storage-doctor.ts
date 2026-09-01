import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../src/config/database';
import { storageService } from '../src/shared/storage';

type Reference = { source: string; key: string | null };
const references: Array<{ source: string; sql: string }> = [
  { source: 'organizations.logo_path', sql: 'SELECT logo_path AS storage_key FROM organizations WHERE logo_path IS NOT NULL' },
  { source: 'users.avatar_path', sql: 'SELECT avatar_path AS storage_key FROM users WHERE avatar_path IS NOT NULL' },
  { source: 'users.profile_banner_path', sql: 'SELECT profile_banner_path AS storage_key FROM users WHERE profile_banner_path IS NOT NULL' },
  { source: 'products.image_path', sql: 'SELECT image_path AS storage_key FROM products WHERE image_path IS NOT NULL' },
  { source: 'design_files.storage_path', sql: 'SELECT storage_path AS storage_key FROM design_files WHERE storage_path IS NOT NULL' },
  { source: 'order_attachments.storage_path', sql: 'SELECT storage_path AS storage_key FROM order_attachments WHERE storage_path IS NOT NULL' },
  { source: 'project_deliverables.storage_path', sql: 'SELECT storage_path AS storage_key FROM project_deliverables WHERE storage_path IS NOT NULL' },
  { source: 'documents.storage_path', sql: 'SELECT storage_path AS storage_key FROM documents WHERE storage_path IS NOT NULL' },
  { source: 'invoices.pdf_path', sql: 'SELECT pdf_path AS storage_key FROM invoices WHERE pdf_path IS NOT NULL' },
  { source: 'expenses.receipt_path', sql: 'SELECT receipt_path AS storage_key FROM expenses WHERE receipt_path IS NOT NULL' },
  { source: 'supplier_invoices.document_path', sql: 'SELECT document_path AS storage_key FROM supplier_invoices WHERE document_path IS NOT NULL' },
  { source: 'report_exports.storage_path', sql: 'SELECT storage_path AS storage_key FROM report_exports WHERE storage_path IS NOT NULL' },
];

const listFiles = async (directory: string, prefix = ''): Promise<string[]> => {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'temp' || entry.name === '.gitkeep') continue;
    const next = path.join(directory, entry.name); const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await listFiles(next, key)); else if (entry.isFile()) result.push(key);
  }
  return result;
};

async function main() {
  await storageService.bootstrap();
  const [fileColumns]: any = await pool.execute(
    `SELECT TABLE_NAME,COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME IN ('logo_path','avatar_path','profile_banner_path','image_path','storage_path','document_path','receipt_path','pdf_path')
     ORDER BY TABLE_NAME,COLUMN_NAME`,
  );
  const all: Reference[] = [];
  for (const source of references) {
    try {
      const [rows]: any = await pool.execute(source.sql);
      all.push(...rows.map((row: any) => ({ source: source.source, key: row.storage_key ? String(row.storage_key).replace(/\\/g, '/') : null })));
    } catch (error: any) {
      if (error?.code !== 'ER_NO_SUCH_TABLE') throw error;
      console.warn(`Skipping absent optional table: ${source.source}`);
    }
  }
  const referenced = new Set(all.map(item => item.key).filter((value): value is string => Boolean(value)));
  const missing: Reference[] = [];
  for (const row of all) if (row.key && !(await storageService.exists(row.key).catch(() => false))) missing.push(row);
  const files = await listFiles(storageService.root);
  const orphans = files.filter(key => !referenced.has(key));
  console.log(JSON.stringify({ mode: 'dry-run', root: storageService.root, file_columns: fileColumns, database_references: all.length, references: all, files: files.length, missing, orphans }, null, 2));
  await pool.end();
  process.exitCode = missing.length || orphans.length ? 2 : 0;
}

main().catch(async error => { console.error('Storage doctor failed:', error); await pool.end(); process.exitCode = 1; });
