import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Eye } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useAuth } from '../../../context/AuthContext';
import { craftProductionApi } from '../../../services/api/craft-production.api';
import type { QcQueueItem } from '../../../types/craft-production';
import { QcInspectionModal } from './components/QcInspectionModal';
import { formatProductionDate, ProductionEmptyState, ProductionError, ProductionLoading, ProductionPageHeader, ProductionPriorityBadge, ProductionTableHeader, ProductionTableRow, QcResultBadge } from './components/ProductionUI';

export function QualityControlPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('craft.production.write');
  const [items, setItems] = useState<QcQueueItem[]>([]);
  const [selected, setSelected] = useState<QcQueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { const result = await craftProductionApi.getQcQueue(); setItems(result.items || []); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Gagal memuat antrean QC.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const requested = Number(searchParams.get('job')); if (!requested || selected) return; const match = items.find(item => item.job.id === requested); if (match) setSelected(match); }, [items, searchParams, selected]);
  const close = () => { setSelected(null); if (searchParams.has('job')) { const next = new URLSearchParams(searchParams); next.delete('job'); setSearchParams(next, { replace: true }); } };
  const success = () => { close(); setNotice('Pemeriksaan QC berhasil disimpan. Sinkronisasi hasil produksi sedang diterapkan.'); void load(); };

  return <div className="space-y-6 pb-8"><ProductionPageHeader title="Kontrol Kualitas" description="Periksa hasil fisik sebelum output dihitung sebagai produksi selesai." />{error && <ProductionError message={error} retry={() => void load()} />}{notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}<Card>{loading ? <ProductionLoading label="Memuat pekerjaan menunggu QC..." /> : items.length === 0 ? <ProductionEmptyState icon={ClipboardCheck} title="Belum Ada Pekerjaan Menunggu QC" description="Pekerjaan yang selesai mencetak akan masuk ke halaman ini untuk diperiksa." /> : <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><ProductionTableHeader><tr><th>Job</th><th>Order</th><th>Item</th><th>Printer</th><th>Selesai Mencetak</th><th>Prioritas</th><th>Inspector</th><th>Status QC</th><th className="text-right">Aksi</th></tr></ProductionTableHeader><tbody>{items.map(item => <ProductionTableRow key={item.job.id} onClick={() => navigate(`/app/craft/production/jobs/${item.job.id}`)}><td><span className="font-mono text-xs font-bold">{item.job.job_code}</span></td><td>{item.job.order_code || 'Internal'}</td><td><p className="max-w-64 truncate font-medium">{item.job.item_name}</p><span className="text-xs text-[var(--nexus-muted)]">× {Number(item.job.quantity)}</span></td><td>{item.job.printer_name || '-'}</td><td>{formatProductionDate(item.job.finished_at)}</td><td><ProductionPriorityBadge value={item.job.priority_code} /></td><td>{item.inspection?.inspector_name || 'Belum ditentukan'}</td><td><QcResultBadge value={item.qc_state || item.inspection?.result_code || 'pending'} /></td><td><div className="flex justify-end gap-2" onClick={event => event.stopPropagation()}>{canWrite ? <Button size="sm" onClick={() => setSelected(item)}><ClipboardCheck className="h-3.5 w-3.5" /> Periksa</Button> : <Button size="sm" variant="outline" onClick={() => navigate(`/app/craft/production/jobs/${item.job.id}`)}><Eye className="h-3.5 w-3.5" /> Lihat</Button>}</div></td></ProductionTableRow>)}</tbody></table></div>}</Card><div className="rounded-lg border border-[var(--nexus-border)] bg-white p-4 text-xs leading-5 text-[var(--nexus-muted)]">QC tidak memerlukan template untuk berjalan. Jika tidak ada template database yang sesuai, checklist umum disimpan sebagai butir inspeksi ad-hoc.</div>{selected && <QcInspectionModal open job={selected.job} onClose={close} onSuccess={success} />}</div>;
}
