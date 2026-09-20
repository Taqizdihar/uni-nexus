import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { hasPermission, parseId } from '../../middleware/auth.js';
import { audit } from '../../services/audit.js';
import { LocalStorageService, validateUpload } from '../../services/storage.js';

/** Purpose-built photo endpoints keep binary uploads outside the generic JSON resource engine. */
export const printerRouter = Router();
const storage = new LocalStorageService(env.LOCAL_STORAGE_PATH);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_SIZE, files: 1, fields: 2, fieldSize: 2048 },
});

const requireCto: RequestHandler = (request, _response, next) => {
  if (request.workspace?.role.toUpperCase() !== 'CTO') {
    next(new AppError(403, 'Hanya CTO yang dapat mengelola foto printer.', 'PRINTER_CTO_ONLY'));
    return;
  }
  next();
}

async function printerForWorkspace(id: bigint, workspaceId: bigint) {
  return prisma.printers.findFirst({ where: { id, workspace_id: workspaceId } });
}

const catalogSchema = z.object({
  name: z.string().trim().min(1).max(120), brand: z.string().trim().max(120).nullable().optional(), model: z.string().trim().max(120).nullable().optional(),
  build_volume_x_mm: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(), build_volume_y_mm: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(), build_volume_z_mm: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  default_nozzle_size_mm: z.string().regex(/^\d+(\.\d{1,3})?$/).nullable().optional(), is_active: z.boolean().optional(),
}).strict();
const unitSchema = z.object({ printer_catalog_id: z.string().regex(/^[1-9]\d*$/), serial_number: z.string().trim().max(120).optional(), location: z.string().trim().max(190).optional(), status: z.enum(['IDLE','QUEUED','PRINTING','MAINTENANCE','OFFLINE','ERROR']).optional(), last_maintenance_at: z.string().datetime().optional() }).strict();
const publicCatalog = (catalog: { id: bigint; photo_public_url: string | null; photo_storage_provider: string | null; [key: string]: unknown }) => ({ ...catalog, photo_url: catalog.photo_public_url ?? (catalog.photo_storage_provider === 'LOCAL' ? `/api/v1/printers/catalog/${catalog.id.toString()}/photo` : null) });

printerRouter.get('/catalog', async (request, response) => {
  const catalogs = await prisma.printer_catalogs.findMany({ where: { workspace_id: request.workspace!.id, is_active: true }, orderBy: { name: 'asc' } });
  response.json({ data: catalogs.map(publicCatalog) });
});

printerRouter.post('/catalog', requireCto, async (request, response) => {
  const input = catalogSchema.parse(request.body);
  const context = { workspaceId: request.workspace!.id, userId: request.auth!.userId };
  const catalog = await prisma.$transaction(async (tx) => {
    const created = await tx.printer_catalogs.create({ data: { ...input, workspace_id: context.workspaceId } });
    await audit(tx, context, 'CREATE', 'printer_catalogs', created.id, undefined, created);
    return created;
  });
  response.status(201).json({ data: publicCatalog(catalog) });
});

printerRouter.patch('/catalog/:id', requireCto, async (request, response) => {
  const id = parseId(request.params.id, 'ID data printer'); const input = catalogSchema.partial().parse(request.body);
  const context = { workspaceId: request.workspace!.id, userId: request.auth!.userId };
  const catalog = await prisma.$transaction(async (tx) => {
    const previous = await tx.printer_catalogs.findFirst({ where: { id, workspace_id: context.workspaceId } });
    if (!previous) throw new AppError(404, 'Data printer tidak ditemukan.', 'NOT_FOUND');
    const updated = await tx.printer_catalogs.update({ where: { id }, data: input });
    await audit(tx, context, 'UPDATE', 'printer_catalogs', id, previous, updated);
    return updated;
  });
  response.json({ data: publicCatalog(catalog) });
});

printerRouter.post('/units', async (request, response) => {
  if (!hasPermission(request.workspace!.role, 'production')) throw new AppError(403, 'Anda tidak memiliki akses untuk menambahkan printer.', 'FORBIDDEN');
  const input = unitSchema.parse(request.body); const catalogId = BigInt(input.printer_catalog_id);
  const context = { workspaceId: request.workspace!.id, userId: request.auth!.userId };
  const unit = await prisma.$transaction(async (tx) => {
    const catalog = await tx.printer_catalogs.findFirst({ where: { id: catalogId, workspace_id: context.workspaceId, is_active: true } });
    if (!catalog) throw new AppError(422, 'Pilih data printer aktif yang tersedia.', 'INVALID_PRINTER_CATALOG');
    const serial = input.serial_number?.trim() || null;
    if (serial && await tx.printers.findFirst({ where: { workspace_id: context.workspaceId, serial_number: serial }, select: { id: true } })) throw new AppError(409, 'Nomor serial tersebut sudah digunakan oleh printer lain.', 'DUPLICATE_PRINTER_SERIAL');
    const created = await tx.printers.create({ data: {
      workspace_id: context.workspaceId, printer_catalog_id: catalog.id, printer_code: `PRN-${randomUUID().slice(0, 8).toUpperCase()}`,
      name: catalog.name, brand: catalog.brand, model: catalog.model, build_volume_x_mm: catalog.build_volume_x_mm, build_volume_y_mm: catalog.build_volume_y_mm, build_volume_z_mm: catalog.build_volume_z_mm, default_nozzle_size_mm: catalog.default_nozzle_size_mm,
      serial_number: serial, location: input.location?.trim() || null, status: input.status ?? 'IDLE', last_maintenance_at: input.last_maintenance_at ? new Date(input.last_maintenance_at) : null, is_active: true,
    } });
    await audit(tx, context, 'CREATE', 'printers', created.id, undefined, created);
    return created;
  });
  response.status(201).json({ data: unit });
});

printerRouter.get('/catalog/:id/photo', async (request, response, next) => {
  if (!hasPermission(request.workspace!.role, 'read')) throw new AppError(403, 'Anda tidak memiliki akses untuk melihat foto printer.', 'FORBIDDEN');
  const id = parseId(request.params.id, 'ID data printer');
  const catalog = await prisma.printer_catalogs.findFirst({ where: { id, workspace_id: request.workspace!.id } });
  if (!catalog || catalog.photo_storage_provider !== 'LOCAL' || !catalog.photo_object_key || !catalog.photo_object_key.startsWith(`${request.workspace!.id.toString()}/`) || !await storage.exists(catalog.photo_object_key)) throw new AppError(404, 'Foto printer tidak ditemukan.', 'PHOTO_NOT_FOUND');
  response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Cache-Control', 'private, max-age=60'); response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  response.type(catalog.photo_mime_type ?? 'application/octet-stream'); response.sendFile(storage.absolutePath(catalog.photo_object_key), (error) => { if (error) next(error); });
});

printerRouter.post('/catalog/:id/photo', requireCto, upload.single('file'), async (request, response) => {
  const id = parseId(request.params.id, 'ID data printer'); const context = { workspaceId: request.workspace!.id, userId: request.auth!.userId };
  if (!request.file) throw new AppError(422, 'Pilih foto printer untuk diunggah.', 'PHOTO_REQUIRED');
  const validated = validateUpload(request.file, env.MAX_UPLOAD_SIZE, true); const stored = await storage.save(context.workspaceId, request.file.buffer);
  try {
    const previous = await prisma.$transaction(async (tx) => {
      const old = await tx.printer_catalogs.findFirst({ where: { id, workspace_id: context.workspaceId } }); if (!old) throw new AppError(404, 'Data printer tidak ditemukan.', 'NOT_FOUND');
      const updated = await tx.printer_catalogs.update({ where: { id }, data: { photo_original_file_name: validated.filename, photo_mime_type: validated.mime, photo_file_size_bytes: BigInt(stored.size), photo_storage_provider: 'LOCAL', photo_bucket_name: null, photo_object_key: stored.key, photo_public_url: null } });
      await audit(tx, context, 'PRINTER_CATALOG_PHOTO_UPDATED', 'printer_catalogs', id, old, updated); return old;
    });
    if (previous.photo_storage_provider === 'LOCAL' && previous.photo_object_key && previous.photo_object_key !== stored.key) await storage.remove(previous.photo_object_key);
    response.json({ data: { photo_url: `/api/v1/printers/catalog/${id.toString()}/photo` } });
  } catch (error) { await storage.remove(stored.key); throw error; }
});

printerRouter.delete('/catalog/:id/photo', requireCto, async (request, response) => {
  const id = parseId(request.params.id, 'ID data printer');
  const context = { workspaceId: request.workspace!.id, userId: request.auth!.userId };
  const previous = await prisma.$transaction(async (tx) => {
    const existing = await tx.printer_catalogs.findFirst({ where: { id, workspace_id: context.workspaceId } });
    if (!existing) throw new AppError(404, 'Data printer tidak ditemukan.', 'NOT_FOUND');
    const updated = await tx.printer_catalogs.update({ where: { id }, data: {
      photo_original_file_name: null, photo_mime_type: null, photo_file_size_bytes: null,
      photo_storage_provider: null, photo_bucket_name: null, photo_object_key: null,
      photo_public_url: null, photo_alt_text: null,
    } });
    await audit(tx, context, 'PRINTER_CATALOG_PHOTO_REMOVED', 'printer_catalogs', id, existing, updated);
    return existing;
  });
  if (previous.photo_storage_provider === 'LOCAL' && previous.photo_object_key)
    await storage.remove(previous.photo_object_key);
  response.status(204).end();
});

printerRouter.post('/:id/photo', requireCto, upload.single('file'), async (request, response) => {
  const id = parseId(request.params.id, 'ID printer');
  const context = { workspaceId: request.workspace!.id, userId: request.auth!.userId };
  if (!request.file) throw new AppError(422, 'Pilih foto printer untuk diunggah.', 'PHOTO_REQUIRED');
  const validated = validateUpload(request.file, env.MAX_UPLOAD_SIZE, true);
  const printer = await printerForWorkspace(id, context.workspaceId);
  if (!printer)
    throw new AppError(404, 'Printer tidak ditemukan.', 'NOT_FOUND');
  if (printer.printer_catalog_id)
    throw new AppError(409, 'Foto unit dikelola melalui Data Printer.', 'PRINTER_CATALOG_PHOTO_ONLY');
  const stored = await storage.save(context.workspaceId, request.file.buffer);
  try {
    const old = await prisma.$transaction(async (tx) => {
      const previous = await tx.printers.findFirst({ where: { id, workspace_id: context.workspaceId } });
      if (!previous) throw new AppError(404, 'Printer tidak ditemukan.', 'NOT_FOUND');
      const updated = await tx.printers.update({
        where: { id },
        data: {
          photo_original_file_name: validated.filename,
          photo_mime_type: validated.mime,
          photo_file_size_bytes: BigInt(stored.size),
          photo_storage_provider: 'LOCAL',
          photo_bucket_name: null,
          photo_object_key: stored.key,
          photo_public_url: null,
        },
      });
      await audit(tx, context, 'PRINTER_PHOTO_UPDATED', 'printers', id, previous, updated);
      return previous;
    });
    if (old.photo_storage_provider === 'LOCAL' && old.photo_object_key && old.photo_object_key !== stored.key)
      await storage.remove(old.photo_object_key);
    response.json({ data: { photo_url: `/api/v1/printers/${id.toString()}/photo` } });
  } catch (error) {
    await storage.remove(stored.key);
    throw error;
  }
});

printerRouter.delete('/:id/photo', requireCto, async (request, response) => {
  const id = parseId(request.params.id, 'ID printer');
  const context = { workspaceId: request.workspace!.id, userId: request.auth!.userId };
  const previous = await prisma.$transaction(async (tx) => {
    const existing = await tx.printers.findFirst({ where: { id, workspace_id: context.workspaceId } });
    if (!existing) throw new AppError(404, 'Printer tidak ditemukan.', 'NOT_FOUND');
    if (existing.printer_catalog_id)
      throw new AppError(409, 'Foto unit dikelola melalui Data Printer.', 'PRINTER_CATALOG_PHOTO_ONLY');
    const updated = await tx.printers.update({ where: { id }, data: {
      photo_original_file_name: null, photo_mime_type: null, photo_file_size_bytes: null,
      photo_storage_provider: null, photo_bucket_name: null, photo_object_key: null,
      photo_public_url: null, photo_alt_text: null,
    } });
    await audit(tx, context, 'PRINTER_PHOTO_REMOVED', 'printers', id, existing, updated);
    return existing;
  });
  if (previous.photo_storage_provider === 'LOCAL' && previous.photo_object_key)
    await storage.remove(previous.photo_object_key);
  response.status(204).end();
});

printerRouter.get('/:id/photo', async (request, response, next) => {
  if (!hasPermission(request.workspace!.role, 'read'))
    throw new AppError(403, 'Anda tidak memiliki akses untuk melihat foto printer.', 'FORBIDDEN');
  const id = parseId(request.params.id, 'ID printer');
  const printer = await printerForWorkspace(id, request.workspace!.id);
  const catalog = printer?.printer_catalog_id
    ? await prisma.printer_catalogs.findFirst({ where: { id: printer.printer_catalog_id, workspace_id: request.workspace!.id } })
    : null;
  const photo = catalog ?? printer;
  if (!photo || photo.photo_storage_provider !== 'LOCAL' || !photo.photo_object_key ||
    !photo.photo_object_key.startsWith(`${request.workspace!.id.toString()}/`) ||
    !await storage.exists(photo.photo_object_key))
    throw new AppError(404, 'Foto printer tidak ditemukan.', 'PHOTO_NOT_FOUND');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'private, max-age=60');
  response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  response.type(photo.photo_mime_type ?? 'application/octet-stream');
  response.sendFile(storage.absolutePath(photo.photo_object_key), (error) => { if (error) next(error); });
});
