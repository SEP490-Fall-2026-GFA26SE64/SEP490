# REQ-060/061: Organization structure import — integration evidence

Date: 2026-11-18. Testcontainers PostgreSQL 17.6 and Neo4j 5.26-community on Docker 28.1.1. Tests were compiled/run in isolation (see the [unit evidence](../unit/REQ-060-org-structure-import-20261118.md) for why standard Maven test compilation is blocked by unrelated files).

| Acceptance | Test | Result |
| --- | --- | --- |
| Structure stored with the account in `platform.registration_org_structure` (jsonb round-trip, 12 nodes / 10 relationships); no structure stores nothing | `RegistrationPostgresIntegrationTest.organizationStructureIsPersisted…` | Passed |
| Payment provisioning keeps workspace PROVISIONING until the import job succeeds; claim returns the stored structure; lease, retry back-off, terminal FAILED with `CATALOG_IMPORT_FAILED`; no structure → immediate READY and no job | `PaymentOrderPostgresIntegrationTest.organizationStructureKeepsWorkspaceProvisioning…` | Passed |
| Two organizations receive independent, idempotent structures (12 nodes/10 relationships each); Department→JP→Role→Level path; optional fields not invented; levels `Junior:1:L1`, `Senior:2:L2`; tenant-scoped job position reads; cross-tenant save rejected | `WorkspaceCatalogImportNeo4jIntegrationTest.twoOrganizations…` | Passed |
| A colliding foreign-owned id rejects and rolls back the whole import | `aCollidingForeignNodeRejectsAndRollsBack…` | Passed |
| Worker succeeds with counts, completes legacy jobs without a structure as empty, retries then fails | `workerWritesSucceedsEmptyLegacyJobs…` | Passed |
| Public validate endpoint: 403 without CSRF, 200 no-store tree, 400 `rowErrors` (row 3, `Level rank`); invalid signup creates no account; valid signup persists | `RegistrationApiIntegrationTest.organizationStructureIsValidatedPublicly…` | Passed |

All remaining tests in these four classes were also run: **60 passed, 2 failed**. The failures — `replacingASingleRoleUpdatesSeatsAndInitializesLearnerStateWithoutErasingHistory` (expected 0, was 1) and `editingRolesCannotBypassEmployeeCapacityOrOverwriteFailedProfileChanges` ("No seat is available") — are member seat/role tests that create no organization structure; the only code they share with this change is an `existsByRegistrationId` check that behaves identically when no structure exists. They are recorded as **Failed, unrelated**, not fixed here.

Flyway applied V72 `registration_org_structure` after the existing V71 in both `db/migration` and `db/workspace-migration`.

## Revision 2 � tabbed workbook (2026-11-18)

Same four classes rerun with the tabbed request (`OrganizationStructureFixtures.request()`). The API test now posts `{departments, jobPositions, targetRoles, levels}` and asserts the 400 `rowErrors[0]` = sheet `Levels`, row 3, column `Level rank`. All structure tests passed; overall **60 passed, 2 failed**, the same two unrelated seat tests as before.
