# Architecture Diagrams

## Current Scope Alignment

[Version 2](../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md) controls product scope; [architecture](../ARCHITECTURE.md) separates the required target from the recorded technical baseline. These diagrams inventory existing storage, not a completed multi-organization subscription/learning implementation.
Tenant isolation, departments/occupations/assignments, subscription/provisioning/entitlements, many-to-many learning coverage, private content, L&D publication/approval, direct AI guidance, independent progress and ROI need agreed physical mappings before regeneration. Documentation alignment does not change migrations or generated images.

## Technical Baseline Snapshot

**2026-10-28 V32 integration:** PostgreSQL sources and SVGs are regenerated from the migrated dev schema (113 tables: 24 identity/catalog, 16 subscription, 60 assessment/learning, 13 pathway/reporting). Runtime topology now includes trusted workspace baseline adapters and V1-V32 migration without graph reseeding. Rendering uses the installed local PlantUML JAR; all five SVGs were XML-validated. Prior dated entries remain historical.

**2026-10-28 V12 update:** The subscription diagram now records the unique/exactly-one membership role, pending invitation rule and platform/organization exclusivity. Runtime topology references V1-V12. Both affected SVGs were rendered using the installed local PlantUML JAR and XML-validated; there are no new tables or Neo4j schema changes.

These PlantUML sources back the diagrams in [../ARCHITECTURE.md](../ARCHITECTURE.md). The SVGs alongside them are generated for Markdown viewers, which do not render PlantUML code blocks directly. PostgreSQL source files now include all 76 tables through V11, generated from the isolated subscription-test database on 2026-10-23.

| Diagram | Source | Rendered image |
| --- | --- | --- |
| Runtime topology | [runtime-topology.puml](runtime-topology.puml) | [runtime-topology.svg](runtime-topology.svg) |
| PostgreSQL identity, catalog, processing | [postgresql.puml](postgresql.puml) | [postgresql.svg](postgresql.svg) |
| PostgreSQL subscriptions, payments, memberships | [postgresql-subscription.puml](postgresql-subscription.puml) | [postgresql-subscription.svg](postgresql-subscription.svg) |
| PostgreSQL assessment and learning | [postgresql-assessment.puml](postgresql-assessment.puml) | [postgresql-assessment.svg](postgresql-assessment.svg) |
| PostgreSQL pathway, analytics, evaluation | [postgresql-pathway.puml](postgresql-pathway.puml) | [postgresql-pathway.svg](postgresql-pathway.svg) |
| Neo4j occupation-based ontology 0.7.0 | [neo4j.puml](neo4j.puml) | [neo4j.svg](neo4j.svg) |

After editing PostgreSQL migrations, start the development stack, regenerate the PostgreSQL sources from `pg_catalog`, then render the SVGs with PlantUML 1.2025.10 or newer:

**2026-10-26 runtime-only update:** The runtime diagram now shows the shared transactional HTML/text template, verification/activation/payment mail jobs and atomic payment-confirmed outbox event. Source was rendered locally with the installed VS Code PlantUML JAR and the SVG parsed successfully as XML. No database schema changed; database diagrams were not regenerated.

```powershell
docker compose -f compose.dev.yml up --build -d
.\documents\diagrams\Generate-PostgresqlDiagrams.ps1
java -jar path\to\plantuml.jar -tsvg documents/diagrams
```

Run these commands from the repository root. PostgreSQL groups cover every table and column; they draw only foreign keys whose endpoints are within the same group. The Neo4j view shows six entity types and seven relationship types for ontology 0.8.0. LearningModule TEACHES MicroSkill is exactly one-to-one; only MicroSkill has prerequisite self-links. SVG and PNG are generated from neo4j.puml using PlantUML 1.2025.10.

On 2026-10-21 the V8 sources were regenerated from the isolated registration-test stack (24 identity/catalog/processing, 23 assessment/learning, 13 pathway/analytics tables). `postgresql.svg` and `runtime-topology.svg` were rendered locally with PlantUML 1.2025.10 and XML-validated. Registration adds seven PostgreSQL tables and the SMTP worker path; it does not change Neo4j.

To generate from that isolated stack instead of the shared development project, retain its fixture-key environment and run:

```powershell
.\documents\diagrams\Generate-PostgresqlDiagrams.ps1 -ComposeOverride .\compose.registration-test.yml
java -DPLANTUML_LIMIT_SIZE=16384 -jar path\to\plantuml.jar -tsvg documents\diagrams\postgresql.puml documents\diagrams\runtime-topology.puml
```

The default generator invocation still targets development Compose. Do not upload private diagrams or schema content to an external renderer.

Latest lifecycle regeneration used `-ComposeOverride .\compose.subscription-test.yml`, not the retained development database. Groups contain 24 identity/catalog, 16 lifecycle/member-reference, 23 assessment and 13 pathway tables. Identity/subscription/runtime SVGs were rendered with existing local PlantUML 1.2025.10 and XML-validated. Neo4j schema and ontology are unchanged by this feature.
