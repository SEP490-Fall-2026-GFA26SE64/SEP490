# Main-dev MinIO configuration — 2026-11-05

Scope: approved local Compose synchronization only; no product requirement, UI, application code, database migration, production or accounts-dev change. Date follows the user's timezone (Asia/Ho_Chi_Minh); container logs use the Docker host clock.

## Results

| Acceptance | Actual check | Result |
| --- | --- | --- |
| AC01 Compose wiring | `docker compose config --quiet`; parsed resolved JSON and asserted internal endpoint, matching API/server credentials, `service_healthy` dependency and no MinIO published host port | Passed |
| AC02 Durable storage/readiness | Recreated main-dev MinIO; healthy; mount remains `adapt-learn-graph-dev_local_learning_assets:/data` | Passed for readiness and volume identity; existing object contents were not inventoried |
| AC03 API-network storage | Temporary Java 21 probe executed inside the API container using its actual `LEARNING_ASSETS_*` environment. Signed S3 create bucket → PUT → GET identical bytes → DELETE → GET 404; anonymous GET 403; removed its unique temporary bucket in finally | Passed; proves storage/network/credentials, not an authenticated application upload endpoint |
| AC04 Main-dev API/web startup and one-command portability | `docker compose up -d --no-deps minio neo4j api web` used existing images and retained data, without rerunning seed/migration services | Blocked: API exits with `IllegalStateException: Latest catalog source drift` from `LocalCatalogBootstrap`; web waits on API health |
| Fresh-machine configuration | `docker compose --env-file /dev/null -f compose.dev.yml config --format json`, asserted pinned default image and matching defaults | Passed for configuration only |
| Fresh-machine image availability | `docker pull minio/minio:RELEASE.2025-04-22T22-12-26Z` | Blocked: registry reports `pull access denied` |
| Alternative registry diagnostic | `docker pull quay.io/minio/minio:RELEASE.2025-04-22T22-12-26Z` | Blocked: manifest request returned `401 UNAUTHORIZED`; default registry was not changed |
| Diff hygiene | `git diff --check` | Passed |

The first fresh-default assertion using `--env-file /dev/null` with the root include still loaded the included project's `.env` and failed the default-image assertion. It was corrected to target `-f compose.dev.yml` directly; the corrected check passed. No application change was needed.

## Runtime and data boundaries

- Existing `adapt-learn-graph-minio:dev` image selected through private, Git-ignored `.env` on this machine. Existing MinIO credentials were copied directly into that file without printing their values; API credentials match. No existing private settings were overwritten.
- Main-dev PostgreSQL and all existing volumes retained. No `down -v`, graph import/rename, seed rerun, manual schema migration, commit, push or production deployment performed. PostgreSQL/Neo4j domain correctness is not certified here.
- Other Docker projects, including module-assessment-test and accounts-dev, were untouched.
- Application bucket remains `learning-content`; backend's existing lazy private-bucket creation remains unchanged. The probe used only its own `compose-probe-<UUID>` bucket and object, then removed both.
- Probe source/class for this actual run: `/tmp/sep490-compose-sync/probe/StorageProbe.java` and `StorageProbe.class` (temporary session artifacts). Commands: `javac --release 21 .../StorageProbe.java`, `docker cp .../StorageProbe.class adapt-learn-graph-dev-api-1:/tmp/StorageProbe.class`, `docker exec adapt-learn-graph-dev-api-1 java -cp /tmp StorageProbe`. The probe passed before the application process subsequently exited for catalog drift.
- No frontend changes: Playwright is not applicable. No domain/API/security logic changes: feature unit/integration suites were not rerun. Anonymous-storage denial was directly checked by the probe.

## Manual checklist

1. Prerequisites: Docker Engine/Compose, build/registry access, free main-dev ports, adequate resources, current application/catalog artifacts. Preserve existing private credentials and volumes. No role/organization fixture is required for infrastructure health checks.
2. Fresh clone: `docker compose up --build -d`. Later starts: `docker compose up -d`. This is the intended single entry point for the main dev stack, including MinIO; do not also run accounts-dev.
3. `docker compose ps -a`: MinIO should be healthy, one-shot preparation services should exit 0, API should become healthy, then web should start. Read service logs if a prerequisite fails; do not delete volumes or bypass catalog checks.
4. Verify the web at `http://127.0.0.1:8088` and API health at `http://127.0.0.1:18080/actuator/health`. These are currently blocked by the catalog startup failure; no browser-flow pass is claimed.
5. Through an authorized existing content-upload flow, upload and reopen a supported small image; recreate only MinIO and reopen it again to verify application-level persistence. This actor-based application check was not run for this infrastructure slice.
6. On a machine where the official image is inaccessible, an equivalent locally prepared MinIO image can be selected using `MINIO_IMAGE` in private `.env`. This run reused an existing image; building/sharing a portable fallback was not implemented or verified. A fresh machine without registry access or such an image is blocked.

The MinIO synchronization is implemented and storage connectivity verified. Complete single-command startup is **not certified**: catalog source/runtime alignment and default-image availability need resolution. No feature README was updated as completed.
