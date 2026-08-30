import assert from 'node:assert/strict';
import { readFile, stat, utimes } from 'node:fs/promises';
import path from 'node:path';
import { storageService } from '../src/shared/storage';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const asUpload = (filePath: string, originalname: string, mimetype: string, size: number) => ({ path: filePath, originalname, mimetype, size }) as Express.Multer.File;
const expectError = async (work: () => Promise<unknown>, code: string) => {
  try { await work(); assert.fail(`Expected ${code}`); }
  catch (error: any) { assert.equal(error.code, code); }
};

async function main() {
  await storageService.bootstrap();
  assert(storageService.root.endsWith(path.join('server', 'uploads')), 'storage root is not server/uploads');
  const tempInfo = await stat(storageService.tempDirectory); assert(tempInfo.isDirectory(), 'temp directory was not created');

  const first = await storageService.writeBuffer('avatar', jpeg, 'smoke-avatar.jpg');
  assert(await storageService.exists(first.key), 'created file is missing');
  const streamed = await new Promise<Buffer>(async (resolve, reject) => {
    const chunks: Buffer[] = []; const stream = await storageService.driver.createReadStream(first.key);
    stream.on('data', chunk => chunks.push(Buffer.from(chunk))); stream.on('end', () => resolve(Buffer.concat(chunks))); stream.on('error', reject);
  });
  assert.deepEqual(streamed, jpeg, 'streamed bytes changed');
  assert.equal((await storageService.stat(first.key)).size, jpeg.length, 'stat size mismatch');

  const replacement = await storageService.writeBuffer('avatar', jpeg, 'smoke-avatar-replacement.jpg');
  await storageService.delete(first.key);
  assert(!(await storageService.exists(first.key)) && await storageService.exists(replacement.key), 'replace/delete lifecycle failed');
  await storageService.delete(replacement.key); await storageService.delete(replacement.key);
  assert(!(await storageService.exists(replacement.key)), 'idempotent delete failed');

  for (const candidate of ['../escape', '..\\escape', 'C:/escape', '/absolute']) {
    await expectError(async () => storageService.safeResolve(candidate), 'INVALID_STORAGE_PATH');
  }

  const wrong = await storageService.stageBuffer(jpeg, 'wrong.exe');
  await expectError(() => storageService.saveUploadedFile('avatar', asUpload(wrong, 'wrong.exe', 'application/octet-stream', jpeg.length)), 'UNSUPPORTED_FILE_TYPE');
  await assert.rejects(stat(wrong), { code: 'ENOENT' }, 'rejected temp file was not removed');

  const disguised = await storageService.stageBuffer(Buffer.from('MZ executable'), 'photo.jpg');
  await expectError(() => storageService.saveUploadedFile('avatar', asUpload(disguised, 'photo.jpg', 'image/jpeg', 13)), 'INVALID_FILE_CONTENT');
  await assert.rejects(stat(disguised), { code: 'ENOENT' }, 'disguised temp file was not removed');

  const overSize = Buffer.alloc(5 * 1024 * 1024 + 1, 0);
  const overSizeTemp = await storageService.stageBuffer(overSize, 'large.jpg');
  await expectError(() => storageService.saveUploadedFile('avatar', asUpload(overSizeTemp, 'large.jpg', 'image/jpeg', overSize.length)), 'FILE_TOO_LARGE');

  const stale = await storageService.stageBuffer(Buffer.from('stale'), 'stale.tmp');
  const yesterday = new Date(Date.now() - 2 * 60 * 60 * 1000); await utimes(stale, yesterday, yesterday);
  const cleaned = await storageService.cleanupTemp(60 * 60 * 1000);
  assert(cleaned.removed >= 1, 'stale temp file was not cleaned');
  await assert.rejects(readFile(stale), { code: 'ENOENT' });
  assert.equal(storageService.getPublicUrl('avatars/example.webp'), '/uploads/avatars/example.webp');
  assert.equal(storageService.getPublicUrl('profile-banners/example.webp'), '/uploads/profile-banners/example.webp');
  await expectError(async () => { storageService.getPublicUrl('documents/private.pdf'); }, 'FILE_NOT_PUBLIC');
  console.log('Storage smoke: PASS');
}

main().catch(error => { console.error('Storage smoke: FAIL', error); process.exitCode = 1; });
