# REQ-013 — main merge repair: integration evidence

Date: 2026-10-29. Real PostgreSQL/Neo4j Testcontainers, isolated from the existing module-authoring-test database.

| Executed class/method | Result |
|---|---|
| ModuleAuthoringIntegrationTest | 2 passed |
| DatabaseSchemaTest | 1 passed |
| WorkspaceBaselineResourcesIntegrationTest | 1 passed |
| BaselineAssessmentPostgresIntegrationTest#migratesThroughLatestVersionAndSecondMigrationRunIsNoOp | 1 passed |

**5 passed, no failures/errors/skips.** Together with backend unit checks: 39 passed.

Assertions include persisted Module revisions/content/audit, full Module/TEACHES metadata and graph projection, imported unknown creators, occupation access, real membership Expert choices, V1–V34 migration, checksum validation and second-run no-op. Baseline upgrade from main V12 applies 22 subsequent migrations and preserves seeded resources.

Main V1–V32 SQL remains byte-identical to main. Branch Module SQL is unchanged except V27/V28 filenames become V33/V34. There are 34 unique versions. Builds ran from a temporary clean source snapshot to avoid stale pre-merge target/classes SQL resources; host target artifacts were not deployed.

## Existing database boundary

The old module-authoring-test database has a different Flyway lineage from V8. Its V27/V28 already contain Module data. It was read only for diagnosis and was not reset, repaired, baselined or migrated. V33/V34 fixes source integration on main lineage; it is not an automatic data migration for the old runtime. A separate data-preserving transition is required before deploying there.
