import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { UnifiedFinanceController } from './finance.controller';

const controller = new UnifiedFinanceController();
export const unifiedFinanceRoutes = Router();
unifiedFinanceRoutes.use(requireAuth, requirePermission('finance.read'));

unifiedFinanceRoutes.get('/overview', controller.getOverview);
unifiedFinanceRoutes.get('/meta', controller.meta);
unifiedFinanceRoutes.get('/transactions', controller.transactions);
unifiedFinanceRoutes.get('/transactions/:id', controller.transaction);
unifiedFinanceRoutes.get('/treasury', controller.treasury);
unifiedFinanceRoutes.get('/transfers', controller.transfers);
unifiedFinanceRoutes.get('/transfers/:id', controller.transfer);
unifiedFinanceRoutes.get('/cash-flow', controller.cashFlow);
unifiedFinanceRoutes.get('/profit-loss', controller.profitLoss);
unifiedFinanceRoutes.get('/receivables', controller.receivables);
unifiedFinanceRoutes.get('/payables', controller.payables);
unifiedFinanceRoutes.get('/budgets', controller.budgets);
unifiedFinanceRoutes.get('/accounting/journals', controller.journals);
unifiedFinanceRoutes.get('/accounting/journals/:id', controller.journal);
unifiedFinanceRoutes.get('/accounting/periods', controller.periods);
unifiedFinanceRoutes.get('/export', requirePermission('reports.export'), controller.export);

unifiedFinanceRoutes.post('/transfers', requirePermission('finance.transfer'), controller.createTransfer);
unifiedFinanceRoutes.post('/shared/transactions', requirePermission('finance.write'), controller.createSharedTransaction);
unifiedFinanceRoutes.post('/shared/transactions/:id/reverse', requirePermission('finance.write'), controller.reverseSharedTransaction);
unifiedFinanceRoutes.post('/shared/treasury', requirePermission('finance.manage'), controller.createSharedTreasury);
unifiedFinanceRoutes.patch('/shared/treasury/:id/status', requirePermission('finance.manage'), controller.sharedTreasuryStatus);
unifiedFinanceRoutes.post('/accounting/periods', requirePermission('finance.manage'), controller.createPeriod);
unifiedFinanceRoutes.post('/accounting/periods/:id/close', requirePermission('finance.manage'), controller.closePeriod);
unifiedFinanceRoutes.post('/accounting/periods/:id/reopen', requirePermission('finance.manage'), controller.reopenPeriod);
