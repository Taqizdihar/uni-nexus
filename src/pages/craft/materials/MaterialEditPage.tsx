import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { craftMaterialsApi } from '../../../services/api/craft-materials.api';
import type { CraftMaterial, MaterialPayload } from '../../../types/craft-materials';
import { MaterialForm } from './components/MaterialForm';

export function MaterialEditPage() {
  const { id } = useParams(); const navigate = useNavigate(); const materialId = Number(id); const [material, setMaterial] = useState<CraftMaterial | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false);
  const load = async () => { setLoading(true); setError(null); try { setMaterial((await craftMaterialsApi.getMaterial(materialId)).material); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Material tidak dapat dimuat.'); } finally { setLoading(false); } }; useEffect(() => { void load(); }, [materialId]);
  const submit = async (payload: MaterialPayload) => { setSubmitting(true); try { await craftMaterialsApi.updateMaterial(materialId, payload); navigate(`/app/craft/materials/${materialId}`); } finally { setSubmitting(false); } };
  if (loading) return <p className="p-8 text-sm text-[var(--nexus-muted)]">Memuat material…</p>; if (error || !material) return <section className="rounded-xl border border-red-200 bg-red-50 p-8 text-center"><p className="font-semibold text-red-800">{error || 'Material tidak ditemukan.'}</p><Button className="mt-4" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Coba Lagi</Button></section>;
  return <div className="mx-auto max-w-4xl space-y-6"><header className="flex items-end justify-between border-b border-[var(--nexus-border)] pb-5"><div><p className="material-code">{material.sku}</p><h1 className="mt-1 text-2xl font-bold text-[var(--nexus-charcoal)]">Edit Material</h1><p className="mt-1 text-sm text-[var(--nexus-muted)]">Perubahan hanya memengaruhi penggunaan material berikutnya.</p></div><Link to={`/app/craft/materials/${materialId}`}><Button variant="outline"><ArrowLeft className="h-4 w-4" />Kembali</Button></Link></header><MaterialForm material={material} onSubmit={submit} submitting={submitting}/></div>;
}
