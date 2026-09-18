import { Router } from 'express';
import { clearSession } from '../auth/session.js';
import { getDeactivationRequest, listDeactivationRequests, reviewDeactivationRequest } from '../account-lifecycle/service.js';
import { deactivateSchema, listRequestsSchema, noteSchema, rejectRequestSchema } from '../account-lifecycle/validation.js';
import { parseId, requireAuth, requireUserManagement } from '../../middleware/auth.js';
import { approveSchema, listAccountsSchema, rejectSchema } from './validation.js';
import {
  approveAccount,
  getAccount,
  listAccounts,
  reactivateAccount,
  referenceData,
  rejectAccount,
  deactivateAccount,
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
  response.json(await listAccounts(request.auth!.userId, query));
});
userManagementRouter.get('/user-management/deactivation-requests', async (request, response) => {
  response.json(await listDeactivationRequests(request.auth!.userId, listRequestsSchema.parse(request.query)));
});
userManagementRouter.get('/user-management/deactivation-requests/:requestId', async (request, response) => {
  response.json({ data: await getDeactivationRequest(request.auth!.userId, parseId(request.params.requestId)) });
});
userManagementRouter.post('/user-management/deactivation-requests/:requestId/approve', async (request, response) => {
  const input = noteSchema.parse(request.body ?? {});
  const data = await reviewDeactivationRequest(request.auth!.userId, parseId(request.params.requestId), 'APPROVED', input.note);
  if (data.session_ended) clearSession(response);
  response.json({ data });
});
userManagementRouter.post('/user-management/deactivation-requests/:requestId/reject', async (request, response) => {
  const input = rejectRequestSchema.parse(request.body);
  response.json({ data: await reviewDeactivationRequest(request.auth!.userId, parseId(request.params.requestId), 'REJECTED', input.note) });
});
userManagementRouter.get('/user-management/:userId', async (request, response) => {
  response.json({ data: await getAccount(parseId(request.params.userId), request.auth!.userId) });
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
userManagementRouter.post(['/user-management/:userId/deactivate', '/user-management/:userId/suspend'], async (request, response) => {
  const input = deactivateSchema.parse(request.body);
  const data = await deactivateAccount(request.auth!.userId, parseId(request.params.userId), input.reason);
  response.json({ data });
});
userManagementRouter.post('/user-management/:userId/reactivate', async (request, response) => {
  const input = noteSchema.parse(request.body ?? {});
  const data = await reactivateAccount(request.auth!.userId, parseId(request.params.userId), input.note);
  response.json({ data });
});
