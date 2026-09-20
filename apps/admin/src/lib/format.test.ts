import { describe, expect, it } from 'vitest';
import { priorityLabel, sourceLabel, statusLabel, workflowStageLabel } from './format.js';

describe('Indonesian presentation labels', () => {
  it('translates representative workflow values', () => {
    expect(workflowStageLabel('DESIGN')).toBe('Desain');
    expect(statusLabel('COMPLETED')).toBe('Selesai');
    expect(statusLabel('IN_PROGRESS')).toBe('Sedang Dikerjakan');
    expect(statusLabel('READY_FOR_PRODUCTION')).toBe('Siap Produksi');
    expect(statusLabel('PRINTING')).toBe('Sedang Dicetak');
    expect(priorityLabel('URGENT')).toBe('Mendesak');
  });

  it('keeps unknown values safe and readable', () => {
    expect(statusLabel('SOME_NEW_STATUS')).toBe('Some New Status');
    expect(sourceLabel('WHATSAPP')).toBe('WhatsApp');
    expect(statusLabel(undefined)).toBe('Belum ada status');
  });
});
