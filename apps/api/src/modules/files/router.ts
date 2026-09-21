import { Router } from 'express';
import multer from 'multer';
import type { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { hasPermission, parseId } from '../../middleware/auth.js';
import { audit } from '../../services/audit.js';
import { createImageStorageService, LocalStorageService, validateUpload } from '../../services/storage.js';

export const filesRouter = Router();
const storage = new LocalStorageService(env.LOCAL_STORAGE_PATH);
const imageStorage = createImageStorageService();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.MAX_UPLOAD_SIZE, files: 1, fields: 8, fieldSize: 2048 } });
type Resource = 'request-files' | 'design-assets' | 'product-assets' | 'product-images';
function resourceName(value: unknown): Resource {
  if (!['request-files', 'design-assets', 'product-assets', 'product-images'].includes(String(value))) throw new AppError(404, 'File resource not found.');
  return value as Resource;
}
async function findFile(db: Prisma.TransactionClient, resource: Resource, id: bigint, workspaceId: bigint) {
  switch (resource) {
    case 'request-files': return db.request_files.findFirst({ where: { id, custom_requests: { workspace_id: workspaceId } } });
    case 'design-assets': return db.design_assets.findFirst({ where: { id, workspace_id: workspaceId } });
    case 'product-assets': return db.product_assets.findFirst({ where: { id, products: { workspace_id: workspaceId } } });
    case 'product-images': return db.product_images.findFirst({ where: { id, products: { workspace_id: workspaceId } } });
  }
}
filesRouter.post('/:resource/:id', (req, _res, next) => {
  const resource = resourceName(req.params.resource);
  const permission = resource === 'product-images' ? 'sales' : 'design';
  if (!hasPermission(req.workspace!.role, permission) && !(resource === 'request-files' && hasPermission(req.workspace!.role, 'sales'))) throw new AppError(403, 'Your role cannot upload files in this module.');
  next();
}, upload.single('file'), async (req, res) => {
  const resource = resourceName(req.params.resource);
  const recordId = parseId(req.params.id);
  const context = { workspaceId: req.workspace!.id, userId: req.auth!.userId };
  if (!req.file) throw new AppError(422, 'Choose a file to upload.');
  if (resource === 'design-assets' || resource === 'product-assets')
    throw new AppError(422, 'Berkas model harus disimpan sebagai Tautan Google Drive HTTPS, bukan diunggah sebagai biner.', 'GOOGLE_DRIVE_LINK_REQUIRED');
  const validated = validateUpload(req.file, env.MAX_UPLOAD_SIZE, true);
  const existing = await findFile(prisma, resource, recordId, context.workspaceId);
  if (!existing) throw new AppError(404, 'File record not found. Create the file metadata first.');
  const targetId = resource === 'request-files'
    ? (existing as { custom_request_id: bigint }).custom_request_id
    : (existing as { product_id: bigint }).product_id;
  const stored = await imageStorage.upload({ bytes: req.file.buffer, localScope: context.workspaceId, private: resource === 'request-files', assetFolder: resource === 'request-files' ? `requests/request-${targetId.toString()}/references` : `products/product-${targetId.toString()}/images` });
  try {
    const record = await prisma.$transaction(async (tx) => {
      const old = await findFile(tx, resource, recordId, context.workspaceId);
      if (!old) throw new AppError(404, 'File record not found.');
      const common = { file_name: validated.filename, storage_provider: resource === 'request-files' ? 'CLOUDINARY_AUTHENTICATED' : 'CLOUDINARY', bucket_name: null, object_key: stored.key };
      const details = { mime_type: validated.mime, file_size_bytes: BigInt(stored.size), uploaded_by_user_id: context.userId };
      let updated;
      switch (resource) {
        case 'request-files': updated = await tx.request_files.update({ where: { id: recordId }, data: { ...common, ...details } }); break;
        case 'product-images': updated = await tx.product_images.update({ where: { id: recordId }, data: { ...common, public_url: stored.publicUrl } }); break;
      }
      await audit(tx, context, resource === 'request-files' ? 'REQUEST_REFERENCE_IMAGE_UPLOADED' : 'PRODUCT_IMAGE_UPLOADED', resource.replaceAll('-', '_'), recordId, old, updated);
      return updated;
    });
    res.json({ data: { id: record.id.toString(), file_name: validated.filename, size: stored.size, mime_type: validated.mime, download_url: `/api/v1/files/${resource}/${record.id.toString()}/download` } });
  } catch (error) { await imageStorage.remove(stored.key).catch(() => undefined); throw error; }
});
filesRouter.get(['/:resource/:id', '/:resource/:id/download'], async (req, res, next) => {
  const resource = resourceName(req.params.resource);
  if (!hasPermission(req.workspace!.role, 'read')) throw new AppError(403, 'Your role cannot read files.');
  const record = await findFile(prisma, resource, parseId(req.params.id), req.workspace!.id);
  if (!record || !record.object_key) throw new AppError(404, 'Uploaded file not found.');
  if (record.storage_provider === 'CLOUDINARY_AUTHENTICATED') {
    const url = imageStorage.authenticatedUrl(record.object_key);
    if (!url) throw new AppError(404, 'Berkas referensi privat tidak tersedia pada penyimpanan lokal.', 'FILE_NOT_FOUND');
    res.redirect(url); return;
  }
  if (record.storage_provider === 'CLOUDINARY' && 'public_url' in record && typeof record.public_url === 'string') { res.redirect(record.public_url); return; }
  if (record.storage_provider !== 'LOCAL' || !record.object_key.startsWith(`${req.workspace!.id.toString()}/`)) throw new AppError(404, 'Uploaded file not found.');
  if (!await storage.exists(record.object_key)) throw new AppError(404, 'File is missing from local storage.');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.download(storage.absolutePath(record.object_key), record.file_name ?? 'download', { headers: { 'Content-Type': 'application/octet-stream' } }, (error) => { if (error) next(error); });
});
