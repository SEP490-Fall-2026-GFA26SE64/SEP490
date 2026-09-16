# Adapt-Learn-Graph

Java 21 / Spring Boot 3.5.16 modular-monolith starter with hexagonal subsystem boundaries, a React/TypeScript frontend and local PostgreSQL/Neo4j infrastructure. Architecture reference: [System Architecture](../System%20Architecture.md).

## Status

This is project initialization, not the implemented SRS. Working: Spring Boot startup, public system-status/health endpoints, fail-closed security defaults, a real frontend status request, API/worker profiles, versioned PostgreSQL/Neo4j schema initialization and architecture/database tests. Most business module packages remain empty.

Not implemented: login/session use cases, learner workflows, JPA entities/repositories, catalog publication/reconciliation, ordered evidence processing, job handlers, recommendations, Java/Python subprocess execution, analytics endpoints, OpenAPI generation or full business integration/E2E tests. Their database tables are initialized, not their behavior. Python folders and contract documentation are reserved, not a runnable engine. Testcontainers verifies the real PostgreSQL and Neo4j schema migrations.

## Structure

```text
adapt-learn-graph/
  backend/
    pom.xml, mvnw, mvnw.cmd, .mvn/   Maven build and wrapper
    src/main/java/com/adaptlearngraph/
      AdaptLearnGraphApplication.java
      identity/                     Accounts, sessions, scope
      catalog/                      Versioned Neo4j catalog
      assessment/                   Instruments, attempts, evidence
      competency/                   Profiles, mastery, targets
      learning/                     Activities, gates, completion
      recommendation/               Java orchestration / compute port
      pathway/                      Review, approval, publication
      analytics/                    Scoped metrics and ROI
      synchronization/              Durable delivery and recovery
      evaluation/                   Reproducible experiments
      platform/                     Implemented status example
    src/main/resources/
      application*.yml              Starter, local, migrate and worker profiles
      db/migration/                 Flyway SQL migrations
    src/test/java/                  API, security, ArchUnit and database tests
  frontend/
    src/app/                        Providers, routing and styles
    src/features/                   System, learner, administration, manager
    src/shared/api/                 Typed Java API clients
  recommendation-engine/
    src/adapt_learn_graph_recommendation/
    tests/                          Reserved Python package/test locations
  contracts/recommendation/          Cross-language contract specification
  infrastructure/
    Initialize-Databases.ps1         Local database creation and migration
    neo4j/migrations/               Versioned Cypher schema migrations
  tests/fixtures/                   Synthetic fixture location
  compose.yml                       Local databases and optional web/API
  .env.example                      Empty credential placeholders
```

The GitHub Actions workflow is at the workspace repository root: [.github/workflows/application-ci.yml](../.github/workflows/application-ci.yml). If moving only this application folder into a separate repository, move/adapt that workflow and remove its `adapt-learn-graph/` working-directory prefixes.

## Hexagonal Package Rules

Each Java subsystem contains `api`, `application`, `domain`, and `infrastructure`. Package declarations retain empty folders in source control without generating fake business classes.

| Layer | Responsibility | Permitted dependencies |
| --- | --- | --- |
| `api` | Spring MVC incoming adapters and transport DTOs | Application use cases and domain values; not infrastructure |
| `application` | Framework-free use cases; `port/in` and `port/out` as needed | Domain and declared ports; not adapters or Spring |
| `domain` | Pure business types/invariants | Java/domain types; no HTTP, persistence or Spring |
| `infrastructure` | Port implementations, persistence, subprocesses and Spring wiring | Application ports/domain; framework dependencies live here |

The implemented example is `SystemStatusController -> SystemStatusService -> BuildInformationPort <- ConfiguredBuildInformationAdapter`. `PlatformConfiguration` composes the service through constructor injection. Use Spring-wired transactional decorators/adapters when adding transactions so framework-free use cases remain independently testable. SQL and Neo4j transactions are never one distributed ACID transaction.

ArchUnit tests enforce inward layer dependencies. They do not yet enforce every cross-module ownership contract. Add explicit module-boundary tests as domain types are introduced; do not write another module's tables directly.

## Run Without Databases

Requirements: Java 21, internet access for the first Maven Wrapper build, and Node.js 22.12+ (or a compatible supported Node release). The full `verify` command also requires Docker for disposable database tests, although the default application profile does not require databases. Commands below run from this application folder.

Backend:

```powershell
.\backend\mvnw.cmd -f backend/pom.xml verify
java -jar backend/target/adapt-learn-graph.jar --server.address=127.0.0.1
```

Frontend, in another terminal:

```powershell
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run dev -- --host 127.0.0.1
```

Open the Vite URL printed in the terminal (normally http://127.0.0.1:5173). The dev proxy targets http://127.0.0.1:8080. The API exposes `GET /api/v1/system/status` and `GET /actuator/health`. Starter health only means the database-free process is up, not that databases or business features are ready.

If API port 8080 is occupied, pass `--server.port=8081` to Java and set `API_PROXY_TARGET=http://127.0.0.1:8081` in the frontend terminal environment or a local frontend environment file before starting Vite. The proxy variable contains no secrets and is not a browser API credential.

On macOS/Linux use `sh backend/mvnw -f backend/pom.xml verify` and `npm` instead of the Windows command variants.

## Profiles and Security

| Profiles | Purpose |
| --- | --- |
| `starter` (default) | Database-free API/status shell. Excludes SQL, JPA, Flyway and Neo4j auto-configuration. Never use as a production readiness check. |
| `local` | Enables PostgreSQL/JPA and Neo4j with explicit credentials. Flyway is disabled; initialize schemas first. |
| `local,migrate` | Explicit non-web migration job: Flyway SQL, then checksummed Neo4j DDL, then exit. Compose API startup depends on its successful completion. |
| `starter,worker` | Verifies the same JAR can start as a non-web process without databases. No worker handlers exist, so it may exit normally. |
| `local,worker` | Reserved database-backed non-web worker profile. Not a functioning job processor yet. |

All routes except public GET status/health are denied, including any future endpoints, until explicit authentication and authorization rules are implemented. There is no default user, generated development password, login form or HTTP Basic shortcut. CSRF protection remains enabled. Do not relax this into `permitAll` to make an unfinished feature appear usable.

## Local Docker Infrastructure

Start Docker Desktop first, then run the initializer. It generates random development-only database passwords in an ignored `.env` only when that file does not exist, preserves existing credentials/volumes, starts both databases and runs the one-shot migration job. Do not commit, share or print credentials. An existing environment file must contain nonempty passwords; Neo4j requires at least eight characters.

```powershell
.\infrastructure\Initialize-Databases.ps1
```

On this Windows workspace, port 5432 was unavailable, so initialization used `-PostgresPort 15432` and persisted that override in the local environment file. PostgreSQL is at `127.0.0.1:15432`, database/user `adapt_learn_graph`; Neo4j Browser is at http://127.0.0.1:7474 with Bolt at `bolt://127.0.0.1:7687`, user `neo4j`. Passwords are in the private local environment file. Other machines retain port 5432 unless overridden.

The initializer is safe to rerun. Flyway validates applied checksums; Neo4j records SHA-256 migration checksums. No accounts, learner evidence or sample catalog releases are seeded. The catalog publication guard deliberately stays `BLOCKED`. Schema details, migration policy and remaining validation work: [infrastructure/README.md](infrastructure/README.md).

To run the Java API outside Docker with profile `local`, supply `DB_PASSWORD`, `NEO4J_PASSWORD` and any custom connection variables in its process environment, then:

```powershell
java -jar backend/target/adapt-learn-graph.jar --spring.profiles.active=local --server.address=127.0.0.1
```

Spring Boot does not automatically load Compose's `.env` file. For this workspace's host API, set `DB_URL=jdbc:postgresql://127.0.0.1:15432/adapt_learn_graph` in addition to the credentials. The Neo4j HTTP health probe tests server reachability, not authenticated catalog readiness. Schema initialization does not switch an already-running `starter` API to `local`.

Optional containerized web/API:

```powershell
docker compose --profile app up --build -d
```

Open http://127.0.0.1:8088. The local Caddy configuration serves static frontend assets and proxies `/api` to Java. Containers use Docker DNS names, not localhost, for database connections. Data is retained in named volumes; `docker compose down` stops services without deleting those volumes. Do not use `down -v` unless intentionally deleting local data.

This Compose setup is **local development only**: loopback-bound public ports, HTTP and unencrypted database links. It is not a production deployment or compliance with the SRS TLS/encryption requirements. Before deployment, add TLS, secret management, least-privilege migration/runtime users, version/digest review, backup/restore tests and the publication/recovery protocol. The database containers and packaged migration image have been exercised locally; this is not a production readiness claim.

## Checks

```powershell
.\backend\mvnw.cmd -f backend/pom.xml verify
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

CI runs these checks with Java 21, Node 22 and Docker. Database tests verify migration/repeatability, selected SQL invariants and Neo4j uniqueness/checksum handling using disposable instances. They never seed the persistent development databases. Add use-case, concurrency/recovery and fixture-based Python/contract tests as implementation progresses. No benchmarks or full business-requirement acceptance results are claimed.

## Next Implementation Slice

Implement identity/session provisioning and access policies first, then versioned catalog publication and its cross-store guard, followed by assessment evidence and durable processing. Freeze algorithm/contract policies before wiring the Python process adapter. Add tests with each implemented behavior rather than filling all packages with empty services and controllers.