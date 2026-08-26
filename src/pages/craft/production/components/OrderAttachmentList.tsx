import React, { useState } from 'react';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../../components/ui/Button';
import { useAuth } from '../../../../context/AuthContext';
import { craftOrdersApi } from '../../../../services/api/craft-orders.api';
import type { AttachmentSummary } from '../../../../types/craft-orders';

export function OrderAttachmentList({ orderId, attachments }: { orderId: number; attachments: AttachmentSummary[] }) {
  const { hasPermission } = useAuth();
  const canReadOrder = hasPermission('craft.orders.read');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (attachment: AttachmentSummary) => {
    setError(null);
    setDownloadingId(attachment.id);
    try {
      await craftOrdersApi.downloadAttachment(orderId, attachment);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lampiran tidak dapat diunduh.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (attachments.length === 0) {
    return <p className="rounded-lg border border-dashed border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/45 p-4 text-xs text-[var(--nexus-muted)]">Pesanan ini belum memiliki lampiran.</p>;
  }

  return <div className="space-y-2">
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{error}</div>}
    {attachments.map(attachment => <div key={attachment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--nexus-border)] bg-white p-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-[var(--nexus-cream-soft)] p-2 text-[var(--nexus-yellow-deep)]"><FileText className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--nexus-charcoal)]">{attachment.file_name}</p>
          <p className="mt-1 text-[11px] text-[var(--nexus-muted)]">{attachment.attachment_type || 'Lampiran'} · {attachment.file_type || 'Tipe tidak diketahui'} · {formatFileSize(attachment.file_size_bytes)}</p>
          <p className="mt-0.5 text-[11px] text-[var(--nexus-muted)]">{formatUploadedAt(attachment.uploaded_at)}{attachment.uploaded_by_name ? ` · ${attachment.uploaded_by_name}` : ''}</p>
        </div>
      </div>
      {canReadOrder ? <div className="flex shrink-0 gap-2">
        <Button type="button" size="sm" variant="outline" disabled={downloadingId === attachment.id} onClick={() => void download(attachment)}>
          {downloadingId === attachment.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Unduh
        </Button>
        <Link className="inline-flex h-8 items-center justify-center gap-2 rounded-lg px-3 text-xs text-gray-700 transition hover:bg-gray-100" to={`/app/craft/orders/${orderId}`}><ExternalLink className="h-3.5 w-3.5" /> Order</Link>
      </div> : <span className="text-[11px] text-[var(--nexus-muted)]">Izin baca order diperlukan untuk mengunduh.</span>}
    </div>)}
  </div>;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(Number(bytes))) return 'Ukuran tidak tersedia';
  const value = Number(bytes);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Tanggal tidak tersedia' : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}
