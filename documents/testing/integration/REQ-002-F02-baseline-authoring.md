# REQ-002-F02 — PostgreSQL integration evidence

## Environment and fixture

- Test file: `backend/src/test/java/com/adaptlearngraph/assessment/infrastructure/BaselineAssessmentPostgresIntegrationTest.java`.
- Disposable image: `postgres:17.6-alpine` through Testcontainers; Ryuk removes the container on JVM exit.
- Each case resets the schema and applies the real Flyway migrations. Identity, catalog-reference and question-bank rows are deterministic test fixtures; Catalog lookup remains a fake port because the Neo4j catalog adapter is a separate owner dependency.
- Real JDBC blueprint/draft stores and Spring transactions are used, including deferred database constraints and publication triggers.

## Executable cases

| Method | Expected result | Rules |
| :--- | :--- | :--- |
| `migratesThroughV12AndSecondMigrationRunIsNoOp` | V1–V12 apply on a clean database; rerun applies no migration. | R7 |
| `persistsVersionedBlueprintAndIdempotentGenerationWithUtcTimestamps` | Blueprint versions and replay records round-trip; generation pins the latest eligible item version; timestamps remain UTC; protected answer material is not reconstructed into the public manifest. | R3–R5, R7 |
| `reviewAndPublishPersistExactHashAndDatabaseFreezesHeaderAndManifest` | Exact hash is persisted; review freezes item changes; publish freezes header and items. | R6 |

## Run evidence — 2026-10-14

Included in the scoped backend command documented in the [master evidence](../REQ-002-F02-baseline-authoring.md): **3 passed**, 0 failures/errors/skips.

During the first assertion run, PostgreSQL correctly rejected a forbidden mutation but appended PL/pgSQL context to the trigger message. The assertion was narrowed to require `DataAccessException` and the invariant message rather than exact driver formatting; rerun passed all three cases.
