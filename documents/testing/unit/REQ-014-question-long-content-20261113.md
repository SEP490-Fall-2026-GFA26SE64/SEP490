# REQ-014 question long-content layout — unit evidence, 2026-11-13

Passed 34 component checks: existing QuestionBankWorkspace.test.tsx 30/30 and new QuestionDraftForm.test.tsx 4/4. Both used `npm --prefix frontend test -- <file> --testTimeout=15000`.

New cases exercise exact multiline prompt/answer/explanation values, nullable correct answer, explicit selection/clearing, existing missing-prompt feedback and complete long content in default/details previews. Existing workspace save/error/review/permissions behavior is preserved. Geometry, growth and scrolling are verified in Chrome rather than inferred from JSDOM.

Full production TypeScript/Vite build passed; existing large-bundle advisory remains. Scoped oxlint passed without warnings/errors on affected components/tests and new browser spec. `git diff --check` passed. No backend/schema/API/dependency changes or backend checks claimed for this UI-only slice.
