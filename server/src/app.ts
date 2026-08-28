import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { PUBLIC_CATEGORIES, STORAGE_PUBLIC_BASE_URL, STORAGE_ROOT } from './shared/storage';

const app = express();

// Middleware
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });

// Every other category (products, designs, order-attachments, project-deliverables, billing
// documents, receipts, ...) is private and only ever served through an authenticated domain
// download endpoint — there is intentionally no blanket `express.static(STORAGE_ROOT)` mount.
// Avatars are the sole exception: an <img src> cannot send a Bearer header, physical filenames
// are random UUIDs (no directory listing risk), and the content itself is not confidential.
for (const category of PUBLIC_CATEGORIES) {
  app.use(`${STORAGE_PUBLIC_BASE_URL}/${category}`, express.static(`${STORAGE_ROOT}/${category}`, {
    fallthrough: false,
    setHeaders: res => res.setHeader('Cache-Control', 'private, max-age=3600'),
  }));
}

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
