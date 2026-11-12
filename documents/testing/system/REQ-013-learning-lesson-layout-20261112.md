# REQ-013 dedicated lesson layout — browser verification, 2026-11-12

Passed: 6 Playwright scenarios, 43.2 seconds, Chrome. Isolated authenticated API fixtures; these results do not certify live persistence, backend authorization or end-to-end mastery.

Command (frontend): `SYSTEM_TEST_BASE_URL=http://127.0.0.1:5100 PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ./node_modules/.bin/playwright test --config=playwright.system.config.ts REQ-013-learning-document-reader.spec.ts`.

At 1440, 820 and 390 px: direct lesson URL renders shared navbar, progress header, syllabus and document. Global sidebar and its toggle have no DOM nodes. Main starts at x=0 and occupies the viewport width; no document overflow. Syllabus hide/show works. Completion, next/previous, reload-resume and Back to Pathway work with fixture progress. Returning to Pathway restores global sidebar and toggle. No page errors. Short/long Markdown and plain content remain readable.

Dedicated `LearnerLessonLayout` composes `WorkspaceLayout variant="lesson"`. Only LearningModuleReaderPage selects it; App routes, workspace/auth boundaries and API contracts are unchanged. Default workspace layout retains global navigation. Lesson mode structurally omits global navigation and reuses existing full-width main/body styles, without hiding it via CSS or compensating margins. Existing module syllabus remains the responsive collapsible learning navigation. No new dependencies.

Screenshots (syllabus collapsed after verifying hide/show): [desktop](assets/learning-lesson-layout-20261112/document-1440.png), [tablet](assets/learning-lesson-layout-20261112/document-820.png), [mobile](assets/learning-lesson-layout-20261112/document-390.png). Mobile screenshot visually inspected for navbar wrapping, document readability and contained code/table overflow. Prior document-reader evidence remains historical and unchanged.
