import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

/** Every browser mutation, including login, requires an explicit trusted Origin. */
export const requireTrustedOrigin: RequestHandler = (request, _response, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
  const origin = request.get('Origin');
  if (!origin || !env.CORS_ORIGINS.includes(origin))
    return next(
      new AppError(403, 'A trusted Origin header is required for this action.', 'ORIGIN_REJECTED'),
    );
  next();
};

/** Reject prototype keys and NUL control characters before any data reaches services. */
export const sanitizeInput: RequestHandler = (request, _response, next) => {
  function inspect(value: unknown, depth = 0): void {
    if (depth > 30) throw new AppError(400, 'Request data is too deeply nested.', 'INVALID_INPUT');
    if (typeof value === 'string' && value.includes('\0'))
      throw new AppError(400, 'Invalid text in request.', 'INVALID_INPUT');
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (['__proto__', 'prototype', 'constructor'].includes(key))
          throw new AppError(400, 'Invalid request property.', 'INVALID_INPUT');
        inspect(child, depth + 1);
      }
    }
  }
  try {
    inspect(request.body);
    inspect(request.query);
    next();
  } catch (error) {
    next(error);
  }
};
