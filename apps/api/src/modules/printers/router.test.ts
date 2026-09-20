import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  env: { LOCAL_STORAGE_PATH: 'C:/tmp/uni-nexus-printer-tests', MAX_UPLOAD_SIZE: 1024 * 1024 },
}));
vi.mock('../../lib/prisma.js', () => ({ prisma: { printers: {}, $transaction: vi.fn() } }));

import { errorHandler } from '../../lib/errors.js';
import { printerRouter } from './router.js';

describe('printer photo router', () => {
  it('rejects a non-CTO photo upload before accepting file data', async () => {
    const app = express();
    app.use((request_, _response, next) => {
      request_.workspace = { id: 7n, role: 'COO' };
      request_.auth = { userId: 2n, sessionId: '00000000-0000-4000-8000-000000000010' };
      next();
    });
    app.use('/printers', printerRouter);
    app.use(errorHandler);
    const response = await request(app).post('/printers/1/photo').attach('file', Buffer.from('not-an-image'), 'printer.png');
    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({ code: 'PRINTER_CTO_ONLY', message: 'Hanya CTO yang dapat mengelola foto printer.' });
  });

  it('rejects catalog creation for a non-CTO', async () => {
    const app = express();
    app.use((request_, _response, next) => {
      request_.workspace = { id: 7n, role: 'COO' };
      request_.auth = { userId: 2n, sessionId: '00000000-0000-4000-8000-000000000010' };
      next();
    });
    app.use('/printers', printerRouter);
    app.use(errorHandler);
    const response = await request(app).post('/printers/catalog').send({ name: 'Anycubic Kobra X' });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('PRINTER_CTO_ONLY');
  });
});
