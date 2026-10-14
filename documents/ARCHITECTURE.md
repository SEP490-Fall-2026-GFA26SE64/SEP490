# Current Project Architecture

**As of 2026-10-14.** This is a runnable database/deployment baseline plus tested local implementation bases for REQ-001-F01 View Target Roles and REQ-001-F02 Choose Target Role; it is not an implementation of all drafted functions. The first REQ-002/003/009 slices add baseline question metadata, a gated development question-bank importer, and a local-only API for validated immutable baseline-blueprint versions. Generation, review/publish APIs and Employee assessment runtime are not implemented. Unit, API/security, PostgreSQL/Neo4j integration, Compose and scoped Playwright evidence for REQ-001 are recorded under `documents/testing`; the new baseline slices remain in Cụm 1 and do not yet have executable-test evidence. Production security remains deny-by-default until the real Identity authorization contract is integrated.

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
| PostgreSQL 17.6 | Organizations, accounts/roles, target selections, assessments, mastery/evidence, pathways, audit, outbox, analytics and benchmark records | Forward-only Flyway V1-V10 in [db/migration](../backend/src/main/resources/db/migration); V7 adds F02 command idempotency and immutable role display snapshots, V8 adds baseline question metadata, V9 adds immutable baseline blueprint versions with role/skill configuration, and V10 adds retry-safe blueprint writes. |
| Neo4j 5.26 Community | Catalog graph: `JobDomain`, organization-scoped `TargetRole`, `MacroCompetency`, `MicroSkill`, `LearningModule` and the seven relationships in [neo4j_schema.md](neo4j_schema.md) | Ten `id`/`code` uniqueness constraints, one per property per domain label, in [V1__catalog_constraints.cypher](../backend/src/main/resources/db/neo4j/V1__catalog_constraints.cypher). Development seed contains six roles in total; the configured local organization sees Java Backend Developer P3 and Platform Engineer P4. It contains sixteen MicroSkills and two modules. Java Backend requires Java Core, Spring Boot, PostgreSQL, REST API Design and Engineering Leadership; Platform Engineer requires Docker, Kubernetes, Linux Systems, CI/CD and System Observability. |

## Database diagrams

### PostgreSQL

The three PlantUML views include every column of the 56 migrated tables through V10. `?` marks a nullable column; `[PK]` and `[FK]` mark key participation. Arrows point from a referenced table to a referencing table when both are in the same view; cross-view foreign keys remain marked on their columns.

![PostgreSQL identity, catalog and processing tables](diagrams/postgresql.svg)

[Identity and catalog PlantUML source](diagrams/postgresql.puml)

The assessment PlantUML source and checked-in SVG include V12; the SVG was rendered with PlantUML 1.2025.10. Regenerate all PostgreSQL views from a migrated database when PostgreSQL/Docker tooling is available so every source remains catalog-derived.

![PostgreSQL assessment and learning tables](diagrams/postgresql-assessment.svg)

[Assessment and learning PlantUML source](diagrams/postgresql-assessment.puml)

For the new baseline path, an `item_version` carries the stable Neo4j string `micro_skill_id`, a display-only `micro_skill_name_snapshot`, and one `EASY`, `MEDIUM`, or `HARD` difficulty. The three fields must be either all present or all absent. They remain absent only on legacy item versions so V8 does not invent catalog names/difficulty or break existing writers; baseline selection ignores those legacy rows. Direct-metadata items can be published without a new `catalog_reference`; legacy items still require `item_skill_mapping` weights to sum to one, and the table remains available for existing evidence consumers.

V9 stores each L&D save as an immutable `baseline_blueprint_version`. Its role rows pin TargetRole IDs/name snapshots, enabled state, score weights totaling one, and a system-computed question total. Skill rows pin MicroSkill IDs/name snapshots and non-negative Easy/Medium/Hard counts. A deferred constraint verifies each role total against its skill rows at transaction commit. Occupation ID/name remain both null until the catalog contract is available; no placeholder Occupation is seeded.

V10 adds an actor-scoped idempotency key and normalized request hash to each blueprint version. The local-only `/api/v1/ld/baseline-blueprints` adapter can create, read and revise a blueprint; revise requires the expected latest version and always inserts a new immutable version. A repeated key with identical content returns the original result, while key reuse with different content and concurrent version changes return conflicts. The local actor comes from server-side configuration and is temporarily granted the seeded `LD_MANAGER` role behind the local-actor flag. The production chain exposes none of these endpoints until the Identity owner supplies trusted authentication and authorization.

Before an enabled role is saved, the assessment boundary reuses the organization-scoped `TargetRoleCatalogPort` to require an active role and active role-to-MicroSkill membership, then captures catalog names as display snapshots. Disabled roles retain their configured rows but deliberately skip catalog and coverage validation. Question coverage is read from PostgreSQL in one batch and counts only the latest `PUBLISHED` version of each question identity for each MicroSkill and difficulty. Insufficient coverage rejects the write without lowering requested counts and reports required, available and missing values for every shortage. The current graph check reads active catalog state rather than a catalog release/snapshot; that cross-store consistency dependency remains provisional until the Catalog owner delivers the version contract.

V11 extends the existing `assessment_version`/`assessment_item` pair instead of creating a separate draft or manifest table. Generation pins the immutable blueprint ID/version, random seed, actor, request idempotency metadata, content hash, exact published `item_version_id`, TargetRole snapshot, item position, and per-item score contribution. One blueprint identity owns one assessment series (`assessment_id = blueprint_id`): the first generation creates version 1 and each new generation key creates the next draft version, while retrying the same actor/key returns the original draft. Candidate selection uses the latest published version of each question identity, selects without replacement for exact enabled-role/skill/difficulty counts, and re-reports shortages if bank coverage changed after blueprint save. Draft reads expose prompt and response schema but never `protected_key`. `pass_threshold` is nullable for baseline authoring; attempt/result compatibility is deferred to the employee lifecycle migration.

V12 records the L&D reviewer, review time, and exact reviewed content hash on `assessment_version`. A generated baseline can move from `DRAFT` to `PUBLISHED` only while that reviewed hash still equals its current manifest hash. Review freezes both the assessment header and its `assessment_item` manifest; publication is the only remaining state transition, and the existing published-definition guard keeps the published version immutable. Review/publish responses continue to omit `protected_key`.

![PostgreSQL recommendation, analytics and evaluation tables](diagrams/postgresql-pathway.svg)

[Pathway and analytics PlantUML source](diagrams/postgresql-pathway.puml)

`organization_id` is currently nullable on `organizational_unit` and `account` to preserve older records. The catalog references shown here are PostgreSQL snapshots, not extra Neo4j nodes.

### Neo4j

The five catalog labels and seven directed relationship types follow [neo4j_schema.md](neo4j_schema.md). Two `MicroSkill` boxes show distinct instances of the same label; a prerequisite from a skill to itself is invalid.

![Neo4j V5 catalog graph](diagrams/neo4j.svg)

[PlantUML source](diagrams/neo4j.puml)

All catalog nodes use stable `id` and `code` keys. `TargetRole.organizationId` provides the initial tenant-scoping contract; `seniority` is the domain-neutral grade code (`P1`–`P5` for `PROFESSIONAL`, `M3`–`M4` for `MANAGEMENT`) used for role discovery, while each domain/role family owns the grade's detailed meaning. `responsibilities` supports employee-facing detail. `version` (e.g. `1.0`, `1.1`) and `assignedExpertId` support the expert authoring lifecycle and successor drafts. Relationships also carry lifecycle `status`, `createdAt`, and `updatedAt`; their additional fields are shown on the relevant arrows. Learner mastery, assessment results, and pathway state belong in PostgreSQL, not on Neo4j nodes.

The graph also has a technical `SchemaMigration` label with a uniqueness constraint and checksum record; it is **not** a sixth catalog entity. Neo4j Community constraints cannot by themselves enforce every V5 rule (such as `[0,1]` values, statuses, one active macro per skill, valid module URLs, or no prerequisite cycles). Future graph write services must validate these rules before committing. Dev sample `sourceUrl` values point to public Java and Spring guides; the seed never runs in `prod`.

PostgreSQL V2-V5 contain a versioned `catalog_reference`/`catalog_release` contract, whereas the supplied V5 graph schema uses stable `id`/`code` without graph version nodes. No cross-store synchronizer or catalog CRUD API is implemented yet. V7 keeps the selection FK to `catalog_reference`, adds `target_selection.role_snapshot`, and adds `target_selection_request` for command idempotency. Successful request outcomes persist the selection, target revision, and original `changed` value so an idempotent replay returns the same observable result. F02 uses the trusted learner as the outbox aggregate, the target revision as source revision, and the request ID as correlation ID; selection, request outcome, audit, and outbox writes share the caller's PostgreSQL transaction. The snapshot is nullable only for pre-V7 compatibility; new F02 writes must populate it. The provisional runtime adapter rechecks F01 availability under the trusted organization and then resolves exactly one `TARGET_ROLE` reference from the PostgreSQL release whose catalog guard is `OPEN`; mismatch is a dependency failure and the command never creates a reference. The local migrate flow may seed matching cross-store references, but that seed is not a published production release.

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
    db/migration/        PostgreSQL Flyway V1-V10
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

Each backend feature package uses `api` (HTTP), `application` (use cases/ports), `domain` (Spring-independent policy) and `infrastructure` (PostgreSQL/Neo4j/integrations). `catalog` now applies this structure for REQ-001-F01: controllers call `TargetRoleQueryUseCase`, the application service reads trusted actor context and `TargetRoleCatalogPort`, and the Neo4j adapter maps driver records into domain outputs. Existing placeholders remain placeholders; create real classes within these boundaries as functions become clarified. Billing, notifications, and organization-specific feature packages should be added when their contracts are agreed, not as empty scaffolding. The frontend has feature-local target-role browse/detail and selection API/type/query boundaries. The routed F02 page composes an active-selection summary and catalog that share the server selection query; catalog cards and detail use it for active-state and confirmation. The mutation receives one prepared idempotency key and invalidates that query after success. The unreferenced legacy page-level mock hero/write handler was removed; F02 does not synchronize server selection into localStorage. `TargetRoleSelector`, `useEmployeeLearningState`, `NotificationDropdown`, and their overview/assessment/gap/pathway child consumers remain a separate migration follow-up. The L&D route `/ld-manager/assessment-bank` now has a feature-local API client for blueprint save/revise, coverage errors, generation, review, and publication; it keeps backend state in page memory rather than the legacy company-store assessment mock. Its role/skill source is a development-only fixture until the Catalog owner supplies the L&D catalog query contract.

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

1. **Catalog identity and history:** How should stable Neo4j V5 nodes map to the existing PostgreSQL `catalog_reference` fields (`entity_id`, `version_id`, `release_id`), and how are in-progress attempts/pathways pinned when the graph changes? Do not assume a fake graph version.
2. **Organization-scoped roles:** The implementation base stores `organizationId` on `TargetRole` and filters it against trusted actor context. A later shared-catalog/publication design may replace this through the catalog port without changing the employee-facing use case. Legacy account backfill, mandatory organization context for non-platform actors, and V6 organization lifecycle still require the identity owner.
3. **Actor-code migration:** V6 adds `EMPLOYEE`, `DOMAIN_EXPERT`, `ORGANIZATION_ADMINISTRATOR`, `PLATFORM_ADMINISTRATOR` but deliberately does not guess how old `LEARNER`, `LD_MANAGER`, `ADMINISTRATOR` assignments map. Authentication and tenant-scoped authorization must be designed before opening business endpoints.
4. **Graph operational metadata:** Confirm whether the non-domain `SchemaMigration` label is acceptable alongside the five V5 catalog labels, or whether migration history must be stored outside Neo4j.
5. **Catalog content and modules:** The dev catalog is illustrative only. Confirm authoritative production role/skill data and how the V5 requirement for a real `LearningModule.sourceUrl` should apply to the product's dummy modules.
6. **Open feature rules:** The feature index marks the functions as drafts, including unfinished baseline Bayesian parameters and other acceptance details. Confirm each contract before adding business migrations, APIs, or system tests for it.
7. **Deployment, tests and integrations:** Choose the production HTTPS/domain, secret manager, backup/restore, monitoring, frontend test runner and system-test automation/CI strategy. Confirm PayOS, email, and AI provider contracts before adding integrations; no non-Spring Boot backend runtime is proposed at present.
