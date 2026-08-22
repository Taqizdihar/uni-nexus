import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AlertCircle } from 'lucide-react';

interface PlannedModulePageProps {
  title: string;
  description: string;
  stage: string;
  icon: React.ElementType;
  primaryAction?: string;
}

export function PlannedModulePage({ title, description, stage, icon: Icon, primaryAction }: PlannedModulePageProps) {
  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">{title}</h1>
          <p className="text-sm text-[var(--nexus-muted)] mt-1">{description}</p>
        </div>
        <Badge variant={stage === 'Advanced' ? 'warning' : 'info'} className="text-sm px-3 py-1">
          {stage}
        </Badge>
      </div>

      <Card className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white/60 border-dashed border-2 min-h-[400px]">
        <div className="w-16 h-16 bg-[var(--nexus-cream-soft)] rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-gray-100">
          <Icon className="w-8 h-8 text-[var(--nexus-yellow-deep)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--nexus-charcoal)] mb-2">
          Ringkasan {title}
        </h3>
        <p className="text-gray-500 max-w-md mb-8">
          Modul ini adalah bagian dari peta jalan yang direncanakan dan akan menyediakan kemampuan {title.toLowerCase()} lengkap setelah arsitektur backend diintegrasikan.
        </p>
        
        <div className="flex gap-4">
          {primaryAction && (
            <Button variant="primary" className="shadow-sm">
              {primaryAction}
            </Button>
          )}
          <Button variant="outline" className="bg-white shadow-sm">
            Lihat Dokumentasi
          </Button>
        </div>

        <div className="mt-12 max-w-lg w-full p-4 bg-amber-50/50 rounded-lg border border-amber-100 flex items-start gap-3 text-left">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Mode Pratinjau:</strong> Fitur di halaman ini saat ini adalah demonstrasi UI. Data yang dimasukkan di sini tidak akan disimpan sampai integrasi backend selesai.
          </p>
        </div>
      </Card>
    </div>
  );
}
