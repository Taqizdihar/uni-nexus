/**
 * Storage Doctor — a fast, DB-free health check for the local storage configuration. Intended to
 * be run after deploying/configuring a new environment, or whenever "something is wrong with
 * uploads" is suspected, before diving into individual domain modules.
 *
 * Usage: npm run storage:doctor
 */
import { randomUUID } from 'crypto';
import { access, mkdir, rm, writeFile } from 'fs/promises';
import path from 'path';
import { AppError } from '../src/shared/errors/AppError';
import { env } from '../src/config/env';
import {
  SERVER_ROOT, STORAGE_CATEGORIES, STORAGE_ROOT, TEMP_DIR, storageService,
} from '../src/shared/storage';

interface CheckResult { name: string; ok: boolean; detail?: string; }
const results: CheckResult[] = [];

async function check(name: string, work: () => Promise<void>) {
  try {
    await work();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, detail: (error as Error)?.message || String(error) });
  }
}

async function run() {
  console.log(`Storage Doctor — driver=${env.STORAGE_DRIVER} root=${STORAGE_ROOT}\n`);

  await check('Storage root is inside server/ (local mode expects this)', async () => {
    const relative = path.relative(SERVER_ROOT, STORAGE_ROOT);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Storage root "${STORAGE_ROOT}" is not inside the server directory "${SERVER_ROOT}".`);
    }
  });

  await check('Storage root exists and is writable', async () => {
    await mkdir(STORAGE_ROOT, { recursive: true });
    const probe = path.join(STORAGE_ROOT, `.doctor-probe-${process.pid}`);
    await writeFile(probe, 'ok');
    await rm(probe);
  });

  await check('Temp staging directory exists and is writable', async () => {
    await mkdir(TEMP_DIR, { recursive: true });
    const probe = path.join(TEMP_DIR, `.doctor-probe-${process.pid}`);
    await writeFile(probe, 'ok');
    await rm(probe);
  });

  for (const category of STORAGE_CATEGORIES) {
    await check(`Category directory "${category}" is creatable`, async () => {
      await mkdir(path.join(STORAGE_ROOT, category), { recursive: true });
      await access(path.join(STORAGE_ROOT, category));
    });
  }

  await check('Path traversal is rejected (../, ..\\, absolute, UNC)', async () => {
    const attempts = ['../../etc/passwd', '..\\secret', '/etc/passwd', 'C:\\Windows\\system32', '\\\\host\\share\\x'];
    for (const attempt of attempts) {
      try {
        storageService.absolutePath(attempt);
        throw new Error(`Traversal key "${attempt}" was NOT rejected.`);
      } catch (error) {
        if (!(error instanceof AppError) || error.code !== 'STORAGE_PATH_INVALID') throw error;
      }
    }
  });

  await check('Read / write / delete round-trip works', async () => {
    const key = `temp/doctor-${randomUUID()}.txt`;
    await storageService.finalizeBuffer(key, Buffer.from('storage doctor'));
    if (!(await storageService.exists(key))) throw new Error('File missing right after write.');
    const stat = await storageService.stat(key);
    if (stat.sizeBytes !== Buffer.byteLength('storage doctor')) throw new Error('Unexpected file size.');
    await storageService.delete(key);
    if (await storageService.exists(key)) throw new Error('File still exists after delete.');
  });

  console.log('Results:\n');
  let failed = 0;
  for (const result of results) {
    console.log(`  ${result.ok ? 'OK  ' : 'FAIL'}  ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
    if (!result.ok) failed += 1;
  }
  console.log(`\n${results.length - failed}/${results.length} checks passed.`);
  if (failed > 0) process.exitCode = 1;
}

run().catch(error => {
  console.error('Storage Doctor crashed:', error);
  process.exitCode = 1;
});
