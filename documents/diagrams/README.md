# Architecture Diagrams

**Slices4–5,2026-10-22:** common UI and pinned full/legacy result/history source implemented; no schema/diagram regeneration or executable acceptance. [Evidence and unverified browser checklist](../testing/system/REQ-002-F02-REQ-009-occupation-ui-results.md).

**2026-10-22 slices2–3:** no schema change beyond retained V20–V22; admission locks and management read projection are documented in the [current contract](../features/Baseline%20knowledge%20assessment/Occupation%20Baseline%20Lifecycle%20and%20Transition.md). V17 diagrams remain historical and were not regenerated from user data.

## Current Scope Alignment

The [System Overview](../adapt_learn_graph_system_overview.md) controls product scope; [architecture](../ARCHITECTURE.md) distinguishes revised responsibilities from the recorded technical baseline. These database/runtime diagrams inventory existing storage, not an approved model for all new capabilities. Legacy organization/billing/evaluation structures do not reinstate excluded SaaS functionality.
Discipline membership/assignments, module/content storage, L&D role publication/offering approval, RIASEC/reviewed role guidance and independent progress need agreed mappings before regenerating schema diagrams. Documentation alignment does not change migrations or generated images.

## Technical Baseline Snapshot

These PlantUML sources back the dated diagrams in [../ARCHITECTURE.md](../ARCHITECTURE.md). The SVGs alongside them are generated for Markdown viewers. The three PostgreSQL sources/SVGs record the historical clean PostgreSQL 17.6 V1–V17 snapshot (62 tables); they are not a fresh live-schema assertion. They show structural columns and same-group foreign keys, not indexes/checks/triggers. The adaptive baseline drawing is the superseded20 October manual target, not the 22 October whole-Occupation revision or applied schema.

| Diagram | Source | Rendered image |
| --- | --- | --- |
| Runtime topology | [runtime-topology.puml](runtime-topology.puml) | [runtime-topology.svg](runtime-topology.svg) |
| PostgreSQL identity, catalog, processing | [postgresql.puml](postgresql.puml) | [postgresql.svg](postgresql.svg) |
| PostgreSQL assessment and learning | [postgresql-assessment.puml](postgresql-assessment.puml) | [postgresql-assessment.svg](postgresql-assessment.svg) |
| PostgreSQL pathway, analytics, evaluation | [postgresql-pathway.puml](postgresql-pathway.puml) | [postgresql-pathway.svg](postgresql-pathway.svg) |
| PostgreSQL adaptive baseline historical target (2026-10-20, superseded) | [postgresql-adaptive-baseline-target.puml](postgresql-adaptive-baseline-target.puml) | [postgresql-adaptive-baseline-target.svg](postgresql-adaptive-baseline-target.svg) |
| Neo4j occupation-based ontology 0.7.0 | [neo4j.puml](neo4j.puml) | [neo4j.svg](neo4j.svg) |

The2026-10-22 revised full-Occupation design and scoped diagram are in [Adaptive Baseline Data Architecture](../features/Baseline%20knowledge%20assessment/Adaptive%20Baseline%20Data%20Architecture.md). Old adaptive PlantUML/SVG retain the earlier role/exploration proposal as historical provenance; they are not current schema or acceptance. V18/V19 now exist on disk; no new live diagram/database inspection is claimed by this document-only update.

The historical generator lists all 62 V17 tables. Its commands below are retained instructions for that historical baseline, not commands executed/approved in Cluster 1. Use an explicitly isolated version-matched database before any later approved regeneration; do not run against user volumes. It rejects missing/additional tables rather than silently omitting them:

```powershell
docker compose -f compose.dev.yml up -d postgres neo4j
docker compose -f compose.dev.yml run --build --rm migrate
powershell -NoProfile -ExecutionPolicy Bypass -File .\documents\diagrams\Generate-PostgresqlDiagrams.ps1
java -jar path\to\plantuml.jar -tsvg documents/diagrams/postgresql.puml documents/diagrams/postgresql-assessment.puml documents/diagrams/postgresql-pathway.puml
java -jar path\to\plantuml.jar -tsvg documents/diagrams/postgresql-adaptive-baseline-target.puml
```

Run these commands from the repository root. PostgreSQL groups cover every table and column; they draw only foreign keys whose endpoints are within the same group. The Neo4j view shows six entity types and seven relationship types for ontology 0.8.0. LearningModule TEACHES MicroSkill is exactly one-to-one; only MicroSkill has prerequisite self-links. SVG and PNG are generated from neo4j.puml using PlantUML 1.2025.10.

The assessment view includes the V14-V16 management tables and current V17 columns. V17 only changes a trigger function, which a table diagram cannot depict. The diagrams do not encode the V14 tenant-scoped unique index; consult the migration and [architecture text](../ARCHITECTURE.md) for behavioral rules.
