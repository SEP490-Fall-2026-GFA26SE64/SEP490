# REQ-013 — Reading preview visual polish — 2026-11-13

## Scope and outcome

Approved mockup applied to shared staff learner preview: compact status/device/fullscreen toolbar; syllabus heading/count; fixed cards with number, type, duration, internal information action and selected marker. Import Review separates viewer context from module title. Shared document spacing and selected contents navigation use design tokens. Employee document rendering shares the document styles/navigation, without staff-only preview controls.

Existing HTML/Markdown and private-asset APIs remain owners of lesson content. Imported headings remain verbatim; no automatic title deletion, fabricated introductory text or callouts. Existing lesson selection, full title disclosure, Text/Video/fullscreen/mobile and no-progress-write behavior preserved.

## Verification

- Production build passed; existing large-chunk advisory remains.
- Scoped oxlint: no errors/warnings for LearningContentPreview, LessonDocument, LearningImportPanel.
- Component suites LessonDocument, LearningContentPreview and LearningImportPanel: **18 passed**, 3 files. Selected contents-link state/focus covered.
- Full shared-learner-preview Playwright spec: **16 passed**, 1.2m, built frontend at `http://127.0.0.1:5100`, Chrome, isolated API fixtures. Covers Expert current draft, L&D exact requested revision, Expert/L&D released snapshot, authoring at 1440/1280/390, import Review and saved-result preview, private video metadata/playback, fixed very-long titles, no preview learner writes and directory subtitle omission.
- Initial run stopped on an obsolete expectation that Expert Workflow displayed the creator name; updated to the already-approved omission. Final entire spec passed.
- Scoped diff whitespace check passed.
- Inspected desktop/mobile screenshots: `/tmp/sep490-polished-preview-1440.png`, `/tmp/sep490-polished-preview-390.png`. No horizontal overflow; information action stays inside its lesson card. Browser output: `/tmp/sep490-polished-preview-browser-final`.

## Manual review

1. At the local workspace Expert Modules page, import a valid Text/Video batch and choose View as learner at Review.
2. Verify compact toolbar and sidebar count/type/duration. Switch lesson and Desktop/Mobile, open full preview, then return to Review.
3. Use a long lesson title: card size stays fixed; keyboard focus/hover or information button reveals its full name.
4. Open selected Module details and L&D approval revision preview; verify the correct snapshot, document typography and available actions.
5. Where content has multiple sections, choose a contents link; focus moves to the section and link highlight updates.

Local browser fixture verification establishes the presentation and request behavior, not live database/provider availability or production readiness. No backend/schema changes, commits, staging or database resets.
