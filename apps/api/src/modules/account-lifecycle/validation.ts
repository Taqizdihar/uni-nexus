import { z } from 'zod';
import { DEACTIVATION_REQUEST_STATUSES } from '@uni-nexus/shared';
const note = z.string().trim().max(500);
export const deactivateSchema = z
  .object({ reason: note.min(10, 'Alasan harus berisi minimal 10 karakter.') })
  .strict();
export const noteSchema = z.object({ note: note.optional() }).strict();
export const selfRequestSchema = z.object({ reason: note.optional() }).strict();
export const withdrawSchema = z
  .object({ request_id: z.string().regex(/^[1-9]\d{0,19}$/) })
  .strict();
export const rejectRequestSchema = z
  .object({ note: note.min(1, 'Alasan penolakan wajib diisi.') })
  .strict();
export const listRequestsSchema = z
  .object({
    status: z.enum(DEACTIVATION_REQUEST_STATUSES).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
