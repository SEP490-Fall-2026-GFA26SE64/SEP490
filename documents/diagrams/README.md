# Architecture diagrams

Updated 2026-10-23 from a read-only, repeatable-read snapshot of the existing local PostgreSQL17.6 service. Source V1-V23 and all23 successful Flyway checksums match. No migration, seed, learner write or executable test was run for regeneration.

## Current PostgreSQL V23

86 `platform` tables,703 columns,610 constraints (185 foreign keys),207 indexes,97 user triggers and39 functions. Every table/column belongs to exactly one detail group. External reference stubs show cross-group parent tables. Arrows run from referenced parent to referencing child; they do not assert one-to-one/mandatory cardinality. Composite FK details remain in the [complete FK inventory](postgresql-foreign-keys.md) and [metadata catalog](postgresql-schema-catalog.json), including defaults, checks, uniqueness, indexes and trigger/function definitions. No business data rows or credentials are captured. `public.flyway_schema_history` is migration metadata, outside the86 platform tables.

| View | Tables owned | Source | SVG |
| --- | ---: | --- | --- |
| Overview and cross-group FK counts |86 total | [source](postgresql-overview.puml) | [image](postgresql-overview.svg) |
| Identity, catalog, processing |17 | [source](postgresql.puml) | [image](postgresql.svg) |
| Legacy assessment/shared learning |32 | [source](postgresql-assessment.puml) | [image](postgresql-assessment.svg) |
| Recommendation, analytics, evaluation |13 | [source](postgresql-pathway.puml) | [image](postgresql-pathway.svg) |
| Adaptive Blueprint/activation/receipts |9 | [source](postgresql-adaptive-blueprint.puml) | [image](postgresql-adaptive-blueprint.svg) |
| Adaptive attempts/results/evidence |9 | [source](postgresql-adaptive-attempt.puml) | [image](postgresql-adaptive-attempt.svg) |
| IRT/mapping/scoped promotion |6 | [source](postgresql-irt.puml) | [image](postgresql-irt.svg) |

![Current PostgreSQL storage overview](postgresql-overview.svg)

The three former V17 sources/SVGs have been regenerated in place; the extra24 V18/V19/V23 tables are now included in three separate detailed views. These diagrams inventory existing storage, including retained legacy/other-owner tables. They do not approve unused product functionality or establish authorization, numerical/concurrency correctness or executable acceptance.

## Reproduce without database changes

Run from the repository root with the existing postgres service already running:

```powershell
python documents/diagrams/Generate-PostgresqlDiagrams.py
# Or regenerate from the captured catalog, without Docker/database access:
python documents/diagrams/Generate-PostgresqlDiagrams.py --snapshot documents/diagrams/postgresql-schema-catalog.json
# Use an existing locally downloaded PlantUML JAR; explicit list excludes historical target:
java -jar path/to/plantuml.jar -failfast2 -tsvg documents/diagrams/postgresql.puml documents/diagrams/postgresql-assessment.puml documents/diagrams/postgresql-pathway.puml documents/diagrams/postgresql-adaptive-blueprint.puml documents/diagrams/postgresql-adaptive-attempt.puml documents/diagrams/postgresql-irt.puml documents/diagrams/postgresql-overview.puml documents/diagrams/runtime-topology.puml
```

The [PowerShell wrapper](Generate-PostgresqlDiagrams.ps1) invokes the same Python generator. It never starts containers, migrates, seeds or resets data. Unknown/missing/duplicate table groups or source/history checksum drift stop generation. All metadata is taken in one READ ONLY transaction. SVGs use PlantUML1.2025.10/Smetana, matching the existing diagram toolchain; see [review/provenance](../testing/system/REQ-002-memory-schema-sync.md).

## Other diagrams and historical drawing

- Current [runtime topology source](runtime-topology.puml) / [SVG](runtime-topology.svg): Java/Spring Boot API; PostgreSQL-only migration; existing official Neo4j; explicit local-demo provisioning.
- Neo4j [source](neo4j.puml) / [SVG](neo4j.svg): ontology0.8.0, six entity labels/seven relationship types. LearningModule TEACHES exactly one MicroSkill; only MicroSkill has prerequisite self-links. No learner mastery/pathway state in Neo4j. This review does not claim a fresh graph-data validation.
- [20 October adaptive target source](postgresql-adaptive-baseline-target.puml) / [SVG](postgresql-adaptive-baseline-target.svg) is retained as **superseded historical design**, including old Role/exploration bounds. Use current V23 views and [adaptive data contract](../features/Baseline%20knowledge%20assessment/Adaptive%20Baseline%20Data%20Architecture.md), not that target, for current work.
