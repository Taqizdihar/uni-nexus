import { z } from 'zod';

const notificationId = z.coerce.number().int().positive();

export const notificationsListSchema = z.object({
  query: z.object({
    status: z.enum(['all', 'unread', 'read']).default('all'),
    workspace: z.enum(['all', 'craft', 'studio', 'global']).default('all'),
    severity: z.enum(['all', 'info', 'success', 'warning', 'error', 'critical']).default('all'),
    module: z.string().trim().min(1).max(80).regex(/^[a-z0-9_]+$/).optional(),
    q: z.string().trim().max(160).optional(),
    page: z.coerce.number().int().positive().max(10_000).default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
  body: z.object({}).passthrough().default({}),
  params: z.object({}),
});

export const notificationIdSchema = z.object({
  params: z.object({ id: notificationId }),
  query: z.object({}),
  body: z.object({}).passthrough(),
});

export const markAllReadSchema = z.object({
  body: z.object({}).strict(),
  query: z.object({}),
  params: z.object({}),
});
