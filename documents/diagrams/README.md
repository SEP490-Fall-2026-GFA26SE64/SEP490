# Architecture Diagrams

## Report 3 business swimlanes - 2026-11-06

All nine business flows referenced by Report 3 now use [separate swimlane assets](mermaid/swimlanes): ACT-01/02/03/04/05/07/08/09/10. Every actor has a fixed column; `L and D Manager` and the short `L&D` label display as `L&D Manager`, and the exact `System` actor displays as `System Handler`. System Administrator and Platform Administrator are not renamed. ACT-06 is not displayed in Report 3 and is not added by this revision.

[Renderer](render-business-swimlanes.cjs) · [Per-diagram checks](mermaid/swimlanes/checks.json)

```powershell
node documents\diagrams\render-business-swimlanes.cjs C:\path\to\mermaid.min.js
```

The renderer derives business labels, node shapes, edges and actor ownership from the existing ACT sources, then generates actor-grouped Mermaid sources and fixed-column SVG/PNG exports. The canonical ACT sources and their earlier images remain unchanged, including shared Report 4 views. Edit business content in the canonical source before regenerating; a generic Mermaid renderer may not preserve the custom fixed-column routing.

ACT-09's grouped actors are expanded into separate columns. Repeated steps are alternatives of the same original action; their projection retains the exact original node/edge set without introducing new permissions or mandatory actions. All other diagrams retain one node per original node.

Checks cover complete original node/edge and business-label parity, recognized actor ownership, Mermaid parsing, SVG XML, complete arrowheads, route/head canvas bounds, routes clear of all nodes, actor-lane and shape containment, node/label collisions and labels clear of arrowheads. All nine diagrams passed these checks; their 130 original nodes and 138 original edges are preserved, with explicit alternative-actor copies only in ACT-09. The full contact sheet and representative detailed images were visually inspected. Original-source hashes are retained in the check results. This is a presentation change, not a runtime or business-rule implementation.

The preceding general routing refinement ordered actor columns by handoff distance, preferred short orthogonal connectors, separated entry/exit ports and evaluated alternative routes for branches and loops. Pairwise collinear overlap fell from 1,041px in that initial routing to 9px; ACT-05 then retained one 9px shared decision-port segment. Crossings fell from 129 to 36 within the same reordered-column layout. These are historical measured improvements, not a claim of a globally optimal or crossing-free layout. `initialRouting` and `optimizedRouting` in the checks use the same lane order; `previousRouting` records the SVG present before that rendering run. Layout checks still require no clipping, node crossings, label collisions or lane overflow.

The subsequent ACT-05-only spacing revision widens its four lanes to 620px, increases row/return-channel spacing and penalizes closely packed parallel routes. Parallel runs sharing at least 48px of extent must be at least 24px apart; the current measured minimum is 28px, with zero crowded runs (previously 15, with a 1px minimum). Short connectors at shared node ports are excluded from this long-run spacing rule; ACT-05 retains one 13px shared decision-port segment and 24 crossings, not a claim of zero overlap everywhere. All 35 original steps and 41 edges are preserved. The other eight exported swimlanes are unchanged by this revision.

ACT-05's Start connector is pinned to the shared vertical centerline of Start and the first L&D Manager action. Incoming retry arrows do not offset this connector's destination port or introduce an elbow.

## JobPosition ontology v0.12 - 2026-11-06

SRS section 3.1.5 now includes [CGRAPH-01 source](mermaid/cgraph-01.mmd), [SVG](mermaid/cgraph-01.svg) and [PNG](mermaid/cgraph-01.png) immediately below CERD-01 through CERD-04. This conceptual view retains the same six node labels, seven relationships and cardinalities as GRAPH-01, with no attributes or PK/FK rows. It uses the existing conceptual ERD visual style. Render with the command below plus `cgraph-01` as the final argument; the four flow ERDs are unchanged.

Report 4's GRAPH-01 and node/edge descriptions now match the current v0.12 dataset/import contract: `JobPosition` replaces the obsolete `Occupation` label, while historical `OCC-` IDs remain unchanged. Each LearningModule has exactly one TEACHES edge to a MicroSkill; the old teaching-focus/difficulty fields are omitted. Dataset ownership fields are represented by graph relationships, not imported node properties. Common review/lifecycle metadata remains documented alongside the diagram.

[Source](mermaid/graph-01.mmd) · [SVG](mermaid/graph-01.svg) · [PNG](mermaid/graph-01.png) · [Renderer](render-ontology-diagram.cjs)

```powershell
node documents\diagrams\render-ontology-diagram.cjs C:\path\to\mermaid.min.js
```

Validation uses the current dataset to check six labels, seven relationship types, all displayed business properties and one teaching edge per Module. Local Mermaid 12.3.0/Playwright rendering checks SVG XML, complete node/edge-label coverage, clipped labels and label collisions. No database import, identifier rewrite or runtime migration is performed. Historical v0.9/v0.11 datasets and the older `neo4j.svg`/`neo4j.png` remain unchanged.

## Package overview style - 2026-11-06

Report 4 section 1.2 uses white UML package folders, subtle offset shadows and dashed open-arrow import dependencies, matching the supplied visual reference. The backend retains seven actual packages under `com.adaptlearngraph` and adds the direct `entities.domain` subpackage. The frontend retains four principal source directories and adds all 11 direct `features` and nine direct `shared` subdirectories. Packages without subdirectories are not given invented children. Arrows remain selected top-level imports, including the existing `shared` to `features` coupling, not runtime flow or an exhaustive layering contract.

[Backend source](mermaid/pkg-overview-backend.mmd) · [Backend SVG](mermaid/pkg-overview-backend.svg) · [Backend PNG](mermaid/pkg-overview-backend.png)

[Frontend source](mermaid/pkg-overview-frontend.mmd) · [Frontend SVG](mermaid/pkg-overview-frontend.svg) · [Frontend PNG](mermaid/pkg-overview-frontend.png)

The Mermaid files own package names, containment and dependency edges. [The local renderer](render-package-overviews.cjs) applies the fixed UML-folder layout and exports SVG/PNG. Dependencies use orthogonal lanes and explicit open heads drawn outside all folder shapes and shadows, rather than boundary-clipped SVG markers. Checks cover actual package-directory existence, parent containment, package overlaps, complete node/edge/head coverage, path/head collisions with folders and shadows, SVG XML and canvas bounds. A generic Mermaid renderer displays the equivalent dependency graph with rectangular nodes rather than this custom folder presentation. Regenerate with installed frontend Playwright and local Chrome:

```powershell
node documents\diagrams\render-package-overviews.cjs
```

Historical PKG-01/PKG-02 inventories are retained unchanged. This is a documentation-only redraw, not an application refactor.

The deeper-layout revision rendered locally with Playwright/Chrome: backend eight folders and 12 complete arrowheads; frontend 24 folders and four complete arrowheads. Both had zero clipped labels/arrowheads, package overlaps, folder/shadow crossings or browser errors. Both PNGs were visually inspected.

## Scoped state style using ST-01 — 2026-11-06

The following formatting entry is historical for ST-16: the current authoring revision splits it into ST-16A/B below. Its upstream source/render is [archived](archive/st-16-before-split-20261106/README.md). ST-11 also has the subsequent authoring lifecycle expansion below.

ST-14's subsequent approved rule correction uses explicit Employee submission and L&D-configured PASSED/FAILED outcomes, with no evidence or auto-submit branch. [Current ST-14 PNG](mermaid/st01-standard-20261106/st-14-rule-based-20261106.png) · [Rule revision checks](review2-st14-rule-20261106.json). This replaces only ST-14's earlier adaptive-attempt diagram.

Only **ST-13, ST-14, ST-16, ST-17, ST-18 and ST-19** use the updated ST-01-based format. ST-15 is removed from Report 4 and [archived](archive/st-15-20261106/README.md). ST-01 is unchanged; all 14 other ST source/SVG/PNG sets have been restored to their pre-formatting versions. State/transition content is preserved. [Current six images and source links](mermaid/st01-standard-20261106/README.md) · [Verification](review2-state-style-20261106.md).

## Review 2 Role-Level flow — 2026-11-06

ACT-05 presentation correction: one continuous top-down flow in the original white/orange format, with a straight main spine, side error branches and orthogonal return arrows outside the content. No panels or continuation circles. [Editable source](mermaid/act-05.mmd) · [Current PNG](mermaid/act-05-vertical-20261106.png) · [SVG layout renderer](render-act05-vertical.cjs) · [Current verification](review2-act05-vertical-20261106.json). All 35 business nodes, all 41 edges and original labels are preserved. The rejected panel layout is superseded.

Report 3/4 display the approved ACT-05 Role-Level baseline/configuration flow and corresponding flow-scoped conceptual/logical ERDs. ST-13/14/16/17/18/19 now follow ST-01's visual format; ST-15 is omitted. This is a documentation target, not an applied database schema or runtime delivery. Dated database inventories below remain historical.

[Verification and artifact notes](review2-role-level-20261106.md) · [Machine-readable checks and hashes](review2-role-level-20261106-checks.json).


## ACT-04 / ACT-10 authoring coverage — 2026-11-06

Report3 and Report4 now include the following current-source additions, using the existing conceptual/logical/physical and state-diagram templates:

| View | Module / Learning Content (ACT-04) | Question Bank (ACT-10) |
| --- | --- | --- |
| ACT-05 conceptual references | [CERD-03](mermaid/cerd-03.mmd): target learning provision, one skill per module | [CERD-02](mermaid/cerd-02.mmd): published QuestionVersion references; authoring detail is in LERD-06 |
| Logical | [LERD-05](mermaid/lerd-05.mmd): document, revision, content/lesson/teaching snapshots, history and optional intake | [LERD-06](mermaid/lerd-06.mmd): workspace, question/version, audit, notices and imports; publication is a storage mapping |
| Physical | [DB-09](mermaid/db-09.mmd): six V36/V37 authoring tables with V48 renames | [DB-10](mermaid/db-10.mmd): three V29 authoring tables and five declared foreign keys |
| State | [ST-11](mermaid/st-11.mmd): review/publication plus guarded deletion, archive/retry and restore | [ST-16A](mermaid/st-16a.mmd): version review; [ST-16B](mermaid/st-16b.mmd): retirement/reactivation |

Each source has sibling SVG and PNG renders. LERD-01–04 and CERD-01–04 retain the upstream ACT-05 target design; LERD-05/06 describe current authoring storage and retain historical snapshots. Logical JSON objects are not represented as invented SQL tables/FKs. DB-09/10 supplement the dated V1–V32 capture rather than claiming a new live database inventory. Only Module supports guarded draft deletion; Question does not. Module restore creates a new draft and keeps archived availability until successful reapproval/publication.

Design refinement: Report4 documents logical identities, identifying/reference edges, retained legacy cardinalities, six exact FK mappings and derived physical multiplicities. ST-16A/16B replace the ambiguous ST-16 filenames; older dated entries retain their historical terminology. DB-09 deliberately contains no invented JSON foreign keys.

The separate authoring validation files are absent from this checkout; source mappings remain in Report4. The dated 2026-11-02 entries below describe their original smaller scope; this entry supersedes their archive/availability omissions.

## Single-Skill Module contract — 2026-11-05

[Current schema and Mermaid](../neo4j_schema.md#current-contract--2026-11-05) and [PlantUML source](neo4j.puml) describe Module → TEACHES → exactly one MicroSkill, with multiple alternative Modules per Skill and no teaching focus/difficulty properties. PostgreSQL owns original-version completion and optional-learning admission. Existing `neo4j.svg`/`neo4j.png` are retained historical v0.11 renders; they were not regenerated or represented as current. No PlantUML renderer was installed for this source change. [Runtime/API contract](../technical/Skill-Learning-Eligibility.md).

## Current Scope Alignment

## Learning and Question Bank state machines — 2026-11-02

| Activity | State machine | Scope |
| --- | --- | --- |
| ACT-04 Module / Learning Content | [ST-11 source](mermaid/st-11.mmd), [SVG](mermaid/st-11.svg), [PNG](mermaid/st-11.png) | Current Module document revision: DRAFT, SUBMITTED, RETURNED, PUBLISH_PENDING, RELEASED. Lessons are reviewed with the Module; published history remains immutable. Archive/restore omitted from this main-flow view. |
| ACT-07 independent skill learning | [ST-23 source](mermaid/st-23.mmd), [SVG](mermaid/st-23.svg), [PNG](mermaid/st-23.png) | Target business states only; not new persisted enum values. Distinguishes content progress, assessment evidence and independent progress. Independent-learning/assessment integration remains incomplete. |
| ACT-10 Question Bank | [ST-16 source](mermaid/st-16a.mmd), [SVG](mermaid/st-16a.svg), [PNG](mermaid/st-16a.png) | Current question-candidate states: DRAFT, SUBMITTED, PUBLISHED. Return/withdraw goes to DRAFT; a successor is a new draft without changing the immutable published predecessor. Availability is a separate lifecycle. |

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
