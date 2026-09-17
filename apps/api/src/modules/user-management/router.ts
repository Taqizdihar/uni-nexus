import { Router } from 'express';
import { parseId, requireAuth, requireUserManagement } from '../../middleware/auth.js';
import { approveSchema, listAccountsSchema, rejectSchema } from './validation.js';
import {
  approveAccount,
  getAccount,
  listAccounts,
  reactivateAccount,
  referenceData,
  rejectAccount,
  suspendAccount,
  summary,
} from './service.js';

export const userManagementRouter = Router();
userManagementRouter.use('/user-management', requireAuth, requireUserManagement);

userManagementRouter.get('/user-management/summary', async (_request, response) => {
  response.json({ data: await summary() });
});
userManagementRouter.get('/user-management/reference', async (_request, response) => {
  response.json({ data: await referenceData() });
});
userManagementRouter.get('/user-management', async (request, response) => {
  const query = listAccountsSchema.parse(request.query);
  response.json(await listAccounts(query));
});
userManagementRouter.get('/user-management/:userId', async (request, response) => {
  response.json({ data: await getAccount(parseId(request.params.userId)) });
});
userManagementRouter.post('/user-management/:userId/approve', async (request, response) => {
  const input = approveSchema.parse(request.body);
  const data = await approveAccount(request.auth!.userId, parseId(request.params.userId), {
    role_code: input.role_code,
    workspace_id: BigInt(input.workspace_id),
  });
  response.json({ data });
});
userManagementRouter.post('/user-management/:userId/reject', async (request, response) => {
  const input = rejectSchema.parse(request.body);
  const data = await rejectAccount(request.auth!.userId, parseId(request.params.userId), input.reason);
  response.json({ data });
});
userManagementRouter.post('/user-management/:userId/suspend', async (request, response) => {
  const data = await suspendAccount(request.auth!.userId, parseId(request.params.userId));
  response.json({ data });
});
userManagementRouter.post('/user-management/:userId/reactivate', async (request, response) => {
  const data = await reactivateAccount(request.auth!.userId, parseId(request.params.userId));
  response.json({ data });
});
