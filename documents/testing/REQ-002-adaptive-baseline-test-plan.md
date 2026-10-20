# REQ-002 Adaptive Baseline — Approved Test Plan

## Status

- Contract date: 2026-10-20.
- Cluster: 1 plan only; no adaptive executable test has been created or run.
- Functions: REQ-002-F02 Configure Baseline Assessment and REQ-002-F01 Complete Baseline Assessment, with REQ-009/041 integration boundaries.
- Historical V17 evidence in [REQ-002-F02 baseline authoring](REQ-002-F02-baseline-authoring.md) does not certify this redesign.

## Planned acceptance mapping

| ID | Function / actor and tenant | Fixture and trigger | Expected outcome | Planned evidence |
| --- | --- | --- | --- | --- |
| AB-C01 | F02 / authorized L&D in Org A | Occupation with active, draft and inactive roles; load editor | Only active roles and eligible active/complete/mapped items contribute to capacity | API + PostgreSQL/Neo4j integration and FE component |
| AB-C02 | F02 / L&D Org A | Enter role/exploration maximum above deduplicated eligible capacity; save/finalize | Structured validation; no immutable version/current-pointer change | Domain/API + integration state comparison |
| AB-C03 | F02 / L&D Org A | Leave required maximum/time blank or non-positive | Reject; backend supplies no fallback default | Domain/API contract tests |
| AB-C04 | F02 / L&D Org A | In an exploration or active-role row select 50 questions; edit total to 60 minutes; edit per-question duration | Initial suggestion is 50 minutes; that row's total/per-question controls recalculate consistently; only its total duration is sent/persisted | FE component + API serialization test |
| AB-C05 | F02 / L&D Org A | Run Test Blueprint repeatedly | Feasibility/answer-safe trace returned; no Blueprint activation, attempt, response, result, mastery or preview history; no protected key | API/integration no-state-change + leakage test |
| AB-C06 | F02 / concurrent L&D commands | Finalize same revision/idempotency keys | One atomic current-pointer winner; exact replay succeeds; conflicting reuse/stale revision fails | PostgreSQL concurrency/idempotency test |
| AB-C07 | F02 / L&D Org B targeting Org A | Read/write/dry-run | Reject without capacity/configuration leakage | Authorization/isolation tests |
| AB-C08 | F02/F01 / catalog membership change | Finalize with role active, then make it draft/inactive before a new start | New start reports Blueprint-stale until refresh; existing in-progress attempt remains pinned | Neo4j/PostgreSQL integration + system test |
| AB-A01 | F01 / new or first-use Employee | Select role in Occupation A with no completed baseline | Role stays selected; baseline is required before gap/pathway | API + system test |
| AB-A02 | F01 / same Employee | Start through active role versus voluntary Occupation | Role path uses selected active-role pool/bound; exploration uses deduplicated active-role union/bound | Selector unit + integration/system test |
| AB-A03 | F01 / same Employee + Occupation | Retry/concurrent start, reload and reconnect | One `IN_PROGRESS` attempt; pinned items/options/responses/deadline/versions resume unchanged | API/PostgreSQL concurrency + system test |
| AB-A04 | F01 / same Employee | Answer concurrently, duplicate request, unpresented item | One sequence winner; exact replay only; no fork, duplicate response or answer leakage | API/PostgreSQL concurrency tests |
| AB-A05 | F01 / server deadline | Response observed at/after deadline and deadline worker races submit | No grace or late mutation; one `AUTO_SUBMITTED` result when minimum evidence exists | Clock-controlled worker/integration test |
| AB-A06 | F01 / below evidence gate | Timeout or estimator/technical failure | Attempt becomes `INVALIDATED`; no skill result/mastery evidence; one replacement links `replacesAttemptId` | Unit/API/PostgreSQL integration test |
| AB-A07 | F01 / completed attempt | Start again after role, Blueprint or catalog change | Reject retake for same Employee + Occupation; role in another Occupation retains independent allowance | Domain/API/integration test |
| AB-A08 | F01 / pinned attempt | Replace/disable Blueprint while attempt is in progress | Existing attempt resumes with snapshot; new start resolves current availability | Integration/system test |
| AB-S01 | F01/041 / fixed response vectors | All-correct, all-wrong, mixed, high-SE and calibrated parameter vectors | Reproducible theta/SE; `estimatedMastery=logistic(theta)`; downstream `mastery=logistic(theta-k×SE)`; no fixed confidence cap | Deterministic unit/vector tests |
| AB-S02 | F01/041 / valid finalization and retry | Submit/auto-submit repeatedly | Immutable result and exactly-once mastery handoff; baseline responses are not reapplied as BKT observations | PostgreSQL/outbox integration test |
| AB-R01 | REQ-009 / owning versus other Employee | View completed/invalidated result/history | Owner sees raw score, conservative mastery and confidence label; theta/SE/answers hidden; invalidated replacement linkage shown; other learner denied | API/authorization + FE/system test |
| AB-K01 | Calibration / System Administrator | Complete calibration then attempt promotion as L&D and Admin | Candidate is immutable; L&D denied; Admin promotion affects new Blueprints only | Authorization + integration/version-pinning test |

## Planned commands and evidence fields

Cluster 3 must name the actual test files/methods and approved commands before execution. Cluster 4 records command, date, environment, fixture versions, counts/results and limitations for every ID above. Expected command families are backend unit/MVC, one-time Testcontainers integration, frontend component/type-check and scoped Playwright system tests; exact commands remain unset until the Cluster 2 file layout exists.

## Non-claims

Schema rendering, compile/type-check, manual smoke, development seeds, synthetic calibration and this plan are not executable-test evidence or production psychometric validation.
