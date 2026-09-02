#!/usr/bin/env node
import { createHmac } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const root = path.resolve(import.meta.dirname, '..', '..');
dotenv.config({ path: path.join(root, 'server', '.env'), quiet: true });
const frontend = process.env.ROUTE_COVERAGE_BASE_URL || 'http://localhost:5173';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

// Every known sidebar route (src/components/layout/Sidebar.tsx), Craft + Studio + Global.
// Parameterized detail/edit routes are intentionally excluded — they need a real entity id
// and are covered by their module's own smoke/browser tests instead.
const ROUTES = [
  '/app/dashboard',
  '/app/craft/orders', '/app/craft/orders/new', '/app/craft/orders/drafts', '/app/craft/orders/priority', '/app/craft/orders/queue', '/app/craft/orders/custom', '/app/craft/orders/partners', '/app/craft/orders/completed', '/app/craft/orders/cancelled',
  '/app/craft/production', '/app/craft/production/active', '/app/craft/production/queue', '/app/craft/production/jobs', '/app/craft/production/failures', '/app/craft/production/qc', '/app/craft/production/calendar',
  '/app/craft/products', '/app/craft/products/design-library', '/app/craft/products/print-profiles', '/app/craft/products/cost-pricing',
  '/app/craft/printers', '/app/craft/printers/activity', '/app/craft/printers/history', '/app/craft/printers/maintenance', '/app/craft/printers/issues',
  '/app/craft/materials', '/app/craft/materials/filament', '/app/craft/materials/spools', '/app/craft/materials/movements', '/app/craft/materials/low-stock', '/app/craft/materials/waste',
  '/app/craft/customers', '/app/craft/customers/partners',
  '/app/craft/procurement', '/app/craft/procurement/suppliers', '/app/craft/procurement/requests', '/app/craft/procurement/orders', '/app/craft/procurement/receipts', '/app/craft/procurement/invoices', '/app/craft/procurement/history',
  '/app/craft/finance', '/app/craft/finance/transactions', '/app/craft/finance/treasury', '/app/craft/finance/income', '/app/craft/finance/expenses', '/app/craft/finance/receivables', '/app/craft/finance/payables', '/app/craft/finance/profitability', '/app/craft/finance/calculator', '/app/craft/finance/cash-flow', '/app/craft/finance/budgets', '/app/craft/finance/accounting',
  '/app/craft/analytics', '/app/craft/analytics/sales', '/app/craft/analytics/orders', '/app/craft/analytics/products', '/app/craft/analytics/channels', '/app/craft/analytics/customers', '/app/craft/analytics/production', '/app/craft/analytics/printers', '/app/craft/analytics/materials', '/app/craft/analytics/procurement', '/app/craft/analytics/profitability',
  '/app/craft/marketplace', '/app/craft/marketplace/channels', '/app/craft/marketplace/import', '/app/craft/marketplace/products', '/app/craft/marketplace/fees', '/app/craft/marketplace/settlements', '/app/craft/marketplace/integrations', '/app/craft/marketplace/sync-history',
  '/app/craft/automations', '/app/craft/automations/rules', '/app/craft/automations/templates', '/app/craft/automations/runs', '/app/craft/automations/catalog', '/app/craft/automations/events',
  '/app/studio/projects', '/app/studio/projects/active', '/app/studio/projects/new', '/app/studio/projects/milestones',
  '/app/studio/clients',
  '/app/studio/services', '/app/studio/services/categories', '/app/studio/services/packages',
  '/app/studio/equipment', '/app/studio/equipment/assets', '/app/studio/equipment/assignments', '/app/studio/equipment/maintenance',
  '/app/studio/billing/quotations', '/app/studio/billing/invoices', '/app/studio/billing/outstanding',
  '/app/studio/vendors', '/app/studio/vendors/vendor', '/app/studio/vendors/freelancers', '/app/studio/vendors/partners', '/app/studio/vendors/assignments',
  '/app/studio/finance', '/app/studio/finance/transactions', '/app/studio/finance/treasury', '/app/studio/finance/income', '/app/studio/finance/expenses', '/app/studio/finance/receivables', '/app/studio/finance/payables', '/app/studio/finance/profitability', '/app/studio/finance/cash-flow', '/app/studio/finance/budgets', '/app/studio/finance/accounting',
  '/app/studio/analytics', '/app/studio/analytics/projects', '/app/studio/analytics/clients', '/app/studio/analytics/services', '/app/studio/analytics/commercial', '/app/studio/analytics/revenue', '/app/studio/analytics/profitability', '/app/studio/analytics/receivables', '/app/studio/analytics/vendors', '/app/studio/analytics/equipment',
  '/app/studio/automations', '/app/studio/automations/rules', '/app/studio/automations/templates', '/app/studio/automations/runs', '/app/studio/automations/catalog', '/app/studio/automations/events',
  '/app/finance', '/app/documents', '/app/calendar', '/app/notifications', '/app/users', '/app/audit-log', '/app/integrations', '/app/automations', '/app/reports', '/app/master-data', '/app/settings', '/app/profile',
];

const tokenFor = user => {
  const now = Math.floor(Date.now() / 1000); const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 3600 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
};

async function mostPrivilegedUser() {
  console.log('Resolving the most-privileged active user for route coverage…');
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const [[{ total }]] = await connection.execute(`SELECT COUNT(*) total FROM permissions`);
    const [rows] = await connection.execute(
      `SELECT u.id, u.organization_id, u.username, COUNT(DISTINCT p.id) permission_count
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE u.deleted_at IS NULL AND u.status_code = 'active' AND u.approval_status_code = 'approved'
       GROUP BY u.id, u.organization_id, u.username
       ORDER BY permission_count DESC LIMIT 1`,
    );
    assert(rows.length, 'No active, approved user is available to run route coverage.');
    const user = rows[0];
    console.log(`Using ${user.username} with ${user.permission_count}/${total} permissions.`);
    if (Number(user.permission_count) < Number(total) * 0.8) {
      console.warn(`Warning: the most-privileged available user only holds ${user.permission_count}/${total} permissions — some routes may legitimately show "Akses Ditolak" rather than an unintended one.`);
    }
    return user;
  } finally { await connection.end(); }
}

async function waitPort(profile, child) {
  const portFile = path.join(profile, 'DevToolsActivePort'); const deadline = Date.now() + 20000;
  while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode}) before startup.`); try { const [port] = (await readFile(portFile, 'utf8')).trim().split(/\r?\n/); if (Number(port)) return Number(port); } catch { /* wait */ } await delay(100); }
  throw new Error('Chrome DevTools did not start.');
}
function connect(url) {
  const socket = new WebSocket(url); let id = 0; const pending = new Map(); const listeners = new Map();
  socket.addEventListener('message', async event => {
    const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text());
    if (message.id && pending.has(message.id)) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result || {}); }
    else if (message.method && listeners.has(message.method)) { for (const handler of listeners.get(message.method)) handler(message.params); }
  });
  const ready = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Cannot connect to Chrome DevTools.')), { once: true }); });
  return {
    socket,
    send: async (method, params = {}) => { await ready; return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); },
    on: (method, handler) => { if (!listeners.has(method)) listeners.set(method, []); listeners.get(method).push(handler); },
  };
}

async function run() {
  console.log(`Starting sidebar route coverage across ${ROUTES.length} routes…`);
  const token = tokenFor(await mostPrivilegedUser()); let child; let profile; let keepAlive;
  const failures = [];
  try {
    profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-route-coverage-'));
    console.log('Starting headless Chrome…');
    child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, '--window-size=1440,1100', 'about:blank'], { windowsHide: true });
    const port = await waitPort(profile, child); const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const target = targets.find(item => item.type === 'page'); assert(target?.webSocketDebuggerUrl, 'No Chrome page target is available.');
    console.log('Connecting to Chrome DevTools…');
    keepAlive = setInterval(() => {}, 1000);
    const cdp = connect(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token', ${JSON.stringify(token)}); window.__routeErrors=[]; window.addEventListener('error', event => window.__routeErrors.push(event.message)); window.addEventListener('unhandledrejection', event => window.__routeErrors.push(String(event.reason)));` });

    let failedResponses = [];
    cdp.on('Network.responseReceived', params => {
      const url = params.response?.url || '';
      if (url.includes('/api/') && (params.response?.status === 404 || params.response?.status >= 500)) failedResponses.push(`${params.response.status} ${url}`);
    });

    const evalPage = () => cdp.send('Runtime.evaluate', { expression: '({heading:document.querySelector("main h1")?.textContent?.trim()||null,body:document.body.innerText,errors:window.__routeErrors||[]})', returnByValue: true }).then(r => r.result?.value || {});
    for (const route of ROUTES) {
      failedResponses = [];
      await cdp.send('Page.navigate', { url: `${frontend}${route}` });
      // Cold Vite module transforms + a real /auth/me round-trip can take longer than a fixed
      // delay, especially for the first route hit in a fresh headless profile — poll instead.
      let page = await evalPage(); const deadline = Date.now() + 25000;
      while (!page.heading && Date.now() < deadline) { await delay(250); page = await evalPage(); }
      const routeFailures = [];
      if (!page.heading) routeFailures.push('no <h1> heading found');
      if (page.body?.includes('Dalam Pengembangan')) routeFailures.push('rendered the generic "Dalam Pengembangan" placeholder');
      if (page.body?.includes('Akses Ditolak')) routeFailures.push('rendered "Akses Ditolak" for the most-privileged available user');
      if (page.errors?.length) routeFailures.push(`browser errors: ${page.errors.join('; ')}`);
      if (failedResponses.length) routeFailures.push(`failed API requests: ${failedResponses.join(', ')}`);
      if (routeFailures.length) failures.push(`${route}: ${routeFailures.join(' | ')}`);
      else console.log(`OK  ${route}  (${page.heading})`);
    }

    cdp.socket.close();
    if (failures.length) { console.error(`\n${failures.length} route(s) failed coverage:\n${failures.map(f => ` - ${f}`).join('\n')}`); process.exitCode = 1; }
    else console.log(`\nSidebar route coverage passed for all ${ROUTES.length} routes.`);
  } finally { if (keepAlive) clearInterval(keepAlive); if (child) child.kill(); if (profile) { await delay(500); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }).catch(cleanupError => console.warn(`Warning: could not fully clean up ${profile}: ${cleanupError.message}`)); } }
}
run().catch(error => { console.error(error); process.exit(1); });
