# REQ-002-F02 — Baseline blueprint authoring test plan and evidence

## Scope and status

- Actor: L&D Manager from trusted server-side context.
- Verified product flow: select one Occupation, configure all of its roles by skill/difficulty (including zero-question roles), generate an exact assessment manifest, review its current content hash, then publish it.
- Tenant context: the current product contract is single-organization. Tests still verify that the actor organization is passed to catalog validation and that an unauthenticated or unauthorized actor is rejected before dependencies are called.
- Approval status: the user approved O6 and the original Cụm 1–4 Occupation flow, completed on 2026-10-15. The user also approved Cụm 1–4 for the UX/i18n delta, completed on 2026-10-16 with the evidence below. F02 is surface-complete on the local/demo boundary, not production-ready.

## Occupation-scoped delta — executed 2026-10-15

| Rule | Observable result | Planned level | Status |
| :--- | :--- | :--- | :--- |
| R9 | One Occupation resolves to one logical blueprint identity; later saves create immutable versions rather than another blueprint. | Unit + PostgreSQL integration | PASS |
| R10 | A saved version contains all and only current roles linked by `Occupation-[:HAS_ROLE]->TargetRole`; a missing/injected/cross-Occupation role rejects the whole write. | Unit + Neo4j/catalog integration | PASS |
| R11 | A role whose skill counts total `0` survives save/reload but causes no coverage lookup, generated item or score contribution. At least one role must be non-zero. | Unit + PostgreSQL + system | PASS |
| R12 | Role skill scope is the de-duplicated union of `TargetRole -> HAS_LEVEL -> REQUIRES_SKILL -> MicroSkill`; missing or inconsistent catalog structure is catalog-not-ready. | Neo4j/catalog integration | PASS |
| R13 | Shared role/skill/difficulty demand is aggregated against unique published question versions; generation never repeats one question version in the same assessment. | Unit + PostgreSQL integration | PASS |
| R14 | UI lists Occupations, then all roles within the selected Occupation, supports setting one role to zero, and preserves the existing save/generate/review/publish flow. | Frontend + Compose/Playwright | PASS |

R1–R8 below remain regression requirements and were replayed together with R9–R14.

## Approved acceptance rules used by the tests

| Rule | Observable result |
| :--- | :--- |
| R1 | Only a trusted active L&D actor can author; non-local/production-like access is deny-by-default. |
| R2 | Enabled roles and skills are validated against the actor's catalog scope; disabled roles are retained but skipped. Coverage shortage reports every missing difficulty and persists nothing. |
| R3 | Create/revise is versioned and immutable. Same actor/key/content replays; changed content conflicts; stale expected version conflicts. |
| R4 | Generation pins the exact blueprint version, item versions, role positions, scoring weights and content hash. API/UI never expose protected or answer-key material. |
| R5 | Same generation key replays the same draft; a new key creates a successor version; changed coverage cannot leave a partial manifest. |
| R6 | Review and publish require the exact current content hash. Review freezes the manifest and publish freezes both header and items; retries remain idempotent. |
| R7 | Flyway V1–V13 works on a clean PostgreSQL 17.6 database and rerun is a no-op. Persisted audit timestamps round-trip as UTC `timestamptz`. |
| R8 | The L&D page supports save → generate → review → publish and shows actionable coverage failures without enabling an invalid next action. |

## Test mapping

| Level | Rules | Evidence |
| :--- | :--- | :--- |
| Unit/application/API/frontend | R1–R6, R8–R14 | [Unit evidence](unit/REQ-002-F02-baseline-authoring.md) |
| PostgreSQL + Neo4j integration | R3–R7, R9–R13 | [Integration evidence](integration/REQ-002-F02-baseline-authoring.md) |
| Full Compose + browser | R3–R8, R11, R14 | [System evidence](system/REQ-002-F02-baseline-authoring.md) |

## Occupation-scoped execution summary — 2026-10-15

- Scoped backend unit/API run: **24 passed**, 0 failures/errors/skips.
- PostgreSQL V1–V13 integration: **4 passed**; Neo4j Occupation adapter: **3 passed**; corrected graph-schema regression: **1 passed**.
- Full backend regression: **174 passed**, 0 failures/errors/skips.
- Scoped frontend run: **9 passed** across 2 files; full frontend regression: **39 passed** across 10 files.
- Full-stack Compose/Playwright Occupation flow: **1 passed** in 7.8 seconds. It saved and reloaded a two-role blueprint with one zero-question role, generated 3 items only for the participating role, replayed the generation key, reviewed the exact hash and published it without exposing answer-key material.
- The disposable Compose project, network and PostgreSQL/Neo4j volumes were removed after the run.

`GraphSchemaTest` initially exposed a stale seed assertion: the current deterministic seeder creates 16 `TargetRole-[:REQUIRES_SKILL]->MicroSkill` relationships, while the assertion still expected 9. The assertion was aligned with the current seed and then passed both alone and in the 174-test regression. No graph schema or seed data was changed by that correction.

## Role-scoped execution summary — 2026-10-14

- Baseline backend suite: **21 passed**, 0 failures/errors/skips.
- Entire frontend Vitest suite: **37 passed** across 10 files; the REQ-002 additions account for 7 tests across 2 files.
- Scoped Playwright system flow: **1 passed** on the disposable full Compose stack.
- Full backend regression at that date: 164 executed, 163 passed and 1 graph-schema assertion failed because the test expected 9 role-to-skill relationships while the current seed created 16. The stale assertion was corrected and is superseded by the successful 2026-10-15 regression above.

Warnings retained for follow-up: Spring `@MockBean` deprecation and Mockito dynamic-agent warnings. They did not fail the suites.

## Remaining boundaries

- Development Catalog and L&D actor adapters are test/demo boundaries, not production Identity/Catalog integration evidence.
- The Occupation adapter is still local opt-in. Its real Neo4j traversal is integration-tested, but production tenant visibility, publication readiness and catalog snapshot ownership remain Catalog dependencies.
- Development question import data is deterministic setup, not a production oracle.
- Employee attempt, response, scoring/evidence and RIASEC flows are outside this authoring function.
- No commit or push is part of this evidence run.

## UX/i18n change — executed 2026-10-16

The user approved Cụm 2 on 2026-10-16. The frontend Function, regression and Compose/browser suites below ran against the completed Cụm 1 behavior:

| Confirmed rule | Observable result | Planned level | Status |
| :--- | :--- | :--- | :--- |
| UX1 | Applying a role total deterministically produces that exact total and balances difficulty/skill cells according to the approved rule. Repeating the same input and catalog order gives the same result. | Frontend unit/component | PASS |
| UX2 | Applying zero clears all counts/weights. A later manual cell edit updates the displayed role total without silently redistributing other cells. | Frontend component | PASS |
| UX3 | UI percentage `40` maps to API decimal `0.4`, a loaded decimal `0.4` displays as `40%`, used weights total `100%`, and unused difficulties remain `0%`. | Frontend unit/API/component | PASS |
| UX4 | Switching EN/VI translates static and dynamic baseline-authoring content without losing unsaved input or changing the request payload. | Frontend component + system | PASS |
| UX5 | Multiple role panels can remain expanded and each can be collapsed independently. | Frontend component + system | PASS |
| UX6 | Existing save/reload/generate/review/publish, coverage shortage and zero-role behavior remain compatible. | Frontend regression + system | PASS |

Execution summary:

- Scoped frontend: **16 passed** across 3 files, including the new deterministic distribution/percentage unit suite and 7 page/component cases.
- Full frontend regression: **46 passed** across 11 files in 9.71 seconds.
- Full-stack Compose/Playwright: **1 passed** in 6.7 seconds; the scenario covered explicit distribution, exact `33.34/33.33/33.33%`, EN/VI state retention, multi-open roles and the existing save/reload/generate/replay/review/publish flow.
- Production build passed; lint exited 0 with pre-existing warnings outside the changed baseline files.
- System execution exposed a legacy backend invariant that requires weights of every persisted role to total one even when the role has zero questions. The frontend boundary now sends compatibility weights `0.3334/0.3333/0.3333` only for an excluded role and normalizes them back to visible zeros on load. Generation/scoring still ignores that role because participation is derived from its zero counts.

## UX/i18n Cụm 4 completion review — 2026-10-16

- UX1–UX6 map to passing frontend Function/component/regression and Compose/browser evidence; no acceptance exception remains.
- Static source review found one frontend route/component/helper path and one backend controller/service path, with no legacy single-open role configuration still active.
- Temporary entries `TMP-REQ002-01..05` still match their files, properties and consumers. The UX delta introduced no new runtime fake, seed or conditional wiring.
- No backend, API DTO, migration or persistence file changed. Zero-role compatibility is isolated to the frontend request/editor boundary and documented as non-participating wire compatibility.
- Documentation links, conflict-marker scan, secret-pattern scan and `git diff --check` passed. Executable tests were not rerun because Cụm 3–4 changed Markdown only after the successful Cụm 2 run.

## Cụm 4 completion review — 2026-10-15

- R1–R14 are mapped to passing unit/application/API/frontend, PostgreSQL/Neo4j integration and Compose/Playwright evidence above.
- No backend/frontend/runtime code changed after the successful Cụm 2 run; subsequent worktree changes are documentation only, so executable suites were not rerun in Cụm 4.
- Static completion checks passed: no unmerged/conflict markers, relative links in changed Markdown resolve, and `git diff --check` is clean in both repositories.
- Legacy `TargetRoleCatalogPort` compatibility remains available to other consumers, but new Occupation blueprint drafts route through `BaselineOccupationCatalogPort`; there is one controller/service/adapter path for the new command flow.
- Rollback is configuration-first: leave `BASELINE_OCCUPATION_CATALOG_ENABLED=false` to disable the local adapter. V13 is forward-only and must not be edited or rolled back by deleting history; legacy-null identities remain compatible.
- The complete read-and-run walkthrough is [REQ-002-F02 full walkthrough](../../../../.project/test/REQ-002-F02-full-walkthrough-test-guide.md).
