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

## Initial gap → pathway → review boundary — 2026-10-27

**Dated implementation record for catalog0.10.** The0.11 catalog contract above supersedes the old catalog-field descriptions in this section; incoming catalog data has not yet been integrated into pathway consumers or runtime. Preserve the original schema/cutover/baseline evidence as dated observations, not proof of0.11 deployment.

Historical0.10 references: [field schema](neo4j_schema.md), [conversion and provenance](dataset/INSTRUCTION_LEVELS.md), [unit evidence](testing/unit/REQ-016-instruction-level.md).

**Cluster2 source implementation is partial; no schema was applied or full flow verified.** [Canonical flow/API/data design sections9–10](features/Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md), [diagrams](diagrams/gap-pathway-initial-flow.md) and [acceptance-to-test plan](testing/REQ-041-042-initial-pathway-test-plan.md) separate the confirmed boundary, source implementation and missing owner integrations.

Sources → processing → storage → output:
1. Trusted Employee/org + explicitly selected catalog TargetRole and member Level + authoritative baseline profile and published requirements → own no-write gap preview. Each Role+Level is a distinct effective target; target mastery comes from that Level–Skill requiredScore. Conservative comparison/UNKNOWN never rewrite baseline.
2. Explicit Role+Level confirmation/current gap identity → durable generation request. Planned query/filter/rank/select/topo/validate runs in Java behind ports on a frozen relevant Neo4j catalog subgraph; not a new Python service. The same pair is a no-op; changing Level uses the existing assessment/archive/transaction guards. Full-Occupation baseline scope, allowance and historical pins remain unchanged.
3. PostgreSQL owns gap snapshots/requests/runs/proposal revisions/modules/targets/dependencies/overrides/exact approval/current pointers/receipts, participating in existing audit/outbox. Additive **V27 source** and JDBC adapters now exist; no migration was applied. Pre-task source head was V26; V4/V25 history is unchanged. Composite scope/FK constraints, immutable history and request-input guards avoid fabricated legacy keys/rank1..5 limits. New selection archive code requires V27 tables even if new admission/dispatch is disabled.
4. Expert assignment-scoped read/include/exclude/read-only revalidation/exact confirm → approved content revision; Employee projection/order and reusable backend approval/readiness/internal-segment policy. Routed Expert pages now consume API state, with no localStorage approval. Actual content/start/segment-owner mounting and authoritative owner policies remain absent, so full direct-access enforcement is unverified.

Owner source now supplies TEACHES.instructionLevel (FOUNDATIONAL/INTERMEDIATE/ADVANCED) in ontology0.10.0 review seed. Current Compose0.9 seed lacks it; source static inspection is not DB cutover/publication/suitability evidence. No change to owner Neo4j schema/dataset/importer in this task. Numeric legacy bands describe owner conversion only, not implicit runtime ranking.

The user-confirmed Role+Level amendment is implemented in selection/gap/admission and the existing Roles UI. Concrete Neo4j binding/graph consumers validate membership, schema publication metadata, unique identities and bounded results. ReleaseAuthority/PublishedSessions still need authoritative release/coherence integration. V25 role_snapshot stores new versioned Role+Level JSON wrappers without a new migration; legacy Role-only snapshots remain readable with unknown Level, without backfill. Rollback must retain these dual-format readers once new snapshots are written.

Later local cutover authority supersedes the source-only/no-DB status above: V27 was applied after backup, and source0.10 was imported into a separate release volume then sealed read-only. Original graph volume and historical learner/bank/model pins remain. Explicit local/demo review-seed opt-in supplies a source-hash/parity/read-only release adapter without changing NEEDS_EXPERT_REVIEW to APPROVED; production publication/release requirements are unchanged. Authentication bypass substitutes trusted identity only; Expert assignment remains another owner's integration. Mastery-band suitability remains Proposed and unimplemented. [Actual manual evidence and limits](testing/system/REQ-041-042-local-catalog-cutover.md).

The same gated local integration now supplies exact-artifact semantic compatibility: original seed/bank hashes and reconstructed eligibility fingerprint must match, and original/current skill properties may differ only in version. Evidence/mastery/pins are never rewritten; unknown provenance or changed meaning denies. Junior/Senior gap reads succeeded using the same original profile. This is not a production semantic-version mapping policy or approval to activate suitability/assignment/readiness substitutes.

Short scoped PostgreSQL commit/CAS plus source revalidation; no graph call under long learner transaction or distributed ACID claim. Request/worker/review consumers need exact replay, immutable revisions, durable retries and deduplicated outbox. Role/source drift cannot publish stale work or overwrite Expert edits; rollback retains compatible history and disables new admission/commands. Proposed API paths are not deployed endpoints.

Depth suitability/semantic compatibility/readiness and reviewer revocation depend on versioned owner ports; no fabricated numeric mastery bands or J/M/S-to-depth mapping. Locks enforce exact approved revision and real readiness on applicable backend access, not sort position/module completion alone. Post-learning assessment/tracing/REQ-043 remain outside scope.

C2 source separates preview gapInputHash, resulting-selection planningInputHash and immutable revisionContentHash. Current readiness results do not mutate approved gate definitions/content. D10 uses separate generation/review/validation fields; accepted replay resolves its scoped receipt before new-command revision checks. D12 implements token/lease fencing in source, still unverified at runtime. Coherent catalog release/fingerprint and approval-revocation protocols remain owner dependencies; a PostgreSQL lock cannot certify cross-store freshness.

C2 Java21 compile (all tests skipped), FE TypeScript/Vite build and scoped lint completed; lint has0 errors/3 pre-existing warnings and Vite reports bundle size. Manual visual/full-flow work remains Not run because browser inventory is empty and owner integrations/runtime environment are unavailable. No DB/container/import or executable tests were performed. New API/auth/dispatch are default-off and local-demo+property+!prod gated; missing owner adapters deny. G/P/R/E acceptance remains Planned/Not run; Cluster2 remains in progress, with no automatic Cluster3 transition.
