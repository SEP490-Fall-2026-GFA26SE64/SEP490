# Current project architecture

Updated2026-10-23. Current schema verified read-only: PostgreSQL17.6,23 successful Flyway migrations V1-V23 with source checksums matching,86 platform tables/703 columns. [Exact review/evidence and limitations](testing/system/REQ-002-memory-schema-sync.md). Historical build/test/manual results remain in their dated evidence; this review adds no executable acceptance.

## Product and implementation boundary

[System overview](adapt_learn_graph_system_overview.md) and approved Function contracts define scope. The system serves one organization; existing organization IDs/isolation remain enforced compatibility boundaries. Human actors: System Administrator, L&D Manager, Expert, Employee. SaaS registration/subscriptions/payments/PayOS are excluded. Temporary SRSv2 actor/SaaS/S2-S4 differences remain unresolved; implementation does not silently settle them.

| Boundary | Current product owner/responsibility | Design or migration gap |
| --- | --- | --- |
| Identity and administration | System Administrator owns accounts, access roles, technical settings and activity monitoring | Agree current actor-code mapping, account lifecycle, settings inventory and audit-read permissions; no automatic mapping from old administrator codes |
| Discipline catalog | L&D manages disciplines and assigns/removes Experts; Experts author assigned-discipline content | Discipline identity, content membership and assignment history are not established by the V5 `JobDomain` label |
| Target roles | L&D creates/assigns; Expert configures competencies/skills/proficiency/importance and submits completion; L&D publishes/unpublishes | Separate configuration-completion and publication contract from legacy `ACTIVE` status; L&D must not edit Expert requirements |
| Learning offerings | Expert authors modules, lesson/practice content and module assessments; L&D approves or returns revisions | Module/content storage, versioned content membership, submission/approval state and learning availability require design |
| Baseline assessment | One Blueprint per org+Occupation; full deduplicated active-role skill/item union, common bounds; Save/Preview/Activate, direct Deactivate, confirmed replacement; pinned individual attempts/results/history | V18-V23 and full/legacy runtime paths implemented locally. Explicit demo bypass supports full operations; actual Identity/Catalog/review/model/pilot and executable/numerical validation remain open. |
| RIASEC and role guidance | Employee completes RIASEC; system uses baseline/RIASEC to suggest roles/comments; Expert confirms/revises/rejects; Employee selects/confirms | Interest result, AI data contract and review workflow/versioning require design; legacy soft-skill evidence is not RIASEC |
| Pathways | System generates from gaps; Expert reviews/adjusts/confirms before Employee starts | Initial access gate, review state, module overrides and later evidence-driven revision policy require design |
| Individual skill learning | Employee selects skill and accesses the mapped approved Module without changing role pathway | Separate independent progress/context from pathway selection; reuse valid assessment evidence through tracing boundary |
| Competency and adaptation | System traces estimates, calculates gaps, updates progress and revises remaining learning when needs change | Model/thresholds, evidence replay/versioning and override preservation remain open; failure-only triggers are superseded |
| Monitoring | L&D views profiles/gaps/results/progress; System Administrator views permitted audit/operational activity | Privacy/read contracts and metrics; no platform subscription/organization-count workspace |

## Sources, processing, stores and output

- Java21/Spring Boot3.5 is the only production backend. Application/domain rules depend on ports; JDBC/Neo4j/HTTP adapters supply integration. Java estimates IRT and selects items; there is no separate Python runtime service or Redis source of truth.
- Neo4j owns catalog data: Occupation -> TargetRole -> Level -> Competency/MicroSkill requirements, and one LearningModule per MicroSkill. PostgreSQL pins stable IDs/display snapshots/relevant exact versions. Catalog IDs alone do not prove tenant visibility, publication or a consistent release.
- PostgreSQL owns identity/roles, target selection, Blueprint configuration/activation, attempts/pools/responses/deadlines/results/mastery evidence, calibration provenance, receipts/audit/outbox and future mastery/gap/pathway/analytics state. Neo4j never owns learner mastery/pathways.
- New baseline versions assess the full deduplicated active-role union with one maximum/duration pair; Role is entry provenance. Historical Role/exploration-specific versions/attempts retain their original pins/meaning. Current projections expose derived assessmentScope, not a new stored column or a reinterpretation of old evidence.

## Runtime topology and local demo

![Runtime topology](diagrams/runtime-topology.svg)

[Source](diagrams/runtime-topology.puml). Main `docker compose -f compose.dev.yml up --build -d` runs migration `local,migrate` before API `local,local-baseline-demo`; web is Vite with source mounts. Flyway migrates PostgreSQL only. Former graph/sample bank/target-selection seeders and technical bootstrap were retired; `CATALOG_SEED_ENABLED=false` and legacy graph writers off. Existing graph/bank/volumes/history are retained. Official import is an explicit separate profile/operation, not startup.

The user explicitly approved [Local Demo Flow](features/Baseline%20knowledge%20assessment/Local%20Demo%20Flow.md) to prioritize UI/full baseline operations. Gate: local-baseline-demo + assessment.baseline.local-demo.enabled=true + !prod. Explicit primary demo ports select fixed server personas, unreviewed ACTIVE graph/DRAFT bank and one exact SYNTHETIC fitted/reference pin. This is not authentication/review/model approval. Blueprint actor/grants use static persona data (no Identity revocation check); Employee context separately reloads persisted active account/EMPLOYEE role/org. No-cookie defaults to L&D. Dedicated demo provisioning is transactional, additive and idempotent; no completion/history reset or official content mutation. Detailed bypass/replacement: TMP-REQ002-12 and the demo contract.

Official source: ontology0.8.0/OCC-15-1212.00/8 Roles/24 Levels/15 skills/135 DRAFT items. Minimum3/skill ->45 questions; walkthrough45 questions/2700sec. Save/Preview/Activate/attempt/answer/resume/deadline/result/evidence/allowance/history use real domain/JDBC rules. Selected-role entry still needs owner REQ-001 selection; use direct Occupation exploration for demo. Admin persona has no calibration UI. Operational IRT administration, legacy fixed authoring and answer reveal remain off. REQ-041 delivery and downstream demo-data exclusion are open.

Production remains deny-by-default. [compose.prod.yml](../compose.prod.yml) serves static assets through Caddy; local demo is excluded by !prod. Actual principal/grants/revocation, owner-approved catalog/review/model/pilot/readiness must replace temporary wiring; health/startup is not production readiness.

## PostgreSQL schema and generated diagrams

[Schema catalog](diagrams/postgresql-schema-catalog.json):86 tables,703 columns,610 constraints/185 FKs,207 indexes,97 user triggers,39 functions. Source SHA-256 and Flyway checksums are recorded. [Foreign-key inventory](diagrams/postgresql-foreign-keys.md) preserves all composite/cross-group definitions. No business rows/credentials captured. Current diagrams replace the stale V17/62-table sources/SVGs.

![PostgreSQL overview](diagrams/postgresql-overview.svg)

| Storage view | Owned tables | Diagram |
| --- | ---: | --- |
| Identity/catalog/processing |17 | [SVG](diagrams/postgresql.svg) |
| Legacy assessment/shared learning |32 | [SVG](diagrams/postgresql-assessment.svg) |
| Pathway/analytics/evaluation |13 | [SVG](diagrams/postgresql-pathway.svg) |
| Adaptive Blueprint/activation/receipts |9 | [SVG](diagrams/postgresql-adaptive-blueprint.svg) |
| Adaptive attempt/result/evidence |9 | [SVG](diagrams/postgresql-adaptive-attempt.svg) |
| IRT/mapping/effective selection |6 | [SVG](diagrams/postgresql-irt.svg) |

All columns are drawn once in their owning group; cross-group parents appear as reference stubs. PK/FK and nullable markers are structural, not business authorization/cardinality proof. [Generation commands/source/limits](diagrams/README.md). The20 October adaptive target drawing is explicitly historical and superseded; no longer a live-schema reference.

### Migration ownership and compatibility

| Versions | Stored contract |
| --- | --- |
| V1-V7 | Platform schema; identity/catalog release/reference; assessment/evidence/learning; pathway/analytics/evaluation; publication/activity guards; organization baseline; target selection snapshot/idempotent command |
| V8-V13 | Item MicroSkill/difficulty metadata; fixed Blueprint identity/immutable versions/counts/weights; authoring receipts; generated manifest/exact-hash review/publication; Occupation identity |
| V14-V17 | Tenant-scoped fixed series/working revisions/transitions, command receipts, protected-answer audit and corrected actor trigger |
| V18 | Adaptive working/version/role/skill/activation registries/commands; model configuration/mastery mapping/IRT run/set/item provenance |
| V19 | Adaptive attempts/pool/presented item/response/skill state/command/result/skill result/mastery evidence |
| V20 | Explicit new full-Occupation scope/bounds and conditional legacy compatibility; no historical relabeling |
| V21 | New-format name<=100 Unicode chars and total=maxQuestions*(30..120sec); legacy rules retained |
| V22 | Explicit audited legacy Draft conversion receipt |
| V23 | org+bank+model effective parameter selection/revision and immutable promotion-command receipt |

V1-V23 remain forward-only/unchanged. Actual schema already includes V23; no new migration was needed for demo or this review. Applied schema does not imply operational promotion: demo uses an exact V18 SEEDED/PROMOTED storage set with SYNTHETIC provenance, no actual-pilot run/V23 pointer/receipt. Production C2 rejects synthetic; [calibration contract](features/Baseline%20knowledge%20assessment/Calibrate%20and%20Promote%20IRT%20Parameters.md).

Retain V8 direct-metadata item compatibility (all metadata present or absent; absent legacy rows excluded from baseline), legacy weighted item_skill_mapping and all fixed definitions/manifests/history. V14 changed logical Blueprint uniqueness to organization+Occupation, preserving legacy null compatibility. Fixed series locks/working revision/transition/receipt/audit tables remain, but new UI follows adaptive Save/Preview/Activate; old Generate/Review/Publish and protected-answer handlers additionally require default-off legacy-authoring gates.

Adaptive writes retain scope coordination, Draft-ID/revision CAS, expected-current confirmation, exact normalized hash/receipt replay and atomic activation/admission ordering. Reads/list/Deactivate can use PostgreSQL authorization/projection without current Catalog; new changed config/new start still need exact source readiness. Resume/finalization/results read pinned data. Detailed operations/errors/locks: [lifecycle contract](features/Baseline%20knowledge%20assessment/Occupation%20Baseline%20Lifecycle%20and%20Transition.md) and [data architecture](features/Baseline%20knowledge%20assessment/Adaptive%20Baseline%20Data%20Architecture.md).

## Neo4j and target-selection integration

![Ontology0.8.0](diagrams/neo4j.svg)

[Schema fields/invariants](neo4j_schema.md), [ontology source](dataset/ONTOLOGY.md). Six entity labels/seven relationship types;48 independent reported-title Roles, three local Levels each; only MicroSkill prerequisite links; one-to-one LearningModule TEACHES. Occupation has six normalized O*NET RIASEC values. Scores/ranges/membership/acyclicity/publication require owner/import validation beyond Community uniqueness constraints.

Official graph cutover/readback on22 October recorded827 nodes/4536 relationships/six constraints; no graph mutation or fresh full payload verification is claimed by this23 October schema review. Legacy graph seeder/migration utilities are removed from main source or test-only. Legacy CRUD is off until owner conversion; old adapters/selection domain contracts are not automatically migrated by importing0.8.0.

PostgreSQL catalog_release/catalog_reference and legacy stable graph id/code contracts need Person2's approved mapping/release/visibility. REQ-001 F02 uses learner-scoped locking/revision, immutable role_snapshot, target_selection_request, audit/outbox in one transaction; it never creates a missing catalog reference. Local configured actor/CSRF wiring is not production security. AssessmentActivityGuardPort now reads real organization+learner-scoped IN_PROGRESS adaptive attempts; the old boolean/property bean was removed. Other assessment families/pathway SUPERSEDED mapping and cross-owner locking still need owner alignment. No startup cross-store seed or sample selection is recreated.

## Implementation layout and verification

Backend feature packages use api/application/domain/infrastructure. Main resources contain PostgreSQL V1-V23; graph migration helpers/fixtures are test-only. Assessment includes adaptive Blueprint/attempt/psychometrics/calibration/demo packages and explicit official importer. Frontend extends src/app, src/features, src/shared; one adaptive baseline route with legacy aliases redirecting. Production fixture fallback/diagnostic local-completion caller are removed. Shared module/RIASEC/profile/localStorage consumers remain until separately scoped replacement; their data is not PostgreSQL baseline truth.

Recorded22 October:294 main Java sources package; production TypeScript140 roots/0 diagnostics/0 test imports; Vite/panel lint exit0. Bounded local HTTP Save/Preview/Activate and Employee C45 answers/AUTO_SUBMITTED/result15 skills/history, resume, allowance409 and foreign result404; repeat startup86-table digests unchanged. [Evidence/limits](testing/system/REQ-002-local-demo.md). These are not executable or rendered-browser acceptance. Historical fixed FE83/83 and BE204/204 results remain only in their [dated evidence](testing/REQ-002-F02-baseline-authoring.md).

Current tech versions are defined by backend/pom.xml, frontend/package.json and Compose images; evidence environments are dated. Java21/Spring Boot3.5/PostgreSQL17.6/Neo4j5.26 are the current architecture boundary. Do not turn a dependency inventory into proof of unimplemented owner features.

## Run, replace and rollback

From the repository root with Docker Desktop running:

```powershell
docker compose -f compose.dev.yml up --build -d
Invoke-RestMethod http://127.0.0.1:8088/api/v1/system/status
docker compose -f compose.dev.yml ps
```

Loopback WEB8088/API18080/PostgreSQL15432/Neo4j7474+7687 (defaults). [User walkthrough](../../../s2%20work/Test%20Guides/REQ-002-F02-full-walkthrough-test-guide.md). Production Compose requires operator-provided secrets/HTTPS/domain/backup/monitoring and real owner integrations; this local scope does not make it deployment-ready.

Open replacement owners: Person1 Identity/grants/revocation; Person2 catalog publication/release/discovery/reference mapping; content/model owners approved review/real parameters/actual-pilot dataset and numerical validity; Person3 operational C ports; REQ-041 delivery/downstream demo exclusion. Actor-code migration, discipline/content ownership, pathways/independent progress/guidance/privacy and production operations remain open in their Function contracts. No arbitrary mapping from legacy actor codes grants new permissions.

Disable demo profile/property/FE flags and rebuild to remove the exception, preserving all volumes/schema/history/pins/evidence. Never down-migrate, reset learners, repin/rescore histories or restore an old role-only admission binary after new-format data exists. Destructive cleanup requires an exact approved inventory; code/doc review does not authorize DROP or shared consumer deletion. Executable tests require separately approved Cluster3; no stage/commit/push in this review.
