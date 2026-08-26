import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { craftMaterialsApi } from '../../../services/api/craft-materials.api';
import type { MaterialPayload } from '../../../types/craft-materials';
import { MaterialForm } from './components/MaterialForm';

export function MaterialCreatePage() {
  const navigate = useNavigate(); const [submitting, setSubmitting] = useState(false);
  const submit = async (payload: MaterialPayload) => { setSubmitting(true); try { const created = await craftMaterialsApi.createMaterial(payload); navigate(`/app/craft/materials/${created.id}`); } finally { setSubmitting(false); } };
  return <div className="mx-auto max-w-4xl space-y-6"><header className="flex items-end justify-between border-b border-[var(--nexus-border)] pb-5"><div><p className="material-code">MATERIAL</p><h1 className="mt-1 text-2xl font-bold text-[var(--nexus-charcoal)]">Tambah Material</h1><p className="mt-1 text-sm text-[var(--nexus-muted)]">Daftarkan material produksi baru ke inventaris CRAFT.</p></div><Link to="/app/craft/materials/filament"><Button variant="outline"><ArrowLeft className="h-4 w-4" />Kembali</Button></Link></header><MaterialForm onSubmit={submit} submitting={submitting}/></div>;
}
