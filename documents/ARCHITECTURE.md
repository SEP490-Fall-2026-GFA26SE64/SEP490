# Current project architecture

## Product contract and ownership

[System overview](adapt_learn_graph_system_overview.md) and approved feature contracts define required behavior. [Role-to-baseline contract](features/Target%20role%20selection/Role%20Selection%20and%20Occupation%20Baseline.md) defines current REQ-001/002 behavior; implementation status and external integration limitations are recorded separately in the [synchronization review](testing/system/REQ-001-002-final-synchronization-review.md). An architecture inventory is not production acceptance.

The product serves one organization; organization IDs and tenant isolation remain required query/command boundaries. Actors are System Administrator, L&D Manager, Expert and Employee. Temporary SRSv2 actor/SaaS/S2–S4 differences remain unresolved; this review does not adopt them or alter other owners' scope.

| Boundary | Current product owner/responsibility | Design or migration gap |
| --- | --- | --- |
| Identity and administration | System Administrator owns accounts, access roles, technical settings and activity monitoring | Agree current actor-code mapping, account lifecycle, settings inventory and audit-read permissions; no automatic mapping from old administrator codes |
| Discipline catalog | L&D manages disciplines and assigns/removes Experts; Experts author assigned-discipline content | Discipline identity, content membership and assignment history are not established by the V5 `JobDomain` label |
| Target roles | L&D creates/assigns; Expert configures competencies/skills/proficiency/importance and submits completion; L&D publishes/unpublishes | Separate configuration-completion and publication contract from legacy `ACTIVE` status; L&D must not edit Expert requirements |
| Learning offerings | Expert authors modules, lesson/practice content and module assessments; L&D approves or returns revisions | Module/content storage, versioned content membership, submission/approval state and learning availability require design |
| Baseline assessment | One Blueprint/org+Occupation, full deduplicated union/common bounds, profile-authoritative Role-first entry, pinned attempt/result/history | Required behavior is confirmed; current owner integration and validation limits are recorded in the synchronization review. |
| RIASEC and role guidance | Employee completes RIASEC; system uses baseline/RIASEC to suggest roles/comments; Expert confirms/revises/rejects; Employee selects/confirms | Interest result, AI data contract and review workflow/versioning require design; legacy soft-skill evidence is not RIASEC |
| Pathways | System generates from gaps; Expert reviews/adjusts/confirms before Employee starts | Initial access gate, review state, module overrides and later evidence-driven revision policy require design |
| Individual skill learning | Employee selects skill and accesses suitable mapped approved Modules without changing role pathway | Separate independent progress/context from pathway selection; reuse valid assessment evidence through tracing boundary |
| Competency and adaptation | System traces estimates, calculates gaps, updates progress and revises remaining learning when needs change | Model/thresholds, evidence replay/versioning and override preservation remain open; failure-only triggers are superseded |
| Monitoring | L&D views profiles/gaps/results/progress; System Administrator views permitted audit/operational activity | Privacy/read contracts and metrics; no platform subscription/organization-count workspace |

## Sources, processing, stores and output

- Java 21/Spring Boot 3.5 is the only production backend. Domain/application rules depend on ports. JDBC/Neo4j adapters map persistence at infrastructure boundaries; no separate Python runtime service or Redis state authority is introduced.
- Neo4j owns Occupation/TargetRole/Level/Competency/MicroSkill/LearningModule catalog relationships and shared version/review metadata. Publication and tenant visibility require owner validation beyond uniqueness constraints. Learner mastery/pathways never live in Neo4j.
- PostgreSQL owns identity/permissions, selection/history, configuration/activation, individual attempts/pools/responses/deadlines/result/evidence, profiles, technical calibration provenance, receipts/audit/outbox and downstream learner state.
- Employee selects current Role → server resolves Occupation → reads authoritative profile coverage → resumes pinned attempt or requires full-Occupation baseline if incomplete. Profile completeness is skill-record coverage, not proficiency. Existing profile/replacement-chain versions and skill sets remain bound.
- Sufficient genuine finalization initializes mastery with no score threshold; early insufficient manual submission is terminal with no mastery/profile. Result/history/My Mastery use safe own-record projections. Later-learning profile processing and downstream delivery remain explicit integration responsibilities.

## Runtime topology

![Development runtime topology](diagrams/runtime-topology.svg)

[Source](diagrams/runtime-topology.puml). PostgreSQL and Neo4j start before schema migration, catalog/content initialization and API startup. Flyway changes PostgreSQL only. Initialization never generates Blueprint versions or learner completion/history. Deployment-specific activation and replacement instructions are operational records, separate from business contracts.

## Verified PostgreSQL storage

Read-only capture on 2026-10-23: PostgreSQL17.6, V1–V26 successful with all26 source checksums matching. [Catalog](diagrams/postgresql-schema-catalog.json): **89 platform tables,729 columns,628 constraints,189 FKs,213 indexes,99 user triggers,39 functions**. Flyway metadata is outside platform. [FK inventory](diagrams/postgresql-foreign-keys.md) includes composite relationships; counts do not prove actor authorization.

![PostgreSQL overview](diagrams/postgresql-overview.svg)

| View | Owned tables | Diagram |
| --- | ---: | --- |
| Identity, catalog and processing | 17 | [SVG](diagrams/postgresql.svg) |
| Legacy assessment and shared learning | 32 | [SVG](diagrams/postgresql-assessment.svg) |
| Recommendation, analytics and evaluation | 13 | [SVG](diagrams/postgresql-pathway.svg) |
| Adaptive baseline configuration | 9 | [SVG](diagrams/postgresql-adaptive-blueprint.svg) |
| Adaptive baseline attempts and evidence | 9 | [SVG](diagrams/postgresql-adaptive-attempt.svg) |
| IRT calibration and scoped selection | 6 | [SVG](diagrams/postgresql-irt.svg) |
| Current Role selection and initial Occupation profile | 3 | [SVG](diagrams/postgresql-role-profile.svg) |

Every table/column belongs to one detail group; external parents are reference stubs. [Generation, visual review and limitations](diagrams/README.md). The 20 October adaptive target is intentionally historical, not a current schema reference.

| Migration range | Structural responsibility |
| --- | --- |
| V1–V7 | Identity/catalog/evidence/learning/pathway/analytics and legacy selection/replay |
| V8–V17 | Item metadata, fixed Blueprint/series/history, manifests, working transitions, reveal audit |
| V18–V19 | Adaptive configuration/activation/technical versions and pinned attempts/result/evidence |
| V20–V22 | Conditional full/legacy scope, name/duration bounds and explicit Draft conversion receipts |
| V23 | Scoped future parameter selection and immutable promotion receipts |
| V24 | DISCARD command operation |
| V25 | Current string-ID selection/receipt namespace and immutable initialized Occupation profile |
| V26 | Terminal insufficient-evidence manual invalidation |

No applied migration is edited. Old UUID selection/reference and fixed/module structures remain historical/compatible storage; current catalog IDs are not silently cast/remapped. Current initialization records do not establish later-learning profile processing. [Field/transaction design](features/Baseline%20knowledge%20assessment/Adaptive%20Baseline%20Data%20Architecture.md).

## Catalog and version boundaries

### REQ-013 local authoring persistence — V27

The local `/api/v1/module-management` workflow implements reviewed Module authoring. This does not migrate legacy catalog/learning_activity references or provide a production identity adapter. The main login’s existing local workspace cookie is reused, requiring an explicit cookie and active PostgreSQL account; account organization and roles are resolved server-side, without a Module-specific login or Basic accounts; Occupation grants and Module membership are explicit PostgreSQL records. A grant in any owning Occupation permits reading/editing a shared Module; membership creation requires all declared scopes, and ordinary edits cannot change membership.

| Table | Columns and ownership |
|---|---|
| `module_authoring` | `organization_id`, `module_id`, `document` JSONB; unique module_id. Document contains id, organizationId, occupationIds, immutable createdBy/createdAt, lockVersion, everReleased, archived, releasedRevision, revisions and history. |
| `module_authoring_content` | `organization_id`, `content_id`, `document` JSONB. Immutable content record: id, title, markdown, contentType, contentVersion, occupationIds, createdBy, createdAt. No backend URL fetch. |
| `module_occupation_grant` | `organization_id`, `expert_id`, `occupation_id`, `active`; primary key is the three identities. |
| `module_grant_audit` | `event_id`, `organization_id`, `expert_id`, `occupation_id`, `active`, `changed_by`, `changed_at`; records every grant/revoke command with trusted actor/time. |
| `module_learning_pin` | `organization_id`, `learner_id`, `module_id`, `revision`, `started_at`; unique learner+Module within organization; FK to authoring aggregate. Existing pins survive archive. |

Revision fields are number, state, payload, editedBy, editedAt, decidedBy, decidedAt, feedback. Payload includes the complete 13-field Module contract, teachings with all eight relationship fields plus skill endpoint/name, and exact content snapshot. History event fields are sequence, revision, action, actorId, occurredAt, detail. Each edit adds a new payload revision; review transitions act on an unchanged submitted payload, and lifecycle events retain prior decisions. Changes include field names in audit; prior payloads allow comparison. Reviewer fields are not editor fields; catalog version is not authoring revision.

Commands serialize with an organization advisory transaction lock and Module row lock; expectedVersion prevents stale writes. A submitted package is not editable. Approval commits PUBLISH_PENDING before attempting the Neo4j transaction, then records RELEASED and the published revision only after graph success. ARCHIVE_PENDING works similarly. These durable states are a manually dispatched outbox equivalent: the L&D Retry action reapplies an idempotent projection; no scheduled dispatcher is claimed. A failed graph projection leaves the pending state for retry and does not advance the released revision. Graph and PostgreSQL are not a distributed transaction; learning admission uses PostgreSQL's released receipt, not a graph status alone.

Neo4j projection validates skill endpoints and coverage, preserves stable retained TEACHES IDs, and maps all current schema properties. Draft/revision/audit/Occupation membership do not add graph properties. Archive projection preserves the pinned payload in PostgreSQL; restore creates a draft and requires approval. Pin APIs serve new authoring packages only; integrating reviewed pathways and all historical learner activities remains required before treating them as the complete product learning boundary. Legacy Module write endpoints return 410 rather than bypassing review; legacy read compatibility remains distinct from this authoring API.

### REQ-013 requirement decisions — 2026-10-28

[Learning Module Management](features/Learning%20module%20management/README.md#user-decisions--2026-10-28) now requires system-generated IDs, duplicate titles allowed, complete Module/TEACHES data before save, and joint L&D approval of Module/content/mapping selected from Content Studio. Experts may edit other authors' Modules within assigned scope; edits require approval before release and a visible editor/change history. Approved changes create revisions; ongoing learners retain their original package pins, and new starts use the newly released revision. Only unreferenced drafts may be physically deleted; approved Modules require L&D approval of Expert archive requests. Restoration returns to draft for reapproval.

The subsequent follow-up confirmed Occupation grants, shared editing with any owning Occupation grant, creator/editor history, Markdown-embedded HTTPS video and continued pinned learning after archive. The local V27 implementation is described above; it is not a claim of production identity integration or legacy data migration. Catalog version/review metadata are not authoring revision/audit records. No new graph node/property/edge or implicit authorization from legacy TargetRole assignments is introduced.

![Ontology0.11.0](diagrams/neo4j.svg)

[Neo4j schema](neo4j_schema.md) and [ontology source](dataset/ONTOLOGY.md) define the v0.11.0 review ontology: six labels/seven relationship types, separate Levels and many-to-many LearningModule–MicroSkill teaching. The current review catalog has 994 nodes/5121 relationships, 246 Modules, 79 skills and 664 TEACHES mappings. It preserves the source-linked modules and adds explicitly local authored practice scaffolds pending review. Every Module teaches at least one skill and every skill has at least one provider; each Module–Skill pair is unique. Multiple providers are alternatives selected for actual skill gaps and role/Level suitability, not a requirement to study all providers. A Module used for several gaps appears once in the pathway, while mastery remains skill-specific. The earlier 2026-10-23 runtime capture observed Neo4j5.26.31, ontology0.8.0,827 nodes/4536 relationships and six ID uniqueness constraints; this is dated history, not proof of 0.9 deployment. Cardinality/ranges/prerequisite acyclicity/review/tenant visibility require application/import validation. These observations do not certify production publication.

Ontology/catalog version, Flyway migration, Blueprint release/Draft revision and model/mapping/parameter-set pins are separate identities. New scoped effective selection affects future Blueprint versions only; resume/result/history always use original exact pins. Numerical validity cannot be inferred from a storage label or successful API response.

## Consistency, authorization and compatibility

All applicable API/query boundaries resolve trusted actor/org and authorize before reading receipts or resource existence. Scope predicates precede counts/paging and protected reads. Current routing has one intended handler per profile; retained legacy readers never become a second active route implicitly.

Selection/start serialize learner coordination. Management uses exclusive scope/activation locks; genuinely new starts hold shared locks until attempt/pool/first-item/receipt commit. Save uses Draft-ID+revision CAS; lifecycle commands confirm current pair. Finalization/profile/evidence/outbox commit atomically; read projections never mark delivery. Cross-store fingerprints detect drift without claiming distributed transactions.

Forward-only compatibility preserves historical JSON/snapshots/pins/receipts/allowance. Rollback stops admission and uses a compatible reader; no down migration, reset, re-score, repin or old-only binary after new-format records. [Lifecycle and recovery contract](features/Baseline%20knowledge%20assessment/Occupation%20Baseline%20Lifecycle%20and%20Transition.md).

## Verification and remaining design work

See [synchronization review](testing/system/REQ-001-002-final-synchronization-review.md) for actual commands/results, temporary integration references, mismatches, security/dependency/rollback review and acceptance gaps. Builds, metadata and manual smoke are distinct from executable acceptance. Real Identity/grants/revocation, catalog publication/release, approved model/content/pilot validation, profile updates, activity/pathway integration and downstream delivery remain required. No current deployment/production readiness is asserted.

## Module–Skill cardinality alignment — 2026-10-26

User-approved REQ-016-F01/F02 correction replaces the one-to-one TEACHES rule with many-to-many. Node/property inventories and store ownership are unchanged. All metadata, content pointers and relationship properties are preserved; null review fields retain their unreviewed meaning. The v0.8 question-bank envelope remains immutable historical provenance; the new local demo envelope pins v0.9 without changing any item content or identity. Existing graph/catalog versions, attempts, mastery and pathway history must not be silently overwritten, rescored or repinned. See [verification and upgrade limits](testing/system/REQ-016-many-to-many-teaching.md).

## Teaching focus and difficulty — 2026-10-28

The v0.11 review catalog replaces instructionLevel with **two independent required text properties on each TEACHES relationship**:

| Property | Allowed values | Meaning |
|---|---|---|
| teachingFocus | PRIMARY / SUPPORTING / INCIDENTAL | Main instructional objective, supporting practice, or provided context only. |
| difficultyLevel | LOW / MEDIUM / HIGH | Difficulty of the tasks for that particular skill in the Module. |

PRIMARY identifies the objective the package is designed to teach directly. SUPPORTING has an explicit supporting exercise; it does not automatically replace a PRIMARY treatment. INCIDENTAL is exposure/context, with no instructional objective or mastery credit and must not be treated as closing a skill gap. Display labels may be Primary/Supporting/Incidental; JSON and graph use the uppercase enums above.

Both properties belong to the exact Module–Skill pair, not globally to a Module or MicroSkill. A Module may contain PRIMARY + HIGH for one skill, SUPPORTING + MEDIUM for another and INCIDENTAL + LOW for a third. Changing teachingFocus does not determine difficulty. Difficulty is not calculated from a numeric gap, requiredScore, legacy coverage, or a selected role title. No scoring/ranking engine is implemented by this catalog change.

The current review package has **994 nodes and 5,121 relationships**, including **246 LearningModules and 664 TEACHES pairs**. It retains all 85 existing modules and 181 teaching pairs, and adds **161 locally authored focused practice packages**, each with a primary objective, a supporting exercise and incidental context. Every one of the 79 skills now has a PRIMARY option at LOW, MEDIUM and HIGH. This is a review-dataset completeness criterion, not a universal graph cardinality rule requiring every future catalog to have three providers.

| Teaching focus | Pairs |
|---|---:|
| PRIMARY | 246 |
| SUPPORTING | 257 |
| INCIDENTAL | 161 |

Difficulty counts across all roles: LOW 372, MEDIUM 178, HIGH 114. For example, MOD-FOCUS-CORE01-HIGH teaches MS-CORE01 as PRIMARY/HIGH, MS-CORE02 as SUPPORTING/MEDIUM and MS-CORE03 as INCIDENTAL/LOW. MOD-READ-CORE01 remains a PRIMARY/LOW option for MS-CORE01, while MOD-FOCUS-CORE01-MEDIUM provides PRIMARY/MEDIUM.

All 85 original module IDs and original duration/price estimates are retained. Exactly one leading skill is PRIMARY; remaining practice is SUPPORTING. Nine formerly co-primary packages now have clearer titles, revised content references and version 1.3, with narrowed supporting tasks rather than unchanged co-primary work. Original content files are preserved for historical pins. Existing task modes (guided, independent, complex review) inform the authoring choices, not learner scores. These decisions remain NEEDS_EXPERT_REVIEW.

The 161 new packages include distinct guided/independent/complex tasks, supporting work, contextual material, evidence checks and assessment boundaries. They are **lesson/lab scaffolds pending expert authoring, sandbox assets and approval**, not complete production courses or official O*NET/ESCO mappings. The supplied contextual skill is not a newly asserted prerequisite. Prices/durations are review estimates, not vendor quotes or measured learning gains.

Six node labels, seven relationship types and store ownership remain unchanged. Keep existing skill prerequisites; module completion does not establish mastery. A selected Module is counted once for duration/price even when it addresses several gaps. The original instructionLevel/coverage representations and v0.9 runtime seed remain historical; no current runtime graph, API or learner history is migrated.

## Independent role-Level requirements

Each TargetRole owns distinct Level nodes. Each Level has its own REQUIRES_SKILL set and requiredScore values; sets may overlap or differ and are not constrained to be nested. Module selection occurs through missing skills; no direct Level–Module edge is added.

Application Developer currently has 11 required skills at Junior, 14 at Middle and 14 at Senior. MS-CORE01 thresholds are 0.60 / 0.75 / 0.90. MS-FS08, MS-FS15 and MS-FS16 occur at Middle/Senior but not Junior in this role. Those requirements and all non-teaching relationships are preserved. A Senior target does not make every recommended module HIGH; readiness and compatible evidence still govern suitability.

[Current catalog details and manual checks](dataset/TEACHING_FOCUS_DIFFICULTY.md).


## Exactly one PRIMARY per Module — confirmed 2026-10-28

Every Module must have **exactly one** TEACHES relationship with teachingFocus=PRIMARY. Zero or two-or-more primary links are invalid, including replacements that leave a module without its primary skill. A MicroSkill may still be PRIMARY in many different Modules at the same or different difficulties. SUPPORTING and INCIDENTAL links remain optional; they do not count as additional primary objectives.

All 246 current Modules satisfy the rule; 664 teaching pairs remain populated (246 PRIMARY, 257 SUPPORTING, 161 INCIDENTAL). Every skill retains PRIMARY LOW/MEDIUM/HIGH choices. Nine alternative packages (DE01, FS03 and FS07 at each difficulty, IDs ending -ALT) provide same-primary/same-difficulty options with different supporting skills and verification tasks. These are locally authored scaffolds pending review, not vendor courses or validated learning gains.

The nine formerly co-primary MODEL/SERVICE/AUTO packages now have one main objective, smaller supporting work and content version 1.3 in new -single-primary.md files. Existing IDs, difficulty values, prerequisite/Level requirements and all original price/duration values are preserved. The revised titles/content pointers are audited in revisedExistingModules in the authoring manifest; historical original files and v0.10/v0.9 seeds remain unchanged.

The isolated import validator enforces the count and tests reject both zero and multiple PRIMARY links. Neo4j uniqueness constraints alone cannot enforce this relationship aggregate; future catalog write APIs must apply it transactionally. No runtime API/database upgrade is claimed.

Manual check: open Teaching Map or Module Checks in the workbook. Every module must have Primary count=1 and structural result OK. Compare MOD-DE-J-MODEL-01 with MOD-FOCUS-DE01-LOW-ALT: both teach MS-DE01 as PRIMARY/LOW, but use different supporting skills/tasks. Skill Options must retain nonzero counts for all three difficulties. On an optional isolated review graph at http://localhost:7479/browser/, run:

```cypher
MATCH (m:LearningModule)
OPTIONAL MATCH (m)-[t:TEACHES {teachingFocus:'PRIMARY'}]->(:MicroSkill)
WITH m, count(t) AS primaryCount
WHERE primaryCount <> 1
RETURN m.id, primaryCount;
```

Expected: no rows. This is a manual procedure; no live runtime database is changed.

## Neo4j catalog list — user-requested correction (2026-10-28)

REQ-013-F02 `/module-list` reads current catalog LearningModule/TEACHES from Neo4j and joins authorized PostgreSQL authoring documents by ID; authorized unprojected drafts are included once. Shared ontology browsing is explicitly available to Expert/L&D, without authoring grants; private authored IDs remain organization/scope protected. Filters precede pagination. Catalog data wins for graph-backed rows, and revisions/audit remain PostgreSQL-owned. Missing legacy fields are exposed as absent, never generated. No schema or historical data migration occurs. [Detailed read contract](features/Learning%20module%20management/View%20Learning%20Modules.md#neo4j-catalog-list--user-requested-correction-2026-10-28).

## Authorized local v0.11 runtime upgrade — 2026-10-28

The user-requested live catalog upgrade is now executed for the application on port 28088. The exact v11 catalog contains 994 nodes/5121 relationships (246 Modules/664 TEACHES); 13 separately authored Modules and their 13 mappings are preserved, making the full graph 1007 nodes/5134 relationships. All Module duration/price and TEACHES focus/difficulty values are populated; no new schema properties or artificial review/audit records were introduced. PostgreSQL still owns the unchanged authoring/history/learner/item pins; all 94 platform-table fingerprints match the backup after restart. The existing-bank bootstrap now verifies an exact frozen bank read-only, so a new current graph does not trigger a historical bank reseed. [Upgrade and recovery receipt](dataset/NEO4J_V011_LOCAL_UPGRADE.md). This supersedes earlier observations of the running v09 catalog, not their historical test results.

### L&D module review navigation — REQ-053 (2026-10-28)

Content Approval stays at `/ld-manager/approvals`; Modules and Learning content resolve to `/ld-manager/modules` and `/ld-manager/learning-content`. All retain the L&D shell and Content Approval sidebar selection. Details/history open without switching actor. Submitted authoring revisions expose manager review actions; graph-only catalog entries remain read-only and are not automatically submitted. This routing correction changes no schema, storage responsibilities, seed data or API authorization.

### REQ-013 per-module catalog intake — V28

PostgreSQL `platform.module_catalog_intake`: `module_id text PRIMARY KEY` (global identity claim), `organization_id text NOT NULL`, `document jsonb NOT NULL`. JSON Intake: `moduleId`, `organizationId`, nonempty unique `occupationIds`, `assignedBy`, ISO `assignedAt`, full `source: CatalogModule`, nullable `acceptedBy`/`acceptedAt` until acceptance, and nonempty `history: Event[]` recording assignment changes. CatalogItem adds nullable scoped Intake; Document adds nullable Intake for provenance; native-created documents remain compatible without it.

Imported Document/Content `createdBy` is null (unknown original creator); `createdAt` records local intake-record creation. Assignment and acceptance actors/times are separate mandatory provenance. Source carries every Module and TEACHES property plus endpoints; snapshots never substitute catalog version for authoring revision. Existing V27 JSONB stores revisions/content. The immutable source Markdown is bundled from `documents/dataset/import/content/modules/*.md` under classpath `catalog-import`; only allowlisted single-file paths can be read, no network retrieval. Missing/unsafe/incomplete sources fail closed with no partial intake writes.

Per-org SQL transaction lock plus global module advisory lock and V28 primary key serialize intake. Authoring membership grants enforce any-owning-occupation access; only L&D assigns. No ontology attributes are added. First publication checks original graph snapshot (or exact already-projected package on retry) under Neo4j node lock; imported drafts cannot be hard-deleted. Existing pin/archive/publication responsibilities remain. [Function contract](features/Learning%20module%20management/Receive%20Imported%20Module.md).
