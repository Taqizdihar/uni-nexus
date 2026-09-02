import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { CraftFinanceController } from './craft-finance.controller';
const c=new CraftFinanceController(); export const craftFinanceRoutes=Router(); craftFinanceRoutes.use(requireAuth);
craftFinanceRoutes.get('/overview',requirePermission('craft.finance.read'),c.overview); craftFinanceRoutes.get('/references',requirePermission('craft.finance.read'),c.references); craftFinanceRoutes.get('/treasury',requirePermission('craft.finance.read'),c.treasury); craftFinanceRoutes.get('/transactions',requirePermission('craft.finance.read'),c.transactions); craftFinanceRoutes.get('/receivables',requirePermission('craft.finance.read'),c.receivables); craftFinanceRoutes.get('/payables',requirePermission('craft.finance.read'),c.payables);
craftFinanceRoutes.post('/treasury',requirePermission('craft.finance.write'),c.createTreasury); craftFinanceRoutes.patch('/treasury/:id/status',requirePermission('craft.finance.write'),c.status); craftFinanceRoutes.post('/invoices/:id/pay',requirePermission('craft.finance.write'),c.payCustomer); craftFinanceRoutes.post('/supplier-invoices/:id/pay',requirePermission('craft.finance.write'),c.paySupplier); craftFinanceRoutes.post('/income',requirePermission('craft.finance.write'),c.income);

craftFinanceRoutes.get('/income',requirePermission('craft.finance.read'),c.listIncome);
craftFinanceRoutes.get('/expenses',requirePermission('craft.finance.read'),c.listExpenses);
craftFinanceRoutes.post('/expenses',requirePermission('craft.finance.write'),c.createExpense);
craftFinanceRoutes.post('/expenses/:id/approve',requirePermission('craft.finance.write'),c.approveExpense);
craftFinanceRoutes.post('/expenses/:id/pay',requirePermission('craft.finance.write'),c.payExpense);
craftFinanceRoutes.post('/expenses/:id/reverse',requirePermission('craft.finance.write'),c.reverseExpense);

craftFinanceRoutes.get('/profitability',requirePermission('craft.finance.read'),c.profitability);
craftFinanceRoutes.get('/cash-flow',requirePermission('craft.finance.read'),c.cashFlow);

craftFinanceRoutes.get('/budgets',requirePermission('craft.finance.read'),c.budgets);
craftFinanceRoutes.post('/budgets',requirePermission('craft.finance.write'),c.createBudget);
craftFinanceRoutes.post('/budgets/:id/approve',requirePermission('craft.finance.write'),c.approveBudget);

craftFinanceRoutes.get('/accounting',requirePermission('craft.finance.read'),c.accounting);
craftFinanceRoutes.get('/accounting/journals/:id',requirePermission('craft.finance.read'),c.journalDetail);
