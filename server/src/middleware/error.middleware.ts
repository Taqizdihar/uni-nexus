import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/AppError';
import { env } from '../config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  console.error('Unhandled Error:', err);

  // MySQL driver messages can disclose table/constraint details.  Keep them in
  // the server log but never return them through the API envelope.
  const isDatabaseError = Boolean((err as Error & { code?: string }).code?.startsWith('ER_'));
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan pada server.',
      details: env.NODE_ENV === 'development' && !isDatabaseError ? err.message : undefined,
    },
  });
};
