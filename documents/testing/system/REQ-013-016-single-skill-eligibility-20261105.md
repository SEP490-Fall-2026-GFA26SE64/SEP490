# Single-Skill learning acceptance — 2026-11-05

Local approved slice: FR-05.05 / legacy REQ-013, REQ-016 and FR-06.08 learning prerequisite. [Technical/API handoff](../../technical/Skill-Learning-Eligibility.md), [unit/component evidence](../unit/REQ-013-016-single-skill-eligibility-20261105.md), [integration evidence](../integration/REQ-013-016-single-skill-eligibility-20261105.md).

## Environment and actual run

Compose project `sep490-skill-learning-acceptance`, file `compose.skill-learning-test.yml`, fresh PostgreSQL 17.6 and Neo4j 5.26 containers. Web http://127.0.0.1:8106; API http://127.0.0.1:28680. Test runtime uses real workspace sessions, CSRF, organization membership, service/repository layers and migrations. Synthetic Modules are authored, submitted and approved through actual services; only the initial learning admission is a fixture. No completion/mastery is preseeded. Product jar excludes test runtimes; `tools/testing/prepare_skill_learning_runtime.py` makes a separate test jar.

Command after CSRF endpoint returned HTTP 200:

```sh
SYSTEM_TEST_BASE_URL=http://127.0.0.1:8106 \
PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
npm --prefix frontend run test:system:f02 -- REQ-013-016-skill-learning.spec.ts
```

**2 passed (30.6 seconds)** against the latest packaged backend and built frontend. [Actual log](assets/single-skill-learning-20261105/logs/playwright-acceptance-ready.log).

| Acceptance | Actual outcome |
| --- | --- |
| SYS-01: one completed Module among three | Passed: initially unmet; real reader completion changes eligibility to true with original Module/revision proof. No Module Exam CTA. |
| SYS-02: optional same-Skill learning | Passed: two alternatives remain available after qualification; admission opens another Module with its own incomplete progress, survives reload, leaves original eligibility intact. |
| SYS-03: trusted access | Passed: foreign organization 404, Expert eligibility 403, wrong-Skill admission 403 and missing CSRF 403. |
| SYS-04: authoring contract | Passed: exactly one Skill selector; no Teaching focus, difficulty or Add skill action. |
| SYS-05: desktop/mobile and EN/VI | Passed: real 1440px English and 375px Vietnamese reader; no horizontal overflow; mobile alternative title uses available row width. Browser page errors and non-aborted failed requests empty. |

Screenshots were inspected: [desktop](assets/single-skill-learning-20261105/desktop.png), [mobile Vietnamese](assets/single-skill-learning-20261105/mobile.png), [single-Skill editor](assets/single-skill-learning-20261105/editor.png). Mobile titles now wrap above status/actions. Earlier layout/editor frames are retained under the same asset directory. A final screenshot-only follow-up explicitly positioned the Skill field inside the editor scroll viewport and passed (1 test, 11.6 seconds); [log](assets/single-skill-learning-20261105/logs/playwright-editor-frame.log).

## Manual checklist

Prerequisites: package backend, build frontend, run the test-jar preparation script, then start only the isolated Compose project. Wait for CSRF HTTP 200. A fresh project is needed to repeat the initial-unmet transition; do not reset any preserved dev database. Existing acceptance data can be inspected after the run.

Synthetic accounts only: `employeea@question-bank.test`, `experta@question-bank.test`, `lda@question-bank.test`, foreign `employeeb@question-bank.test`; fixture password `question-bank-test-password`.

- [x] Employee A opens its assigned fixture Module; prerequisite initially unmet.
- [x] Reach the text end and mark every lesson completed; verify real eligibility response and original proof.
- [x] Open an alternative from the panel; verify independent incomplete progress and reload persistence.
- [x] Switch to Vietnamese and 375px viewport; inspect title/actions and absence of overflow.
- [x] Expert A opens Create module; inspect one Skill selector and absence of retired fields.
- [x] Check foreign tenant, wrong role, wrong Skill and missing CSRF denials.

## Earlier runs and boundaries

Earlier runs exposed a missed header Module Exam CTA, stale strict heading locator and cramped mobile alternative title; these were corrected. One Chrome attempt lacked sandbox permission and did not execute the journey. The first final-stack run began before API startup, so CSRF returned an empty response; both tests failed before login and any learning mutation. After readiness HTTP 200 the full suite passed. [Preserved startup failure](assets/single-skill-learning-20261105/logs/playwright-acceptance.log). Earlier successful journey and visual logs are retained too.

No main-dev/accounts-dev migration or reset, commit, push or deployment occurred. Assessment questions, exam admission beyond this learning prerequisite, scoring and mastery remain separately owned. Dataset has eight documented missing Skill providers; historical multi-Skill completion is not guessed. Existing 0.11 bootstrap byte-pin drift is documented in the integration receipt. Current diagram source/Mermaid are updated; old rendered SVG/PNG are explicitly historical.

## UI order refinement — 2026-11-05

Skill selection now appears after Module metadata and before lesson content in the shared create/revise editor. Frontend build passed. The focused real-session Playwright visual scenario passed (1 test, 20.6 seconds), including a DOM-order assertion that Skill precedes Lesson title. [Run log](assets/single-skill-learning-20261105/logs/skill-ui-order-playwright.log), [editor frame](assets/single-skill-learning-20261105/editor-skill-before-content.png).
