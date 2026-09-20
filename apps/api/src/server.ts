import type { Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { ensureBuiltinPets } from './modules/pet-management/service.js';

let server: Server | undefined;
async function start() {
  await prisma.$transaction((tx) => ensureBuiltinPets(tx));
  server = createApp().listen(env.PORT, () => {
    console.info(`UNI-NEXUS API listening on http://localhost:${env.PORT}`);
  });
  server.on('error', () => {
    console.error('API server could not start. Check the port and environment configuration.');
    process.exitCode = 1;
  });
}
void start().catch((error) => {
  console.error('API server could not initialize Pet data.', error);
  process.exitCode = 1;
});
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  const timer = setTimeout(() => {
    process.exit(1);
  }, 10000);
  timer.unref();
  if (!server) {
    await prisma.$disconnect();
    clearTimeout(timer);
    process.exit(0);
    return;
  }
  server.close(async () => {
    await prisma.$disconnect();
    clearTimeout(timer);
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
