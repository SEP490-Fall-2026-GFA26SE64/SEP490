# Architecture Diagrams

## Current Scope Alignment

The [System Overview](../adapt_learn_graph_system_overview.md) controls product scope; [architecture](../ARCHITECTURE.md) distinguishes revised responsibilities from the recorded technical baseline. These database/runtime diagrams inventory existing storage, not an approved model for all new capabilities. Legacy organization/billing/evaluation structures do not reinstate excluded SaaS functionality.
Discipline membership/assignments, module/content storage, L&D role publication/offering approval, RIASEC/reviewed role guidance and independent progress need agreed mappings before regenerating schema diagrams. Documentation alignment does not change migrations or generated images.

## Technical Baseline Snapshot

These PlantUML sources back the diagrams in [../ARCHITECTURE.md](../ARCHITECTURE.md). The SVGs alongside them are generated for Markdown viewers, which do not render PlantUML code blocks directly. PostgreSQL source files are generated from the migrated database catalog, so their column lists include all 53 tables and stay in sync with Flyway changes.

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

Run these commands from the repository root. PostgreSQL groups cover every table and column; they draw only foreign keys whose endpoints are within the same group. The Neo4j view shows six entity types and seven relationship types for ontology 0.9.0. LearningModule TEACHES MicroSkill is many-to-many (at least one mapping on each side in this dataset); only MicroSkill has prerequisite self-links. SVG and PNG are generated from neo4j.puml using PlantUML 1.2025.10.

The V7 PlantUML sources are updated. Regenerate `postgresql.svg` and `runtime-topology.svg` when Docker and PlantUML are available; the checked-in SVGs may temporarily show the pre-V7 view.
