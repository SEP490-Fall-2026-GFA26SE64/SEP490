# REQ-014 / REQ-016 / REQ-041 / REQ-042 — migration reconciliation

Date: 2026-11-01. Scope: migration/configuration merge slice, not feature recertification.

## Executed integration checks

**Passed: 5 cases**, using the current `MergedMigrationLineageIntegrationTest.java`, Flyway 11.7.2 and disposable PostgreSQL 17.6-alpine Testcontainers:

| Case | Upgrade | Actual result |
| --- | --- | --- |
| Canonical Question Bank | V29 → V42 | Passed |
| Workspace before Question Bank | V35 → V42 | Passed |
| Workspace with Question Bank | V36 → V42 | Passed |
| Module/content history | V38 → V42 | Passed |
| Module/pathway history | V41 → V42 | Passed |

Every case checks preservation of all previously installed `(version, checksum)` pairs, successful Flyway validation, final V42, no-op rerun, and existence of pathway, module, lesson progress, Question Bank, baseline-resource and session tables. These cases do not assert preservation of a populated business aggregate; the existing dedicated business persistence suites still require a post-conflict run.

The standalone harness compiled the current test with JDK21 and the cached dependency classpath (`backend/target/question-bank-classpath`), then directly invoked its five JUnit-annotated methods. Application classes were not compiled or substituted. Run artifacts for this session: `/tmp/sep490-migration-resolution/integration.log` and `MigrationSliceRunner.java`. This is not a Maven whole-project result. The normal reproducible suite after remaining conflicts are resolved is `cd backend && ./mvnw -Dtest=MergedMigrationLineageIntegrationTest,MigrationConfigurationTest test`.

Additional static verification passed: every original canonical V1–V29 and workspace V1–V36 SQL matches HEAD bytes; every original module V1–V41 matches `learning-module-manage` bytes. All 42 module-location resources also match the existing accounts runtime artifact's workspace resources byte-for-byte. No `repair`, schema-history edit, real database migration or seeding was performed.

The module integration fixtures now reference the module lineage for their historical V33/V34/V35 resources. Migration-count assertions in existing baseline, workspace-resource, pathway and Question Bank fixtures were aligned with V42. Those broader business suites are **Not Run** in this slice; they depend on unresolved application source conflicts.

## Other tiers

[Configuration checks](../unit/REQ-014-016-migration-configuration.md). [System limits and manual checklist](../system/REQ-014-016-migration-configuration.md). [Location mapping](../../technical/MIGRATION_LINEAGES.md).
