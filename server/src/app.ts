import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { requireAuth, requirePermission } from './middleware/auth.middleware';

const app = express();

// Middleware
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Product/design files are never linked directly by the frontend, but protecting
// these paths also prevents a guessed storage path from bypassing module RBAC.
app.use('/uploads/products', requireAuth, requirePermission('craft.products.read'), express.static(path.join(env.UPLOAD_DIR, 'products')));
app.use('/uploads/designs', requireAuth, requirePermission('craft.products.read'), express.static(path.join(env.UPLOAD_DIR, 'designs')));
// Existing order attachment/static behaviour remains available.
app.use('/uploads', express.static(env.UPLOAD_DIR));

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
