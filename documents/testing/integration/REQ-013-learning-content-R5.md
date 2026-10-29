# REQ-013 / FR-06.06, FR-06.09 — R5 persistence regression

Date: 2026-10-29. **Passed:** `LearningContentIntegrationTest#forwardMigrationPersistsSettingsAssetsAssignmentsProgressAndNotificationsWithIsolation`, one Testcontainers PostgreSQL 17.6 scenario, zero failures/errors/skips. Disposable database only; preserved development volumes were not reset.

The combined backend command and log are recorded in [unit evidence](../unit/REQ-013-learning-content-R5.md). The test applies the existing V1–V38 migration lineage, checks legacy lesson conversion, upload settings/assets, actual progress intervals/completion/coverage timestamps/active lesson, organization isolation and durable notification reads. R5 adds no migration, persistence field or graph mapping.

R5's new read-before-start policy is tested with the actual application policy and mocked ports in unit tests, then exercised through the real Compose API/browser in [system evidence](../system/REQ-013-learning-content-R5.md). This existing PostgreSQL regression alone is not proof of new read-policy behavior or the entire adaptive engine. No new Neo4j round-trip test is required for unchanged graph mappings; the system slice consumes existing published Module/TEACHES snapshots.
