import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { PresenceController } from './presence.controller';

const controller = new PresenceController();
export const presenceRoutes = Router();

presenceRoutes.use(requireAuth);
presenceRoutes.post('/heartbeat', controller.heartbeat);
presenceRoutes.get('/active', controller.active);
presenceRoutes.post('/leave', controller.leave);
