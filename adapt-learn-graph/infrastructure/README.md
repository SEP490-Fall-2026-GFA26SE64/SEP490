# Database Initialization

This implements the initial physical database structures from architecture section 5, not the complete application or every publication invariant. PostgreSQL owns operations and evidence; Neo4j owns the semantic catalog. No SQL FK crosses database engines.

## Run

From the application root, with Docker Desktop running:

```powershell
.\infrastructure\Initialize-Databases.ps1
```

Use `-PostgresPort 15432` when 5432 is unavailable. This option changes only the local PostgreSQL port setting, not passwords. The script creates random passwords only for a missing `.env`; an existing file is not silently repaired or replaced. Shell environment variables override Compose's environment file, so avoid stale exported values. Changing credentials in the file does not rotate credentials in existing database volumes.

For manual deployment or other platforms, supply your own ignored environment file/secrets, then run:

```text
docker compose up -d --wait postgres neo4j
docker compose --profile tools run --build --rm migrate
```

The `migrate` service builds the backend from the application-root Docker context so the same image includes SQL resources and Cypher resources. It runs the `local,migrate` Spring profiles, applies Flyway, takes a bounded PostgreSQL advisory lock for graph schema work, applies/validates graph migration checksums, closes connections and exits. Normal `local` API/worker startup does not migrate. Compose's `app` profile waits for migration success before starting the API.

## Connections

| Store | Local endpoint in this workspace | Database | User |
| --- | --- | --- | --- |
| PostgreSQL | `127.0.0.1:15432` | `adapt_learn_graph` | `adapt_learn_graph` |
| Neo4j Bolt | `bolt://127.0.0.1:7687` | `neo4j` | `neo4j` |
| Neo4j Browser | http://127.0.0.1:7474 | `neo4j` | `neo4j` |

Passwords are in the private, ignored application-root `.env`. Never put them in command arguments, documentation or screenshots. These local accounts have migration privileges and are not suitable production runtime accounts. Do not expose these ports off-host.

## PostgreSQL Layout

Application tables live in the `platform` SQL schema; Java package ownership remains as specified in the architecture. Future JPA mappings must explicitly select that schema. Flyway metadata lives in `public.flyway_schema_history`.

| Migration | Main structures |
| --- | --- |
| V1 | `platform` namespace |
| V2 | Accounts/roles/sessions/units/scopes, learner state and targets, confirmed catalog release/reference mirror and blocked guard, outbox/jobs/receipts, audit |
| V3 | Versioned assessment/item/mapping/policies/models, activity bindings and requirements, assignments/accepted submissions/results, observations/profiles/receipts, progress/completion |
| V4 | Recommendation versions/runs/top-five candidates, pathway revisions/steps/approvals/publication requests, cohorts/analytics/ROI, evaluation manifests/artifacts |
| V5 | Published assessment/mapping immutability, publication validation, complete nonempty activity requirements, frozen pathway content and profile/model/policy consistency |

Only three application-role codes and a closed catalog guard are seeded. No default account/password, scoring policy, model parameters, catalog mirror entries or learner data are seeded. `catalog_release` is a confirmed SQL manifest mirror, not an alternative semantic catalog. Only the future reconciliation service may populate it and its references.

`assessment_attempt` holds immutable accepted context; `assessment_result` stores subsequent immutable scoring output, avoiding modification of accepted submissions. `assessment_availability` appends availability revisions instead of editing published definitions. Additional `processing_stream`, `recommendation_version`, `recommendation_candidate` and `cohort_member` tables make identities and constraints explicit.

UUIDs are application-supplied. Probability domains reject NaN, infinities and values outside [0,1]. Hashes use lowercase SHA-256 hex. Unknown effective mastery must be SQL NULL. Partial unique indexes limit active targets and current pathways. Composite keys preserve learner/assessment/activity identity, including baseline NULL activity contexts. Deferred completion checks require every required assessment's accepted passing result in the same activity; earned completion cannot be updated/deleted. Activity requirements and completion pass rows must be inserted with their parent in one SQL transaction before commit.

Published item mappings must sum to one; published assessments require required items and published item versions. New definition edits require new version identities. Pathway content edits require a new revision, approval binds the exact content hash, and approved revisions cannot gain steps. These constraints supplement, not replace, authorized and serialized publication services.

## Neo4j Layout

See [neo4j/migrations/README.md](neo4j/migrations/README.md). Empty semantic datasets are intentional: Neo4j is schema-optional, so constraints/indexes can exist before any business node. The only initial node is migration metadata. A blank graph visualization does not indicate missing schema. Inspect using:

```cypher
SHOW CONSTRAINTS;
SHOW INDEXES;
MATCH (migration:SchemaMigration) RETURN migration;
```

## Validation and Remaining Work

```powershell
.\backend\mvnw.cmd -f backend/pom.xml verify
```

Docker is required. PostgreSQL tests apply every migration to a disposable database and repeat migration/validation; synthetic fixtures verify probability bounds, active-target uniqueness, publication immutability, Unknown semantics, assignment ownership, NULL activity-context mismatch, missing/failed/cross-activity completion and successful completion. Neo4j tests exercise the actual graph migrator, repeatability, identity uniqueness, multiple versions and changed-checksum rejection. Persistent development data is not touched by these tests.

Still application-owned and unimplemented: authentication/authorization and organizational-cycle validation; complete graph publication validation; confirmed mirror writer and publication guard locking/reconciliation; scoring/attempt limits and acceptance transaction; ordered model processing; recommendation eligibility and complete snapshot compatibility; stale/current pathway transitions; privacy/scope/ROI policy enforcement. In particular, creating a SQL table or graph constraint does not implement an outbox worker or make the two stores atomic. Never open the catalog guard manually to simulate readiness.

Before production add separate migration/runtime/backup users, TLS, secret management, backup/restore and recovery tests, retention policy, and image digest pinning. Append-only triggers protect normal DML, not a superuser or a schema owner deliberately bypassing them. Do not delete volumes, edit applied migrations, or clear migration history to resolve errors. Add forward migrations and test compatibility against existing data.