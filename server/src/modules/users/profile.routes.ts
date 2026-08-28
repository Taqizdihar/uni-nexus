import { Router } from 'express';
import { UsersController } from './users.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { getStoragePolicy, singleFileUpload } from '../../shared/storage';

const router = Router();
const avatarUpload = singleFileUpload(getStoragePolicy('avatar'), 'avatar');

router.use(requireAuth);

router.get('/', UsersController.getProfile);
router.patch('/', UsersController.updateProfile);
router.post('/change-password', UsersController.changePassword);
router.post('/avatar', avatarUpload, UsersController.uploadAvatar);
router.delete('/avatar', UsersController.removeAvatar);

export default router;
