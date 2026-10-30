# REQ-014 — Question Bank system verification and manual checklist

Date: 2026-10-30. **Local acceptance passed for the approved Question Bank authoring subset.** This is not a production deployment or completion of the whole module-assessment requirement.

## Isolated environment

`compose.question-bank-test.yml` uses project `sep490-question-bank-test`, separate PostgreSQL/Neo4j volumes, API28480, PostgreSQL28432, graph28474/28487, Mailpit28425, and Vite8098. It never attaches to `sep490-accounts-dev` data or restarts the user's localhost8088 services.

The successful local topology runs the packaged API on host JDK21 and Vite on the host, with real PostgreSQL/Neo4j/Mailpit in Compose. Mailpit SMTP is bound only to localhost28426. This is explicitly a mixed local stack, not an all-container startup/performance or production-readiness receipt. The same application artifact is used; no business API success responses are mocked. The native launcher refreshes local pooled connections and bounds JDBC networking. Two synthetic organizations and all actor/entitlement gates remain active.

The opt-in `QuestionBankTestRuntime` provides two synthetic organizations, paid-entitlement fixtures, Expert/peer/L&D/Employee identities and one approved Neo4j skill. These are synthetic prerequisite records, not evidence of payment, planner readiness or official question calibration. `prepare-question-bank-runtime.py` builds a separate fixture jar; the distributable application jar excludes fixture classes.

## Verified delivery checks (2026-10-30)

- Backend **23/23 passed**,0 failures/errors/skips, `/tmp/sep490-question-bank-bounded-backend.log`:16 domain,3 remote-catalog deadline/recovery,1 real PostgreSQL integration,3 architecture tests. The integration includes actual rollback/lock release after a stalled graph result.
- Frontend **10/10 passed**, `/tmp/sep490-question-bank-handoff-frontend.log`. TypeScript exit0 (`handoff-types.log`); Vite build exit0 in5.09s (`handoff-build.log`). The build retains its large-bundle advisory. Scoped lint exit0 with one actor-preference `set-state-in-effect` warning in the shared layout (`/tmp/sep490-question-bank-handoff-lint.log`); this is not a zero-warning lint claim.
- Complete real browser suite **4/4 passed** in4.1min on the bounded-reader artifact: `/tmp/sep490-question-bank-bounded-browser.log`. It verifies persisted authoring/reload, partial draft validation, publication/immutable predecessor, withdrawal, ownership/peer/cross-org/Employee restrictions, retirement/reactivation, Excel/JSON atomic import and successor confirmation, stale bulk rollback and exact review, CSRF, deliberate network failure/reload, Vietnamese390px form and navigation, notifications/read state and actual Mailpit capture.
- After final translation-only polish, the mobile/error/notification case passed again in24.7s: `/tmp/sep490-question-bank-handoff-mobile.log`. Sidebar resizing no longer covers the Create button; mobile navigation closes the drawer and returning to desktop restores its preference. Form controls have explicit localized accessible names and shared scrollable dialog bodies.
- Actual SMTP interruption/recovery passed on the final backend: `/tmp/sep490-question-bank-bounded-mail.log`, executable `backend/src/test/question-bank-mail-acceptance.py`. Only the test Mailpit is paused and always resumed in `finally`. Submission remains SUBMITTED while SMTP is unavailable; a durable RETRY is observed, recovery reaches SENT with at least2 attempts, captured recipient is exactly the same-org L&D fixture, and choices/explanation are absent from the message. This does not claim exactly-once SMTP.
- Final extended real browser suite: **4/4 passed**,0 failed/skipped/retries,5.3min, `/tmp/sep490-question-bank-final-browser.log`. It includes Return-with-reason and responsibility transfer through the visible dialogs, same candidate ID/history, the old owner's loss of edit rights, and reopening mobile navigation before returning to desktop. The23 backend/10 frontend checks, static results and real SMTP recovery result above remain applicable to the unchanged implementation.

Visual review inspected the rendered desktop directory, Vietnamese mobile page and scrolled create form: `/tmp/question-bank-desktop.png`, `/tmp/question-bank-mobile.png`, `/tmp/question-bank-mobile-form.png`; review/history capture: `/tmp/question-bank-review-history.png`. Native CUA Chrome was unavailable and an IAB attempt timed out; no successful CUA interaction or human manual walkthrough is claimed. The real Playwright interactions, inspected screenshots and repeatable human checklist are distinguished here.

## Earlier execution record (historical; superseded by checks above)

- Backend: 20/20 unit, real PostgreSQL integration and architecture checks passed. [Unit](../unit/REQ-014-question-bank.md), [integration](../integration/REQ-014-question-bank.md).
- Frontend: 10/10 unit/regression checks passed.
- First real Playwright run: **0 passed / 4 failed** while waiting for the Question Bank page to finish loading. No successful authoring/publication/browser acceptance is inferred from that run. Receipt `/tmp/sep490-question-bank-browser.log`.
- Diagnosis: API waiting on Neo4j; direct graph query timed out. Isolated Neo4j heap raised to512MiB and direct query subsequently returned HTTP200/count1. Only the test API was restarted. Host resource contention and slow startup observed; not established as the sole cause.
- UI request deadline added so an unresponsive service leads to an actionable reload error rather than indefinite loading; covered by unit test.
- Focused browser rerun after API startup: **0 passed / 1 failed** after300s waiting for the real sign-in response, before Question Bank authoring. Receipt `/tmp/sep490-question-bank-browser-first-rerun.log`. Inspected failure screenshot/trace: CSRF200, current401 before login, sign-in POST unfinished. This is not a Question Bank visual acceptance result. PostgreSQL test connections were idle without observed lock waits in the sampled diagnostic.
- Direct isolated fixture login later returned HTTP200 in32.48s; responsiveness is unstable and the exact root cause is not yet established. Existing app read-only CSRF also took8.19s. Do not relabel the failed browser runs as passed or infer that memory alone caused them.
- Further focused reruns: warmed proxy login returned200 in7.04s, but the browser case still failed waiting30s for the directory (`/tmp/sep490-question-bank-browser-warm-rerun.log`). Inspection showed the workspace-access loading screen, not the Question Bank component. The test helper was corrected to navigate through the real sidebar instead of immediately forcing a reload after Continue. That rerun also failed after30s waiting for the directory (`/tmp/sep490-question-bank-browser-sidebar-rerun.log`, total2.7min): sign-in, identity and initial entitlement returned200, sidebar was usable, but the new route's workspace entitlement read remained pending. No Question Bank API request appeared in that trace. Screenshot inspected and retained at `/tmp/question-bank-workspace-blocked.png`. These are **two additional failed focused attempts**, not successful acceptance or proof of a Question Bank service defect.
- Final frontend checks after dialog scroll repair: TypeScript exit0, Vite build exit0, scoped lint exit0/no diagnostics,10/10 Vitest tests passed. Receipts `/tmp/sep490-question-bank-final-types.log`, `/tmp/sep490-question-bank-final-build.log`, `/tmp/sep490-question-bank-final-lint.log`, `/tmp/sep490-question-bank-final-frontend.log`. Build retains a large-bundle advisory; no passing browser assertion follows from a successful build.
- At this earlier checkpoint, Question Bank visual verification, real Mailpit recipient/content check and browser acceptance were pending. They are superseded by the verified checks above. Permission was requested separately before any temporary interruption of the user's8088 stack; no interruption was performed.
- The isolated test stack was stopped without deleting volumes while awaiting that decision, to reduce machine load. Its Vite frontend process alone does not provide a usable test environment until the services are started again. Source configuration now disables the unrelated default development bootstrap with `WORKSPACE_DEV_SEED_ENABLED=false`; initial isolated records created by the earlier bootstrap remain preserved, and the user's development database was untouched.

Spec: `frontend/system-tests/REQ-014-question-bank.spec.ts`, real APIs and persistence, isolated browser contexts, no mocked successful business responses. Four journeys cover author/review/history/isolation, Excel/JSON atomic import/successors, stale bulk/CSRF, and mobile Vietnamese/error recovery/notifications. Deliberate network abort is only an error-path test.

## Repeatable commands

After the backend package/test compilation, run `python3 backend/src/test/prepare-question-bank-runtime.py`, then `docker compose -f compose.question-bank-test.yml up -d postgres neo4j mailpit`. With JDK21 selected through JAVA_HOME, start `bash backend/src/test/run-question-bank-api.sh`. Start Vite in `frontend` with `API_PROXY_TARGET=http://127.0.0.1:28480 node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 8098 --strictPort`. Reuse suitable running services; do not start another API on28480. The optional Compose API service requires stopping the native test API first and was not the successful acceptance topology.

Run from repository root: `SYSTEM_TEST_BASE_URL=http://localhost:8098 PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node frontend/node_modules/@playwright/test/cli.js test --config=frontend/playwright.system.config.ts REQ-014-question-bank.spec.ts`.

Do not run the fixture suite against localhost8088. Do not use `down -v` or migrate the user's old learning-module-manage database with this lineage.

After browser tests complete, run `python3 backend/src/test/question-bank-mail-acceptance.py` to repeat the real SMTP failure/recovery check. Do not overlap its Mailpit pause with a browser test expecting Mailpit availability. It restores Mailpit even if its business assertion fails. No real SMTP configuration or inbox credentials are required.

## Manual test checklist

URL: http://127.0.0.1:8098/login (or localhost8098 in a separate private browser profile). Prerequisites: isolated services ready; test runtime enabled. Synthetic accounts `experta@question-bank.test`, `peera@question-bank.test`, `lda@question-bank.test`, `employeea@question-bank.test`; organization B uses suffix `b`. Fixture-only password: `question-bank-test-password`. Using127.0.0.1 keeps its host cookie separate from the user's localhost8088 login; automated tests use isolated contexts on localhost8098. After sign-in, open `/expert/assessment-bank` for Expert or `/ld-manager/question-bank` for L&D. Prototype home-page catalog flows are outside this Question Bank acceptance slice.

| Check | Steps | Expected result |
|---|---|---|
| Existing layout and empty state | Open Expert → Assessment Bank; use an empty organization first. | Header, four stats, filters and skill-grouped directory; helpful empty state, no fake questions. |
| Partial draft and persistence | Create code/prompt/skill only; save, reload; attempt submit. | Draft survives reload; incomplete submit explains required fields. |
| Complete authoring | Edit four distinct options, one answer, difficulty and explanation; save/submit. | Awaiting review; submitted content cannot be directly edited. |
| Peer read-only | Sign in as peer Expert and open the same question/history. | Creator/editor/owner/reviewer shown when recorded; edit/submit unavailable, forged write denied. |
| Review and publication | L&D opens details, explicitly marks exact version reviewed, approves. | Published once; reviewer/time recorded; Expert notified. |
| Successor/return/withdraw | Owner creates successor, edits/submits; L&D returns with reason or owner withdraws. | Same candidate returns to draft; old publication and audit snapshots remain. |
| Assignment | L&D transfers responsibility with reason, including a submitted question. | Original creator/submitter retained; only new owner can edit after return/withdraw. |
| Import | Download Excel template, use Skills sheet IDs; upload Excel or JSON; preview then confirm. | All rows valid before atomic import; incomplete drafts supported. |
| Collision handling | Import peer-owned code, then own published code; test different-code matching content. | Foreign/active-candidate conflict blocks batch; own successor and similarity warnings require explicit confirmation. |
| Bulk and stale data | View selected submitted versions; change one from another context, approve selected. | Entire stale batch rejected; reload/review required, no partial publication. |
| Retire/reactivate | Owner requests with reason; L&D confirms each action. | Stable question unavailable for future selection when retired; historical references unchanged. |
| Notifications | Open own notifications, mark read; inspect Mailpit http://localhost:28425. | Same-org targeted notifications; local email only, no answer keys. |
| Error/cancel/mobile | Cancel dialogs; interrupt a request and reload; choose VI at390px width. | No mutation on cancel, clear retry, no page overflow, readable translated UI. |
| Wrong actor/organization | Employee calls staff endpoint; org B looks up org A ID. |403/404 and no protected question/key disclosure. |

Module exam construction, Employee quiz/scoring, IRT calibration/model promotion and real SMTP delivery are outside this slice.


## Existing 8088 deployment — 2026-10-30

User explicitly authorized updating8088 for manual testing. Existing PostgreSQL and API were backed up under `local/dev-accounts/question-bank-backup-20261030/` (private, ignored; credentials not reproduced). No graph, account, module or learning records were reset or seeded.

The existing API artifact retained legacy module/content classes and libraries. The deployed compatibility artifact adds Question Bank classes and the three modified assessment selection adapters from the verified build. Its historical SQL resources are aligned with the actual database lineage: module/content V33–V38, pathway V39–V41; new Question Bank SQL is V42. This is a local runtime artifact, not a change to branch migration numbers; do not replace it with the branch jar against this database without reconciling migration lineage.

A restored database copy `question_bank_deploy_check` passed all42 Flyway validations/migrations and API startup. Existing Expert/L&D logins and bank/session reads returned200 on the copy. On the actual database, Flyway validated42 and applied V42 successfully; the separate non-web migration application then failed context initialization because legacy module configuration requires a mail bean absent from its migrate profile. Migration was committed; the normal workspace-profile API subsequently started and passed authenticated smoke checks. No repair or schema-history edits were performed. Receipt: `/tmp/question-bank-8088-migration.log`.

After replacement/restart of only `sep490-accounts-dev-api-1`, automated real Chrome checks at `http://localhost:8088` passed for `expert@example.test` and `ld.manager@example.test`: login, protected Assessment Bank route, visible metric header, bank API200, no page exceptions. Authenticated session and bank reads also passed on28180. Screenshots `/tmp/question-bank-8088-expert.png` and `/tmp/question-bank-8088-ld.png`; Expert screenshot visually inspected. No question creation/publication was attempted in preserved user data. Temporary validation API stopped; cloned database retained.

Manual prerequisite: all79 existing MicroSkills are ACTIVE/NEEDS_EXPERT_REVIEW; zero are APPROVED. Both staff views correctly show no approved skills and an empty organization bank, with authoring/import unavailable. Approve the intended real skill through catalog review before testing creation/import; no review metadata has been fabricated. Existing accounts/passwords remain in private `local/dev-accounts/ACCOUNTS.md`.

| URL | Steps | Expected |
| --- | --- | --- |
| http://localhost:8088/login | Sign in using existing Expert; open Assessment Bank. | Real empty bank, no mock questions; clear missing-approved-skill notice. |
| http://localhost:8088/ld-manager/question-bank | Sign in as existing L&D. | Same organization bank and L&D review controls when submitted questions exist. |
| Expert Assessment Bank after legitimate skill approval | Reload; create/import and submit a question; L&D reviews exact version. | Approved skill selectable; persistent draft/submission and published audit after approval. This mutation flow was not rerun on preserved8088 data. |


### User-authorized manual-test skill on8088

2026-10-30: user requested one preapproved skill for manual Question Bank testing. Added only `QB-MANUAL-TEST-SQL`, name `[TEST] SQL cơ bản – Question Bank`, version1.0.0, ACTIVE/APPROVED, with definition explicitly identifying a manual-test fixture rather than business approval. `reviewedBy`/`reviewedAt` remain null: no fabricated reviewer or review event. This is an explicit test-only eligibility fixture, not a fully reviewed catalog publication. Existing79 skills unchanged; no module/role relationships added. Authenticated Expert and L&D session endpoints returned200 with exactly one selectable skill; bank reads returned200, zero questions. Reload8088 Assessment Bank and choose this skill to test authoring/import. The earlier zero-eligible-skills observation remains historical.


### Bulk approval feedback follow-up — 2026-10-30

Existing shared Dialog now lists selected question codes with reasons before any invalid bulk request (unreviewed, unassigned, stale state). Open first question leads to Details & history; it never automatically acknowledges review. A real server conflict opens the same dialog, substitutes public codes for IDs, offers reload, retains selection, and avoids claiming that a timed-out request definitely rolled back. English/Vietnamese copy and scrollable mobile dialog reuse existing design tokens/components.

Actual acceptance on8088 passed using real Chrome, current accounts, actual API/PostgreSQL/Neo4j: one dedicated `TEST-POPUP-1793336832284` was created/submitted, local unreviewed guard prevented any approve request, direct detail navigation worked, Vietnamese popup at390px was readable, then an actual Expert withdrawal after L&D acknowledgement produced409 with code/reload guidance. No question was published by the test. Dedicated question retained DRAFT; original three SQL questions unchanged. Receipt `/tmp/question-bank-feedback-real8088.log`; procedure `/tmp/question-bank-feedback-real8088.cjs`; screenshots `/tmp/question-bank-feedback-8088-en.png`, `/tmp/question-bank-feedback-8088-vi-mobile.png`, `/tmp/question-bank-feedback-8088-conflict.png`. Desktop and mobile screenshots visually inspected. Frontend8088 reads workspace source, so no API restart/deployment was necessary.

Reproducible isolated journey added to `frontend/system-tests/REQ-014-question-bank.spec.ts` (`--grep 'bulk approval explains'`). Two8098 executions failed before authoring at initial catalog loading (503 catalog unavailable), receipts `/tmp/question-bank-feedback-browser.log` and `/tmp/question-bank-feedback-browser-rerun.log`; these are not passing system runs. Restarting dedicated test graph/native API did not restore its fixture startup (Bolt unavailable); separate8098 environment remains unavailable at this handoff.8088 actual browser acceptance above passed after catalog recovery. The initial nonmutating8088 probe could not reproduce missing acknowledgement once user questions were already reviewed/published; dedicated test data was used instead.

Manual checklist: at `http://localhost:8088/ld-manager/question-bank`, sign in as L&D; select an unreviewed submitted question and choose Approve selected. Expect code-specific popup and instructions, no publication. Choose Open first question, read and explicitly acknowledge; return to select only reviewed current versions. A stale concurrent update should instead display its reason and Reload latest data. Back to list retains selection; mobile Vietnamese uses the same actions. Dedicated test question is currently Draft, so submit it as responsible Expert to exercise this checklist again.
