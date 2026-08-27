import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../lib/utils';
import { Calculator as CalcIcon, RefreshCw, Save } from 'lucide-react';

export function CraftCalculator() {
  const [materialCostPerGram, setMaterialCostPerGram] = useState<number>(0);
  const [materialUsage, setMaterialUsage] = useState<number>(0);
  const [printingTimeHours, setPrintingTimeHours] = useState<number>(0);
  const [electricityCostPerHour, setElectricityCostPerHour] = useState<number>(0);
  const [laborCostPerHour, setLaborCostPerHour] = useState<number>(0);
  const [packagingCost, setPackagingCost] = useState<number>(0);
  const [marketplaceFeePercent, setMarketplaceFeePercent] = useState<number>(0);
  const [desiredMarginPercent, setDesiredMarginPercent] = useState<number>(0);

  // Calculations
  const totalMaterialCost = materialCostPerGram * materialUsage;
  const totalElectricityCost = electricityCostPerHour * printingTimeHours;
  const totalLaborCost = laborCostPerHour * printingTimeHours;
  
  const baseProductionCost = totalMaterialCost + totalElectricityCost + totalLaborCost + packagingCost;
  
  // Base price before marketplace fee based on desired margin
  // Margin = (Price - Cost) / Price  => Price = Cost / (1 - Margin)
  const priceBeforeFee = desiredMarginPercent >= 100 ? 0 : baseProductionCost / (1 - (desiredMarginPercent / 100));
  
  // Final price to cover marketplace fee
  // Final Price - (Final Price * Fee) = Price Before Fee  => Final Price = Price Before Fee / (1 - Fee)
  const recommendedPrice = marketplaceFeePercent >= 100 ? 0 : priceBeforeFee / (1 - (marketplaceFeePercent / 100));
  
  const marketplaceFeeAmount = recommendedPrice * (marketplaceFeePercent / 100);
  const netRevenue = recommendedPrice - marketplaceFeeAmount;
  const projectedProfit = netRevenue - baseProductionCost;
  const actualMargin = recommendedPrice ? (projectedProfit / recommendedPrice) * 100 : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-full pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Kalkulator Biaya Produk</h1>
          <p className="text-sm text-[var(--nexus-muted)] mt-1">Hitung HPP, biaya marketplace, dan rekomendasikan harga eceran.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Reset
          </Button>
          <Button className="gap-2">
            <Save className="w-4 h-4" /> Simpan Profil
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Produksi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Biaya Material (Rp/g)</label>
                  <input 
                    type="number" 
                    value={materialCostPerGram}
                    onChange={(e) => setMaterialCostPerGram(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--nexus-yellow)]"
                  />
                  <p className="text-xs text-gray-500">Isi biaya aktual atau gunakan tarif yang telah ditetapkan organisasi.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Penggunaan Material (g)</label>
                  <input 
                    type="number" 
                    value={materialUsage}
                    onChange={(e) => setMaterialUsage(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--nexus-yellow)]"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Waktu Cetak (Jam)</label>
                  <input 
                    type="number" 
                    value={printingTimeHours}
                    onChange={(e) => setPrintingTimeHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--nexus-yellow)]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Listrik (Rp/jam)</label>
                  <input 
                    type="number" 
                    value={electricityCostPerHour}
                    onChange={(e) => setElectricityCostPerHour(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--nexus-yellow)]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Alokasi Tenaga Kerja (Rp/jam)</label>
                  <input 
                    type="number" 
                    value={laborCostPerHour}
                    onChange={(e) => setLaborCostPerHour(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--nexus-yellow)]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Pengemasan (Rp)</label>
                  <input 
                    type="number" 
                    value={packagingCost}
                    onChange={(e) => setPackagingCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--nexus-yellow)]"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Biaya Marketplace (%)</label>
                  <input 
                    type="number" 
                    value={marketplaceFeePercent}
                    onChange={(e) => setMarketplaceFeePercent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--nexus-yellow)]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Margin yang Diinginkan (%)</label>
                  <input 
                    type="number" 
                    value={desiredMarginPercent}
                    onChange={(e) => setDesiredMarginPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--nexus-yellow)]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-[var(--nexus-charcoal)] text-white border-none shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--nexus-yellow)]/10 rounded-full blur-[40px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
            
            <CardHeader className="border-gray-700">
              <CardTitle className="text-white flex items-center gap-2">
                <CalcIcon className="w-5 h-5 text-[var(--nexus-yellow)]" />
                Hasil Perhitungan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-3">
                <h4 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Harga Pokok Produksi (HPP)</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Biaya Material</span>
                  <span className="font-medium">{formatCurrency(totalMaterialCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Listrik</span>
                  <span className="font-medium">{formatCurrency(totalElectricityCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Tenaga Kerja</span>
                  <span className="font-medium">{formatCurrency(totalLaborCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Pengemasan</span>
                  <span className="font-medium">{formatCurrency(packagingCost)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                  <span className="font-semibold text-white">Total Biaya Dasar</span>
                  <span className="font-bold text-lg text-white">{formatCurrency(baseProductionCost)}</span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-700">
                <h4 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Proyeksi Penjualan</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Biaya Marketplace ({marketplaceFeePercent}%)</span>
                  <span className="font-medium text-red-400">-{formatCurrency(marketplaceFeeAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Proyeksi Keuntungan</span>
                  <span className="font-medium text-emerald-400">+{formatCurrency(projectedProfit)}</span>
                </div>

                <div className="flex justify-between items-center pt-3 pb-1 border-t border-gray-700 mt-2">
                  <span className="font-semibold text-[var(--nexus-yellow)]">Rekomendasi Harga</span>
                  <span className="font-bold text-3xl text-[var(--nexus-yellow)]">{formatCurrency(recommendedPrice)}</span>
                </div>
                <div className="text-right text-xs text-gray-400">
                  Margin Efektif: {actualMargin.toFixed(1)}%
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
