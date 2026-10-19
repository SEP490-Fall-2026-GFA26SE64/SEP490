# Architecture Diagrams

## Current Scope Alignment

The [System Overview](../adapt_learn_graph_system_overview.md) controls product scope; [architecture](../ARCHITECTURE.md) distinguishes revised responsibilities from the recorded technical baseline. These database/runtime diagrams inventory existing storage, not an approved model for all new capabilities. Legacy organization/billing/evaluation structures do not reinstate excluded SaaS functionality.
Discipline membership/assignments, module/content storage, L&D role publication/offering approval, RIASEC/reviewed role guidance and independent progress need agreed mappings before regenerating schema diagrams. Documentation alignment does not change migrations or generated images.

## Technical Baseline Snapshot

These PlantUML sources back the diagrams in [../ARCHITECTURE.md](../ARCHITECTURE.md). The SVGs alongside them are generated for Markdown viewers. The three PostgreSQL sources and SVGs were regenerated from a clean PostgreSQL 17.6 database after Flyway V1-V17 applied successfully (62 `platform` tables). They show structural columns and same-group foreign keys, not indexes, checks, cross-group links or trigger bodies; use the migrations for those details.

| Diagram | Source | Rendered image |
| --- | --- | --- |
| Runtime topology | [runtime-topology.puml](runtime-topology.puml) | [runtime-topology.svg](runtime-topology.svg) |
| PostgreSQL identity, catalog, processing | [postgresql.puml](postgresql.puml) | [postgresql.svg](postgresql.svg) |
| PostgreSQL assessment and learning | [postgresql-assessment.puml](postgresql-assessment.puml) | [postgresql-assessment.svg](postgresql-assessment.svg) |
| PostgreSQL pathway, analytics, evaluation | [postgresql-pathway.puml](postgresql-pathway.puml) | [postgresql-pathway.svg](postgresql-pathway.svg) |
| Neo4j occupation-based ontology 0.7.0 | [neo4j.puml](neo4j.puml) | [neo4j.svg](neo4j.svg) |

The generator lists all 62 V17 tables. Use a clean migrated PostgreSQL instance to regenerate sources from `pg_catalog`, then render the three PostgreSQL SVGs with PlantUML 1.2025.10 or newer. It rejects a schema with missing or additional tables rather than silently omitting them:

```powershell
docker compose -f compose.dev.yml up -d postgres neo4j
docker compose -f compose.dev.yml run --build --rm migrate
powershell -NoProfile -ExecutionPolicy Bypass -File .\documents\diagrams\Generate-PostgresqlDiagrams.ps1
java -jar path\to\plantuml.jar -tsvg documents/diagrams/postgresql.puml documents/diagrams/postgresql-assessment.puml documents/diagrams/postgresql-pathway.puml
```

Run these commands from the repository root. PostgreSQL groups cover every table and column; they draw only foreign keys whose endpoints are within the same group. The Neo4j view shows six entity types and seven relationship types for ontology 0.8.0. LearningModule TEACHES MicroSkill is exactly one-to-one; only MicroSkill has prerequisite self-links. SVG and PNG are generated from neo4j.puml using PlantUML 1.2025.10.

The assessment view includes the V14-V16 management tables and current V17 columns. V17 only changes a trigger function, which a table diagram cannot depict. The diagrams do not encode the V14 tenant-scoped unique index; consult the migration and [architecture text](../ARCHITECTURE.md) for behavioral rules.
