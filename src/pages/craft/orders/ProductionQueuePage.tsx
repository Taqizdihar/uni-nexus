import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';

export function ProductionQueuePage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/app/craft/orders')} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Antrean Produksi</h1>
            <p className="text-sm text-[var(--nexus-muted)] mt-1">Kelola urutan pencetakan per item.</p>
          </div>
        </div>
      </div>

      <Card className="p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
          <Printer className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-medium mb-2">Antrean Produksi</h2>
        <p className="text-gray-500 max-w-md">
          Modul antrean produksi per printer sedang dalam pengembangan. Saat ini Anda dapat melihat prioritas pesanan melalui halaman <Button variant="link" className="p-0 inline" onClick={() => navigate('/app/craft/orders/priority')}>Prioritas Produksi</Button>.
        </p>
      </Card>
    </div>
  );
}
