import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Save, Users } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { studioClientsApi } from '../../../services/api/studio-clients.api';
import type { ClientContactDraft, ClientDuplicateCandidate, CreateClientRequest } from '../../../types/studio-clients';
import { ClientIdentityFields, ContactDraftEditor, DuplicateCandidates, emptyIdentityForm } from './components/ClientForm';
import { ErrorBanner, SectionHeader, StudioPageHeader, useUnsavedChangesGuard } from './components/ClientsUI';

export function ClientCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState(emptyIdentityForm());
  const [contacts, setContacts] = React.useState<ClientContactDraft[]>([]);
  const [duplicates, setDuplicates] = React.useState<ClientDuplicateCandidate[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const setValue = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm(current => ({ ...current, [key]: value }));

  React.useEffect(() => {
    const payload = { display_name: form.display_name.trim(), legal_name: form.legal_name.trim(), email: form.email.trim(), phone: form.phone.trim(), tax_id: form.tax_id.trim() };
    if (!payload.display_name && !payload.email && !payload.phone && !payload.tax_id && !payload.legal_name) { setDuplicates([]); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setCheckingDuplicates(true);
      try {
        const candidates = await studioClientsApi.findDuplicates(payload);
        if (!cancelled) setDuplicates(candidates);
      } catch { if (!cancelled) setDuplicates([]); } finally { if (!cancelled) setCheckingDuplicates(false); }
    }, 400);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [form.display_name, form.legal_name, form.email, form.phone, form.tax_id]);

  const isDirty = React.useMemo(() => (
    (Object.values(form) as string[]).some(value => value.trim() !== '') || contacts.length > 0
  ), [form, contacts]);
  const guard = useUnsavedChangesGuard(isDirty && !saving);

  const saveClient = async (useExistingPartyId?: number) => {
    setError(null);
    if (!form.display_name.trim()) { setError('Nama klien wajib diisi.'); return; }
    const filledContacts = contacts.filter(contact => contact.full_name.trim());
    if (contacts.some(contact => !contact.full_name.trim() && (contact.email.trim() || contact.phone.trim() || contact.job_title.trim()))) {
      setError('Lengkapi nama untuk setiap kontak yang sudah mulai diisi.');
      return;
    }

    const payload: CreateClientRequest = {
      display_name: form.display_name.trim(),
      party_kind: form.party_kind,
      legal_name: form.legal_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      tax_id: form.tax_id.trim() || null,
      address_line1: form.address_line1.trim() || null,
      address_line2: form.address_line2.trim() || null,
      city: form.city.trim() || null,
      province: form.province.trim() || null,
      postal_code: form.postal_code.trim() || null,
      notes: form.notes.trim() || null,
      contacts: filledContacts.map(contact => ({
        full_name: contact.full_name.trim(),
        job_title: contact.job_title.trim() || null,
        email: contact.email.trim() || null,
        phone: contact.phone.trim() || null,
        whatsapp: contact.whatsapp.trim() || null,
        is_primary: contact.is_primary,
        notes: contact.notes.trim() || null,
      })),
      use_existing_party_id: useExistingPartyId ?? null,
    };

    setSaving(true);
    try {
      const created = await studioClientsApi.createClient(payload);
      guard.approveNavigation();
      navigate(`/app/studio/clients/${created.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal menyimpan klien.');
      setSaving(false);
    }
  };

  const submit = (event: React.FormEvent) => { event.preventDefault(); void saveClient(); };

  return (
    <div className="space-y-6 pb-8">
      <StudioPageHeader
        title="Tambah Klien"
        description="Catat klien baru Uni-Inside Studio. Hanya nama klien yang wajib diisi — data lain dapat dilengkapi kemudian."
        back={() => navigate('/app/studio/clients')}
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <form onSubmit={submit} className="space-y-5">
        <Card>
          <div className="space-y-5 p-5 sm:p-6">
            <SectionHeader number="01" icon={Building2} title="Identitas Klien" description="Jenis dan nama klien." />
            <ClientIdentityFields form={form} setValue={setValue} />
          </div>
        </Card>

        {(checkingDuplicates || duplicates.length > 0) && (
          <DuplicateCandidates
            candidates={checkingDuplicates ? [] : duplicates}
            onUseExisting={candidate => void saveClient(candidate.id)}
            onViewProfile={candidate => navigate(`/app/studio/clients/${candidate.id}`)}
          />
        )}

        <Card>
          <div className="space-y-5 p-5 sm:p-6">
            <SectionHeader number="02" icon={Users} title="PIC / Contact Person" description="Opsional, namun disarankan untuk klien perusahaan atau institusi." />
            <ContactDraftEditor contacts={contacts} onChange={setContacts} encourage={form.party_kind !== 'individual'} />
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/app/studio/clients')} disabled={saving}>Batal</Button>
          <Button type="submit" disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan Klien'}</Button>
        </div>
      </form>

      {guard.dialog}
    </div>
  );
}
