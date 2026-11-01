# REQ-013 / REQ-014 — merged UI verification and manual checklist

2026-11-01. Source/router/UI conflicts are resolved. Real-store retest passed10/10. The accidental-seed recovery is complete and API8088 has restarted with seeds disabled; full merged mutation-browser acceptance remains separate.

## Executed browser checks

**Passed2/2** with the current production frontend build, preview URL `http://localhost:8099`, existing bundled Chrome for Testing153 and `frontend/system-tests/REQ-013-014-merge-routing.spec.ts`:

- Actual App router: legacy /manager/modules → /ld-manager/modules; Learning content → Approvals stay in L&D. Question Bank bulk preflight identifies the unreviewed code and remediation without sending an approval request. No page errors were observed in this journey.
- Mobile390×844: Employee without a pathway sees the guided empty state, no R4/manual selector and no page overflow. Opening the Expert Question Bank shows role denial and does not request staff question data.

These two cases use explicit API contract fixtures through page.route. They certify browser wiring/presentation only, **not persistence or server authorization**. Desktop popup and mobile screenshots were visually inspected. Artifacts: frontend/test-results/merged-ui-review-feedback.png, merged-ui-employee-mobile.png; log `/tmp/sep490-backend-ui-merge/browser-routing.log`. The preview is task-local and is stopped after verification.

## Real-stack attempt and limits

`frontend/system-tests/REQ-013-014-merge-integration.spec.ts` retains the real login/module/review/Question Bank/ownership/mobile journeys. It is restricted to the isolated fixture URLs8098/8099 and uses no mocked API responses or public fixture endpoints.

The merged test jar started successfully with all product components. Docker API startup took461s; the same jar on native JDK21 started in43s, using Compose PostgreSQL28432/Neo4j28487/Mailpit28426. Real staff sign-in and real module create201/edit200/submit200 were observed while diagnosing traces. This partial observation does not establish complete acceptance.

The complete journey did **not pass**. API startup produced502 responses in early attempts. Later runs encountered closed PostgreSQL connections and Hikari acquisition/validation timeouts, causing500/401 failures on identity/entitlement reads. The run was stopped rather than marking L&D approval, Question Bank publication or peer/cross-organization browser checks as passed. Native API and task-owned Compose databases were stopped with volumes retained. The pre-existing frontend dev server was not replaced.

Logs: `/tmp/sep490-backend-ui-merge/browser.log`, browser-ready.log, browser-native.log, browser-final.log, native-api.log and backend-integration-pg.log. Earlier failure traces were replaced by later Playwright output; the logs and pending executable specs remain. Full real-stack, VI/mobile real-data and final manual acceptance must be rerun after database responsiveness recovers. This paragraph records the earlier pre-deployment attempt; the later local deployment is recorded below.

## Manual checklist

URL: http://localhost:8088/login. Prerequisites: complete the recovery/readiness gate below and use existing real-session test accounts from the private local guide. Do not use demo-persona cookies or a UI actor switch as authorization.

1. Expert → Modules: open an owned module, edit title/content, save, reload, then submit. Expect retained editor/time and a new revision, with no bypass of submission state.
2. Another Expert → same module: inspect details/history. Expect no Edit/Submit/Delete actions; direct unauthorized commands must also fail.
3. L&D → Content Approval → Modules: expect URL remains /ld-manager/modules. Inspect each lesson, cancel a decision, then approve a submitted module. Reload and verify release state/reviewer history. Legacy /manager/modules must stay in the L&D workspace.
4. Expert → Assessment Bank: create a question. Expect no editable code field, server-generated immutable code, skill/difficulty/options and saved draft after reload. Import templates must omit code.
5. L&D → Question Bank: inspect the submitted version, acknowledge review, then approve. Bulk approval without exact-version review must show actionable feedback; stale/unauthorized changes must not silently succeed.
6. Employee: staff answer-bearing APIs must return403. An Employee without a real pathway sees the guided empty state, with no R4/manual test selector; an eligible assigned learner uses the existing lesson reader and server progress.
7. On mobile, inspect the shared sidebar, dialogs and action bars; verify content is usable without horizontal page overflow. Sign out and confirm protected routes no longer expose staff content.

Pending manual steps are not reported as completed browser evidence. The earlier source-only slice did not change8088. The later explicitly authorized deployment is recorded below.

## Existing8088 full-artifact update and recovery gate — 2026-11-01

After the10/10 real-store checks passed, the user explicitly authorized updating the existing API and then documents. The full merged product JAR (SHA256 `95287e7327599be37dd0a5b9a41149cef1a15dee970cb2b88c933a7408b28c5d`) replaced the compatibility JAR. No fixture runtime is packaged. Only the API service was recreated; private settings, ports and data volumes were preserved. New explicit migration location: `classpath:db/module-migration`.

Private backup: `local/dev-accounts/merge-backup-20261101-120709/` contains old JAR, credentials/config snapshot, migration history and906228-byte PostgreSQL custom dump. `pg_restore --list` read1130 catalog lines successfully. A separate audit database `merge_audit_20261101` restored that dump successfully; it is not a replacement of the running database. No restore into the user database has been performed.

API startup validated42 migrations, V42/no pending migration, and started in70.695s (101.498s process startup). Frontend/proxy CSRF endpoint returned200. Real-session Playwright smoke, with no API fixtures, loaded Expert Modules and Question Bank, L&D legacy manager alias→Modules, Learning content, Approvals and Question Bank. Both module directory reads/UI reported295 stored Modules. No module/question authoring mutations were made by this smoke. Employee staff Question Bank returned403, but final Employee pathway loaded-state verification timed out at90s; the initial shell screenshot is not accepted as a completed empty-state check. No new full review/publication browser pass is claimed.

**Unexpected side effect / currently blocked:** main's `DevelopmentWorkspaceAccountBootstrap` defaults on under local+workspace-baseline. The new artifact ran it and added7 TechNova accounts/1 organization plus associated development records and aligned48 TargetRole ownership/assignment metadata. The old artifact did not contain this bootstrap. Module count remained295. The accounts Compose now explicitly sets `WORKSPACE_DEV_SEED_ENABLED=false`; this is an operational protection, not a schema or permission change. API was stopped to prevent further writes while recovery is assessed.

The pre-update audit backup contains14 accounts/4 organizations and no TechNova account/organization; after startup the live database contained21/5 and7 TechNova accounts. Automatic approval review rejected the proposed live cleanup because it deletes organization-related records and bypasses referential guards. No cleanup was executed. Explicit user authorization for reversing only the accidental seed is pending. Neo4j prior ownership must be established before restoration; do not infer lost metadata or restore entire historical graph snapshots over later user edits.

Logs/scripts: `/tmp/sep490-backend-ui-merge/deployment.log`, `accounts-lineage-validation.log`, `dev-smoke-loaded.log`, `deploy_accounts.py`, `dev-smoke.cjs`. Initial screenshots were inspected and revealed premature loading states; the stronger rerun waited for real directory responses and checked stored titles. This is read/navigation smoke, not complete mutation/mobile acceptance. Current availability: **API stopped pending safe recovery**, frontend8088 still available. Do not report deployment complete while this gate remains open.

### Read-only recovery audit

All48 current TargetRole IDs and all properties except `organizationId`, `assignedExpertId`, `assignedExpertName` match the retained29 October private graph snapshot exactly. Those three properties were absent for all48 snapshot Roles. Current post-seed Role properties were captured privately beside the deployment backup. This establishes a concrete historical recovery reference, not an immediate pre-update graph dump; restoring ownership still requires explicit approval. No graph recovery command has run. The PostgreSQL audit database and private backup remain available.

## Authorized seed recovery and restart — 2026-11-01

This supersedes the pending-approval/API-stopped status in the incident record above. After the user explicitly confirmed recovery, only the newly created TechNova seed data was removed. The API stayed stopped during recovery. A second private full PostgreSQL dump was retained before the operation, and the exact recovery SQL/receipt are beside the original private backup.

Before any deletion, every old row in18 checked PostgreSQL tables was verified unchanged. The recovery transaction removed the new seed organization's records only; it temporarily disabled session-level referential triggers for the fixture's circular billing references, then compared all18 table hashes to the pre-update audit database **inside the transaction before commit**. Any mismatch would have aborted the transaction. No whole-database restore, user-module deletion, migration repair or published-history rewrite was performed.

Graph recovery touched only `organizationId`, `assignedExpertId`, `assignedExpertName` on48 exact TargetRole IDs. It required all other properties to match the retained29 October snapshot and all three current values to match the accidental bootstrap. An explicit Neo4j transaction checked48 matches before committing; post-read matched all48 reference property maps. The reference is the retained historical snapshot, not an immediate pre-deployment graph dump. Current post-error properties remain privately backed up.

The API was recreated with `WORKSPACE_DEV_SEED_ENABLED=false`, `CATALOG_SEED_ENABLED=false` and `WORKSPACE_MIGRATION_LOCATION=classpath:db/module-migration`. Startup completed in28.682s (32.616s process time), validated42 migrations, and applied none. The frontend/proxy CSRF endpoint on http://localhost:8088 returned200. No development-bootstrap seed/alignment log appeared.

Post-restart verification passed: all18 table hashes still match the pre-update backup;14 accounts,4 organizations and295 Module documents remain. **270 PostgreSQL foreign-key relationships checked,0 orphan references** in both original audit and current databases. All48 graph Role property maps still match the approved recovery reference. Existing content/Question Bank tables were included in the18-table comparison. Test auth sessions are separate operational sign-in records.

Logs: `/tmp/sep490-backend-ui-merge/seed-recovery.log`, `verify-recovery.log`; reproducible task scripts `recover_seed.py`, `verify_recovery.py`. Private receipts and before/after backups remain in `local/dev-accounts/merge-backup-20261101-120709/`. No commit/push was performed. This certifies the scoped recovery and service restart, not every feature or the full isolated browser authoring/review suite.

### Final real8088 read/navigation smoke after recovery

**Passed7/7 loaded routes** using real existing account credentials and APIs, with no response fixtures: Expert `/expert/modules`, `/expert/assessment-bank`; L&D `/manager/modules`→`/ld-manager/modules`, `/ld-manager/learning-content`, `/ld-manager/approvals`, `/ld-manager/question-bank`; Employee `/employee/pathway`. Both staff directory checks returned295 persisted Modules and verified an actual stored title on screen. The L&D screenshot also displayed298 available content records and80 skills. Employee staff Question Bank access returned403; actual own pathway API returned200/status null and the rendered guided empty state was visible with no R4 selector. No browser page errors were reported. Loaded L&D and Employee screenshots were visually inspected.

The first post-recovery smoke passed Expert and manager module reads but hit its5s loading assertion on the content page. The retry allowed60s for readiness, retained the same loaded-content/error assertions and passed all seven. Employee uses its actual API/visible-state assertion instead of generic network-idle because idle timed out in the earlier run; no successful empty-state result was inferred from a loading skeleton. Log: `/tmp/sep490-backend-ui-merge/dev-smoke-recovered-retry.log`; screenshots `smoke-2-0.png`, `smoke-4-0.png` beside it. Private post-restart receipt is stored with the backup.

These are real login/read/navigation/authorization smoke checks, not a completed create→submit→review→publish browser test or mobile mutation acceptance. The10 real-store cases and3 configuration cases remain separately recorded. Current local URL is ready for manual testing: **http://localhost:8088/login**, using existing credentials from the private account guide. Start with Expert Modules, then L&D Content Approvals/Question Bank; the structured checklist above covers further mutations. No account seed, password reset, module import, commit or push was performed during the authorized recovery.
