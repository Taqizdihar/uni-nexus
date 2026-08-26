import React from 'react';
import { ArrowRight, CheckCircle2, Clock3, Layers3, Pencil, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../../components/ui/Button';
import { formatCurrency } from '../../../../lib/utils';
import type { CraftProductSummary } from '../../../../types/craft-products';
import { ProductImage } from './ProductImage';
import { ProductStatusBadge, productTypeLabels } from './ProductStatusBadge';

function duration(minutes: number | null) {
  if (minutes === null) return '–';
  const hours = Math.floor(minutes / 60); const rest = minutes % 60;
  return hours ? `${hours}j ${rest}m` : `${rest}m`;
}

export function ProductCard({ product }: { product: CraftProductSummary; key?: React.Key }) {
  const margin = product.costing.margin_percent;
  return <article className="overflow-hidden rounded-xl border border-[var(--nexus-border)] bg-white shadow-sm transition-shadow hover:shadow-md">
    <ProductImage productId={product.id} hasImage={Boolean(product.image_path)} />
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold tracking-[0.15em] text-[var(--nexus-muted)]">{product.sku}</p><h2 className="mt-1 truncate font-bold text-[var(--nexus-charcoal)]">{product.name}</h2><p className="mt-1 truncate text-xs text-[var(--nexus-muted)]">{product.category_name || 'Tanpa kategori'} · {productTypeLabels[product.product_type]}</p></div><ProductStatusBadge active={product.is_active} /></div>
      <div className="grid grid-cols-3 gap-2 border-y border-[var(--nexus-border)] py-3 text-xs"><Stat label="Harga" value={formatCurrency(product.base_selling_price)} emphasis /><Stat label="Est. Biaya" value={product.costing.effective_cost === null ? 'Belum ada' : formatCurrency(product.costing.effective_cost)} /><Stat label="Margin" value={margin === null ? '–' : `${margin.toFixed(1)}%`} /></div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--nexus-muted)]"><span className="inline-flex items-center gap-1"><Layers3 className="h-3.5 w-3.5" />{product.estimated_weight_g === null ? 'Material –' : `${product.estimated_weight_g} g`}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{duration(product.estimated_print_minutes)}</span></div>
      <div className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold ${product.readiness.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{product.readiness.ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}{product.readiness.ready ? 'Siap produksi' : 'Data belum lengkap'}</div>
      <div className="grid grid-cols-2 gap-2"><Link to={`/app/craft/products/${product.id}`}><Button variant="outline" size="sm" className="w-full">Detail <ArrowRight className="h-3.5 w-3.5" /></Button></Link><Link to={`/app/craft/products/${product.id}/edit`}><Button variant="ghost" size="sm" className="w-full"><Pencil className="h-3.5 w-3.5" /> Edit</Button></Link></div>
    </div>
  </article>;
}

function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) { return <div className="min-w-0"><p className="text-[10px] text-[var(--nexus-muted)]">{label}</p><p className={`mt-0.5 truncate font-semibold ${emphasis ? 'text-emerald-700' : 'text-[var(--nexus-charcoal)]'}`}>{value}</p></div>; }
