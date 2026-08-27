import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import type { ClientContactDraft, ClientDuplicateCandidate, ClientPartyKind } from '../../../../types/studio-clients';
import { Field, partyKindLabels } from './ClientsUI';

export const draftKey = () => Math.random().toString(36).slice(2, 10);
export const emptyContactDraft = (): ClientContactDraft => ({ key: draftKey(), full_name: '', job_title: '', email: '', phone: '', whatsapp: '', is_primary: false, notes: '' });

export interface ClientIdentityForm {
  display_name: string;
  party_kind: ClientPartyKind;
  legal_name: string;
  email: string;
  phone: string;
  website: string;
  tax_id: string;
  address_line1: string;
  address_line2: string;
  city: string;
  province: string;
  postal_code: string;
  notes: string;
}

export const emptyIdentityForm = (): ClientIdentityForm => ({
  display_name: '', party_kind: 'individual', legal_name: '', email: '', phone: '', website: '', tax_id: '',
  address_line1: '', address_line2: '', city: '', province: '', postal_code: '', notes: '',
});

/** Individuals see "Nama Lengkap"; companies/institutions see the more corporate label pair. */
export function ClientIdentityFields({ form, setValue }: { form: ClientIdentityForm; setValue: <K extends keyof ClientIdentityForm>(key: K, value: ClientIdentityForm[K]) => void }) {
  const isIndividual = form.party_kind === 'individual';
  return (
    <div className="space-y-4">
      <Field label="Jenis klien">
        <select className="studio-input studio-select" value={form.party_kind} onChange={event => setValue('party_kind', event.target.value as ClientPartyKind)}>
          {Object.entries(partyKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={isIndividual ? 'Nama Lengkap' : 'Nama Tampilan'} required>
          <input required className="studio-input" value={form.display_name} onChange={event => setValue('display_name', event.target.value)} />
        </Field>
        {!isIndividual && (
          <Field label="Nama Legal" hint="Opsional.">
            <input className="studio-input" value={form.legal_name} onChange={event => setValue('legal_name', event.target.value)} />
          </Field>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Email"><input type="email" className="studio-input" value={form.email} onChange={event => setValue('email', event.target.value)} /></Field>
        <Field label="Telepon"><input className="studio-input" value={form.phone} onChange={event => setValue('phone', event.target.value)} /></Field>
        <Field label="Website" hint="Harus diawali http:// atau https://."><input className="studio-input" value={form.website} placeholder="https://" onChange={event => setValue('website', event.target.value)} /></Field>
        <Field label="NPWP / Tax ID"><input className="studio-input" value={form.tax_id} onChange={event => setValue('tax_id', event.target.value)} /></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Alamat" className="md:col-span-2"><input className="studio-input" value={form.address_line1} onChange={event => setValue('address_line1', event.target.value)} /></Field>
        <Field label="Alamat (baris 2)" className="md:col-span-2"><input className="studio-input" value={form.address_line2} onChange={event => setValue('address_line2', event.target.value)} /></Field>
        <Field label="Kota"><input className="studio-input" value={form.city} onChange={event => setValue('city', event.target.value)} /></Field>
        <Field label="Provinsi"><input className="studio-input" value={form.province} onChange={event => setValue('province', event.target.value)} /></Field>
        <Field label="Kode Pos"><input className="studio-input" value={form.postal_code} onChange={event => setValue('postal_code', event.target.value)} /></Field>
      </div>
      <Field label="Catatan"><textarea className="studio-textarea" value={form.notes} onChange={event => setValue('notes', event.target.value)} /></Field>
    </div>
  );
}

/** PIC/contact-person editor. First contact becomes primary automatically when none is marked. */
export function ContactDraftEditor({ contacts, onChange, encourage }: { contacts: ClientContactDraft[]; onChange: (value: ClientContactDraft[]) => void; encourage?: boolean }) {
  const setContact = (key: string, patch: Partial<ClientContactDraft>) => onChange(contacts.map(item => (item.key === key ? { ...item, ...patch } : item)));
  const setPrimary = (key: string) => onChange(contacts.map(item => ({ ...item, is_primary: item.key === key })));

  return (
    <div className="space-y-3">
      {contacts.length === 0 && encourage && (
        <p className="rounded-lg border border-dashed border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)] p-3 text-xs text-[var(--nexus-muted)]">
          Disarankan menambahkan minimal satu PIC / Contact Person, meski tidak wajib.
        </p>
      )}
      {contacts.map(contact => (
        <div key={contact.key} className="rounded-xl border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/40 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nama kontak" required><input className="studio-input" value={contact.full_name} onChange={event => setContact(contact.key, { full_name: event.target.value })} /></Field>
            <Field label="Jabatan"><input className="studio-input" value={contact.job_title} onChange={event => setContact(contact.key, { job_title: event.target.value })} /></Field>
            <Field label="Email"><input type="email" className="studio-input" value={contact.email} onChange={event => setContact(contact.key, { email: event.target.value })} /></Field>
            <Field label="Telepon"><input className="studio-input" value={contact.phone} onChange={event => setContact(contact.key, { phone: event.target.value })} /></Field>
            <Field label="WhatsApp"><input className="studio-input" value={contact.whatsapp} onChange={event => setContact(contact.key, { whatsapp: event.target.value })} /></Field>
            <Field label="Catatan"><input className="studio-input" value={contact.notes} onChange={event => setContact(contact.key, { notes: event.target.value })} /></Field>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--nexus-charcoal)]">
              <input type="radio" name="primary-contact" checked={contact.is_primary} onChange={() => setPrimary(contact.key)} />
              Kontak utama
            </label>
            <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline" onClick={() => onChange(contacts.filter(item => item.key !== contact.key))}>
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...contacts, emptyContactDraft()])}>
        <Plus className="h-4 w-4" /> Tambah Kontak
      </Button>
    </div>
  );
}

/**
 * Duplicate-candidate advisory. Nothing merges automatically — the user picks.
 * A candidate that is already an active Studio client offers a profile link
 * instead of "Gunakan Party Ini", since adopting it again would just fail.
 */
export function DuplicateCandidates({ candidates, onUseExisting, onViewProfile }: {
  candidates: ClientDuplicateCandidate[];
  onUseExisting: (candidate: ClientDuplicateCandidate) => void;
  onViewProfile: (candidate: ClientDuplicateCandidate) => void;
}) {
  if (!candidates.length) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-bold text-amber-900">Kemungkinan Klien Sudah Terdaftar</p>
      <p className="mt-1 text-[11px] leading-4 text-amber-800">Gunakan data yang sudah ada agar identitas klien tidak terduplikasi.</p>
      <ul className="mt-2 space-y-2">
        {candidates.map(candidate => (
          <li key={candidate.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-white p-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[var(--nexus-charcoal)]">{candidate.display_name} <span className="studio-code">{candidate.code}</span></p>
              <p className="text-[11px] text-[var(--nexus-muted)]">{candidate.match_reason}{candidate.is_studio_client ? ' · sudah menjadi Klien Studio aktif' : ' · belum berperan Klien Studio'}</p>
            </div>
            {candidate.is_studio_client
              ? <Button type="button" size="sm" variant="outline" onClick={() => onViewProfile(candidate)}>Lihat Profil Klien</Button>
              : <Button type="button" size="sm" variant="outline" onClick={() => onUseExisting(candidate)}>Gunakan Party Ini</Button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
