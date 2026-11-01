# REQ-013/016 — v0.11 import integration evidence

2026-10-28. The user-authorized live local upgrade used the guarded upgrade tool against the explicitly identified Compose databases. The complete catalog and protected authored extras were compared in the same Neo4j transaction before commit, then verified again after commit/restart. The idempotent follow-up plan reports zero writes. Recovery files and hashes are in the [upgrade receipt](../../dataset/NEO4J_V011_LOCAL_UPGRADE.md).

PostgreSQL preservation: complete dump validated by `pg_restore --list`; all **94 platform tables** retain identical counts and row hashes before/after import, bootstrap and API restart. Graph property readback is exact: source v11 subset 994 nodes/5121 relationships, plus 13 protected authored Modules and 13 protected TEACHES pairs.

Bootstrap regression command in backend: `env DOCKER_API_VERSION=1.51 bash mvnw -q -Dtest=ExistingQuestionBankBootstrapIntegrationTest,HexagonalArchitectureTest package`. **1 PostgreSQL Testcontainers test + 3 architecture rules passed**, no failures/errors/skips; integration 10.407s, architecture 3.186s. PostgreSQL 17.6 applied V1–V27 in the disposable test database. Checks absent bank produces no account writes; an unchanged 135-item bank verifies without changes; conflicting/missing items are rejected without repair; inactive owner is denied. Packaging passed.

The initial local seed rerun failed its old v09 graph check after successful import. The read-only existing-bank verification fixed this startup dependency; the rebuilt seed subsequently exited 0. This does not repin or newly approve historical banks or learner evidence.
