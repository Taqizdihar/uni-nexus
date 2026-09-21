import { prisma } from './lib/prisma.js';
import { ensureBuiltinPets } from './modules/pet-management/service.js';

type StartupDatabase = Pick<typeof prisma, '$queryRaw' | 'pets'>;

export async function initializeDatabase(db: StartupDatabase = prisma): Promise<void> {
  await db.$queryRaw`SELECT 1`;
  await ensureBuiltinPets(db);
}
