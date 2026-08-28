/**
 * Migrates physical files (and their DB storage keys) from the pre-StorageService locations into
 * the canonical `server/uploads/<category>/` layout:
 *
 *   server/uploads/orders/<id>/<file>                       -> order-attachments/<id>/<file>
 *   server/storage/studio/projects/<id>/deliverables/<file> -> project-deliverables/<id>/<file>
 *   server/storage/studio/billing/quotations/<file>         -> quotations/<file>
 *   server/storage/studio/billing/invoices/<file>           -> invoices/<file>
 *
 * `server/uploads/products/` and `server/uploads/designs/` already match the canonical layout and
 * are intentionally left untouched (see storage-policy.registry.ts).
 *
 * DRY RUN by default — prints the full plan (old path, new path, DB owner) without touching
 * anything. Pass --execute to actually copy files, update the owning DB row, and remove the old
 * file. Safe to re-run: a file already present at its new location with a matching size is
 * treated as already migrated.
 *
 * Usage:
 *   npm run storage:migrate
 *   npm run storage:migrate -- --execute
 */
import { copyFile, mkdir, readdir, rm, stat } from 'fs/promises';
import path from 'path';
import { pool } from '../src/config/database';
import { SERVER_ROOT, STORAGE_ROOT, toStorageKey } from '../src/shared/storage';

const EXECUTE = process.argv.includes('--execute');
const LEGACY_UPLOAD_ROOT = path.join(SERVER_ROOT, 'uploads');
const LEGACY_STORAGE_ROOT = path.join(SERVER_ROOT, 'storage');

interface MigrationPlan {
  source: string;
  oldAbsolutePath: string;
  oldKey: string;
  newKey: string;
  newAbsolutePath: string;
  dbTable: string;
  dbColumn: string;
  mirrorInvoicePdfPath?: boolean;
}

async function listFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error: any) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) out.push(full);
    }
  }
  await walk(root);
  return out;
}

async function planOrderAttachments(): Promise<MigrationPlan[]> {
  const oldRoot = path.join(LEGACY_UPLOAD_ROOT, 'orders');
  const files = await listFiles(oldRoot);
  return files.map(absolute => {
    const oldKey = toStorageKey(path.relative(LEGACY_UPLOAD_ROOT, absolute));
    const newKey = oldKey.replace(/^orders\//, 'order-attachments/');
    return {
      source: 'craft-orders attachment', oldAbsolutePath: absolute, oldKey, newKey,
      newAbsolutePath: path.join(STORAGE_ROOT, newKey), dbTable: 'order_attachments', dbColumn: 'storage_path',
    };
  });
}

async function planProjectDeliverables(): Promise<MigrationPlan[]> {
  const oldRoot = path.join(LEGACY_STORAGE_ROOT, 'studio', 'projects');
  const files = await listFiles(oldRoot);
  return files.map(absolute => {
    const oldKey = toStorageKey(path.relative(LEGACY_STORAGE_ROOT, absolute));
    const match = /^studio\/projects\/(\d+)\/deliverables\/(.+)$/.exec(oldKey);
    const newKey = match ? `project-deliverables/${match[1]}/${match[2]}` : `project-deliverables/_unmatched/${path.basename(absolute)}`;
    return {
      source: 'studio project deliverable', oldAbsolutePath: absolute, oldKey, newKey,
      newAbsolutePath: path.join(STORAGE_ROOT, newKey), dbTable: 'project_deliverables', dbColumn: 'storage_path',
    };
  });
}

async function planBillingDocuments(): Promise<MigrationPlan[]> {
  const oldRoot = path.join(LEGACY_STORAGE_ROOT, 'studio', 'billing');
  const files = await listFiles(oldRoot);
  return files.map(absolute => {
    const oldKey = toStorageKey(path.relative(LEGACY_STORAGE_ROOT, absolute));
    const newKey = oldKey.replace(/^studio\/billing\//, '');
    return {
      source: 'studio billing document', oldAbsolutePath: absolute, oldKey, newKey,
      newAbsolutePath: path.join(STORAGE_ROOT, newKey), dbTable: 'documents', dbColumn: 'storage_path',
      mirrorInvoicePdfPath: newKey.startsWith('invoices/'),
    };
  });
}

async function migrateOne(plan: MigrationPlan): Promise<string> {
  try {
    const sourceStat = await stat(plan.oldAbsolutePath);
    const existingStat = await stat(plan.newAbsolutePath).catch(() => null);
    if (!existingStat || existingStat.size !== sourceStat.size) {
      await mkdir(path.dirname(plan.newAbsolutePath), { recursive: true });
      await copyFile(plan.oldAbsolutePath, plan.newAbsolutePath);
      const copiedStat = await stat(plan.newAbsolutePath);
      if (copiedStat.size !== sourceStat.size) throw new Error(`size mismatch after copy (${copiedStat.size} vs ${sourceStat.size})`);
    }
    await pool.execute(`UPDATE \`${plan.dbTable}\` SET \`${plan.dbColumn}\` = ? WHERE \`${plan.dbColumn}\` = ?`, [plan.newKey, plan.oldKey]);
    if (plan.mirrorInvoicePdfPath) {
      await pool.execute('UPDATE invoices SET pdf_path = ? WHERE pdf_path = ?', [plan.newKey, plan.oldKey]);
    }
    await rm(plan.oldAbsolutePath);
    return 'migrated';
  } catch (error) {
    return `FAILED: ${(error as Error)?.message || error}`;
  }
}

async function run() {
  const plans = [
    ...(await planOrderAttachments()),
    ...(await planProjectDeliverables()),
    ...(await planBillingDocuments()),
  ];

  console.log(`Local storage migration — ${EXECUTE ? 'EXECUTING' : 'DRY RUN (pass --execute to apply)'}\n`);
  console.log(`Found ${plans.length} legacy file(s) under old storage roots.\n`);

  let migrated = 0;
  let failed = 0;
  for (const plan of plans) {
    console.log(`[${plan.source}]`);
    console.log(`  old: ${plan.oldAbsolutePath}`);
    console.log(`  new: ${plan.newAbsolutePath}`);
    console.log(`  db:  ${plan.dbTable}.${plan.dbColumn}${plan.mirrorInvoicePdfPath ? ' (+ invoices.pdf_path)' : ''}`);
    if (EXECUTE) {
      const status = await migrateOne(plan);
      console.log(`  status: ${status}`);
      if (status === 'migrated') migrated += 1; else failed += 1;
    } else {
      console.log('  status: planned (dry run)');
    }
    console.log('');
  }

  if (!plans.length) {
    console.log('Nothing to migrate — no files found under the legacy roots (server/uploads/orders, server/storage/studio/...).');
  } else if (EXECUTE) {
    console.log(`Migration complete: ${migrated} migrated, ${failed} failed.`);
    console.log(failed === 0
      ? 'All legacy files migrated. server/storage/ can be safely removed once you confirm nothing else references it.'
      : 'Some files failed to migrate — re-run after investigating before removing server/storage/.');
  } else {
    console.log('Dry run complete. Re-run with --execute to apply.');
  }
}

run()
  .then(() => pool.end())
  .catch(async error => {
    console.error('Migration failed:', error);
    await pool.end();
    process.exitCode = 1;
  });
