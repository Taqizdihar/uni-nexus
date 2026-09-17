import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

const server = createApp().listen(env.PORT, () => {
  console.info(`UNI-NEXUS API listening on http://localhost:${env.PORT}`);
});
server.on('error', () => {
  console.error('API server could not start. Check the port and environment configuration.');
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
  server.close(async () => {
    await prisma.$disconnect();
    clearTimeout(timer);
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
