# REQ-013 / REQ-014 — merged persistence verification

2026-11-01. Initial run status: **Partial; environment setup failures retained below**. The sequential retest later on this date passed all10 real-store cases.

| Suite | Actual result |
| --- | --- |
| LearningContentIntegrationTest | **Passed1/1**, real disposable PostgreSQL17.6; historical module/content migration followed by V42, retained content/progress and current adapter assertions. |
| GeneratedModuleContentAccessTest | **Passed1/1**, mocked module port; exact content-version admission/internal-gate guards. This is a unit bridge check, not real-store evidence. |
| QuestionBankPersistenceIntegrationTest | **Setup error**, PostgreSQL Testcontainer did not reach its ready-log condition in time. No business assertion pass/failure is inferred. |
| InitialPathwayAdapterIntegrationTest | **Setup error**, PostgreSQL container readiness timeout before the suite could run. |
| ModuleAuthoringIntegrationTest | **Interrupted**, the first combined runner was stopped during Neo4j startup to reduce contention with the browser stack. No current pass is claimed. |

The lighter Maven run reported4 executions:2 passed and2 setup errors,0 assertion failures. The one real PostgreSQL pass must not be presented as complete aggregate/ownership certification.

Execution: JDK21, Docker Desktop (about3.8GiB VM memory), `DOCKER_HOST=unix://$HOME/.docker/run/docker.sock`, cached dependencies, explicit Mockito Java agent and selected suites above. Logs: `/tmp/sep490-backend-ui-merge/backend-integration.log` (interrupted combined attempt) and `backend-integration-pg.log` (completed lighter run). Current XML results remain under backend/target/surefire-reports.

All test stores are independent of accounts-dev. No8088 database, Neo4j graph or asset data was migrated, reset or reseeded. Compose test PostgreSQL/Neo4j were stopped afterward with volumes retained; Testcontainers own their disposable containers.

Next gate: rerun QuestionBankPersistenceIntegrationTest, InitialPathwayAdapterIntegrationTest and ModuleAuthoringIntegrationTest sequentially when Docker/database responsiveness is stable. Do not weaken business assertions or use8088 as disposable test storage.

The earlier migration-only5-case run is recorded separately in [migration evidence](REQ-014-016-migration-lineages.md); it does not certify business aggregate persistence for this phase.

## Sequential real-store retest — 2026-11-01

All **10/10 passed**,0 failures/errors/skips. No business assertion, migration checksum or production timeout was changed. JDK21, explicit Mockito agent, Docker Desktop3.8GiB; heavy suites ran sequentially.

| Suite | Cases | Real boundary / actual outcome |
| --- | ---: | --- |
| QuestionBankPersistenceIntegrationTest | 1 | PostgreSQL17.6: workspace35→42, retained applied checksums/legacy definitions, automatic codes, atomic publication/import, organization/owner/history/retirement and rollback checks. Passed at11:57. Catalog fault injection remains mocked, not Neo4j integration evidence. |
| LearningContentIntegrationTest | 1 | PostgreSQL17.6: historical module35→42, retained legacy content, settings/assets metadata, pins/progress/notifications and isolation. Passed at11:58. No MinIO binary round-trip claim. |
| InitialPathwayAdapterIntegrationTest | 6 | PostgreSQL17.6: workspace34→42/checksum/receipt retention, actor/tenant keys, rollback, caller replay, concurrent uniqueness and history constraints. Passed at11:59. Not a full planner/review journey. |
| ModuleAuthoringIntegrationTest | 2 | Disposable PostgreSQL17.6 + Neo4j5.26: complete module/TEACHES fields, graph-only intake, immutable revisions/history, grants/ownership, projection guards and retries. Passed at12:06;418.6s including two cold graph starts. |

Commands from backend: offline Maven with `-DargLine=-javaagent:<local Mockito5.17.0 jar>` and respectively `-Dtest=QuestionBankPersistenceIntegrationTest`, `-Dtest=InitialPathwayAdapterIntegrationTest,LearningContentIntegrationTest`, `-Dtest=ModuleAuthoringIntegrationTest`, then `test`. Environment: JDK21; `JAVA_TOOL_OPTIONS='-XX:ActiveProcessorCount=2 -Xmx512m'`; Docker socket configured explicitly. These are three completed runs, not parallel aggregate runs.

Logs: `/tmp/sep490-backend-ui-merge/database-retest-qb.log`, `database-retest-pathway-content.log`, `database-retest-module.log`. Matching current JUnit XML: `backend/target/surefire-reports/TEST-<suite-qualified-name>.xml`. Testcontainers disposed their stores. Existing accounts-dev was not used as disposable test storage.

Separately, the actual accounts database passed read-only Flyway validation for42 installed migrations with0 pending. The old compatibility JAR workspace SQL and new product module SQL matched byte-for-byte42/42. This validation called no migrate/repair. Startup later also reported V42/no migration. Deployment side effects and recovery are tracked honestly in [system evidence](../system/REQ-013-014-merge-resolution.md).
