# REQ-013 — R4 integration evidence

2026-10-29. Separate disposable databases; no reset of development/legacy volumes.

- `ModuleAuthoringServiceTest,ModuleAuthoringIntegrationTest,LearningContentIntegrationTest`: **14 service checks +1 PostgreSQL integration passed;2 integration errors**. Both errors occurred during disposable Neo4j startup, before application assertions, after the five-minute startup limit.
- Neo4j retry with bounded JVM CPU/heap also timed out during startup. The remaining disposable-test JVM was deliberately terminated with SIGTERM to release resources; this is not a passing run or a product JVM crash. Only this task's temporary containers were eligible for Testcontainers cleanup.
- LearningContentIntegrationTest passed all current V1–V38 migration/persistence checks. R4 adds no SQL migration and no Neo4j property or relationship.
- The changed Module integration scenario creates content and Module with omitted Occupation, asserts empty historical metadata after real persistence, checks peer/foreign access denial and existing publication/revision behavior. A source change/test definition alone is not a passing result; its final execution status remains pending/blocked here.
- Direct development checks after resource load settled: real Expert password login200 in5.2s; read-only Neo4j HTTP MicroSkill count79 with200/no errors in2s. These diagnostics do not replace the disposable Neo4j integration gate.

## Final affected integration result

The final isolated run of `ModuleAuthoringIntegrationTest#roundTripsAllFieldsRevisionsGrantsAuditPinsAndRetriesAcrossRealStores` **passed** with real disposable PostgreSQL/Neo4j, after browser/build tasks finished. Neo4j started in 66.6 seconds. Content and Module were created with omitted Occupation, historical metadata was empty, peer/foreign access remained denied, and revision/publication/archive/pin/audit field round trips passed. Together with LearningContentIntegrationTest, **2 affected store-integration scenarios passed** across focused runs.

The earlier full two-test catalog suite had startup errors and is retained above; this is not a claim that its unrelated graph-catalog-read scenario was revalidated in the final run. JVM CPU/heap limits constrain only test startup/resources, not business assertions. No development/legacy volume was deleted.
