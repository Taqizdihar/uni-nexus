import { Router } from 'express';
import { UsersController } from './users.controller';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

// Apply auth and permission to all user routes
router.use(requireAuth);
router.use(requirePermission('users.manage'));

router.get('/', UsersController.getUsers);
router.get('/roles/available', UsersController.getAvailableRoles);
router.get('/:id', UsersController.getUserById);

router.post('/:id/approve', UsersController.approveUser);
router.post('/:id/reject', UsersController.rejectUser);

router.patch('/:id/status', UsersController.updateStatus);
router.patch('/:id/role', UsersController.updateRole);

router.delete('/:id', UsersController.softDeleteUser);

export default router;
