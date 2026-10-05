import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Hoisted mocks — declared before any imports of the module under test.
// ---------------------------------------------------------------------------

const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
  pets: {} as Record<string, unknown>,
}));

const ensureBuiltinPets = vi.hoisted(() => vi.fn());

vi.mock('./lib/prisma.js', () => ({ prisma: db }));
vi.mock('./modules/pet-management/service.js', () => ({ ensureBuiltinPets }));

// Import the module under test *after* mocks are registered.
import { initializeDatabase } from './startup.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a PrismaClientKnownRequestError with code P2010 (pool timeout). */
function makeP2010(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('pool timeout', {
    code: 'P2010',
    clientVersion: '7.0.0',
  });
}

/** Build a PrismaClientInitializationError. */
function makeInitError(): Prisma.PrismaClientInitializationError {
  return new Prisma.PrismaClientInitializationError(
    "Can't reach database server",
    '7.0.0',
  );
}

/**
 * Runs `initializeDatabase` while concurrently advancing all fake timers so
 * that retry-delay sleep() calls resolve without real wall-clock waiting.
 */
async function runInit(stub: typeof db): Promise<void> {
  const p = initializeDatabase(stub as never);
  await vi.runAllTimersAsync();
  await p;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Intercept setTimeout used by sleep() so retries do not delay test runs.
  vi.useFakeTimers();
  vi.resetAllMocks();
  db.$queryRaw.mockResolvedValue([]);
  ensureBuiltinPets.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('database startup initialization', () => {
  describe('successful connectivity', () => {
    it('succeeds on the first attempt without retrying', async () => {
      await runInit(db);

      expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('initializes master data only after connectivity is confirmed', async () => {
      const order: string[] = [];
      db.$queryRaw.mockImplementation(async () => {
        order.push('probe');
        return [];
      });
      ensureBuiltinPets.mockImplementation(async () => {
        order.push('masterData');
      });

      await runInit(db);

      expect(order).toEqual(['probe', 'masterData']);
    });

    it('does not use a Prisma transaction', async () => {
      await runInit(db);

      expect(db.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('transient failure recovery', () => {
    it('succeeds when the probe recovers after a transient P2010 error', async () => {
      db.$queryRaw.mockRejectedValueOnce(makeP2010()).mockResolvedValue([]);

      await runInit(db);

      expect(db.$queryRaw).toHaveBeenCalledTimes(2);
      expect(ensureBuiltinPets).toHaveBeenCalledOnce();
    });

    it('succeeds when the probe recovers after a PrismaClientInitializationError', async () => {
      db.$queryRaw.mockRejectedValueOnce(makeInitError()).mockResolvedValue([]);

      await runInit(db);

      expect(db.$queryRaw).toHaveBeenCalledTimes(2);
      expect(ensureBuiltinPets).toHaveBeenCalledOnce();
    });

    it('does not initialize master data before connectivity succeeds', async () => {
      db.$queryRaw
        .mockRejectedValueOnce(makeP2010())
        .mockRejectedValueOnce(makeP2010())
        .mockResolvedValue([]);

      await runInit(db);

      expect(db.$queryRaw).toHaveBeenCalledTimes(3);
      expect(ensureBuiltinPets).toHaveBeenCalledOnce();
    });
  });

  describe('terminal failure', () => {
    it('rejects after exhausting all 5 transient attempts', async () => {
      const transientError = makeP2010();
      db.$queryRaw.mockRejectedValue(transientError);

      const p = initializeDatabase(db as never);
      // Suppress the unhandled-rejection warning that fires while timers run.
      const caught = p.catch((e: unknown) => e);
      await vi.runAllTimersAsync();

      expect(await caught).toBe(transientError);
      expect(db.$queryRaw).toHaveBeenCalledTimes(5);
      expect(ensureBuiltinPets).not.toHaveBeenCalled();
    });

    it('propagates a non-transient error immediately without retrying', async () => {
      const schemaError = new Error('Unknown column in schema');
      db.$queryRaw.mockRejectedValueOnce(schemaError);

      await expect(initializeDatabase(db as never)).rejects.toBe(schemaError);

      expect(db.$queryRaw).toHaveBeenCalledTimes(1);
      expect(ensureBuiltinPets).not.toHaveBeenCalled();
    });
  });

  describe('express binding guard', () => {
    it('does not resolve until initialization is fully complete', async () => {
      let masterDataDone = false;
      ensureBuiltinPets.mockImplementation(async () => {
        masterDataDone = true;
      });

      await runInit(db);

      expect(masterDataDone).toBe(true);
    });
  });
});
