import { Router } from 'express';
import { UsersController } from './users.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { createUpload } from '../../shared/storage';
import { validateRequest } from '../../middleware/validation.middleware';
import { changePasswordSchema, createDeletionRequestSchema, profileStatusSchema, updateProfileSchema } from './users.schema';

const router = Router();

router.use(requireAuth);

router.get('/', UsersController.getProfile);
router.patch('/', validateRequest(updateProfileSchema), UsersController.updateProfile);
router.patch('/status', validateRequest(profileStatusSchema), UsersController.updateProfileStatus);
router.post('/avatar', createUpload('avatar').single('avatar'), UsersController.uploadAvatar);
router.delete('/avatar', UsersController.deleteAvatar);
router.post('/banner', createUpload('profile_banner').single('banner'), UsersController.uploadBanner);
router.delete('/banner', UsersController.deleteBanner);
router.post('/change-password', validateRequest(changePasswordSchema), UsersController.changePassword);
router.get('/deletion-request', UsersController.getDeletionRequest);
router.post('/deletion-request', validateRequest(createDeletionRequestSchema), UsersController.createDeletionRequest);
router.post('/deletion-request/revoke', UsersController.revokeDeletionRequest);

export default router;
