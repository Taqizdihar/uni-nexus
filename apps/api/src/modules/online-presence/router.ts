import { Router } from 'express';
import { requireAuth, requireWorkspace } from '../../middleware/auth.js';
import { listOnline, recordHeartbeat } from './service.js';

export const onlinePresenceRouter = Router();
onlinePresenceRouter.use('/online-presence', requireAuth, requireWorkspace);

onlinePresenceRouter.post('/online-presence/heartbeat', (request, response) => {
  recordHeartbeat(request.auth!.sessionId, request.auth!.userId, request.workspace!.id);
  response.status(204).end();
});

onlinePresenceRouter.get('/online-presence', async (request, response) => {
  response.json({ data: await listOnline(request.workspace!.id) });
});
