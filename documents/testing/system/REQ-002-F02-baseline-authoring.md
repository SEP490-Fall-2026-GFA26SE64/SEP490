# REQ-002-F02 — Full-stack system evidence

**Artifact-retention update,2026-10-22:** At the user’s request, internal A7/AB Docker launchers/fixtures/configs, stopped test containers, raw scratch observations/logs and generated smoke build files were removed. Historical bounded observations below remain summaries, not reproducible raw-log links or new acceptance. All Docker data volumes, source/migration recovery patches/hashes and main-merge backups were retained; one workspace `.tools/occupation-baseline-slices/retained-runtime-recovery.zip` preserves the former runtime configuration/container metadata. The manual guide now uses one standard project Compose startup command and explicitly requires separately configured adaptive dependencies. No product runtime code/schema or stored learner history was changed; no tests/commit/push.

**Cluster2 remaining slices2–3,2026-10-22:** runtime source implemented and Java21 main compiled with `-Dmaven.test.skip=true`; no executable test source/compilation/runner was created or run, as requested. Revised acceptance IDs remain Planned/Not run. Bounded disposable-adapter HTTP/SQL observations and manual procedures are in [slice2–3 evidence](../system/REQ-002-F01-F02-occupation-admission-management.md); historical passes below keep their original scope.

## Cluster 2 manual observations - remaining slice 1 of 5, 2026-10-22

This section records bounded manual runtime smoke, **not executable tests or completed system acceptance**. No test source/runner was created, compiled or run. Remaining slices, FE/browser, production Identity/Catalog, numerical validation and actual legacy attempt/result continuation remain unverified here. The historical evidence below retains its original scope.

- Function/actor: REQ-002-F02, server-configured active L&D+Administrator account ending101 in synthetic Org100; separate foreign Org200 existed. Existing local/demo/non-prod master/persistence/eligibility gates were used; attempt/answer/finalizer/worker gates remained off.
- Runtime: Windows Java21, compiled main classes and existing Maven runtime dependencies, full Spring Boot3.5 application, real PostgreSQL17.6-alpine and Neo4j5.26-community. Own containers `alg-ob-remaining1-{pg,graph}-20261022`, label `codex.task=occupation-remaining1-20261022`, bridge with localhost-only35432/37687, tmpfs data/logs, no named volumes. API bound only127.0.0.1:38081. Existing four `alg-ab-flow-local` services/volumes were untouched.
- Build: backend `mvnw.cmd -B '-Dmaven.test.skip=true' compile` passed,265 main sources and28 migration resources; final source compiled after the JDBC fix. Full app Flyway applied22 migrations successfully to the fresh disposable database; restart validated them. V1-V21 source hashes remain unchanged from the before-slice manifest. No migration was applied to a user database.
- Synthetic fixture: active Role A=shared/skill-a, B=shared/skill-b, four published items per skill; union12, three skills, pinned model minimum3 and model limit4096. These are manual input examples, not production or executable-test oracles. Legacy Draft name101 ASCII characters, bounds5/1 second plus Role2/1 and3/1; old V1 SAVE receipt. Original created actor/time explicitly retained.
- Manual URL: `http://127.0.0.1:38081/api/v1/ld/adaptive-baseline-blueprints/occupations/occupation`. Procedure: read workspace; replay old Save; submit common Save/conversion with stale/infeasible inputs; interrupt conversion receipt after archive+new Draft SQL; retry without interruption; preview saved revision; edit then retry old command/preview; revoke actor and retry; add an empty Catalog skill and preview again. Scratch URL is unavailable after cleanup.

| Planned acceptance reference | Trigger and observed result | Evidence limit |
| --- | --- | --- |
| AB-C01/C02 | Workspace200 reported union12, skillCount3/minimum9/model4096, rather than Role capacity8+8; max8 rejected422; max5000 reported union/model shortages. Added empty skill produced feasible=false, minimum12 and skill-empty coverage3/0 with no sample | Manual fixture, no concurrency/performance/numerical proof |
| AB-C03 | Common name101 and duration269 for max9 rejected400;100 Unicode supplementary code points accepted on update; max10/time1200 accepted; mixed fields including roles:null rejected400 | UI field feedback/calculator remains pending |
| AB-C05/C16 | POST /test with saved ID/revision returned9 then10 safe sample items over all three skills; item keys only itemVersionId/microSkillId/prompt/options/reason. Stale saved revision409. Receipt count unchanged by reads/previews | No browser preview binding evidence |
| AB-C07 | Revoking LD_MANAGER made exact legacy Save replay403 before receipt; ungranted Occupation403 without metadata | Full foreign-tenant/production auth suite not run |
| AB-C09/C17 | Fresh legacy Save400; normal Save cannot change legacy shape409; stale conversion409; explicit conversion200 creates new ID/revision1, old row ABANDONED/revision2; exact replay after edit still returns original new-Draft revision1; altered body with retained key409 | Concurrent creation/conversion not exercised |
| AB-C17 | Receipt interruption raised PostgreSQL08006 after archive/new insert:503, only old OPEN/revision1 remained and no new receipt. Removing trigger allowed success. Old config+created_by+created_at MD5 stayed `14e3abb653b6d229ade71d8953851996`; original name101/time1 remained intact | First attempt exposed JDBC JSON '?' placeholder error before any writes; changed to jsonb_exists, recompiled/restarted and repeated actual after-write interruption successfully |
| AB-C17/C18, partial | Legacy SAVE receipt decoded/replayed before and after conversion despite name/time outside new limits. Learner-state MD5 stayed `615314fd3a89ce6eed9ce09f897d518a`; one OPEN plus one archived Draft,3 receipts,0 activations/versions/attempts after all commands | No historical completed/in-progress attempt or old Activate receipt fixture in this smoke; full upgrade/history acceptance remains Planned/Not run |

Fresh Activate returned409 with the admission-cutover explanation and made no version/current change. This is the temporary slice boundary, not implemented activation acceptance. No-op Save, list/lifecycle, Employee start and result/history still await their assigned slices. Exact immutable receipts remain the replay source; Preview creates no receipt.

Cleanup: verified own process command line/port and both container labels/mounts before stopping/removing only those resources; temporary interruption trigger was removed. No commit, push, source harness, executable test or user-data reset. Raw scratch output is not executable acceptance evidence.

> **Historical V17 evidence:** this Save → Generate → Review → Publish scenario is superseded for future REQ-002 implementation. The adaptive end-to-end target is Configure → Test Blueprint → Finalize → Start → Answer/Reload → Submit/Auto-submit → Result.

## Historical linked weight/capacity scenario — executed 2026-10-16

The current Playwright source waits for capacity, applies the participating Java role minimum of `15` questions for its five MicroSkills, expects default weights `20/30/50`, keeps the Platform role at zero, and then saves/reloads/generates 15 items before replay, review and publication checks.

The dedicated `req002-walkthrough` project was rebuilt on clean PostgreSQL/Neo4j volumes. Migration exited 0, PostgreSQL/Neo4j/API were healthy, the development ontology bridge returned five Platform skills, and the updated command passed **1/1 in 9.9 seconds** (scenario body 8.6 seconds):

```powershell
cd frontend
npm.cmd exec -- playwright test system-tests/REQ-002-F02-baseline-authoring.spec.ts --config=playwright.system.config.ts
```

This proves the capacity endpoint, minimum-per-cell invariant, linked `20/30/50` weights and the former save/reload/generate/replay/review/publish flow on the approved local/demo stack. The current management routes and slider-free UI still need a new system run. It does not replace production Identity or Catalog integration evidence.

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

## Management lifecycle delta — not executed 2026-10-17

The passing scenarios above target the historical `/ld-manager/assessment-bank` editor and predate the persistent management route graph. The current intended path is `/ld-manager/baseline-assessments` → Occupation workspace → Blueprint Versions/Assessment Versions → persistent detail routes, including draft edit/review/publish, successor or restore, disable, reload, localization and the separate answer-reveal action.

No disposable Compose/Playwright run of that current management lifecycle was completed because the Docker Linux engine was unavailable. Legacy system evidence remains useful regression history but is not acceptance evidence for V14-V16 or the new route/lifecycle behavior.

As of 2026-10-19 Docker-backed PostgreSQL integration is available and passed, but this management browser scenario has not been rerun. Component tests cover the two-tab Blueprint list, saved row, detail, and Save → Finalize → Generate CTA; they do not prove the full browser flow against a disposable Compose stack.
