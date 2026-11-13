# REQ-014 question long-content layout — browser evidence, 2026-11-13

## Delivered behavior

QuestionDraftForm uses a question-scoped QuestionTextArea for prompt, options A-D and explanation. Fields auto-fit current values and width up to a CSS height cap, then scroll vertically. Horizontal resizing is disabled; long unbroken words wrap inside the field. Caps are 14rem for prompt, 12rem for explanation and 8rem for options. Controls retain native labels/IDs, disabled/error states and raw strings/newlines; these are visual size limits, not content-length limits.

The default QuestionContentPreview lays out each answer as fixed label / flexible text / correct icon, aligned at the top. Labels use the fixed 1.75rem project spacing size and do not stretch with text. Details preview also retains fixed-size labels and anywhere wrapping. Prompt/option/explanation text is complete and wraps without ellipsis. Draft preview has a bounded keyboard-focusable vertical scroller. Existing dialog header/footer and 65/35 desktop layout, mobile accordion, Skill/knowledge/mandatory fields, save eligibility and correct-answer rules are retained.

## Executed verification

Final browser result: 3/3 passed in 17.2 seconds at 1440, 1024 and 390 px, Chrome against a built SPA on local port 5100 with isolated authenticated question API fixtures.

Command (frontend): `SYSTEM_TEST_BASE_URL=http://127.0.0.1:5100 PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ./node_modules/.bin/playwright test --config=playwright.system.config.ts --output=/tmp/question-long-content-browser-check REQ-014-question-long-content.spec.ts`.

Checks cover growth from a short question, capped heights, genuine vertical scrolling and no horizontal overflow in prompt/A/explanation, multiline and unbroken input, continued typing at the end of long input, square fixed label size and top alignment against a much taller answer, complete preview text, keyboard End/Home scrolling, mobile preview accordion, dialog/footer reachability, and the exact saved content/newlines with correctAnswer 0 and permitted null knowledgeLevel. No page errors. See matching unit evidence for 34 passing checks and build/lint.

An initial run failed all three geometry assertions because it assumed literal 28px despite the project's 15.5px root rem scale: 1.75rem is 27.125px in that runtime. Assertions now measure the existing project scale and verify a square, fixed non-stretching badge; no application workaround or larger timeout was used. Initial outputs are retained in `/tmp/question-long-content-browser`; final outputs in `/tmp/question-long-content-browser-check`.

## Files and boundaries

New `shared/components/question-bank/QuestionTextArea.tsx`, QuestionDraftForm.test.tsx and `system-tests/REQ-014-question-long-content.spec.ts`; modified QuestionDraftForm and QuestionContentPreview. No API/schema/permission/review-policy change, rich-text format, string trimming, automatic answer selection or real question creation. Preview/default details still use React text rendering and preserve valid empty/null drafts.

Screenshot `/tmp/question-long-content-1440.png` was visually inspected for bounded focused question input, a fixed top-aligned A label beside very long content, wrapped tokens and visible footer. Images/traces are outside the repository; zero untracked images verified. These browser save requests use fixtures and establish UI/request-value correctness, not live backend persistence or cross-tenant authorization. No service restart/deployment/commit was performed.

Manual runtime follow-up: create/edit an authorized draft; enter long spaced/unbroken prompt/options/explanation, select and clear a correct answer, resize the browser, scroll preview/fields and save/reopen. Confirm stored strings/newlines, permitted incomplete draft states and existing review/submission rules in the target environment.

## Follow-up: focused field left clearance

User requested a small right shift after observing a clipped left focus border. Draft grid now has px-1.5 inner horizontal spacing (about 6px), preserving full-width constraints and consistent label/field alignment. A browser assertion verifies at least 4px clearance from the clipping scroll container. The existing three responsive long-content cases passed again in 25.3s, output `/tmp/question-focus-clearance-browser`; updated desktop screenshot visually inspected. Vite build, scoped lint and whitespace checks passed. This follow-up changes spacing only; no data/backend checks repeated or newly claimed.

## UI merge verification into main — 2026-11-13

User requested prioritizing Module/Question Bank UI from module-learning-manage-v2. Resolved17 files/82 original blocks: retained main exactly for9 unrelated department/user/profile/role/ontology/mock/store files; selected new UI in5 reader/module/question-bank files and aligned3 domain READMEs. The final8 UI/docs outputs match the incoming snapshots; the unrelated9 match HEAD. Original three-way index blobs were used to reconstruct complete files after interim resolution attempts exposed marker/syntax errors. No backend/API/schema change was made while resolving. Existing non-conflicting staged files were preserved.

Frontend full TypeScript/Vite build passed. Scoped unit/component suite:109/109 across18 files,99.89s. Fixture-backed Chrome:16/16 in about1 minute across current shared learner preview/module authoring, Employee document reader and Question Bank long-content specs; 1440/1280/1024/820/390px as applicable. Output `/tmp/sep490-ui-merge-browser-20261113`; no real application writes or live backend acceptance claimed. Scoped lint returned no errors, retaining5 pre-existing warnings. Working-tree conflict-path whitespace check passed; the wider pre-existing staged set still reports23 whitespace/EOF warnings in reports/log artifacts, left unchanged. No commit/push/deployment performed.
