import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { AppError, errorHandler } from './lib/errors.js';
import { jsonReplacer } from './lib/serialization.js';
import { requireTrustedOrigin, sanitizeInput } from './middleware/security.js';
import { authRouter } from './modules/auth/router.js';
import { workspaceRouter } from './modules/workspace/router.js';
import { domainRouter } from './modules/resources/router.js';
import { userManagementRouter } from './modules/user-management/router.js';
import { teamRouter } from './modules/team/router.js';
import { profileRouter } from './modules/profile/router.js';
import { onlinePresenceRouter } from './modules/online-presence/router.js';
import { petManagementRouter } from './modules/pet-management/router.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.set('json replacer', jsonReplacer);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.CORS_ORIGINS.includes(origin)) callback(null, true);
        else callback(new AppError(403, 'This origin is not allowed.', 'ORIGIN_REJECTED'));
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'X-Workspace-Id'],
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(requireTrustedOrigin, sanitizeInput);
  app.use('/api', (_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/health', (_request, response) => {
    response.json({ data: { status: 'ok', service: 'uni-nexus-api' } });
  });
  app.get('/api/health/ready', async (_request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.json({ data: { status: 'ok', database: 'connected' } });
    } catch {
      response
        .status(503)
        .json({
          error: { code: 'DATABASE_UNAVAILABLE', message: 'Database connection is unavailable.' },
        });
    }
  });
  app.use(
    '/api/v1',
    authRouter,
    workspaceRouter,
    userManagementRouter,
    teamRouter,
    profileRouter,
    petManagementRouter,
    onlinePresenceRouter,
    domainRouter,
  );
  app.use((_request, _response, next) => {
    next(new AppError(404, 'The requested endpoint was not found.', 'NOT_FOUND'));
  });
  app.use(errorHandler);
  return app;
}
