import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { craftOrdersApi } from '../../../services/api/craft-orders.api';
import { formatCurrency } from '../../../lib/utils';
import type { CreateCraftOrderRequest, CustomerOption, ProductOption, SalesChannelOption } from '../../../types/craft-orders';

type ItemMode = 'catalog' | 'custom';
interface DraftItem {
  mode: ItemMode;
  product_id: string;
  variant_id: string;
  item_name: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  estimated_material_g: number | '';
  estimated_print_minutes: number | '';
  material: string;
  color: string;
  size: string;
  specification: string;
}

const emptyItem = (): DraftItem => ({
  mode: 'custom', product_id: '', variant_id: '', item_name: '', item_description: '', quantity: 1,
  unit_price: 0, discount_amount: 0, estimated_material_g: '', estimated_print_minutes: '', material: '', color: '', size: '', specification: '',
});
const inputClass = 'w-full border border-gray-200 rounded-md p-2 text-sm focus:outline-none focus:border-[var(--nexus-yellow)]';

export function OrderCreatePage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [channels, setChannels] = useState<SalesChannelOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [newCustomer, setNewCustomer] = useState({ display_name: '', party_kind: 'individual' as CustomerOption['party_kind'], email: '', phone: '' });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [form, setForm] = useState({
    customer_party_id: '', sales_channel_id: '', external_order_id: '', order_type: 'standard' as CreateCraftOrderRequest['order_type'],
    deadline_at: '', priority_mode: 'automatic' as 'automatic' | 'manual', priority_code: 'normal', priority_reason: '',
    discount_amount: 0, shipping_amount: 0, marketplace_fee_amount: 0, tax_amount: 0,
    customer_notes: '', internal_notes: '', shipping_recipient_name: '', shipping_phone: '', shipping_address: '', courier_name: '',
  });

  useEffect(() => {
    void (async () => {
      try {
        const [customerRows, channelRows, productRows] = await Promise.all([
          craftOrdersApi.getCustomers(), craftOrdersApi.getSalesChannels(), craftOrdersApi.getProducts(),
        ]);
        setCustomers(customerRows); setChannels(channelRows); setProducts(productRows);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Gagal memuat data referensi pesanan.');
      }
    })();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!customerSearch.trim()) return;
      void craftOrdersApi.getCustomers(customerSearch).then(setCustomers).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [customerSearch]);

  const subtotal = useMemo(() => items.reduce((total, item) => total + (Number(item.quantity) * Number(item.unit_price)) - Number(item.discount_amount), 0), [items]);
  const total = subtotal - form.discount_amount + form.shipping_amount + form.tax_amount;
  const setItem = (index: number, changes: Partial<DraftItem>) => setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(row => row.id === Number(productId));
    if (!product) return;
    setItem(index, {
      mode: 'catalog', product_id: productId, variant_id: '', item_name: product.name,
      unit_price: product.base_selling_price, estimated_material_g: product.estimated_weight_g ?? '',
      estimated_print_minutes: product.estimated_print_minutes ?? '', item_description: product.sku,
    });
  };

  const selectVariant = (index: number, variantId: string) => {
    const product = products.find(row => row.id === Number(items[index].product_id));
    const variant = product?.variants.find(row => row.id === Number(variantId));
    if (!product || !variant) return;
    setItem(index, {
      variant_id: variantId, item_name: `${product.name} — ${variant.name}`, unit_price: variant.selling_price,
      estimated_material_g: variant.estimated_weight_g ?? product.estimated_weight_g ?? '',
      estimated_print_minutes: variant.estimated_print_minutes ?? product.estimated_print_minutes ?? '',
    });
  };

  const createCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingCustomer(true); setError(null);
    try {
      const customer = await craftOrdersApi.quickCreateCustomer({ ...newCustomer, email: newCustomer.email || null, phone: newCustomer.phone || null });
      setCustomers(current => [...current, customer].sort((a, b) => a.display_name.localeCompare(b.display_name)));
      setForm(current => ({ ...current, customer_party_id: String(customer.id) }));
      setShowCustomerModal(false); setNewCustomer({ display_name: '', party_kind: 'individual', email: '', phone: '' });
      setNotice('Pelanggan baru dibuat dan telah dipilih.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal membuat pelanggan.');
    } finally { setCreatingCustomer(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setNotice(null);
    if (!form.customer_party_id || !form.sales_channel_id) { setError('Pelanggan dan kanal penjualan wajib dipilih.'); return; }
    if (items.some(item => !item.item_name.trim() || item.quantity <= 0 || item.unit_price < 0)) { setError('Lengkapi nama, jumlah, dan harga untuk setiap item.'); return; }
    setSaving(true);
    try {
      const payload: CreateCraftOrderRequest = {
        customer_party_id: Number(form.customer_party_id), sales_channel_id: Number(form.sales_channel_id),
        external_order_id: form.external_order_id || null, order_type: form.order_type, deadline_at: form.deadline_at || null,
        is_priority_manual: form.priority_mode === 'manual', priority_code: form.priority_mode === 'manual' ? form.priority_code as CreateCraftOrderRequest['priority_code'] : 'normal',
        priority_reason: form.priority_mode === 'manual' ? form.priority_reason || null : null,
        discount_amount: Number(form.discount_amount), shipping_amount: Number(form.shipping_amount), marketplace_fee_amount: Number(form.marketplace_fee_amount), tax_amount: Number(form.tax_amount),
        customer_notes: form.customer_notes || null, internal_notes: form.internal_notes || null,
        shipping_recipient_name: form.shipping_recipient_name || null, shipping_phone: form.shipping_phone || null,
        shipping_address: form.shipping_address || null, courier_name: form.courier_name || null,
        items: items.map(item => ({
          product_id: item.mode === 'catalog' && item.product_id ? Number(item.product_id) : null,
          variant_id: item.mode === 'catalog' && item.variant_id ? Number(item.variant_id) : null,
          item_name: item.item_name.trim(), item_description: item.item_description || null, quantity: Number(item.quantity), unit_price: Number(item.unit_price), discount_amount: Number(item.discount_amount),
          estimated_material_g: item.estimated_material_g === '' ? null : Number(item.estimated_material_g), estimated_print_minutes: item.estimated_print_minutes === '' ? null : Number(item.estimated_print_minutes),
          custom_spec_json: item.mode === 'custom' ? { material: item.material, color: item.color, size: item.size, specification: item.specification } : null,
        })),
      };
      const result = await craftOrdersApi.createOrder(payload);
      navigate(`/app/craft/orders/${result.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal membuat pesanan.');
    } finally { setSaving(false); }
  };

  return <div className="space-y-6 max-w-5xl mx-auto pb-12">
    <div className="flex items-center gap-4"><Button variant="ghost" onClick={() => navigate('/app/craft/orders')}><ArrowLeft className="w-5 h-5" /></Button><div><h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Pesanan Baru</h1><p className="text-sm text-[var(--nexus-muted)]">Buat pesanan Craft dari katalog atau spesifikasi custom.</p></div></div>
    {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {notice && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
    <form onSubmit={submit} className="space-y-6">
      <Card><CardContent className="space-y-4"><h2 className="text-lg font-semibold border-b pb-2">1. Informasi Umum</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-sm font-medium">Pelanggan *<input className={`${inputClass} mt-1`} value={customerSearch} onChange={event => setCustomerSearch(event.target.value)} placeholder="Cari pelanggan..." /></label>
        <div className="flex items-end gap-2"><label className="text-sm font-medium flex-1">Pilih Pelanggan *<select className={`${inputClass} mt-1`} value={form.customer_party_id} onChange={event => setForm(current => ({ ...current, customer_party_id: event.target.value }))}><option value="">-- Pilih Pelanggan --</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.display_name}{customer.phone ? ` — ${customer.phone}` : ''}</option>)}</select></label><Button type="button" variant="outline" className="gap-1" onClick={() => setShowCustomerModal(true)}><UserPlus className="w-4 h-4" /> Baru</Button></div>
        <label className="text-sm font-medium">Kanal Penjualan *<select className={`${inputClass} mt-1`} value={form.sales_channel_id} onChange={event => setForm(current => ({ ...current, sales_channel_id: event.target.value }))}><option value="">-- Pilih Kanal --</option>{channels.map(channel => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</select></label>
        <label className="text-sm font-medium">ID Pesanan Marketplace<input className={`${inputClass} mt-1`} value={form.external_order_id} onChange={event => setForm(current => ({ ...current, external_order_id: event.target.value }))} /></label>
        <label className="text-sm font-medium">Tipe Pesanan<select className={`${inputClass} mt-1`} value={form.order_type} onChange={event => setForm(current => ({ ...current, order_type: event.target.value as CreateCraftOrderRequest['order_type'] }))}><option value="standard">Standar</option><option value="custom">Custom</option><option value="partner">Mitra</option><option value="internal">Internal</option></select></label>
        <label className="text-sm font-medium">Tenggat Waktu<input type="datetime-local" className={`${inputClass} mt-1`} value={form.deadline_at} onChange={event => setForm(current => ({ ...current, deadline_at: event.target.value }))} /></label>
      </div><div className="border-t pt-4"><p className="text-sm font-medium mb-2">Mode Prioritas</p><div className="flex gap-4 text-sm"><label><input type="radio" checked={form.priority_mode === 'automatic'} onChange={() => setForm(current => ({ ...current, priority_mode: 'automatic' }))} /> Otomatis</label><label><input type="radio" checked={form.priority_mode === 'manual'} onChange={() => setForm(current => ({ ...current, priority_mode: 'manual' }))} /> Manual</label></div>{form.priority_mode === 'manual' && <div className="grid md:grid-cols-2 gap-4 mt-3"><select className={inputClass} value={form.priority_code} onChange={event => setForm(current => ({ ...current, priority_code: event.target.value }))}><option value="low">Rendah</option><option value="normal">Normal</option><option value="high">Tinggi</option><option value="critical">Kritis</option></select><input className={inputClass} value={form.priority_reason} onChange={event => setForm(current => ({ ...current, priority_reason: event.target.value }))} placeholder="Alasan prioritas (opsional)" /></div>}</div></CardContent></Card>
      <Card><CardContent className="space-y-4"><div className="flex justify-between border-b pb-2"><h2 className="text-lg font-semibold">2. Item Pesanan</h2><Button type="button" size="sm" variant="outline" onClick={() => setItems(current => [...current, emptyItem()])}><Plus className="w-4 h-4" /> Tambah Item</Button></div>{products.length === 0 && <p className="rounded bg-gray-50 p-3 text-sm text-gray-600">Belum ada produk di katalog. Anda tetap dapat membuat item Custom.</p>}{items.map((item, index) => <div key={index} className="border rounded-lg p-4 space-y-3"><div className="flex justify-between"><span className="font-medium text-sm">Item #{index + 1}</span>{items.length > 1 && <Button type="button" size="sm" variant="ghost" className="text-red-600" onClick={() => setItems(current => current.filter((_item, itemIndex) => itemIndex !== index))}><Trash2 className="w-4 h-4" /></Button>}</div><div className="flex gap-4 text-sm"><label><input type="radio" checked={item.mode === 'catalog'} onChange={() => setItem(index, { ...emptyItem(), mode: 'catalog' })} /> Katalog</label><label><input type="radio" checked={item.mode === 'custom'} onChange={() => setItem(index, { ...emptyItem(), mode: 'custom' })} /> Custom</label></div>{item.mode === 'catalog' ? <div className="grid md:grid-cols-2 gap-3"><label className="text-sm">Produk<select className={`${inputClass} mt-1`} value={item.product_id} onChange={event => selectProduct(index, event.target.value)}><option value="">-- Pilih Produk --</option>{products.map(product => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}</select></label><label className="text-sm">Varian<select className={`${inputClass} mt-1`} value={item.variant_id} onChange={event => selectVariant(index, event.target.value)} disabled={!item.product_id}><option value="">-- Produk dasar --</option>{products.find(product => product.id === Number(item.product_id))?.variants.map(variant => <option key={variant.id} value={variant.id}>{variant.name}</option>)}</select></label></div> : <div className="grid md:grid-cols-2 gap-3"><label className="text-sm">Nama Item *<input required className={`${inputClass} mt-1`} value={item.item_name} onChange={event => setItem(index, { item_name: event.target.value })} /></label><label className="text-sm">Deskripsi<textarea className={`${inputClass} mt-1`} value={item.item_description} onChange={event => setItem(index, { item_description: event.target.value })} /></label><label className="text-sm">Material<input className={`${inputClass} mt-1`} value={item.material} onChange={event => setItem(index, { material: event.target.value })} /></label><label className="text-sm">Warna / Ukuran<div className="flex gap-2"><input className={inputClass} value={item.color} onChange={event => setItem(index, { color: event.target.value })} placeholder="Warna" /><input className={inputClass} value={item.size} onChange={event => setItem(index, { size: event.target.value })} placeholder="Ukuran" /></div></label><label className="text-sm md:col-span-2">Spesifikasi custom<textarea className={`${inputClass} mt-1`} value={item.specification} onChange={event => setItem(index, { specification: event.target.value })} /></label></div>}<div className="grid grid-cols-2 md:grid-cols-5 gap-3"><label className="text-sm">Jumlah *<input required min="0.0001" step="0.0001" type="number" className={`${inputClass} mt-1`} value={item.quantity} onChange={event => setItem(index, { quantity: Number(event.target.value) })} /></label><label className="text-sm">Harga Satuan *<input required min="0" type="number" className={`${inputClass} mt-1`} value={item.unit_price} onChange={event => setItem(index, { unit_price: Number(event.target.value) })} /></label><label className="text-sm">Diskon Item<input min="0" type="number" className={`${inputClass} mt-1`} value={item.discount_amount} onChange={event => setItem(index, { discount_amount: Number(event.target.value) })} /></label><label className="text-sm">Est. Material (g)<input min="0" type="number" className={`${inputClass} mt-1`} value={item.estimated_material_g} onChange={event => setItem(index, { estimated_material_g: event.target.value === '' ? '' : Number(event.target.value) })} /></label><label className="text-sm">Est. Cetak (mnt)<input min="0" type="number" className={`${inputClass} mt-1`} value={item.estimated_print_minutes} onChange={event => setItem(index, { estimated_print_minutes: event.target.value === '' ? '' : Number(event.target.value) })} /></label></div></div>)}</CardContent></Card>
      <Card><CardContent className="space-y-4"><h2 className="text-lg font-semibold border-b pb-2">3. Biaya, Catatan & Pengiriman</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><label className="text-sm">Diskon Pesanan<input min="0" type="number" className={`${inputClass} mt-1`} value={form.discount_amount} onChange={event => setForm(current => ({ ...current, discount_amount: Number(event.target.value) }))} /></label><label className="text-sm">Ongkos Kirim<input min="0" type="number" className={`${inputClass} mt-1`} value={form.shipping_amount} onChange={event => setForm(current => ({ ...current, shipping_amount: Number(event.target.value) }))} /></label><label className="text-sm">Biaya Marketplace<input min="0" type="number" className={`${inputClass} mt-1`} value={form.marketplace_fee_amount} onChange={event => setForm(current => ({ ...current, marketplace_fee_amount: Number(event.target.value) }))} /></label><label className="text-sm">Pajak<input min="0" type="number" className={`${inputClass} mt-1`} value={form.tax_amount} onChange={event => setForm(current => ({ ...current, tax_amount: Number(event.target.value) }))} /></label></div><div className="grid md:grid-cols-2 gap-3"><textarea className={inputClass} value={form.customer_notes} onChange={event => setForm(current => ({ ...current, customer_notes: event.target.value }))} placeholder="Catatan pelanggan" /><textarea className={inputClass} value={form.internal_notes} onChange={event => setForm(current => ({ ...current, internal_notes: event.target.value }))} placeholder="Catatan internal" /><input className={inputClass} value={form.shipping_recipient_name} onChange={event => setForm(current => ({ ...current, shipping_recipient_name: event.target.value }))} placeholder="Nama penerima" /><input className={inputClass} value={form.shipping_phone} onChange={event => setForm(current => ({ ...current, shipping_phone: event.target.value }))} placeholder="Telepon penerima" /><input className={inputClass} value={form.courier_name} onChange={event => setForm(current => ({ ...current, courier_name: event.target.value }))} placeholder="Kurir" /><textarea className={inputClass} value={form.shipping_address} onChange={event => setForm(current => ({ ...current, shipping_address: event.target.value }))} placeholder="Alamat pengiriman" /></div><div className="ml-auto max-w-sm space-y-1 text-right text-sm"><p>Subtotal: <strong>{formatCurrency(subtotal)}</strong></p><p>Total dibayar pelanggan: <strong className="text-lg">{formatCurrency(total)}</strong></p></div><div className="flex justify-end"><Button type="submit" disabled={saving} className="gap-2"><Save className="w-4 h-4" />{saving ? 'Menyimpan...' : 'Simpan Pesanan'}</Button></div></CardContent></Card>
    </form>
    {showCustomerModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={createCustomer} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"><div className="flex justify-between"><h2 className="text-lg font-semibold">Tambah Pelanggan Baru</h2><Button type="button" size="sm" variant="ghost" onClick={() => setShowCustomerModal(false)}>Tutup</Button></div><label className="block text-sm">Nama *<input required className={`${inputClass} mt-1`} value={newCustomer.display_name} onChange={event => setNewCustomer(current => ({ ...current, display_name: event.target.value }))} /></label><label className="block text-sm">Jenis<select className={`${inputClass} mt-1`} value={newCustomer.party_kind} onChange={event => setNewCustomer(current => ({ ...current, party_kind: event.target.value as CustomerOption['party_kind'] }))}><option value="individual">Individual</option><option value="company">Perusahaan</option><option value="institution">Institusi</option></select></label><label className="block text-sm">Email<input type="email" className={`${inputClass} mt-1`} value={newCustomer.email} onChange={event => setNewCustomer(current => ({ ...current, email: event.target.value }))} /></label><label className="block text-sm">Nomor Telepon<input className={`${inputClass} mt-1`} value={newCustomer.phone} onChange={event => setNewCustomer(current => ({ ...current, phone: event.target.value }))} /></label><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowCustomerModal(false)}>Batal</Button><Button type="submit" disabled={creatingCustomer}>{creatingCustomer ? 'Menyimpan...' : 'Simpan Pelanggan'}</Button></div></form></div>}
  </div>;
}
