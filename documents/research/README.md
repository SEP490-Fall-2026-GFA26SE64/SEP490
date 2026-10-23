# Research workspace

RQ2 is implemented at `/admin/research`: reproducible ontology generation, asynchronous Neo4j traversal measurement, persisted history, PDF/JSON/CSV/dataset exports, and a frozen Markdown rules file per run. Admin configures distinct pairs per hop (1..10,000, default500), measured rounds (1..10, default3), and datasets per graph size (integer1..10, default5, automatic seeds1..N). The preview is an upper bound; actual counts are frozen after planning and never padded. Each seed/size gets a full excluded warm-up pass and shuffled rounds. Per-seed/round reports include Median, Mean/P95, error/timeout counts and graph degrees. RQ1 and RQ3 remain deferred.

- [RQ2 rules and measurement protocol](RQ2/RULES.md)
- [RQ2 API contract](RQ2/API.md)
- [Manual and system verification](../testing/system/REQ-034-manual-browser-check.md)
- [Dataset source and authoritative schema](../neo4j_schema.md)

## Local startup

```sh
docker compose -f compose.dev.yml -f compose.research.yml up --build -d
```

Sign in at `http://127.0.0.1:8088/login` using the existing **Admin** portal account, then select **Research**. It opens directly at `/admin/research`; there is no Research username/password or second access screen, and reloading retains the portal context. The scope labels appear in RQ1 → RQ2 → RQ3 order, with only RQ2 implemented. Other portal roles do not have this menu; direct Research navigation redirects to their own portal.

The current application login is a local demo actor context. In the `local` backend profile, Research follows the existing actor-header bridge (`X-User-Id`, `X-User-Role: ADMIN`), requiring both fields and CSRF for mutations. This is a development adapter, not production authentication. Outside `local`, headers grant no access: the existing server principal must have `ROLE_ADMIN`. Research defines no separate account or authentication provider. The Research API remains disabled unless `RESEARCH_ENABLED=true`.

The overlay caps the idle operational Neo4j at 768 MiB (256 MiB heap / 128 MiB page cache) to leave room for the benchmark on a local Docker VM. It adds a dedicated Neo4j instance and volume, on loopback ports 17474/17687. Neo4j health checks use a lightweight HTTP probe; the worker separately verifies database identity, schema and imported counts through Bolt. This avoids accumulating Java shell processes under timeout. Compose restarts the dependent API when either Neo4j service is explicitly updated; after out-of-band container recreation, restart the API to refresh driver connections. Existing operational databases are not benchmark targets. Database IDs are compared before any graph replacement; foreign nodes cause refusal. PostgreSQL applies forward-only migrations V8 and V9 for persisted run/graph artifacts keyed by seed. The backend uses a dedicated session advisory lock to enforce a single Research worker.

After changing code, rebuild the API. The ontology and rule Markdown are read-only mounts; a run freezes their source hash and rules text at creation. The raw JSON export contains run metadata and all sampled latency values; each dataset JSON export contains graph records and the frozen workload. Import/generation time is shown separately.

## Tests

Backend unit/API/architecture:
```sh
JAVA_HOME=/path/to/jdk21 mvn -f backend/pom.xml test '-Dtest=*Test,!*IntegrationTest,!*SchemaTest,!Neo4jTargetRoleCatalogAdapterTest'
```

Dedicated real database tests (Docker required):
```sh
mvn -f backend/pom.xml test -Dtest=ResearchIntegrationTest
```

Frontend:
```sh
cd frontend
npm ci
npm test
npm run build
```
Use Node 24.15+ or a compatible version required by package-lock dependencies.

Real browser workflow (running Compose stack and Chrome required):
```sh
PLAYWRIGHT_CHROME_PATH=/path/to/chrome npm run test:system:f02 -- research.rq2.spec.ts
```

`research.visual.spec.ts` is explicitly a visual fixture test; its sample timings must never be used as research results. The real workflow test runs all three graph sizes and saves PDF, CSV, raw JSON and rules in its test output directory.

For a focused real regression, `RESEARCH_SMOKE=true` selects only1,000 nodes with seeds1,2, seven pairs/hop and two rounds (up to84 measured attempts plus42 warm-ups). Override with `RESEARCH_DATASETS=2 RESEARCH_PAIRS=7 RESEARCH_ROUNDS=2`. The default workflow uses all sizes and the full proposed protocol; this smoke is functional evidence, not a statistically qualified scientific experiment. Legacy fixed-N API remains supported; the UI creates v3 studies only.
