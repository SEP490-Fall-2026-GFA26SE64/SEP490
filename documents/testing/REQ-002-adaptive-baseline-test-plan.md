# REQ-002 Adaptive Baseline — Revised Test Plan

**Slices1–5 source checkpoint,2026-10-22:** user accepted2–3 and authorized4–5. Java main compile, production-only FE type/lint and flag-off/on builds passed; bounded live-client/HTTP/SQL observations are in [slice4–5 evidence](system/REQ-002-F02-REQ-009-occupation-ui-results.md). No executable test source, test compilation, runner or acceptance execution was created/run. All revised acceptance IDs remain Planned/Not run. Browser interaction remains unverified; historical results below retain their original scope.

**Approval update - 2026-10-22:** The user approved OB-P01-P10 and the proposed schema/API/transition/concurrency/rollback design and authorized Cluster 2 implementation in small slices. Earlier Proposed/review qualifiers below retain design provenance and are superseded for these choices. The user then confirmed a maximum of 100 Unicode characters for the name and a total budget of 30-120 seconds multiplied by maxQuestions; this is an average budget, not a per-item timer. Nearest-whole-second calculation is approved. Existing legacy values/history stay unchanged. No Cluster 3/test execution, new commit or push is authorized. Planned schema/behavior is not implemented merely by this approval.

## Status and gates

- Current Cluster2 remaining slice1 build/manual observations are in [system evidence](system/REQ-002-F02-baseline-authoring.md). Common Save/conversion/Preview source is implemented; admission/management/FE/result slices remain pending. All executable rows below remain Planned/Not run; manual observations do not promote their status. Earlier Cluster1/proposal qualifiers below are historical and superseded by the approval notice above.

- Contract alignment:22 October 2026; Functions REQ-002-F02/F01 and adaptive-baseline REQ-009-F01/F02. Confirmed full-Occupation rules plus explicitly Proposed design; not approval of those proposals or Cluster 2/3.
- Cluster 1 plan only. No executable test was created or run here. Historical V17 runs remain dated evidence for the superseded fixed contract; B1–B9 build/manual observations do not certify this revision.
- Canonical acceptance IDs below are retained/extended; they are not the retired temporary A7/AB/B9 walkthrough checklist and do not authorize data reset.
- Actor fixtures: authorized L&D/Employee in Org A, another Employee in Org A, forbidden actor and Org B for boundary tests even in a single-organization deployment.
- Catalog fixture: Occupation O, active Role A=S1/S2 and Role B=S2/S3, plus draft/inactive roles and item successors; deterministic item/parameter versions per skill. Expected union derives from approved fixture inputs, not development seed output.

## Planned acceptance mapping

Every row is **Planned / Not run, 2026-10-22**. U=domain/API unit, I=real-adapter one-time PostgreSQL/Neo4j Testcontainers integration, F=frontend component, S=scoped system/interactive flow after approval. Proposal-dependent rows must be approved before executable expectations are locked.

| ID | Function / actor and scope | Fixture / trigger | Expected outcome | Level |
| --- | --- | --- | --- | --- |
| AB-C01 | F02 / L&D Org A | Load active/draft/inactive Role/item fixture | Full active-role skill/item union deduplicates S2/shared items; ineligible versions excluded | U/I/F |
| AB-C02 | F02 / L&D Org A | Common maximum exceeds eligible union/model bounds or misses skill minimum | Structured capacity/coverage errors; no partial config/activation | U/I |
| AB-C03 | F02 / L&D Org A | Missing name/max/time; noninteger/zero/negative/out-of-range | Field-specific failure, no fallback default or write | U/I/F |
| AB-C04 | F02 / L&D Org A | Single pair: max 50, explicit 60-second suggestion, total/rate edit, clear/re-entry, clear all | 50-minute suggestion; recover calculation; persist only effective total seconds; no hidden default (rounding subject to approval) | F/U |
| AB-C05 | F02 / L&D Org A | Preview same saved Draft/revision repeatedly | Safe feasibility/sample; no version/attempt/result/evidence/current/receipt/history write or protected data | I/F |
| AB-C06 | F02 / concurrent L&D | Activate same Draft with replay/conflicting key/stale revision | One immutable version/current transition; exact replay; no partial loser writes | I |
| AB-C07 | F02 / wrong actor/tenant | List/detail/save/preview/activate/deactivate foreign scope | Deny before name/capacity/count disclosure; no writes | U/I/S |
| AB-C08 | F02/F01 / Catalog drift | Activate then change active membership/item version | Block new readiness until refresh; keep old pins/history | I/S |
| AB-C09 | F02 / L&D Org A | Save twice after actual edits; concurrent Draft creation | Same open Draft identity; at most one OPEN, revisions protect edits | I/F |
| AB-C10 | F02 / L&D Org A | Unchanged Save in UI and direct API; stale no-op; exact retry | UI no request; proposed server receipt references unchanged revision; stale conflict; no spam versions | U/I/F |
| AB-C11 | F02 / L&D Org A | Saved/unsaved/invalid/pending action states | Save exposes field errors/focus/summary; synchronous pending lock; exact key/body preserved | F/S |
| AB-C12 | F02 / L&D Org A | Activate while another Active exists; cancel dialog; current changes after dialog | Names/versions/impact shown; cancel no mutation; confirmed target mismatch conflicts | I/F/S |
| AB-C13 | F02 / L&D Org A | Deactivate without replacement during Catalog outage | New starts stop; existing attempts continue; no duplicate event on replay (dependency correction Proposed) | I/S |
| AB-C14 | F02 / L&D Org A | Current+Draft+multiple superseded pinned versions | One Draft/Active; proposed projection gives Retiring/Inactive correctly; final terminal commit changes next read without status write | I/F |
| AB-C15 | F02 / authorized list | Search case/Unicode/literal SQL wildcard/long names, date ties, filters/pages/empty | Scoped stable rows/counts/order and clear empty state; no inferred new baseline per version; OB-P02–P04 approval needed | U/I/F |
| AB-C16 | F02 / L&D Org A | Edit/reload after preview; direct Inactive reactivation | Proposed preview UI binding invalidates; server revalidates; proposed new-Draft reactivation only | U/I/F |
| AB-C17 | F02 / legacy working/current fixture | Explicit new-format conversion; conversion race/failure | Archive original Draft, one new Draft; no inferred Role aggregation; transaction rollback/replay; policy/schema checks | I/F |
| AB-C18 | F02/F01 / V18/V19 upgrade fixtures | Forward migration with legacy complete/in-progress/invalidated, new version insert | Legacy rows/receipts unchanged; new conditional checks enforced; old constraints retained; no down migration | I |
| AB-C19 | F02 / authorized read | List/detail/preview empty/not-found, DB/Catalog failures and concurrent updates | Read snapshot/no state change; history list independent of Catalog; unknown counts never Inactive; permission/no-store | U/I |
| AB-C20 | F02 / L&D EN/VI | Copy, lifecycle actions, mobile/desktop and shared UI | Explain purpose/max/time/next step; natural Role/Vị trí; same tokens/font/components; no technical dumps/false capability | F/S |
| AB-A01 | F01 / first-use Employee | Select available Role with no baseline | Role remains selected; missing baseline required before dependent gap/pathway | U/I/S |
| AB-A02 | F01 / Employee Org A | Start via Role A, Role B and authorized direct Occupation across fresh isolated Employees | Identical full S1/S2/S3 scope/pair and deduped eligible pool; individualized sequence allowed; no Role section | U/I/S |
| AB-A03 | F01 / same Employee+O | Retry/concurrent start/reload | One active attempt; same pins/pool/options/responses/deadline | I/S |
| AB-A04 | F01 / same attempt | Concurrent/duplicate answer, stale revision/unpresented item | One sequence winner; exact replay; no fork/duplicate/leak | U/I |
| AB-A05 | F01 / deadline | At/after deadline answer, worker/submit race | No late answer/grace; one finalization when minimum evidence exists | U/I |
| AB-A06 | F01 / below gate | Timeout/technical failure; manual submit before gate | Invalidated has no mastery and links replacement; early manual submit rejected while attempt can continue | U/I |
| AB-A07 | F01 / completed Employee+O | Select Role B/change config/catalog; start another Occupation | SameO retake denied; other Occupation independent; no reset | U/I/S |
| AB-A08 | F01/F02 / race | Replace/Deactivate with pinned attempt and concurrent new start | Old pins survive; admission shared/exclusive ordering; no old-version start after Deactivate wins | I/S |
| AB-A09 | F01 / legacy fixtures | Resume/answer/finish legacy Role A and earlier union attempts after migration | Exact old scope/bounds/deadline/pins; no new skills/evidence or relabeling | I/S |
| AB-A10 | F01 / revised admission | Legacy current then new full version activation; duplicate old/new request keys | New starts blocked until explicit new format; historical replay stable; no silent legacy fallback | I |
| AB-A11 | F01 / invalidated predecessor | Linked replacement on current full config; rollout admission disabled | Authorized current union for new replacement; preserve predecessor; denied rollout start writes nothing; dual-reader continuation | I/S |
| AB-S01 | F01 / numerical vectors | All-correct/wrong/mixed/high-SE, shared-skill/full-union coverage | Pinned reproducible theta/SE; logistic(theta), conservative logistic(theta-k*SE); minimum coverage before early stop, no confidence cap | U/I |
| AB-S02 | F01/041 / repeated finalization | Manual/auto/replay/rollback and delayed outbox consumer | Immutable results/one evidence event; no repeated BKT input; durable event not delivery; rollback leaves no partial results | I |
| AB-R01 | 009-F01/F02 / own/other Employee | Completed/invalidated/new/legacy reads | Safe raw/conservative/confidence; no theta/SE/key/answer/rationale/pin leak; foreign IDs denied | U/I/F/S |
| AB-R02 | 009-F01 / full result with Role A provenance | S3 belongs only to Role B; rename current Catalog/Role | All pinned union skill names returned, including S3; original legacy result remains role-scoped | I/F |
| AB-R03 | 009-F02 / same Employee | Legacy Role A completion + invalidated/replacement chain; later Role B/config change | Original scope/date/result/link retained; no re-score/latest mastery substitution/reset | I/F |
| AB-R04 | 009-F01/F02 / read failures | Empty history/unknown ID/nonterminal/foreign tenant/DB failure | Safe empty/not-found/explicit dependency handling, no fallback zero scores or personal count leakage | U/I/F |
| AB-R05 | 009-F01/F02 / read-only | Before/after authorized/denied/repeated result/history GET, concurrent finalization | No domain-table mutation/receipt/finalize/pointer/delivery write; coherent committed snapshot | I |
| AB-K01 | Calibration / Admin vs L&D | Candidate promotion, then new/old version read | Only Admin promotion; old pins unchanged. Existing boundary only; calibration UI not added to this scope | U/I |

## Test location/method/command mapping — planned, not created

| Suite scope / acceptance IDs | Candidate future file and method groups | Command status |
| --- | --- | --- |
| Config/coverage/no-op/authorization C01–04/C07/C09–12 | backend/src/test/java/.../assessment/adaptive/OccupationBlueprintContractTest.java; unionBounds, noOpSave, staleAndTenant (Proposed names) | Actual files/methods and exact Maven selector TBD at approved Cluster 3 |
| Persistence/migration/races C05–19/A03–11/S02 | .../OccupationBaselinePostgresIntegrationTest.java; migrateLegacy, activationStartRace, immutableHistory, readNoWrite (Proposed) | One-time real Testcontainers, no dev Compose volumes; exact command TBD |
| Numerical A02/S01 | .../OccupationAdaptiveSelectionTest.java; allUnionSkills, dedupAndCoverage, pinnedVectors (Proposed) | Unit selector/fixture version and command TBD |
| Safe results R01–05 | .../AdaptiveBaselineResultScopeTest.java and real-adapter counterpart; fullAndLegacyNames, ownerIsolation, noWrite (Proposed) | Unit/API + PostgreSQL integration selectors TBD |
| Form/list C04/C10–12/C15–16/C20 and result UI R01–04 | frontend/src/features/manager/baseline-assessments/OccupationBaselineForm.test.tsx and employee equivalent (Proposed) | Vitest targeted selector TBD, not run by build |
| Journeys A01–03/A07–09/C12–13/C20/R01–03 | frontend/system-tests/REQ-002-occupation-baseline.spec.ts (Proposed) | Scoped Playwright against isolated approved stack only after Cluster 3 approval |

Performance/regression: add bounded list-query/union-pool/activation/start contention measurements and legacy/module/REQ-001 guard regression to the approved Cluster 3 scope. Dataset sizes, thresholds, duration and environment are Open, not invented benchmark criteria. Production numerical calibration is separately unverified.

For every future execution, record Function/acceptance ID, actor/tenant, exact fixture versions, trigger, expected result, actual file/method, exact command, date/timezone, environment, counts/result and limitations in per-level per-REQ evidence. All actual methods/commands/results remain **TBD / Not run** here. No test runner, compile, migration or Docker operation is authorized by this plan.

**Confirmed:** product acceptance boundaries. **Proposed:** proposal-dependent expectations, future files/methods and performance design. **Provisional:** numerical constants/local dependencies. **Open:** OB-P approvals, limits and exact approved executable scope. **Rejected:** treating documentation/build/manual/seed as executable evidence, rewriting historical passes or resetting the user's completion.
