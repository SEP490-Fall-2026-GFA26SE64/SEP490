# REQ-002-F02 — PostgreSQL integration evidence

> **Historical V17 evidence:** these results remain valid for their recorded schema/lifecycle only. They do not prove the planned adaptive Blueprint, IRT parameter, attempt or mastery tables.

## Occupation-scoped integration — executed 2026-10-15

The PostgreSQL suite now applies V1–V13 and proves one logical blueprint per Occupation, immutable version compatibility, latest-by-Occupation lookup and zero-role round-trip. A separate disposable Neo4j case proves real `HAS_ROLE` plus multi-Level skill-union traversal and dependency-failure mapping.

## Environment and fixture

- Test file: `backend/src/test/java/com/adaptlearngraph/assessment/infrastructure/BaselineAssessmentPostgresIntegrationTest.java`.
- Disposable image: `postgres:17.6-alpine` through Testcontainers; Ryuk removes the container on JVM exit.
- Each case resets the schema and applies the real Flyway migrations. Identity, catalog-reference and question-bank rows are deterministic test fixtures; Catalog lookup remains a fake port because the Neo4j catalog adapter is a separate owner dependency.
- Real JDBC blueprint/draft stores and Spring transactions are used, including deferred database constraints and publication triggers.

## Executable cases

| Method | Expected result | Rules |
| :--- | :--- | :--- |
| `migratesThroughV13AndSecondMigrationRunIsNoOp` | V1–V13 apply on a clean database; rerun applies no migration. | R7, R9 |
| `persistsVersionedBlueprintAndIdempotentGenerationWithUtcTimestamps` | Occupation identity, all roles including a zero role, versions and replay records round-trip; generation pins the latest eligible item version; timestamps remain UTC; protected answer material is not reconstructed into the public manifest. | R3–R5, R7, R9, R11 |
| `reviewAndPublishPersistExactHashAndDatabaseFreezesHeaderAndManifest` | Exact hash is persisted; review freezes item changes; publish freezes header and items. | R6 |
| `rejectsSecondLogicalBlueprintForSameOccupation` | Database uniqueness prevents a second logical blueprint identity for one Occupation. | R9 |
| `readsCurrentPublishedCapacityWithoutCountingSupersededItemVersions` | Capacity uses the real PostgreSQL adapter, counts only the latest published version per question identity and returns zero for an uncovered skill/difficulty. | CW3–CW4 |

Neo4j file: `Neo4jBaselineOccupationCatalogAdapterIntegrationTest.java`.

| Case | Expected result | Rules |
| :--- | :--- | :--- |
| active Occupation list | Active Occupations are ordered and count only active role memberships. | R10 |
| Occupation detail | All active roles are retained; skills are the de-duplicated union across active Levels; inactive memberships/nodes are filtered. | R10, R12 |
| driver failure | A real Neo4j connection failure maps to dependency unavailable rather than an empty catalog. | R12 |

## Run evidence — 2026-10-15

```powershell
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock `
  -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal `
  adapt-learn-graph-backend-teststage:local mvn -B -ntp test `
  "-Dtest=BaselineAssessmentPostgresIntegrationTest,Neo4jBaselineOccupationCatalogAdapterIntegrationTest,GraphSchemaTest"
```

Results after correcting the stale seed-count assertion: PostgreSQL **4 passed**, Neo4j Occupation adapter **3 passed**, graph schema **1 passed**. The complete backend regression then passed **174/174** in 2 minutes 35 seconds with the same Docker/Testcontainers configuration.

## Linked capacity execution — 2026-10-16

The new fifth PostgreSQL case above was compiled and selected with:

```powershell
cd backend
.\mvnw.cmd -q "-Dtest=BaselineAssessmentPostgresIntegrationTest" test
```

The first attempt produced **5 skipped** because Docker Desktop was unavailable. After Docker was started, the combined command below exited 0:

```powershell
.\mvnw.cmd -q "-Dtest=BaselineAssessmentPostgresIntegrationTest,Neo4jBaselineOccupationCatalogAdapterIntegrationTest,GraphSchemaTest" test
```

PostgreSQL 17.6 applied Flyway V1–V13 on disposable schemas, including the fifth latest-published-capacity case. Neo4j 5.26 Testcontainers executed the Occupation adapter and graph-schema cases. The subsequent full backend regression passed **183/183**, with 0 failures/errors/skips. No production Catalog integration is claimed because tenant visibility/publication/release-snapshot ownership remains with the Catalog owner.

## Run evidence — 2026-10-14

Included in the scoped backend command documented in the [master evidence](../REQ-002-F02-baseline-authoring.md): **3 passed**, 0 failures/errors/skips.

During the first assertion run, PostgreSQL correctly rejected a forbidden mutation but appended PL/pgSQL context to the trigger message. The assertion was narrowed to require `DataAccessException` and the invariant message rather than exact driver formatting; rerun passed all three cases.

## Management lifecycle delta — attempted 2026-10-17

The PostgreSQL suite was extended to the V1-V16 management schema and now contains six REQ-002 integration cases, including answer-reveal audit coverage. On this run, the Testcontainers Docker probe could not reach a Docker Linux engine, so **all six cases were skipped**. A full unfiltered backend attempt also reported four Docker-environment errors from container-backed suites.

At that 2026-10-17 run there was no new integration evidence for V14–V16. The 2026-10-19 run below covers migration, selected tenant/uniqueness and audit cases; coordination/concurrent command serialization and atomic active-pointer rollback still need separate cases.

## Corrective PostgreSQL run — 2026-10-19

`mvnw.cmd "-Dtest=BaselineManagementSecurityChainTest,BaselineBlueprintProductionBoundaryTest,BaselineAssessmentPostgresIntegrationTest" test` used one disposable PostgreSQL 17.6 Testcontainer. The PostgreSQL class passed **7/7**: Flyway V1–V17 and no-op rerun, V17 working/transition actor trigger with cross-organization rollback, tenant-scoped answer reveal/audit, Blueprint persistence/generation, uniqueness, capacity, and review/publish history. The actor trigger case was rerun after adding its cross-tenant assertion and passed. This closes the V17 migration/trigger gap only; management command concurrency and atomic pointer-switch rollback still need their own integration cases.
