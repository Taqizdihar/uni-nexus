import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Check, Edit3, LoaderCircle, PawPrint, Plus, Trash2, X } from 'lucide-react';
import { api, body, message, type Envelope } from '../lib/api';
import { displayPetName, resolvePetImage } from '../lib/pets';
import { PetImage } from './pet-image';
import { Badge, EmptyState, ErrorState, Spinner, useToast } from './ui';

type ManagedPet = {
  id: string;
  builtin_key: string | null;
  code: string | null;
  name: string | null;
  display_name: string;
  subtitle: string | null;
  description: string | null;
  image_storage_provider: string | null;
  image_url: string | null;
  media?: Record<string, Array<{ id: string; frame_index: number; duration_ms: number | null; url: string | null }>>;
  is_active: boolean;
  sort_order: number;
};

type PetFormValues = { code: string; name: string; subtitle: string; description: string };

const blankForm: PetFormValues = { code: '', name: '', subtitle: '', description: '' };

function PetEditor({ pet, onClose, onSaved }: { pet: ManagedPet | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const [values, setValues] = useState<PetFormValues>(pet ? { code: pet.code ?? '', name: pet.name ?? '', subtitle: pet.subtitle ?? '', description: pet.description ?? '' } : blankForm);
  const [touched, setTouched] = useState<Partial<Record<keyof PetFormValues, boolean>>>({});
  const [file, setFile] = useState<File | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { code: values.code, name: values.name, subtitle: values.subtitle, description: values.description };
      const saved = await api<Envelope<ManagedPet>>(pet ? `/pet-management/${pet.id}` : '/pet-management', { method: pet ? 'PATCH' : 'POST', body: body(payload) });
      if (file) {
        const form = new FormData();
        form.append('file', file);
        await api(`/pet-management/${saved.data.id}/frames`, { method: 'POST', body: form });
      }
    },
    onSuccess: async () => { await onSaved(); toast(pet ? 'Pet diperbarui.' : 'Pet ditambahkan.'); onClose(); },
    onError: (error) => toast(message(error), true),
  });
  const set = (key: keyof PetFormValues, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const touch = (key: keyof PetFormValues) => setTouched((current) => ({ ...current, [key]: true }));
  const invalid = (key: keyof PetFormValues) => required && touched[key] && !values[key].trim();
  const complete = Object.values(values).every((value) => value.trim().length > 0);
  const required = !pet || !pet.builtin_key;
  return <div className="modal-backdrop" onClick={onClose}>
    <section className="modal pet-editor-modal" role="dialog" aria-modal="true" aria-labelledby="pet-editor-title" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="icon-button modal-close" aria-label="Tutup" onClick={onClose}><X size={19} /></button>
      <h2 id="pet-editor-title">{pet ? 'Edit Pet' : 'Tambah Pet'}</h2>
      <p>{pet ? 'Perubahan metadata langsung terlihat oleh semua pengguna yang memilih Pet ini.' : 'Tambahkan Pet global untuk digunakan anggota UNI-NEXUS.'}</p>
      <div className="form-grid">
        <label className="field"><span>Tambah Frame</span><input type="file" accept=".avif,image/avif" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><small className="helper-note">Gunakan gambar AVIF untuk frame Idle baru.</small></label>
        <label className="field"><span>Kode{required && ' *'}</span><input value={values.code} onChange={(event) => set('code', event.target.value)} onBlur={() => touch('code')} placeholder="HAPPY_FOX" maxLength={60} required={required} />{invalid('code') && <small className="field-error">Kode Pet wajib diisi.</small>}<small className="helper-note">Kode dapat diubah dan akan dinormalisasi menjadi huruf besar.</small></label>
        <label className="field"><span>Nama{required && ' *'}</span><input value={values.name} onChange={(event) => set('name', event.target.value)} onBlur={() => touch('name')} placeholder={required ? 'Nama Pet' : 'Kosongkan untuk menghapus'} maxLength={120} required={required} />{invalid('name') && <small className="field-error">Nama Pet wajib diisi.</small>}</label>
        <label className="field"><span>Subtitle{required && ' *'}</span><input value={values.subtitle} onChange={(event) => set('subtitle', event.target.value)} onBlur={() => touch('subtitle')} placeholder={required ? 'Tagline Pet' : 'Kosongkan untuk menghapus'} maxLength={190} required={required} />{invalid('subtitle') && <small className="field-error">Subtitle Pet wajib diisi.</small>}</label>
        <label className="field full-width"><span>Deskripsi{required && ' *'}</span><textarea rows={4} value={values.description} onChange={(event) => set('description', event.target.value)} onBlur={() => touch('description')} placeholder={required ? 'Deskripsi Pet' : 'Kosongkan untuk menghapus'} maxLength={10000} required={required} />{invalid('description') && <small className="field-error">Deskripsi Pet wajib diisi.</small>}</label>
      </div>
      {pet && <PetFrameList pet={pet} onSaved={onSaved} />}
      <div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>Batal</button><button type="button" className="button primary" disabled={mutation.isPending || (required && !complete) || (!required && !file && !values.code.trim() && !values.name.trim() && !values.subtitle.trim() && !values.description.trim())} onClick={() => mutation.mutate()}>{mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{pet ? 'Simpan Perubahan' : 'Tambah Pet'}</button></div>
    </section>
  </div>;
}

function PetFrameList({ pet, onSaved }: { pet: ManagedPet; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const frames = pet.media?.IDLE ?? [];
  const mutate = useMutation({
    mutationFn: async (action: { type: 'delete' | 'reorder' | 'replace'; id?: string; ids?: string[]; file?: File }) => {
      if (action.type === 'delete') return api(`/pet-management/${pet.id}/frames/${action.id}`, { method: 'DELETE' });
      if (action.type === 'replace') { const form = new FormData(); form.append('file', action.file!); return api(`/pet-management/${pet.id}/frames/${action.id}`, { method: 'PUT', body: form }); }
      return api(`/pet-management/${pet.id}/frames/reorder`, { method: 'PUT', body: body({ state: 'IDLE', frame_ids: action.ids }) });
    },
    onSuccess: async () => { await onSaved(); toast('Urutan frame diperbarui.'); }, onError: (error) => toast(message(error), true),
  });
  const move = (index: number, direction: -1 | 1) => {
    const next = [...frames]; const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    mutate.mutate({ type: 'reorder', ids: next.map((frame) => frame.id) });
  };
  return <section className="pet-frame-list"><h3>Urutan Frame Idle</h3>{frames.length === 0 ? <p className="helper-note">Belum ada frame Cloudinary; aset bawaan tetap digunakan sebagai cadangan.</p> : frames.map((frame, index) => <div key={frame.id} className="pet-frame-row"><span>Frame {frame.frame_index} · {frame.duration_ms ?? 900} ms</span><span><label className="button secondary small">Ganti Frame<input hidden type="file" accept=".avif,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) mutate.mutate({ type: 'replace', id: frame.id, file }); }} /></label><button className="icon-button" type="button" aria-label="Naikkan urutan frame" disabled={mutate.isPending || index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></button><button className="icon-button" type="button" aria-label="Turunkan urutan frame" disabled={mutate.isPending || index === frames.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></button><button className="icon-button danger" type="button" aria-label="Hapus frame" disabled={mutate.isPending} onClick={() => mutate.mutate({ type: 'delete', id: frame.id })}><Trash2 size={15} /></button></span></div>)}</section>;
}

function PetArtwork({ pet, large = false }: { pet: ManagedPet; large?: boolean }) {
  return <div className={`pet-management-art${large ? ' large' : ''}`}>{resolvePetImage(pet) ? <PetImage pet={pet} alt={displayPetName(pet)} /> : <PawPrint size={large ? 68 : 44} strokeWidth={1.3} />}</div>;
}

export function PetManagementTab() {
  const client = useQueryClient();
  const [editor, setEditor] = useState<ManagedPet | null | undefined>(undefined);
  const pets = useQuery({ queryKey: ['pet-management'], queryFn: async () => (await api<Envelope<ManagedPet[]>>('/pet-management')).data });
  const refresh = async () => { await client.invalidateQueries({ queryKey: ['pet-management'] }); await client.invalidateQueries({ queryKey: ['profile-pets'] }); await client.invalidateQueries({ queryKey: ['profile'] }); await client.invalidateQueries({ queryKey: ['team'] }); };
  if (pets.isPending) return <Spinner label="Memuat Pet…" />;
  if (pets.isError) return <ErrorState error={pets.error} retry={() => void pets.refetch()} />;
  return <>
    <section className="panel pet-management-header"><div><h2>Pet</h2><p>Master Pet global dengan satu state visual: Idle.</p></div><button type="button" className="button primary" onClick={() => setEditor(null)}><Plus size={16} />Tambah Pet</button></section>
    {!pets.data.length ? <section className="panel"><EmptyState title="Belum ada data Pet." description="Tambahkan Pet pertama untuk membuatnya tersedia bagi anggota." /></section> : <section className="pet-management-grid">{pets.data.map((pet) => <article className="pet-management-card" key={pet.id}><PetArtwork pet={pet} large /><div className="pet-management-card-body"><div className="pet-management-card-heading"><div><h3>{displayPetName(pet)}</h3><code>{pet.code || '—'}</code></div><Badge value={pet.is_active ? 'ACTIVE' : 'INACTIVE'} /></div><p className="pet-management-subtitle">{pet.subtitle || '—'}</p><p className="pet-management-description">{pet.description || '—'}</p><button type="button" className="button secondary small" onClick={() => setEditor(pet)}><Edit3 size={14} />Edit</button></div></article>)}</section>}
    {editor !== undefined && <PetEditor pet={editor} onClose={() => setEditor(undefined)} onSaved={refresh} />}
  </>;
}
