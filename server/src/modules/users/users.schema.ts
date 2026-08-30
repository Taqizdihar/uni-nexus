import { z } from 'zod';

const workspaceCode = z.enum(['craft', 'studio']);
const profileStatusCode = z.enum(['default', 'busy', 'sick', 'leave']);
const id = z.coerce.number().int().positive();
const optionalReviewNote = z.string().trim().max(500, 'Catatan maksimal 500 karakter.').optional();

export const updateProfileSchema = z.object({
  body: z.object({
    full_name: z.string().trim().min(1, 'Nama lengkap wajib diisi.').max(150).optional(),
    username: z.string().trim().min(3, 'Username minimal 3 karakter.').max(100).optional(),
    email: z.string().trim().toLowerCase().email('Format email tidak valid.').max(190).optional(),
    phone: z.string().trim().max(50).optional(),
    default_workspace_code: workspaceCode.optional(),
  }).strict(),
});

export const profileStatusSchema = z.object({
  body: z.object({ profile_status_code: profileStatusCode }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Kata sandi lama wajib diisi.'),
    newPassword: z.string().min(6, 'Kata sandi baru minimal 6 karakter.').max(128),
  }).strict(),
});

export const createDeletionRequestSchema = z.object({
  body: z.object({ reason: z.string().trim().max(500, 'Alasan maksimal 500 karakter.').optional() }).strict(),
});

export const lifecycleRequestIdSchema = z.object({ params: z.object({ requestId: id }) });

export const reviewDeletionSchema = z.object({
  params: z.object({ requestId: id }),
  body: z.object({ review_note: optionalReviewNote }).strict(),
});

export const reviewReactivationSchema = z.object({
  params: z.object({ requestId: id }),
  body: z.object({ roleCode: z.string().trim().min(1).max(60), review_note: optionalReviewNote }).strict(),
});

export const rejectReactivationSchema = z.object({
  params: z.object({ requestId: id }),
  body: z.object({ review_note: optionalReviewNote }).strict(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type ProfileStatusCode = z.infer<typeof profileStatusSchema>['body']['profile_status_code'];
