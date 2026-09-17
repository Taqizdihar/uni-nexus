import { z } from 'zod';
import { ACCOUNT_STATUSES, ROLE_CODES } from '@uni-nexus/shared';

export const listAccountsSchema = z
  .object({
    status: z.enum(ACCOUNT_STATUSES).optional(),
    search: z.string().trim().max(150).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const approveSchema = z
  .object({
    role_code: z.enum(ROLE_CODES),
    workspace_id: z.string().regex(/^[1-9]\d{0,19}$/, 'A valid workspace ID is required.'),
  })
  .strict();

export const rejectSchema = z
  .object({ reason: z.string().trim().min(1, 'A rejection reason is required.').max(500) })
  .strict();
