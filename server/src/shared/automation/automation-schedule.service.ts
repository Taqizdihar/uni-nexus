import { CronExpressionParser } from 'cron-parser';
import { AutomationValidationError } from './automation-errors';
import type { AutomationScheduleConfig } from '../../modules/craft-automations/craft-automations.types';

export const DEFAULT_AUTOMATION_TIMEZONE = 'Asia/Jakarta';

export class AutomationScheduleService {
  scheduleOf(config: AutomationScheduleConfig | null | undefined, timezone?: string | null) {
    const schedule = config?.schedule;
    if (!schedule || schedule.type !== 'cron') throw new AutomationValidationError('Pemicu jadwal/sensor membutuhkan konfigurasi cron.');
    const expression = String(schedule.expression || '').trim();
    if (expression.split(/\s+/).length !== 5) throw new AutomationValidationError('Cron harus memiliki tepat lima field: menit jam hari bulan hari-minggu.');
    return { expression, timezone: schedule.timezone || timezone || DEFAULT_AUTOMATION_TIMEZONE };
  }

  nextRun(config: AutomationScheduleConfig | null | undefined, timezone?: string | null, after = new Date()) {
    const schedule = this.scheduleOf(config, timezone);
    try {
      // cron-parser operates with seconds; UI/API accepts only safe five-field cron.
      const parsed = CronExpressionParser.parse(`0 ${schedule.expression}`, { currentDate: after, tz: schedule.timezone });
      const next: any = parsed.next();
      return next.toDate ? next.toDate() : new Date(next.toString());
    } catch {
      throw new AutomationValidationError('Ekspresi cron atau zona waktu tidak valid.');
    }
  }
}

export const automationScheduleService = new AutomationScheduleService();
