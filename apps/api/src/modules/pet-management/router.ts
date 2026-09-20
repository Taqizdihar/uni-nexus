import { Router } from 'express';
import multer from 'multer';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { parseId, requireAuth } from '../../middleware/auth.js';
import { createPetSchema, updatePetSchema } from './validation.js';
import { assertCto, createPet, getPetImageForDownload, listManagedPets, petStorage, updatePet, uploadPetImage } from './service.js';
import { prisma } from '../../lib/prisma.js';

export const petManagementRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.MAX_UPLOAD_SIZE, files: 1, fields: 0 } });

petManagementRouter.get('/pet-management/:petId/image', requireAuth, async (request, response, next) => {
  const petId = parseId(request.params.petId, 'pet ID');
  const record = await getPetImageForDownload(petId);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'private, max-age=300');
  response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  response.type('image/avif');
  response.sendFile(petStorage.absolutePath(record.key), (error) => { if (error) next(error); });
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
petManagementRouter.post('/pet-management/:petId/image', upload.single('file'), async (request, response) => {
  if (!request.file) throw new AppError(422, 'Pilih foto Pet berformat AVIF.', 'PET_IMAGE_REQUIRED');
  response.json({ data: await uploadPetImage(request.auth!.userId, parseId(request.params.petId, 'pet ID'), request.file) });
});
