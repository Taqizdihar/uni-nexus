import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { StudioFinanceController } from './studio-finance.controller';
import { createUpload } from '../../shared/storage';

const controller = new StudioFinanceController();
const READ = requirePermission('studio.finance.read');
const WRITE = requirePermission('studio.finance.write');

export const studioFinanceRoutes = Router();
studioFinanceRoutes.use(requireAuth);

studioFinanceRoutes.get('/overview',READ,controller.overview);
studioFinanceRoutes.get('/references',READ,controller.references);
studioFinanceRoutes.get('/transactions',READ,controller.transactions);
studioFinanceRoutes.get('/treasury',READ,controller.treasury);
studioFinanceRoutes.get('/receivables',READ,controller.receivables);
studioFinanceRoutes.get('/expenses',READ,controller.expenses);
studioFinanceRoutes.get('/payables',READ,controller.payables);
studioFinanceRoutes.get('/profitability',READ,controller.profitability);
studioFinanceRoutes.get('/cash-flow',READ,controller.cashFlow);
studioFinanceRoutes.get('/budgets',READ,controller.budgets);
studioFinanceRoutes.get('/accounting',READ,controller.accounting);

studioFinanceRoutes.post('/treasury',WRITE,controller.createTreasury);
studioFinanceRoutes.patch('/treasury/:id/status',WRITE,controller.treasuryStatus);
studioFinanceRoutes.post('/transfers',WRITE,controller.transfer);
studioFinanceRoutes.post('/income',WRITE,controller.income);
studioFinanceRoutes.post('/invoices/:id/payments',WRITE,controller.payInvoice);
studioFinanceRoutes.post('/expenses',WRITE,controller.createExpense);
studioFinanceRoutes.post('/expenses/:id/receipt',WRITE,createUpload('expense_receipt').single('file'),controller.uploadExpenseReceipt);
studioFinanceRoutes.get('/expenses/:id/receipt',READ,controller.downloadExpenseReceipt);
studioFinanceRoutes.delete('/expenses/:id/receipt',WRITE,controller.removeExpenseReceipt);
studioFinanceRoutes.post('/expenses/:id/approve',WRITE,controller.approveExpense);
studioFinanceRoutes.post('/expenses/:id/pay',WRITE,controller.payExpense);
studioFinanceRoutes.post('/expenses/:id/reverse',WRITE,controller.reverseExpense);
studioFinanceRoutes.post('/external-assignments/:id/payouts',WRITE,controller.payout);
studioFinanceRoutes.post('/maintenance/:id/pay',WRITE,controller.maintenance);
studioFinanceRoutes.post('/budgets',WRITE,controller.createBudget);
studioFinanceRoutes.post('/budgets/:id/approve',WRITE,controller.approveBudget);
