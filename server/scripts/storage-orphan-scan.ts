/**
 * Storage Orphan Scanner — compares the physical files under `server/uploads/` against every
 * domain table that owns a storage key, and reports:
 *   - physical files with NO database reference (orphans)
 *   - database references whose physical file is MISSING
 *
 * Defaults to a DRY RUN. Pass --delete to actually remove orphaned physical files (DB rows are
 * never touched by this script either way — missing-file rows are a data-integrity question for
 * the owning domain, not something this scanner fixes).
 *
 * Usage:
 *   npm run storage:orphan-scan
 *   npm run storage:orphan-scan -- --delete
 */
import { readdir, unlink } from 'fs/promises';
import path from 'path';
import { pool } from '../src/config/database';
import { STORAGE_ROOT, TEMP_STORAGE_KEY, toStorageKey } from '../src/shared/storage';

const DELETE_MODE = process.argv.includes('--delete');

/** Every domain table/column that currently owns a storage key. Add a new row here whenever a module adopts StorageService. */
const REFERENCE_SOURCES: Array<{ table: string; column: string; where?: string }> = [
  { table: 'users', column: 'avatar_path' },
  { table: 'products', column: 'image_path' },
  { table: 'design_files', column: 'storage_path' },
  { table: 'order_attachments', column: 'storage_path' },
  { table: 'project_deliverables', column: 'storage_path' },
  { table: 'documents', column: 'storage_path' },
  { table: 'invoices', column: 'pdf_path' },
  { table: 'expenses', column: 'receipt_path' },
  { table: 'supplier_invoices', column: 'document_path' },
];

function normalizeKey(raw: string): string {
  return raw.trim().replace(/\\/g, '/').replace(/^\/+/, '');
}

async function walk(dir: string, base: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, base, out);
    } else if (entry.isFile() && entry.name !== '.gitkeep') {
      out.push(toStorageKey(path.relative(base, full)));
    }
  }
}

async function collectPhysicalFiles(): Promise<string[]> {
  const files: string[] = [];
  const rootEntries = await readdir(STORAGE_ROOT, { withFileTypes: true }).catch(() => []);
  for (const entry of rootEntries) {
    // Temp is transient staging, not a domain category — never part of orphan accounting.
    if (entry.name === TEMP_STORAGE_KEY) continue;
    if (entry.isDirectory()) await walk(path.join(STORAGE_ROOT, entry.name), STORAGE_ROOT, files);
  }
  return files;
}

async function collectDbReferences(): Promise<Map<string, { table: string; column: string }[]>> {
  const references = new Map<string, { table: string; column: string }[]>();
  for (const source of REFERENCE_SOURCES) {
    const sql = `SELECT \`${source.column}\` AS value FROM \`${source.table}\` WHERE \`${source.column}\` IS NOT NULL AND \`${source.column}\` <> ''${source.where ? ` AND ${source.where}` : ''}`;
    const [rows]: any = await pool.execute(sql);
    for (const row of rows) {
      const rawValue = String(row.value || '');
      // A handful of legacy rows may still carry a `/uploads/...`-style value from before an
      // upload endpoint existed at all — strip that prefix so it can still be matched/reported.
      const value = rawValue.startsWith('/uploads/') ? rawValue.slice('/uploads/'.length) : rawValue;
      const key = normalizeKey(value);
      if (!key) continue;
      const list = references.get(key) || [];
      list.push({ table: source.table, column: source.column });
      references.set(key, list);
    }
  }
  return references;
}

async function run() {
  console.log(`Storage Orphan Scanner — ${DELETE_MODE ? 'DELETE MODE' : 'DRY RUN (pass --delete to remove orphans)'}\n`);

  const [physicalFiles, dbReferences] = await Promise.all([collectPhysicalFiles(), collectDbReferences()]);
  const physicalSet = new Set(physicalFiles);

  const orphans = physicalFiles.filter(key => !dbReferences.has(key));
  const missing: Array<{ key: string; owners: { table: string; column: string }[] }> = [];
  for (const [key, owners] of dbReferences) {
    if (!physicalSet.has(key)) missing.push({ key, owners });
  }

  console.log(`Physical files scanned: ${physicalFiles.length}`);
  console.log(`Database references scanned: ${dbReferences.size}\n`);

  console.log(`Orphaned physical files (no DB reference): ${orphans.length}`);
  for (const key of orphans) console.log(`  - ${key}`);

  console.log(`\nDatabase references with a missing physical file: ${missing.length}`);
  for (const entry of missing) {
    const owners = entry.owners.map(o => `${o.table}.${o.column}`).join(', ');
    console.log(`  - ${entry.key}  (referenced by: ${owners})`);
  }

  if (DELETE_MODE && orphans.length) {
    console.log(`\nDeleting ${orphans.length} orphaned file(s)...`);
    for (const key of orphans) {
      const absolute = path.join(STORAGE_ROOT, key);
      await unlink(absolute).catch(error => console.warn(`  could not delete ${key}:`, error?.message || error));
    }
    console.log('Done.');
  } else if (orphans.length) {
    console.log('\nDry run only — no files were deleted. Re-run with --delete to remove the orphans above.');
  }

  console.log(`\nSummary: ${physicalFiles.length} physical files, ${orphans.length} orphaned, ${missing.length} missing-on-disk.`);
}

run()
  .then(() => pool.end())
  .catch(async error => {
    console.error('Storage orphan scan failed:', error);
    await pool.end();
    process.exitCode = 1;
  });
