# Graph Migrations

The initial Cypher migration creates version-pair uniqueness constraints for JobDomain, TargetRole, MacroCompetency, MicroSkill and LearningModule, release/source/event/availability uniqueness, code lookup indexes and release-scoped semantic relationship indexes. No business nodes or relationships are seeded.

The backend packages these files at `db/neo4j`. `GraphSchemaMigrator` runs the explicit ordered migration list only in the one-shot `local,migrate` job. Each nonblank line must be one terminated `CREATE CONSTRAINT` or `CREATE INDEX` statement. This is deliberately a schema-only bootstrapper, not a general Cypher/data migration interpreter. Add new filenames to its ordered list for future schema releases; never modify an applied migration. SHA-256 checksums normalize CRLF to LF for Windows/Linux parity.

The runner creates the SchemaMigration uniqueness constraint, applies idempotent DDL, waits for indexes and then records the checksum. A failure before recording can rerun safely. The initialization job serializes graph schema work using a PostgreSQL session advisory lock; all deployment migration writers must use that job. SQL Flyway and Neo4j operations remain separate, so a graph failure does not roll SQL back. Run the same initializer again after correcting a transient failure; never clear histories to force it through.

Neo4j Community uniqueness constraints do not require properties to exist. The future catalog publication use case must require UUID/version/release properties, valid endpoint types, per-release relationship uniqueness, finite weights, approved evidence policies, nonempty module requirements, complete DAG validation and immutable published manifests. These are not enforced by these DDL statements. `HAS_SKILL` remains many-to-many. No IPE weights, prerequisite thresholds or algorithm defaults are seeded.

See [database initialization](../../README.md) for lifecycle and connection details.