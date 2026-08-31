#!/usr/bin/env node
// This lightweight acceptance preflight intentionally performs no data mutation.
// Full browser mutation coverage is exercised by the API smoke suite in CI environments.
const frontend = process.env.DOCUMENTS_BROWSER_BASE_URL || 'http://localhost:5173';
const api = process.env.DOCUMENTS_BROWSER_API_URL || 'http://localhost:3001/api/v1';
try {
  const [page, health] = await Promise.all([fetch(`${frontend}/app/documents`, { signal: AbortSignal.timeout(10_000) }), fetch(`${api}/health`, { signal: AbortSignal.timeout(10_000) })]);
  if (!page.ok) throw new Error(`Document Center frontend returned ${page.status}`);
  if (!health.ok) throw new Error(`API health returned ${health.status}`);
  console.log('Documents browser preflight: PASS (frontend and API reachable).');
} catch (error) { console.error('Documents browser preflight: FAIL', error); process.exitCode = 1; }
