import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { mockPrinters } from '../../data/mock';
import { Printer as PrinterIcon, Settings, AlertCircle, PlayCircle, Plus } from 'lucide-react';

export function CraftPrinters() {
  return (
    <div className="space-y-6 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Printer</h1>
          <p className="text-sm text-[var(--nexus-muted)] mt-1">Status real-time peralatan manufaktur 3D.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Printer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockPrinters.map((printer) => (
          <Card key={printer.id} className="flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                    <PrinterIcon className="w-6 h-6 text-[var(--nexus-charcoal)]" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{printer.name}</CardTitle>
                    <p className="text-xs text-gray-500 font-medium tracking-wide">{printer.id}</p>
                  </div>
                </div>
                <Badge variant={
                  printer.status === 'Available' || printer.status === 'Tersedia' ? 'success' :
                  printer.status === 'Busy' || printer.status === 'Sibuk' ? 'warning' :
                  printer.status === 'Maintenance' || printer.status === 'Perawatan' ? 'error' : 'default'
                }>
                  {printer.status === 'Available' ? 'Tersedia' : printer.status === 'Busy' ? 'Sibuk' : printer.status === 'Maintenance' ? 'Perawatan' : printer.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-0">
              {printer.status === 'Busy' || printer.status === 'Sibuk' ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-600 font-medium">Pekerjaan Saat Ini</span>
                      <span className="text-[var(--nexus-charcoal)] font-semibold">{printer.currentJob}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className="bg-[var(--nexus-yellow-deep)] h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${printer.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1.5 text-gray-500">
                      <span>{printer.progress}% Selesai</span>
                      <span>Est: {printer.estimatedCompletion}</span>
                    </div>
                  </div>
                </div>
              ) : printer.status === 'Available' || printer.status === 'Tersedia' ? (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                  <PlayCircle className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">Siap untuk tugas</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-red-400">
                  <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">Perlu perhatian</p>
                </div>
              )}
              
              <div className="mt-6 pt-4 border-t border-[var(--nexus-border)] flex justify-between gap-2">
                <Button variant="outline" size="sm" className="flex-1">Detail</Button>
                <Button variant="ghost" size="sm" className="px-3">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
