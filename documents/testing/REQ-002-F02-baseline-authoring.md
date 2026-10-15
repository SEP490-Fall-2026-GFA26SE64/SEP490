# REQ-002-F02 — Baseline blueprint authoring test plan and evidence

## Scope and status

- Actor: L&D Manager from trusted server-side context.
- Product flow: configure a versioned role/skill/difficulty blueprint, generate an exact assessment manifest, review its current content hash, then publish it.
- Tenant context: the current product contract is single-organization. Tests still verify that the actor organization is passed to catalog validation and that an unauthenticated or unauthorized actor is rejected before dependencies are called.
- Cụm 2 status: executable baseline suites passed on 2026-10-14; ready for review, not production Done while real Identity, Catalog/snapshot, Occupation mapping and production importer dependencies remain provisional.

## Approved acceptance rules used by the tests

| Rule | Observable result |
| :--- | :--- |
| R1 | Only a trusted active L&D actor can author; non-local/production-like access is deny-by-default. |
| R2 | Enabled roles and skills are validated against the actor's catalog scope; disabled roles are retained but skipped. Coverage shortage reports every missing difficulty and persists nothing. |
| R3 | Create/revise is versioned and immutable. Same actor/key/content replays; changed content conflicts; stale expected version conflicts. |
| R4 | Generation pins the exact blueprint version, item versions, role positions, scoring weights and content hash. API/UI never expose protected or answer-key material. |
| R5 | Same generation key replays the same draft; a new key creates a successor version; changed coverage cannot leave a partial manifest. |
| R6 | Review and publish require the exact current content hash. Review freezes the manifest and publish freezes both header and items; retries remain idempotent. |
| R7 | Flyway V1–V12 works on a clean PostgreSQL 17.6 database and rerun is a no-op. Persisted audit timestamps round-trip as UTC `timestamptz`. |
| R8 | The L&D page supports save → generate → review → publish and shows actionable coverage failures without enabling an invalid next action. |

## Test mapping

| Level | Rules | Evidence |
| :--- | :--- | :--- |
| Unit/application/API/frontend | R1–R6, R8 | [Unit evidence](unit/REQ-002-F02-baseline-authoring.md) |
| PostgreSQL integration | R3–R7 | [Integration evidence](integration/REQ-002-F02-baseline-authoring.md) |
| Full Compose + browser | R3–R8 | [System evidence](system/REQ-002-F02-baseline-authoring.md) |

## Final execution summary — 2026-10-14

- Baseline backend suite: **21 passed**, 0 failures/errors/skips.
- Entire frontend Vitest suite: **37 passed** across 10 files; the REQ-002 additions account for 7 tests across 2 files.
- Scoped Playwright system flow: **1 passed** on the disposable full Compose stack.
- Full backend regression: 164 executed, 163 passed and 1 unrelated existing-schema assertion failed. `GraphSchemaTest.createsCatalogConstraintsAndRejectsDuplicateKeys` expects exactly 9 Neo4j constraints while the current graph migrations create 16. The REQ-002 scoped backend suite and the other Neo4j suites passed; this owner-2 graph assertion was not changed in this task.

Warnings retained for follow-up: Spring `@MockBean` deprecation and Mockito dynamic-agent warnings. They did not fail the suites.

## Remaining boundaries

- Development Catalog and L&D actor adapters are test/demo boundaries, not production Identity/Catalog integration evidence.
- Development question import data is deterministic setup, not a production oracle.
- Employee attempt, response, scoring/evidence and RIASEC flows are outside this authoring function.
- No commit or push is part of this evidence run.
