# Local Admin / RQ2 startup after the baseline merge

Date: 2026-10-26. REQ-034-F01/F02. This is a separate local/demo workspace, not production authentication or a migration of historical Research data.

## Why the old login returned 502

The web was running while API/migrate had exited1. Its PostgreSQL history contained the old Research V8/V9 scripts, but the merged branch uses baseline V8/V9 and Research V27/V28. Flyway correctly rejected their checksum mismatch. The seed never ran; starting API directly then failed with `Provision official bank first`. The Admin login POST therefore hit a missing upstream through Vite and returned502. The old Research Neo4j container was stopped. This is a startup/data-history mismatch, not an incorrect Admin password.

## Preserved workspace

The old `adapt-learn-graph-dev` containers are stopped; their volumes and Research history remain untouched. No Flyway repair, history rewrite, volume removal, graph overwrite or old-study migration is performed. Retained results are not automatically visible in the new workspace.

## Start the fresh compatible workspace

From the repository root, after Docker Desktop is ready:

```bash
POSTGRES_PORT=25432 NEO4J_HTTP_PORT=27474 NEO4J_BOLT_PORT=27687 API_PORT=28080 WEB_PORT=8088 docker compose -p adapt-rq2-v09 -f compose.dev.yml -f compose.research.yml up --build -d
```

Use this same project name and port overrides on subsequent starts. The Research overlay enables Research, mounts the official source/rules and creates a separate research Neo4j instance. The existing `.env`/shell password configuration still applies; this command does not change it.

Expected: PostgreSQL,operational Neo4j,research Neo4j,API healthy; web running; migrate/seed exited0. A fresh database applies V1–V28, including baseline and Research tables. Normal restarts preserve the new volumes; do not add `--volumes` to stop commands.

```bash
docker compose -p adapt-rq2-v09 -f compose.dev.yml -f compose.research.yml ps -a
docker compose -p adapt-rq2-v09 -f compose.dev.yml -f compose.research.yml logs --tail=100 migrate seed api web
docker compose -p adapt-rq2-v09 -f compose.dev.yml -f compose.research.yml down
```

## Manual checklist

Prerequisites: compatible workspace above,Research enabled,API and both graph services healthy. Use local demo data only.

1. Open http://127.0.0.1:8088/login, select **Admin**, click **Sign in**. Expected: session POST204 and redirect to `/admin/dashboard`; no502.
2. Open **Research** in the sidebar, or http://127.0.0.1:8088/admin/research. Expected: source ontology0.9,Configure RQ2 and accessible saved run history; no second Research login form.
3. For a small smoke test select only1000 nodes,2 datasets,2 distinct pairs per hop,2 measured rounds. Expected: POST202,progress completes,24 successful measured attempts across4 seed/round trials,PDF/JSON/CSV available. Warm-up and import remain excluded. This smoke check is not a full research study or performance acceptance.
4. Reload the Research page. Expected: completed run remains readable; selecting Employee/Expert/L&D must not grant Research access.

[Recovery evidence](../../testing/system/REQ-034-admin-login-recovery.md). Existing historical database reconciliation requires a separate reviewed,backed-up operation; do not repair/reset it just to get the new app started.
