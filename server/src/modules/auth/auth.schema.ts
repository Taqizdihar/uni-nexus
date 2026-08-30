import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    organization_id: z.number().default(1),
    full_name: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter.').max(150),
    username: z.string().trim().min(3, 'Username minimal 3 karakter.').max(100),
    email: z.string().trim().toLowerCase().email('Format email tidak valid.').max(190),
    password: z.string().min(6, 'Password minimal 6 karakter.').max(128),
    phone: z.string().trim().max(50).optional(),
    default_workspace_code: z.enum(['craft', 'studio']).optional(),
  }).strict(),
});

export const loginSchema = z.object({
  body: z.object({
    usernameOrEmail: z.string().min(1, 'Username atau email wajib diisi.'),
    password: z.string().min(1, 'Password wajib diisi.'),
  }),
});

export const logoutSchema = z.object({
  body: z.object({ session_key: z.string().uuid('session_key harus berupa UUID.').optional() }).strict(),
});
