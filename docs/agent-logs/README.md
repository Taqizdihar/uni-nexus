# Agent development logs

This directory preserves standalone local Codex development logs that were
previously kept at the workspace root or in `server/`. They remain ignored by
Git under the repository's `*.log` rule, so this index—not the log contents—is
the tracked historical record.

All 33 files were scanned for common credential and private-key patterns before
they were moved on 2026-09-01; no matches were found. No files were deleted or
rewritten.

## Codex / workspace

Location: `docs/agent-logs/codex/workspace/` (original location: repository
root).

- 2026-08-24: `vite` development output and error logs.
- 2026-08-28: browser dashboard, client build, dashboard build/development,
  storage development, and studio-analytics logs.
- 2026-08-30: audit and notifications development logs.
- 2026-08-31: calendar, documents, and master-data development logs.

Files: `.codex-audit-dev.{err,out}.log`,
`.codex-browser-dashboard.{err,out}.log`,
`.codex-calendar-dev.{err,out}.log`,
`.codex-client-build.{err,out}.log`,
`.codex-client-build-final.{err,out}.log`,
`.codex-dashboard-build.{err,out}.log`, `.codex-dashboard-dev.{err,out}.log`,
`.codex-documents-dev.{err,out}.log`,
`.codex-master-data-dev.{err,out}.log`,
`.codex-master-data-final-dev.{err,out}.log`,
`.codex-notifications-dev.{err,out}.log`, `.codex-storage-dev.{err,out}.log`,
`.codex-studio-analytics-dev.log`, and `.codex-vite.{err,out}.log`.

## Codex / server

Location: `docs/agent-logs/codex/server/` (original location: `server/`).

- 2026-08-24: server development output and error logs.
- 2026-08-28: browser analytics and studio-analytics logs.
- 2026-08-30: browser audit log.

Files: `.codex-dev-server.{err,out}.log`,
`.codex-browser-analytics.{err,out}.log`, `.codex-browser-audit.log`, and
`.codex-browser-studio-analytics.log`.

## Codex / artifacts

Location: `docs/agent-logs/codex/artifacts/` (original location:
`artifacts/`).

- 2026-08-27–28: billing build, lint, development, and browser-test output.

Files: `codex-billing-build.{err,out}.log`,
`codex-studio-billing-browser.{err,out}.log`,
`codex-studio-billing-build.{err,out}.log`,
`codex-studio-billing-dev.{err,out}.log`, and
`codex-studio-billing-lint.{err,out}.log`.
