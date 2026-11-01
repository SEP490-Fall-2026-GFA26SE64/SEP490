# REQ-014 / REQ-016 — configuration smoke and manual handoff

2026-11-01: `docker compose -f compose.dev.yml config --quiet`, `docker compose --env-file local/dev-accounts/private.env -f compose.accounts-dev.yml config --quiet`, and `docker compose -f compose.question-bank-test.yml config --quiet` all **Passed**. No secret-bearing expanded configuration was printed.

**Not Run:** rebuilt application, runtime deployment, API/browser regression and broader Compose journey. Other application/frontend merge conflicts remain unresolved. **Not Applicable:** new Playwright UI assertions for this slice, because no UI behavior or frontend source was changed. Existing UI regression is still required after the complete merge.

## Manual checklist after the complete merge and a separately authorized deployment

URL: http://localhost:8088/login. Prerequisites: complete remaining conflicts, back up data, select and validate the matching [migration history](../../technical/MIGRATION_LINEAGES.md), then build/deploy successfully. Use existing test accounts from the private local account guide; this document contains no passwords.

1. Sign in as Expert: existing modules and Question Bank remain visible; open a saved item and verify its content/history.
2. Sign in as L&D: open module and Question Bank review lists; verify existing records and status/history load.
3. Sign in as Employee: verify own approved pathway and existing lesson progress, if assigned; otherwise verify the existing empty state.
4. After an authorized restart, repeat reads and confirm the server reports no Flyway validation or duplicate-version error and no new migration on a second start.

These manual steps are pending. This phase did not restart services or change the 8088 database, graph, assets or seed data.
