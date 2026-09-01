import { z } from 'zod';

export const automationWorkspaceSchema = z.enum(['craft', 'studio']);
export const automationWorkspaceInputSchema = z.object({ workspace: automationWorkspaceSchema }).strict();
export const automationGlobalCreateSchema = z.object({ workspace: automationWorkspaceSchema }).passthrough();
export const paginationSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) });
