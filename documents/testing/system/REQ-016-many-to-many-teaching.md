# REQ-016-F01/F02 — many-to-many teaching system and manual evidence

Date: 2026-10-26. Approved change: LearningModule–MicroSkill TEACHES becomes many-to-many. Dataset/schema/workbook/validator/importer/source manifests/diagram/feature specifications/local baseline seed were aligned to v09. Main's baseline and PostgreSQL V1–V26 remain intact.

## Runtime scope

Verification uses a separately named Compose project `sep490-req016-check`, fresh dedicated volumes and ports PostgreSQL25432,Neo4j27474/27687,API28080,web28088. The backend image packages the current branch's JAR on the existing Java21 runtime; the web serves current mounted source through Vite. No existing user database is reset or overwritten. Tests use the existing local demo Employee persona, not production authorization.

Initial Compose checks: migration/seed exited0, API healthy and web started. Neo4j readback:833 nodes/4638 relationships,85 Modules/79 skills/181 TEACHES pairs. PostgreSQL readback:135 DRAFT items. A second seed exited0; Neo4j counts stayed833/4638. A final clean build/runtime check is recorded below before completion.

## Browser regression

`frontend/system-tests/REQ-016-many-to-many-catalog.spec.ts` checks48 Roles with v09 and three Levels, opens/closes detailed requirements, cancels confirmation without changing the prior selection, confirms a Role, verifies v09 persisted selection and its reload, and captures desktop/VI mobile views. This is a regression of the real role/baseline consumer, not an assertion that the legacy Module CRUD screen is backed by this catalog.

Final clean build: **passed**,6 backend tests (2 contract/3 architecture/1 real Neo4j integration), zero failures/skips. Packaged artifact contains exactly26 main migrations and no stale Research implementation classes. A new Compose project/volumes seeded successfully from that clean artifact; API healthy and web started. Final PostgreSQL readback:26 successful migrations,135 DRAFT items. Final Neo4j readback:181 TEACHES pairs,85 Modules,79 skills.

Final Playwright run: **1 passed** (approximately1.7minutes overall). Full mutation/reload assertions passed; desktop and390px VI screenshots were opened for visual review. The test allows180seconds overall and45seconds for state reconciliation on this resource-limited local stack; this is functional acceptance, not a performance claim. The screenshots are in `frontend/test-results/REQ-016-many-to-many-catal-8e0fc-ection-and-persisted-reload-system-chrome/` (roles-v09-desktop.png and roles-v09-mobile-vi.png). Separate interactive in-app navigation was unavailable (connection-refused before readiness, then a navigation timeout); the executable Chrome flow and offline visual inspection above are the verified browser evidence. The manual checklist remains available for independent user verification.

After verification, only the separately named test containers/volumes are removed. User/primary volumes are untouched.

## Preservation and upgrade limits

Only the baseline import envelope changes catalog/source/scope pins. All135 question items/IDs/content hashes/bank identity and DRAFT state remain unchanged. Original v08 source/scope/manifest bytes are archived and used by the original calibration PIN. Historic items/models/attempts/results/profiles/pathways are not reset, rescored or repinned. No new PostgreSQL migration or graph property is introduced.

An existing v08 graph is deliberately refused by the v09 seed/import snapshot guard. Deploying into a populated environment requires a backed-up, reviewed catalog cutover. Do not remove a volume or overwrite catalog/history to force startup. [Envelope/source details](../../dataset/question-bank/15-1212.00/ONTOLOGY_V09.md). Content remains NEEDS_EXPERT_REVIEW; cardinality/structure checks do not approve content or certify production readiness.

## Manual checklist

Prerequisites: fresh compatible Compose test environment; local Employee demo session; v09 seed and v09 baseline envelope. Default deployment uses web8088/Neo4j7474; the isolated verification below uses web28088/Neo4j27474.

| URL / file | Steps | Expected |
| --- | --- | --- |
| `http://127.0.0.1:27474/browser/` | Query `MATCH (m:LearningModule)-[:TEACHES]->(s:MicroSkill) RETURN m.id,collect(s.id)`; then group by skill | Some Modules teach multiple skills; some skills have multiple Modules;181 pairs total |
| Same Neo4j Browser | Run both orphan queries from the import guide | Zero Modules without taught skills; zero skills without providers |
| `documents/dataset/ontology_dataset.xlsx` | Inspect LearningModules/TEACHES and source pointers | 85 Modules and181 teaching records; fields populated and match JSON; review remains pending |
| `http://127.0.0.1:28088/employee/target-roles` / Employee | Open Role requirements, close with Escape; Choose Role then Cancel | Three populated Levels; dialog closes; cancellation leaves selection unchanged |
| Same Role URL | Choose and Confirm; reload; switch VI and mobile viewport | Selected Role persists with v09 snapshot; page and controls remain usable |
| `documents/diagrams/neo4j.svg` | Inspect teaching edge and metadata | 1..* at both Module/Skill ends; no Course; readable relationship labels |
| Existing v08 database | Check planned upgrade without running a reset/import | Original catalog/history retained; seed fails closed until an explicit reviewed cutover |

Unit and full-field integration evidence: [unit](../unit/REQ-016-many-to-many-teaching.md), [integration](../integration/REQ-016-many-to-many-teaching.md).

## Merge into benchmark-data-solution-test — 2026-10-26

Resolved15 conflicted files when merging main: retained main's baseline v09 envelope/compatibility guidance and matching diagram exports, plus the benchmark branch's Research RQ2 schema/store boundary and V27/V28 documentation. Added no ontology properties or runtime behavior beyond the already merged changes. Current merge verification:13 dataset tests passed;28 migration versions are unique; current source/scope/manifest byte pins match; all135 question items remain equal to v1; diagram source/SVG/PNG exactly match main. The earlier runtime/Playwright results above retain their original execution scope; no fresh full-stack run is claimed for this textual conflict resolution. Use the same manual checklist for independent verification.
