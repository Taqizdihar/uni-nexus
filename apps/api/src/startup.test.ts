import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
  pets: {},
}));
const ensureBuiltinPets = vi.hoisted(() => vi.fn());

vi.mock('./lib/prisma.js', () => ({ prisma: db }));
vi.mock('./modules/pet-management/service.js', () => ({ ensureBuiltinPets }));

import { initializeDatabase } from './startup.js';

beforeEach(() => {
  vi.resetAllMocks();
  db.$queryRaw.mockResolvedValue([]);
  ensureBuiltinPets.mockResolvedValue(undefined);
});

describe('database startup initialization', () => {
  it('checks connectivity before initializing built-in Pets without a transaction', async () => {
    await initializeDatabase(db as never);

    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(ensureBuiltinPets).toHaveBeenCalledWith(db);
    expect(db.$queryRaw).toHaveBeenCalledBefore(ensureBuiltinPets);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('does not initialize built-in Pets when the connectivity check fails', async () => {
    db.$queryRaw.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(initializeDatabase(db as never)).rejects.toThrow('database unavailable');
    expect(ensureBuiltinPets).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
