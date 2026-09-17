import { Router } from 'express';
import { z } from 'zod';
import { parseId, requireAuth, requireWorkspace } from '../../middleware/auth.js';
import { getTeamMember, listTeam } from './service.js';

export const teamRouter = Router();
teamRouter.use('/team', requireAuth, requireWorkspace);

teamRouter.get('/team', async (request, response) => {
  const query = z.object({ search: z.string().trim().max(150).optional() }).parse(request.query);
  response.json({ data: await listTeam(request.workspace!.id, query.search) });
});
teamRouter.get('/team/:userId', async (request, response) => {
  const userId = parseId(request.params.userId, 'user ID');
  response.json({ data: await getTeamMember(request.workspace!.id, userId) });
});
