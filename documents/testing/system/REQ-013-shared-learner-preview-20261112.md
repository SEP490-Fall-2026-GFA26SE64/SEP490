# REQ-013 shared learner preview — system evidence, 2026-11-12

## Delivered UI behavior

Expert's existing lesson editor now has Edit content and View as learner tabs. The preview receives current unsaved lesson values; returning to edit retains them. L&D's existing review panel adds View as learner for `approvalRequest(doc).revision`, explicitly labeled with the requested revision/state. Existing published/history comparison remains independently selected; review decisions remain in the parent review footer.

Shared `LearningContentPreview` composes the same `LessonBody presentation="document"` and `LessonVideo appearance="lesson"` used by Employee. It supports local syllabus/previous/next selection, desktop/mobile width and a full preview dialog that preserves current selection/width. There are no learner begin/progress/completion/mastery callbacks. Existing per-lesson/details previews also use document rendering. The reader stylesheet moved from Employee modules to `shared/styles/learningReader.css`, with the Employee import updated, preventing three separate style implementations. Preview layout uses container width for sidebar and table-of-contents responsiveness.

Text format/body, image source/alt, video source/asset/URL and duration are passed through existing lesson projections; legitimate null/empty draft values remain explicit. No server-managed field became editable. Images use the same private `/api/v1/module-management/assets/{id}` URLs. Source inspection confirms the existing asset service scopes lookup by actor organization and excludes certificate evidence before existing Expert/manager access; this task does not broaden permissions or certify live tenant authorization. Preview shares server sanitization and depends on the running server's language-metadata support just as Employee does.

## Executed verification

Final Playwright run: 10/10 passed in 18.5 seconds, built SPA on local port 5100, isolated authenticated API/image fixtures. New 4 scenarios exercise actual Expert editing with private image upload/render, unsaved draft retention, mobile/full preview and no learning writes; L&D exact requested revision 2 versus released revision 1, actual image load, code rendering, local lesson navigation, full preview and retained decision buttons at 1440 and 390 px. Six Employee regression scenarios additionally cover 1440/820/390 px, content rendering and learning flow. No page errors in new scenarios. A tiny inline PNG is a test resource only; no production image fixtures were introduced.

Command (frontend): `SYSTEM_TEST_BASE_URL=http://127.0.0.1:5100 PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ./node_modules/.bin/playwright test --config=playwright.system.config.ts --output=/tmp/shared-learner-preview-browser-verified REQ-013-shared-learner-preview.spec.ts REQ-013-learning-document-reader.spec.ts`.

Initial browser runs had two L&D failures from incomplete test relationship metadata, then two from a test selector expecting version text in the dialog accessible name instead of its heading. Test data/selector were corrected; no application workaround or increased timeout was used. Prior outputs retained in `/tmp/shared-learner-preview-browser` and `/tmp/shared-learner-preview-browser-final`; verified outputs in `/tmp/shared-learner-preview-browser-verified`. Desktop/mobile preview images visually inspected at `/tmp/expert-learner-preview.png` and `/tmp/ld-learner-preview-mobile.png`. All images are outside the repository; zero untracked images verified. See matching unit evidence for 33 passing tests/build/lint.

## Files / boundaries

New `shared/components/learning/LearningContentPreview.tsx` and focused tests, new `system-tests/REQ-013-shared-learner-preview.spec.ts`; modified LearningLessonsEditor, LearningLessonList, ModuleApprovalReview and Employee stylesheet import; moved styles to shared. No routes, API endpoints, migration, role permissions, review/approval action policy or employee pinned-version rules changed. A draft/requested preview describes that snapshot, not an automatic update of a learner already pinned to an older release.

This is local source/build/browser rendering acceptance with fixtures, not real backend image authorization, persistence or full employee-to-mastery acceptance. No application deployment/service restart performed. Split editor, new image-position authoring controls and the broader Reading/Video runtime-upgrade acceptance are outside this bounded task.

## Manual runtime follow-up

1. As an authorized Expert, edit a draft, upload an image, then open View as learner before saving. Verify the current content/image and desktop/mobile/full preview, and retain the edits on returning.
2. Save and submit that revision. As L&D, open the request and its View as learner tab; confirm revision/state, image/video and body match the submitted snapshot. Released comparison must remain the prior release.
3. Use normal review actions only if intended. An eligible Employee viewing that same released version should see the same content/assets; existing pinned-version switching rules still apply.
4. Confirm a preview alone creates no learner pin/progress/completion, and verify unauthorized/cross-organization asset requests remain denied in the target runtime.
