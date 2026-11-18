# REQ-013 — responsible Expert persistence, 2026-11-18

**Passed:** ModuleResponsibilityPersistenceTest, 1 integration scenario, zero failures/errors/skips, using disposable PostgreSQL 17.6 via Testcontainers. This did not touch a running application database.

The test executes V70 against seed-owner, explicit-owner and null-creator rows, executes it again to check idempotent data mapping, and verifies preserved seed/null/explicit ownership. The real ModuleAuthoringService uses a small test port backed by PostgreSQL JSONB reads/writes and Spring transactions with SELECT FOR UPDATE. Two threads transfer the same version concurrently: exactly one succeeds and the other returns 409. Reload retains the creator, released snapshot, prior-owner audit and Manager identity. A simulated write failure after SQL update rolls back the owner and history together.

The test port supplies isolated actor/eligible-target fixtures; it does not certify the full JPA directory/session/CSRF boundary or the complete Flyway chain. Production JPA code was compiled; no graph projection or schema property change was needed.

Command: `JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home bash backend/mvnw -o -f backend/pom.xml '-Dtest=ModuleResponsibilityPersistenceTest' '-DargLine=-javaagent:/Users/nguyenan/.m2/repository/org/mockito/mockito-core/5.17.0/mockito-core-5.17.0.jar' surefire:test`, after isolated test compilation documented in [unit evidence](../unit/REQ-013-responsibility-transfer-20261118.md). Docker access was authorized for this disposable check. Duration: 31.888 seconds; test body: 25.41 seconds. Session log: `/tmp/sep490-module-owner/integration.log`.

V70 exists in all three supported migration directories. It has not been applied to the user's running database in this task. Existing JSON documents also retain runtime fallback to recorded createdBy until migrated.
