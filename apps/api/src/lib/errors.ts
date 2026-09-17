import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'REQUEST_FAILED',
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof AppError) {
    response
      .status(error.status)
      .json({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      });
    return;
  }
  if (error instanceof ZodError) {
    response
      .status(422)
      .json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the submitted fields.',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
    return;
  }
  const known =
    typeof error === 'object' && error !== null
      ? (error as { code?: string; type?: string; status?: number; name?: string })
      : {};
  if (known.code === 'P2002') {
    response
      .status(409)
      .json({
        error: { code: 'CONFLICT', message: 'A record with these unique values already exists.' },
      });
    return;
  }
  if (known.code === 'P2003') {
    response
      .status(409)
      .json({
        error: {
          code: 'REFERENCE_CONFLICT',
          message: 'This action conflicts with a related record.',
        },
      });
    return;
  }
  if (known.code === 'P2025') {
    response
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'The requested record was not found.' } });
    return;
  }
  if (known.code === 'P2034') {
    response
      .status(409)
      .json({
        error: {
          code: 'CONCURRENT_CHANGE',
          message: 'Another update occurred. Refresh and try again.',
        },
      });
    return;
  }
  if (known.type === 'entity.parse.failed') {
    response
      .status(400)
      .json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } });
    return;
  }
  if (known.type === 'entity.too.large' || known.code === 'LIMIT_FILE_SIZE') {
    response
      .status(413)
      .json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'The submitted content exceeds the allowed size.',
        },
      });
    return;
  }
  if (known.name === 'MulterError') {
    response
      .status(400)
      .json({ error: { code: 'UPLOAD_ERROR', message: 'The submitted upload is invalid.' } });
    return;
  }
  // Logging only the classification avoids exposing SQL parameters, secrets, or local paths.
  console.error('Unhandled API error', known.name ?? 'Error', known.code ?? 'UNKNOWN');
  response
    .status(500)
    .json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Please try again.' },
    });
};
