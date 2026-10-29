# REQ-013 — single responsible Expert and localhost8088

Date: 2026-10-29. Canonical local URL: **http://localhost:8088/login**. Vite proxies to the normal application API28180, backed by dedicated sep490-accounts-dev PostgreSQL/Neo4j. Five original role credentials remain unchanged in ignored local/dev-accounts/ACCOUNTS.md. Hostname change requires a new login, not new accounts.

## Actual system verification

Final Playwright run: **6 passed in1.1m**, real APIs/databases, no HTTP mocks:

- REQ-013-single-expert.spec.ts: owner signs in, creates content and Module, edits, submits; real L&D account approves/releases. A second real Expert in the same organization with no occupation grants sees the creator/editor/reviewer names/history and View only status, with no Edit/Submit/Delete/Archive controls. Direct authenticated PUT/DELETE/submit requests return403. Reload retains read-only state. Test reader accounts are deactivated during cleanup; the original five accounts remain active.
- REQ-037-dev-accounts.spec.ts: all five roles sign in through the existing page and reach their correct destination on localhost8088; Organization Administrator still stops at actual MFA enrollment, which is deliberately not bypassed.

An early browser attempt was interrupted to fix the test's missing Add skill interaction. After correction the ownership journey passed, and the final combined run passed all six. A temporary frontend unit timeout under concurrent work was followed by a successful serial10-test run. Failed/interrupted attempts are not counted as passes.

[Read-only peer screenshot](artifacts/REQ-013-single-expert/read-only-peer.png) visually verifies author, last-edit date, reviewer, release state and history access without editing controls. Names are presentation from same-organization Staff data; audit IDs/timestamps stay unchanged. Dates use the selected language's readable format.

[Unit evidence](../unit/REQ-013-single-expert.md):16 backend +10 frontend checks passed; [integration and handover evidence](../integration/REQ-013-single-expert.md):2 real database tests passed, source histories preserved. Typecheck/build passed.

## Manual checklist

Prerequisites: dedicated API/Neo4j/PostgreSQL services and Vite8088 running; credentials from private account sheet. For peer verification, use a second active Expert created by the Organization Administrator, or run the automated spec which prepares and deactivates its reader fixture.

1. Sign in as expert@example.test, open `/expert/modules`, search an existing imported module or create a new one. Expected: responsible Expert shown, edit/submit controls available for eligible states; creator set automatically from session.
2. Edit a draft/released owned Module and save. Expected: new revision, readable last-edit time, earlier versions retained; approval required before publishing changed content.
3. Sign in as another Expert in the same organization. Expected: Module and Details & history visible, creator/editor/reviewer information visible, View only badge; no authoring controls. API mutation attempts must return403 even with a correct lock version and CSRF token.
4. Sign in as ld.manager@example.test, open Modules/Approvals, review the submitted revision and approve or return with feedback. Expected: L&D navigation retained; decisions saved separately from editor identity. L&D cannot author the payload.
5. For an unmanaged future catalog Module, select exactly one Responsible Expert in Assign for intake. Expected: only that Expert can receive it; another Expert may inspect it but cannot claim/edit it.
6. Try deleting an eligible never-released owned draft. Expected: owner succeeds. Imported/released/referenced Modules retain the existing archive/approval protection; peer deletion always fails.
7. Compare history on a handed-over Module. Expected: original revisions/reviewers preserved plus OWNER_ASSIGNED; prior pending intake history also remains. Ownership assignment does not approve a Module.
8. Sign out and reload a protected page. Expected: login required. Use localhost8088 consistently; old127.0.0.1:28188 is no longer the active frontend.

## Runtime/data boundary

269 original/imported Module documents were assigned to expert@example.test (23 preserved histories +246 received catalog records). Browser verification adds separately named test records. Entire source catalog graph was copied; unrelated PostgreSQL features such as the old question bank were not migrated. Old source databases remain intact, and their Flyway lineage was not rewritten. Dev email/subscription fixtures remain synthetic; no real payment/mail. No commit/push is part of this change.

[Restart/tooling guide](../../../tools/dev-accounts/README.md). Start frontend from frontend/ with `API_PROXY_TARGET=http://127.0.0.1:28180 npm run dev -- --host 127.0.0.1 --port 8088 --strictPort`. Compose configuration is compose.accounts-dev.yml with private local/dev-accounts/private.env; ordinary stop/restart preserves accounts/data. No Docker image rebuild was needed.
