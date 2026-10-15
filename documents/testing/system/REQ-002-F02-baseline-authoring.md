# REQ-002-F02 — Full-stack system evidence

## Scenario

Test file: `frontend/system-tests/REQ-002-F02-baseline-authoring.spec.ts`.

The headless Chrome scenario opens `/ld-manager/assessment-bank`, confirms both local catalog roles, saves a valid blueprint, generates 30 questions, replays the captured generation idempotency key, reloads the same content hash, confirms neither API JSON nor DOM contains protected/answer-key fields, reviews the exact hash, publishes it, and reloads the immutable published state.

## Environment

- Disposable Compose project: `adapt-learn-graph-baseline-system-c2`.
- Services: PostgreSQL 17.6, Neo4j 5.26-community, Flyway/seed, Spring Boot API and Vite/Nginx web tier.
- Readiness was checked with `docker compose ... ps`: API/PostgreSQL/Neo4j were healthy and web was running.
- After the run, `docker compose ... down -v --remove-orphans` removed the dedicated containers, network and both data volumes.

## Run evidence — 2026-10-14

```powershell
cd frontend
npm.cmd exec -- playwright test system-tests/REQ-002-F02-baseline-authoring.spec.ts --config=playwright.system.config.ts
```

Final result: **1 passed** in 7.5 seconds (scenario body 5.1 seconds).

Two earlier runs reached the real generated/reviewed states but failed because text locators also matched toast messages. Assertions were made exact for the draft title and `REVIEWED` badge; no product source was changed for those test-only failures.

This validates the local/demo vertical path. It does not replace production Identity or Catalog integration evidence.
