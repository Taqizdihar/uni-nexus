import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { craftProductsApi } from '../../../services/api/craft-products.api';
import type { ProductCategory } from '../../../types/craft-products';
import { ProductForm, type ProductFormValues } from './components/ProductForm';

export function ProductCreatePage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null); const navigate = useNavigate();
  useEffect(() => { void craftProductsApi.getCategories().then(setCategories).catch(requestError => setError(requestError instanceof Error ? requestError.message : 'Kategori tidak dapat dimuat.')); }, []);
  const submit = async (data: ProductFormValues) => { setSaving(true); try { const { image, ...payload } = data; const created = await craftProductsApi.createProduct(payload); if (image) await craftProductsApi.uploadImage(created.id, image); navigate(`/app/craft/products/${created.id}`); } finally { setSaving(false); } };
  return <div className="space-y-6"><header><Link to="/app/craft/products"><Button variant="ghost" size="sm" className="mb-3 -ml-2"><ArrowLeft className="h-4 w-4" />Katalog Produk</Button></Link><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--nexus-muted)]">Produk & Desain</p><h1 className="mt-1 text-2xl font-bold text-[var(--nexus-charcoal)]">Tambah Produk</h1><p className="mt-1 text-sm text-[var(--nexus-muted)]">Simpan identitas produk sekarang; metadata manufaktur dapat dilengkapi kemudian.</p></header>{error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : <ProductForm categories={categories} saving={saving} onSubmit={submit} />}</div>;
}
