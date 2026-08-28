/**
 * Storage infrastructure smoke test. Deliberately has NO database dependency — it only exercises
 * StorageService/LocalStorageDriver and the static route wiring in `app.ts`, so it can run in any
 * environment (including one with no MySQL reachable) and still give a real pass/fail signal.
 */
import { randomUUID } from 'crypto';
import { access, mkdir, rm, utimes, writeFile } from 'fs/promises';
import http from 'http';
import path from 'path';
import type { AddressInfo } from 'net';
import app from '../src/app';
import { AppError } from '../src/shared/errors/AppError';
import {
  getStoragePolicy, localStorageDriver, PUBLIC_CATEGORIES, STORAGE_ROOT,
  storageCleanupService, storageService, TEMP_DIR, validateAgainstPolicy,
} from '../src/shared/storage';

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const cleanupKeys: string[] = [];
async function trackedTempFile(content: Buffer, extension: string): Promise<string> {
  await mkdir(TEMP_DIR, { recursive: true });
  const tempPath = path.join(TEMP_DIR, `smoke-${randomUUID()}${extension}`);
  await writeFile(tempPath, content);
  return tempPath;
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

async function expectAppError(work: () => Promise<unknown>, expectedCode: string, label: string) {
  try {
    await work();
  } catch (error) {
    if (error instanceof AppError && error.code === expectedCode) return;
    throw new Error(`${label}: expected AppError(${expectedCode}) but got ${(error as Error)?.message || error}`);
  }
  throw new Error(`${label}: expected an error but the call succeeded.`);
}

async function testRootAndTemp() {
  await mkdir(STORAGE_ROOT, { recursive: true });
  await mkdir(TEMP_DIR, { recursive: true });
  await access(STORAGE_ROOT);
  await access(TEMP_DIR);
  const probe = path.join(TEMP_DIR, `.smoke-probe-${process.pid}`);
  await writeFile(probe, 'ok');
  await rm(probe);
  console.log('[PASS] root — storage root and temp directory exist and are writable.');
}

async function testCreateReadExistsStat() {
  const designPolicy = getStoragePolicy('product_design');
  const tempPath = await trackedTempFile(Buffer.from('hello storage smoke'), '.stl');
  const key = storageService.buildKey('designs', '.stl', 'smoke-test');
  const stored = await storageService.saveUploadedFile({
    tempFilePath: tempPath, originalName: 'model.stl', mimeType: null, policy: designPolicy, key,
  });
  cleanupKeys.push(stored.key);
  assert(stored.key === key, 'saveUploadedFile did not honor the requested key.');
  await access(localStorageDriver.absolutePath(key));
  console.log('[PASS] create — StorageService.saveUploadedFile wrote a physical file.');

  const content = await streamToBuffer(storageService.createReadStream(key));
  assert(content.toString('utf8') === 'hello storage smoke', 'Read content did not match what was written.');
  console.log('[PASS] read — createReadStream returned the exact bytes written.');

  assert((await storageService.exists(key)) === true, 'exists() returned false for a file that was just created.');
  console.log('[PASS] exists — exists() reports true for a known file.');

  const info = await storageService.stat(key);
  assert(info.sizeBytes === Buffer.byteLength('hello storage smoke'), 'stat() returned the wrong size.');
  console.log('[PASS] stat — stat() reports the correct size.');

  return key;
}

async function testReplaceAndDelete(oldKey: string) {
  const designPolicy = getStoragePolicy('product_design');
  const tempPath = await trackedTempFile(Buffer.from('replacement content'), '.stl');
  const newKey = storageService.buildKey('designs', '.stl', 'smoke-test');
  const stored = await storageService.saveUploadedFile({
    tempFilePath: tempPath, originalName: 'model-v2.stl', mimeType: null, policy: designPolicy, key: newKey,
  });
  cleanupKeys.push(stored.key);
  assert(await storageService.exists(stored.key), 'New file missing right after a replace-style save.');
  // Canonical replace order: new file is secured first, old file removed only afterwards.
  await storageService.deleteQuietly(oldKey);
  assert(!(await storageService.exists(oldKey)), 'Old file was not removed after the replacement was secured.');
  assert(await storageService.exists(stored.key), 'New file disappeared after removing the old one.');
  console.log('[PASS] replace — new file secured before the old file was removed.');

  await storageService.delete(stored.key);
  assert(!(await storageService.exists(stored.key)), 'File still exists after delete().');
  console.log('[PASS] delete — delete() removed the file.');

  await storageService.delete(stored.key); // must not throw
  console.log('[PASS] double delete — deleting an already-missing file is idempotent.');
}

async function testTraversal() {
  const malicious = [
    '../../etc/passwd', '..\\..\\secret', '/etc/passwd', 'C:\\Windows\\system32\\config',
    '\\\\server\\share\\x', 'designs/../../../etc/passwd', '..', 'a/../../b', 'a/..%2f..%2fb',
    'designs/\0hidden',
  ];
  for (const key of malicious) {
    await expectAppError(() => storageService.exists(key), 'STORAGE_PATH_INVALID', `traversal key "${key}"`);
  }
  console.log(`[PASS] traversal — ${malicious.length} malicious keys (POSIX, Windows, absolute, UNC, NUL) were all rejected.`);
}

async function testOversizeAndWrongExtension() {
  const avatarPolicy = getStoragePolicy('avatar');
  await expectAppError(
    async () => validateAgainstPolicy(avatarPolicy, {
      originalName: 'big.jpg', mimeType: 'image/jpeg', sizeBytes: avatarPolicy.maxSizeBytes + 1, headBuffer: Buffer.alloc(16),
    }),
    'FILE_TOO_LARGE', 'oversize avatar',
  );
  console.log('[PASS] oversize — a file over the policy limit is rejected as FILE_TOO_LARGE.');

  await expectAppError(
    async () => validateAgainstPolicy(avatarPolicy, {
      originalName: 'virus.exe', mimeType: 'application/octet-stream', sizeBytes: 10, headBuffer: Buffer.alloc(16),
    }),
    'FILE_TYPE_NOT_ALLOWED', 'wrong extension',
  );
  console.log('[PASS] wrong extension — an unsupported extension is rejected as FILE_TYPE_NOT_ALLOWED.');
}

async function assertRemoved(filePath: string, label: string) {
  try {
    await access(filePath);
    throw new Error(`${label}: file still exists at ${filePath}.`);
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function testDisguisedFile() {
  const avatarPolicy = getStoragePolicy('avatar');
  const fakeJpeg = Buffer.from('this is not actually a jpeg, just renamed');
  const tempPath = await trackedTempFile(fakeJpeg, '.jpg');
  await expectAppError(
    () => storageService.saveUploadedFile({
      tempFilePath: tempPath, originalName: 'malware-renamed.jpg', mimeType: 'image/jpeg', policy: avatarPolicy, key: storageService.buildKey('avatars', '.jpg'),
    }),
    'FILE_CONTENT_INVALID', 'disguised executable',
  );
  await assertRemoved(tempPath, 'Temp file was not removed after a failed validation');
  console.log('[PASS] disguised file — a renamed non-image fails signature validation and its temp file is removed.');
}

async function testCleanup() {
  await mkdir(TEMP_DIR, { recursive: true });
  const staleFile = path.join(TEMP_DIR, `smoke-stale-${randomUUID()}.tmp`);
  await writeFile(staleFile, 'stale');
  const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
  await utimes(staleFile, old, old);

  const freshFile = path.join(TEMP_DIR, `smoke-fresh-${randomUUID()}.tmp`);
  await writeFile(freshFile, 'fresh');

  const result = await storageCleanupService.cleanupTempFiles(24 * 60 * 60 * 1000);
  assert(result.removed >= 1, 'Cleanup did not report removing the stale fixture.');
  await assertRemoved(staleFile, 'Stale temp fixture was not removed by cleanup');
  await access(freshFile); // must still exist
  await rm(freshFile);
  console.log('[PASS] cleanup — a 48h-old temp fixture was removed; a fresh one was left alone.');
}

async function testPublicAndPrivateRoutes() {
  assert(PUBLIC_CATEGORIES.size === 1 && PUBLIC_CATEGORIES.has('avatars'), 'Only "avatars" should be a publicly-mounted category.');

  const avatarKey = storageService.buildKey('avatars', '.webp');
  await storageService.finalizeBuffer(avatarKey, Buffer.from('fake webp bytes'));
  cleanupKeys.push(avatarKey);
  const privateKey = storageService.buildKey('products', '.jpg', 'smoke-private');
  await storageService.finalizeBuffer(privateKey, Buffer.from('confidential product photo'));
  cleanupKeys.push(privateKey);

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const get = (urlPath: string) => new Promise<number>((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: urlPath }, res => { res.resume(); resolve(res.statusCode || 0); }).on('error', reject);
  });

  try {
    const avatarStatus = await get(`/uploads/${avatarKey}`);
    assert(avatarStatus === 200, `Public avatar route returned ${avatarStatus}, expected 200.`);
    console.log('[PASS] public — the avatar test file is reachable through the whitelisted /uploads/avatars route.');

    const privateStatus = await get(`/uploads/${privateKey}`);
    assert(privateStatus !== 200, `Private product photo was reachable via a guessed /uploads URL (status ${privateStatus}).`);
    console.log('[PASS] private — a private category is NOT reachable through any blanket /uploads route.');

    const rootStatus = await get('/uploads/');
    assert(rootStatus !== 200, `The storage root itself is statically browsable (status ${rootStatus}).`);
    console.log('[PASS] static leak — there is no blanket express.static(STORAGE_ROOT) mount.');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function run() {
  await testRootAndTemp();
  const firstKey = await testCreateReadExistsStat();
  await testReplaceAndDelete(firstKey);
  await testTraversal();
  await testOversizeAndWrongExtension();
  await testDisguisedFile();
  await testCleanup();
  await testPublicAndPrivateRoutes();
  console.log('\nStorage smoke test passed.');
}

run()
  .catch(async error => {
    console.error('\nStorage smoke test FAILED:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const key of cleanupKeys) await storageService.deleteQuietly(key);
  });
