export const SALES_WORKFLOW_STAGES = [
  'REQUEST',
  'DESIGN',
  'QUOTATION',
  'READY_FOR_PRODUCTION',
  'PRODUCTION',
  'COMPLETION',
  'COMPLETED',
  'CANCELLED',
] as const;

export type SalesWorkflowStage = (typeof SALES_WORKFLOW_STAGES)[number];

export const SALES_WORKFLOW_TABS = [
  { key: 'ALL', label: 'Semua', stage: null },
  { key: 'REQUEST', label: 'Permintaan Baru', stage: 'REQUEST' },
  { key: 'DESIGN', label: 'Desain', stage: 'DESIGN' },
  { key: 'QUOTATION', label: 'Penawaran', stage: 'QUOTATION' },
  { key: 'READY_FOR_PRODUCTION', label: 'Siap Produksi', stage: 'READY_FOR_PRODUCTION' },
  { key: 'PRODUCTION', label: 'Produksi', stage: 'PRODUCTION' },
  { key: 'COMPLETION', label: 'Penyelesaian', stage: 'COMPLETION' },
  { key: 'COMPLETED', label: 'Selesai', stage: 'COMPLETED' },
  { key: 'CANCELLED', label: 'Dibatalkan', stage: 'CANCELLED' },
] as const;

export const SALES_WORKFLOW_STAGE_LABELS: Record<SalesWorkflowStage, string> = {
  REQUEST: 'Permintaan Baru',
  DESIGN: 'Desain',
  QUOTATION: 'Penawaran',
  READY_FOR_PRODUCTION: 'Siap Produksi',
  PRODUCTION: 'Produksi',
  COMPLETION: 'Penyelesaian',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export const PRODUCTION_WORKFLOW_TABS = [
  { key: 'ALL', label: 'Semua' },
  { key: 'NEEDS_PROCESSING', label: 'Perlu Diproses' },
  { key: 'PRINT_QUEUE', label: 'Antrean Cetak' },
  { key: 'PRINTING', label: 'Sedang Dicetak' },
  { key: 'ATTENTION', label: 'Perlu Perhatian' },
  { key: 'QC', label: 'QC' },
  { key: 'PACKAGING', label: 'Pengemasan' },
  { key: 'COMPLETED', label: 'Selesai' },
] as const;

export type ProductionWorkflowTab = Exclude<(typeof PRODUCTION_WORKFLOW_TABS)[number]['key'], 'ALL'>;
