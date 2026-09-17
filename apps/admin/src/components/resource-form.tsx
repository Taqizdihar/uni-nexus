import { useMemo, useState } from 'react';
import { Controller, useForm, type Control, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, LoaderCircle, Search, Upload } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { FieldDefinition, ResourceDefinition } from '@uni-nexus/shared';
import { api, body, message, type Envelope, type Page, type Row } from '../lib/api';
import { useAuth } from '../lib/auth';
import { recordName, resourcePath, titleCase } from '../lib/format';
import { PageHeader, useToast } from './ui';

export const uploadResources = new Set(['request-files', 'design-assets', 'product-assets', 'product-images']);
type Values = Record<string, unknown>;

function inputValue(value: unknown, field: FieldDefinition): unknown {
  if (value === null || value === undefined) return field.type === 'boolean' ? false : '';
  if (field.type === 'json') return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (field.type === 'date') return String(value).slice(0, 10);
  if (field.type === 'datetime') { const date = new Date(String(value)); if (Number.isNaN(date.valueOf())) return ''; return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }
  if (field.type === 'boolean') return Boolean(value);
  return String(value);
}

function fieldGroup(field: FieldDefinition): string {
  if (field.type === 'relation') return 'Koneksi';
  if (field.type === 'textarea' || field.type === 'json') return 'Catatan & detail tambahan';
  if (field.type === 'decimal' || field.type === 'integer') return 'Kuantitas & pengukuran';
  return 'Detail utama';
}

function RelationInput({ field, value, change, invalid }: { field: FieldDefinition; value: string; change: (value: string) => void; invalid: boolean }) {
  const { workspace } = useAuth();
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['options', workspace!.id, field.reference, search], queryFn: () => api<Page>(`/${field.reference}?pageSize=100&search=${encodeURIComponent(search)}`, { workspace: workspace!.id }), staleTime: 60_000 });
  const selected = useQuery({ queryKey: ['record', workspace!.id, field.reference, value], enabled: !!value && !query.data?.data.some((item) => item.id === value), queryFn: async () => (await api<Envelope<Row>>(`/${field.reference}/${value}`, { workspace: workspace!.id })).data, staleTime: 60_000 });
  const options = query.data?.data || [];
  return <div className="relation-picker"><div className="relation-search"><Search size={14} /><input aria-label={`Cari ${field.label.toLowerCase()}`} placeholder="Cari catatan…" value={search} onChange={(event) => setSearch(event.target.value)} /></div><select aria-label={field.label} aria-invalid={invalid} value={value} onChange={(event) => change(event.target.value)}><option value="">{query.isPending ? 'Memuat opsi…' : `Pilih ${field.label.toLowerCase()}`}</option>{value && !options.some((option) => option.id === value) && <option value={value}>{selected.data ? recordName(selected.data) : `Catatan terpilih #${value}`}</option>}{options.map((option) => <option value={option.id} key={option.id}>{recordName(option)}</option>)}</select>{query.isError ? <small className="field-error">{message(query.error)}</small> : !query.isPending && !options.length && <small>Tidak ada catatan yang cocok. Buat catatan terkait terlebih dahulu.</small>}{(query.data?.meta?.total || 0) > 100 && <small>Ketik untuk mempersempit daftar catatan yang tersedia.</small>}</div>;
}

function FormField({ field, control, errors }: { field: FieldDefinition; control: Control<Values>; errors: FieldErrors<Values> }) {
  const error = errors[field.name];
  const wide = field.type === 'textarea' || field.type === 'json';
  return <div className={`field ${wide ? 'full-width' : ''}`}><label htmlFor={field.name}>{field.label}{field.required && <span className="required"> *</span>}</label><Controller control={control} name={field.name} render={({ field: controller }) => {
    const common = { id: field.name, name: controller.name, onBlur: controller.onBlur, ref: controller.ref, 'aria-invalid': !!error };
    if (field.type === 'relation') return <RelationInput field={field} value={String(controller.value || '')} change={controller.onChange} invalid={!!error} />;
    if (field.type === 'boolean') return <label className="checkbox-field"><input {...common} type="checkbox" checked={Boolean(controller.value)} onChange={(event) => controller.onChange(event.target.checked)} /><span>{controller.value ? 'Aktif' : 'Nonaktif'}</span></label>;
    if (field.type === 'select') return <select {...common} value={String(controller.value || '')} onChange={controller.onChange}><option value="">Pilih {field.label.toLowerCase()}</option>{field.options?.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select>;
    if (wide) return <textarea {...common} className={field.type === 'json' ? 'json-input' : undefined} rows={field.type === 'json' ? 6 : 4} maxLength={field.maxLength} value={String(controller.value || '')} onChange={controller.onChange} placeholder={field.type === 'json' ? '{ }' : `Tambahkan ${field.label.toLowerCase()}…`} />;
    return <input {...common} type={field.type === 'date' ? 'date' : field.type === 'datetime' ? 'datetime-local' : field.name === 'email' ? 'email' : 'text'} inputMode={field.type === 'decimal' ? 'decimal' : field.type === 'integer' ? 'numeric' : undefined} maxLength={field.maxLength} value={String(controller.value ?? '')} onChange={controller.onChange} placeholder={field.type === 'decimal' || field.type === 'integer' ? '0' : undefined} />;
  }} />{error && <small className="field-error">{String(error.message)}</small>}{field.type === 'decimal' && <small>{/gram/.test(field.name) ? 'Berat dalam gram.' : /_mm|diameter|nozzle|layer_height/.test(field.name) ? 'Ukuran dalam milimeter.' : /price|cost|fee|amount/.test(field.name) ? 'Nominal dalam Rupiah. Gunakan titik untuk desimal.' : 'Gunakan titik sebagai pemisah desimal.'}</small>}{field.type === 'json' && <small>Masukkan JSON yang valid. Kosongkan jika tidak ada data tambahan.</small>}</div>;
}

export function ResourceForm({ resource, record }: { resource: ResourceDefinition; record?: Row }) {
  const { workspace } = useAuth();
  const [params] = useSearchParams();
  const [file, setFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const client = useQueryClient();
  const toast = useToast();
  const fields = resource.fields.filter((field) => !field.readOnly);
  const groups = ['Detail utama', 'Koneksi', 'Kuantitas & pengukuran', 'Catatan & detail tambahan'].map((title) => ({ title, fields: fields.filter((field) => fieldGroup(field) === title) })).filter((group) => group.fields.length);
  const schema = useMemo(() => z.record(z.string(), z.unknown()).superRefine((values, context) => {
    for (const field of resource.fields.filter((item) => !item.readOnly)) {
      const value = values[field.name];
      const empty = value === '' || value === undefined || value === null;
      const issue = (message: string) => context.addIssue({ code: 'custom', message, path: [field.name] });
      if (field.required && empty) { issue(`${field.label} wajib diisi.`); continue; }
      if (empty) continue;
      if (field.type === 'decimal' && !/^-?\d+(\.\d+)?$/.test(String(value))) issue('Masukkan angka desimal yang valid.');
      if (field.type === 'decimal' && field.scale !== undefined && (String(value).split('.')[1]?.length || 0) > field.scale) issue(`Gunakan maksimal ${field.scale} angka desimal.`);
      if (field.type === 'integer' && (!/^-?\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)))) issue('Masukkan angka bulat yang valid.');
      if (field.maxLength && String(value).length > field.maxLength) issue(`Gunakan maksimal ${field.maxLength} karakter.`);
      if (field.type === 'json') { try { JSON.parse(String(value)); } catch { issue('Masukkan JSON yang valid.'); } }
      if (field.name === 'email' && !z.string().email().safeParse(value).success) issue('Masukkan alamat email yang valid.');
      if ((field.type === 'date' || field.type === 'datetime') && Number.isNaN(new Date(String(value)).valueOf())) issue('Masukkan tanggal yang valid.');
    }
  }), [resource]);
  const defaults = Object.fromEntries(fields.map((field) => [field.name, inputValue(record ? record[field.name] : params.get(field.name) ?? field.default, field)]));
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  const mutation = useMutation({ mutationFn: async (values: Values) => {
    const payload: Values = {};
    for (const field of fields) {
      if (record && !form.formState.dirtyFields[field.name]) continue;
      const value = values[field.name];
      if (value === '' || value === undefined || value === null) { if (record && field.nullable) payload[field.name] = null; continue; }
      payload[field.name] = field.type === 'integer' ? Number(value) : field.type === 'datetime' ? new Date(String(value)).toISOString() : field.type === 'json' ? JSON.parse(String(value)) : value;
    }
    const result = await api<Envelope<Row>>(`/${resource.key}${record ? `/${record.id}` : ''}`, { method: record ? 'PATCH' : 'POST', body: body(payload), workspace: workspace!.id });
    if (file) {
      const data = new FormData(); data.append('file', file);
      try { await api(`/files/${resource.key}/${result.data.id}`, { method: 'POST', body: data, workspace: workspace!.id }); }
      catch (error) { toast(`Catatan disimpan. Unggah berkas gagal: ${message(error)} Buka catatan untuk mencoba mengunggah kembali.`, true); }
    }
    return result.data;
  }, onSuccess: async (saved) => {
    await client.invalidateQueries({ predicate: (query) => !['session', 'resources', 'setup-status'].includes(String(query.queryKey[0])) });
    toast(`${resource.singular} ${record ? 'diperbarui' : 'dibuat'}.`);
    navigate(`${resourcePath(resource.key)}/${saved.id}`);
  } });
  return <><Link className="back-link" to={`${resourcePath(resource.key)}${record ? `/${record.id}` : ''}`}><ArrowLeft size={16} />Kembali ke {record ? resource.singular.toLowerCase() : resource.title.toLowerCase()}</Link><PageHeader eyebrow={resource.group.toUpperCase()} title={`${record ? 'Edit' : 'Baru'} ${resource.singular.toLowerCase()}`} description={record ? `Perbarui detail untuk ${recordName(record)}.` : resource.description} /><form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate><div className="form-layout"><div className="form-sections">{groups.map((group, index) => <section className="panel form-section" key={group.title}><div className="form-section-heading"><span>{String(index + 1).padStart(2, '0')}</span><h2>{group.title}</h2></div><div className="form-grid">{group.fields.map((field) => <FormField field={field} key={field.name} control={form.control} errors={form.formState.errors} />)}</div></section>)}{uploadResources.has(resource.key) && <section className="panel form-section"><div className="form-section-heading"><Upload size={18} /><h2>Lampirkan Berkas</h2></div><label className="upload-drop"><Upload size={25} /><strong>{file ? file.name : 'Pilih berkas untuk dilampirkan'}</strong><span>Gambar, dokumen, atau berkas model 3D yang didukung. Unggahan bersifat privat.</span><input type="file" aria-label="Pilih lampiran" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label></section>}</div><aside className="form-aside"><div className="panel form-guidance"><h3>Sedikit konteks sangat membantu.</h3><p>Jaga agar catatan lengkap dan saling terhubung agar tim Anda dapat melanjutkan pekerjaan dengan mudah.</p><hr /><p><span className="required">*</span> Kolom wajib diisi</p><p>Perubahan disimpan ke <strong>{workspace?.name}</strong>.</p></div></aside></div>{mutation.isError && <div className="form-error save-error" role="alert">{message(mutation.error)}</div>}<div className="form-actions"><Link className="button secondary" to={`${resourcePath(resource.key)}${record ? `/${record.id}` : ''}`}>Batal</Link><button className="button primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{mutation.isPending ? 'Menyimpan…' : record ? 'Simpan Perubahan' : `Buat ${resource.singular.toLowerCase()}`}</button></div></form></>;
}
