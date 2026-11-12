# REQ-013 wide module authoring — browser evidence, 2026-11-13

## Delivered behavior

Expert create/revise retains the existing route, authentication, dialog, form and save/review APIs in a wide authoring surface. Module details and Learning content are separate tabs. Fields remain mounted through opt-in `TabsContent forceMount`; native validation switches to the tab containing an invalid required field and focuses it. Other TabsContent callers keep their default unmount behavior.

LearningLessonsEditor has a collapsible 210px lesson navigation on wide containers, stacked/collapsible navigation on narrow containers, and one selected lesson editor. Selection uses stable IDs, so reorder retains identity; add selects the new lesson; removing a selected lesson safely falls back to an available lesson. Current draft values remain parent-owned. Existing Text/Video inputs, uploads, duration rules and external video verification remain available.

The main area switches Edit content / View as learner, with the same selected lesson and no duplicated inline syllabus/third column. Full preview reuses the shared read-only LearningPreviewReader with navigation and mobile sizing. It has no learner-progress callbacks. RichLessonEditor retains Tiptap, adds a semantic paragraph/heading selector, and applies shared reading typography/table/image styles. H1 authored content is styled like its reader H2 projection; H1/H2 render at 22px on desktop/laptop and 18px under the existing 639px reader breakpoint. This is shared responsive typography, not a scaled-down desktop view.

An external-content synchronization effect checks editor lifecycle/schema before accessing HTML. This fixes a real browser crash on a disposed Tiptap instance found during verification. The effect emits no artificial content update. The final laptop image was visually inspected; contrast, metadata alignment and long-title wrapping were refined. Save draft remains content-save then module-save, with the existing later Submit for review action. No direct publish, new autosave/dirty-state promise or mock diagram was added.

## Executed checks

Final browser result: 13/13 passed in 41.0 seconds on a built SPA at local port 5100 with isolated authenticated APIs and image fixtures. New authoring cases at 1440, 1280 and 390 px verify: one editor, actual Tiptap heading styles and parity with learner preview, metadata validation/focus across tabs, unsaved body retention, add/reorder/select, inline/full preview, sidebar collapse, no overflow, wide surface and exact saved draft payload/order/content. Four shared Expert/L&D preview cases and six Employee reader regressions also passed, including uploaded private image load, exact requested versus released revision, video/document controls, selection/refresh and no learner writes in preview. No page errors in final authoring/shared-preview cases.

Command (frontend): `SYSTEM_TEST_BASE_URL=http://127.0.0.1:5100 PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ./node_modules/.bin/playwright test --config=playwright.system.config.ts --output=/tmp/module-authoring-wide-browser-final-ui REQ-013-shared-learner-preview.spec.ts REQ-013-learning-document-reader.spec.ts`.

Initial browser run exposed a disposed-editor schema access crash; the run was interrupted after evidence capture and the lifecycle guard was fixed. The next run passed 12/13; its mobile assertion incorrectly expected the desktop 22px heading despite the shared reader's existing 18px mobile rule. Assertions now verify the correct shared responsive sizes. The final suite covers both H1/H2 authoring selections. Earlier outputs remain `/tmp/module-authoring-wide-browser`, `...-final` and `...-verified`; they are not reported as final passes. See matching unit evidence for 36 passing tests and build/lint results.

## Files and limits

Modified ModuleManagementWorkspace, shared LearningLessonsEditor, RichLessonEditor, LearningContentPreview (exported controlled read-only reader), Tabs (opt-in forceMount), associated tests and shared-preview browser spec; new learningAuthoring.css and LearningLessonsEditor.test.tsx. No route/schema/API/role/assignment/submission-policy changes, no migrations or deployment.

Screenshot `/tmp/module-authoring-laptop.png` is outside the repository and was visually inspected. No untracked images remain in Git status. Save requests and auth/image responses were fixture-backed: this verifies UI behavior and request contents, not actual backend persistence, real-tenant asset authorization or production rollout. The prior broader real-runtime learning-workspace upgrade remains a separate pending slice.

Manual runtime follow-up: create a draft with eligible Skill/knowledge, add reading/video and an authorized image, switch lessons/tabs and full preview, reorder, save/reopen and verify the same content/order. Submit using the existing module action and inspect the exact revision as L&D; an Employee viewing that same released version should retain the same rendering under existing version-pin rules.

## UI merge verification into main — 2026-11-13

User requested prioritizing Module/Question Bank UI from module-learning-manage-v2. Resolved17 files/82 original blocks: retained main exactly for9 unrelated department/user/profile/role/ontology/mock/store files; selected new UI in5 reader/module/question-bank files and aligned3 domain READMEs. The final8 UI/docs outputs match the incoming snapshots; the unrelated9 match HEAD. Original three-way index blobs were used to reconstruct complete files after interim resolution attempts exposed marker/syntax errors. No backend/API/schema change was made while resolving. Existing non-conflicting staged files were preserved.

Frontend full TypeScript/Vite build passed. Scoped unit/component suite:109/109 across18 files,99.89s. Fixture-backed Chrome:16/16 in about1 minute across current shared learner preview/module authoring, Employee document reader and Question Bank long-content specs; 1440/1280/1024/820/390px as applicable. Output `/tmp/sep490-ui-merge-browser-20261113`; no real application writes or live backend acceptance claimed. Scoped lint returned no errors, retaining5 pre-existing warnings. Working-tree conflict-path whitespace check passed; the wider pre-existing staged set still reports23 whitespace/EOF warnings in reports/log artifacts, left unchanged. No commit/push/deployment performed.
