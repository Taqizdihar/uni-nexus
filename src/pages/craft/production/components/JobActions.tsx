import React, { useState } from 'react';
import { Ban, CheckCircle2, CirclePause, CirclePlay, ClipboardCheck, Eye, Flag, Gauge, Pencil, Play, RotateCcw, TimerReset } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { Button } from '../../../../components/ui/Button';
import { craftProductionApi } from '../../../../services/api/craft-production.api';
import type { ProductionJob } from '../../../../types/craft-production';
import { EditJobPlanningModal } from './EditJobPlanningModal';
import { FailureReportModal, ProgressUpdateModal, ReasonModal, ScheduleJobModal } from './JobActionDialogs';
import { FinishPrintModal } from './FinishPrintModal';
import { ReprintJobPlanningModal } from './ReprintJobPlanningModal';

type ConfirmAction = 'ready' | 'start' | 'pause' | 'resume' | null;

export function JobActions({ job, canWrite, onChanged, onError, showDetail = true, compact = false }: {
  job: ProductionJob;
  canWrite: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
  showDetail?: boolean;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [failureOpen, setFailureOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reprintOpen, setReprintOpen] = useState(false);
  const [working, setWorking] = useState(false);

  const runConfirmed = async () => {
    if (!confirmAction) return;
    setWorking(true);
    try {
      if (confirmAction === 'ready') await craftProductionApi.markReady(job.id);
      if (confirmAction === 'start') await craftProductionApi.startJob(job.id, job.operator_user_id);
      if (confirmAction === 'pause') await craftProductionApi.pauseJob(job.id);
      if (confirmAction === 'resume') await craftProductionApi.resumeJob(job.id);
      setConfirmAction(null);
      onChanged();
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : 'Tindakan produksi gagal diproses.');
    } finally {
      setWorking(false);
    }
  };

  const modalSuccess = (close: () => void) => { close(); onChanged(); };
  const size = compact ? 'sm' : 'md';

  return <>
    <div className="flex flex-wrap items-center gap-2" onClick={event => event.stopPropagation()}>
      {canWrite && job.status_code === 'queued' && <><Button size={size} onClick={() => setConfirmAction('ready')}><CheckCircle2 className="h-3.5 w-3.5" /> Jadikan Siap</Button><Button size={size} variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button><Button size={size} variant="outline" onClick={() => setScheduleOpen(true)}><TimerReset className="h-3.5 w-3.5" /> Jadwal</Button><Button size={size} variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setCancelOpen(true)}><Ban className="h-3.5 w-3.5" /> Batalkan</Button></>}
      {canWrite && job.status_code === 'ready' && <><Button size={size} onClick={() => setConfirmAction('start')}><Play className="h-3.5 w-3.5" /> Mulai Cetak</Button><Button size={size} variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button><Button size={size} variant="outline" onClick={() => setScheduleOpen(true)}><TimerReset className="h-3.5 w-3.5" /> Jadwal</Button><Button size={size} variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setCancelOpen(true)}><Ban className="h-3.5 w-3.5" /> Batalkan</Button></>}
      {canWrite && job.status_code === 'printing' && <><Button size={size} variant="outline" onClick={() => setProgressOpen(true)}><Gauge className="h-3.5 w-3.5" /> Progres</Button><Button size={size} variant="outline" onClick={() => setConfirmAction('pause')}><CirclePause className="h-3.5 w-3.5" /> Jeda</Button><Button size={size} onClick={() => setFinishOpen(true)}><Flag className="h-3.5 w-3.5" /> Selesai Mencetak</Button><Button size={size} variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setFailureOpen(true)}><Ban className="h-3.5 w-3.5" /> Laporkan Gagal</Button></>}
      {canWrite && job.status_code === 'paused' && <><Button size={size} onClick={() => setConfirmAction('resume')}><CirclePlay className="h-3.5 w-3.5" /> Lanjutkan</Button><Button size={size} variant="outline" onClick={() => setProgressOpen(true)}><Gauge className="h-3.5 w-3.5" /> Progres</Button><Button size={size} variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setFailureOpen(true)}><Ban className="h-3.5 w-3.5" /> Laporkan Gagal</Button></>}
      {job.status_code === 'qc' && <Button size={size} variant={canWrite ? 'primary' : 'outline'} onClick={() => navigate(`/app/craft/production/qc?job=${job.id}`)}><ClipboardCheck className="h-3.5 w-3.5" /> {canWrite ? 'Periksa QC' : 'Lihat QC'}</Button>}
      {job.status_code === 'failed' && <>{canWrite && <Button size={size} onClick={() => setReprintOpen(true)}><RotateCcw className="h-3.5 w-3.5" /> Buat Reprint</Button>}<Button size={size} variant="outline" onClick={() => navigate('/app/craft/production/failures')}><RotateCcw className="h-3.5 w-3.5" /> Lihat Kegagalan</Button></>}
      {showDetail && <Button size={size} variant="ghost" onClick={() => navigate(`/app/craft/production/jobs/${job.id}`)}><Eye className="h-3.5 w-3.5" /> Detail</Button>}
    </div>

    <ConfirmDialog open={Boolean(confirmAction)} title={confirmTitle(confirmAction)} description={confirmDescription(confirmAction, job)} confirmLabel={confirmLabel(confirmAction)} isLoading={working} onCancel={() => setConfirmAction(null)} onConfirm={() => void runConfirmed()} variant={confirmAction === 'start' ? 'warning' : 'default'} />
    <ScheduleJobModal open={scheduleOpen} job={job} onClose={() => setScheduleOpen(false)} onSuccess={() => modalSuccess(() => setScheduleOpen(false))} onError={onError} />
    <ProgressUpdateModal open={progressOpen} job={job} onClose={() => setProgressOpen(false)} onSuccess={() => modalSuccess(() => setProgressOpen(false))} onError={onError} />
    <FinishPrintModal open={finishOpen} job={job} onClose={() => setFinishOpen(false)} onSuccess={() => modalSuccess(() => setFinishOpen(false))} onError={onError} />
    <FailureReportModal open={failureOpen} job={job} onClose={() => setFailureOpen(false)} onSuccess={() => modalSuccess(() => setFailureOpen(false))} onError={onError} />
    <EditJobPlanningModal open={editOpen} job={job} onClose={() => setEditOpen(false)} onSuccess={() => modalSuccess(() => setEditOpen(false))} />
    <ReprintJobPlanningModal open={reprintOpen} job={job} onClose={() => setReprintOpen(false)} onCreated={createdId => { setReprintOpen(false); onChanged(); navigate(`/app/craft/production/jobs/${createdId}`); }} onOpenExisting={existingId => navigate(`/app/craft/production/jobs/${existingId}`)} />
    <ReasonModal open={cancelOpen} job={job} title="Batalkan Pekerjaan Cetak" description="Pembatalan hanya diperbolehkan sebelum proses fisik dimulai. Riwayat pekerjaan tetap disimpan." submitLabel="Batalkan Pekerjaan" onClose={() => setCancelOpen(false)} onSubmit={async reason => { await craftProductionApi.cancelJob(job.id, reason); setCancelOpen(false); onChanged(); }} />
  </>;
}

function confirmTitle(action: ConfirmAction): string {
  if (action === 'ready') return 'Jadikan pekerjaan siap?';
  if (action === 'start') return 'Mulai pelacakan cetak?';
  if (action === 'pause') return 'Jeda pekerjaan cetak?';
  if (action === 'resume') return 'Lanjutkan pekerjaan cetak?';
  return '';
}

function confirmLabel(action: ConfirmAction): string {
  if (action === 'ready') return 'Jadikan Siap';
  if (action === 'start') return 'Mulai Cetak';
  if (action === 'pause') return 'Jeda';
  if (action === 'resume') return 'Lanjutkan';
  return 'Konfirmasi';
}

function confirmDescription(action: ConfirmAction, job: ProductionJob): string {
  if (action === 'ready') return `${job.job_code} akan divalidasi dan dipindahkan ke status Siap.`;
  if (action === 'start') return `Sistem akan memulai pencatatan operasional ${job.job_code} pada ${job.printer_name || 'printer terpilih'}. Ini tidak mengirim kontrol ke mesin fisik.${job.material_summary ? '' : ' Material belum ditautkan ke inventaris; pemakaian tidak akan tercatat otomatis kecuali diisi saat cetak selesai.'}`;
  if (action === 'pause') return `Pencatatan ${job.job_code} akan dijeda. Printer tetap berstatus sibuk.`;
  if (action === 'resume') return `Pencatatan ${job.job_code} akan dilanjutkan pada printer yang sama.`;
  return '';
}
