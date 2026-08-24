import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { craftOrdersApi } from '../../../services/api/craft-orders.api';
import { ArrowLeft, Save } from 'lucide-react';

const PRE_PRODUCTION_STATUSES = ['new', 'confirmed', 'waiting', 'ready'];

export function OrderEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = parseInt(id!);
  const [order, setOrder] = useState<Awaited<ReturnType<typeof craftOrdersApi.getOrder>>['order'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deadline, setDeadline] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [couriername, setCourierName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingRecipient, setShippingRecipient] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await craftOrdersApi.getOrder(orderId);
        const o = res.order;
        setOrder(o);
        setDeadline(o.deadline_at ? new Date(o.deadline_at).toISOString().slice(0, 16) : '');
        setCustomerNotes(o.customer_notes || '');
        setInternalNotes(o.internal_notes || '');
        setCourierName(o.courier_name || '');
        setShippingAddress(o.shipping_address || '');
        setShippingRecipient(o.shipping_recipient_name || '');
        setShippingPhone(o.shipping_phone || '');
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderId]);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Memuat...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!order) return null;

  const canEdit = PRE_PRODUCTION_STATUSES.includes(order.status_code);

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await craftOrdersApi.updateOrder(orderId, {
        deadline_at: deadline || null,
        customer_notes: customerNotes || null,
        internal_notes: internalNotes || null,
        courier_name: couriername || null,
        shipping_address: shippingAddress || null,
        shipping_recipient_name: shippingRecipient || null,
        shipping_phone: shippingPhone || null,
      });
      navigate('/app/craft/orders/' + orderId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/app/craft/orders/' + orderId)} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Edit Pesanan — {order.order_code}</h1>
          <p className="text-sm text-[var(--nexus-muted)] mt-1">Status: {order.status_code}</p>
        </div>
      </div>

      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          ⚠️ Pesanan ini tidak dapat diedit karena sudah memasuki tahap produksi atau selesai.
        </div>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Informasi Pengiriman</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tenggat Waktu</label>
              <input type="datetime-local" className="w-full border rounded-md p-2" value={deadline}
                onChange={e => setDeadline(e.target.value)} disabled={!canEdit} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kurir</label>
              <input type="text" className="w-full border rounded-md p-2" value={couriername}
                onChange={e => setCourierName(e.target.value)} disabled={!canEdit} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Penerima</label>
              <input type="text" className="w-full border rounded-md p-2" value={shippingRecipient}
                onChange={e => setShippingRecipient(e.target.value)} disabled={!canEdit} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telepon Penerima</label>
              <input type="text" className="w-full border rounded-md p-2" value={shippingPhone}
                onChange={e => setShippingPhone(e.target.value)} disabled={!canEdit} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Alamat Pengiriman</label>
              <textarea className="w-full border rounded-md p-2" rows={3} value={shippingAddress}
                onChange={e => setShippingAddress(e.target.value)} disabled={!canEdit} />
            </div>
          </div>

          <h2 className="text-lg font-semibold border-b pb-2 pt-4">Catatan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Catatan Pelanggan</label>
              <textarea className="w-full border rounded-md p-2" rows={3} value={customerNotes}
                onChange={e => setCustomerNotes(e.target.value)} disabled={!canEdit} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Catatan Internal</label>
              <textarea className="w-full border rounded-md p-2" rows={3} value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)} disabled={!canEdit} />
            </div>
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2 px-8">
            <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      )}
    </div>
  );
}
