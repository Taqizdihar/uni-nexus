import { z } from 'zod';
import { USERNAME_PATTERN } from '@uni-nexus/shared';

export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters.')
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
export const usernameSchema = z
  .string()
  .trim()
  .regex(USERNAME_PATTERN, 'Use 3-30 letters, digits, dots, underscores, or hyphens.');
export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Enter a phone number.')
  .max(30, 'Use at most 30 characters.')
  .regex(/^[0-9+()\-.\s]+$/, 'Use only digits and phone punctuation such as + ( ) - .');
export const signupSchema = z
  .object({
    full_name: z.string().trim().min(2).max(150),
    username: usernameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
  })
  .strict();
export const loginSchema = z
  .object({ email: z.string().trim().min(1).max(190), password: z.string().min(1).max(256) })
  .strict();
export const changePasswordSchema = z
  .object({ current_password: z.string().min(1).max(256), new_password: passwordSchema })
  .strict();
