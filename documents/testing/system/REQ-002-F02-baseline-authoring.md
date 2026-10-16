# REQ-002-F02 — Full-stack system evidence

## Linked weight/capacity scenario — executed 2026-10-16

The current Playwright source waits for capacity, applies the participating Java role minimum of `15` questions for its five MicroSkills, expects default weights `20/30/50`, keeps the Platform role at zero, and then saves/reloads/generates 15 items before replay, review and publication checks.

The dedicated `req002-walkthrough` project was rebuilt on clean PostgreSQL/Neo4j volumes. Migration exited 0, PostgreSQL/Neo4j/API were healthy, the development ontology bridge returned five Platform skills, and the updated command passed **1/1 in 9.9 seconds** (scenario body 8.6 seconds):

```powershell
cd frontend
npm.cmd exec -- playwright test system-tests/REQ-002-F02-baseline-authoring.spec.ts --config=playwright.system.config.ts
```

This proves the capacity endpoint, minimum-per-cell invariant, linked `20/30/50` weights and existing save/reload/generate/replay/review/publish flow on the approved local/demo stack. It does not replace production Identity or Catalog integration evidence.

## UX/i18n delta — executed 2026-10-16

This historical browser scenario entered a role-level total, confirmed no distribution occurred before explicit Apply, verified the then-current `33.34/33.33/33.33%` behavior for three questions, kept two role panels open, and switched EN → VI → EN without losing draft state. That passing result predates and is superseded by the linked-weight/capacity contract for current acceptance.

```powershell
cd frontend
npm.cmd exec -- playwright test system-tests/REQ-002-F02-baseline-authoring.spec.ts --config=playwright.system.config.ts
```

Final result: **1 passed** in 6.7 seconds (scenario body 5.7 seconds) against the dedicated `req002-walkthrough` Compose stack. API readiness was 200 and the selected Occupation had no blueprint before the passing run. Only the web service was rebuilt/recreated to ensure Vite served the current workspace source; PostgreSQL/Neo4j/API data and volumes were not reset.

Earlier diagnostic attempts are not passing evidence: one exposed a stale web bundle, one exposed an imprecise language-button locator, and one exposed the legacy zero-role weight invariant. The final rerun occurred only after each cause was corrected.

## Occupation-scoped scenario — executed 2026-10-15

The scenario selects one Occupation, displays both of its roles without include checkboxes, configures 3 Java Core questions for the first role and leaves the second role at zero. It saves and reloads that zero role, generates no items for it, then completes replay, review and publication while preserving no-answer-key guarantees.

## Scenario

Test file: `frontend/system-tests/REQ-002-F02-baseline-authoring.spec.ts`.

The headless Chrome scenario opens `/ld-manager/assessment-bank`, resolves the real opt-in Neo4j Occupation adapter, confirms both roles, saves a valid two-role blueprint, reloads the zero-role state, generates 3 questions only for the participating Java role, replays the captured generation idempotency key, reloads the same content hash, confirms neither API JSON nor DOM contains protected/answer-key fields, reviews the exact hash, publishes it, and reloads the immutable published state.

## Environment

- Disposable Compose project: `adapt-learn-graph-baseline-occupation-c2`.
- Services: PostgreSQL 17.6, Neo4j 5.26-community, Flyway/seed, Spring Boot API and Vite/Nginx web tier.
- Readiness was checked with `docker compose ... ps`: API/PostgreSQL/Neo4j were healthy and web was running.
- After the run, `docker compose ... down -v --remove-orphans` removed the dedicated containers, network and both data volumes.

## Run evidence — 2026-10-15

```powershell
cd frontend
npm.cmd exec -- playwright test system-tests/REQ-002-F02-baseline-authoring.spec.ts --config=playwright.system.config.ts
```

Final result: **1 passed** in 7.8 seconds (scenario body 6.6 seconds).

The fixture was deterministic and isolated: the existing development seed ran first, then the disposable graph received one active Occupation, two active role memberships, one Level per role and Level-to-skill relationships matching the development question bank IDs. The API alone enabled `BASELINE_OCCUPATION_CATALOG_ENABLED=true`. The follow-up migration run disabled the catalog seeder because that seeder intentionally rejects a graph containing Occupation nodes. No persistent development volume was used as a test oracle.

This validates the local/demo vertical path. It does not replace production Identity or Catalog integration evidence.
