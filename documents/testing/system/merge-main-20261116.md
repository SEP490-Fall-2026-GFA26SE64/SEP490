# Main merge browser verification — 2026-11-16

Scope: browser fixture regressions after merging main. Chrome on macOS, one worker, headless. These tests mock API responses; they do not establish real persistence, authorization or production readiness. Related [build/component/backend record](../unit/merge-main-20261116.md).

| Suite | Environment | Result |
| --- | --- | --- |
| `FR-06.07-individual-skill-ui.spec.ts` | Vite at `http://127.0.0.1:28189`, 1440/390px | 4 passed: loading, locked/empty states, retry, knowledge tabs, module search/filter/reset/pagination, direct start/navigation and overflow assertions |
| `REQ-013-shared-learner-preview.spec.ts` | Built frontend served at `http://127.0.0.1:28190`, 390–1800px, English/Vietnamese | 23 passed: import review before/after confirmation, generated identities, exact draft/released snapshots, Expert/L&D read-only previews, image/video, lesson editor, stable rows and responsive module directory |

Runner: temporary `.merge-check.config.ts` extended `playwright.system.config.ts`, with the suite match/base URL above, timeout 60000, Chrome executable `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, and local `/tmp` output directories. Invoked using `npx playwright test --config=.merge-check.config.ts` in frontend. Temporary config and preview servers were removed/stopped after verification.

The initial combined dev-server attempt passed the four independent-learning cases but failed the first shared-preview case at the Import button. Trace showed the fixture's `**/api/**` interception swallowing Vite's `/src/shared/api/*.ts` imports, leaving a blank page. That run was interrupted and retained as failed/abandoned evidence. Serving the built bundle avoided source-module interception; all 23 preview cases then passed. No application fix was made for this test-environment issue.

Logs: `/tmp/sep490-playwright.log` (initial interrupted run), `/tmp/sep490-playwright-preview.log` (23-pass rerun). Initial failure trace/screenshots: `/tmp/sep490-merge-browser`; final output directory: `/tmp/sep490-merge-preview-browser`. Visual inspection included `/tmp/sep490-polished-preview-390.png`; automated assertions also checked desktop/mobile overflow, current snapshot content, console/page errors and absence of unintended writes in the fixture flows.

Manual real-API checklist — Not Run:

- Start the existing workspace stack with a reviewed database migration history; do not reset preserved data.
- Employee: open an independent skill/module, complete learning, start the exact assessment and reload its knowledge records.
- Employee: open the approved Role pathway and inspect timing, current progress and notifications.
- Expert/L&D: verify draft/released learner previews and import confirmation with persisted records.
- Manager/Platform Admin: check competency filters and workspace contact/profile fields under appropriate organization boundaries.
