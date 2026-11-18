# Architecture Diagrams

## Baseline / pathway / Skill Assessment — source update 2026-11-18

The current local source at `2c2468b5` is mapped in [the ordered flow/API/DDL contract](../technical/Organization%20Rule%20Assessment%20and%20Pathway.md#current-flow-2026-11-18). The prior through-V62/63 views below are superseded for these active selected fields:

| View | PlantUML | SVG | PNG |
| --- | --- | --- | --- |
| Config, frozen papers, quotas, replay and evidence | [Assessment source](postgresql-assessment.puml) | [Assessment](postgresql-assessment.svg) | [Assessment](postgresql-assessment.png) |
| Requirement revisions, approval/timing, certificate and in-app notice | [Pathway source](postgresql-pathway.puml) | [Pathway](postgresql-pathway.svg) | [Pathway](postgresql-pathway.png) |
| Baseline to Skill Assessment and recalculation | [Ordered flow source](baseline-pathway-flow.puml) | [Flow](baseline-pathway-flow.svg) | [Flow](baseline-pathway-flow.png) |

Assessment shows 15 selected tables; pathway shows 13. Every displayed field/type was checked against workspace migration source through V64. Physical arrows identify parent→referencing child; composite scope keys are summarized by numbered FK labels/map, with off-view identity/catalog references intentionally omitted. V63 Skill-version binding, V64 nullable frozen quota, six timing fields, REJECTED and in-app deep-link/toast observation are represented. Assessed sources in revision JSON are distinguished from dependency.assessed_source; no fake step column, editable profile catalog or cross-store FK is introduced.

These are selected current source definitions, not a live database inventory or a claim that all migrations/workers are applied/enabled. Old DB-xx captures, schema-catalog JSON, conceptual/state/target diagrams retain original lineage/date. RIASEC/V72 exports remain unchanged. Native SVG layouts read the checked-in PlantUML fields, with PNG produced by the existing sharp module; no browser/test runner, dependency installation or runtime service is used. Exact-layout renderer and inspection receipt are workspace artifacts in `.tools/baseline-pathway-docs-20261118/`; PlantUML remains independently renderable with a different automatic layout.

## RIASEC source update — 2026-11-18

Source `2c2468b5` supersedes earlier RIASEC prototype/inference gaps. Current figures:

| View | Source | SVG | PNG |
| --- | --- | --- | --- |
| Neo4j catalog | [PlantUML](neo4j.puml), [Mermaid companion](mermaid/graph-01.mmd) | [Catalog](neo4j.svg) | [Catalog](neo4j.png) |
| Personal storage and graph boundary | [V72 storage](riasec-storage.puml) | [Storage](riasec-storage.svg) | [Storage](riasec-storage.png) |
| Server scoring and asynchronous AI | [Runtime flow](riasec-flow.puml) | [Flow](riasec-flow.svg) | [Flow](riasec-flow.png) |

Neo4j JobPosition adds optional description and six **Integer 0–40** interests (all six or none on explicit save). Other node fields, relationship directions/properties and source-only Certificate retain the prior capture scope. No new RIASEC graph node/edge is added. The GRAPH-01 SVG/PNG aliases are byte-identical to the catalog exports. PostgreSQL V72 has two personal tables, not a second editable Job Position catalog; copied recommendation IDs are not cross-store FKs. Existing older PostgreSQL images/catalog JSON retain their original scope, not a V72 capture.

These exports use a native SVG layout and the already available sharp rasterizer; no renderer was installed and no browser/test runner was used. The layout renderer and exact reproduction receipt are outside the product in the workspace artifact `.tools/riasec-docs-20261118/`. Checked-in PlantUML defines the same fields/connections and remains independently renderable with PlantUML; its automatic layout may differ. Existing `render-ontology-diagram.cjs <local-plantuml.jar>` remains a separate PlantUML export option. New SVGs were XML/geometry checked and PNGs visually inspected; this is document validation only, with no live DB/application acceptance.

See [current architecture](../ARCHITECTURE.md#riasec-personal-exploration) and [schema/source scope](../neo4j_schema.md#riasec-current-source). Older dated diagrams and reports below remain scoped references; their omitted RIASEC details do not define the new execution flow.

## Target Role handoff - current source 2026-11-08

The [handoff class diagram](mermaid/cls-target-role-handoff.mmd) ([PNG](mermaid/cls-target-role-handoff.png), [SVG](mermaid/cls-target-role-handoff.svg)) now uses actual controller/application/use-case/domain/repository classes, replacing the proposed workflow classes. [SEQ-05](mermaid/seq-05.mmd) ([PNG](mermaid/seq-05.png), [SVG](mermaid/seq-05.svg)) traces request/DTO-command mapping, duplicate lookup, domain creation/update, Neo4j identity/merge and catalog synchronization. The Expert sends SUBMITTED and manager publication/rejection sends ACTIVE/REJECTED through the generic PUT path; ACTIVE/PUBLISHED triggers version supersession in the adapter.

Report 4 section 3.3.2 records the current limitations: conditional header-based assignment checks, frontend local-store/failure handling, and absence of the previously proposed exact-hash review receipt and PostgreSQL workflow/outbox. This source-based documentation is not a security or runtime acceptance verdict. No application code or schema was changed. Both diagrams were parsed/rendered locally and SVG XML checked.

## Unified conceptual data model - 2026-11-08

SRS section 3.1.5 displays one combined model instead of four flow ERDs and a separate ontology: [CERD-UNIFIED source](mermaid/cerd-unified.mmd), [SVG](mermaid/cerd-unified.svg), [PNG](mermaid/cerd-unified.png), [checks](mermaid/cerd-unified-checks.json). All 33 displayed concepts have one description in a single table with a Database column: 26 PostgreSQL business-state/evidence concepts and seven Neo4j catalog definitions. Existing Level aliases and immutable-policy aliases are consolidated; Certificate definition belongs to Neo4j while submission/decision belongs to PostgreSQL. Cross-store links are dotted catalog/version snapshots, never database-enforced foreign keys.

The original CERD-01/02/03/04 and CGRAPH-01 assets remain unchanged as historical/detail references. The unified view preserves their relationship coverage while representing catalog requirement/prerequisite pairs as edges rather than introducing extra requirement nodes. It remains conceptual: no fields, PK/FK rows, database migration or changed runtime behavior.

```powershell
node documents\diagrams\render-unified-conceptual.cjs C:\path\to\mermaid.min.js
```

[The renderer](render-unified-conceptual.cjs) validates original relationship coverage after alias consolidation, all entity/store descriptions, a single SRS image, Mermaid parsing, SVG XML and label/node/edge clearance. Open the SVG at full size for the combined view.

## Adaptive flow diagrams - source alignment 2026-11-08

The existing ACT-05, scoped policy/paper/evidence ERDs, requirement pathway ERDs, class/sequence/state views and direct catalog/module/Question Bank dependencies now describe source at commit `84cfb6f1`. Canonical Mermaid sources and sibling SVG/PNG exports are synchronized; Report 3 uses the updated fixed-column swimlanes and Report 4 state aliases are refreshed. PostgreSQL views show selected source-defined columns through V62, not live DB captures. Catalog IDs remain cross-store snapshots, not SQL foreign keys into Neo4j.

Baseline diagnostics, official evidence and prerequisite review flags are separate. Request/review/step states are separate. Approval basis, target lock and non-gating parallel supplementation remain visible. The 2026-11-08 decisions now allow Expert option reduction and restrict bypass to missing suitable provision. Role-derived Skill authorization, draft-first ordering and module-specific retry allowance are confirmed; code and source-diagram annotations await the separate confirmation session. Independent learning remains a partial target. Application code, migrations, data and historical runtime evidence are unchanged.


## ACT-04 approval scope — 2026-11-06

ACT-04 now covers the Module, one MicroSkill mapping and ordered learning content. Assessment configuration is outside the submitted approval package. Canonical and swimlane ACT-04 assets, SEQ-06 and the UC-B submission dependency are synchronized with Reports 1–4. Prior dated entries retain their original scope.

## System context refresh - 2026-11-06

After synchronizing main to `e0b4856d`, SRS-CONTEXT was checked against the project manifests, active routes, the 14-domain functional catalog, provider adapters and deployment configuration. The current context keeps the six human actors, payOS and configurable Gmail SMTP. YouTube/Vimeo and their video exchanges are omitted from this view as requested, without changing their implementation-level declaration in the SDD. PostgreSQL, Neo4j, private MinIO assets and the planned local LLM remain internal.

[Source](mermaid/srs-context.mmd) · [SVG](mermaid/srs-context.svg) · [PNG](mermaid/srs-context.png) · [Layout checks](mermaid/srs-context-checks.json)

The view has one product circle, eight external-entity rectangles and 104 named data flows (47 left / 57 right). It includes starter-catalog selection, Question Bank ownership/review, Role-Level/pathway requests, certificate evidence/review and content-issue reports. Job Position terminology replaces Occupation; ROI, training-cost and monetary-benefit flows are omitted from this context view. SRS section 1.2 separates connected slices from remaining targets; SDD section 1.1.3 retains implementation-level provider details and the existing private-asset adapter. Required organization-profile editing is retained as a target, not falsely attributed to the current read-only directory. Certificate, local-inference and broader learning/reporting targets are not promoted to completed implementations.

```powershell
node documents\diagrams\render-srs-context.cjs C:\path\to\mermaid.min.js
```

The [renderer](render-srs-context.cjs) verifies every flow crosses the product boundary, all 104 arrows/labels are rendered, four external entities sit on each side, SVG XML is valid, no text is clipped, no label overlaps another label/node and no path crosses a node. It also checks that Occupation and financial/ROI labels are absent from the source. Circle attachment spacing and coincident points are recorded in the layout checks. No new application, live-provider or production acceptance is claimed. The uncommitted Employee screen-flow work and upstream ontology/report changes are preserved.

## Employee screen flow - 2026-11-06

Report 3 section 3.1.1 now includes the sixth actor flow, [SCREEN-EMPLOYEE source](mermaid/screen-flow-employee.mmd), [SVG](mermaid/screen-flow-employee.svg) and [PNG](mermaid/screen-flow-employee.png). It follows the existing white/black page-and-dialog notation: nine routed page types and 11 selected dialogs, with 43 verified navigation/dialog connections. Tabs, baseline attempt/results, aliases and pending/blocked states are not invented as additional pages.

The flow covers Learning Overview, Upskilling role/gap/baseline handoffs, Learning Pathway/module entry, content issue/version dialogs, Assessments and My Mastery. It preserves current feature/access guards and explicitly distinguishes browser-local quiz/skill-tracking UI from completed persisted workflows. Screen Descriptions now cover 82 distinct names across all six actor flows; the required authorization matrix includes the Employee-only additions and scoped read access to shared Role Details.

```powershell
node documents\diagrams\render-employee-screen-flow.cjs C:\path\to\mermaid.min.js
```

[The renderer](render-employee-screen-flow.cjs) checks all 20 screen names against their descriptions and Employee permissions, Mermaid parsing, all 43 edges/labels, SVG XML, canvas clipping, label collisions and navigation paths crossing screen nodes. Local rendering and visual inspection passed; no new application end-to-end or persistence certification is claimed. The other five actor diagrams remain unchanged.

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

SRS section 3.1.5 now includes [CGRAPH-01 source](mermaid/cgraph-01.mmd), [SVG](mermaid/cgraph-01.svg) and [PNG](mermaid/cgraph-01.png) immediately below CERD-01 through CERD-04. This separate conceptual view has no property rows; it retains its existing conceptual topology. The 2026-11-08 property expansion applies to the shared physical catalog image below. It uses the existing conceptual ERD visual style. Render with the command below plus `cgraph-01` as the final argument; the four flow ERDs are unchanged.

Report 4's GRAPH-01 and node/edge descriptions now match the current v0.12 dataset/import contract: `JobPosition` replaces the obsolete `Occupation` label, while historical `OCC-` IDs remain unchanged. Each LearningModule has exactly one TEACHES edge to a MicroSkill; the old teaching-focus/difficulty fields are omitted. Dataset ownership fields are represented by graph relationships, not imported node properties. Common review/lifecycle metadata remains documented alongside the diagram.

[Canonical source](neo4j.puml) · [SVG](neo4j.svg) · [PNG](neo4j.png) · [Mermaid companion](mermaid/graph-01.mmd) · [Renderer](render-ontology-diagram.cjs)

```powershell
node documents\diagrams\render-ontology-diagram.cjs C:\path\to\plantuml.jar graph-01
```

The 2026-11-08 catalog exports use `neo4j.puml` as their single canonical image source. `mermaid/graph-01.svg` and `.png` are identical compatibility copies, not separate renders. All six supplied label-property lists and seven directed relationships are shown; source-defined Certificate/REQUIRES_CERTIFICATE are marked as absent from the supplied capture. See [schema scope](../neo4j_schema.md#diagram-scope--2026-11-08). No import or runtime migration is performed. The conceptual CGRAPH-01 renderer still accepts a Mermaid bundle and `cgraph-01`.

## Package overview style - 2026-11-06

The 2026-11-08 revision adds the outermost UML package folders `com.adaptlearngraph` and `frontend/src`. Each root encloses every displayed descendant and dependency; existing child package labels, relative positions and import edges are preserved. The renderer validates root ancestry and containment, including arrowheads, while excluding ancestor/descendant containment from sibling-overlap checks. Both SVG/PNG exports passed: backend nine folders/12 dependencies and frontend 25 folders/four dependencies, with no clipped labels/arrowheads or sibling overlaps.

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

[Current schema and Mermaid](../neo4j_schema.md#current-contract--2026-11-05) and [PlantUML source](neo4j.puml) describe Module → TEACHES → exactly one MicroSkill, with multiple alternative Modules per Skill and no teaching focus/difficulty properties. PostgreSQL owns original-version completion and optional-learning admission. The 2026-11-08 update regenerates `neo4j.svg`/`neo4j.png` with full captured properties; they are no longer historical v0.11 renders. [Runtime/API contract](../technical/Skill-Learning-Eligibility.md).

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
| Neo4j catalog capture + source-defined Certificate | [neo4j.puml](neo4j.puml) | [neo4j.svg](neo4j.svg) |

After editing PostgreSQL migrations, start the development stack, regenerate the PostgreSQL sources from `pg_catalog`, then render the SVGs with PlantUML 1.2025.10 or newer:

**2026-10-26 runtime-only update:** The runtime diagram now shows the shared transactional HTML/text template, verification/activation/payment mail jobs and atomic payment-confirmed outbox event. Source was rendered locally with the installed VS Code PlantUML JAR and the SVG parsed successfully as XML. No database schema changed; database diagrams were not regenerated.

```powershell
docker compose -f compose.dev.yml up --build -d
.\documents\diagrams\Generate-PostgresqlDiagrams.ps1
java -jar path\to\plantuml.jar -tsvg documents/diagrams
```

Run these commands from the repository root. PostgreSQL groups cover every table and column; they draw only foreign keys whose endpoints are within the same group. The Neo4j view shows the six captured labels and seven directed relationship types, plus source-only Certificate/REQUIRES_CERTIFICATE. No cardinalities are inferred from the capture; only MicroSkill has prerequisite self-links. SVG and PNG are generated from neo4j.puml using PlantUML 1.2025.10.

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
