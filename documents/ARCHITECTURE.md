# Current Project Architecture

## Current Scope Alignment

**Product baseline:** [System Overview](adapt_learn_graph_system_overview.md). **Aligned:** 2026-10-16. Product responsibility changes below supersede earlier SaaS assumptions; the technical snapshot that follows is dated evidence, not proof of revised functionality.

The deployment serves one organization. Human actors are System Administrator, L&D Manager, Expert, and Employee. Multi-organization registration/workspaces, subscriptions, payments and PayOS are outside product scope. Existing organization identifiers, account assignments, table names and actor codes remain technical compatibility data until an explicit forward migration is agreed; documentation does not silently remove fields or map privileges.

| Boundary | Current product owner/responsibility | Design or migration gap |
| --- | --- | --- |
| Identity and administration | System Administrator owns accounts, access roles, technical settings and activity monitoring | Agree current actor-code mapping, account lifecycle, settings inventory and audit-read permissions; no automatic mapping from old administrator codes |
| Discipline catalog | L&D manages disciplines and assigns/removes Experts; Experts author assigned-discipline content | Discipline identity, content membership and assignment history are not established by the V5 `JobDomain` label |
| Target roles | L&D creates/assigns; Expert configures competencies/skills/proficiency/importance and submits completion; L&D publishes/unpublishes | Separate configuration-completion and publication contract from legacy `ACTIVE` status; L&D must not edit Expert requirements |
| Learning offerings | Expert authors modules, lesson/practice content and module assessments; L&D approves or returns revisions | Module/content storage, versioned content membership, submission/approval state and learning availability require design |
| Baseline assessment | L&D owns one versioned baseline blueprint per Occupation, with role/skill/difficulty counts and weights inside it; Employee completes the applicable published assessment | Occupation-scoped authoring, published-capacity feedback, minimum per skill/difficulty, linked `Hard > Medium > Easy` weights and EN/VI UI are implemented on the local opt-in boundary; production Identity/Catalog visibility, publication and release-snapshot contracts plus Employee attempt/result remain open |
| RIASEC and role guidance | Employee completes RIASEC; system uses baseline/RIASEC to suggest roles/comments; Expert confirms/revises/rejects; Employee selects/confirms | Interest result, AI data contract and review workflow/versioning require design; legacy soft-skill evidence is not RIASEC |
| Pathways | System generates from gaps; Expert reviews/adjusts/confirms before Employee starts | Initial access gate, review state, module overrides and later evidence-driven revision policy require design |
| Individual skill learning | Employee selects skill and accesses the mapped approved Module without changing role pathway | Separate independent progress/context from pathway selection; reuse valid assessment evidence through tracing boundary |
| Competency and adaptation | System traces estimates, calculates gaps, updates progress and revises remaining learning when needs change | Model/thresholds, evidence replay/versioning and override preservation remain open; failure-only triggers are superseded |
| Monitoring | L&D views profiles/gaps/results/progress; System Administrator views permitted audit/operational activity | Privacy/read contracts and metrics; no platform subscription/organization-count workspace |

Neo4j continues to describe catalog relationships; PostgreSQL continues to describe transactional identity, assessment, evidence and learning state. No new node, property, table, enum or cross-store synchronization is implemented by this document update. [neo4j_schema.md](neo4j_schema.md) retains the technical field inventory and records the same design gaps. Dataset preview fields are not automatically runtime schema fields.

Current requirement traceability is in [features/README.md](features/README.md), including REQ-047 through REQ-059. Historical tests and diagrams must be reviewed against new acceptance before being used to claim feature completion. Do not rewrite a previous passing run as proof of publication, RIASEC, discipline authorization or independent learning.

## Technical Baseline Snapshot

**Runtime and ontology snapshot: 2026-10-16.** This is a runnable database/deployment baseline plus tested local implementation bases for REQ-001-F01 View Target Roles, REQ-001-F02 Choose Target Role and Occupation-scoped REQ-002-F02 Baseline Blueprint Authoring; it is not an implementation of all drafted functions. The authoring slice includes baseline question metadata, a gated development question-bank importer, one immutable-versioned blueprint identity per Occupation, all-role validation, zero-question roles, aggregate coverage, deterministic no-repeat draft generation, exact-hash review/publication APIs, and the local L&D assessment-bank interface. The frontend adds capacity-aware role-total distribution, linked percentage inputs/sliders, EN/VI content and independent multi-open role panels. A read-only capacity API joins the current Occupation catalog scope with PostgreSQL published coverage; save still revalidates the authoritative pool. Unit/API/component, PostgreSQL/Neo4j integration, full backend regression and the updated Compose/Playwright scenario have current local/demo evidence. Evidence is recorded in [REQ-002-F02 testing](testing/REQ-002-F02-baseline-authoring.md). Employee attempt, response, scoring/evidence and RIASEC runtime are not implemented. Production security remains deny-by-default until real Identity and Catalog authorization contracts are integrated.

## Runtime topology

![Runtime topology](diagrams/runtime-topology.svg)

[PlantUML source](diagrams/runtime-topology.puml)

- One Spring Boot backend owns HTTP, security, migrations, and the future feature modules. There is no separate Python recommendation service or additional backend framework. PostgreSQL and Neo4j are data stores, not application servers.
- The `migrate` profile runs Flyway first, then the Neo4j migrator under a PostgreSQL advisory lock, and exits. Compose starts the API only after that process succeeds. The `local` and `prod` API profiles do not run Flyway. A failed graph migration can leave PostgreSQL migrated; rerunning `migrate` is safe and checks Neo4j migration checksums.
- Development Compose enables a repeatable, **sample-only** cross-store seed: stable Neo4j catalog IDs for two local target roles match immutable PostgreSQL catalog references plus the organization/account/learner fixture. Each local role maps to its own five-skill set with no overlap. A versioned 100-item baseline question bank provides ten questions per skill (`3 EASY`, `4 MEDIUM`, `3 HARD`) after validating those MicroSkills in Neo4j. Questions are global by stable skill ID and are not partitioned by organization; trusted organization context still controls role visibility. The seed does not create a target selection or reset learner revisions on an existing volume. Production initializes an empty catalog and never creates sample accounts, question banks or billing records. Docker named volumes persist both databases across restarts.
- [compose.dev.yml](../compose.dev.yml) runs Vite with live source mounts and publishes services on loopback. [compose.prod.yml](../compose.prod.yml) builds static assets into Caddy and publishes only the HTTP web entry point on loopback. Database and API containers have no published production ports.

## Ownership and data

| Store | Current responsibility | Current baseline |
| --- | --- | --- |
| PostgreSQL 17.6 | Organizations, accounts/roles, target selections, assessments, mastery/evidence, pathways, audit, outbox, analytics and benchmark records | Forward-only Flyway V1-V13 in [db/migration](../backend/src/main/resources/db/migration); V8-V12 add baseline question metadata, versioned blueprints, retry-safe writes, deterministic manifests and exact-content review/publication; V13 adds the immutable logical blueprint identity and one-blueprint-per-Occupation uniqueness. |
| Neo4j 5.26 Community | Ontology 0.8.0: Occupation, TargetRole, Level, Competency, MicroSkill and LearningModule; legacy runtime adapters are still pending conversion | V1 remains the legacy baseline; V2 adds Level/Competency/Course constraints and V3 adds Occupation ID/code constraints. V4 retires the Course constraint, leaving 14 domain constraints plus SchemaMigration.version. No catalog data or learner results are rewritten. |

## Database diagrams

### PostgreSQL

The three PlantUML sources include every column of the 57 migrated tables through V13. `?` marks a nullable column; `[PK]` and `[FK]` mark key participation. Arrows point from a referenced table to a referencing table when both are in the same view; cross-view foreign keys remain marked on their columns.

![PostgreSQL identity, catalog and processing tables](diagrams/postgresql.svg)

[Identity and catalog PlantUML source](diagrams/postgresql.puml)

The assessment PlantUML source and checked-in SVG include V13. The SVG was rendered from that source with PlantUML 1.2025.10.

![PostgreSQL assessment and learning tables](diagrams/postgresql-assessment.svg)

[Assessment and learning PlantUML source](diagrams/postgresql-assessment.puml)

For the new baseline path, an `item_version` carries the stable Neo4j string `micro_skill_id`, a display-only `micro_skill_name_snapshot`, and one `EASY`, `MEDIUM`, or `HARD` difficulty. The three fields must be either all present or all absent. They remain absent only on legacy item versions so V8 does not invent catalog names/difficulty or break existing writers; baseline selection ignores those legacy rows. Direct-metadata items can be published without a new `catalog_reference`; legacy items still require `item_skill_mapping` weights to sum to one, and the table remains available for existing evidence consumers.

V9 stores each L&D save as an immutable `baseline_blueprint_version`; role and skill rows pin stable IDs, display snapshots, counts and score weights. V13 separates the stable blueprint identity from those immutable revisions:

| V13 layer | Identity and relationship | Responsibility |
| --- | --- | --- |
| Neo4j `Occupation` | Stable string `Occupation.id` | Catalog source for the Occupation and its current roles/skills; PostgreSQL does not create a duplicate Occupation entity. |
| PostgreSQL `baseline_blueprint` | `blueprint_id` primary key; nullable `occupation_id`; `created_by` and `created_at` | One immutable logical blueprint identity for one non-null Occupation. `occupation_id IS NULL` is retained only for migrated legacy identities whose earlier versions had no Occupation. |
| PostgreSQL `baseline_blueprint_version` | `(blueprint_id, version)` primary key; `blueprint_id` references `baseline_blueprint` | Immutable saved revisions. Each revision keeps the Occupation name snapshot, actor/idempotency metadata and request hash; its `occupation_id` must equal the logical identity's value. |
| PostgreSQL `baseline_blueprint_role` / `baseline_blueprint_skill` | Composite foreign keys to the exact blueprint version | Complete role membership and per-role/per-skill configuration captured for that revision. |
| PostgreSQL `assessment_version` | Optional `(blueprint_id, blueprint_version)` foreign key | Pins a generated baseline assessment to the exact immutable blueprint revision that produced it. |

The partial unique index on `baseline_blueprint(occupation_id) WHERE occupation_id IS NOT NULL` enforces at most one logical blueprint identity for each Occupation. Before backfill, V13 aborts instead of guessing if versions of one blueprint disagree on `occupation_id`, or if one Occupation is already associated with multiple blueprint IDs. It then creates one identity row per historical blueprint, preserving the earliest creation time and the creator of its first version. A foreign key connects every version to that identity, an insert trigger rejects an Occupation mismatch, and the existing history-rejection function prevents update or deletion of the identity. Historical V9-V12 migration files and version rows are not rewritten.

The resulting baseline chain is `Occupation.id -> baseline_blueprint.occupation_id -> baseline_blueprint_version(blueprint_id, version) -> baseline_blueprint_role -> baseline_blueprint_skill`; generation continues from the pinned blueprint pair into `assessment_version` and `assessment_item`. The cross-store `Occupation.id` remains a string reference rather than a PostgreSQL foreign key. The Occupation display name is deliberately version-snapshotted instead of stored on the logical identity, so historical revisions retain what L&D saw when saving.

Each new version must contain all and only the current roles and resolved skills of its Occupation. A role total of zero remains visible and stored but does not participate in coverage, generation or scoring; at least one role must be non-zero. The current single-organization uniqueness must be extended with trusted organization scope if the product later becomes multi-organization.

The baseline editor derives its displayed role total from detailed skill/difficulty counts. It loads current published capacity through `GET /api/v1/ld/baseline-blueprint-catalog/occupations/{occupationId}/capacity`. For a role with `N` skills, explicit Apply accepts `0` or `[3 × N, feasibleMax]`, reserves one question in every Easy/Medium/Hard cell, then distributes the remainder deterministically without exceeding capacity after other roles' shared demand. Manual cell edits do not redistribute siblings. Client checks provide early feedback only; save re-reads authoritative published coverage.

Participating score weights are independent from question counts and use one linked state represented as decimal text inputs plus two range dividers. The wire values remain decimals and must total one with `hard > medium > easy >= 0.01`; Apply defaults to `0.20/0.30/0.50`. The legacy `BaselineBlueprint.RoleConfig` constructor requires all persisted role weights to total one even for a zero-question role; the frontend request boundary therefore supplies `0.3334/0.3333/0.3333` for that excluded role and converts them back to `0/0/0` in editor state. This is compatibility mapping only: server participation and every coverage/generation/scoring decision continue to use the detailed count total.

V10 adds an actor-scoped idempotency key and normalized request hash to each blueprint version. The local-only `/api/v1/ld/baseline-blueprints` adapter can create, read and revise a blueprint; revise requires the expected latest version and always inserts a new immutable version. A repeated key with identical content returns the original result, while key reuse with different content and concurrent version changes return conflicts. The local actor comes from server-side configuration and is temporarily granted the seeded `LD_MANAGER` role behind the local-actor flag. The production chain exposes none of these endpoints until the Identity owner supplies trusted authentication and authorization.

The baseline boundary resolves `Occupation -> HAS_ROLE -> TargetRole -> HAS_LEVEL -> REQUIRES_SKILL -> MicroSkill`, unions skills by stable ID across Levels, rejects missing/injected roles or skills, and captures canonical display snapshots. Zero-total roles still require valid membership but skip coverage. PostgreSQL coverage counts the latest `PUBLISHED` version of each question identity and aggregates demand for shared role/skill/difficulty buckets, because a generated assessment cannot repeat an item version. The Neo4j adapter is local-only and opt-in; tenant visibility, approved publication and catalog release/snapshot consistency remain provisional until the Catalog owner delivers them.

V11 extends the existing `assessment_version`/`assessment_item` pair instead of creating a separate draft or manifest table. Generation pins the immutable blueprint ID/version, random seed, actor, request idempotency metadata, content hash, exact published `item_version_id`, TargetRole snapshot, item position, and per-item score contribution. One blueprint identity owns one assessment series (`assessment_id = blueprint_id`): each new generation key creates the next draft version and retrying the same actor/key returns the original draft. Candidate selection uses the latest published question version, includes only roles with `total_question_count > 0`, and selects globally without replacement for exact role/skill/difficulty counts. Draft reads expose prompt and response schema but never `protected_key`. `pass_threshold` is nullable for authoring; attempt/result compatibility is deferred to the Employee lifecycle migration.

V12 records the L&D reviewer, review time, and exact reviewed content hash on `assessment_version`. A generated baseline can move from `DRAFT` to `PUBLISHED` only while that reviewed hash still equals its current manifest hash. Review freezes both the assessment header and its `assessment_item` manifest; publication is the only remaining state transition, and the existing published-definition guard keeps the published version immutable. Review/publish responses continue to omit `protected_key`.

![PostgreSQL recommendation, analytics and evaluation tables](diagrams/postgresql-pathway.svg)

[Pathway and analytics PlantUML source](diagrams/postgresql-pathway.puml)

`organization_id` is currently nullable on `organizational_unit` and `account` to preserve older records. The catalog references shown here are PostgreSQL snapshots, not extra Neo4j nodes.

### Neo4j

The current ontology contract has six entity labels and seven relationship types, defined in [neo4j_schema.md](neo4j_schema.md) and [dataset 0.8.0](dataset/ONTOLOGY.md).

![Occupation-based ontology 0.8.0](diagrams/neo4j.svg)

[PlantUML source](diagrams/neo4j.puml)

Each TargetRole belongs to one Occupation and owns three local Levels. Each Level owns its competency groups and skill requirements, with no direct link to learning content. Competency achievement is derived from all member skills passing the owning Level's requirements; there is no independent score. Only MicroSkills use HAS_SKILL_PREREQUISITE; Course and its edges are removed. TargetRole canonicalProfileKey groups 48 reported-title records into 20 recommendation profiles. Occupation stores six normalized RIASEC values sourced from O*NET 31.0. The catalog consolidates prior content into 79 Modules, one for each of 79 skills. Module practice and role/Level suitability remain pending expert review. Rubric configuration, content bodies and learner results remain outside the ontology graph.

**Legacy runtime adapter contract (pending migration):** All catalog nodes use stable `id` and `code` keys. `TargetRole.organizationId` provides the initial tenant-scoping contract; `seniority` is the domain-neutral grade code (`P1`–`P5` for `PROFESSIONAL`, `M3`–`M4` for `MANAGEMENT`) used for role discovery, while each domain/role family owns the grade's detailed meaning. `responsibilities` supports employee-facing detail. `version` (e.g. `1.0`, `1.1`) and `assignedExpertId` support the expert authoring lifecycle and successor drafts. Relationships also carry lifecycle `status`, `createdAt`, and `updatedAt`; their additional fields are shown on the relevant arrows. Learner mastery, assessment results, and pathway state belong in PostgreSQL, not on Neo4j nodes.

V2 adds ontology entity constraints and V3 adds Occupation constraints after the preserved V1 baseline; V4 drops only the retired Course ID constraint; no catalog or learner data is deleted. The technical SchemaMigration label is not an ontology entity. Community uniqueness constraints do not enforce publication, score ranges, ownership, one-to-one TEACHES, membership completeness or acyclicity; the v0.8 importer validates these invariants.

**Runtime compatibility:** DevelopmentCatalogSeeder, Neo4jTargetRoleCatalogAdapter, Neo4jTargetRoleMapper and role-selection domain/API contracts still use the legacy model. They have not been converted by this schema change. Import the new seed in an isolated database until the runtime and cross-store references are migrated. The legacy development seeder now refuses an Occupation catalog instead of mixing legacy fixtures into it. The current dataset is under dataset/; existing learner decisions must retain their original catalog context.

PostgreSQL V2-V5 contain a versioned `catalog_reference`/`catalog_release` contract, whereas the legacy runtime uses stable `id`/`code`; ontology 0.8.0 adds version metadata but no separate graph version nodes. No cross-store synchronizer or catalog CRUD API is implemented yet. V7 keeps the selection FK to `catalog_reference`, adds `target_selection.role_snapshot`, and adds `target_selection_request` for command idempotency. Successful request outcomes persist the selection, target revision, and original `changed` value so an idempotent replay returns the same observable result. F02 uses the trusted learner as the outbox aggregate, the target revision as source revision, and the request ID as correlation ID; selection, request outcome, audit, and outbox writes share the caller's PostgreSQL transaction. The snapshot is nullable only for pre-V7 compatibility; new F02 writes must populate it. The provisional runtime adapter rechecks F01 availability under the trusted organization and then resolves exactly one `TARGET_ROLE` reference from the PostgreSQL release whose catalog guard is `OPEN`; mismatch is a dependency failure and the command never creates a reference. The local migrate flow may seed matching cross-store references, but that seed is not a published production release.

F02's temporary assessment guard and `SUPERSEDED` pathway archive mapping are local/demo adapters behind application ports. They load only with the explicit local-dependency property and are absent from the production profile. The real assessment/pathway adapters must share the learner lock/revision transaction contract or provide an owner-approved equivalent before F02 is production-complete.

F02's HTTP adapter is currently a local-only vertical slice. Its configured-actor security chain permits only GET/PUT on `/api/v1/employee/target-role-selection` when the local actor flag is enabled and excludes that endpoint from CSRF because no browser-authenticated principal exists yet. The production security chain is unchanged and denies the endpoint until the real Identity/Security adapter is delivered.

The local assessment guard is controlled server-side through `TARGET_SELECTION_LOCAL_ASSESSMENT_IN_PROGRESS`, which Compose passes to the API container with a default of `false`. It exists only to exercise the provisional `AssessmentActivityGuardPort`; production must replace it with the assessment owner's lifecycle query. The frontend repository has a scoped Playwright system runner that targets the Compose web proxy with an installed Chrome executable; Vitest remains limited to `src/**/*.test.{ts,tsx}` so unit/component and browser suites do not cross-discover each other.

## Backend structure

```text
backend/
  pom.xml, Dockerfile
  src/main/java/com/adaptlearngraph/
    AdaptLearnGraphApplication.java
    platform/            startup, status API, migration orchestration
    catalog/             Target-role domain/use case/API, Neo4j adapter, constraints and development-only seed
    identity/            security boundary; account APIs not yet built
    assessment/          baseline blueprint domain/use case/API, PostgreSQL adapter and development question import
    competency/          reserved feature package
    learning/            F02 target-role selection domain, application ports/service, HTTP and PostgreSQL/local adapters
    recommendation/      reserved feature package
    pathway/             reserved feature package
    synchronization/     reserved feature package
    analytics/           reserved feature package
    evaluation/          reserved feature package
  src/main/resources/
    application*.yml     local, prod, migrate, starter, worker profiles
    db/migration/        PostgreSQL Flyway V1-V13
    db/neo4j/            graph constraints packaged in the backend JAR
  src/test/java/com/adaptlearngraph/
    platform/            unit, security, database and graph tests
    architecture/        module dependency rules
frontend/               existing src/app, src/features, src/shared layout
documents/features/     drafted functions and their current decisions
documents/diagrams/     PlantUML sources, PostgreSQL generator, rendered SVGs
documents/testing/      unit, integration, and system test plans
compose.dev.yml, compose.prod.yml, .env.example
```

Each backend feature package uses `api` (HTTP), `application` (use cases/ports), `domain` (Spring-independent policy) and `infrastructure` (PostgreSQL/Neo4j/integrations). `catalog` applies this structure for the recorded REQ-001-F01 baseline: controllers call `TargetRoleQueryUseCase`, the application service reads trusted actor context and `TargetRoleCatalogPort`, and the Neo4j adapter maps driver records into domain outputs. Existing placeholders remain placeholders; add current-scope implementations only after contracts are clarified, not as empty scaffolding. Billing is excluded from current product scope. The frontend baseline has feature-local target-role browse/detail and selection API/type/query boundaries. The routed F02 page composes an active-selection summary and catalog that share the server selection query; catalog cards and detail use it for active-state and confirmation. The mutation receives one prepared idempotency key and invalidates that query after success. The unreferenced legacy page-level mock hero/write handler was removed; F02 does not synchronize server selection into localStorage. `TargetRoleSelector`, `useEmployeeLearningState`, `NotificationDropdown`, and their overview/assessment/gap/pathway child consumers remain a separate migration follow-up. The L&D route `/ld-manager/assessment-bank` has a feature-local API client for Occupation list/detail/capacity, blueprint save/revise, coverage errors, generation, review and publication. Feature-local policies compute feasible capacity, deterministic minimum-first allocation, shared-pool validation and linked weight projection; controls preserve invalid raw text until blur/Enter instead of silently coercing it. Editor state survives capacity retry and the global EN/VI switch, and roles use a multiple-open accordion. The page calls the local opt-in Occupation API first; only DEV may fall back to the isolated catalog fixture on defined unavailable responses. Capacity never falls back to a fabricated maximum. Production still requires the Catalog owner's tenant-safe visibility/publication/snapshot adapter.

## Technologies

| Layer | Technology in use |
| --- | --- |
| Backend | Java 21, Maven, Spring Boot 3.5.16 (Web MVC, Security, Validation, Actuator, Data JPA/JDBC), Flyway, Neo4j Java driver |
| Persistence | PostgreSQL 17.6, Neo4j 5.26 Community; JPA is available, but there are no domain entities/repositories yet |
| Frontend | React 19, TypeScript 6, Vite 8, React Router 7, TanStack Query, vis-network; Caddy 2 serves production assets and proxies `/api` |
| Delivery | Docker multi-stage builds and Docker Compose; Node 22 for frontend builds |
| Testing | JUnit 5, Spring Boot Test/Security Test, Testcontainers (PostgreSQL and Neo4j), ArchUnit; see [testing/README.md](testing/README.md) |

## Run and verify

From the repository root with Docker Desktop running:

```powershell
docker compose -f compose.dev.yml up --build -d
Invoke-RestMethod http://127.0.0.1:8088/api/v1/system/status
docker compose -f compose.dev.yml ps
```

Dev frontend: `http://127.0.0.1:8088`; API: `http://127.0.0.1:18080`; PostgreSQL host port `15432`; Neo4j Browser: `http://127.0.0.1:7474` (Bolt `7687`). The dev Compose file uses explicit local-only fallback passwords; override them with `.env` for a shared development machine. The raw backend default is `local` and needs reachable databases plus `DB_PASSWORD` and `NEO4J_PASSWORD`. The `starter` profile is an intentional no-database test mode, not the deployed API.

For production-mode Compose, supply nonempty `DB_PASSWORD` and `NEO4J_PASSWORD` in a private `.env` or secret-injection environment, then run:

```powershell
docker compose -f compose.prod.yml up --build -d
Invoke-RestMethod http://127.0.0.1:8088/api/v1/system/status
```

Production publishes HTTP on `127.0.0.1:${WEB_PORT:-8088}`. Place a separately managed HTTPS ingress/reverse proxy in front before external access; TLS domain, certificates, secret storage, backups and observability still need an operator decision. The Compose profiles start correctly but **do not make the unfinished product or authorization system production-ready**. Do not use `down -v` on databases whose data must be kept.

## Decisions to confirm

1. **Catalog identity and history:** How should stable ontology IDs and the legacy Neo4j V5 contract map to the existing PostgreSQL `catalog_reference` fields (`entity_id`, `version_id`, `release_id`), and how are in-progress attempts/pathways pinned when the graph changes? Do not assume a fake graph version.
2. **Single-organization catalog and publication:** Retain existing `organizationId` compatibility fields until a forward migration is agreed. Design discipline assignment and L&D publication gates through the owning catalog/authorization boundaries; unpublished roles must not be treated as available merely because they are `ACTIVE`.
3. **Actor-code migration:** Existing `EMPLOYEE`, `DOMAIN_EXPERT`, `ORGANIZATION_ADMINISTRATOR`, `PLATFORM_ADMINISTRATOR`, `LEARNER`, `LD_MANAGER` and `ADMINISTRATOR` codes are legacy technical data, not the current actor list. Agree an explicit migration to System Administrator, L&D Manager, Expert and Employee permissions without granting unintended privileges.
4. **Graph operational metadata:** Confirm whether the non-domain `SchemaMigration` label is acceptable alongside seven ontology labels and the five legacy V5 catalog labels, or whether migration history must be stored outside Neo4j.
5. **Catalog learning content:** The dev catalog is illustrative only. Dataset 0.8.0 has documented sources and still requires expert review. Confirm production discipline/role/skill data, one-to-one module/skill content mapping, contentUri deployment and L&D approval; current scope is not dummy-only. Keep existing `LearningModule.sourceUrl` semantics until a versioned storage contract is agreed.
6. **Open feature rules:** The feature index marks the functions as drafts, including unfinished baseline Bayesian parameters and other acceptance details. Confirm each contract before adding business migrations, APIs, or system tests for it.
7. **Deployment, tests and integrations:** Choose production HTTPS/domain, secret manager, backup/restore, monitoring and automation/CI. Confirm baseline/RIASEC AI guidance and any operational email contracts before integration. PayOS/billing are excluded; no non-Spring Boot backend runtime is proposed.
