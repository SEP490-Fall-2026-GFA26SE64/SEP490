# FR-04.06 / REQ-013 — L&D module catalog and approval queue

2026-11-01. Delivered locally on http://localhost:8088. Modules is read/inspect/history; Approvals is a manager-only pending-action queue; eligible legacy intake assignment opens inside catalog details. Learning content navigation is removed and `/ld-manager/learning-content` redirects to `/ld-manager/modules`. Lessons/assets/versions remain intact.

## Executed checks

- Existing component suite Passed10/10. [Unit/API/architecture/migration results and TypeScript limitation](../unit/REQ-013-ld-approval-queue.md).
- Two distinct Playwright UI-contract cases Passed against Vite8088 with explicit `/api/v1/**` fixtures: catalog/queue navigation plus existing Question Bank feedback; catalog details→assignment→cancel, submitted request→approval confirmation→cancel, mobile no horizontal overflow and old content URL redirect. No business writes or JS page errors in these scopes. `frontend/system-tests/REQ-013-014-merge-routing.spec.ts`, grep L&D, single worker, no automatic retries. The initial sandbox Chrome launch aborted; permitted rerun passed the first case and found mobile pagination overflow in the second. Scoped pagination wrapping fixed it; final rerun2/2 Passed. Repeated cases are not extra unique passes. Mobile screenshot visually inspected: `frontend/test-results/ld-module-approval-queue-mobile.png`.
- Real existing-session smoke: L&D pending API returned the same5 IDs/count as PostgreSQL current states; browser catalog had no approve controls/content tab, queue rendered actual submitted module titles, and legacy content URL redirected. Expert pending API returned403. No mock API routes in this smoke. The first screenshots were captured before all catalog requests settled; the final manager rerun explicitly waited for a real queue module title, all loading to end and no error banner before screenshot. `/tmp/ld-module-real-queue.png` was visually inspected. These reruns verify readiness, not additional business cases.

Logs: `/tmp/ld-module-component-final.log`, `/tmp/ld-module-browser-final.log`, `/tmp/ld-module-real-browser.log`, `/tmp/ld-module-real-browser-final.log`. Backend/API build Passed24 cases; whole-repository TypeScript check still fails on the unrelated pre-existing TargetRoleGraphModal seniority reference. No full frontend production-build pass or new real approve/return/assignment mutation acceptance is claimed.

[Backup, unchanged-store comparison and session timestamp exception](../integration/REQ-013-ld-approval-queue.md). No new data was seeded/imported and no content was deleted. Both automatic seeds remained disabled. Only the API service was replaced after backup, without migration or volume changes. No commit/push.

## Manual checklist

Prerequisites: existing L&D account; use normal login at http://localhost:8088/login. A submitted revision is required to test review; an ACTIVE unmanaged legacy catalog module is required to test intake assignment. If all catalog modules already have owners, no assignment button is expected.

1. Content Approvals→Modules (`/ld-manager/modules`). Expect module search/list, owner information and View module/Details & history; no approve/return buttons and no Learning content tab.
2. View an eligible unmanaged catalog module. Expect Assign for intake inside its details, not on the list. Select the responsible Expert and existing required intake scope; Cancel must make no changes. Assignment remains subject to existing version/owner checks.
3. Open Approvals (`/ld-manager/approvals`). Expect only Submitted, Archive requested, Awaiting publication or Archiving requests, with a correct filtered total and pagination. Draft/Returned/Released/Archived records are excluded. Catalog lifecycle/review filters do not carry into the queue; search/type/skill remain available.
4. Details & history: inspect numbered lessons, creator/editor/reviewer and immutable versions. Open Approve or Return then Cancel; expect no mutation. On an intentional real decision, returning requires feedback, successful release removes the row from the queue, and a failed projection remains available for Retry. Those latest real mutation steps are Not Run by this task.
5. Open `/ld-manager/learning-content`; expect redirect to Modules. At390px mobile width expect navigation/actions/pagination to wrap without page overflow. Sign in as Expert; pendingOnly staff-review API must remain403.
