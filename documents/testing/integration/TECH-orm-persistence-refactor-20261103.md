# TECH — Persistence refactor to Spring Data JPA / Spring Data Neo4j / ModelMapper: integration evidence

Date: 2026-11-02 → 2026-11-03. Scope: technical refactor of the backend persistence layer (no product REQ; no schema, API or graph-schema change). Architecture summary: [Persistence layer](../../ARCHITECTURE.md#persistence-layer-orm-2026-11-03).

Environment: Windows 11, JDK 21, Maven wrapper, Docker Desktop; Testcontainers PostgreSQL 17 and Neo4j 5.26. Every full run used `.\mvnw.cmd -B clean verify` (offline `-o` for intermediate runs) from `backend`, in a separate git worktree checked out at the commit under test.

## Full `clean verify` per phase

| Commit | Phase | Tests | Failures / errors | Result |
| --- | --- | --- | --- | --- |
| 998f675 | Baseline before refactor | 659 | 0 / 0 | BUILD SUCCESS (22.3 min) |
| d9ea21d | 1 infrastructure (2 transaction managers, SDN, ModelMapper) | 666 | 0 / 0 | BUILD SUCCESS |
| 8fb60a0 | 2a identity / registration | 670 | 0 / 0 | BUILD SUCCESS |
| 8fe0334 | 2b catalog-import lease | 673 | 0 / 0 | BUILD SUCCESS |
| 7faa215 / ee73d68 | 2b plans, workspaces, payments, mail workers; 2d question bank | 674 | 0 / 0 | BUILD SUCCESS |
| edac926 → c570148 | 2c assessment, blueprint, attempts, baseline management, IRT calibration | 677 → 684 | 0 / 0 | BUILD SUCCESS |
| e62c9be | 2e learning modules / content | 684 | 0 / 0 | BUILD SUCCESS |
| 79b71ba / d03cad7 | 2f pathway/profile/selection; seeds, fixtures, importer | 685 | 0 / 0 | BUILD SUCCESS |
| 243a68c / fefb5cf / b8af74c | 3a–3c Neo4j on Spring Data Neo4j | 690 → 694 | 0 / 0 | BUILD SUCCESS |
| 4966a5a | 4a domain models moved to `entities.domain` | 695 | 0 / 0 | BUILD SUCCESS |
| 4169742 | 4b–4c DTO-only controllers + ModelMapper | 754 | 0 / 0 | BUILD SUCCESS |
| 26d6d54 | 5 auto-commit catalog reads, dependency cleanup | 754 | 0 / 0 | BUILD SUCCESS (21:44 min, online `clean verify`) |

No existing test was deleted or loosened; replaced constructor wiring keeps every original assertion.

## New integration tests

| Test | What it proves | Result |
| --- | --- | --- |
| `JpaSchemaValidationIntegrationTest` | Hibernate `ddl-auto: validate` boots against the canonical, workspace and module Flyway lineages | Passed (3) |
| `PersistenceConfigurationIntegrationTest` | Both transaction managers exist and are selected by name; JPA and SDN repositories join their own transactions | Passed |
| `InsertOnlyRepositoryIntegrationTest` | `InsertOnlyRepository` persists and flushes immediately, surfacing constraint/trigger violations in the caller's transaction | Passed |
| `WorkspaceCatalogImportLeaseIntegrationTest` | `FOR UPDATE SKIP LOCKED`: a locked job is skipped without blocking; 2 workers × 10 rounds never claim the same job; a stale lease owner cannot commit, retry or fail | Passed |
| `CalibrationPersistenceIntegrationTest` | Concurrent calibration claims have one winner; stale owners cannot complete or fail; cancellation; cross-organization invisibility; promotion with receipt + audit and rejected double promotion | Passed (4) |
| `AssessmentPolicyPersistenceIntegrationTest` | Policy save/activate with the database ACTIVATE receipt trigger; organization scoping | Passed |
| `Neo4jCatalogTenantIsolationIntegrationTest` | SDN writes for organization B on an id owned by A throw `CrossTenantWriteException` and leave A's nodes, properties and relationships untouched; relationships never join two organizations; module/catalog lists issue one Cypher statement | Passed (5) |
| Added cases in existing suites | Payment concurrency; member activation isolation; blueprint `versionStatus`; baseline management store and organization-scoped drafts; module/content/grant/pin/notification isolation; selection/profile/pathway/review isolation; workspace catalog copy never touching another workspace and stable batch count | Passed |

Seed parity (throwaway tests, deleted after the run): PostgreSQL development/workspace/software-development/demo seeds and the Neo4j catalog bootstraps were executed with the old JDBC/driver code and the new repositories on fresh containers; rows, nodes, properties, relationships, constraints and indexes were identical and re-runs were idempotent.

## Retained native SQL / driver usage

Each native query carries an in-code reason. Categories: row locks (`FOR UPDATE [OF] [SKIP LOCKED]`, `FOR SHARE`), fenced lease updates, `ON CONFLICT` idempotency and seeds, `clock_timestamp()`/`now()` scheduling, `DISTINCT ON`, `LATERAL`/jsonb path filters, `set_config` timeouts and `SET CONSTRAINTS ... IMMEDIATE`. `JdbcCalibrationWorker` keeps a dedicated JDBC connection for its session-level `pg_try_advisory_lock`; `Neo4jQuestionBankSkillReader` keeps the driver's async session so a stalled graph call cannot hold the caller's PostgreSQL transaction past its deadline.

## Other tiers

[Unit/architecture evidence](../unit/TECH-orm-persistence-refactor-20261103.md). [System smoke and performance](../system/TECH-orm-persistence-refactor-20261103.md).
