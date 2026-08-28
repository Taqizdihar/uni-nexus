import { Router } from 'express';
import { UsersController } from './users.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { createUpload } from '../../shared/storage';

const router = Router();

router.use(requireAuth);

router.get('/', UsersController.getProfile);
router.patch('/', UsersController.updateProfile);
router.post('/avatar', createUpload('avatar').single('avatar'), UsersController.uploadAvatar);
router.delete('/avatar', UsersController.deleteAvatar);
router.post('/change-password', UsersController.changePassword);

export default router;
