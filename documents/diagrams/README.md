# Architecture Diagrams


## Single-Skill Module contract — 2026-11-05

[Current schema and Mermaid](../neo4j_schema.md#current-contract--2026-11-05) and [PlantUML source](neo4j.puml) describe Module → TEACHES → exactly one MicroSkill, with multiple alternative Modules per Skill and no teaching focus/difficulty properties. PostgreSQL owns original-version completion and optional-learning admission. Existing `neo4j.svg`/`neo4j.png` are retained historical v0.11 renders; they were not regenerated or represented as current. No PlantUML renderer was installed for this source change. [Runtime/API contract](../technical/Skill-Learning-Eligibility.md).

## Current Scope Alignment

## Learning and Question Bank state machines — 2026-11-02

| Activity | State machine | Scope |
| --- | --- | --- |
| ACT-04 Module / Learning Content | [ST-11 source](mermaid/st-11.mmd), [SVG](mermaid/st-11.svg), [PNG](mermaid/st-11.png) | Current Module document revision: DRAFT, SUBMITTED, RETURNED, PUBLISH_PENDING, RELEASED. Lessons are reviewed with the Module; published history remains immutable. Archive/restore omitted from this main-flow view. |
| ACT-07 independent skill learning | [ST-23 source](mermaid/st-23.mmd), [SVG](mermaid/st-23.svg), [PNG](mermaid/st-23.png) | Target business states only; not new persisted enum values. Distinguishes content progress, assessment evidence and independent progress. Independent-learning/assessment integration remains incomplete. |
| ACT-10 Question Bank | [ST-16 source](mermaid/st-16.mmd), [SVG](mermaid/st-16.svg), [PNG](mermaid/st-16.png) | Current question-candidate states: DRAFT, SUBMITTED, PUBLISHED. Return/withdraw goes to DRAFT; a successor is a new draft without changing the immutable published predecessor. Availability is a separate lifecycle. |

ST-11 and ST-16 describe the current document/candidate pointer, not mutations of an already published immutable version. Rejected/stale/unauthorized commands do not transition state. References: `ModuleAuthoringService`, `QuestionBankService`, [Learning catalog](../features/Learning%20catalog/README.md), [Question Bank rules](../features/Assessment%20workflows/README.md#fr-05-06) and [independent learning target](../features/Employee%20experience/README.md#fr-06-07). ST-11 and ST-16 are updated in place for Module/Content and Question Bank; duplicate ST-22/ST-24 files and rendered images were removed. ACT diagrams are unchanged. ST-23 remains the separate independent-learning target.

Presentation follows the existing state-machine style (including ST-18): identical theme/state configuration, SDD_ST identifiers, short state/transition labels, working/accepted/attention palette and no large explanatory note boxes. State meanings/transitions are retained; scope and caveats stay here. Content completion alone is not mastery; ST-23 states are target business concepts, not persisted enums.

Validation: all three Mermaid sources parsed/rendered locally; generated SVGs parsed as XML; PNGs visually inspected. Documentation only: no application/database tests or new implementation claims.

## Question Bank activity — 2026-11-02

**ACT-10:** [Mermaid source](mermaid/act-10.mmd) · [SVG](mermaid/act-10.svg) · [PNG](mermaid/act-10.png).

Documents the concise main flow of the organization-wide Question Bank subset of [FR-05.06](../features/Assessment%20workflows/README.md#fr-05-06): responsible Expert creates/imports drafts, completes content and submits; L&D acknowledges the exact version and returns with feedback or approves immutable publication. The return branch restores DRAFT and loops through editing and resubmission. Each organization has one bank spanning MicroSkills. This is not module exam construction or calibration.

Preconditions and omitted secondary flows remain in the feature specification: trusted organization/access and ownership, valid submission/import content, fresh expected revision, duplicate acknowledgement, atomic import/bulk review, withdrawal, successor versions, responsibility transfer and retirement/reactivation. They are intentionally omitted from this overview, not removed from the product.

Source-inspected against `QuestionBankService` and feature rules. The diagram was simplified to the user-approved main flow on2026-11-02. Start/End sizing was aligned with ACT-04/07: classic rendering, no minimum node width and32px flowchart padding; entry borders retain1.5px stroke. Local rendering uses Mermaid12.0.0 with ELK1.0.1. SVG circle radii match ACT-04/07 within1px (approximately37px/35px rather than93px). Validation: local Mermaid parse/render, SVG XML validation, approval/return-loop checks and visual PNG inspection. Documentation only; no application/database tests or new runtime claims. Existing ACT-04/ACT-06/ACT-07 are unchanged.

## Planned initial gap/pathway — 2026-10-27

[Mermaid flow/sequence/state/logical-data source and rendered Markdown view](gap-pathway-initial-flow.md) accompanies the [Cluster1 design](../technical/initial-pathway/Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md). It is **Planned**, not DB inventory, deployed topology or runtime evidence. It does not replace the verified V26 metadata images or member-owned Neo4j diagram. A supporting Mermaid viewer is required to render the inline diagrams.

## Verified inventory — 2026-10-23

[Version 2](../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md) controls product scope; [architecture](../ARCHITECTURE.md) separates the required target from the recorded technical baseline. These diagrams inventory existing storage, not a completed multi-organization subscription/learning implementation.
Tenant isolation, departments/job positions/assignments, subscription/provisioning/entitlements, many-to-many learning coverage, private content, L&D publication/approval, direct AI guidance, independent progress and ROI need agreed physical mappings before regeneration. Documentation alignment does not change migrations or generated images.

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
| Neo4j job position-based ontology 0.7.0 | [neo4j.puml](neo4j.puml) | [neo4j.svg](neo4j.svg) |

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

## Workspace integration source

Active shared development uses db/workspace-migration V1?V34; retained db/migration V1?V28 is the old demo lineage, never a combined Flyway location. See [integration ownership and compatibility](../technical/Workspace%20Adaptive%20Integration.md). Existing rendered diagrams retain their dated scope; no live DB capture or diagram regeneration was performed in this source/build task.
