import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, LoaderCircle, Plus, RefreshCw } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import { formatDate } from '../../../lib/utils';
import { integrationsApi } from '../../../services/api/integrations.api';
import type { IntegrationConnection, IntegrationConnectionDetail, IntegrationCredentialMeta, IntegrationOverview, IntegrationScope, IntegrationSyncLog, ProviderDefinition } from '../../../types/integrations';

const inputClass = 'w-full rounded-lg border border-[var(--nexus-border)] bg-white px-3 py-2 text-sm text-[var(--nexus-charcoal)] outline-none transition focus:border-[var(--nexus-yellow-deep)] focus:ring-4 focus:ring-[var(--nexus-yellow)]/20';
const labelClass = 'mb-1.5 block text-xs font-semibold text-[var(--nexus-muted)]';

const statusLabel: Record<string, string> = { not_connected: 'Belum Terhubung', connected: 'Terhubung', error: 'Error', disabled: 'Dinonaktifkan', planned: 'Direncanakan', success: 'Berhasil', failed: 'Gagal', running: 'Berjalan', partial: 'Sebagian' };
const statusVariant = (status: string): 'success' | 'warning' | 'error' | 'info' | 'outline' =>
  status === 'connected' || status === 'success' ? 'success' : status === 'error' || status === 'failed' ? 'error' : status === 'disabled' || status === 'planned' ? 'outline' : 'warning';
const categoryLabel: Record<string, string> = { google_workspace: 'Google Workspace', messaging: 'Messaging', marketplace: 'Marketplace', payment: 'Payment', api_webhook: 'API / Webhook', other: 'Lainnya' };
const scopeLabel: Record<string, string> = { organization: 'Organisasi', craft: 'Craft', studio: 'Studio' };

function isManage(auth: ReturnType<typeof useAuth>) { return auth.hasPermission('integrations.manage'); }
function isSync(auth: ReturnType<typeof useAuth>) { return auth.hasPermission('integrations.sync'); }

function PageHeader({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--nexus-yellow-deep)]">Fitur Global</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--nexus-charcoal)]">{title}</h1><p className="mt-1 text-sm text-[var(--nexus-muted)]">{description}</p></div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}</div>;
}
function Loading() { return <div className="flex min-h-48 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-[var(--nexus-yellow-deep)]" /></div>; }
function ErrorState({ message, retry }: { message: string; retry: () => void }) { return <Card><CardContent className="flex flex-col items-start gap-3 p-6"><p className="text-sm text-red-700">{message}</p><Button variant="outline" onClick={retry}><RefreshCw className="h-4 w-4" />Coba Lagi</Button></CardContent></Card>; }
function Empty({ title }: { title: string }) { return <Card><CardContent className="p-8 text-center"><h2 className="font-bold text-[var(--nexus-charcoal)]">{title}</h2></CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className={labelClass}>{label}</span>{children}</label>; }

function SyncHistoryTable({ rows }: { rows: IntegrationSyncLog[] }) {
  if (!rows.length) return <div className="p-6 text-sm text-[var(--nexus-muted)]">Belum ada riwayat.</div>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[var(--nexus-cream-soft)] text-xs uppercase text-[var(--nexus-muted)]"><tr><th className="p-4">Tipe</th><th>Status</th><th>Mulai</th><th>Selesai</th><th>Record</th><th className="p-4">Aksi</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-[var(--nexus-border)]"><td className="p-4">{row.sync_type}</td><td><Badge variant={statusVariant(row.status_code)}>{statusLabel[row.status_code] || row.status_code}</Badge></td><td>{formatDate(row.started_at)}</td><td>{row.finished_at ? formatDate(row.finished_at) : '—'}</td><td>{row.records_processed}</td><td className="p-4"><Link to={`/app/integrations/history/${row.id}`} className="text-xs font-semibold text-[var(--nexus-yellow-deep)]">Detail</Link></td></tr>)}</tbody></table></div>;
}

export function IntegrationOverviewPage() {
  const [data, setData] = useState<IntegrationOverview | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { setError(''); integrationsApi.overview().then(setData).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Ringkasan tidak dapat dimuat.')); }, []);
  useEffect(() => { load(); }, [load]);
  if (error) return <div className="space-y-6"><PageHeader title="Pusat Integrasi" description="Pantau layanan eksternal yang terhubung ke UNI-NEXUS." /><ErrorState message={error} retry={load} /></div>;
  if (!data) return <Loading />;
  const kpis = [
    { label: 'Total Koneksi', value: data.kpis.total },
    { label: 'Terhubung', value: data.kpis.connected },
    { label: 'Perlu Perhatian', value: data.kpis.error },
    { label: 'Belum Terhubung', value: data.kpis.not_connected },
    { label: 'Dinonaktifkan', value: data.kpis.disabled },
    { label: 'Provider Direncanakan', value: data.kpis.planned_providers },
  ];
  return <div className="space-y-6">
    <PageHeader title="Pusat Integrasi" description="Pantau layanan eksternal yang terhubung ke UNI-NEXUS, kemampuannya, dan riwayat sinkronisasi." actions={<><Link to="/app/integrations/connections/new"><Button><Plus className="h-4 w-4" />Koneksi Baru</Button></Link><Link to="/app/integrations/providers"><Button variant="outline">Katalog Provider</Button></Link></>} />
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{kpis.map((item) => <Card key={item.label}><CardContent className="p-5"><p className="text-2xl font-bold text-[var(--nexus-charcoal)]">{item.value}</p><p className="mt-1 text-xs text-[var(--nexus-muted)]">{item.label}</p></CardContent></Card>)}</section>
    <section className="grid gap-4 xl:grid-cols-3">
      <LogList title="Uji Koneksi Terbaru" rows={data.recent_tests} empty="Belum ada uji koneksi." />
      <LogList title="Sinkronisasi Terbaru" rows={data.recent_syncs} empty="Belum ada sinkronisasi." />
      <LogList title="Kegagalan Terbaru" rows={data.recent_failures} empty="Tidak ada kegagalan terbaru." />
    </section>
  </div>;
}
function LogList({ title, rows, empty }: { title: string; rows: IntegrationSyncLog[]; empty: string }) {
  return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><div className="divide-y divide-[var(--nexus-border)]">{rows.length ? rows.slice(0, 6).map((row) => <div key={row.id} className="p-4 text-sm"><Link to={`/app/integrations/history/${row.id}`} className="font-semibold text-[var(--nexus-charcoal)] hover:text-[var(--nexus-yellow-deep)]">{row.integration_name}</Link><p className="mt-0.5 text-xs text-[var(--nexus-muted)]">{row.sync_type} · <Badge variant={statusVariant(row.status_code)}>{statusLabel[row.status_code] || row.status_code}</Badge></p></div>) : <p className="p-5 text-sm text-[var(--nexus-muted)]">{empty}</p>}</div></Card>;
}

export function IntegrationConnectionsPage() {
  const auth = useAuth(); const canManage = isManage(auth);
  const [rows, setRows] = useState<IntegrationConnection[] | null>(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', category: '', scope: '', status: '' });
  const load = useCallback(() => { setError(''); integrationsApi.connections(filters).then(setRows).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Koneksi tidak dapat dimuat.')); }, [filters]);
  useEffect(() => { load(); }, [load]);
  return <div className="space-y-6">
    <PageHeader title="Koneksi Integrasi" description="Kelola koneksi ke layanan eksternal di seluruh organisasi." actions={canManage ? <Link to="/app/integrations/connections/new"><Button><Plus className="h-4 w-4" />Koneksi Baru</Button></Link> : undefined} />
    <Card><CardContent className="flex flex-wrap gap-3 p-4">
      <input className={`${inputClass} max-w-xs`} placeholder="Cari koneksi..." value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
      <select className={inputClass} value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">Semua Kategori</option>{Object.entries(categoryLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select className={inputClass} value={filters.scope} onChange={(event) => setFilters({ ...filters, scope: event.target.value })}><option value="">Semua Scope</option>{Object.entries(scopeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select className={inputClass} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Semua Status</option>{['not_connected', 'connected', 'error', 'disabled'].map((value) => <option key={value} value={value}>{statusLabel[value]}</option>)}</select>
    </CardContent></Card>
    {error ? <ErrorState message={error} retry={load} /> : !rows ? <Loading /> : rows.length === 0 ? <Empty title="Belum Ada Koneksi Integrasi" /> : <Card><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[var(--nexus-cream-soft)] text-xs uppercase text-[var(--nexus-muted)]"><tr><th className="p-4">Koneksi</th><th>Provider</th><th>Scope</th><th>Status</th><th>Kemampuan</th><th>Sinkron Terakhir</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-[var(--nexus-border)]"><td className="p-4"><Link to={`/app/integrations/connections/${row.id}`} className="font-semibold text-[var(--nexus-charcoal)] hover:text-[var(--nexus-yellow-deep)]">{row.display_name}</Link><p className="mt-0.5 text-xs text-[var(--nexus-muted)]">{row.integration_code}</p></td><td>{row.provider_display_name}</td><td>{scopeLabel[row.scope]}</td><td><Badge variant={statusVariant(row.status_code)}>{statusLabel[row.status_code]}</Badge></td><td><div className="flex gap-1">{row.capabilities.test && <Badge variant="outline">Test</Badge>}{row.capabilities.sync && <Badge variant="outline">Sync</Badge>}</div></td><td>{row.last_sync_at ? formatDate(row.last_sync_at) : '—'}</td></tr>)}</tbody></table></div></Card>}
  </div>;
}

export function IntegrationConnectionWizardPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [providers, setProviders] = useState<ProviderDefinition[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { integrationsApi.providers().then(setProviders).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Katalog provider tidak dapat dimuat.')); }, []);
  const [step, setStep] = useState(1);
  const [providerCode, setProviderCode] = useState(params.get('provider') || '');
  const [scope, setScope] = useState<IntegrationScope | ''>('');
  const [displayName, setDisplayName] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const provider = providers?.find((item) => item.code === providerCode) || null;

  useEffect(() => { if (provider && !displayName) setDisplayName(provider.displayName); }, [provider]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorState message={error} retry={() => window.location.reload()} />;
  if (!providers) return <Loading />;
  const availableProviders = providers.filter((item) => item.availability === 'available');
  const steps = ['Pilih Provider', 'Pilih Scope', 'Konfigurasi', 'Kredensial', 'Review', 'Simpan & Uji Koneksi'];

  const save = async () => {
    if (!provider || !scope) return;
    setSaving(true); setSaveError('');
    try {
      const created = await integrationsApi.createConnection({ provider_code: provider.code, scope, display_name: displayName, config_json: config });
      const secretEntries = Object.entries(secrets).filter(([, value]) => value.trim());
      if (secretEntries.length) await integrationsApi.updateCredentials(created.id, Object.fromEntries(secretEntries));
      await integrationsApi.testConnection(created.id).catch(() => undefined);
      navigate(`/app/integrations/connections/${created.id}`);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Koneksi gagal disimpan.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-6">
    <PageHeader title="Koneksi Baru" description="Ikuti langkah berikut untuk menghubungkan layanan eksternal." actions={<Link to="/app/integrations/connections"><Button variant="outline"><ArrowLeft className="h-4 w-4" />Kembali</Button></Link>} />
    <div className="flex flex-wrap gap-2">{steps.map((label, index) => <Badge key={label} variant={index + 1 === step ? 'default' : index + 1 < step ? 'success' : 'outline'}>{index + 1}. {label}</Badge>)}</div>
    <Card><CardContent className="space-y-5 p-6">
      {step === 1 && <div className="space-y-3">
        {availableProviders.length === 0 && <p className="text-sm text-[var(--nexus-muted)]">Belum ada provider yang tersedia untuk dihubungkan.</p>}
        {availableProviders.map((item) => <label key={item.code} className={`block cursor-pointer rounded-lg border p-4 ${providerCode === item.code ? 'border-[var(--nexus-yellow-deep)] bg-[var(--nexus-cream-soft)]' : 'border-[var(--nexus-border)]'}`}>
          <input type="radio" name="provider" className="mr-2" checked={providerCode === item.code} onChange={() => { setProviderCode(item.code); setConfig({}); setSecrets({}); setScope(''); }} />
          <b>{item.displayName}</b><p className="mt-1 text-xs text-[var(--nexus-muted)]">{item.description}</p>
        </label>)}
      </div>}
      {step === 2 && provider && <div className="space-y-3">{provider.allowedScopes.map((value) => <label key={value} className={`block cursor-pointer rounded-lg border p-4 ${scope === value ? 'border-[var(--nexus-yellow-deep)] bg-[var(--nexus-cream-soft)]' : 'border-[var(--nexus-border)]'}`}><input type="radio" name="scope" className="mr-2" checked={scope === value} onChange={() => setScope(value)} />{scopeLabel[value]}</label>)}</div>}
      {step === 3 && provider && <div className="space-y-4">
        <Field label="Nama Koneksi *"><input required className={inputClass} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></Field>
        {provider.publicConfigFields.map((field) => <Field key={field.name} label={field.label + (field.required ? ' *' : '')}>{field.type === 'select'
          ? <select className={inputClass} value={config[field.name] || ''} onChange={(event) => setConfig({ ...config, [field.name]: event.target.value })}><option value="">Pilih...</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          : <input type={field.type === 'url' ? 'url' : 'text'} className={inputClass} value={config[field.name] || ''} onChange={(event) => setConfig({ ...config, [field.name]: event.target.value })} placeholder={field.helpText} />}</Field>)}
      </div>}
      {step === 4 && provider && <div className="space-y-4">
        {provider.secretFields.length === 0 && <p className="text-sm text-[var(--nexus-muted)]">Provider ini tidak memerlukan kredensial.</p>}
        {provider.secretFields.map((field) => <Field key={field.name} label={field.label + (field.required ? ' *' : '')}>{field.multiline ? <textarea className={`${inputClass} min-h-[120px] font-mono text-xs`} value={secrets[field.name] || ''} onChange={(event) => setSecrets({ ...secrets, [field.name]: event.target.value })} placeholder={field.helpText} /> : <input type="password" autoComplete="new-password" className={inputClass} value={secrets[field.name] || ''} onChange={(event) => setSecrets({ ...secrets, [field.name]: event.target.value })} placeholder={field.helpText} />}</Field>)}
      </div>}
      {step === 5 && provider && <div className="space-y-2 text-sm">
        <p><b>Provider:</b> {provider.displayName}</p>
        <p><b>Scope:</b> {scope ? scopeLabel[scope] : '—'}</p>
        <p><b>Nama Koneksi:</b> {displayName}</p>
        <p><b>Konfigurasi:</b> {Object.keys(config).length ? Object.entries(config).map(([key, value]) => `${key}=${value}`).join(', ') : '—'}</p>
        <p><b>Kredensial:</b> {Object.values(secrets).filter((value) => value.trim()).length} field akan disimpan terenkripsi.</p>
      </div>}
      {step === 6 && <div className="space-y-3">
        <p className="text-sm text-[var(--nexus-muted)]">Koneksi akan disimpan dengan status "Belum Terhubung", lalu diuji secara otomatis.</p>
        {saveError && <p className="text-sm text-red-700">{saveError}</p>}
        <Button onClick={() => void save()} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan & Uji Koneksi'}</Button>
      </div>}
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={() => setStep((value) => Math.max(1, value - 1))} disabled={step === 1}>Sebelumnya</Button>
        {step < 6 && <Button type="button" onClick={() => setStep((value) => Math.min(6, value + 1))} disabled={(step === 1 && !provider) || (step === 2 && !scope) || (step === 3 && !displayName.trim())}>Selanjutnya</Button>}
      </div>
    </CardContent></Card>
  </div>;
}

function CredentialEditor({ connectionId, providerCode, existing, onClose, onSaved }: { connectionId: number; providerCode: string; existing: IntegrationCredentialMeta[]; onClose: () => void; onSaved: () => void }) {
  const [providers, setProviders] = useState<ProviderDefinition[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  useEffect(() => { integrationsApi.providers().then(setProviders).catch(() => setProviders([])); }, []);
  const provider = providers?.find((item) => item.code === providerCode) || null;
  const configuredNames = new Set(existing.map((item) => item.secret_name));

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setSaving(true);
    try {
      const entries = Object.entries(values).filter(([, value]) => value.trim());
      if (!entries.length) { onClose(); return; }
      await integrationsApi.updateCredentials(connectionId, Object.fromEntries(entries));
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kredensial gagal disimpan.');
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!removeTarget) return;
    try { await integrationsApi.deleteCredential(connectionId, removeTarget); setRemoveTarget(null); onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Kredensial gagal dihapus.'); setRemoveTarget(null); }
  };

  return <Modal open title="Kelola Kredensial" onClose={onClose}>
    {!provider ? <Loading /> : <form className="space-y-4" onSubmit={save}>
      {provider.secretFields.length === 0 && <p className="text-sm text-[var(--nexus-muted)]">Provider ini tidak memerlukan kredensial.</p>}
      {provider.secretFields.map((field) => <div key={field.name} className="space-y-1">
        <Field label={field.label}>{field.multiline
          ? <textarea className={`${inputClass} min-h-[100px] font-mono text-xs`} value={values[field.name] || ''} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} placeholder={configuredNames.has(field.name) ? 'Kosongkan untuk mempertahankan nilai tersimpan' : field.helpText} />
          : <input type="password" autoComplete="new-password" className={inputClass} value={values[field.name] || ''} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} placeholder={configuredNames.has(field.name) ? 'Kosongkan untuk mempertahankan nilai tersimpan' : field.helpText} />}
        </Field>
        {configuredNames.has(field.name) && <div className="flex items-center justify-between text-xs"><span className="text-emerald-700">Sudah dikonfigurasi</span><button type="button" className="text-red-600 hover:underline" onClick={() => setRemoveTarget(field.name)}>Hapus kredensial</button></div>}
      </div>)}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Batal</Button><Button disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Kredensial'}</Button></div>
    </form>}
    {removeTarget && <ConfirmDialog open title="Hapus Kredensial?" description={`Kredensial "${removeTarget}" akan dihapus permanen dari vault terenkripsi.`} confirmLabel="Hapus" variant="danger" onCancel={() => setRemoveTarget(null)} onConfirm={() => void remove()} />}
  </Modal>;
}

export function IntegrationConnectionDetailPage() {
  const { id } = useParams(); const auth = useAuth(); const canManage = isManage(auth); const canSync = isSync(auth);
  const [data, setData] = useState<IntegrationConnectionDetail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmAction, setConfirmAction] = useState<null | 'disable' | 'disconnect'>(null);
  const [credentialEditor, setCredentialEditor] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const load = useCallback(() => { if (!id) return; setError(''); integrationsApi.connection(Number(id)).then(setData).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Detail koneksi tidak dapat dimuat.')); }, [id]);
  useEffect(() => { load(); }, [load]);
  if (error) return <ErrorState message={error} retry={load} />;
  if (!data) return <Loading />;

  const test = async () => { setTesting(true); setNotice(''); try { const result = await integrationsApi.testConnection(data.id); setNotice(result.message); } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Uji koneksi gagal.'); } finally { setTesting(false); load(); } };
  const runSync = async () => { setSyncing(true); setNotice(''); try { const result = await integrationsApi.syncConnection(data.id); setNotice(result.message); } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Sinkronisasi gagal.'); } finally { setSyncing(false); load(); } };
  const enable = async () => { await integrationsApi.enable(data.id).catch(() => undefined); load(); };
  const doDisable = async () => { await integrationsApi.disable(data.id).catch(() => undefined); setConfirmAction(null); load(); };
  const doDisconnect = async () => { await integrationsApi.disconnect(data.id).catch(() => undefined); setConfirmAction(null); load(); };

  return <div className="space-y-6">
    <PageHeader title={data.display_name} description={`${data.integration_code} · ${data.provider_display_name}`} actions={<Link to="/app/integrations/connections"><Button variant="outline"><ArrowLeft className="h-4 w-4" />Kembali</Button></Link>} />
    <section className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Status Koneksi</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(data.status_code)}>{statusLabel[data.status_code]}</Badge>
          <Badge variant="outline">{scopeLabel[data.scope]}</Badge>
          <Badge variant="outline">{categoryLabel[data.category]}</Badge>
          {!data.connector_available && <Badge variant="warning">Connector Tidak Tersedia</Badge>}
        </div>
        <p className="text-xs text-[var(--nexus-muted)]">Sinkron terakhir: {data.last_sync_at ? formatDate(data.last_sync_at) : 'Belum pernah'}</p>
        {notice && <p className="text-sm text-[var(--nexus-charcoal)]">{notice}</p>}
        <div className="flex flex-wrap gap-2 pt-2">
          {canSync && data.capabilities.test && data.status_code !== 'disabled' && <Button size="sm" onClick={() => void test()} disabled={testing}>{testing ? 'Menguji...' : 'Uji Koneksi'}</Button>}
          {canSync && data.capabilities.sync && data.status_code === 'connected' && <Button size="sm" variant="outline" onClick={() => void runSync()} disabled={syncing}>{syncing ? 'Menyinkronkan...' : 'Sinkronkan'}</Button>}
          {canManage && data.status_code !== 'disabled' && <Button size="sm" variant="outline" onClick={() => setConfirmAction('disable')}>Nonaktifkan</Button>}
          {canManage && data.status_code === 'disabled' && <Button size="sm" variant="outline" onClick={() => void enable()}>Aktifkan Kembali</Button>}
          {canManage && <Button size="sm" variant="ghost" onClick={() => setConfirmAction('disconnect')}>Putuskan & Hapus Kredensial</Button>}
        </div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Kredensial</CardTitle></CardHeader><CardContent className="space-y-2">
        {data.credentials.length === 0 && <p className="text-sm text-[var(--nexus-muted)]">Belum ada kredensial dikonfigurasi.</p>}
        {data.credentials.map((cred) => <div key={cred.secret_name} className="flex items-center justify-between text-sm"><span>{cred.secret_name}</span><Badge variant="success">Sudah dikonfigurasi</Badge></div>)}
        {canManage && <Button size="sm" className="mt-2 w-full" variant="outline" onClick={() => setCredentialEditor(true)}><KeyRound className="h-4 w-4" />Kelola Kredensial</Button>}
      </CardContent></Card>
    </section>
    <Card><CardHeader><CardTitle className="text-base">Konfigurasi Publik</CardTitle></CardHeader><CardContent>
      {Object.keys(data.config_json).length ? <dl className="grid gap-2 text-sm sm:grid-cols-2">{Object.entries(data.config_json).map(([key, value]) => <div key={key}><dt className="text-xs text-[var(--nexus-muted)]">{key}</dt><dd className="font-medium text-[var(--nexus-charcoal)]">{String(value)}</dd></div>)}</dl> : <p className="text-sm text-[var(--nexus-muted)]">Tidak ada konfigurasi publik.</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Riwayat Terbaru</CardTitle></CardHeader><SyncHistoryTable rows={data.history} /></Card>
    {credentialEditor && <CredentialEditor connectionId={data.id} providerCode={data.provider_code} existing={data.credentials} onClose={() => setCredentialEditor(false)} onSaved={() => { setCredentialEditor(false); load(); }} />}
    {confirmAction === 'disable' && <ConfirmDialog open title="Nonaktifkan Integrasi?" description="Uji koneksi dan sinkronisasi tidak dapat dijalankan sampai diaktifkan kembali. Kredensial tetap tersimpan." confirmLabel="Nonaktifkan" variant="warning" onCancel={() => setConfirmAction(null)} onConfirm={() => void doDisable()} />}
    {confirmAction === 'disconnect' && <ConfirmDialog open title="Putuskan Integrasi?" description="Seluruh kredensial terenkripsi untuk koneksi ini akan dihapus permanen. Riwayat sinkronisasi tetap tersimpan." confirmLabel="Putuskan" variant="danger" onCancel={() => setConfirmAction(null)} onConfirm={() => void doDisconnect()} />}
  </div>;
}

export function IntegrationProvidersPage() {
  const auth = useAuth(); const canManage = isManage(auth);
  const [providers, setProviders] = useState<ProviderDefinition[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { setError(''); integrationsApi.providers().then(setProviders).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Katalog provider tidak dapat dimuat.')); }, []);
  useEffect(() => { load(); }, [load]);
  if (error) return <ErrorState message={error} retry={load} />;
  if (!providers) return <Loading />;
  const available = providers.filter((item) => item.availability === 'available');
  const planned = providers.filter((item) => item.availability === 'planned');
  return <div className="space-y-6">
    <PageHeader title="Katalog Provider" description="Daftar layanan eksternal yang dikenali UNI-NEXUS, termasuk yang masih direncanakan." />
    <ProviderGroup title="Tersedia" providers={available} canManage={canManage} />
    <ProviderGroup title="Direncanakan" providers={planned} canManage={canManage} />
  </div>;
}
function ProviderGroup({ title, providers, canManage }: { title: string; providers: ProviderDefinition[]; canManage: boolean }) {
  return <section><h2 className="mb-3 font-bold text-[var(--nexus-charcoal)]">{title} ({providers.length})</h2>
    {providers.length === 0 ? <Empty title={`Belum ada provider ${title.toLowerCase()}`} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{providers.map((item) => <Card key={item.code}><CardContent className="p-5">
      <div className="flex items-start justify-between gap-2"><h3 className="font-bold text-[var(--nexus-charcoal)]">{item.displayName}</h3><Badge variant={item.availability === 'available' ? 'success' : 'outline'}>{item.availability === 'available' ? 'Tersedia' : 'Direncanakan'}</Badge></div>
      <p className="mt-2 text-xs text-[var(--nexus-muted)]">{item.description}</p>
      <div className="mt-3 flex flex-wrap gap-1"><Badge variant="outline">{categoryLabel[item.category]}</Badge>{item.capabilities.test && <Badge variant="outline">Test</Badge>}{item.capabilities.sync && <Badge variant="outline">Sync</Badge>}</div>
      {item.availability === 'planned' && <p className="mt-3 text-xs text-amber-700">{item.unavailableReason || 'Adapter API belum tersedia / belum dikonfigurasi.'}</p>}
      <div className="mt-4">{item.availability === 'available' && canManage ? <Link to={`/app/integrations/connections/new?provider=${item.code}`}><Button size="sm">Hubungkan</Button></Link> : <Button size="sm" variant="outline" disabled>{item.availability === 'available' ? 'Perlu Izin Kelola' : 'Belum Tersedia'}</Button>}</div>
    </CardContent></Card>)}</div>}
  </section>;
}

export function IntegrationHistoryPage() {
  const [rows, setRows] = useState<IntegrationSyncLog[] | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [syncType, setSyncType] = useState('');
  const load = useCallback(() => { setError(''); integrationsApi.logs({ status: status || undefined, sync_type: syncType || undefined }).then(setRows).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Riwayat tidak dapat dimuat.')); }, [status, syncType]);
  useEffect(() => { load(); }, [load]);
  return <div className="space-y-6">
    <PageHeader title="Riwayat Integrasi" description="Riwayat uji koneksi dan sinkronisasi yang telah disanitasi." />
    <Card><CardContent className="flex flex-wrap gap-3 p-4">
      <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Semua Status</option><option value="success">Berhasil</option><option value="failed">Gagal</option><option value="running">Berjalan</option><option value="partial">Sebagian</option></select>
      <select className={inputClass} value={syncType} onChange={(event) => setSyncType(event.target.value)}><option value="">Semua Tipe</option><option value="connection_test">Uji Koneksi</option><option value="sync">Sinkronisasi</option></select>
    </CardContent></Card>
    {error ? <ErrorState message={error} retry={load} /> : !rows ? <Loading /> : rows.length === 0 ? <Empty title="Belum Ada Riwayat" /> : <Card><SyncHistoryTable rows={rows} /></Card>}
  </div>;
}

export function IntegrationLogDetailPage() {
  const { id } = useParams();
  const [row, setRow] = useState<IntegrationSyncLog | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { if (!id) return; setError(''); integrationsApi.log(Number(id)).then(setRow).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Detail riwayat tidak dapat dimuat.')); }, [id]);
  useEffect(() => { load(); }, [load]);
  if (error) return <ErrorState message={error} retry={load} />;
  if (!row) return <Loading />;
  return <div className="space-y-6">
    <PageHeader title={`Riwayat #${row.id}`} description={`${row.integration_name} · ${row.provider_name}`} actions={<Link to="/app/integrations/history"><Button variant="outline"><ArrowLeft className="h-4 w-4" />Kembali</Button></Link>} />
    <Card><CardContent className="space-y-3 p-6 text-sm">
      <div className="flex flex-wrap gap-2"><Badge variant={statusVariant(row.status_code)}>{statusLabel[row.status_code] || row.status_code}</Badge><Badge variant="outline">{row.sync_type}</Badge><Badge variant="outline">{row.direction}</Badge></div>
      <p><b>Mulai:</b> {formatDate(row.started_at)}</p>
      <p><b>Selesai:</b> {row.finished_at ? formatDate(row.finished_at) : '—'}</p>
      <p><b>Record Diproses:</b> {row.records_processed} (berhasil {row.records_success}, gagal {row.records_failed})</p>
      {row.error_message && <p className="text-red-700"><b>Error:</b> {row.error_message}</p>}
      {row.metadata && Object.keys(row.metadata).length > 0 && <div><b>Metadata:</b><pre className="mt-1 max-w-full overflow-x-auto rounded bg-gray-50 p-3 text-xs">{JSON.stringify(row.metadata, null, 2)}</pre></div>}
    </CardContent></Card>
  </div>;
}
