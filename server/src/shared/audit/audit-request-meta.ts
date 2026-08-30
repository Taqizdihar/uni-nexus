import type { Request } from 'express';

/** Uses Express' configured request address behaviour and never trusts arbitrary forwarded headers. */
export const auditRequestMeta = (req: Request) => {
  const source = req.ip || req.socket.remoteAddress || null;
  const ipAddress = source ? String(source).replace(/^::ffff:/i, '').slice(0, 45) : null;
  const header = req.get('user-agent');
  return { ipAddress, userAgent: header ? header.slice(0, 1_000) : null };
};

