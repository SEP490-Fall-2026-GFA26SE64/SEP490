# REQ-053 / REQ-013 — Unified Learning Content L1

Local slice2026-11-11, FR-04.06/FR-05.05/FR-05.08. L&D now has one Learning Content sidebar entry, stable parent header and compact Modules/Approvals route tabs. Existing URLs and default sidebar entry to Approvals remain. Expert authoring and decision permissions are unchanged.

## Version and filter behavior

Source inspection of `ModuleAuthoringService.catalogList` confirms that graph/catalog records take precedence over the attached current authoring payload for the same ID; metadata filtering precedes server pagination. Its existing catalog test separately exercises a published graph title with an attached draft. No backend/API/schema changes were needed.

L&D Modules defaults to existing server filters `status=ACTIVE&review=APPROVED`. All statuses explicitly removes those fixed filters and exposes the existing lifecycle/review controls; Clear restores the published default. This is not page-only badge filtering. Approved catalog-only records are labelled Catalog release, without inventing a local released revision or implying completed intake/learner entitlement.

The default catalog detail only uses retained `releasedRevision` lesson content when its URI and content version match the catalog record. A newer submitted/returned/pending-publication draft never replaces it. Missing/mismatched/unreceived snapshots remain explicitly unavailable; working revisions/history are a separately labelled action. The directory keeps catalog title/Skill/duration/status as primary fields and displays working workflow separately.

Approvals keeps the server pending/retry queue and its exact-version/state-authorized decisions. Large L&D metric cards are replaced with inline server-result counts; loading/error/uninitialized counts are —. Filters sit beside the directory; loading uses a skeleton, failed loads are not empty results, and filtered-no-match differs from no pending/published data. Previous rows are hidden while L&D results load. Shared Job Positions/Modules tokens and components are reused; no new design system/dependency.

## Verification status

- **35 component tests passed /6 files** including Module regressions, published snapshot matching/refusal, mode/query reset and L&D sidebar active/default behavior. [Component receipt](../unit/REQ-053-learning-content-l1-20261111.md).
- Final production build passed; scoped lint/diff check has no errors. Existing workspace effect/constant-comparison warnings and Vite bundle-size warning remain.
- Browser run1 failed because its pending-list fixture ignored search; the fixture now matches the existing API search behavior. Original artifacts retained.
- Browser run2:1440px passed the complete isolated UI journey;1280px timed out waiting for page load before table assertions;4 cases were not run. Containers reported healthy/OOMfalse, but Neo4j used2.443GiB of the3.827GiB Docker VM with highCPU. Existing API/Neo4j are being restarted with unchanged images/configuration/volumes. Navigation now waits for DOMContentLoaded plus observable UI assertions. The remaining cases subsequently passed after the operational recovery described below.

[Components](assets/learning-content-l1-20261111/checks/component-passed.log), [build](assets/learning-content-l1-20261111/checks/build-passed.log), [lint](assets/learning-content-l1-20261111/checks/lint.log), [initial failures](assets/learning-content-l1-20261111/checks/browser-initial-failed.log). **Final browser acceptance:6 distinct cases passed**, across two bounded runs.1440px passed on8088;1280/768/390px, controlled revision workflow and real manager read passed using the same production build on temporary localhost:8089 with proxy to the unchanged API18080. This avoided slow dev-server resource loading. The temporary preview was stopped after verification. Earlier passes are not counted twice. [Recovered browser log](assets/learning-content-l1-20261111/checks/browser-recovered-passed.log), [built-preview screenshots](assets/learning-content-l1-20261111/built-preview), [8088 runtime-failure receipt with1440 pass](assets/learning-content-l1-20261111/checks/browser-runtime-failed.log).

The controlled workflow asserts that returning revision2 leaves catalog revision1, approving into PUBLISH_PENDING still leaves revision1, and only successful retry/projection updates catalog/content to revision2. Real read uses Active+Approved server filters and verifies the Learning Content sidebar enters Approvals. No decisions or data mutations were made on real user records. API and Neo4j were restarted with their existing images/configuration/volumes; no migration/reset was run. A long-running load/performance guarantee is not established by these local UI tests.

## Files and repeatable checks

Source: `WorkspaceLayout.tsx` sidebar label; `ModuleManagementWorkspace.tsx` shared parent/filter/presentation; compatible optional label/content use in `CatalogModuleDetails.tsx`; optional heading in `ModuleApprovalQueue.tsx`; new feature-local `publishedModulePresentation.ts`. Tests: Module workspace, published presentation, shared layout; `REQ-053-learning-content-l1.spec.ts`. A1 browser selectors follow the new stable header/loading region.

1. Enter Learning Content from L&D sidebar: Approvals is active; switch Modules and verify the parent header stays stable. Check1440/1280/768/390px with no horizontal overflow.
2. With a released revision and newer submitted draft, verify catalog title/content stay released; open Approvals to inspect the newer revision. Missing release snapshots must not display draft content as published.
3. Choose All statuses, use existing filters/search and pagination, then Clear; verify server query and result count return to Active+Approved default.
4. With isolated fixtures: return for changes keeps old catalog; resubmit/approve with pending projection still keeps old catalog; retry after successful projection replaces it with the confirmed release. Keep required feedback and expectedVersion checks. Do not decide real user requests for demonstration.
5. Read the real manager published catalog with the same server filters, verify returned metadata and default sidebar route, without data mutations. Full backend security/projection and production readiness are not certified by UI fixtures.
