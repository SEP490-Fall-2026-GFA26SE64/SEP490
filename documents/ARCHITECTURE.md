# Current Project Architecture

**As of 2026-09-30.** This is a runnable database/deployment baseline plus an implementation base for REQ-001-F01 View Target Roles; it is not an implementation of all 84 drafted functions in [features/README.md](features/README.md). System status remains public. Target-role list/detail routes are enabled only in the local profile with the provisional local actor flag; production security remains deny-by-default until the real Identity authorization contract is integrated.

## Runtime topology

![Runtime topology](diagrams/runtime-topology.svg)

[PlantUML source](diagrams/runtime-topology.puml)

- One Spring Boot backend owns HTTP, security, migrations, and the future feature modules. There is no separate Python recommendation service or additional backend framework. PostgreSQL and Neo4j are data stores, not application servers.
- The `migrate` profile runs Flyway first, then the Neo4j migrator under a PostgreSQL advisory lock, and exits. Compose starts the API only after that process succeeds. The `local` and `prod` API profiles do not run Flyway. A failed graph migration can leave PostgreSQL migrated; rerunning `migrate` is safe and checks Neo4j migration checksums.
- Development Compose enables a repeatable, **sample-only** graph seed. Production initializes an empty catalog; no sample accounts or billing records are created. Docker named volumes persist both databases across restarts.
- [compose.dev.yml](../compose.dev.yml) runs Vite with live source mounts and publishes services on loopback. [compose.prod.yml](../compose.prod.yml) builds static assets into Caddy and publishes only the HTTP web entry point on loopback. Database and API containers have no published production ports.

## Ownership and data

| Store | Current responsibility | Current baseline |
| --- | --- | --- |
| PostgreSQL 17.6 | Organizations, accounts/roles, assessments, question mappings and results, mastery/evidence, learning activity, pathways, audit, outbox, analytics and benchmark records | Forward-only Flyway V1-V6 in [db/migration](../backend/src/main/resources/db/migration); V6 adds organization identity and the four product actor codes while retaining legacy codes. |
| Neo4j 5.26 Community | Catalog graph: `JobDomain`, organization-scoped `TargetRole`, `MacroCompetency`, `MicroSkill`, `LearningModule` and the seven relationships in [neo4j_schema.md](neo4j_schema.md) | Ten `id`/`code` uniqueness constraints, one per property per domain label, in [V1__catalog_constraints.cypher](../backend/src/main/resources/db/neo4j/V1__catalog_constraints.cypher). Development seed creates ICT, a Java role with `organizationId`, `seniority` and `responsibilities`, three macros, two skills, two modules, and all seven relationship types. |

## Database diagrams

### PostgreSQL

The three views below include every column of the 52 migrated tables, including V6 changes to earlier tables. `?` marks a nullable column; `[PK]` and `[FK]` mark key participation. Arrows point from a referenced table to a referencing table when both are in the same view; cross-view foreign keys remain marked on their columns.

![PostgreSQL identity, catalog and processing tables](diagrams/postgresql.svg)

[Identity and catalog PlantUML source](diagrams/postgresql.puml)

![PostgreSQL assessment and learning tables](diagrams/postgresql-assessment.svg)

[Assessment and learning PlantUML source](diagrams/postgresql-assessment.puml)

![PostgreSQL recommendation, analytics and evaluation tables](diagrams/postgresql-pathway.svg)

[Pathway and analytics PlantUML source](diagrams/postgresql-pathway.puml)

`organization_id` is currently nullable on `organizational_unit` and `account` to preserve older records. The catalog references shown here are PostgreSQL snapshots, not extra Neo4j nodes.

### Neo4j

The five catalog labels and seven directed relationship types follow [neo4j_schema.md](neo4j_schema.md). Two `MicroSkill` boxes show distinct instances of the same label; a prerequisite from a skill to itself is invalid.

![Neo4j V5 catalog graph](diagrams/neo4j.svg)

[PlantUML source](diagrams/neo4j.puml)

All catalog nodes use stable `id` and `code` keys. `TargetRole.organizationId` provides the initial tenant-scoping contract; `seniority` is the domain-neutral grade code (`P1`–`P5` for `PROFESSIONAL`, `M3`–`M4` for `MANAGEMENT`) used for role discovery, while each domain/role family owns the grade's detailed meaning. `responsibilities` supports employee-facing detail. `version` (e.g. `1.0`, `1.1`) and `assignedExpertId` support the expert authoring lifecycle and successor drafts. Relationships also carry lifecycle `status`, `createdAt`, and `updatedAt`; their additional fields are shown on the relevant arrows. Learner mastery, assessment results, and pathway state belong in PostgreSQL, not on Neo4j nodes.

The graph also has a technical `SchemaMigration` label with a uniqueness constraint and checksum record; it is **not** a sixth catalog entity. Neo4j Community constraints cannot by themselves enforce every V5 rule (such as `[0,1]` values, statuses, one active macro per skill, valid module URLs, or no prerequisite cycles). Future graph write services must validate these rules before committing. Dev sample `sourceUrl` values point to public Java and Spring guides; the seed never runs in `prod`.

PostgreSQL V2-V5 contain a versioned `catalog_reference`/`catalog_release` contract, whereas the supplied V5 graph schema uses stable `id`/`code` without graph version nodes. No cross-store synchronizer or catalog CRUD API is implemented yet. Do not treat the seeded graph as a published PostgreSQL catalog release; the reference and historical-snapshot contract needs confirmation before role selection, assessment, or pathway implementation. V6 allows nullable organization IDs for legacy accounts and platform administrators; this is not complete tenant authorization.

## Backend structure

```text
backend/
  pom.xml, Dockerfile
  src/main/java/com/adaptlearngraph/
    AdaptLearnGraphApplication.java
    platform/            startup, status API, migration orchestration
    catalog/             Target-role domain/use case/API, Neo4j adapter, constraints and development-only seed
    identity/            security boundary; account APIs not yet built
    assessment/          reserved feature package
    competency/          reserved feature package
    learning/            reserved feature package
    recommendation/      reserved feature package
    pathway/             reserved feature package
    synchronization/     reserved feature package
    analytics/           reserved feature package
    evaluation/          reserved feature package
  src/main/resources/
    application*.yml     local, prod, migrate, starter, worker profiles
    db/migration/        PostgreSQL Flyway V1-V6
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

Each backend feature package uses `api` (HTTP), `application` (use cases/ports), `domain` (Spring-independent policy) and `infrastructure` (PostgreSQL/Neo4j/integrations). `catalog` now applies this structure for REQ-001-F01: controllers call `TargetRoleQueryUseCase`, the application service reads trusted actor context and `TargetRoleCatalogPort`, and the Neo4j adapter maps driver records into domain outputs. Existing placeholders remain placeholders; create real classes within these boundaries as functions become clarified. Billing, notifications, and organization-specific feature packages should be added when their contracts are agreed, not as empty scaffolding. The frontend adds a feature-local target-role API/types/query boundary and browse/detail components while keeping the existing route and isolating legacy selection behavior.

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
