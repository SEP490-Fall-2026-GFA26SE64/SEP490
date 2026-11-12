# REQ-053 — Content Approvals A1

Local UI slice,2026-11-11. Owning FR-04.06/FR-05.08 in Learning catalog, related legacy REQ-013. The L&D approvals route now presents a request queue and side review panel, while the Module directory and other modes retain their existing flows. No backend schema/API/runtime changes, dependency additions, bulk decisions or decisions on user requests were performed.

## Implementation

The compact queue shows actual current title/ID, Skill/knowledge as secondary information, publish/archive request type, revision, actual request actor/time and pending/retry status. Request context comes only from SUBMIT or REQUEST-ARCHIVE/legacy REQUEST_ARCHIVE history events matching the current revision; missing context is —. Creator/responsible Expert and Last Editor remain distinct from submitter. Pending total is the existing server-filtered count, not a sum inferred from a page.

The existing shared Dialog is configured as a side panel with fixed header, tabs and action footer. Request content opens the current exact payload/lessons, responsible Expert, Last Editor/date, recorded request note and revision feedback. History & comparison reuses the timeline and actual retained historical snapshots. Title/type/duration/knowledge are compared with the exact released revision; full recorded content can be opened for inspection. Missing or same-current released snapshots have explicit explanations. This is not a complete textual/media diff.

Existing decision permissions are unchanged: SUBMITTED approve/return; ARCHIVE_REQUESTED approve-archive/return; PUBLISH_PENDING retry/return; ARCHIVE_PENDING retry. Confirmation, expectedVersion, mandatory return feedback(max2000) and backend checks remain authoritative. A conflict retains entered feedback; reopening the request fetches the current lock before a deliberate new decision. Loading is explicit and a failed load is not labelled an empty queue.

Loading/failed/empty states remain distinct; previous feedback is preserved rather than hidden. Only search, Skill and module-type filters are exposed, using current server parameters before pagination. Expert/request-type filters are deferred as chosen by the user. Existing server sort remains module-created date descending, not request age; the queue explains this. No page-only filtering/sorting or invented global metrics were added.

## Verification

- **27 component tests passed /4 files**, including existing Module flows and new exact-history, archive aliases, missing snapshots, current/historical separation, feedback/editor and failed-load states. [Unit receipt](../unit/REQ-053-content-approvals-a1-20261111.md).
- Final production build passed. Scoped lint has only the two pre-existing workspace set-state-in-effect warnings. Existing Vite chunk-size warning remains. Diff whitespace check passed.
- Browser run2: **6 distinct cases passed**:4 responsive cases(1440/1280/768/390),1 controlled decision/conflict case,1 real manager queue read. Responsive checks cover exact revision, actual submitter versus owner, historical content, fixed footer and no horizontal overflow. Decision fixtures cover required feedback,409 retention, reopen/fresh expectedVersion, approve/archive/retry permissions and completed empty queue. Real API read returned0 pending requests in the current workspace; no actual request was approved/returned/archived.
- Final-source mobile and real-read checks **both passed**, requalifying the loading/error empty-state guards and retained feedback/editor metadata. Final mobile took1.5min; real manager read took2.5min on the local stack, with both services healthy. The real-read check waits for the pending-list response and completion of queue loading, avoiding an initial-state false empty result. These two reruns replace the corresponding cases; they are not added to the6 distinct-case count. [Final-source browser log](assets/content-approvals-a1-20261111/checks/browser-final-source.log), [final screenshots](assets/content-approvals-a1-20261111/final-source).

[Run2 browser log](assets/content-approvals-a1-20261111/checks/browser-run2.log), [final build](assets/content-approvals-a1-20261111/checks/build-final.log), [lint](assets/content-approvals-a1-20261111/checks/lint-final.log), [run2 screenshots](assets/content-approvals-a1-20261111/run2). Initial browser failure was a selector requiring exact direct text where a definition includes a nested Released label; the rendered value was correct. The selector was corrected; original log/trace remain in run1. Controlled fixture actions establish UI behavior, not a fresh backend security/projection test. No backend test certification or production readiness is implied.

## Reuse and files

Job Positions typography, density, native table/filter pattern and compact size-8 Eye buttons were reused. Shared PageHeader, StatCard, Card, Input, Button, Badge, CopyableId, Dialog/Body/Footer, Tabs, Accordion and Pagination remain the UI primitives. Existing CatalogModuleDetails and lesson rendering are reused, and the existing Module history renderer is shared between details and review. No duplicate shared drawer or design system was introduced.

New feature-local files: `ModuleApprovalQueue.tsx`, `ModuleApprovalReview.tsx`, `moduleApprovalPresentation.ts` under `frontend/src/features/expert/modules`. Integration is in `ModuleManagementWorkspace.tsx`; related unit/navigation tests and `frontend/system-tests/REQ-053-content-approvals-a1.spec.ts` cover the change. Existing unrelated Module/Assessment Bank work is preserved.

## Manual repeat

1. Sign in as L&D; open Content Approvals. Verify pending-only results, actual count, supported filters/clear and pagination. Observe loading, empty and API failure separately.
2. Review a request: check current revision, actual submitter/time, responsible Expert/editor and lesson content. Switch tabs; inspect released/historical snapshots where recorded. Scroll on desktop/mobile and keep decision footer visible.
3. Use dedicated fixtures for approve/return/archive/retry. Return requires feedback; after409 retain the reason, cancel, reopen to inspect the latest revision/lock, then decide deliberately. Peers/manager Module directory retain their existing permission boundaries.
4. Do not approve or archive existing user records merely to demonstrate the UI. Expert/request-type filtering, request-age ordering and full content diff require separately scoped work.
