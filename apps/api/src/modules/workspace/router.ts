import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { authorize, parseId, requireAuth, requireWorkspace } from '../../middleware/auth.js';
import { emailSchema } from '../auth/validation.js';
import { listWorkspaces, safeUserSelect } from '../auth/service.js';
import {
  addMember,
  ensureRole,
  updateMember,
  updateWorkspace,
  workspaceMembers,
} from './service.js';

export const workspaceRouter = Router();
workspaceRouter.use(requireAuth);
workspaceRouter.get('/workspaces', async (request, response) => {
  response.json({ data: await listWorkspaces(request.auth!.userId) });
});

workspaceRouter.get('/users', requireWorkspace, authorize('read'), async (request, response) => {
  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(25),
      search: z.string().trim().max(150).optional(),
    })
    .parse(request.query);
  const where = {
    is_active: true,
    account_status: 'ACTIVE',
    workspace_members: {
      some: { workspace_id: request.workspace!.id, membership_status: 'ACTIVE' },
    },
    ...(query.search
      ? { OR: [{ full_name: { contains: query.search } }, { email: { contains: query.search } }] }
      : {}),
  };
  const [data, total] = await Promise.all([
    prisma.users.findMany({
      where,
      select: safeUserSelect,
      orderBy: { full_name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.users.count({ where }),
  ]);
  response.json({
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  });
});

workspaceRouter.use('/workspaces/:workspaceId', requireWorkspace, authorize('settings'));
workspaceRouter.patch('/workspaces/:workspaceId', async (request, response) => {
  const input = z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      description: z.string().trim().max(5000).nullable().optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, 'Provide a workspace field to update.')
    .parse(request.body);
  response.json({
    data: await updateWorkspace(request.workspace!.id, request.auth!.userId, input),
  });
});
workspaceRouter.get('/workspaces/:workspaceId/members', async (request, response) => {
  response.json({ data: await workspaceMembers(request.workspace!.id) });
});
workspaceRouter.post('/workspaces/:workspaceId/members', async (request, response) => {
  const input = z.object({ email: emailSchema, role_id: z.string() }).strict().parse(request.body);
  response
    .status(201)
    .json({
      data: await addMember(
        request.workspace!.id,
        request.auth!.userId,
        request.workspace!.role,
        input.email,
        parseId(input.role_id, 'role ID'),
      ),
    });
});
workspaceRouter.patch('/workspaces/:workspaceId/members/:memberId', async (request, response) => {
  const input = z
    .object({
      role_id: z.string().optional(),
      membership_status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, 'Provide a membership field to update.')
    .parse(request.body);
  response.json({
    data: await updateMember(
      request.workspace!.id,
      request.auth!.userId,
      request.workspace!.role,
      parseId(request.params.memberId, 'member ID'),
      { ...input, role_id: input.role_id ? parseId(input.role_id, 'role ID') : undefined },
    ),
  });
});
workspaceRouter.get('/workspaces/:workspaceId/roles', async (_request, response) => {
  response.json({
    data: await prisma.roles.findMany({
      where: { is_active: true },
      select: { id: true, name: true, code: true, description: true },
      orderBy: { name: 'asc' },
    }),
  });
});
workspaceRouter.post('/workspaces/:workspaceId/roles', async (request, response) => {
  const input = z
    .object({
      code: z.enum([
        'OWNER',
        'ADMIN',
        'MANAGER',
        'DESIGNER',
        'OPERATOR',
        'CEO',
        'COO',
        'CTO',
        'CVO',
        '3D_DESIGNER',
        'STAFF_OF_SPECIALTY',
        'STAFF',
      ]),
      name: z.string().trim().min(2).max(100).optional(),
      description: z.string().trim().max(5000).optional(),
    })
    .strict()
    .parse(request.body);
  response
    .status(201)
    .json({
      data: await ensureRole(
        request.workspace!.id,
        request.auth!.userId,
        request.workspace!.role,
        input,
      ),
    });
});
