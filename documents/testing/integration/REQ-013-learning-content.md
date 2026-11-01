# Learning Content — integration evidence

Date: 2026-10-29. Separate disposable PostgreSQL Testcontainers; preserved dev/legacy volumes are not test reset targets.

`sh backend/mvnw -f backend/pom.xml '-Dtest=LearningContentIntegrationTest' test -q`

- **Passed:** V1–V35 migration and field persistence/isolation test.
- **Passed rerun:** migrate through V35, insert legacy snapshots, then apply V36. Original body, creator/null historical content author, revision number and history remain intact; one stable Text lesson is added.
- Actual field round trips cover global limits/version/audit, private asset owner/key/name/type/size/hash/duration/time, retained over-limit media, lesson position/intervals/end/completion/update/resume, and unique/read/organization-scoped notifications.
- An initial run failed because stale generated `target/classes` contained pre-merge duplicate migration V8. Tests now resolve the current source migration directory; no migration identity was rewritten or repaired.

Final focused integration run: **3 passed** (`ModuleAuthoringIntegrationTest` 2 + `LearningContentIntegrationTest` 1), using disposable PostgreSQL and Neo4j Testcontainers. Current migrations V1–V38 applied; V36 preserves legacy snapshot history and V37 persists fractional video duration; V38 maps a separate non-null coverage timing anchor, preserving all existing progress. Existing Module release/projection tests passed alongside content persistence.

Actual MinIO upload/range, atomic Excel/ZIP imports, same-organization pathway admission and SMTP capture are exercised against the Compose runtime and recorded in [system evidence](../system/REQ-013-learning-content.md), rather than claimed from mocked ports.

V35–V38 are forward-only and tested in disposable containers and applied to the dedicated dev-accounts database; V38 local deployment is recorded in system evidence. The old `module-authoring-test` migration lineage is untouched.
