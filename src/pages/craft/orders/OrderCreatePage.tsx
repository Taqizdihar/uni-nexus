import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { craftOrdersApi } from '../../../services/api/craft-orders.api';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

export function OrderCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    customer_party_id: '',
    sales_channel_id: '',
    external_order_id: '',
    order_type: 'standard',
    deadline_at: '',
    priority_code: 'normal',
    shipping_amount: 0,
    items: [{
      item_name: '',
      quantity: 1,
      unit_price: 0,
      discount_amount: 0,
      is_custom: true
    }]
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, chanRes, prodRes] = await Promise.all([
          craftOrdersApi.getCustomers(),
          craftOrdersApi.getSalesChannels(),
          craftOrdersApi.getProducts()
        ]);
        setCustomers(custRes);
        setChannels(chanRes);
        setProducts(prodRes);
      } catch (error) {
        console.error('Error fetching reference data:', error);
      }
    };
    fetchData();
  }, []);

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { item_name: '', quantity: 1, unit_price: 0, discount_amount: 0, is_custom: true }
      ]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    (newItems[index] as any)[field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        customer_party_id: parseInt(formData.customer_party_id),
        sales_channel_id: parseInt(formData.sales_channel_id),
        deadline_at: formData.deadline_at || null,
        external_order_id: formData.external_order_id || null,
        items: formData.items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          discount_amount: Number(item.discount_amount),
        }))
      };
      const res = await craftOrdersApi.createOrder(payload);
      navigate(`/app/craft/orders/${res.data.id}`);
    } catch (error: any) {
      alert(error.message || 'Gagal membuat pesanan');
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price) - item.discount_amount, 0);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/app/craft/orders')} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Pesanan Baru</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">1. Informasi Umum</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Pelanggan *</label>
                <select 
                  required
                  className="w-full border rounded-md p-2"
                  value={formData.customer_party_id}
                  onChange={e => setFormData({...formData, customer_party_id: e.target.value})}
                >
                  <option value="">-- Pilih Pelanggan --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.display_name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Kanal Penjualan *</label>
                <select 
                  required
                  className="w-full border rounded-md p-2"
                  value={formData.sales_channel_id}
                  onChange={e => setFormData({...formData, sales_channel_id: e.target.value})}
                >
                  <option value="">-- Pilih Kanal --</option>
                  {channels.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tipe Pesanan</label>
                <select 
                  className="w-full border rounded-md p-2"
                  value={formData.order_type}
                  onChange={e => setFormData({...formData, order_type: e.target.value})}
                >
                  <option value="standard">Standar</option>
                  <option value="custom">Custom</option>
                  <option value="partner">Mitra</option>
                  <option value="internal">Internal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ID Pesanan Eksternal (Opsional)</label>
                <input 
                  type="text" 
                  className="w-full border rounded-md p-2"
                  placeholder="Mis. No Pesanan Shopee"
                  value={formData.external_order_id}
                  onChange={e => setFormData({...formData, external_order_id: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tenggat Waktu</label>
                <input 
                  type="datetime-local" 
                  className="w-full border rounded-md p-2"
                  value={formData.deadline_at}
                  onChange={e => setFormData({...formData, deadline_at: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Prioritas (Manual Override)</label>
                <select 
                  className="w-full border rounded-md p-2"
                  value={formData.priority_code}
                  onChange={e => setFormData({...formData, priority_code: e.target.value})}
                >
                  <option value="normal">Normal (Otomatis)</option>
                  <option value="low">Rendah</option>
                  <option value="high">Tinggi</option>
                  <option value="critical">Kritis</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-lg font-semibold">2. Item Pesanan</h2>
              <Button type="button" size="sm" variant="outline" onClick={handleAddItem} className="gap-1">
                <Plus className="w-4 h-4"/> Tambah Item
              </Button>
            </div>
            
            <div className="space-y-4">
              {formData.items.map((item, idx) => (
                <div key={idx} className="p-4 border rounded-md bg-gray-50 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-sm">Item #{idx + 1}</h3>
                    {formData.items.length > 1 && (
                      <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-1">Nama Item *</label>
                      <input 
                        required
                        type="text" 
                        className="w-full border rounded-md p-2 text-sm"
                        value={item.item_name}
                        onChange={e => handleItemChange(idx, 'item_name', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium mb-1">Jumlah *</label>
                      <input 
                        required
                        type="number" 
                        min="1"
                        className="w-full border rounded-md p-2 text-sm"
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">Harga Satuan *</label>
                      <input 
                        required
                        type="number" 
                        min="0"
                        className="w-full border rounded-md p-2 text-sm"
                        value={item.unit_price}
                        onChange={e => handleItemChange(idx, 'unit_price', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold border-b pb-2 mb-4">3. Ringkasan & Total</h2>
            
            <div className="space-y-2 max-w-sm ml-auto text-right">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ongkos Kirim:</span>
                <input 
                  type="number" 
                  min="0"
                  className="border rounded px-2 py-1 text-right w-32"
                  value={formData.shipping_amount}
                  onChange={e => setFormData({...formData, shipping_amount: Number(e.target.value)})}
                />
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t mt-2">
                <span>Total:</span>
                <span className="text-[var(--nexus-charcoal)]">{formatCurrency(calculateSubtotal() + formData.shipping_amount)}</span>
              </div>
            </div>
            
            <div className="flex justify-end mt-8">
              <Button type="submit" disabled={loading} className="gap-2 px-8">
                <Save className="w-4 h-4" />
                {loading ? 'Menyimpan...' : 'Simpan Pesanan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
