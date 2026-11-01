# REQ-013 module management — system and manual verification

## Environment

Use the isolated Compose project `module-authoring-test`, not the shared development volumes. Test ports: PostgreSQL 25432, Neo4j HTTP 27474/Bolt 27687, API 28080, web 28088. The official Compose services perform schema migration and initial catalog setup in these new volumes; no existing graph is replaced.

Use `compose.dev.yml` plus `compose.module-management-test.yml`. Build `backend/target/adapt-learn-graph.jar` first; the override mounts this exact host build into API/migration/seed containers and bounds their memory. This avoids repeating a full container Maven build on the small Docker VM. Initial unconstrained Neo4j startup exceeded healthcheck timeouts while Docker was building in parallel; the override is the test-specific recovery configuration, not a product schema change.

Real-stack executable: `frontend/system-tests/REQ-013-module-management.spec.ts`. No HTTP interception. Covers UI content creation/Module creation, shared edits via real API, original creator/subsequent editor history, invalid primary mapping, stale request, Expert approval denial, L&D return/resubmit/approval, two published revisions, preserved learner pin, alternative primary provider, archive/restore, details/history, mobile screenshot and cancel.

Historical execution before shared-login correction (2026-10-28): **2 cases passed, 0 failed**, in 44.7 seconds (22.7s main revision/pin journey + 17.5s UI draft deletion/submission/approval journey). Chrome executable: installed Playwright Chromium 1243, using bundled Node 24.19.0, `SYSTEM_TEST_BASE_URL=http://127.0.0.1:28088` and `playwright.system.config.ts`. Both scenarios perform real API/database operations; neither intercepts HTTP. Screenshot capture explicitly returns to scroll position zero before full-page capture so sticky headers are recorded in the correct position.

Additional verified behavior: cancel/delete of an unreferenced draft, server HTTP 404 after deletion, submission and L&D approval through UI confirmation dialogs, released Module deletion conflict, and HTTP 410 on retired legacy writes. Mobile runs at 390×844, asserts no horizontal overflow, and checks Vietnamese heading/form/cancel behavior. Final screenshots are `frontend/test-results/REQ-013-mobile.png`, `REQ-013-mobile-vi.png`, `REQ-013-desktop-review.png`.

Earlier attempts exposed an implicit select-label accessibility issue (fixed with shared FormField and explicit IDs), a duplicate navigation selector (test now scopes its navigation), and a 5-second assertion expiring while a successful deletion was followed by catalog loading under concurrent container startup (test now waits for DELETE 204 and allows the data reload to finish). Visual review also found the expanded sidebar squeezed mobile content; this workspace now uses the existing sidebar-minimize event below 768px, without changing other pages' desktop preference.

Compose migration V1–V27 completed on the isolated database. The first migration attempt rejected duplicate V27 resources left in a pre-existing build directory (`V27__rq2_research.sql` was absent from source). A clean Maven package removed stale build resources; no historical SQL source/checksum was edited and no shared database volume was reset. These setup failures are distinct from the final successful system run.

## Shared main login

Module routes reuse the main `/login` workspace cookie. There are no module-specific Basic accounts or passwords. The existing local identity mechanism is still limited to `local,local-baseline-demo` with its enable flag and is excluded from prod. Login as Expert using the existing preset (`expert-chen@adaptlearn.internal`), or another supported Expert email (`expert-vance@adaptlearn.internal`); use the existing L&D/Employee presets for review/learning. The shared login establishes the cookie for all four Expert personas as well as existing personas. Identity and organization resolve from active PostgreSQL accounts; roles and grants remain server-side. A full reload keeps the session; main logout clears it. Existing test records attributed to retired Basic accounts remain historical and are not automatically reassigned.

## Manual checklist

Prerequisites: stack healthy, V27 applied, graph has Occupation/MicroSkill records. URL: `http://127.0.0.1:28088` for this isolated test project, or configured development web URL.

| Step | Action | Expected result |
|---|---|---|
| 1 | Use `/login` → L&D Manager preset → Sign in, open `/ld-manager/approvals`, assign the Chen and Vance Expert accounts to the same Occupation. | Active assignments are listed; manager cannot author Modules. |
| 2 | Use `/login` → Expert preset → Sign in, open `/expert/learning-content`, create Markdown with `[video](https://host/lesson.mp4)` in the assigned Occupation. | Content persists across reload/sign-in; preview renders text and video controls, with source-link fallback on failed playback. |
| 3 | Open `/expert/modules`, create a Module selecting content, positive duration/price and exactly one PRIMARY. | Draft persists with system ID; duplicate titles are permitted. |
| 4 | Try zero/two PRIMARY mappings, duplicate skills and nonpositive price/duration. Cancel the form. | Invalid input is rejected; cancellation makes no write. |
| 5 | Sign in through `/login` with `expert-vance@adaptlearn.internal` and edit Module. Open details/history. | Creator remains the Chen account ID; new revision shows the Vance account ID, timestamp and changed fields; previous payload remains inspectable. |
| 6 | Open the same draft in two sessions, save one then the other. | Second save receives conflict, retains its form and offers comparison with latest revision; no silent overwrite. |
| 7 | Submit as Expert; try editing/approving as Expert. Return with feedback as L&D, revise/resubmit, approve. | Submitted payload is locked; approval requires L&D; reviewer/time and full mapping metadata are populated on release. |
| 8 | Use the main Employee login, open `/employee/modules/<id>`, start the approved package. Publish another revision. | Existing learner retains initial revision/content; new unpinned starts use the released revision. These new workflow pins do not certify legacy pathway/assessment integration. |
| 9 | Request archive without another approved PRIMARY provider; then create/approve an alternative and retry archive. | Last required primary provider cannot be removed. With valid alternative, L&D may archive; new starts blocked and existing pins remain readable. |
| 10 | Restore archived Module as assigned Expert, edit and resubmit. | Complete DRAFT is created; it is not released until L&D approves again. |
| 11 | Delete an unreferenced never-released draft; attempt deletion of a released Module. | Only the unused draft can be physically deleted; released Module requires archive. |
| 12 | Revoke an Expert grant, change filters, inspect long titles at desktop/mobile, switch Vietnamese. | Revoked scope is unavailable, counts reflect scope, long content wraps, controls remain usable, labels use the chosen language. |
| 13 | Reload Module page, then use the shared user menu → Log Out and revisit the Module page. | Reload requires no additional login; logout removes API access (401), and the Module page offers the main login without its own credential fields. |

## Limits

No automatic migration of review/legacy Module data, production identity wiring or admission from every legacy reviewed pathway/learning_activity is claimed. Videos must be directly accessible HTTPS files; the limited renderer does not support arbitrary HTML/iframe or general rich Markdown. Publication failures are retried explicitly by L&D; no scheduled outbox dispatcher is installed.

## Shared-login correction verification

Automated browser scenarios now enter through the existing `/login`, then navigate to Module/Content Studio/approval without another credential form. API fixture requests use the same cookie mechanism, with account UUIDs replacing retired Basic usernames. A third scenario checks reload, logout from the shared user menu, missing-session recovery and rejection of retired Basic credentials.

The in-app interactive browser was unavailable during this run (existing tab was gone; creating a verification tab timed out). The structured checklist above remains available for user-run manual verification; automated Playwright and saved screenshots are recorded separately.

First shared-login browser run: 3 timeout failures. The original 5-second UI assertions expired during content save and filtered-list reload; the new login/reload/logout case exceeded Playwright’s default 30-second case limit. Trace showed successful main login (204), Module session (200), organization/skill/list/grant requests (200/204), with later requests interrupted when tests ended. Expectations now allow 20 seconds and the explicit case limits cover the constrained Compose environment; no fixed sleeps or HTTP mocks were added.

Latest full browser rerun: **1 passed / 2 timed out** (10.5 minutes total). The dedicated shared-login scenario passed (~1.1 minutes): main Expert login → Module session returns the expected account UUID → reload retains session → shared user menu Log Out → Module session becomes 401 → return offers main login → retired Basic credentials remain 401. Screenshot: `frontend/test-results/REQ-013-shared-login.png`.

The broad authoring scenario reached main login, content/module creation, shared editor UUID history, stale-write 409, unauthorized Expert approval 403, and return/resubmission; it exceeded its 360-second case limit while waiting for publication approval. The second broad scenario exceeded 120 seconds navigating to `/login` waiting for the page load event. These two journeys are **not certified as passing after this correction**. Local CPU usage was high; no correctness conclusion is inferred from the timeouts. Navigation now waits for DOM content and then observable controls instead of the full load event; those final test-only navigation changes have not been rerun. Backend integration (296.440s) and all 15 backend unit/security/architecture checks passed separately, as did 21 frontend tests.

Screenshot visual inspection: shared Expert shell and Module navigation are visible with no second login form. Catalog loading was still active at capture, so this image is not evidence of completed data loading or field completeness.

## Neo4j catalog list correction — 2026-10-28

Real-stack spec: `frontend/system-tests/REQ-013-neo4j-module-list.spec.ts`, using the existing isolated Compose stack and exact rebuilt host JAR. No HTTP mocks or graph reseed. **1 passed**, 38.1s case / 50.0s total. Covers anonymous 401, Employee 403, shared main Expert login, existing `MOD-DE-J-MODEL-01` with no authoring document, 10-row server pages without duplicate IDs, actual UI page change, name/ID search, skill filtering, read-only details without fake edit history, empty-state recovery, Vietnamese, 390×844 layout without horizontal overflow, and session/language retention on reload.

First attempt reached the final reload assertion but failed because the test init script forced English on every navigation. The fixture now sets English only when no preference exists; rerun passed. No product language change was needed. Screenshot: `frontend/test-results/REQ-013-neo4j-module-list.png`, visually inspected with loaded data and no horizontal overflow.

### Manual checklist and observations

URL: `http://127.0.0.1:28088/expert/modules`. Prerequisites: healthy local Compose API/PostgreSQL/Neo4j, existing ontology catalog, main Expert or L&D login. No Module-specific credentials are needed. An authoring grant is required only for authoring actions, not for browsing shared catalog records.

| Step | Action | Expected / observed |
|---|---|---|
| 1 | Sign in through `/login` as Expert, select Modules. | Verified interactively: no second login; 88 authorized combined rows for this account at inspection, 10 on page 1. Raw graph count was 98; private authoring rows are excluded and authorized unprojected drafts are added. Counts are not a claim that all 98 graph nodes are public. |
| 2 | Search `MOD-DE-J-MODEL-01`. | Verified interactively: one result, `Junior Data modelling and storage - Module 1: Guided implementation`, catalog version 0.9.0. No catalog data was rewritten. |
| 3 | Select View module. | Verified interactively: all Module fields and three skill mappings are visible; content location is `content/modules/MOD-DE-J-MODEL-01.md`, contentVersion 1.2. Missing duration, price, review actor/time and teaching focus/difficulty show Not recorded. No invented creator, revision, approval or edit history; no edit action for this graph-only row. |
| 4 | Close details and switch Vietnamese. | Verified interactively: dialog closes; heading, filters, lifecycle/review badges and paging labels translate. The source title is preserved. |
| 5 | Move to page 2, search/filter a skill, enter a nonexistent ID, clear/change the search. | Automated browser passed: page changes, filters are server-side, empty state and recovery work. |
| 6 | Resize to 390×844 and reload. | Automated browser passed; screenshot inspected: cards/filter controls wrap, no horizontal overflow; language and shared session remain. |
| 7 | Disconnect the API, then restore it and select Reload latest data. | Manual fault-injection not executed. Component/API tests cover error propagation without mock fallback; no passing manual network-recovery claim is made. |

Runtime caveat: the running graph is an older snapshot, not the latest checked-in v0.11 catalog. Existing nodes may lack duration/price/teachingFocus/difficultyLevel. This correction reads and shows that absence honestly; it does not invent values, import the latest catalog, migrate old modules into authoring, or grant catalog-only edit/learner admission.
