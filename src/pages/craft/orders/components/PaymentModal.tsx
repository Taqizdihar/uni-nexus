import React, { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/Button';
import { craftOrdersApi } from '../../../../services/api/craft-orders.api';

export function PaymentModal({ orderId, isOpen, onClose, onSuccess }: { orderId: number, isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 16));
  const [methodId, setMethodId] = useState('');
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      craftOrdersApi.getPaymentMethods().then(setMethods);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await craftOrdersApi.recordPayment(orderId, {
        amount: Number(amount),
        payment_date: paymentDate,
        payment_method_id: Number(methodId)
      });
      onSuccess();
    } catch (error: any) {
      alert(error.message || 'Gagal mencatat pembayaran');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Catat Pembayaran</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Jumlah Pembayaran</label>
            <input type="number" required min="1" className="w-full border p-2 rounded" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tanggal</label>
            <input type="datetime-local" required className="w-full border p-2 rounded" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Metode</label>
            <select required className="w-full border p-2 rounded" value={methodId} onChange={e => setMethodId(e.target.value)}>
              <option value="">Pilih Metode</option>
              {methods.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={loading}>Simpan</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
