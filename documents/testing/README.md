# Test Documentation

Keep runnable tests next to their code (`backend/src/test/java` and future frontend tests); use these folders for function-level cases and evidence. A drafted function is not an implemented or passing test. The feature IDs and open decisions are tracked in [../features/README.md](../features/README.md).

| Level | Plan | Present evidence |
| --- | --- | --- |
| Function/unit | [unit/README.md](unit/README.md) | Spring-independent status service, Spring Security/controller checks, ArchUnit boundaries |
| Integration | [integration/README.md](integration/README.md) | Flyway/PostgreSQL and Neo4j/Testcontainers repeatability and constraint checks |
| System | [system/README.md](system/README.md) | Compose/API workflows plus scoped Playwright browser scenarios; production-owner integration remains feature-specific |

For every new function, record its `REQ-nnn-Fnn` ID, approved acceptance rule, test data and tenant scope, expected outcome, test file, and last run result. Do not mark a function covered solely because its database table exists.

Active function plans:

- [REQ-001-F01 View Target Roles](REQ-001-F01-view-target-roles.md) — domain/application, API/security, Neo4j integration and frontend suites passed; the shared REQ-001 Playwright flow passed catalog/detail, while browser-only search/filter/recovery coverage remains partial.
- [REQ-001-F02 Choose Target Role](REQ-001-F02-choose-target-role.md) — Cluster 2 T1–T6 complete/pass plus pre-Cluster-4 cleanup: clean backend 84 tests, frontend 30 tests, T4 eight tests, two-role Compose API concurrency/guard checks, and two Playwright/Chrome browser/API scenarios. Real Identity/Catalog/Assessment/Pathway adapters remain provisional, so F02 is not production Done.
