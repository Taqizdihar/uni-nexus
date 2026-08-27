import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { StudioClientsRepository } from './studio-clients.repository';

/**
 * Read-only commercial view of a client relationship.
 *
 * Quotations, invoices, and receivables stay owned by Billing/Finance — this
 * service only reports what already exists. It never creates a Payment, marks
 * an Invoice paid, or writes to Treasury/Finance/Expense records.
 */
export class StudioClientCommercialService {
  private repository = new StudioClientsRepository();

  async getSummary(partyId: number, studio: BusinessUnitContext) {
    const [summary, projectSummary] = await Promise.all([
      this.repository.getCommercialSummary(partyId, studio),
      this.repository.getProjectSummary(partyId, studio),
    ]);
    return {
      ...summary,
      committed_contract_value: projectSummary.committed_contract_value,
      pipeline_value: projectSummary.pipeline_value,
    };
  }

  getQuotations(partyId: number, studio: BusinessUnitContext) {
    return this.repository.getQuotations(partyId, studio);
  }

  getInvoices(partyId: number, studio: BusinessUnitContext) {
    return this.repository.getInvoices(partyId, studio);
  }
}

export const studioClientCommercialService = new StudioClientCommercialService();
