import { createHmac, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';
import { env } from '../../config/env.js';

const issuer = 'uni-nexus-api';
const audience = 'uni-nexus-admin';
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.COOKIE_SAME_SITE,
  path: '/',
};

export function passwordFingerprint(hash: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(hash).digest('hex');
}

export function issueSession(
  response: Response,
  user: { id: bigint; password_hash: string },
): void {
  const token = jwt.sign({ fp: passwordFingerprint(user.password_hash) }, env.JWT_SECRET, {
    subject: user.id.toString(),
    issuer,
    audience,
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN,
  });
  response.cookie(env.COOKIE_NAME, token, { ...cookieOptions, maxAge: env.JWT_EXPIRES_IN * 1000 });
}

export function clearSession(response: Response): void {
  response.clearCookie(env.COOKIE_NAME, cookieOptions);
}

export function verifySession(token: string): { userId: bigint; fingerprint: string } | null {
  try {
    const value = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'], issuer, audience });
    if (
      typeof value === 'string' ||
      typeof value.sub !== 'string' ||
      !/^[1-9]\d{0,19}$/.test(value.sub) ||
      typeof value.fp !== 'string' ||
      !/^[a-f0-9]{64}$/.test(value.fp)
    )
      return null;
    return { userId: BigInt(value.sub), fingerprint: value.fp };
  } catch {
    return null;
  }
}

export function matchesFingerprint(hash: string, fingerprint: string): boolean {
  const expected = Buffer.from(passwordFingerprint(hash));
  const received = Buffer.from(fingerprint);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
