import { Router } from 'express';
import multer from 'multer';
import type { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { hasPermission, parseId } from '../../middleware/auth.js';
import { audit } from '../../services/audit.js';
import { LocalStorageService, validateUpload } from '../../services/storage.js';

export const filesRouter = Router();
const storage = new LocalStorageService(env.LOCAL_STORAGE_PATH);
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
  const validated = validateUpload(req.file, env.MAX_UPLOAD_SIZE, resource === 'product-images');
  if (!await findFile(prisma, resource, recordId, context.workspaceId)) throw new AppError(404, 'File record not found. Create the file metadata first.');
  const stored = await storage.save(context.workspaceId, req.file.buffer);
  try {
    const record = await prisma.$transaction(async (tx) => {
      const old = await findFile(tx, resource, recordId, context.workspaceId);
      if (!old) throw new AppError(404, 'File record not found.');
      const common = { file_name: validated.filename, storage_provider: 'LOCAL', bucket_name: null, object_key: stored.key };
      const details = { mime_type: validated.mime, file_size_bytes: BigInt(stored.size), uploaded_by_user_id: context.userId };
      let updated;
      switch (resource) {
        case 'request-files': updated = await tx.request_files.update({ where: { id: recordId }, data: { ...common, ...details } }); break;
        case 'design-assets': updated = await tx.design_assets.update({ where: { id: recordId }, data: { ...common, ...details } }); break;
        case 'product-assets': updated = await tx.product_assets.update({ where: { id: recordId }, data: { ...common, uploaded_by_user_id: context.userId, is_internal_only: true } }); break;
        case 'product-images': updated = await tx.product_images.update({ where: { id: recordId }, data: common }); break;
      }
      await audit(tx, context, 'FILE_UPLOADED', resource.replaceAll('-', '_'), recordId, old, updated);
      return updated;
    });
    res.json({ data: { id: record.id.toString(), file_name: validated.filename, size: stored.size, mime_type: validated.mime, download_url: `/api/v1/files/${resource}/${record.id.toString()}/download` } });
  } catch (error) { await storage.remove(stored.key); throw error; }
});
filesRouter.get(['/:resource/:id', '/:resource/:id/download'], async (req, res, next) => {
  const resource = resourceName(req.params.resource);
  if (!hasPermission(req.workspace!.role, 'read')) throw new AppError(403, 'Your role cannot read files.');
  const record = await findFile(prisma, resource, parseId(req.params.id), req.workspace!.id);
  if (!record || record.storage_provider !== 'LOCAL' || !record.object_key || !record.object_key.startsWith(`${req.workspace!.id.toString()}/`)) throw new AppError(404, 'Uploaded file not found.');
  if (!await storage.exists(record.object_key)) throw new AppError(404, 'File is missing from local storage.');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.download(storage.absolutePath(record.object_key), record.file_name ?? 'download', { headers: { 'Content-Type': 'application/octet-stream' } }, (error) => { if (error) next(error); });
});
