# FR-06.06 / FR-06.09 — R7 Adaptive Pathway source UI

Date:2026-10-29. Destination learning-module-manage; UI reference target-roles-flow. Existing sep490-accounts-dev stack at http://localhost:8088; authenticated Employee, preserved R4 manual assignment. No branch merge, seed, reset, account change or deletion. No new pathway algorithm.

## Actual results

**Passed:** three R6 regression scenarios on R7 application source: actual assignment → module details → timeline → real Text → actual private Video206 byte range/playback → server position → reload/mobile (1.9 minutes); blank/error/recovery (33.6 seconds, explicit intercepted empty/503 responses then real API recovery); mobile canvas pan → real lesson reader (15.8 seconds). Log `/tmp/sep490-R7-system.log`.

**Passed:** new R7 source-style toolbar/dialog/timeline scenario (26.5 seconds;38.3-second invocation). Keyboard Enter opens actual Module details; real duration/progress/lessons; mapped skill card opens actual teaching focus/difficulty; Escape closes; search dims non-matches; timeline links real reader;390px no document overflow; no page errors. Log `/tmp/sep490-R7-system-final.log`.

Initial R7 assertion incorrectly assumed0/1 completed modules. The preserved demo currently has3/3 lessons completed; the assertion was corrected to compute expected completion from the actual authorized API snapshot. No progress was reset or fabricated. The first invocation therefore records3 passed/1 failed; the focused corrected R7 run passes. Application source did not change between those runs.

Run with project Node/installed Chrome: `SYSTEM_TEST_BASE_URL=http://localhost:8088 PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node frontend/node_modules/@playwright/test/cli.js test --config=frontend/playwright.system.config.ts REQ-013-learning-content.spec.ts --grep 'R6 |R7 '`. Focused correction uses `--grep 'R7 '`.

## Visual evidence and scope

Inspected [roadmap](artifacts/REQ-013-learning-content-R7/roadmap.png), [Module details](artifacts/REQ-013-learning-content-R7/module-details.png), [skill details](artifacts/REQ-013-learning-content-R7/skill-details.png), [timeline](artifacts/REQ-013-learning-content-R7/timeline.png), [mobile timeline](artifacts/REQ-013-learning-content-R7/timeline-mobile.png). R6 regression also captures actual reader/video/mobile images in its dedicated artifacts directory. Source comparison uses the unchanged original component bodies from target-roles-flow: action bar placement, original CSS root/node/spine/skill flanks, modal hero/two-column information cards and continuous timeline track/pins/cards. Data-dependent UI is intentionally adapted: actual pathway selector replaces unpersisted Role/Skill selection; lesson completion replaces invented mastery; no demo unlock, simulated recommendation, certified checkpoint or inferred locked gate.

The existing manager compact preview remains its prior behavior, outside this Employee slice. Native/provider Video and lesson-reader implementation are unchanged. Generated pathways and final exam admission remain outside scope; content completion is not exam/mastery evidence. Actual data/progress tests use real services, while empty/error states are explicit isolated response fixtures.

## Manual checklist

Prerequisite: sign in as existing employee@example.test using the private local account sheet; retained R4 assignment and approved content. No credentials are published here.

| URL | Steps | Expected |
| --- | --- | --- |
| http://localhost:8088/employee/pathway | Select R4 - Learning content practice. | Source-style actions and bordered search toolbar; original orange Module node, spine and skill flanks use actual data. |
| Same | Focus Module node and press Enter. | Details show actual duration, content progress, mapped skill cards and numbered lessons. |
| Same | Click skill card; press Escape. | Actual teaching focus/difficulty, no invented mastery/certification; dialog closes. |
| Same | Search a nonmatching skill, then clear. | Nonmatching node dims; clear restores it. |
| Same | Switch Adaptive timeline. | Original continuous track/card layout, actual content status and module reader link. |
| Same at390px | Pan roadmap within canvas; switch timeline. | Page stays within viewport; text/IDs wrap; timeline remains usable. |
| Module reader link | Open Text/Video, play/pause, reload. | Real content and active lesson/position persist. Existing90% distinct coverage plus explicit completion rule retained. |
| Employee with no assignments | Open either pathway mode. | Blank successful body; separate loading/error/retry, no sample pathway. |

[Unit/build evidence](../unit/REQ-013-learning-content-R7.md) and [integration applicability](../integration/REQ-013-learning-content-R7.md). Local verification only; no production/provider acceptance claim.

### Isolated original-component visual reference

The original InteractiveRoleRoadmap body was also rendered independently in a disposable Playwright browser with its existing prototype data, using the unchanged source component fallback (no assigned prop). [Reference screenshot](artifacts/REQ-013-learning-content-R7/source-roadmap-prototype-reference.png) was inspected beside the real-data roadmap: toolbar/card surface, root, orange module boxes and skill flanks align; fake score/mastery/code/status fields intentionally differ. This is explicitly a **prototype visual reference**, not real-data verification. The separate reference harness initially needed the Vite ReactDOM default export and later timed out looking for timeline h2 because the unconfigured prototype timeline displayed its empty state; neither attempt is counted as a system pass. Source timeline layout comparison therefore uses its retained markup, while the actual assigned timeline has desktop/mobile screenshots and passing browser assertions. Log: `/tmp/sep490-R7-reference.log`.
