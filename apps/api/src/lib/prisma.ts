import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { env } from '../config/env.js';

const connection = new URL(env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: connection.hostname,
  port: Number(connection.port || 3306),
  user: decodeURIComponent(connection.username),
  password: decodeURIComponent(connection.password),
  database: decodeURIComponent(connection.pathname.slice(1)),
  connectionLimit: 10,
  ...(connection.searchParams.get('sslaccept') === 'strict' ||
  connection.searchParams.get('ssl') === 'true'
    ? { ssl: { rejectUnauthorized: true } }
    : {}),
});

export const prisma = new PrismaClient({ adapter, log: [] });
