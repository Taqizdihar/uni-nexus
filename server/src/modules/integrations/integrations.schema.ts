import { z } from 'zod';

const secretKeyPattern = /(secret|token|password|credential|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|private[_-]?key|client[_-]?secret|authorization)/i;

function assertNoSecretKeys(node: unknown, ctx: z.RefinementCtx, path: Array<string | number> = []) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => assertNoSecretKeys(item, ctx, [...path, index]));
    return;
  }
  if (node && typeof node === 'object') {
    Object.entries(node as Record<string, unknown>).forEach(([key, child]) => {
      if (secretKeyPattern.test(key)) ctx.addIssue({ code: 'custom', path: [...path, key], message: 'Rahasia tidak boleh disimpan di config_json. Gunakan kredensial terenkripsi.' });
      assertNoSecretKeys(child, ctx, [...path, key]);
    });
  }
}

const configJsonSchema = z.record(z.string(), z.unknown()).default({}).superRefine((value, ctx) => assertNoSecretKeys(value, ctx));

export const createConnectionSchema = z.object({
  provider_code: z.string().trim().min(1).max(120),
  scope: z.enum(['organization', 'craft', 'studio']),
  display_name: z.string().trim().min(1).max(150),
  config_json: configJsonSchema,
});

export const updateConnectionSchema = z.object({
  display_name: z.string().trim().min(1).max(150).optional(),
  config_json: configJsonSchema.optional(),
  expected_updated_at: z.string().trim().min(1).optional(),
});

export const credentialsSchema = z.object({
  secrets: z.record(z.string().trim().min(1).max(100), z.string().trim().min(1).max(20_000)).refine((value) => Object.keys(value).length > 0, 'Minimal satu kredensial harus diisi.'),
  expected_updated_at: z.string().trim().min(1).optional(),
});

export const connectionFiltersSchema = z.object({
  search: z.string().trim().max(150).optional(),
  category: z.string().trim().max(60).optional(),
  scope: z.enum(['organization', 'craft', 'studio']).optional(),
  status: z.string().trim().max(30).optional(),
  capability: z.enum(['test', 'sync']).optional(),
});

export const logFiltersSchema = z.object({
  integration_id: z.coerce.number().int().positive().optional(),
  status: z.string().trim().max(30).optional(),
  sync_type: z.string().trim().max(60).optional(),
});
