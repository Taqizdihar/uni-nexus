import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { ValidationError } from '../shared/errors/AppError';

export const validateRequest = (schema: ZodSchema<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = parsed.body;
      Object.assign(req.query, parsed.query);
      Object.assign(req.params, parsed.params);
      return next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const zodErr = error as ZodError;
        const details = zodErr.issues.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        return next(new ValidationError('Data yang dikirim tidak valid.', details));
      }
      return next(error);
    }
  };
};
