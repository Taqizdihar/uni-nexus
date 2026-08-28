import app from './app';
import { env } from './config/env';
import { checkDatabaseConnection } from './config/database';
import { cleanupStorageTemp, storageService } from './shared/storage';

const startServer = async () => {
  await storageService.bootstrap();
  const cleanup = await cleanupStorageTemp();
  console.log(`Local storage ready: ${storageService.root} (${cleanup.removed} stale temp file(s) removed)`);
  // Check DB connection on startup
  const isDbConnected = await checkDatabaseConnection();
  if (!isDbConnected) {
    console.error('Shutting down server due to database connection failure.');
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    console.log(`Server is running on http://localhost:${env.PORT}`);
    console.log(`API URL: http://localhost:${env.PORT}/api/v1`);
    console.log(`Environment: ${env.NODE_ENV}`);
  });
};

startServer();
