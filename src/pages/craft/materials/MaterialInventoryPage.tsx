import React, { useCallback, useEffect, useState } from 'react';
import { FolderTree, PackagePlus, Plus, RefreshCw, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { craftMaterialsApi } from '../../../services/api/craft-materials.api';
import type { CraftMaterial, MaterialCategory, MaterialCategoryType } from '../../../types/craft-materials';
import { MaterialCard } from './components/MaterialCard';
import { MaterialCategoryManager } from './components/CategoryManager';
import { StockReceiptDialog } from './components/StockReceiptDialog';

const tabs: Array<[MaterialCategoryType, string]> = [
  ['filament', 'Filament'], ['resin', 'Resin'], ['hardware', 'Hardware'],
  ['packaging', 'Kemasan'], ['consumable', 'Consumable'], ['other', 'Lainnya'],
];

export function MaterialInventoryPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('craft.materials.write');
  const [materials, setMaterials] = useState<CraftMaterial[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [categoryType, setCategoryType] = useState<MaterialCategoryType>('filament');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false); const [receiptTarget, setReceiptTarget] = useState<CraftMaterial | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [nextMaterials, nextCategories] = await Promise.all([
        craftMaterialsApi.getMaterials({ categoryType, search: search || undefined }), craftMaterialsApi.getCategories(),
      ]);
      setMaterials(nextMaterials); setCategories(nextCategories);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Inventaris material tidak dapat dimuat.'); }
    finally { setLoading(false); }
  }, [categoryType, search]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), search ? 250 : 0); return () => window.clearTimeout(timer); }, [load, search]);

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 border-b border-[var(--nexus-border)] pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="material-code">MATERIAL</p><h1 className="mt-1 text-2xl font-bold text-[var(--nexus-charcoal)]">Inventaris Material</h1><p className="mt-1 text-sm text-[var(--nexus-muted)]">Kelola filament dan material produksi Uni-Inside Craft.</p></div>
      {canWrite && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setCategoryOpen(true)}><FolderTree className="h-4 w-4" />Kelola Kategori</Button><Button variant="outline" onClick={() => setPickerOpen(true)}><PackagePlus className="h-4 w-4" />Terima Stok</Button><Link to="/app/craft/materials/new"><Button><Plus className="h-4 w-4" />Tambah Material</Button></Link></div>}
    </header>
    <section className="rounded-xl border border-[var(--nexus-border)] bg-white p-3 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-1">{tabs.map(([type, label]) => <button type="button" onClick={() => setCategoryType(type)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${categoryType === type ? 'bg-[var(--nexus-charcoal)] text-white' : 'text-[var(--nexus-muted)] hover:bg-[var(--nexus-cream-soft)]'}`} key={type}>{label}</button>)}</div><label className="relative block min-w-0 lg:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nexus-muted)]" /><input className="h-10 w-full rounded-lg border border-[var(--nexus-border)] pl-10 pr-3 text-sm outline-none focus:border-[var(--nexus-yellow-deep)]" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari SKU, material, warna..." /></label></div></section>
    {error ? <section className="rounded-xl border border-red-200 bg-red-50 p-8 text-center"><p className="font-semibold text-red-800">{error}</p><Button className="mt-4" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Coba Lagi</Button></section>
      : loading ? <section className="rounded-xl border border-[var(--nexus-border)] bg-white p-12 text-center text-sm text-[var(--nexus-muted)]">Memuat inventaris material...</section>
        : materials.length === 0 ? <section className="rounded-xl border border-dashed border-[var(--nexus-border)] bg-white p-12 text-center"><h2 className="font-bold text-[var(--nexus-charcoal)]">{categoryType === 'filament' ? 'Belum Ada Filament' : 'Belum Ada Material'}</h2><p className="mx-auto mt-2 max-w-md text-sm text-[var(--nexus-muted)]">Tidak ada data contoh. Tambahkan material pertama untuk mulai melacak stok fisik.</p>{canWrite && <Link to="/app/craft/materials/new"><Button className="mt-5"><Plus className="h-4 w-4" />Tambah Material</Button></Link>}</section>
          : <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{materials.map((material) => <MaterialCard key={material.id} material={material} />)}</section>}
    <MaterialCategoryManager open={categoryOpen} categories={categories} onClose={() => setCategoryOpen(false)} onChanged={load}/>
    <StockReceiptDialog open={!!receiptTarget} material={receiptTarget} onClose={() => setReceiptTarget(null)} onSaved={load}/>
    {pickerOpen && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"><section className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"><h2 className="font-bold text-[var(--nexus-charcoal)]">Pilih material untuk penerimaan</h2><select className="mt-4 h-10 w-full rounded-lg border border-[var(--nexus-border)] px-3 text-sm" defaultValue="" onChange={(event) => { const selected = materials.find((item) => item.id === Number(event.target.value)) || null; if (selected) { setPickerOpen(false); setReceiptTarget(selected); } }}><option value="" disabled>Pilih material...</option>{materials.map((material) => <option key={material.id} value={material.id}>{material.sku} — {material.name}</option>)}</select><Button variant="outline" className="mt-4" onClick={() => setPickerOpen(false)}>Batal</Button></section></div>}
  </div>;
}
