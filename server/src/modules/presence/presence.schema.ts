import { z } from 'zod';

const sessionKey = z.string().uuid('session_key harus berupa UUID.');

export const presenceHeartbeatSchema = z.object({
  session_key: sessionKey,
  workspace_code: z.enum(['craft', 'studio']),
});

export const presenceLeaveSchema = z.object({
  session_key: sessionKey,
});
