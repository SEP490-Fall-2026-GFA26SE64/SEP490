# REQ-013/016 module management — integration evidence

Historical run before shared-login correction (2026-10-28): `ModuleAuthoringIntegrationTest` passed **one complete real-store journey, 0 failures/errors/skips**, in 133.556 seconds. It additionally asserts that real Neo4j coverage prevents archiving the last required primary provider before an alternative is approved. Initial execution also passed (436.533 seconds during concurrent Docker builds); the final fixture bounds Neo4j heap/pagecache for the small Docker VM.

Fixture: disposable `postgres:17.6-alpine` and `neo4j:5.26-community` Testcontainers. Applies V27 to an isolated platform schema; does not claim testing the complete V1–V27 upgrade chain in this test. Uses one Occupation, two MicroSkills, Expert A/B, L&D reviewer, existing/new learner and a foreign organization query boundary. No development database is used.

Assertions cover durable grants and grant audit, content storage, complete document round-trip, a different editor with unchanged creator, submission/approval, all 13 node properties and all 8 relationship properties on real Neo4j records, an alternative primary provider, pinned learning after archive, blocked unpinned learning after archive, restore-to-draft and revoked Expert access. Publication updates are real graph transactions, not repository mocks.

Final command in backend: `env DOCKER_API_VERSION=1.51 bash mvnw -q -Dtest=ModuleAuthoringServiceTest,ModuleAuthoringIntegrationTest,HexagonalArchitectureTest test`. Docker access required running outside the filesystem sandbox. Total **11 backend tests passed** in that run: 7 service + 1 integration + 3 architecture. Full-stack migration/browser coverage is tracked in system evidence.

## Shared-login correction — 2026-10-28

The fixture now includes active/inactive and foreign-organization account roles, verifies that the Expert picker uses persisted active organization accounts, and retains the complete graph/revision/pin journey. First rerun: 1 setup error, Neo4j container startup timeout before business assertions. Startup timeout was increased to five minutes for the constrained local Docker VM; the rerun result is recorded below when complete. No application schema/migration change is required.

Rerun passed: `env DOCKER_API_VERSION=1.51 bash mvnw -q -Dtest=ModuleAuthoringIntegrationTest test`, 1 test, 0 failures/errors/skips, 296.440 seconds. The earlier timeout was a setup failure; it is not counted as a passing execution.

## Neo4j list correction — 2026-10-28

`ModuleAuthoringIntegrationTest#readsGraphCatalogWithoutAuthoringHistoryAndMapsEverySchemaField` passed: **1 test, 0 failures/errors/skips**, 82.967 seconds, using disposable PostgreSQL 17.6 and Neo4j 5.26. Verifies all 13 stored Module properties and all 8 TEACHES properties, endpoint ID/name, actual duration/price/content version, nullable historical values, nodes without mappings, legacy organization compatibility, filters, zero authoring rows created by listing, and no fabricated history. The existing full publication/pin journey was not rerun for this read-only correction; its prior evidence and timeouts remain separate.
