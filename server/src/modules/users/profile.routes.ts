import { Router } from 'express';
import { UsersController } from './users.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', UsersController.getProfile);
router.patch('/', UsersController.updateProfile);
router.post('/change-password', UsersController.changePassword);

export default router;
