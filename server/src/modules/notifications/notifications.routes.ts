import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { NotificationsController } from './notifications.controller';
import { markAllReadSchema, notificationIdSchema, notificationsListSchema } from './notifications.schema';

const router = Router();
router.use(requireAuth);
router.get('/', validateRequest(notificationsListSchema), NotificationsController.list);
router.get('/summary', NotificationsController.summary);
router.get('/meta', NotificationsController.meta);
router.patch('/:id/read', validateRequest(notificationIdSchema), NotificationsController.markRead);
router.patch('/:id/unread', validateRequest(notificationIdSchema), NotificationsController.markUnread);
router.post('/mark-all-read', validateRequest(markAllReadSchema), NotificationsController.markAllRead);

export default router;
