import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    organization_id: z.number().default(1),
    full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter.'),
    username: z.string().min(3, 'Username minimal 3 karakter.'),
    email: z.string().email('Format email tidak valid.'),
    password: z.string().min(6, 'Password minimal 6 karakter.'),
    phone: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    usernameOrEmail: z.string().min(1, 'Username atau email wajib diisi.'),
    password: z.string().min(1, 'Password wajib diisi.'),
  }),
});
