# REQ-013 / FR-05.05 — Expert Modules navigation

2026-11-01. UI-only removal of Content Studio navigation and the empty-state shortcut. No API, schema, database, asset, direct-route or module editor changes. Backend/store integration testing is Not Applicable to this navigation-only delta.

Verification: existing ModuleManagementWorkspace component suite passed10/10 (single worker), including the updated empty-state assertion that no Content Studio link exists while Create module remains. Real Playwright smoke on localhost8088 passed Expert desktop/mobile link absence and Create module visibility, plus L&D Learning content link preservation. No page JavaScript errors in these scopes. Initial real login timed out at30s; the unchanged UI assertions passed after retry with90s API timeout. This is navigation acceptance, not a full module creation/persistence run. Screenshots include the data-loading state; no claim that the catalog loading completed is made.

Artifacts: `/tmp/expert-modules-content-studio-tests.log`, `/tmp/expert-modules-content-studio-browser-retry.log`, `/tmp/expert-modules-no-studio-desktop.png`, `/tmp/expert-modules-no-studio-mobile.png`. Desktop screenshot visually inspected. The initial diagnostic log is private because request diagnostics include session headers; do not publish it.

Manual checklist:

1. Prerequisite: existing Expert account. Open http://localhost:8088/expert/modules. Expect Modules navigation and Create module; no Content Studio link.
2. Search for an unmatched module. Expect the empty message with no Open Content Studio shortcut. Reset search; existing module behavior remains.
3. Sign in as L&D and open http://localhost:8088/ld-manager/modules. Expect Learning content still available. Repeat Expert navigation at mobile width.

## Follow-up — Modules tab and copy selector

2026-11-01: Expert workspace local navigation is omitted entirely; L&D navigation stays. The module editor no longer offers Copy lessons from existing content. Inline lesson authoring, loaded edit lessons and generated contentId persistence remain unchanged; no API/schema/store edits.

Existing component suite retry passed10/10, including absent Expert navigation/copy selector, retained Lesson title and primary-skill validation/server-error behavior. The initial run had8 passes/2 failures: an obsolete copy-selector interaction and an intake-button wait timeout. The obsolete interaction was replaced with inline Lesson title assertion; the unchanged intake test passed on retry. No test assertions for persistence/security were removed.

Real Playwright on8088 passed Expert desktop/mobile navigation absence, opening Create module with inline Lesson title and no copy selector, Cancel closes, and L&D Learning content link retained. No page JavaScript errors in these scopes. Screenshot `/tmp/expert-module-ui-followup-dialog.png` visually inspected (lazy text editor still loading in image; no completed rich-text editing claim). Logs `/tmp/expert-module-ui-followup-unit-retry.log` and `/tmp/expert-module-ui-followup-browser.log`. No module save or backend deployment performed.

Manual follow-up: sign in as Expert, reload http://localhost:8088/expert/modules; expect no local Modules/Content Studio tabs. Click Create module; expect title/type/duration/price and inline lesson editor, no copy-existing-content selector. Cancel; expect dialog closed. L&D navigation remains available on its own Modules page.

## Import template link emphasis — 2026-11-01

The existing Excel template/instructions link now reuses shared secondary button styling, with an orange-tinted background/border, bold label, decorative Download icon, focus ring and mobile text wrapping. Its endpoint/anchor behavior is unchanged; no API/schema/store edits.

Playwright visual UI-contract checks passed on localhost8088 with explicit API fixtures: Vietnamese label, original href, aria-hidden icon, keyboard focus and desktop/mobile bounds; no page JavaScript errors. Both screenshots were visually inspected. Initial fixture attempts intercepted /src/shared/api JavaScript files and produced a blank test page; narrowing the interception to /api/v1 corrected the harness. No product code was changed to resolve that harness issue. These checks do not certify the actual Excel file bytes/download response. Backend/database tests are Not Applicable to this style-only change.

Artifacts: `/tmp/module-import-download-highlight-final.log`, `/tmp/module-import-download-highlight-desktop.png`, `/tmp/module-import-download-highlight-mobile.png`. Manual: Expert→Modules at http://localhost:8088/expert/modules→expand Import Excel / ZIP. Expect a highlighted template link with download icon, visible focus on Tab and wrapped text on mobile; clicking retains the existing template endpoint.
