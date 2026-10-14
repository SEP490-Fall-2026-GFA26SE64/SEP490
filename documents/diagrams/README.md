# Architecture Diagrams

These PlantUML sources back the diagrams in [../ARCHITECTURE.md](../ARCHITECTURE.md). The SVGs alongside them are generated for Markdown viewers, which do not render PlantUML code blocks directly. PostgreSQL source files are generated from the migrated database catalog; the sources currently describe all 56 tables through V12.

| Diagram | Source | Rendered image |
| --- | --- | --- |
| Runtime topology | [runtime-topology.puml](runtime-topology.puml) | [runtime-topology.svg](runtime-topology.svg) |
| PostgreSQL identity, catalog, processing | [postgresql.puml](postgresql.puml) | [postgresql.svg](postgresql.svg) |
| PostgreSQL assessment and learning | [postgresql-assessment.puml](postgresql-assessment.puml) | [postgresql-assessment.svg](postgresql-assessment.svg) |
| PostgreSQL pathway, analytics, evaluation | [postgresql-pathway.puml](postgresql-pathway.puml) | [postgresql-pathway.svg](postgresql-pathway.svg) |
| Neo4j V5 catalog | [neo4j.puml](neo4j.puml) | [neo4j.svg](neo4j.svg) |

After editing PostgreSQL migrations, start the development stack, regenerate the PostgreSQL sources from `pg_catalog`, then render the SVGs with PlantUML 1.2025.10 or newer:

```powershell
docker compose -f compose.dev.yml up --build -d
.\documents\diagrams\Generate-PostgresqlDiagrams.ps1
java -jar path\to\plantuml.jar -tsvg documents/diagrams
```

Run these commands from the repository root. PostgreSQL groups cover every table and column; they draw only foreign keys whose endpoints are within the same group. The Neo4j view shows two instances of the same `MicroSkill` label, not a sixth catalog label, and includes all node and relationship properties from V5.

The PlantUML sources are updated through V12. The assessment source and SVG include the V8 item metadata, all three V9 blueprint tables, V10 blueprint write-idempotency fields, V11 blueprint-to-assessment generation metadata, and V12 review evidence; the SVG was rendered with PlantUML 1.2025.10. Regenerate all PostgreSQL views from a migrated database when Docker is available. `postgresql.svg` and `runtime-topology.svg` may still temporarily show the pre-V7 identity view.
