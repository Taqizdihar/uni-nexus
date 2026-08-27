import { getStudioBillingBusinessUnit } from './studio-billing.shared';
import { studioBillingRepository } from './studio-billing.repository';
import type { OutstandingFilters } from './studio-billing.types';

/** Read-only Billing aggregates. Overdue and expiry are always derived, never written by a GET. */
export class StudioBillingSummaryService {
  async overview() { return studioBillingRepository.getOverview(await getStudioBillingBusinessUnit()); }
  async outstanding(filters: OutstandingFilters) { return studioBillingRepository.listOutstanding(filters, await getStudioBillingBusinessUnit()); }
}

export const studioBillingSummaryService = new StudioBillingSummaryService();
