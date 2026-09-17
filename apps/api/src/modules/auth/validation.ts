import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'Password must be at most 72 UTF-8 bytes.',
  );
export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(190)
  .transform((value) => value.toLowerCase());
export const signupSchema = z
  .object({
    full_name: z.string().trim().min(2).max(150),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();
export const setupSchema = signupSchema.extend({
  workspace_name: z.string().trim().min(2).max(120).default('3D Printing'),
});
export const loginSchema = z
  .object({ email: emailSchema, password: z.string().min(1).max(256) })
  .strict();
export const changePasswordSchema = z
  .object({ current_password: z.string().min(1).max(256), new_password: passwordSchema })
  .strict();
