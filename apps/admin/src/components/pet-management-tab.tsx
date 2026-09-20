import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Edit3, LoaderCircle, PawPrint, Plus, X } from 'lucide-react';
import { api, body, message, type Envelope } from '../lib/api';
import { displayPetName, resolvePetImage } from '../lib/pets';
import { Badge, EmptyState, ErrorState, Spinner, useToast } from './ui';

type ManagedPet = {
  id: string;
  code: string;
  name: string | null;
  display_name: string;
  subtitle: string | null;
  description: string | null;
  image_storage_provider: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

type PetFormValues = { code: string; name: string; subtitle: string; description: string };

const blankForm: PetFormValues = { code: '', name: '', subtitle: '', description: '' };

function PetEditor({ pet, onClose, onSaved }: { pet: ManagedPet | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const [values, setValues] = useState<PetFormValues>(pet ? { code: pet.code, name: pet.name ?? '', subtitle: pet.subtitle ?? '', description: pet.description ?? '' } : blankForm);
  const [file, setFile] = useState<File | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { code: values.code, name: values.name, subtitle: values.subtitle, description: values.description };
      const saved = await api<Envelope<ManagedPet>>(pet ? `/pet-management/${pet.id}` : '/pet-management', { method: pet ? 'PATCH' : 'POST', body: body(payload) });
      if (file) {
        const form = new FormData();
        form.append('file', file);
        await api(`/pet-management/${saved.data.id}/image`, { method: 'POST', body: form });
      }
    },
    onSuccess: async () => { await onSaved(); toast(pet ? 'Pet diperbarui.' : 'Pet ditambahkan.'); onClose(); },
    onError: (error) => toast(message(error), true),
  });
  const set = (key: keyof PetFormValues, value: string) => setValues((current) => ({ ...current, [key]: value }));
  return <div className="modal-backdrop" onClick={onClose}>
    <section className="modal pet-editor-modal" role="dialog" aria-modal="true" aria-labelledby="pet-editor-title" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="icon-button modal-close" aria-label="Tutup" onClick={onClose}><X size={19} /></button>
      <h2 id="pet-editor-title">{pet ? 'Edit Pet' : 'Tambah Pet'}</h2>
      <p>{pet ? 'Perubahan metadata langsung terlihat oleh semua pengguna yang memilih Pet ini.' : 'Tambahkan Pet global untuk digunakan anggota UNI-NEXUS.'}</p>
      <div className="form-grid">
        <label className="field"><span>Foto Pet</span><input type="file" accept=".avif,image/avif" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><small className="helper-note">Gunakan gambar AVIF. Opsional.</small></label>
        <label className="field"><span>Kode</span><input value={values.code} disabled={pet?.code === 'UNI_INU'} onChange={(event) => set('code', event.target.value)} placeholder="HAPPY_FOX" maxLength={60} /><small className="helper-note">Kode akan dinormalisasi menjadi huruf besar.</small></label>
        <label className="field"><span>Nama</span><input value={values.name} onChange={(event) => set('name', event.target.value)} placeholder="Opsional" maxLength={120} /></label>
        <label className="field"><span>Subtitle</span><input value={values.subtitle} onChange={(event) => set('subtitle', event.target.value)} placeholder="Opsional" maxLength={190} /></label>
        <label className="field full-width"><span>Deskripsi</span><textarea rows={4} value={values.description} onChange={(event) => set('description', event.target.value)} placeholder="Opsional" maxLength={10000} /></label>
      </div>
      <div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>Batal</button><button type="button" className="button primary" disabled={mutation.isPending || !values.code.trim()} onClick={() => mutation.mutate()}>{mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{pet ? 'Simpan Perubahan' : 'Tambah Pet'}</button></div>
    </section>
  </div>;
}

function PetArtwork({ pet, large = false }: { pet: ManagedPet; large?: boolean }) {
  const image = resolvePetImage(pet);
  return <div className={`pet-management-art${large ? ' large' : ''}`}>{image ? <img src={image} alt={displayPetName(pet)} /> : <PawPrint size={large ? 68 : 44} strokeWidth={1.3} />}</div>;
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
    {!pets.data.length ? <section className="panel"><EmptyState title="Belum ada data Pet." description="Tambahkan Pet pertama untuk membuatnya tersedia bagi anggota." /></section> : <section className="pet-management-grid">{pets.data.map((pet) => <article className="pet-management-card" key={pet.id}><PetArtwork pet={pet} large /><div className="pet-management-card-body"><div className="pet-management-card-heading"><div><h3>{displayPetName(pet)}</h3><code>{pet.code}</code></div><Badge value={pet.is_active ? 'ACTIVE' : 'INACTIVE'} /></div><p className="pet-management-subtitle">{pet.subtitle || '—'}</p><button type="button" className="button secondary small" onClick={() => setEditor(pet)}><Edit3 size={14} />Edit</button></div></article>)}</section>}
    {editor !== undefined && <PetEditor pet={editor} onClose={() => setEditor(undefined)} onSaved={refresh} />}
  </>;
}
