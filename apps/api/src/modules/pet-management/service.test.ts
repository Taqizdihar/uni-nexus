import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  pets: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  workspace_members: { findFirst: vi.fn() },
  audit_logs: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock('../../lib/prisma.js', () => ({ prisma: db }));
vi.mock('../../config/env.js', () => ({ env: { LOCAL_STORAGE_PATH: 'C:/tmp/uni-nexus-pet-tests', MAX_UPLOAD_SIZE: 1024 * 1024 } }));

import { assertCto, createPet, ensureBuiltinPets, listActivePets, requireDefaultPetId, updatePet } from './service.js';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 7n,
  builtin_key: null,
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
  it('resolves Uni-Inu by immutable builtin key and not a numeric ID', async () => {
    db.pets.findFirst.mockResolvedValue({ id: 9001n });
    await expect(requireDefaultPetId(db as never)).resolves.toBe(9001n);
    expect(db.pets.findFirst).toHaveBeenCalledWith({ where: { builtin_key: 'UNI_INU', is_active: true }, select: { id: true } });
  });

  it('fails explicitly when the active default is missing', async () => {
    db.pets.findFirst.mockResolvedValue(null);
    await expect(requireDefaultPetId(db as never)).rejects.toMatchObject({ code: 'DEFAULT_PET_MISSING', status: 500 });
  });
});

describe('Pet selection and master data', () => {
  it('returns active Pets in sort order and uses a display fallback for nullable metadata', async () => {
    db.pets.findMany.mockResolvedValue([row({ builtin_key: 'UNI_INU', code: null, id: 51n, sort_order: 0 }), row()]);
    const pets = await listActivePets();
    expect(pets).toHaveLength(2);
    expect(pets[0]).toMatchObject({ builtin_key: 'UNI_INU', code: null, display_name: 'Uni-Inu', image_url: null });
    expect(db.pets.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { is_active: true } }));
  });

  it.each(['CEO', 'COO', 'CVO', '3D_DESIGNER', 'STAFF_OF_SPECIALTY', 'STAFF'])('denies %s master-data access', async () => {
    db.workspace_members.findFirst.mockResolvedValue(null);
    await expect(assertCto(db as never, 5n)).rejects.toMatchObject({ code: 'PET_MANAGEMENT_FORBIDDEN', status: 403 });
  });

  it('requires complete metadata for a custom Pet and audits the action', async () => {
    db.workspace_members.findFirst.mockResolvedValue({ id: 1n, roles: { code: 'CTO' } });
    db.pets.findFirst.mockResolvedValue({ sort_order: 40 });
    db.pets.create.mockResolvedValue(row({ id: 12n, code: 'TEST_PET', name: 'Test Pet', subtitle: 'A pet', description: 'Description', sort_order: 50 }));
    const result = await createPet(5n, { code: 'Test Pet', name: 'Test Pet', subtitle: 'A pet', description: 'Description' });
    expect(result.display_name).toBe('Test Pet');
    expect(db.pets.create.mock.calls[0][0].data).toMatchObject({ code: 'TEST_PET', name: 'Test Pet', subtitle: 'A pet', description: 'Description', sort_order: 50 });
    expect(db.audit_logs.create.mock.calls[0][0].data.action).toBe('PET_CREATED');
  });

  it('allows CTOs to edit a built-in code', async () => {
    db.workspace_members.findFirst.mockResolvedValue({ id: 1n, roles: { code: 'CTO' } });
    db.pets.findUnique.mockImplementation(({ where }: { where: Record<string, unknown> }) => Promise.resolve(
      'id' in where ? row({ id: 1n, builtin_key: 'UNI_INU', code: null, name: null }) : null,
    ));
    db.pets.update.mockResolvedValue(row({ id: 1n, builtin_key: 'UNI_INU', code: 'OTHER_CODE', name: null }));
    await expect(updatePet(5n, 1n, { code: 'Other Code' })).resolves.toMatchObject({ code: 'OTHER_CODE', builtin_key: 'UNI_INU' });
  });

  it('creates all missing built-ins without overwriting existing metadata', async () => {
    const records = new Map<string, ReturnType<typeof row>>();
    db.pets.findUnique.mockImplementation(({ where }: { where: { builtin_key?: string; code?: string } }) => {
      if (where.builtin_key) return Promise.resolve(records.get(where.builtin_key) ?? null);
      return Promise.resolve(null);
    });
    db.pets.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      const created = row({ id: BigInt(records.size + 1), ...data });
      records.set(String(data.builtin_key), created);
      return Promise.resolve(created);
    });
    db.pets.update.mockImplementation(({ where, data }: { where: { id: bigint }; data: Record<string, unknown> }) => {
      const current = [...records.values()].find((record) => record.id === where.id)!;
      const updated = row({ ...current, ...data });
      records.set(String(updated.builtin_key), updated);
      return Promise.resolve(updated);
    });
    await ensureBuiltinPets(db as never);
    records.set('AZZY', row({ ...records.get('AZZY'), builtin_key: 'AZZY', name: 'Azzy Custom' }));
    await ensureBuiltinPets(db as never);
    expect(db.pets.create).toHaveBeenCalledTimes(5);
    expect(records.get('UNI_INU')).toMatchObject({ code: null, name: null, image_object_key: 'pets/Uni-Inu/Idle/Uni-Inu.avif' });
    expect(records.get('AZZY')).toMatchObject({ name: 'Azzy Custom' });
  });
});
