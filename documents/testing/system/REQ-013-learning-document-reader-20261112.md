# REQ-013 document-oriented reading experience — 2026-11-12

Status: implementation and focused local checks delivered; running API language-metadata rollout remains pending. The normal backend test-compilation gate also has unrelated failures. No production or full learner-to-mastery acceptance is claimed.

## Delivered behavior

The prior central reading area was wrapped in a large rounded white card, with limited heading hierarchy, undifferentiated quotations and plain code blocks. The updated Employee reading area uses a flat document surface with responsive margins and a bounded reading width. It retains module information, top navigation, sidebar, previous/next selection, progress, completion eligibility, skill status, assessment handoff and Back to Pathway.

The lesson has its own article/title; authored headings, paragraphs, lists, emphasis, inline code, tables, dividers and private images retain structure. Explicit CommonMark quote markers `[!NOTE]`, `[!IMPORTANT]`, `[!WARNING]` and `[!TIP]` create labeled information/important/warning/best-practice callouts. Ordinary quotations remain quotations; no learning text or callout meaning is invented from arbitrary paragraphs.

Code blocks have a dark token-based surface, keyboard-scrollable long lines, declared language, syntax tokens, and Copy with success/error feedback. A copied confirmation belongs to the exact code text. Unknown/unlabelled blocks and blocks over 100,000 characters remain readable escaped plain code. Supported language grammars are JavaScript, TypeScript, Java, Python, SQL, Shell, JSON, HTML/XML, CSS and a small Cypher grammar; aliases map to these explicitly, without guessing.

## Rendering / reuse / files

Markdown still uses the authenticated `/api/v1/module-management/text/preview` CommonMark + GFM table renderer; HTML still uses server sanitization. There is no new frontend Markdown parser or manual Markdown rendering. The document enhancement parses the already-sanitized HTML into a restricted React element tree, creates code/callout components and filters attributes/resource URLs defensively. The standard LessonBody presentation remains the default for author/reviewer callers.

Changed in this revision:

- `frontend/src/features/employee/modules/LearningModuleReaderPage.tsx`: flat reading article, lesson H1, opt-in document body.
- `frontend/src/features/employee/modules/learningReader.css`: scoped document typography, tables, callouts and dark code tokens.
- `frontend/src/shared/components/learning/LessonBody.tsx`: backward-compatible `presentation="document"` option.
- `frontend/src/shared/components/learning/LessonDocument.tsx` (new): structured server-HTML enhancement.
- `frontend/src/shared/components/learning/LessonCodeBlock.tsx` (new): selected syntax grammars, Copy and feedback.
- `frontend/src/shared/components/learning/LessonDocument.test.tsx` (new).
- `frontend/package.json`, `frontend/package-lock.json`: **highlight.js 11.12.0**, the sole added dependency.
- `backend/src/main/java/com/adaptlearngraph/repository/PrivateLearningAssets.java`: retain only restricted code-language metadata through the existing sanitizer; no API/schema change.
- `backend/src/test/java/com/adaptlearngraph/repository/PrivateLearningAssetsTest.java`: metadata and sanitizer checks.
- `frontend/system-tests/REQ-013-learning-document-reader.spec.ts` (new).

Existing Heading/Button/icons and the prior lesson/video/progress/assessment owners are reused. Prior task changes to LearningReaderHeader/LearningLessonSidebar and unrelated user modifications were preserved. No commits, pushes, database writes/resets or API deployment were performed.

## Actual verification

| Check | Result |
| --- | --- |
| Frontend focused components | **15/15 Passed**, see [unit evidence](../unit/REQ-013-learning-document-reader-20261112.md). |
| Frontend build / scoped lint / whitespace | **Passed**. |
| Focused sanitizer backend class | **5/5 Passed** using isolated compilation and explicit Mockito startup agent. Standard Maven test compilation remains blocked separately. |
| Initial Playwright rich reading at 1440×1000, 820×1180, 390×844; short/long/plain Markdown contracts | **6/6 Passed in 55.6s** with isolated browser API fixtures. **Final build repeat: 6/6 Passed in 22.9s**. [Final screenshots](assets/learning-document-reader-20261112/final/) are retained separately. |
| Authenticated live preview through QA account | **Passed** for headings/tables/code rendering with the existing real API. The running API still omits `language-javascript`; `languageMetadata=false` was observed. |
| Running web dependency | highlight.js synchronized into the existing web node_modules; only the local web process was restarted to clear its negative import cache. Actual reader module returned **HTTP 200** afterwards. API/database were not restarted. |

Playwright tests verify lesson H1/section hierarchy, callout types, table rendering, actual clipboard round-trip, syntax tokens and horizontal containment. They also check retained syllabus collapse, lesson completion/next/previous and reload/resume through a browser-test progress store. These fixtures are not proof of real PostgreSQL persistence or current mastery/assessment execution. Backend rendering/sanitization is tested independently by the Java suite, and the real preview contract was checked separately.

Browser-test server: a temporary static build server at `http://127.0.0.1:5100`, with routes mocked only by Playwright. No fixture data or mock API was added to the application. Initial screenshots are retained in [initial assets](assets/learning-document-reader-20261112/initial/). The test server is stopped after verification.

Reproduce from `frontend`:

`SYSTEM_TEST_BASE_URL=http://127.0.0.1:5100 PLAYWRIGHT_CHROME_PATH='<installed Chrome>' ./node_modules/.bin/playwright test --config=playwright.system.config.ts REQ-013-learning-document-reader.spec.ts`

## Remaining limits / runtime update

The running backend was not rebuilt/redeployed. Its older sanitizer strips fenced-code language classes. Dark code containers and Copy still work; declared-language labels and highlighting require the included backend sanitizer update to be applied to that runtime. This is not hidden behind fabricated language detection. Plain/unknown code remains readable. New code-language classes are validated by the focused Java tests, but applying the API artifact/restart is outside this approved source-only delivery.

Private authorized images and safe resource links retain existing policies. Arbitrary remote images, iframe embeds and new lesson content types are not introduced. Existing VIDEO lessons keep their separate authorized player. No automatic section summaries or authored content were invented. The overall bundle-size advisory and unrelated backend test compilation failures remain outside this slice.

The feature README is not marked as fully runtime-delivered while the above rollout/normal-test-gate limits remain. The temporary task brief is retained at `/tmp/feature-implementation/learner-document-reader.md` for follow-up.

## Manual check after applying the backend update

1. Open an authorized Employee module from its approved pathway; refresh the web page.
2. Use a Markdown lesson containing a fenced language (for example `javascript` or `cypher`), headings, nested lists, table, quote markers and an authorized private image.
3. Confirm the document surface, language label, syntax colors, Copy bytes and keyboard horizontal scrolling.
4. Try a plain paragraph and an unknown fenced language: readable content remains, without guessed language semantics.
5. Read to the end, complete normally, move next/previous, refresh and return to pathway. Verify persisted API progress and unchanged assessment prerequisites.
6. Repeat at desktop/tablet/mobile; check error/loading and clipboard-denied feedback. Preserve real user progress; use QA fixtures for completion/assessment mutations.
