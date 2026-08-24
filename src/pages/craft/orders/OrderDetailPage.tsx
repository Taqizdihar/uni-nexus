import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { craftOrdersApi } from '../../../services/api/craft-orders.api';
import { formatCurrency } from '../../../lib/utils';
import { ArrowLeft, Printer, FileText, Download, CheckCircle, Package, Truck, XCircle, CreditCard, Clock } from 'lucide-react';
import { PaymentModal } from './components/PaymentModal';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (!id) return;
        const result = await craftOrdersApi.getOrder(parseInt(id));
        setData(result);
      } catch (error) {
        console.error(error);
        alert('Gagal memuat pesanan');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500">Memuat detail pesanan...</div>;
  if (!data || !data.order) return <div className="p-8 text-center text-red-500">Pesanan tidak ditemukan</div>;

  const { order, items, history, invoices, payments, attachments } = data;

  const handleUpdateStatus = async (status: string) => {
    try {
      await craftOrdersApi.updateStatus(order.id, status);
      window.location.reload();
    } catch (error) {
      alert('Gagal memperbarui status');
    }
  };

  const handleEnqueue = async () => {
    try {
      const itemIds = items.map((i: any) => i.id);
      await craftOrdersApi.enqueueItems(order.id, itemIds);
      alert('Berhasil ditambahkan ke antrean produksi');
    } catch (error) {
      alert('Gagal menambahkan ke antrean');
    }
  };

  const handleCreateInvoice = async () => {
    try {
      await craftOrdersApi.createInvoice(order.id, {});
      window.location.reload();
    } catch (error: any) {
      alert(error.message || 'Gagal membuat invoice');
    }
  };

  const tabs = [
    { id: 'summary', label: 'Ringkasan' },
    { id: 'items', label: 'Item Pesanan' },
    { id: 'production', label: 'Produksi' },
    { id: 'finance', label: 'Pembayaran & Dokumen' },
    { id: 'history', label: 'Riwayat' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/app/craft/orders')} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">{order.order_code}</h1>
              <Badge variant={order.status_code === 'completed' ? 'success' : order.status_code === 'cancelled' ? 'error' : 'info'}>
                {order.status_code.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-[var(--nexus-muted)] mt-1">{order.customer_name} • {order.sales_channel_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {order.status_code === 'new' && (
            <Button variant="outline" onClick={() => handleUpdateStatus('confirmed')}>Konfirmasi Pesanan</Button>
          )}
          {['confirmed', 'waiting', 'ready'].includes(order.status_code) && (
            <Button className="gap-2" onClick={handleEnqueue}>
              <Printer className="w-4 h-4" /> Masukkan Antrean
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'border-[var(--nexus-yellow)] text-[var(--nexus-charcoal)]' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold border-b pb-2">Informasi Umum</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-gray-500">Tanggal Pesanan</div>
                  <div>{new Date(order.order_date).toLocaleString()}</div>
                  <div className="text-gray-500">Tenggat Waktu</div>
                  <div>{order.deadline_at ? new Date(order.deadline_at).toLocaleString() : '-'}</div>
                  <div className="text-gray-500">Tipe Pesanan</div>
                  <div className="capitalize">{order.order_type}</div>
                  <div className="text-gray-500">Prioritas</div>
                  <div>
                    <Badge variant={order.priority_code === 'critical' ? 'error' : 'default'}>{order.priority_code}</Badge>
                    {order.is_priority_manual === 1 && <span className="ml-2 text-xs text-gray-500">(Manual)</span>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold border-b pb-2">Pengiriman</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-gray-500">Penerima</div>
                  <div>{order.shipping_recipient_name || order.customer_name}</div>
                  <div className="text-gray-500">Telepon</div>
                  <div>{order.shipping_phone || order.phone || '-'}</div>
                  <div className="text-gray-500">Alamat</div>
                  <div className="whitespace-pre-wrap">{order.shipping_address || '-'}</div>
                  <div className="text-gray-500">Kurir</div>
                  <div>{order.courier_name || '-'}</div>
                  <div className="text-gray-500">Resi</div>
                  <div>{order.tracking_number || '-'}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'items' && (
          <Card>
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-600">Item</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">Qty</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">Harga Satuan</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="font-medium">{item.item_name}</div>
                      {item.item_description && <div className="text-xs text-gray-500">{item.item_description}</div>}
                    </td>
                    <td className="px-6 py-4">{item.quantity}</td>
                    <td className="px-6 py-4">{formatCurrency(item.unit_price)}</td>
                    <td className="px-6 py-4 text-right font-medium">{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ongkir</span>
                  <span>{formatCurrency(order.shipping_amount)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Invoice</h3>
                  {invoices.length === 0 && (
                    <Button size="sm" onClick={handleCreateInvoice}>Buat Invoice</Button>
                  )}
                </div>
                {invoices.length > 0 ? (
                  <div className="border rounded-md divide-y">
                    {invoices.map((inv: any) => (
                      <div key={inv.id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{inv.invoice_number}</div>
                          <div className="text-sm text-gray-500">
                            Terbit: {new Date(inv.issue_date).toLocaleDateString()} • 
                            Status: <Badge variant="info">{inv.status_code}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right mr-4">
                            <div className="font-medium">{formatCurrency(inv.total_amount)}</div>
                            <div className="text-sm text-gray-500">Sisa: {formatCurrency(inv.balance_due)}</div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => window.open(craftOrdersApi.downloadInvoicePdfUrl(order.id), '_blank')}
                          >
                            <Download className="w-4 h-4" /> PDF
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 p-4 border rounded-md text-center bg-gray-50">Belum ada invoice untuk pesanan ini.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Pembayaran</h3>
                  {invoices.length > 0 && invoices[0].status_code !== 'paid' && (
                     <Button size="sm" variant="outline" className="gap-2" onClick={() => setIsPaymentModalOpen(true)}>
                       <CreditCard className="w-4 h-4" /> Catat Pembayaran
                     </Button>
                  )}
                </div>
                {payments.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="py-2 px-4">Tanggal</th>
                        <th className="py-2 px-4">Kode</th>
                        <th className="py-2 px-4">Metode</th>
                        <th className="py-2 px-4 text-right">Jumlah</th>
                        <th className="py-2 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="py-3 px-4">{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">{p.payment_code}</td>
                          <td className="py-3 px-4">{p.method_name}</td>
                          <td className="py-3 px-4 text-right font-medium">{formatCurrency(p.amount)}</td>
                          <td className="py-3 px-4 text-center">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => window.open(craftOrdersApi.downloadReceiptPdfUrl(order.id, p.id), '_blank')}
                            >
                              Kwitansi
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-sm text-gray-500 p-4 border rounded-md text-center bg-gray-50">Belum ada pembayaran.</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {activeTab === 'history' && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {history.map((h: any, idx: number) => (
                  <div key={h.id} className="flex gap-4 items-start relative">
                    {idx !== history.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-gray-200"></div>
                    )}
                    <div className="w-6 h-6 rounded-full bg-[var(--nexus-yellow)] flex items-center justify-center shrink-0 z-10 border-2 border-white">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        Status berubah menjadi <span className="uppercase text-[var(--nexus-charcoal)]">{h.to_status_code}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(h.changed_at).toLocaleString()} • oleh {h.changed_by_name || 'System'}
                      </div>
                      {h.reason && <div className="text-sm mt-1 text-gray-600">Catatan: {h.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <PaymentModal 
        orderId={order?.id} 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
