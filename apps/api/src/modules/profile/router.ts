import { Router } from 'express';
import { getOwnDeactivationRequest, submitDeactivationRequest, withdrawDeactivationRequest } from '../account-lifecycle/service.js';
import { selfRequestSchema, withdrawSchema } from '../account-lifecycle/validation.js';
import multer from 'multer';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { parseId, requireAuth } from '../../middleware/auth.js';
import {
  assetTypeParam,
  defaultWorkspaceSchema,
  petSchema,
  presenceSchema,
  reorderTagsSchema,
  tagSchema,
  updateProfileSchema,
} from './validation.js';
import {
  addTag,
  assetStorage,
  deleteProfileAsset,
  getOwnProfile,
  getProfileAssetForDownload,
  listActivePets,
  listTags,
  removeTag,
  reorderTags,
  updateDefaultWorkspace,
  updatePet,
  updatePresence,
  updateProfile,
  uploadProfileAsset,
} from './service.js';

export const profileRouter = Router();
profileRouter.use('/profile', requireAuth);
profileRouter.get('/profile/deactivation-request', async (request, response) => {
  response.json({ data: await getOwnDeactivationRequest(request.auth!.userId) });
});
profileRouter.post('/profile/deactivation-request', async (request, response) => {
  const input = selfRequestSchema.parse(request.body ?? {});
  response.status(201).json({ data: await submitDeactivationRequest(request.auth!.userId, input.reason) });
});
profileRouter.post('/profile/deactivation-request/withdraw', async (request, response) => {
  const input = withdrawSchema.parse(request.body);
  response.json({ data: await withdrawDeactivationRequest(request.auth!.userId, parseId(input.request_id)) });
});
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.MAX_UPLOAD_SIZE, files: 1 } });

profileRouter.get('/profile', async (request, response) => {
  response.json({ data: await getOwnProfile(request.auth!.userId) });
});
profileRouter.patch('/profile', async (request, response) => {
  const input = updateProfileSchema.parse(request.body);
  response.json({ data: await updateProfile(request.auth!.userId, input) });
});
profileRouter.post('/profile/presence', async (request, response) => {
  const input = presenceSchema.parse(request.body);
  response.json({ data: await updatePresence(request.auth!.userId, input.presence_status) });
});
profileRouter.post('/profile/default-workspace', async (request, response) => {
  const input = defaultWorkspaceSchema.parse(request.body);
  response.json({
    data: await updateDefaultWorkspace(request.auth!.userId, BigInt(input.workspace_id)),
  });
});
profileRouter.get('/profile/pets', async (_request, response) => {
  response.json({ data: await listActivePets() });
});
profileRouter.post('/profile/pet', async (request, response) => {
  const input = petSchema.parse(request.body);
  response.json({
    data: await updatePet(request.auth!.userId, parseId(input.pet_id, 'pet ID')),
  });
});
profileRouter.get('/profile/tags', async (request, response) => {
  response.json({ data: await listTags(request.auth!.userId) });
});
profileRouter.post('/profile/tags', async (request, response) => {
  const input = tagSchema.parse(request.body);
  response.status(201).json({ data: await addTag(request.auth!.userId, input.tag_text) });
});
profileRouter.delete('/profile/tags/:tagId', async (request, response) => {
  response.json({
    data: await removeTag(request.auth!.userId, parseId(request.params.tagId, 'tag ID')),
  });
});
profileRouter.put('/profile/tags', async (request, response) => {
  const input = reorderTagsSchema.parse(request.body);
  response.json({
    data: await reorderTags(request.auth!.userId, input.tag_ids.map((id) => BigInt(id))),
  });
});
profileRouter.post('/profile/assets/:type', upload.single('file'), async (request, response) => {
  const type = assetTypeParam.parse(request.params.type);
  if (!request.file) throw new AppError(422, 'Choose an image to upload.');
  response.json({ data: await uploadProfileAsset(request.auth!.userId, type, request.file) });
});
profileRouter.delete('/profile/assets/:type', async (request, response) => {
  const type = assetTypeParam.parse(request.params.type);
  response.json({ data: await deleteProfileAsset(request.auth!.userId, type) });
});
profileRouter.get('/profile/assets/:userId/:type', async (request, response, next) => {
  const type = assetTypeParam.parse(request.params.type);
  const targetUserId = parseId(request.params.userId, 'user ID');
  const record = await getProfileAssetForDownload(request.auth!.userId, targetUserId, type);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'private, max-age=60');
  response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  response.type(record.mime_type ?? 'application/octet-stream');
  response.sendFile(assetStorage.absolutePath(record.object_key!), (error) => {
    if (error) next(error);
  });
});
