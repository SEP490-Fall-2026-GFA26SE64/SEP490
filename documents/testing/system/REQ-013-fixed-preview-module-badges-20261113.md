# REQ-013 — Fixed lesson preview and Expert directory badges

Date: 2026-11-13. Frontend layout change only.

## Delivered

- Expert Module directory no longer renders creator name below Workflow. Details/history identity data remains intact.
- Compact Vietnamese labels, centered single-line status badges and increased Workflow allocation. Directory switches to card presentation below the 2xl breakpoint to avoid squeezing translated columns.
- Shared staff preview uses fixed 4.5rem lesson rows with a bounded two-line title, separate number and information action. Hover/focus reveals the name; the information dialog provides the full title on touch/keyboard. Main reading heading wraps even unbroken text. These changes apply to the existing shared Create/Detail/Approvals/Import viewer.

## Actual checks

- Production build passed; pre-existing bundle-size advisory remains.
- Scoped oxlint completed with two existing set-state-in-effect warnings in ModuleManagementWorkspace (lines 81/166); no errors.
- Scoped diff whitespace check passed.
- Focused Playwright: **5/5 passed** in 57.7s using Chrome and the built frontend on port 5100. Covers desktop/mobile import Review and saved preview, extremely long titles at 1600/390, fixed row geometry, hover/focus disclosure, full-name information dialog, subsequent lesson selection, no preview import confirmation/learner writes, and Vietnamese Expert directory badges without creator subtitle.
- Browser evidence: `/tmp/sep490-fixed-preview-browser-final`.

The first execution was blocked by local process permissions; an authorized run exposed a tooltip intercepting clicks. Tooltip pointer interception and the shared Button's inner nowrap wrapper were corrected before the final passing run.

Browser APIs were isolated fixtures. No claim of live database integration or backend recovery is made. No commits, staging or backend/schema changes. Existing unrelated Git changes/conflicted reports preserved.
