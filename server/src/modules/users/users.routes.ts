import { Router } from 'express';
import { UsersController } from './users.controller';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { lifecycleRequestIdSchema, rejectReactivationSchema, reviewDeletionSchema, reviewReactivationSchema } from './users.schema';

const router = Router();

// Apply auth and permission to all user routes
router.use(requireAuth);
router.use(requirePermission('users.manage'));

router.get('/', UsersController.getUsers);
router.get('/roles/available', UsersController.getAvailableRoles);
// Specific lifecycle routes must precede /:id.
router.get('/deletion-requests', UsersController.getDeletionRequests);
router.post('/deletion-requests/:requestId/approve', validateRequest(reviewDeletionSchema), UsersController.approveDeletionRequest);
router.post('/deletion-requests/:requestId/reject', validateRequest(reviewDeletionSchema), UsersController.rejectDeletionRequest);
router.get('/reactivation-requests', UsersController.getReactivationRequests);
router.post('/reactivation-requests/:requestId/approve', validateRequest(reviewReactivationSchema), UsersController.approveReactivationRequest);
router.post('/reactivation-requests/:requestId/reject', validateRequest(rejectReactivationSchema), UsersController.rejectReactivationRequest);
router.get('/:id', UsersController.getUserById);

router.post('/:id/approve', UsersController.approveUser);
router.post('/:id/reject', UsersController.rejectUser);

router.patch('/:id/status', UsersController.updateStatus);
router.patch('/:id/role', UsersController.updateRole);

router.delete('/:id', UsersController.softDeleteUser);

export default router;
