import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  pets: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  workspace_members: { findFirst: vi.fn() },
  audit_logs: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock('../../lib/prisma.js', () => ({ prisma: db }));
vi.mock('../../config/env.js', () => ({ env: { LOCAL_STORAGE_PATH: 'C:/tmp/uni-nexus-pet-tests', MAX_UPLOAD_SIZE: 1024 * 1024 } }));

import { assertCto, createPet, listActivePets, requireDefaultPetId, updatePet } from './service.js';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 7n,
  code: 'AZZY',
  name: null,
  subtitle: null,
  description: null,
  image_storage_provider: 'BUILTIN',
  image_bucket_name: null,
  image_object_key: 'pets/Azzy/Idle/Azzy.avif',
  image_url: null,
  is_active: true,
  sort_order: 10,
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(db));
  db.audit_logs.create.mockResolvedValue({});
});

describe('mandatory default Pet', () => {
  it('resolves Uni-Inu by stable code and not a numeric ID', async () => {
    db.pets.findFirst.mockResolvedValue({ id: 9001n });
    await expect(requireDefaultPetId(db as never)).resolves.toBe(9001n);
    expect(db.pets.findFirst).toHaveBeenCalledWith({ where: { code: 'UNI_INU', is_active: true }, select: { id: true } });
  });

  it('fails explicitly when the active default is missing', async () => {
    db.pets.findFirst.mockResolvedValue(null);
    await expect(requireDefaultPetId(db as never)).rejects.toMatchObject({ code: 'DEFAULT_PET_MISSING', status: 500 });
  });
});

describe('Pet selection and master data', () => {
  it('returns active Pets in sort order and uses a display fallback for nullable metadata', async () => {
    db.pets.findMany.mockResolvedValue([row({ code: 'UNI_INU', id: 51n, sort_order: 0 }), row()]);
    const pets = await listActivePets();
    expect(pets).toHaveLength(2);
    expect(pets[0]).toMatchObject({ code: 'UNI_INU', display_name: 'Uni-Inu', image_url: null });
    expect(db.pets.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { is_active: true } }));
  });

  it.each(['CEO', 'COO', 'CVO', '3D_DESIGNER', 'STAFF_OF_SPECIALTY', 'STAFF'])('denies %s master-data access', async () => {
    db.workspace_members.findFirst.mockResolvedValue(null);
    await expect(assertCto(db as never, 5n)).rejects.toMatchObject({ code: 'PET_MANAGEMENT_FORBIDDEN', status: 403 });
  });

  it('creates nullable metadata as database NULL and audits the action', async () => {
    db.workspace_members.findFirst.mockResolvedValue({ id: 1n, roles: { code: 'CTO' } });
    db.pets.findFirst.mockResolvedValue({ sort_order: 40 });
    db.pets.create.mockResolvedValue(row({ id: 12n, code: 'TEST_PET', sort_order: 50 }));
    const result = await createPet(5n, { code: 'Test Pet', name: null, subtitle: '', description: null });
    expect(result.display_name).toBe('Test Pet');
    expect(db.pets.create.mock.calls[0][0].data).toMatchObject({ code: 'TEST_PET', name: null, subtitle: null, description: null, sort_order: 50 });
    expect(db.audit_logs.create.mock.calls[0][0].data.action).toBe('PET_CREATED');
  });

  it('protects the reserved default code while allowing metadata edits', async () => {
    db.workspace_members.findFirst.mockResolvedValue({ id: 1n, roles: { code: 'CTO' } });
    db.pets.findUnique.mockResolvedValue(row({ id: 1n, code: 'UNI_INU', name: null }));
    await expect(updatePet(5n, 1n, { code: 'OTHER_CODE' })).rejects.toMatchObject({ code: 'PET_DEFAULT_CODE_LOCKED' });
  });
});
