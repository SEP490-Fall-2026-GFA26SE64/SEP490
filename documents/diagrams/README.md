# Architecture Diagrams

## Current Scope Alignment

The [System Overview](../adapt_learn_graph_system_overview.md) controls product scope; [architecture](../ARCHITECTURE.md) distinguishes revised responsibilities from the recorded technical baseline. These database/runtime diagrams inventory existing storage, not an approved model for all new capabilities. Legacy organization/billing/evaluation structures do not reinstate excluded SaaS functionality.
Discipline membership/assignments, course/content storage, L&D role publication/offering approval, RIASEC/reviewed role guidance and independent progress need agreed mappings before regenerating schema diagrams. Documentation alignment does not change migrations or generated images.

## Technical Baseline Snapshot

These PlantUML sources back the diagrams in [../ARCHITECTURE.md](../ARCHITECTURE.md). The SVGs alongside them are generated for Markdown viewers, which do not render PlantUML code blocks directly. PostgreSQL source files are generated from the migrated database catalog; the sources currently describe all 56 tables through V12.

| Diagram | Source | Rendered image |
| --- | --- | --- |
| Runtime topology | [runtime-topology.puml](runtime-topology.puml) | [runtime-topology.svg](runtime-topology.svg) |
| PostgreSQL identity, catalog, processing | [postgresql.puml](postgresql.puml) | [postgresql.svg](postgresql.svg) |
| PostgreSQL assessment and learning | [postgresql-assessment.puml](postgresql-assessment.puml) | [postgresql-assessment.svg](postgresql-assessment.svg) |
| PostgreSQL pathway, analytics, evaluation | [postgresql-pathway.puml](postgresql-pathway.puml) | [postgresql-pathway.svg](postgresql-pathway.svg) |
| Neo4j occupation-based ontology 0.7.0 | [neo4j.puml](neo4j.puml) | [neo4j.svg](neo4j.svg) |

After editing PostgreSQL migrations, start the development stack, regenerate the PostgreSQL sources from `pg_catalog`, then render the SVGs with PlantUML 1.2025.10 or newer:

```powershell
docker compose -f compose.dev.yml up --build -d
.\documents\diagrams\Generate-PostgresqlDiagrams.ps1
java -jar path\to\plantuml.jar -tsvg documents/diagrams
```

Run these commands from the repository root. PostgreSQL groups cover every table and column; they draw only foreign keys whose endpoints are within the same group. The Neo4j view shows seven entity types; Course and MicroSkill self-links represent prerequisites. Its current PlantUML and SVG describe ontology 0.7.0. The SVG and PNG are rendered directly from neo4j.puml using PlantUML 1.2025.10. A PNG preview is available at neo4j.png. The legacy V5 files are retained under ../dataset/archive/neo4j_schema_v5/.

The PlantUML sources are updated through V12. The assessment source and SVG include the V8 item metadata, all three V9 blueprint tables, V10 blueprint write-idempotency fields, V11 blueprint-to-assessment generation metadata, and V12 review evidence; the SVG was rendered with PlantUML 1.2025.10. Regenerate all PostgreSQL views from a migrated database when Docker is available. `postgresql.svg` and `runtime-topology.svg` may still temporarily show the pre-V7 identity view.
