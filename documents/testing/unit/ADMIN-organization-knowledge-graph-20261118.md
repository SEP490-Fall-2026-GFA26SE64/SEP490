# Organization knowledge graph viewer — unit/API/component evidence (2026-11-18)

Scope: Organization Administrator read-only knowledge graph at `/admin/knowledge-graph` (proposed slice, no published REQ ID). Acceptance IDs DOD-1…DOD-6 refer to the approved local/demo working contract.

| ID | Test | Command | Result |
| --- | --- | --- | --- |
| U-01 (DOD-5) | `OrganizationKnowledgeGraphControllerTest` — GET `/api/v1/organizations/{id}/knowledge-graph` returns nodes/edges with `Cache-Control: no-store` | `cd backend; .\mvnw.cmd test -Dtest=OrganizationKnowledgeGraphControllerTest,WorkspaceMergeAuthorizationTest` | 1/1 Passed |
| U-02 (DOD-5) | `WorkspaceMergeAuthorizationTest.onlyOrganizationAdministratorsReadTheKnowledgeGraph` — Org Admin 200; L&D Manager, Domain Expert, Employee 403 | same | Passed |
| U-03 (DOD-5) | `WorkspaceMergeAuthorizationTest.administratorOfAnotherOrganizationCannotReadTheKnowledgeGraph` — cross-organization 403 | same | Passed |
| U-04 (DOD-1…4) | `OrganizationKnowledgeGraphExplorer.test.tsx` (9 tests): response parser incl. LearningModule/Certificate and TEACHES/REQUIRES_CERTIFICATE, rejection of unknown labels; filter view (scope climb, layer toggles, search hits); loading, empty, error + retry, 403 "Access denied", no organization | `cd frontend; npx vitest run src/features/administration/knowledge-graph src/features/guest/StarterCatalogGraph src/features/guest/GuestCatalogPicker` | 26/26 Passed (9 new + 17 guest regression) |
| U-05 | Guest onboarding catalog regression (shared graph renderer generalized with `labels`/`readOnly`) | same | Passed (included above) |
| U-06 | Typecheck `tsc -b`, lint (`oxlint`), `vite build` | `npm.cmd run build`, `npm.cmd run lint` | No errors in changed files; build produced `dist` (chunk-size warning only) |

## Pre-existing failures (not caused by this slice)

- `WorkspaceMergeAuthorizationTest.legacyOrganizationAliasesNoLongerResolveToADevelopmentOrganization` expects 400, receives 200 (fails identically without this change).
- `LayeredArchitectureTest`: two rules fail on `AssessmentPolicyController`, `CertificateController`, `RequirementPathwayController`, `RuleAssessmentController`, `WorkspacePrincipal` — none are files of this slice.
- `tsc -b` errors in `employee/baseline-assessment/usePathwayAssessmentStates.ts`, `employee/overview/roleOverviewData.ts`, and `guest/GuestRegisterPage.tsx` (unused `legalNotice` from another uncommitted change, which also fails one `GuestRegisterPage.test`).
