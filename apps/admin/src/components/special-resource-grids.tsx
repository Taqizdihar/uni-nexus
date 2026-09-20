import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, MapPin, Plus, Printer, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ResourceDefinition } from '@uni-nexus/shared';
import { api, assetUrl, body, message, type Page, type Row } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, recordName, resourcePath } from '../lib/format';
import { Badge, EmptyState, ErrorState, Spinner } from './ui';

const text = (value: unknown, fallback = '—') =>
  value === null || value === undefined || value === '' ? fallback : String(value);
const asNumber = (value: unknown) => Number(value ?? 0) || 0;
const date = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Belum tercatat';

export function PrinterPhoto({ printer, className = '' }: { printer: Row; className?: string }) {
  return (
    <div className={`printer-photo ${className}`}>
      {printer.photo_url ? (
        <img
          src={assetUrl(String(printer.photo_url))}
          alt={`Foto ${text(printer.name, 'printer')}`}
        />
      ) : (
        <>
          <Printer size={31} />
          <span>Belum ada foto</span>
        </>
      )}
    </div>
  );
}

export function filamentSegmentCount(initialWeight: unknown, remainingWeight: unknown): number {
  const initial = Number(initialWeight);
  const remaining = Number(remainingWeight);
  if (!Number.isFinite(initial) || initial <= 0 || !Number.isFinite(remaining) || remaining <= 0)
    return 0;
  return Math.min(4, Math.max(1, Math.ceil(Math.min(1, remaining / initial) * 4)));
}

export function FilamentSpoolVisual({
  color,
  initialWeight,
  remainingWeight,
}: {
  color: string | null | undefined;
  initialWeight: unknown;
  remainingWeight: unknown;
}) {
  const normalized = /^#[0-9A-F]{6}$/i.test(color ?? '') ? String(color).toUpperCase() : '#B9BDC3';
  const segments = filamentSegmentCount(initialWeight, remainingWeight);
  const initial = asNumber(initialWeight);
  const remaining = asNumber(remainingWeight);
  const percentage = initial > 0 ? Math.max(0, Math.min(100, (remaining / initial) * 100)) : 0;
  return (
    <div
      className="filament-spool"
      role="img"
      aria-label={`Filamen tersisa ${percentage.toLocaleString('id-ID', { maximumFractionDigits: 1 })} persen, ${remaining.toLocaleString('id-ID')} dari ${initial.toLocaleString('id-ID')} gram.`}
      style={{ '--spool-color': normalized } as CSSProperties}
    >
      <span className="spool-wall left" />
      {Array.from({ length: 4 }, (_, index) => (
        <span key={index} className={`filament-segment ${index < segments ? 'visible' : ''}`} />
      ))}
      <span className="spool-core" />
      <span className="spool-wall right" />
    </div>
  );
}

function ResourceCards({
  resource,
  children,
}: {
  resource: ResourceDefinition;
  children: (row: Row) => ReactNode;
}) {
  const { workspace } = useAuth();
  const query = useQuery({
    queryKey: ['records', workspace!.id, resource.key, 'cards'],
    queryFn: () =>
      api<Page>(`/${resource.key}?page=1&pageSize=100&sort=updated_at&direction=desc`, {
        workspace: workspace!.id,
      }),
  });
  if (query.isPending) return <Spinner label={`Memuat ${resource.title.toLowerCase()}…`} />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  if (!query.data.data.length)
    return (
      <EmptyState
        title={`Belum ada ${resource.title.toLowerCase()}`}
        description="Catatan yang dibuat akan muncul di sini."
      />
    );
  const gridClass =
    resource.key === 'filament-spools'
      ? 'filament-card-grid'
      : resource.key === 'printers'
        ? 'printer-card-grid'
        : '';
  return <div className={`resource-card-grid ${gridClass}`}>{query.data.data.map(children)}</div>;
}

export function PrinterGrid({ resource }: { resource: ResourceDefinition }) {
  const { workspace } = useAuth();
  const cto = workspace?.role.toUpperCase() === 'CTO';
  return (
    <ResourceCards resource={resource}>
      {(printer) => (
        <article
          className={`resource-card printer-card ${printer.is_active === false ? 'inactive' : ''}`}
          key={printer.id}
        >
          <PrinterPhoto printer={printer} />
          <div className="resource-card-body">
            <div className="resource-card-heading">
              <div>
                <h2>{text(printer.name)}</h2>
                <p>
                  {[printer.brand, printer.model].filter(Boolean).map(String).join(' · ') ||
                    'Merek/model belum dicatat'}
                </p>
              </div>
              <Badge value={printer.status} />
            </div>
            <p className="printer-code">{text(printer.printer_code, 'Kode belum diatur')}</p>
            <dl className="card-facts">
              <div>
                <dt>Serial</dt>
                <dd>{text(printer.serial_number, 'Belum diisi')}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={13} /> Lokasi
                </dt>
                <dd>{text(printer.location, 'Belum diatur')}</dd>
              </div>
              <div>
                <dt>Perawatan</dt>
                <dd>{date(printer.last_maintenance_at)}</dd>
              </div>
              <div>
                <dt>Volume cetak</dt>
                <dd>
                  {[printer.build_volume_x_mm, printer.build_volume_y_mm, printer.build_volume_z_mm].every(
                    (value) => value !== null && value !== undefined && value !== '',
                  )
                    ? `${printer.build_volume_x_mm} × ${printer.build_volume_y_mm} × ${printer.build_volume_z_mm} mm`
                    : 'Belum diisi'}
                </dd>
              </div>
              <div>
                <dt>Nozzle</dt>
                <dd>
                  {printer.default_nozzle_size_mm ? `${printer.default_nozzle_size_mm} mm` : 'Belum diisi'}
                </dd>
              </div>
            </dl>
            <div className="resource-card-footer">
              <span className={printer.is_active === false ? 'inactive-label' : 'active-label'}>
                {printer.is_active === false ? 'Nonaktif' : 'Aktif'}
              </span>
              <Link
                className="button secondary small"
                to={`${resourcePath(resource.key)}/${printer.id}/edit`}
              >
                <Edit3 size={14} />
                {cto ? 'Edit' : 'Update Operasional'}
              </Link>
            </div>
          </div>
        </article>
      )}
    </ResourceCards>
  );
}

type Catalog = Row & {
  name: string;
  brand?: string | null;
  model?: string | null;
  photo_url?: string | null;
};
export function AddPrinterUnitDialog() {
  const { workspace } = useAuth();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Catalog | null>(null);
  const [unit, setUnit] = useState({
    serial_number: '',
    location: '',
    status: 'IDLE',
    last_maintenance_at: '',
  });
  const closeRef = useRef<HTMLButtonElement>(null);
  const catalogs = useQuery({
    queryKey: ['printer-catalog', workspace!.id],
    enabled: open,
    queryFn: async () =>
      (await api<{ data: Catalog[] }>('/printers/catalog', { workspace: workspace!.id })).data,
  });
  const create = useMutation({
    mutationFn: () =>
      api('/printers/units', {
        method: 'POST',
        workspace: workspace!.id,
        body: body({
          printer_catalog_id: selected!.id,
          serial_number: unit.serial_number,
          location: unit.location,
          status: unit.status,
          ...(unit.last_maintenance_at
            ? { last_maintenance_at: new Date(unit.last_maintenance_at).toISOString() }
            : {}),
        }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['records', workspace!.id, 'printers'] });
      setOpen(false);
      setSelected(null);
      setUnit({ serial_number: '', location: '', status: 'IDLE', last_maintenance_at: '' });
    },
  });
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      <button className="button primary" onClick={() => setOpen(true)}>
        <Plus size={17} />
        Tambah Printer
      </button>
      {open && (
        <div className="modal-backdrop" onMouseDown={() => setOpen(false)}>
          <section
            className="modal printer-selector-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Tambah printer"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              ref={closeRef}
              className="icon-button modal-close"
              aria-label="Tutup"
              onClick={() => setOpen(false)}
            >
              <X size={19} />
            </button>
            {!selected ? (
              <>
                <h2>Pilih Data Printer</h2>
                <p>Pilih data printer yang disediakan CTO untuk menambahkan unit fisik.</p>
                {catalogs.isPending ? (
                  <Spinner label="Memuat data printer…" />
                ) : catalogs.isError ? (
                  <ErrorState error={catalogs.error} retry={() => void catalogs.refetch()} />
                ) : !catalogs.data.length ? (
                  <EmptyState
                    title="Data printer belum tersedia."
                    description="Hubungi CTO untuk menambahkan data printer terlebih dahulu."
                  />
                ) : (
                  <div className="printer-picker-grid">
                    {catalogs.data.map((catalog) => (
                      <button
                        type="button"
                        className="printer-picker-card"
                        key={catalog.id}
                        onClick={() => setSelected(catalog)}
                      >
                        <PrinterPhoto printer={catalog} />
                        <span>
                          <strong>{catalog.name}</strong>
                          <small>
                            {[catalog.brand, catalog.model].filter(Boolean).join(' · ')}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <button className="back-link" onClick={() => setSelected(null)}>
                  ← Pilih data lain
                </button>
                <h2>Tambah Unit {selected.name}</h2>
                <div className="form-grid">
                  <label className="field">
                    <span>Nomor Serial</span>
                    <input
                      value={unit.serial_number}
                      onChange={(event) => setUnit({ ...unit, serial_number: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Lokasi</span>
                    <input
                      value={unit.location}
                      onChange={(event) => setUnit({ ...unit, location: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select
                      value={unit.status}
                      onChange={(event) => setUnit({ ...unit, status: event.target.value })}
                    >
                      {['IDLE', 'QUEUED', 'PRINTING', 'MAINTENANCE', 'OFFLINE', 'ERROR'].map(
                        (status) => (
                          <option key={status}>{status}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="field">
                    <span>Perawatan Terakhir</span>
                    <input
                      type="datetime-local"
                      value={unit.last_maintenance_at}
                      onChange={(event) =>
                        setUnit({ ...unit, last_maintenance_at: event.target.value })
                      }
                    />
                  </label>
                </div>
                {create.isError && <p className="form-error">{message(create.error)}</p>}
                <div className="form-actions">
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => setSelected(null)}
                  >
                    Kembali
                  </button>
                  <button
                    className="button primary"
                    type="button"
                    onClick={() => create.mutate()}
                    disabled={create.isPending}
                  >
                    {create.isPending ? 'Menyimpan…' : 'Tambah Unit'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export function AddPrinterCatalogDialog() {
  const { workspace } = useAuth();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const empty = {
    name: '',
    brand: '',
    model: '',
    build_volume_x_mm: '',
    build_volume_y_mm: '',
    build_volume_z_mm: '',
    default_nozzle_size_mm: '',
  };
  const [data, setData] = useState(empty);
  const create = useMutation({
    mutationFn: () =>
      api('/printers/catalog', {
        method: 'POST',
        workspace: workspace!.id,
        body: body(
          Object.fromEntries(
            Object.entries(data).filter(([key, value]) => key === 'name' || value !== ''),
          ),
        ),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['printer-catalog', workspace!.id] });
      setOpen(false);
      setData(empty);
    },
  });
  return (
    <>
      <button className="button secondary" onClick={() => setOpen(true)}>
        Tambah Data Printer
      </button>
      {open && (
        <div className="modal-backdrop" onMouseDown={() => setOpen(false)}>
          <section
            className="modal printer-selector-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Tambah data printer"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="icon-button modal-close"
              aria-label="Tutup"
              onClick={() => setOpen(false)}
            >
              <X size={19} />
            </button>
            <h2>Tambah Data Printer</h2>
            <p>
              Data ini menjadi spesifikasi reusable yang dapat dipilih tim saat menambahkan unit
              fisik.
            </p>
            <div className="form-grid">
              {(
                [
                  ['name', 'Nama'],
                  ['brand', 'Merek'],
                  ['model', 'Model'],
                  ['build_volume_x_mm', 'Build Volume X (mm)'],
                  ['build_volume_y_mm', 'Build Volume Y (mm)'],
                  ['build_volume_z_mm', 'Build Volume Z (mm)'],
                  ['default_nozzle_size_mm', 'Nozzle Bawaan (mm)'],
                ] as const
              ).map(([key, label]) => (
                <label className="field" key={key}>
                  <span>{label}</span>
                  <input
                    inputMode={key.includes('_mm') ? 'decimal' : undefined}
                    value={data[key]}
                    onChange={(event) => setData({ ...data, [key]: event.target.value })}
                  />
                </label>
              ))}
            </div>
            {create.isError && <p className="form-error">{message(create.error)}</p>}
            <div className="form-actions">
              <button className="button secondary" onClick={() => setOpen(false)}>
                Batal
              </button>
              <button
                className="button primary"
                disabled={!data.name.trim() || create.isPending}
                onClick={() => create.mutate()}
              >
                {create.isPending ? 'Menyimpan…' : 'Simpan Data Printer'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function FilamentGrid({ resource }: { resource: ResourceDefinition }) {
  return (
    <ResourceCards resource={resource}>
      {(spool) => {
        const initial = asNumber(spool.initial_weight_gram);
        const remaining = asNumber(spool.remaining_weight_gram);
        const percent = initial > 0 ? Math.min(100, Math.round((remaining / initial) * 100)) : 0;
        return (
          <article className="resource-card filament-card" key={spool.id}>
            <FilamentSpoolVisual
              color={typeof spool.color_hex === 'string' ? spool.color_hex : null}
              initialWeight={spool.initial_weight_gram}
              remainingWeight={spool.remaining_weight_gram}
            />
            <div className="resource-card-body">
              <div className="resource-card-heading">
                <div>
                  <h2>{text(spool.spool_code, 'Roll Filamen')}</h2>
                  <p>
                    {text(spool.color_name)} · {text(spool.color_hex)}
                  </p>
                </div>
                <Badge value={spool.status} />
              </div>
              <p className="filament-material">{text(spool.brand, 'Merek belum dicatat')}</p>
              <p className="filament-material subtle">Material #{text(spool.material_id)}</p>
              <div className="weight-row">
                <strong>{remaining.toLocaleString('id-ID')} g</strong>
                <span>/ {initial.toLocaleString('id-ID')} g</span>
                <small>{percent}% tersisa</small>
              </div>
              <div className="weight-progress" aria-label={`${percent}% filamen tersisa`}>
                <span style={{ width: `${percent}%` }} />
              </div>
              <dl className="card-facts">
                <div>
                  <dt>Batch</dt>
                  <dd>{text(spool.batch_number, 'Belum dicatat')}</dd>
                </div>
                <div>
                  <dt>Biaya / g</dt>
                  <dd>{spool.cost_per_gram ? money(String(spool.cost_per_gram)) : 'Belum dihitung'}</dd>
                </div>
                <div>
                  <dt>Dibeli</dt>
                  <dd>{date(spool.purchased_at)}</dd>
                </div>
              </dl>
              {spool.notes !== null && spool.notes !== undefined && spool.notes !== '' && (
                <p className="filament-material subtle">{String(spool.notes)}</p>
              )}
              <div className="resource-card-footer">
                <span>
                  {spool.purchase_price
                    ? money(String(spool.purchase_price))
                    : 'Harga belum dicatat'}
                </span>
                <Link
                  className="button secondary small"
                  to={`${resourcePath(resource.key)}/${spool.id}/edit`}
                >
                  <Edit3 size={14} />
                  Detail
                </Link>
              </div>
            </div>
          </article>
        );
      }}
    </ResourceCards>
  );
}

export function PrinterRelationSelector({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  const { workspace } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const query = useQuery({
    queryKey: ['printer-options', workspace!.id, search],
    enabled: open,
    queryFn: () =>
      api<Page>(
        `/printers?page=1&pageSize=100&sort=name&direction=asc&is_active=true${search ? `&search=${encodeURIComponent(search)}` : ''}`,
        { workspace: workspace!.id },
      ),
  });
  const selected = useQuery({
    queryKey: ['record', workspace!.id, 'printers', value],
    enabled: !!value,
    queryFn: async () =>
      (await api<{ data: Row }>(`/printers/${value}`, { workspace: workspace!.id })).data,
  });
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  const label = selected.data
    ? recordName(selected.data)
    : value
      ? `Printer #${value}`
      : 'Pilih printer aktif';
  return (
    <div className="printer-selector">
      <button
        type="button"
        className="printer-selector-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid}
        onClick={() => setOpen(true)}
      >
        <Printer size={16} />
        <span>{label}</span>
      </button>
      {value && (
        <button
          type="button"
          className="printer-selector-clear"
          onClick={() => onChange('')}
          aria-label="Hapus pilihan printer"
        >
          ×
        </button>
      )}
      {open && (
        <div
          className="modal-backdrop printer-selector-backdrop"
          onMouseDown={() => setOpen(false)}
        >
          <section
            className="modal printer-selector-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Pilih printer"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              ref={closeRef}
              className="icon-button modal-close"
              aria-label="Tutup pemilih printer"
              onClick={() => setOpen(false)}
            >
              <X size={19} />
            </button>
            <h2>Pilih Printer</h2>
            <p>Pilih printer aktif yang akan digunakan untuk proses ini.</p>
            <label className="printer-selector-search">
              <Search size={16} />
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, kode, atau merek…"
                aria-label="Cari printer"
              />
            </label>
            {query.isPending ? (
              <Spinner label="Memuat printer…" />
            ) : query.isError ? (
              <ErrorState error={query.error} retry={() => void query.refetch()} />
            ) : (
              <div className="printer-picker-grid">
                {query.data.data.map((printer) => (
                  <button
                    type="button"
                    key={printer.id}
                    className={`printer-picker-card ${value === printer.id ? 'selected' : ''}`}
                    onClick={() => {
                      onChange(printer.id);
                      setOpen(false);
                    }}
                  >
                    <PrinterPhoto printer={printer} />
                    <span>
                      <strong>{text(printer.name)}</strong>
                      <small>{[printer.brand, printer.model].filter(Boolean).join(' · ')}</small>
                      <small>
                        {text(printer.printer_code)} · {text(printer.status)}
                      </small>
                    </span>
                  </button>
                ))}
                {!query.data.data.length && (
                  <p className="subtle">Tidak ada printer aktif yang cocok.</p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
