# REQ-060/061: Exact starter catalog persistence

Date: 2026-11-12. Local Docker Desktop; real PostgreSQL and Neo4j Testcontainers. No shared development volume reset.

## Results

| Suite | Tests | Failures / errors / skips | Exit |
| --- | ---: | --- | ---: |
| `WorkspaceCatalogImportNeo4jIntegrationTest` | 5 | 0 / 0 / 0 | 0 |
| `RegistrationPostgresIntegrationTest` | 22 | 0 / 0 / 0 | 0 |
| `WorkspaceCatalogImportLeaseIntegrationTest` | 3 | 0 / 0 / 0 | 0 |

These **30 tests** are part of the final 45-test backend run described with its exact [commands and build limitations](../unit/REQ-060-061-starter-catalog-20261112.md).

## Coverage

| Acceptance | Real assertion |
| --- | --- |
| Explicit, pruned selection persists | Registration saves deduplicated node ids plus template version/hash; excluded module ids create no registration/account; empty catalog creates no selection row |
| Exact copy, no hidden limits | Actual node and edge counts equal the service closure; a larger fixture retains five competencies and six skill requirements on a role, exceeding the former 2/3 cutoffs |
| No invented knowledge | Extra requirements retain `ADVANCED` even on the fixture's Junior level; role projections derive from copied requirement edges rather than level-name guesses |
| No learning content import | Copied organization contains neither LearningModule nor Certificate nodes |
| Idempotency and provenance | Repeating the same copy leaves the same deterministic organization/source ids and counts; template version, required metadata and existing review state are preserved |
| Isolation and rollback | Two organizations receive distinct ids; copying into B leaves A unchanged; foreign-id collision rolls the entire attempted copy back |
| Truthful import state | Worker succeeds only after copy; invalid roots fail; transient copy failures retry/back off and exhaust to failure |
| Concurrency | Real PostgreSQL leases skip locked jobs and prevent two workers from claiming the same job |

Infrastructure: PostgreSQL `17.6-alpine`; Neo4j `5.26-community` (resolved local image reports 5.26.30). Tests use unique organization ids and disposable containers. Failure-injection worker/mail warnings are expected test cases, not unexpected runtime errors.

The separate [browser receipt](../system/REQ-060-061-starter-catalog-20261112.md) additionally checks saved PostgreSQL ids and exact Neo4j source-node/source-edge sets after actual registration, development payment bypass, provisioning and reload. API previews or mock ports alone are not used as persistence proof.
