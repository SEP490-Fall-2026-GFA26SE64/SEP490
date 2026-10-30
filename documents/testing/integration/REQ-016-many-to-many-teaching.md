# REQ-016-F01/F02 — many-to-many Neo4j integration evidence

Date: 2026-10-26. Fixture: full source-backed v09 release in a disposable Neo4j5.26 Community Testcontainer. No shared operational graph is modified.

`Neo4jManyToManyCatalogIntegrationTest`: **1 passed**, zero failures/skips. Imports833 nodes/4638 relationships. Every entity property and every relationship endpoint/property round-trips exactly after intentionally absent null review fields. No architecture-defined non-null field is dropped. Both multi-skill Modules and multi-provider skills exist; both orphan queries return0.

The new baseline snapshot verifies against the persisted graph using the real OfficialQuestionBankCatalog adapter. Adding a duplicate teaching relationship then causes exact snapshot verification to fail. The adapter's drift checks were retained, not weakened to accept the new cardinality.

PostgreSQL has no schema/relationship change in this task. Its insert-only135-item baseline seed/readback is exercised through Compose, including rerun; see [system evidence](../system/REQ-016-many-to-many-teaching.md). Tests do not certify the separate future Module authoring/publication/authorization workflow or production content approval.
