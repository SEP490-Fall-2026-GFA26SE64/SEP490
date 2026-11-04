# Historical Module runtime notes

These dated records were retained from learning-module-manage on 2026-11-01. They describe historical environments and superseded manual-assignment behavior, not current schema or deployment instructions. Current authority: [Neo4j schema](../../neo4j_schema.md), [architecture](../../ARCHITECTURE.md), [migration locations](../MIGRATION_LINEAGES.md).

## Shared login correction — 2026-10-28

REQ-013 uses the existing main login session for Module, Content Studio, approval and learning requests. No additional Module login or Basic test accounts are used. The local bridge resolves active account ID, organization and persisted roles on the server; missing session returns 401 with a link back to the main login. Expert assignment choices come from active organization accounts. Creator/editor/reviewer IDs are account IDs. Main logout clears the shared cookie. No graph fields or entity schemas change; this does not convert the existing local demo login into production authentication or migrate historical test-account records.


## Neo4j catalog list — user-requested correction (2026-10-28)

The Module listing now reads all 13 LearningModule properties and all 8 TEACHES properties as stored, including nullable historical metadata. It does not read mock durationMinutes, add organizationId or authoring/audit properties to the ontology, or fabricate missing values. The current runtime graph may still be an older imported snapshot; the listing does not replace it with the checked-in dataset. Authorized authoring drafts/history are joined separately from PostgreSQL. [Read/access contract](features/Learning%20module%20management/View%20Learning%20Modules.md#neo4j-catalog-list--user-requested-correction-2026-10-28).


## Runtime imported v0.11.0 — 2026-10-28

The authorized application graph on HTTP 27474/Bolt 27687 now contains the exact 994-node/5121-relationship v11 catalog plus 13 preserved authored Modules/13 TEACHES, for totals of 1007 nodes/5134 relationships. All 259 Modules have positive duration/price; all 677 TEACHES have allowed focus/difficulty and every Module has exactly one PRIMARY. Catalog reviewer/time remain absent for unreviewed definitions. Property and endpoint readback matches the v11 seed exactly; existing PostgreSQL histories and authored graph properties are unchanged. The earlier missing-duration/price observations describe the pre-upgrade graph. [Backup, exact counts and verification](../../dataset/NEO4J_V011_LOCAL_UPGRADE.md).

### L&D module review navigation — REQ-053 (2026-10-28)

Content Approval stays at `/ld-manager/approvals`; Modules and Learning content resolve to `/ld-manager/modules` and `/ld-manager/learning-content`. All retain the L&D shell and Content Approval sidebar selection. Details/history open without switching actor. Submitted authoring revisions expose manager review actions; graph-only catalog entries remain read-only and are not automatically submitted. This routing correction changes no schema, storage responsibilities, seed data or API authorization.

### Explicit module intake — 2026-10-28

L&D assignment and Expert acceptance are PostgreSQL V28/V27 workflow records; no creator, receiver, Job Position membership or authoring revision property is added to Neo4j. Intake preserves the exact 13-property LearningModule / 8-property TEACHES source plus endpoints in PostgreSQL. Draft/submit leave graph unchanged. Approved publication reuses Module and mapping IDs for retained skills, applies existing review metadata, and checks original graph source before replacing the first imported release. The UI distinguishes graph review metadata from workflow submission. [Contract](../../features/Learning%20module%20management/Receive%20Imported%20Module.md).


## Single-Expert Module governance (2026-10-29)

The Module creator/responsible account remains PostgreSQL-owned (`module_authoring.document.createdBy`); intake assignment adds `expertId` inside the existing JSONB workflow document. Neither field is added to Neo4j. The thirteen LearningModule and eight TEACHES properties remain unchanged. The local development graph received an exact snapshot of1013 nodes and5142 relationships from the previous runtime; reviewed test modules may subsequently add catalog records through the existing publication workflow. Multi-job position skill coverage does not confer Module editing rights. Historical actor IDs/reviewer fields are not replaced by the responsible-account backfill. [Architecture](../../ARCHITECTURE.md#single-responsible-expert-and-canonical-local-entry--2026-10-29).

### Ordered Learning Content integration (V35–V38 PostgreSQL)

The existing 13 LearningModule properties and eight TEACHES properties remain unchanged. Ordered lessons, rich text bodies, uploaded binaries, creator/editor workflow, progress and notifications are not Neo4j properties. `contentUri` may identify an immutable `module-content:<content-id>` manifest, `contentType` is `application/vnd.adapt-learning.lessons+json` for mixed lesson packages, and `contentVersion` refers to that content snapshot. Legacy `text/markdown` references remain readable and are mapped to one Text lesson in PostgreSQL.

Lesson order is local to one Module content version. It is distinct from the learner's pathway module order; it does not introduce a global Module order or an exclusive Job Position owner. L&D approval publishes the existing complete Module/TEACHES projection only after the versioned PostgreSQL lesson package is valid. Binary assets remain private in MinIO; no object bytes, learner watch intervals or completion state are projected into this graph. See `ARCHITECTURE.md` for the manual confirmed-pathway integration and private delivery ownership; runtime test evidence is separate.

### R4 — skill-based authoring and lesson review (2026-10-29)

Module creation/content reuse/import no longer requires an Job Position. Existing LearningModule→MicroSkill TEACHES mappings remain the learning-coverage relationship; no LearningModule→Job Position relationship or new property is introduced. Old job positionIds in PostgreSQL workflow snapshots remain historical compatibility data; they are not a new Neo4j field and do not authorize Module edits. Numbered lesson cards in L&D revision details read the existing immutable content snapshot; no lesson review flag is projected into Neo4j. Legacy catalog intake is unchanged. [Runtime rules and verification boundary](../../ARCHITECTURE.md#skill-based-module-authoring-and-numbered-lesson-review--r4-2026-10-29).

### Assigned Module roadmap/timeline presentation — R5 (2026-10-29)

The restored Employee pathway surface uses the already approved Module snapshot and its TEACHES skill mappings. Manual assignments, learning pins and lesson progress remain PostgreSQL-owned; the diagram's connecting spine expresses the Expert-confirmed display order, not new prerequisite edges or generated recommendations. R5 adds no graph label, relationship, property or migration. Read-before-start returns an authorized released/pinned snapshot through the existing Learning View response without writing a pin. [Runtime ownership and verification](../../ARCHITECTURE.md#employee-roadmaptimeline-with-assigned-content--r5-2026-10-29).

### Original Employee presentation — R6 (2026-10-29)

R6 restores the original pathway and lesson layouts using existing authorized Module snapshots and TEACHES mappings. Selecting one pathway reads only its Module snapshots; no graph label, relationship, property or migration changes. Assignments, version pins and lesson/video progress remain PostgreSQL-owned. Empty assignment results produce a blank pathway body. [Runtime presentation boundary](../../ARCHITECTURE.md#original-employee-pathway-and-lesson-presentation--r6-2026-10-29).

### Adaptive Pathway UI integration — R7 (2026-10-29)

R7 reuses existing TEACHES metadata in original-style skill nodes and detail cards, without adding graph fields or inferring learner mastery. No label, relationship, property, migration or import change; assignments/pins/progress remain PostgreSQL-owned. [Presentation boundary](../../ARCHITECTURE.md#adaptive-pathway-component-integration--r7-2026-10-29).

### Initial pathway / learning content integration — 2026-10-29

The merge adds no graph label/property/relationship or catalog import. Initial planning continues to consume the existing catalog/TEACHES graph; Module authoring and content retain their current owners. PostgreSQL owns initial generation/review revisions as well as manual assignments, content snapshots, assets, pins and lesson progress. Generated lesson access requires current exact Expert approval and live dependency checks, plus an actual matching content version. Unsupported internal segment gates stay unavailable. [Runtime and migration lineage boundary](../../ARCHITECTURE.md#main--module-content-integration--2026-10-29).

### Manual test assignment removal — 2026-10-30

No Neo4j schema, catalog import or data deletion. Historical PostgreSQL manual assignments remain stored but no longer authorize learning or appear in active UI. Actual generated pathway authorization and versioned lesson/progress ownership remain unchanged. This supersedes the manual-display admission described in R5–R7 above.
