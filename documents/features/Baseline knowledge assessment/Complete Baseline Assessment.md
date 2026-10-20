# Complete Baseline Assessment

## Current adaptive contract

**Function:** REQ-002-F01. **Actor:** Employee. **Status:** Cluster 1 contract approved on 2026-10-20. No adaptive runtime is implemented yet.

### Goal and position

Estimate initial mastery for MicroSkills covered by the applicable Occupation Blueprint. The same baseline must distinguish limited evidence from reliable evidence for Intern, Junior and Senior Employees; a strong result is not capped merely because it came from a baseline.

```text
trusted Employee chooses a role or an available Occupation
  -> resolve that Occupation and its current Blueprint
  -> reuse a completed baseline mastery for that Occupation, or start its one allowed baseline
  -> create or resume one adaptive attempt
  -> pin Blueprint/catalog/item/model/mapping/parameter versions and deadline
  -> present one item at a time
  -> accept response idempotently; update provisional theta + SE
  -> select the next skill/item by 3PL information and Blueprint bounds
  -> stop by evidence, hard bound, manual submit or deadline
  -> finalize raw result + per-skill theta/SE/point mastery/conservative mastery
  -> emit baseline mastery evidence exactly once
```

Choosing a role is never blocked by baseline. An Employee who has no completed baseline mastery for that Occupation—including a new Employee or an existing employee using the system for the first time—must complete the Occupation baseline before mastery-dependent gap/pathway steps. A completed baseline for the same Occupation satisfies later role choices inside that Occupation; a role in another Occupation requires that other Occupation's baseline. An Employee may also choose any available Occupation in the organization and take its baseline voluntarily without selecting a role.

The allowance is one successful mastery-producing baseline per Employee + Occupation, regardless of entry path. A completed result cannot be retaken because a role, Blueprint or catalog later changes. A replacement is allowed only when the earlier attempt was invalidated and emitted no mastery; deleting an account follows the separate retention/deletion policy and is not a reset command.

The Employee cannot choose parameters, submit correctness/mastery, see protected answers or change the server deadline. Gap calculation, pathway generation/review and `a/b/c` calibration belong to dependent Functions.

### Trusted context and client input

| Client may send | Server owns/derives |
| --- | --- |
| Idempotency key and expected revision | Organization, learner and attempt purpose |
| Own attempt ID returned by the server | Current Blueprint and every pinned version |
| Presented position/item identifier | Eligibility, option order and next-item selection |
| Selected option/response payload | Correctness, raw counts, theta, SE, point/conservative mastery and confidence label |
| Manual-submit confirmation | Start/deadline, remaining time and timeout outcome |

The request may identify an available Occupation for voluntary exploration. For a role-triggered baseline, the server derives the Occupation from the trusted selected active role; the client cannot substitute another Occupation. A role-required attempt uses that active role's deduplicated skill/item pool and configured role bound. An exploration attempt uses the deduplicated union of all active role pools and the configured exploration bound. Draft, inactive, archived or removed roles/questions never enter a new attempt. A target-selection revision/role snapshot is optional provenance, not the attempt identity.

### IRT 3PL behavior

For item discrimination `a`, difficulty `b`, guessing `c` and current ability `theta`:

```text
P(correct | theta) = c + (1 - c) / (1 + exp(-a * (theta - b)))
```

- Responses are evidence whose strength depends on `a/b/c`; they are not manually weighted points.
- The estimator updates theta and standard error (`SE`) for the assessed MicroSkill after each accepted response.
- The selector chooses an eligible unseen item with useful information while satisfying Blueprint bounds.
- The attempt may stop early at sufficient precision; maximum questions and server deadline remain hard stops.
- Difficulty labels are for authoring/cold-start explanation. The algorithm does not follow a fixed Easy → Medium → Hard ladder.
- Demo cold-start values may be Easy `(1,-1,.25)`, Medium `(1,0,.25)`, Hard `(1,1,.25)` for four-option items. They are system-owned seeded technical values, not L&D fields or calibrated truth.
- The initial MAP prior, minimum-evidence gate, `SE` stop target and conservative-mastery factor are system-owned/versioned technical configuration. They are initially supplied as backend code/config constants; assigning an operational UI owner is deferred.

### Ordered operations

#### Start or resume

1. Authorize the Employee and resolve either the selected role's Occupation or an explicitly chosen available Occupation.
2. Check the Employee + Occupation allowance. A prior completed baseline that emitted mastery closes it; an invalidated/no-mastery attempt does not.
3. Lock/check the unique active-attempt key for Employee + Occupation.
4. Return an existing `IN_PROGRESS` attempt for retries/resume.
5. Otherwise validate the current Blueprint's active-role/catalog fingerprint, applicable role or exploration pool, item capacity and parameter coverage. Current membership drift blocks a new start until L&D finalizes a refreshed version.
6. Create the attempt with purpose `ROLE_REQUIREMENT` or `OCCUPATION_EXPLORATION`, pin all versions, set server `startedAt/deadlineAt`, initialize skill states and persist the first presented item atomically.

#### Answer and select next

1. Lock/check ownership, attempt state/revision and server deadline.
2. Verify the submitted position is the pinned presented item.
3. Save one response and server-computed correctness idempotently.
4. Update the affected skill theta/SE/information.
5. Stop when required, or select/persist exactly one next unseen item and option order.
6. Store the command outcome and commit before responding.

#### Submit or auto-submit

1. Lock the same attempt; finalization is idempotent.
2. Use all responses whose transactions were accepted strictly before the authoritative server deadline. There is no grace period; a request observed at or after the deadline cannot mutate the attempt.
3. Derive raw score `correct / answered` for explanation only.
4. If minimum evidence is absent because of timeout or technical failure, mark the attempt `INVALIDATED`, store no skill mastery result/evidence and permit one linked replacement attempt.
5. Otherwise store immutable overall completion and per-skill theta, SE, point mastery, conservative mastery and confidence label, then emit mastery evidence once and reject further response mutation. Reaching the question bound with high `SE` still finalizes using conservative mastery; it does not fabricate confidence and does not unlock a retake.

The client timer is display-only. PostgreSQL owns deadlines; a worker may claim expired attempts in bounded batches. Redis is not the source of truth.

### Result semantics

- Canonical psychometric output is per MicroSkill `theta + SE`. The pinned mapping version defines point `estimatedMastery = logistic(theta)` and downstream conservative `mastery = logistic(theta - k × SE)` with positive `k`.
- There is no `INSUFFICIENT_EVIDENCE` result status. Below the minimum-evidence gate, the attempt is invalidated, no mastery is written and a linked replacement is allowed. Once minimum evidence exists, high `SE` produces a lower conservative mastery and a low-confidence label rather than a fixed `0.2/0.8` cap.
- There is no baseline mastery cap. Strong answers to discriminating items can yield high mastery.
- Guessing and uncertainty prevent a lucky raw score from being treated as equally reliable evidence.
- Baseline initializes mastery. The same responses are not applied again as independent BKT evidence.
- REQ-009 shows raw score, conservative per-skill mastery and a plain-language confidence label. It hides theta, SE, protected answers and rationales from the Employee.

### Resume, versioning and history

- Reload/reconnect returns the same responses, item/option order, provisional state and deadline.
- Presented items never change after question/Blueprint/parameter updates.
- New selection remains inside the attempt's pinned eligible versions; calibration never changes an active/past attempt.
- Replacing or disabling the current Blueprint affects only new starts. An `IN_PROGRESS` attempt continues/resumes with its pinned snapshot.
- Final results are immutable and retain original target/Occupation/Blueprint/model provenance.
- REQ-001 blocks target-role change while an assessment is `IN_PROGRESS`.

### Failure and concurrency branches

| Condition | Result and state guarantee |
| --- | --- |
| No valid current Blueprint/item/parameter coverage | Block start with structured reason; create/consume no attempt. |
| Current active-role membership differs from Blueprint snapshot | Block new start as Blueprint-stale; do not silently include/exclude roles or consume the allowance. |
| Cross-learner/organization attempt ID | Reject without data leakage. |
| Duplicate start/answer/submit | Replay stored outcome; create no duplicate state/evidence. |
| Stale/simultaneous answers | One valid transaction wins; sequence cannot fork. |
| Unpresented/replaced item | Reject and preserve attempt. |
| Request at/after deadline | Reject answer mutation with no grace; idempotent worker/request finalizes accepted responses or invalidates below the evidence gate. |
| Reload/network loss | Resume committed PostgreSQL state. |
| Manual submit before minimum evidence | Reject submission and continue the same attempt while time/questions remain. |
| Estimator/technical failure preventing mastery | Preserve audit data, invalidate with no mastery, and allow a replacement linked by `replacesAttemptId`. |
| Auto-submit retry | Finalize and emit evidence once. |
| Completed Employee + Occupation requests another baseline | Reject; role/Blueprint/catalog changes do not reopen the allowance. |

### Dependencies and implementation alignment

- REQ-001 selected-role provenance for `ROLE_REQUIREMENT`; authorized organization Occupation catalog for `OCCUPATION_EXPLORATION`; REQ-002-F02 current Blueprint; authorized question versions; versioned IRT model/parameters/mapping; REQ-041 mastery/BKT handoff; REQ-009 result/history.
- Target persistence is defined in [Adaptive Baseline Data Architecture](Adaptive%20Baseline%20Data%20Architecture.md).
- V17 has no adaptive attempt aggregate, IRT parameter/calibration records, provisional theta/SE or server-deadline worker. Historical fixed-assessment evidence under `documents/testing/` does not certify this contract.

### Acceptance-to-test mapping

| Acceptance | Planned Cluster 3 evidence |
| --- | --- |
| Start pins versions/deadline and retry returns same attempt | API/PostgreSQL integration test |
| Reload preserves item/option order, responses and timing | System test |
| Fixed response vectors reproduce theta/SE/mastery | Unit/vector tests |
| Selection does not repeat items and respects bounds | Unit/property/integration tests |
| Deadline auto-submits once | Worker/integration/concurrency test |
| Concurrent answers cannot fork sequence | Concurrency integration test |
| Below-minimum evidence invalidates without mastery and permits one linked replacement | Unit/API/integration test |
| High-SE evidence above the minimum finalizes through conservative mastery | Deterministic unit/vector and API result test |
| Tenant/learner isolation holds | Authorization/isolation tests |
| Baseline initializes mastery once without BKT double count | REQ-002/REQ-041 integration test |
| Configure → Test Blueprint → finalize → start → answer/reload → submit → result | Disposable-adapter system test |

### Decision status

- **Confirmed:** role choice is immediate; every Employee without a completed Occupation baseline must take it; one successful baseline per Employee + Occupation; role-required and active-role-union exploration sampling; invalidated/no-mastery replacement only; individual adaptive 3PL attempt; raw score for explanation; theta + SE with logistic point mapping and conservative lower-bound mastery; no mastery cap or fixed confidence cap; reload-safe persistence; pinned versions; no deadline grace; server auto-submit; pinned attempts survive Blueprint replacement/disable; Employee result disclosure; exactly-once mastery handoff; no BKT double count.
- **Provisional technical configuration:** estimator implementation, exact minimum-evidence/`SE`/`k` constants and cold-start values are system-owned/versioned and initially backend-configured, not L&D-editable.
- **Open:** none for this Function's Cluster 1 product contract. Exact technical constant values and library choice remain bounded implementation details that must preserve the pinned version and acceptance rules above.
- **Rejected:** shared published baseline, fixed difficulty ladder, client-computed scoring, raw score as mastery, mastery cap and unanswered prior as a real result.
