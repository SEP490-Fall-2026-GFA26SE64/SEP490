# REQ-013 / REQ-014 — Consistent Create and Import actions

2026-11-01. FR-05.05/FR-05.06 UI-only alignment with existing L&D Target Roles buttons. Shared Button/PageHeader reused; compact size, decorative Upload/Plus icons, soft-orange Import and primary Create styling use project tokens. Expert Modules actions move to the page header; Import toggles the existing native details section and keeps its mounted preview/state. Question Bank preserves its existing dialogs, eligibility/disabled states and role restrictions. L&D gains no authoring rights. No backend/API/schema/data edits or restart were performed in this slice.

## Evidence

Existing component cases:18 distinct Passed across the two suites (ModuleManagementWorkspace10, QuestionBankWorkspace8). Initial combined execution had15 passes/3 Module async-wait failures; unchanged Module-only rerun passed10/10. Initial failed aggregate remains failed, not counted as18 passing executions. Logs `/tmp/module-question-action-components.log`, `/tmp/module-action-component-retry.log`.

Playwright Passed1 flow covering desktop1280/mobile390 on localhost8088 with explicit API fixtures. It opens/closes the Module import panel and Create editor, opens/cancels Question Create and Import dialogs, compares action heights, checks decorative icons, verifies no horizontal overflow and no POST or JS page errors. Initial run incorrectly assumed32 fixed pixels; the retry checks equal heights across Module/Question actions using the actual shared sizing. No product change or functional assertion was dropped to resolve that harness assumption. Final log `/tmp/module-question-action-browser-retry.log`; reproducible test `frontend/system-tests/REQ-013-014-merge-routing.spec.ts`, grep Expert header Create. All4 screenshots `frontend/test-results/{module,question}-header-actions-{1280,390}.png` were visually inspected. Fixtures are not production/mock application data or evidence of a real import/create mutation.

Backend/store/migration suites are Not Applicable to this presentation-only delta. No full production build is claimed; the previously recorded unrelated RoleNodeData.seniority TypeScript error remains outside this slice. Existing uncommitted changes from earlier work are preserved. No commit/push.

## Manual checklist

Prerequisites: existing Expert login; Question Bank needs an approved MicroSkill for enabled authoring actions.

1. Open http://localhost:8088/expert/modules. Expect Import and Create module in the header, matching Target Roles styling. Import opens a popup containing the template link and Excel/ZIP file input. Close or Escape dismisses the popup and returns focus to Import; Create opens the existing inline lesson form. Cancel leaves records unchanged.
2. Open http://localhost:8088/expert/assessment-bank. Expect matching Create/Import buttons. Open each dialog, then Cancel; automatic question codes/import rules remain unchanged.
3. Repeat at mobile width. Expect readable wrapping and no horizontal page overflow. Sign in as L&D: existing review capabilities remain, without new Expert authoring buttons.

## Expert Module import popup refinement — 2026-11-01

Supersedes the native-details behavior described in the original evidence above. The header Import action opens a shared Dialog, with the existing template download, upload, preview and nested confirmation flow. The inline Excel/ZIP accordion is removed. Closing an idle dialog clears its unconfirmed preview; dismissal is blocked while upload/commit is busy. APIs, import validation, ownership rules and stored records are unchanged.

Module component suite: 10/10 passed (`/tmp/module-import-popup-components.log`). Playwright: 1/1 flow passed on desktop1280/mobile390 (`/tmp/module-import-popup-browser.log`), including popup controls, Close/Escape dismissal, restored focus, existing Create/Question dialogs, and no POST calls or JavaScript page errors. Both popup screenshots were visually inspected (`frontend/test-results/module-import-popup-{1280,390}.png`). API fixtures isolate this UI check; this is not evidence of a real import mutation. Manual check: sign in as Expert at http://localhost:8088/expert/modules, click Import, verify template/file controls inside the popup, close with Close or Escape, and repeat at mobile width. No module is created until the existing explicit import confirmation.

## Statistics aligned with Target Roles — 2026-11-01

Module and Question Bank metrics now reuse gradient StatCard, contextual decorative icons, semantic value colors and short bilingual descriptions. Existing values/calculations and permissions are preserved. No schema, API, database or shared StatCard changes.

Playwright: 1/1 existing combined flow passed with new visible-description assertions on desktop1280/mobile390, no JavaScript errors or POST calls, and no horizontal page overflow. Explicit API fixtures remain isolated from real records. Log: `/tmp/module-question-stat-browser.log`. Screenshots: `test-results/{module,question}-header-actions-{1280,390}.png`, visually inspected. Backend/database tests are not applicable to this presentation-only delta.

Manual checklist: sign in as Expert; open http://localhost:8088/expert/modules and http://localhost:8088/expert/assessment-bank. Verify the three Module and four Question Bank statistics use the Target Roles card style, preserve current totals, and wrap cleanly on mobile. Change Module filters and confirm Matching modules still follows the filter. Switch EN/VI and verify metric labels/descriptions.

## L&D navigation emphasis — 2026-11-01

Modules and Approvals links reuse shared button variants, a bordered card dock, decorative icons and primary active/soft inactive states. `aria-current="page"` identifies the selected route. Existing navigation, pagination reset and permissions are preserved.

Playwright: 1/1 L&D catalog/queue flow passed, including selected-state changes, details assignment cancellation, approval cancellation, legacy route redirect, mobile overflow, zero writes and zero page errors. Explicit API fixtures; no real records mutated. Log `/tmp/module-approval-navigation-browser.log`; desktop/mobile screenshots in `test-results/ld-module-navigation-desktop.png` and `test-results/ld-module-approval-queue-mobile.png` visually inspected. Backend/database tests not applicable.

Manual: sign in as L&D at http://localhost:8088/ld-manager/modules, verify Modules highlighted, select Approvals and verify highlight moves with the pending queue, then return to Modules. Repeat at mobile width.

## Softer L&D navigation text — 2026-11-01

Active navigation uses the primary-foreground token; inactive uses muted-foreground, both medium weight. Local token-based inline color overrides global anchor inheritance without changing shared CSS. Pending actions retains its existing submitted/archive/publication queue meaning and calculation.

Browser first attempt failed during page setup (30-second startup timeout, no product assertions reached). Retry with 120-second setup allowance passed the existing L&D flow including computed active/inactive color distinction, route selected-state, cancellation and mobile overflow. Logs `/tmp/module-navigation-text-browser.log` and `/tmp/module-navigation-text-browser-retry.log`. Desktop screenshot visually inspected. No API/data changes. Manual: open L&D Modules then Approvals; selected text should be light on orange, inactive text muted gray, with the same navigation/results.

## Non-disruptive Module loading — 2026-11-01

Replaced the 128px gray loading placeholder with a thin, absolutely positioned token-based status line, with accessible Loading label and reduced-motion support. Request scheduling, loading flags, cancellation and error handling are unchanged.

Playwright: 1/1 focused delayed-read test passed (`Module navigation loading indicator does not push the content down`), holding the approval response, checking visible accessible feedback outside document flow with height at most4px, releasing the response, and checking completion/empty queue. Log `/tmp/module-loading-indicator-browser.log`; `test-results/module-navigation-loading.png` visually inspected. Explicit browser fixtures, no real mutation. No backend/schema change; related database suites not applicable.

Manual: sign in as L&D at http://localhost:8088/ld-manager/modules, switch Modules/Approvals repeatedly. Expect a thin orange loading line, no large gray block and no content pushed downward by a placeholder. On a slow connection, status remains visible until loading completes; existing errors/retry remain available.

## Faster navigation, no visual loading bar — 2026-11-01

Supersedes the prior orange line. Loading feedback is screen-reader-only. Removed180ms artificial delay from route/filter/page reads; debounce applies only to search text. L&D module/approval routes skip unused `/contents`; Expert choices load concurrently with the other reference reads instead of afterward. Lists remain fresh server reads; no response cache, permission or schema changes. This is a request-path optimization, not a measured server-latency claim.

Verification: Module component10/10 passed (`/tmp/module-navigation-performance-components.log`); Playwright2/2 passed (`/tmp/module-navigation-performance-browser.log`): existing L&D catalog/queue/cancellation flow and held-response transition with screen-reader-only status, no unused content request, and successful updated empty queue. Explicit API fixtures; no real data mutations. Latest `test-results/module-navigation-loading.png` visually inspected with no loading bar/block. Backend/database tests not applicable to this frontend request scheduling slice.

Manual: sign in as L&D at http://localhost:8088/ld-manager/modules; switch between Modules and Approvals and confirm no gray placeholder/orange line. New lists must still reflect current server data. Check dropdown filters/pagination and type in search; search retains a short debounce. Existing error and reload controls remain available if a read fails.

## Preserve session across L&D module sections — 2026-11-01

The persistent L&D parent route selects ModuleManagementWorkspace mode from the child path. Both sections share the same account/organization entitlement query scope. Existing polling, denied-access handling and server-side API authorization remain unchanged; no session data is stored globally or in browser storage.

Initial browser attempt found four session reads after navigation; rendering the same component at two leaves alone did not fix it. A second attempt confirmed the outer path-keyed entitlement boundary still unmounted the workspace (two initial StrictMode reads became four). Both failures retained in `/tmp/module-session-navigation-browser{,-retry}.log`. Final fix shares the bounded module entitlement scope. Final Playwright1/1 passed (`/tmp/module-session-navigation-browser-final.log`): Modules→Approvals→Modules keeps the initial session-request count, has no loading-session text while queue read is held, still fetches new lists, and retains no visual loading bar. Explicit API fixtures, not real persistence evidence. WorkspaceBoundary component1/1 passed (`/tmp/module-session-boundary-components.log`).

Manual: log in as L&D at http://localhost:8088/ld-manager/modules. Switch Modules→Approvals→Modules repeatedly; expect no repeated Loading your session message. Initial entry/refresh may initialize the session normally. List content should update for each section; expired/denied access still uses the existing boundary/API behavior.

## Module action order — 2026-11-01

View module now leads the shared wrapping action row before Details & history and eligible edit/request/review controls. Existing handlers and permissions unchanged. Playwright L&D flow1/1 passed, asserting first/second button order and existing view/assignment/approval cancellation and mobile overflow (`/tmp/module-action-order-browser.log`). Desktop screenshot visually inspected. API fixtures, no real records changed; backend tests not applicable. Manual: open Modules as Expert or L&D, verify View module leads the action row, open/close its details and existing history; on mobile actions may wrap while keeping order.

## Module status colors — 2026-11-01

Reused existing Badge success/warning/destructive/secondary/outline variants for module status labels; no shared Badge modification or status-transition change. Success: Approved/Active/Released. Warning: pending/review/intake. Destructive: rejected/returned. Neutral: draft/archived/unknown. Badge group aligns items at natural height.

Playwright existing L&D flow1/1 passed, with explicit warning assertions for Submitted/Not approved and secondary for Draft; existing view/assignment/review cancellation and mobile overflow checks retained. Log `/tmp/module-status-colors-browser.log`; desktop screenshot visually inspected. API fixtures; no real mutation. Green/red variants were source-mapped, not independently exercised by this pending-state browser fixture. Backend/database tests not applicable to this visual slice.

Manual: open Modules as Expert/L&D, compare approved/active/released (green), pending (yellow), returned/rejected (red), and draft/archived (neutral). Verify labels readable and buttons unchanged; repeat at mobile width.

## Question status placement — 2026-11-01

Question state, version/difficulty and optional availability-request badges moved together to the bottom of each list row, below actions. Existing shared Badge colors/labels, actions and permissions unchanged. Playwright1/1 combined desktop/mobile flow passed with status text and bounding-position assertions below Details & history, plus existing create/import cancel and no-write checks. Log `/tmp/question-status-placement-browser.log`; desktop screenshot visually inspected. API fixture uses Awaiting review, not a persisted Published question. Backend/store tests not applicable. Manual: sign in as Expert or L&D, open Question Bank, expand a skill group; verify state/version/difficulty at row bottom, including Published green where present, and check wrapping on mobile.

## Clarified question-code header placement — 2026-11-01

Supersedes bottom placement after user clarification: code remains left, state/version/difficulty/request badges occupy the right end of the same question header. Narrow screens wrap badges right-aligned. Skill grouping, actions, texts and shared Badge colors unchanged.

Playwright1/1 desktop/mobile flow passed with badge content and position checks (right of code, above prompt, same header baseline on desktop), plus existing create/import cancellation, no-write/page-error and overflow checks. Log `/tmp/question-code-status-browser.log`; both `test-results/question-header-actions-{1280,390}.png` visually inspected. Explicit browser fixtures, no real mutation; backend/store checks not applicable. Manual: open Question Bank, expand a skill; expect code left and badges right above prompt. On phone, allow right-aligned wrapping without horizontal scroll.
