import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { requireAuth, requirePermission } from './middleware/auth.middleware';
import { storageService } from './shared/storage';

const app = express();

// Middleware
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Only avatars are deliberately public. All other categories are streamed by
// their domain route after authentication, permissions, and BU ownership checks.
app.use('/uploads/avatars', express.static(storageService.safeResolve('avatars/.placeholder').replace(/[\\/]\.placeholder$/, ''), {
  index: false,
  fallthrough: true,
  setHeaders: res => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600');
  },
}));

// Routes
app.use('/api/v1', routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint tidak ditemukan.',
    },
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
