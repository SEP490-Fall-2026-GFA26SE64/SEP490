# Single-Skill Module integration — 2026-11-05

FR-05.05 / legacy REQ-013, REQ-016 and FR-06.08 learning prerequisite subset. [API and migration contract](../../technical/Skill-Learning-Eligibility.md).

## Actual environment and command

Java 21, Maven wrapper, Testcontainers with Docker Desktop socket. Mockito explicit javaagent as recorded in the [unit receipt](../unit/REQ-013-016-single-skill-eligibility-20261105.md). Selected classes: `SkillLearningPostgresIntegrationTest,SingleSkillCatalogIntegrationTest`. PostgreSQL 17.6 and Neo4j 5.26 ephemeral containers; no main-dev/accounts-dev stores used.

| Acceptance | Actual result |
| --- | --- |
| INT-01: all three supported Flyway lineages migrate 49→50→51 | Passed. A single PostgreSQL integration method exercises each lineage independently. Fully completed approved historical single-Skill release backfills with original revision/contentVersion/real completion time; partial, multi-Skill and draft histories do not. |
| INT-02: immutable original evidence and replay | Passed. JPA roundtrip, required values/permitted nulls, tenant/learner isolation, idempotent insert and migration rerun; database refuses proof updates/deletes. |
| INT-03: fresh Neo4j 0.12 import and planner boundary | Passed. Exact 994 nodes/4,703 relationships/246 TEACHES, singleton targets and no retired properties; re-import idempotent; additional mapping causes drift refusal. New planner offers have null retired metadata with explicit new policy. |
| INT-04: actual forward Python migration | Passed. Test seeds the exact retained 0.11 JSON, invokes `upgrade_neo4j_v012.py --apply` against container HTTP with a private temporary backup, then checks backups and exact 0.12 readback through the real bootstrap verifier. |

**3 integration methods passed, zero failures/errors/skips** (PostgreSQL method covers three lineages; two Neo4j methods). [Latest Neo4j/package log](../system/assets/single-skill-learning-20261105/logs/package-and-graph-final.log), [PostgreSQL log](../system/assets/single-skill-learning-20261105/logs/postgres-final.log).

## Preserved earlier failure and limits

The first forward-migration fixture tried the existing old bootstrap and was refused because the retained 0.11 file does not match its known historical byte pins. The fixture now imports that exact retained JSON directly before testing the approved forward migration. The old production drift guard was not weakened. [Failure log](../system/assets/single-skill-learning-20261105/logs/upgrade-fixture-legacy-pin-failure.log).

The real main-dev and accounts-dev databases were not migrated. Ambiguous historical multi-Skill completions remain ineligible until a separate reconciliation decision; the migration does not fabricate provenance. Missing dataset coverage is reported, not filled with invented content. These checks do not verify the separately owned Skill Assessment engine.
