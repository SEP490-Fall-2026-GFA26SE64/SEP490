# Test Documentation

Keep runnable tests next to their code (`backend/src/test/java` and future frontend tests); use these folders for function-level cases and evidence. A drafted function is not an implemented or passing test. The feature IDs and open decisions are tracked in [../features/README.md](../features/README.md).

| Level | Plan | Present evidence |
| --- | --- | --- |
| Function/unit | [unit/README.md](unit/README.md) | Spring-independent status service, Spring Security/controller checks, ArchUnit boundaries |
| Integration | [integration/README.md](integration/README.md) | Flyway/PostgreSQL and Neo4j/Testcontainers repeatability and constraint checks |
| System | [system/README.md](system/README.md) | Compose startup and browser-facing status proxy smoke checks; feature workflows pending |

For every new function, record its `REQ-nnn-Fnn` ID, approved acceptance rule, test data and tenant scope, expected outcome, test file, and last run result. Do not mark a function covered solely because its database table exists.