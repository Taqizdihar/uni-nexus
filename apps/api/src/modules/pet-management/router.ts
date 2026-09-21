import { Router } from 'express';
import multer from 'multer';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { parseId, requireAuth } from '../../middleware/auth.js';
import { createPetSchema, updatePetSchema } from './validation.js';
import { assertCto, createPet, deletePetFrame, getPetImageForDownload, listManagedPets, petStorage, reorderPetFrames, replacePetFrame, updatePet, uploadPetFrame } from './service.js';
import { prisma } from '../../lib/prisma.js';

export const petManagementRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.MAX_UPLOAD_SIZE, files: 1, fields: 4 } });

petManagementRouter.get('/pet-management/:petId/image', requireAuth, async (request, response, next) => {
  const petId = parseId(request.params.petId, 'pet ID');
  const record = await getPetImageForDownload(petId);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  response.setHeader('Cache-Control', 'private, max-age=300');
  response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  response.type('image/avif');
  response.sendFile(petStorage.absolutePath(record.key), { dotfiles: 'deny' }, (error) => {
    // A legacy file can disappear independently of the database. Preserve the
    // normal image fallback contract instead of turning ENOENT into HTTP 500.
    if (error && !response.headersSent) next(new AppError(404, 'Foto Pet tidak ditemukan.', 'PET_IMAGE_NOT_FOUND'));
  });
});

petManagementRouter.use('/pet-management', requireAuth, async (request, _response, next) => {
  try {
    await assertCto(prisma, request.auth!.userId);
    next();
  } catch (error) { next(error); }
});

petManagementRouter.get('/pet-management', async (request, response) => {
  response.json({ data: await listManagedPets(request.auth!.userId) });
});
petManagementRouter.post('/pet-management', async (request, response) => {
  const input = createPetSchema.parse(request.body ?? {});
  response.status(201).json({ data: await createPet(request.auth!.userId, input) });
});
petManagementRouter.patch('/pet-management/:petId', async (request, response) => {
  const input = updatePetSchema.parse(request.body ?? {});
  response.json({ data: await updatePet(request.auth!.userId, parseId(request.params.petId, 'pet ID'), input) });
});
petManagementRouter.post('/pet-management/:petId/frames', upload.single('file'), async (request, response) => {
  if (!request.file) throw new AppError(422, 'Pilih foto Pet berformat AVIF.', 'PET_IMAGE_REQUIRED');
  const duration = request.body?.duration_ms === undefined || request.body.duration_ms === '' ? undefined : Number(request.body.duration_ms);
  const frameIndex = request.body?.frame_index === undefined || request.body.frame_index === '' ? undefined : Number(request.body.frame_index);
  response.status(201).json({ data: await uploadPetFrame(request.auth!.userId, parseId(request.params.petId, 'pet ID'), request.file, { state: request.body?.state, duration_ms: duration, frame_index: frameIndex }) });
});
petManagementRouter.put('/pet-management/:petId/frames/:frameId', upload.single('file'), async (request, response) => {
  if (!request.file) throw new AppError(422, 'Pilih foto Pet berformat AVIF.', 'PET_IMAGE_REQUIRED');
  const duration = request.body?.duration_ms === undefined || request.body.duration_ms === '' ? undefined : Number(request.body.duration_ms);
  response.json({ data: await replacePetFrame(request.auth!.userId, parseId(request.params.petId, 'pet ID'), parseId(request.params.frameId, 'frame ID'), request.file, duration) });
});
petManagementRouter.delete('/pet-management/:petId/frames/:frameId', async (request, response) => {
  await deletePetFrame(request.auth!.userId, parseId(request.params.petId, 'pet ID'), parseId(request.params.frameId, 'frame ID'));
  response.status(204).end();
});
petManagementRouter.put('/pet-management/:petId/frames/reorder', async (request, response) => {
  const state = String(request.body?.state ?? 'IDLE');
  const frameIds = Array.isArray(request.body?.frame_ids) ? request.body.frame_ids.map((id: unknown) => parseId(String(id), 'frame ID')) : [];
  await reorderPetFrames(request.auth!.userId, parseId(request.params.petId, 'pet ID'), state, frameIds);
  response.status(204).end();
});
// Backwards-compatible endpoint: it now appends an IDLE frame to pet_media.
petManagementRouter.post('/pet-management/:petId/image', upload.single('file'), async (request, response) => {
  if (!request.file) throw new AppError(422, 'Pilih foto Pet berformat AVIF.', 'PET_IMAGE_REQUIRED');
  response.status(201).json({ data: await uploadPetFrame(request.auth!.userId, parseId(request.params.petId, 'pet ID'), request.file) });
});
