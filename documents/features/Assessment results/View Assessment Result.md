# View Assessment Result

**Current source checkpoint — slices 1–5, 2026-10-22:** The user accepted slices 2–3 and authorized slices 4–5. The common-configuration form/calculator, saved-preview and confirmed lifecycle actions, PostgreSQL-backed management directory, and safe full/legacy result/history are now implemented in uncommitted source. V1–V22 and historical data remain unchanged. Main Java compile, production-only TypeScript/lint and FE flag-off/on builds passed; bounded isolated live-client/HTTP/SQL observations are recorded in [slice 4–5 evidence](../../testing/system/REQ-002-F02-REQ-009-occupation-ui-results.md). Interactive browser review is unavailable in this session and remains unverified. No executable tests, acceptance certification, user-stack migration, stage/commit/push or automatic Cluster 3.

**Approval update - 2026-10-22:** The user approved OB-P01-P10 and the proposed schema/API/transition/concurrency/rollback design and authorized Cluster 2 implementation in small slices. Earlier review qualifiers are superseded by this approval; implementation status remains explicit. The user then confirmed a maximum of 100 Unicode characters for the name and a total budget of 30-120 seconds multiplied by maxQuestions; this is an average budget, not a per-item timer. Nearest-whole-second calculation is approved. Existing legacy values/history stay unchanged. No Cluster 3/test execution, new commit or push is authorized. Planned schema/behavior is not implemented merely by this approval.

## Current Scope Alignment
Employee views own baseline, RIASEC and module results, distinguishing interest from competency. This 2026-10-22 Cluster 1 update defines **only the adaptive-baseline portion of REQ-009-F01**; RIASEC/module publication, comments and scoring remain separately scoped. Confirmed rules and proposed compatibility design are in [Complete Baseline](../Baseline%20knowledge%20assessment/Complete%20Baseline%20Assessment.md) and [Occupation transition](../Baseline%20knowledge%20assessment/Occupation%20Baseline%20Lifecycle%20and%20Transition.md). This is a approved contract, not a runtime/executable-test pass.

### Goal, actor and trigger

An Employee opens the result of an owned terminal attempt after completion or from history. Show what was actually assessed then; do not replace the immutable outcome with current mastery, a later Role or today's baseline version. Every new-format result covers the full pinned Occupation union regardless of selected Role. Legacy Role-specific results keep their original scope; their existing successful allowance remains consumed.

### Source → processing → storage → output

1. Read trusted Employee/organization and authorize the attempt scope. Client supplies only its returned attempt ID; actor/tenant/learner and calculated output are server-owned.
2. Query PostgreSQL by organization+learner+attempt ID and terminal state, joining the exact pinned Blueprint and immutable attempt/skill results. Never resolve current Catalog/configuration or trigger finalization on GET.
3. Return safe attempt/Occupation/original optional Role snapshots, terminal reason/times, replacement links, explanatory raw correct/answered score, conservative per-skill mastery and plain-language confidence. New full-Occupation skill names come from the deduplicated pinned union, including skills outside the entry Role; legacy reads retain original role restriction.
4. Keep theta/SE, point mastery, keys/correctness/responses/rationales, technical pins/parameters, internal scope enums and evidence/outbox/receipt internals outside Employee disclosure. Public scope wording must distinguish an earlier Role baseline from the new Occupation baseline without relabeling evidence. Implemented public assessmentScope is OCCUPATION, EARLIER_ROLE or EARLIER_OCCUPATION; internal policy/pins remain private.

Reads write no attempt/revision/result/evidence/pointer/domain receipt. A successful display is not proof of delivered REQ-041 mastery/gap/pathway processing. Follow shared UI/tokens and natural EN/VI; Role remains provenance, not a new baseline section.

### Errors, dependencies and concurrency

| Branch | Expected result |
| --- | --- |
| No result/foreign learner/foreign tenant/nonterminal ID | Public not-found without leaking existence; do not finalize or invent score/mastery |
| Invalid identifier/wrong actor | Validate/deny with no data/state change |
| INVALIDATED no-mastery attempt | Show invalidation/replacement context; no fabricated skill mastery or default zero result |
| Terminal result becomes available during read | Coherent committed snapshot; retry the read if not yet available |
| Database/pinned projection failure | Explicit dependency error, not empty/zero score; retry GET only |
| Blueprint replaced/deactivated, Role renamed/changed | Recorded snapshots/results remain unchanged |

Production Identity is a dependency. Current B8 uses configured Employee gates, terminal own-scope PostgreSQL queries and no-store responses; retain them. Slice5 JdbcAdaptiveAttemptResultQuery uses the complete pinned union for full policy and retains selected-Role names for legacy Role attempts; missing/ambiguous snapshots fail503. Do not broaden SQL by dropping ownership predicates. Historical retention/deletion duration is still outside this scope.

### Acceptance and decisions

AB-R01–R05 in the [test plan](../../testing/REQ-002-adaptive-baseline-test-plan.md) cover authorized full/legacy/invalidated outputs, unknown/foreign/nonterminal IDs, dependency errors, immutable scope/names and no-state-change. Actual test files/methods/execution remain unset until approved Cluster 3.


## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-009-F01  
**Actor:** Employee  
**Status:** Pending clarification  
**Feature:** [Assessment Results](README.md)

## Description

Display an employee's own baseline, soft-skill, or module assessment outcome, including skill-level results where the scoring method supports them.

**Input:** Employee and owned assessment attempt.  
**Outcome:** Authorized result details without modifying the recorded attempt.

## Open Decisions

- RIASEC/module result details and AI comment visibility; adaptive baseline disclosure is fixed by REQ-002.
- Immediate publication versus delayed/expert-reviewed publication for each assessment type.
- Pending scoring, invalid questions, and unavailable results.

## Acceptance Baseline

An employee can inspect an available own result but cannot access another employee's result by changing an identifier.

## Current adaptive decision status

**Confirmed:** immutable own-terminal disclosure, full scope for new baseline only, historical scope/allowance retention and no write/leakage. **Confirmed design:** public scope-label DTO and dual-format name projection. **Provisional:** configured local/demo identity. **Open:** production Identity and separate RIASEC/module/retention policies. **Rejected:** historical relabel/rescore, raw score as mastery, GET finalization or exposing protected data.
