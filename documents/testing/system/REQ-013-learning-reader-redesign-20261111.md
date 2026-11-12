# REQ-013 learner content redesign — system evidence, 2026-11-11

Status: UI implemented; full live acceptance **Blocked**. No production-readiness claim. Existing unrelated working-tree edits were preserved. No commit, deployment, schema migration or production runtime mock was introduced.

## Original issues and delivered scope

The original reader featured the module identifier prominently, placed its title only in the syllabus, had no collapsible lesson list or Previous action, used broad nested padding, and began lesson navigation without waiting for pending video saves. Existing content completion, Skill learning eligibility and official achievement are separate concepts.

The new reader provides a real-title PageHeader and requested breadcrumb, content progress/status/remaining estimate, collapsible syllabus with actual types/durations/current/completed states, scoped reading typography for structured HTML/Markdown, and Previous/Next with clear manual completion. Pending progress is flushed before intentional lesson/exit/version navigation. Failed writes are retained for retry before subsequent writes; failures keep the learner in the current lesson. Browser-unload protection applies while writes are pending/unacknowledged; it is not a guarantee against forced closure or device failure.

Reused components: PageHeader, Heading, Button, Badge, Progress, Dialog, Input, WorkspaceLayout, LessonBody, LessonVideo, SkillLearningPanel, SkillAssessmentEntry/assessment history and the current exact-pathway assessment bridge. The shared layout and renderer/player owners were not modified.

Changed/new source:
- `frontend/src/features/employee/modules/LearningModuleReaderPage.tsx`
- `frontend/src/features/employee/modules/LearningReaderHeader.tsx` (new)
- `frontend/src/features/employee/modules/LearningLessonSidebar.tsx` (new)
- `frontend/src/features/employee/modules/learningReader.css` (new, page-scoped)
- `frontend/src/features/employee/modules/LearningModuleReaderPage.test.tsx`
- `frontend/system-tests/REQ-013-learning-reader-redesign.spec.ts` (new)

## Checks and results

| Acceptance | Actual check | Result / limit |
| --- | --- | --- |
| AC01–03: real title, breadcrumb, progress, readable content, syllabus | Isolated Playwright presentation at 1440×1000, 820×1180 and 390×844 | Passed in initial isolated run (3 cases); screenshots visually inspected at desktop/mobile. No horizontal document overflow; table/code scroll locally. |
| AC02–04: navigation/media/completion/reload | Three viewport cases exercise Text completion, 33% content progress, next/previous, server-selected resume using the retained test API state and native playback of a local MP4 | Passed in isolated presentation only; API state is a browser-test double, not PostgreSQL evidence. |
| AC04/06: save errors and empty/loading/retry | Fourth isolated presentation case | Passed; failed writes block navigation; subsequent successful save permits it; empty/read/load error states display explicitly. |
| AC04–05: authenticated live pathway → content completion → refresh → exact Skill Assessment entry → return | Live QA prerequisite preparation through existing APIs | Blocked: `/api/v1/employee/target-role-selection` returned HTTP 503 `DEPENDENCY_UNAVAILABLE`. Earlier attempts also encountered sign-in/CSRF timeouts and `BASELINE_REQUIRED` after catalog context changed. The live browser case is present but not certified. |
| Code/component checks | See linked component evidence | Passed: 8 tests, build, scoped lint and whitespace. |

Initial attempts against the existing web server at localhost:8088 failed/timed out before reader data loaded. Read-only diagnostics observed web CSRF >10 seconds, API CSRF ~2.1 seconds, later password sign-in timeouts and Neo4j/API CPU load. A separate test-only Vite server on 5099 also experienced dependency delays; it was stopped. No application services were restarted or reset. The isolated browser checks used a small static test server for the built frontend on 127.0.0.1:5099, with routes mocked only inside the Playwright presentation tests. This prevents environment failure from being mislabeled as a frontend pass.

Initial isolated run: 4 passed in 2.3 minutes. Final-bundle rerun: **4/4 Passed in 41.5 seconds**, including all three viewport cases and the combined failure/loading/empty/retry case. Final screenshots are retained in [final-bundle assets](assets/learner-reader-redesign-20261111/final-bundle/). Earlier interrupted/failed live-dependent presentation attempts are not included in that pass count.

## Reproduction

Use the existing shared `frontend/playwright.system.config.ts`. Set:

- `SYSTEM_TEST_BASE_URL` to a frontend serving the current build and proxying `/api` to the local API (observed isolated test URL: `http://127.0.0.1:5099`).
- `PLAYWRIGHT_CHROME_PATH` to installed Chrome.
- `LEARNER_READER_FIXTURE_PATH` to the private local QA setup JSON (`/tmp/sep490-baseline-ready/state.json` in this session); this contains credentials and must not be committed.
- `LEARNER_READER_VIDEO_PATH` to a local test MP4. This run used the retained workflow harness `local/test-case/evidence/wf03-wf04-20261106-final/harness/test-video.mp4`.

Run from `frontend`: `./node_modules/.bin/playwright test --config=playwright.system.config.ts REQ-013-learning-reader-redesign.spec.ts --grep 'isolated presentation'`. Presentation tests isolate identity/entitlement/content/progress and preview routes; they are not authorization/security acceptance. Native MP4 playback uses the actual media element. For the live case remove `--grep` or select `--grep 'live QA'` after the QA learner has a current baseline and approved pathway. Never substitute the main Employee account: its progress/assessment history must be preserved.

Screenshots from the initial isolated run are retained in [presentation assets](assets/learner-reader-redesign-20261111/presentation/). No secrets are included in these screenshots.

## Manual acceptance remaining

1. Restore healthy local dependency responses; verify QA login, current catalog/Role–Level, baseline and approved pathway.
2. Open QA pathway and enter its actual released module. Verify title, lesson type/duration and current pinned revision.
3. Read a real Text lesson to its end; mark completed. Switch lessons and refresh. Confirm persisted progress from the API, not just a success message.
4. In a QA module containing a Video, play normally and check saved distinct coverage; completion remains unavailable below 90%. Check media failure and recovery.
5. Complete actual module content. Verify the pathway option receives `completedAt`, while official achievement remains unchanged until assessment conditions are met.
6. Open Skill Assessment from the exact completed module context. Verify assessment history/resume/retake rules and Back to pathway.
7. Confirm content issue reporting and version-switch dialogs still operate on their existing APIs; verify save failure keeps the reader open and exposes retry.
8. Repeat key interactions with keyboard and desktop/tablet/mobile layouts, including collapsed syllabus and local code/table scrolling.

## Data/API limits and later improvements

Only TEXT and VIDEO lessons exist in the current model. No quiz/practice-submission UI, fabricated locks, objective list or short description was added. Duration is derived from actual lesson seconds and saved video intervals, labeled as an estimate; it is not an official deadline or measured reading speed. Content progress remains a lesson-completion ratio, separate from pathway official achievement/mastery. There are no backend contract changes. External YouTube/Vimeo connectivity and end-to-end skill achievement remain unverified here. Broader authentication/Role-selection/catalog-authoring issues from the separate setup task are outside this reader slice.

The feature README is intentionally not marked delivered while the required live integration gate is blocked. Temporary revision-1 brief remains in `/tmp/feature-implementation/learner-content-redesign.md` for resumption.
