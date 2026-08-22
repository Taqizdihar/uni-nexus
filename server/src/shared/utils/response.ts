import { Response } from 'express';

export const sendSuccess = (res: Response, data: any = {}, meta: any = undefined, statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    meta,
  });
};
