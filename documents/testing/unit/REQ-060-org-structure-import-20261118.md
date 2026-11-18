# REQ-060/061: Organization structure import â€” unit, API and component evidence

Date: 2026-11-18. FR-01.01 / FR-07.03 local scope. Replaces the Guest starter-catalog copy; historical starter-catalog evidence is unchanged.

## Environment

Windows 11, Java 21.0.6, Node 22, JUnit 5.12.2, Vitest. The working tree contained other uncommitted in-progress work (admin knowledge graph explorer, demo price migration, module/question-bank DTO changes).

## Backend unit and architecture

Standard `mvnw test` cannot compile the test tree because 15 unrelated test files (ModuleAuthoring, Prerequisite, QuestionBank, AssessmentPolicy, SkillLearning DTO changes) fail to compile on this working tree. The affected tests were therefore compiled in isolation against `target/classes` and the Maven test classpath with `javac -sourcepath src/test/java` and run with `junit-platform-console-standalone` 1.12.2.

| Acceptance | Test | Result |
| --- | --- | --- |
| Rows group into Department â†’ JobPosition â†’ TargetRole â†’ Level by case-insensitive code, levels ordered by rank, `L{rank}` codes | `OrganizationStructureImporterTest.groupsFlatRowsâ€¦` | Passed |
| Every one of 10 required columns reported with its row number | `everyRequiredColumnIsReportedWithItsRowNumber` | Passed |
| Invalid rank (0, 1.5, text), code characters, name >120, description >1000 | `rejectsInvalidRankCodeAndLengthValues` | Passed |
| Changed name/scope for a repeated code, job position in two departments, role in two job positions, same level two ranks, same rank two levels | `rejectsConflictingDefinitionsOwnershipAndRanks` | Passed |
| Empty file, 501 rows rejected; 500 rows accepted | `wholeFileLimitsAreEnforced` | Passed |
| Preview mirrors normalized tree only | `previewMirrorsTheNormalizedStructureâ€¦` | Passed |
| Changed owners keep layer/HTTP boundaries | `StarterCatalogArchitectureTest` (extended with RegistrationController, RegistrationApplicationService, importer, worker, import store) | Passed |

Result: **7 passed, 0 failed**.

## Frontend

Command (from `frontend`): `npm.cmd test -- src/features/guest src/features/administration/knowledge-graph`

| Acceptance | Test | Result |
| --- | --- | --- |
| CSV quoting/BOM/CRLF/`;` exports; header in either language below a title row; sheet row numbers kept; blank rows skipped | `orgStructureFile.test.ts` | Passed |
| Missing columns, empty, >500 rows, unsupported type, >1 MB, unreadable xlsx detected before any request | `orgStructureFile.test.ts` | Passed |
| Downloadable template round-trips through the xlsx parser | `orgStructureFile.test.ts` | Passed |
| Tree, search, graph-node detail, counts; nothing applied until Apply | `GuestOrgStructureImport.test.tsx` | Passed |
| Server row errors in a focused summary, Apply disabled | `GuestOrgStructureImport.test.tsx` | Passed |
| Local file problem makes no request; Cancel keeps the applied structure; Remove clears it | `GuestOrgStructureImport.test.tsx` | Passed |
| Service failure offers Retry check | `GuestOrgStructureImport.test.tsx` | Passed |
| Register page submits parsed rows as `organizationStructure` (empty array when none) | `GuestRegisterPage.test.tsx` | Passed |
| Shared graph modules still serve the admin knowledge graph explorer | `OrganizationKnowledgeGraphExplorer.test.tsx` and filters | Passed |

Result: **45 passed, 1 failed**. The failure, `requires explicit consent â€¦ provides placeholder links`, expects the placeholder-link status paragraph that the pre-existing uncommitted edit of `GuestRegisterPage.tsx` removed; it is unrelated to this change.

Type check: `tsc -p tsconfig.app.json --noEmit` reports only pre-existing errors (employee pathway types, unused `legalNotice` from the same pre-existing edit). `oxlint src/features/guest` reports no findings in the new files. `vite build` succeeded.

## Revision 2 — tabbed workbook with Excel validation (2026-11-18)

The flat sheet/CSV contract was replaced by a four-tab `.xlsx` workbook. Same isolated compilation/runner as above.

| Acceptance | Test | Result |
| --- | --- | --- |
| Tabs link by case-insensitive code; levels ordered by rank | `OrganizationStructureImporterTest.linksSheetsByCaseInsensitiveCode…` | Passed |
| Every required cell reported with sheet and row | `everyRequiredCellIsReportedWithItsSheetAndRow` | Passed |
| Invalid code, length, rank values | `rejectsInvalidRankCodeAndLength` | Passed |
| Duplicate codes per tab, unknown references, duplicate level name/rank | `rejectsDuplicateCodesUnknownReferencesAndDuplicateLevels` | Passed |
| Department/job position/target role without children rejected | `everyBranchMustReachALevel` | Passed |
| Empty workbook; 501 rows in a tab rejected | `wholeWorkbookAndPerSheetLimitsAreEnforced` | Passed |
| Preview mirrors normalized tree | `previewMirrorsTheNormalizedStructure` | Passed |
| Layer boundaries | `StarterCatalogArchitectureTest` | Passed |

Backend: **8 passed, 0 failed.**

Frontend (`npm.cmd test -- src/features/guest src/features/administration/knowledge-graph`): `orgStructureFile.test.ts` verifies tab order and headers, frozen headers, list validations pointing at the parent tab, custom unique-code and rank rules, `INDEX/MATCH` name formulas, locked automatic and unlocked input cells, sheet protection, template round-trip, Vietnamese tab/header names, and file/sheet/column/empty/row-limit problems. Dialog and register-page tests upload a generated workbook. **44 passed, 1 failed**: the failure is the same pre-existing placeholder-link test described above. `tsc` shows only pre-existing errors; oxlint reports nothing for the changed files.

Excel 16 (Microsoft 365, COM automation) opened the generated template without repair after a full recalculation. Name lookups resolved, dropdowns were list validations, and sheets were protected. `Range.Validation.Value` was **False** for an unknown department code, a duplicate department code with different case, rank 0, rank 1.5, a rank already used by the same role, and a duplicate level name in a role; it was **True** for valid counterparts.

## Revision 3 — compact dialog, merged levels, organization root

`GuestOrgStructureImport.test.tsx` covers: the compact dialog before upload (no table) widening after upload; graph nodes = root "My organization" + one merged Junior node for `Junior`/`junior` across two roles; merged-level details listing `Backend Developer · rank 1` and `Frontend Developer · rank 2`; root details `1 × department`. Results: changed files 13/13 passed when run alone. In the full guest suite under heavy Docker load, several unrelated register-page tests timed out at the 5 s default. With `--testTimeout=20000` the guest suite had **34 passed, 2 failed**: the pre-existing placeholder-link test, and `GuestLandingPage` "Enterprise Sign In". The second one fails because of concurrent uncommitted edits to the login and workspace shell (`App.tsx`, `LoginPage.test.tsx`, `LanguageContext.tsx`) made by another session after 00:48; this change does not touch those files.

Revision 3b: `GuestOrgStructureImport.test.tsx` now asserts the full-size dialog before upload, the empty-list message, a graph containing only "node My organization", and four zero counts. `StarterCatalogGraph`, structure-import and knowledge-graph component suites: **18 passed, 0 failed**.
