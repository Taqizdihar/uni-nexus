import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Building2, Save } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { studioClientsApi } from '../../../services/api/studio-clients.api';
import type { ClientDetailResponse } from '../../../types/studio-clients';
import { ClientIdentityFields, emptyIdentityForm, type ClientIdentityForm } from './components/ClientForm';
import { ErrorBanner, LoadingState, SectionHeader, StudioPageHeader, useUnsavedChangesGuard } from './components/ClientsUI';

const buildForm = (detail: ClientDetailResponse): ClientIdentityForm => ({
  display_name: detail.client.display_name,
  party_kind: detail.client.party_kind,
  legal_name: detail.client.legal_name || '',
  email: detail.client.email || '',
  phone: detail.client.phone || '',
  website: detail.client.website || '',
  tax_id: detail.client.tax_id || '',
  address_line1: detail.client.address_line1 || '',
  address_line2: detail.client.address_line2 || '',
  city: detail.client.city || '',
  province: detail.client.province || '',
  postal_code: detail.client.postal_code || '',
  notes: detail.client.notes || '',
});

export function ClientEditPage() {
  const navigate = useNavigate();
  const clientId = Number(useParams().id);

  const [detail, setDetail] = React.useState<ClientDetailResponse | null>(null);
  const [form, setForm] = React.useState<ClientIdentityForm>(emptyIdentityForm());
  const [baseline, setBaseline] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const setValue = <K extends keyof ClientIdentityForm>(key: K, value: ClientIdentityForm[K]) => setForm(current => ({ ...current, [key]: value }));

  React.useEffect(() => {
    void (async () => {
      try {
        const response = await studioClientsApi.getClient(clientId);
        const nextForm = buildForm(response);
        setDetail(response);
        setForm(nextForm);
        setBaseline(JSON.stringify(nextForm));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Gagal memuat klien.');
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  const isDirty = JSON.stringify(form) !== baseline;
  const guard = useUnsavedChangesGuard(isDirty && !saving);
  const hasOtherRoles = (detail?.other_roles.length || 0) > 1;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    setError(null);
    if (!form.display_name.trim()) { setError('Nama klien wajib diisi.'); return; }

    const original = JSON.parse(baseline) as ClientIdentityForm;
    const payload: Record<string, unknown> = {};
    const assign = <K extends keyof ClientIdentityForm>(key: K, column: string, transform: (value: string) => unknown = value => value.trim() || null) => {
      if (form[key] !== original[key]) payload[column] = transform(form[key] as string);
    };
    assign('display_name', 'display_name', value => value.trim());
    assign('party_kind', 'party_kind', value => value);
    assign('legal_name', 'legal_name');
    assign('email', 'email');
    assign('phone', 'phone');
    assign('website', 'website');
    assign('tax_id', 'tax_id');
    assign('address_line1', 'address_line1');
    assign('address_line2', 'address_line2');
    assign('city', 'city');
    assign('province', 'province');
    assign('postal_code', 'postal_code');
    assign('notes', 'notes');

    if (Object.keys(payload).length === 0) { navigate(`/app/studio/clients/${clientId}`); return; }

    setSaving(true);
    try {
      await studioClientsApi.updateClient(clientId, payload);
      setBaseline(JSON.stringify(form));
      guard.approveNavigation();
      navigate(`/app/studio/clients/${clientId}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal menyimpan perubahan klien.');
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Memuat klien..." />;
  if (!detail) return <ErrorBanner message={error || 'Klien tidak ditemukan.'} />;

  return (
    <div className="space-y-6 pb-8">
      <StudioPageHeader
        eyebrow={detail.client.code}
        title="Edit Klien"
        description="Perbarui data identitas Klien Studio."
        back={() => navigate(`/app/studio/clients/${clientId}`)}
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {hasOtherRoles && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Klien ini menggunakan identitas Party yang sama pada modul lain. Perubahan nama, kontak umum, atau alamat akan berlaku pada seluruh UNI-NEXUS.</p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <Card>
          <div className="space-y-5 p-5 sm:p-6">
            <SectionHeader number="01" icon={Building2} title="Identitas Klien" />
            <ClientIdentityFields form={form} setValue={setValue} />
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(`/app/studio/clients/${clientId}`)} disabled={saving}>Batal</Button>
          <Button type="submit" disabled={saving || !isDirty}><Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
        </div>
      </form>

      {guard.dialog}
    </div>
  );
}
