import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { env } from '../config/env.js';

export function getSslOptions(connection: URL) {
  const sslMode = connection.searchParams.get('ssl-mode');
  const sslAccept = connection.searchParams.get('sslaccept');
  const ssl = connection.searchParams.get('ssl');

  if (
    sslMode === 'REQUIRED' ||
    sslMode === 'VERIFY_CA' ||
    sslMode === 'VERIFY_IDENTITY' ||
    sslAccept === 'strict' ||
    ssl === 'true'
  ) {
    return { ssl: { rejectUnauthorized: true } };
  }
  return {};
}

const connection = new URL(env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: connection.hostname,
  port: Number(connection.port || 3306),
  user: decodeURIComponent(connection.username),
  password: decodeURIComponent(connection.password),
  database: decodeURIComponent(connection.pathname.slice(1)),
  connectionLimit: 10,
  ...getSslOptions(connection),
});

export const prisma = new PrismaClient({ adapter, log: [] });
