import { Prisma } from '@prisma/client';
import { prisma } from './lib/prisma.js';
import { ensureBuiltinPets } from './modules/pet-management/service.js';

type StartupDatabase = Pick<typeof prisma, '$queryRaw' | 'pets'>;

/** Maximum number of connectivity probe attempts before giving up. */
const MAX_ATTEMPTS = 5;

/** Base delay in milliseconds for the first retry interval. Doubles each attempt (bounded). */
const BASE_DELAY_MS = 1_000;

/** Maximum delay in milliseconds between retry attempts. */
const MAX_DELAY_MS = 8_000;

/**
 * Returns true when the error represents a transient database connectivity
 * failure that may resolve if the probe is retried.
 *
 * Retried: Prisma pool-timeout (P2010) and initialisation errors.
 * Not retried: schema, query, constraint, or any other errors.
 */
function isTransientConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2010'
  )
    return true;
  return false;
}

/** Resolves after `ms` milliseconds. */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Probes the database with a lightweight query, retrying up to MAX_ATTEMPTS
 * times on transient connectivity errors only.
 *
 * @throws The last error when all attempts are exhausted.
 * @throws Any non-transient error immediately without retrying.
 */
async function probeConnectivity(db: StartupDatabase): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await db.$queryRaw`SELECT 1`;
      return;
    } catch (error) {
      if (!isTransientConnectionError(error)) throw error;
      lastError = error;
      const errorName =
        error instanceof Error ? error.constructor.name : 'Error';
      if (attempt < MAX_ATTEMPTS) {
        const delayMs = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
        console.warn(
          `[startup] Database connectivity probe failed (attempt ${attempt}/${MAX_ATTEMPTS}, ${errorName}). ` +
            `Retrying in ${delayMs}ms\u2026`,
        );
        await sleep(delayMs);
      }
    }
  }
  console.error(
    `[startup] Database connectivity probe failed after ${MAX_ATTEMPTS} attempts. Aborting.`,
  );
  throw lastError;
}

/**
 * Initialises the application database layer.
 *
 * Execution order (preserved):
 *   1. Establish database connectivity (with bounded retry on transient errors).
 *   2. Seed required master data via the normal Prisma client.
 *
 * Express is NOT bound before this function resolves.
 * Migrations are NOT run here.
 */
export async function initializeDatabase(db: StartupDatabase = prisma): Promise<void> {
  await probeConnectivity(db);
  await ensureBuiltinPets(db);
}
