# Main integration — browser evidence and manual checks

Date:2026-10-29. Existing sep490-accounts-dev (PostgreSQL17.6, Neo4j5.26, private assets/MinIO and Mailpit), Vite http://localhost:8088. The private account sheet and preserved Employee assignment are reused. No reset, catalog import, new assignment or password change.

## Executed result

**5 passed,1.5 minutes**, on the clean-built integrated API with canonical Flyway41:

1. Actual Employee manual pathway → original roadmap/details/timeline → actual ordered Text/private MP4 →206 byte range → real media time → persisted server position/reload →390px reader and canvas.
2. Authenticated empty/503 response fixtures leave the success body blank and retry back to actual assignments; no records deleted.
3. Mobile original canvas pan opens actual lesson reader without document overflow.
4. Source-style toolbar/details/teaching metadata/search/timeline plus keyboard Enter/Escape and mobile.
5. Canonical initial pathway endpoint returns actual empty state; existing manual assignments remain reachable. Explicit approved generated-view **UI response fixture** then renders main's generated pathway component and opens the real assigned Module reader, whose Back link returns to the initial route. That fixture is not an actual generated/persisted request and does not claim algorithm completion or a generated-only authorization grant. Actual planning/approval/storage/gate policies are verified separately by the144 backend checks and migration/content checks.

Command: `SYSTEM_TEST_BASE_URL=http://localhost:8088 PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node frontend/node_modules/@playwright/test/cli.js test --config=frontend/playwright.system.config.ts REQ-013-learning-content.spec.ts --grep 'R6 |R7 |merge main'`. Log `/tmp/sep490-merge-system.log`. No browser page errors. Existing real Module MOD-e52f4286-6713-4426-b98d-24b02584bcc8 and its progress remain; tests update only actual playback/resume position, not fabricated completion.

The API's initial restart refused duplicate8 from stale deleted target resources before any migration. `mvn clean package` with seven relevant tests passed; subsequent startup validated41 scripts and applied only39–41 to retained database38. Existing data was backed up to the ignored private local/dev-accounts/merge-backup folder. Post-upgrade counts10 manual pathways/14 lesson-progress rows. No checksum repair or wipe. Logs `/tmp/sep490-merge-clean-package.log`; clean API started successfully. Initial pathway worker is enabled with explicit bounded-search settings; actual generation still requires the owner's valid role/level baseline/catalog/assignment/readiness inputs. Existing manual assignments are not converted into generated requests.

## Manual checklist

Prerequisite: localhost8088/API28180 running; sign in as employee@example.test with the private existing password. For Expert review use the existing Expert account. The retained R4 assignment is a manual-content demonstration, not an algorithm-produced plan.

| URL | Steps | Expected |
| --- | --- | --- |
| http://localhost:8088/employee/pathway | Open with no initial request. | Blank initial pathway body; existing manual assignments show an Assigned modules link; no sample generated route. |
| http://localhost:8088/employee/pathway?view=assigned | Select R4 - Learning content practice; inspect module/skill and switch timeline. | Actual lessons/progress and mapped teaching metadata; original layouts retained. |
| Same, open module lessons | Read Text; play/pause Video; reload; Back to Pathway. | Real content, actual position persists, return to assigned mode;90% distinct coverage plus explicit completion still required. |
| /employee/upskilling?tab=roles | Select role AND level; use gap/initial request flow where baseline/resources are valid. | main's server-owned request and generation/review states; missing configured resources are unavailable, never demo-unlocked. No new persisted request was created by this merge's browser verification. |
| /expert/pathway-review | Open an actually assigned generated request, check/adjust and approve. | main's exact revision/approval and prerequisite rules remain. A manual R4 assignment is not inserted into this queue. |
| /employee/pathway with real approved generated request | Open an available module. | Exact current approval and actual matching stored content are required; unsupported internal gates or absent content remain unavailable. |
| /ld-manager/modules | Inspect existing Module details/history/review. | Existing authoring/ownership/content workflow retained; no automatic approval or owner rewrite. |
| Pathway pages at390px | Switch modes, pan canvas, open/close details. | No document overflow; canvas scroll is independent. |

[Backend/frontend](../unit/REQ-013-main-pathway-integration.md), [migration/persistence](../integration/REQ-013-main-pathway-integration.md). Local scoped evidence; no production certification or complete assessment-driven re-adaptation claim.

### Final visual follow-up

The generated-view UI fixture was rerun with an explicit390px width assertion and desktop/mobile screenshots:1 passed,13.8 seconds (19.4-second invocation), `/tmp/sep490-merge-system-mobile.log`. Inspected [generated desktop fixture](artifacts/REQ-013-main-integration/generated-ui-fixture.png), [generated mobile fixture](artifacts/REQ-013-main-integration/generated-ui-fixture-mobile.png) and [actual reader frame](artifacts/REQ-013-main-integration/real-reader.png). The reader frame capture precedes video metadata; actual media readiness/playback/resume are independently asserted in the first real-stack flow and shown in [actual Video](artifacts/REQ-013-learning-content-R6/REQ-013-R6-video.png). Source/fixture labels are intentionally explicit; no generated request was inserted into the preserved Employee database.
