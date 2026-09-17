import { z } from 'zod';
import { MAX_USER_TAGS, PRESENCE_STATUSES, PROFILE_ASSET_TYPES } from '@uni-nexus/shared';
import { phoneSchema, usernameSchema } from '../auth/validation.js';

const id = z.string().regex(/^[1-9]\d{0,19}$/, 'A valid ID is required.');

export const updateProfileSchema = z
  .object({
    full_name: z.string().trim().min(2).max(150).optional(),
    username: usernameSchema.optional(),
    phone: phoneSchema.optional(),
    bio: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

export const presenceSchema = z.object({ presence_status: z.enum(PRESENCE_STATUSES) }).strict();
export const defaultWorkspaceSchema = z.object({ workspace_id: id }).strict();
export const petSchema = z.object({ pet_id: id.nullable() }).strict();
export const tagSchema = z.object({ tag_text: z.string().trim().min(1).max(40) }).strict();
export const reorderTagsSchema = z
  .object({ tag_ids: z.array(id).min(1).max(MAX_USER_TAGS) })
  .strict();
export const assetTypeParam = z.enum(PROFILE_ASSET_TYPES);
export const userIdParam = id;
