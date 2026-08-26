import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { craftProductsApi } from '../../../services/api/craft-products.api';
import type { ProductCategory, ProductDetailResponse } from '../../../types/craft-products';
import { ProductForm, type ProductFormValues } from './components/ProductForm';

export function ProductEditPage() {
  const productId = Number(useParams().id); const navigate = useNavigate(); const [detail, setDetail] = useState<ProductDetailResponse | null>(null); const [categories, setCategories] = useState<ProductCategory[]>([]); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = async () => { setError(null); try { const [product, categoryRows] = await Promise.all([craftProductsApi.getProduct(productId), craftProductsApi.getCategories()]); setDetail(product); setCategories(categoryRows); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Produk tidak dapat dimuat.'); } };
  useEffect(() => { if (Number.isInteger(productId)) void load(); else setError('ID produk tidak valid.'); }, [productId]);
  const submit = async (data: ProductFormValues) => { setSaving(true); try { const { image, ...payload } = data; await craftProductsApi.updateProduct(productId, payload); if (image) await craftProductsApi.uploadImage(productId, image); navigate(`/app/craft/products/${productId}`); } finally { setSaving(false); } };
  return <div className="space-y-6"><header><Link to={`/app/craft/products/${productId}`}><Button variant="ghost" size="sm" className="mb-3 -ml-2"><ArrowLeft className="h-4 w-4" />Detail Produk</Button></Link><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--nexus-muted)]">Produk & Desain</p><h1 className="mt-1 text-2xl font-bold text-[var(--nexus-charcoal)]">Edit Produk</h1></header>{error ? <section className="rounded-xl border border-red-200 bg-red-50 p-8 text-center"><p className="text-red-800">{error}</p><Button className="mt-4" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Coba Lagi</Button></section> : !detail ? <p className="rounded-xl border border-[var(--nexus-border)] bg-white p-10 text-center text-sm text-[var(--nexus-muted)]">Memuat produk...</p> : <ProductForm categories={categories} initial={detail.product} saving={saving} submitLabel="Simpan Perubahan" onSubmit={submit} />}</div>;
}
