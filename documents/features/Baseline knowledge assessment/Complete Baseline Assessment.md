# Complete Baseline Assessment

**Function:** REQ-002-F01. **Actor:** Employee.

## Goal and position

Estimate initial mastery for MicroSkills covered by the applicable Occupation Blueprint. The same baseline must distinguish limited evidence from reliable evidence for Intern, Junior and Senior Employees; a strong result is not capped merely because it came from a baseline.

**One baseline per Occupation:** every new attempt assesses the deduplicated union of all active-role skills/items using one Occupation question maximum and total duration. Selected Role A or Role B changes entry/provenance, never the pool, bounds, allowance or a separate assessment section. “Full baseline” means the entire Occupation skill scope with the pinned minimum-evidence coverage; it does not mean answering every item in the bank or an identical fixed sequence for all Employees. Adaptive early stopping remains valid only after all required skill evidence conditions are satisfied.

```text
trusted Employee selects Role
 -> resolve Occupation and authoritative profile coverage
 -> resume pinned attempt, or require baseline if incomplete
 -> pin full Occupation scope, versions, content and deadline
 -> accept responses and select next items idempotently
 -> finalize result/evidence and initialize mastery profile
 -> read result/history/My Mastery
```

Role selection is not blocked by baseline. Existing initialized profiles retain their original skill set/version; complete coverage counts low/zero valid mastery and does not certify target proficiency. No independent Occupation-exploration entry exists. Missing configuration is distinct from dependency failure. A completed result without an authoritative profile is pending/review-needed, never automatic repeat or fabricated coverage.

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

Server derives Occupation from the trusted selected Role; client cannot substitute scope or supply pool/budget/pins. Draft/inactive/removed Roles and ineligible questions are excluded from new snapshots. Role/selection revision is provenance, never a separate pool or allowance. Role-specific proficiency thresholds belong to later gap processing.

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

Exact estimation/stopping/minimum-evidence policy and confidence mapping are system-owned and versioned. Numerical validation is a separate acceptance dependency; UI success or difficulty labels never establish calibration validity.

### Ordered operations

#### Start or resume

1. Authorize the Employee and derive Occupation from the committed selected Role and check authoritative profile coverage.
2. Check the Employee + Occupation allowance. A prior completed baseline that emitted mastery closes it; an invalidated/no-mastery attempt does not.
3. Lock/check the unique active-attempt key for Employee + Occupation.
4. Return an existing `IN_PROGRESS` attempt for retries/resume.
5. Otherwise validate current availability, explicit full-Occupation format, active-role/catalog fingerprint, full union skill/item capacity, exact parameter coverage and feasibility under the pinned model. Never omit a skill to fit a small maximum. Current membership drift blocks new starts until L&D activates a refreshed version. A legacy-format current requires the confirmed explicit configuration transition; it is never silently interpreted as the new scope.
6. Under the implemented shared activation-scope lock, recheck current/version/readiness and create the attempt. Use selected-Role provenance for new entry; preserve original provenance for historical readers; pin full-Occupation scope policy, common bounds, complete deduplicated pool, skill snapshots and all versions. Set server `startedAt/deadlineAt`; initialize every union skill and persist the first item/receipt atomically. Exact lock/schema design is approved in the linked transition document.

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
4. If minimum evidence is absent because of manual submission, timeout or technical failure, mark the attempt `INVALIDATED`, store no skill mastery result/evidence and permit one linked replacement attempt.
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
- Legacy role-scoped/exploration attempts continue with their original pool, bounds, purpose, deadline and numerical pins, even after configuration replacement or cutover. A previously completed Role A result still consumes the same Employee+Occupation allowance; never relabel it full-Occupation, rescore it, add fabricated skill evidence or reset it to satisfy the new definition.
- New-format attempts/results retain an explicit server-owned scope discriminator and full union; REQ-009 reads the recorded scope rather than deriving it from the Employee's current Role or today's Blueprint. A linked replacement reauthorizes ownership and retains the invalidated chain's original version, pool and snapshot; it does not adopt a newer Active version or mutate its predecessor.

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
| Manual submit before minimum evidence | Finalize INVALIDATED/MANUAL without mastery/profile and retain linked replacement eligibility. |
| Estimator/technical failure preventing mastery | Preserve audit data, invalidate with no mastery, and allow a replacement linked by `replacesAttemptId`. |
| Auto-submit retry | Finalize and emit evidence once. |
| Completed Employee + Occupation requests another baseline | Reject; role/Blueprint/catalog changes do not reopen the allowance. |
| Legacy-format current version after revised admission cutover | Actionable configuration-update requirement; no new attempt, allowance consumption or silent role/exploration fallback. |
| Union skill has insufficient eligible/parameterized items or maximum cannot cover minimum evidence | Reject activation/start with structured readiness failure; do not narrow scope or create partial state. |
| Activate/Deactivate races new start | Serialize admission against current switch; pin the version that wins the agreed transaction ordering, or reject unavailable/stale configuration. Existing pinned attempts remain valid. |

### Dependencies and implementation alignment

REQ-001 selection/identity; authorized catalog publication/release; REQ-002-F02 configuration; reviewed published question versions; exact approved model/mapping/parameter pins; profile/evidence processing and REQ-041 delivery; REQ-009 result/history. [Data architecture](Adaptive%20Baseline%20Data%20Architecture.md) defines persistence boundaries. [Current alignment/evidence](../../testing/system/REQ-001-002-final-synchronization-review.md) is reported separately. Profile initialization uses genuine valid outcomes with no score threshold; below-minimum attempts write no mastery/profile. Baseline responses are never double-applied as learning BKT transitions.

### Acceptance-to-test mapping

| Acceptance | Planned executable evidence |
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
| Save draft → Preview assessment → Activate → full-Occupation start → answer/reload → submit → result | Disposable-adapter system test |
| Different selected Roles in the same Occupation use the same full scope/pair with skill/item deduplication | AB-A02 selector/API/integration/system plan |
| Legacy attempts/history/allowance survive forward transition; new starts require explicit full-Occupation config | AB-A09–A11 and AB-R02–R03 compatibility plan |

### Decision status

- **Confirmed:** immediate Role choice; selected-Role entry with one whole-Occupation baseline/pair; required skill coverage with no role sections; one mastery-producing completion per Employee+Occupation; invalidated/no-mastery linked replacement; unchanged history/pins/allowance; individual adaptive 3PL, raw explanatory score and conservative mastery; no confidence/mastery cap; PostgreSQL authority/reload/deadline/idempotency/security/evidence boundaries above.
- **Provisional technical configuration:** estimator implementation, exact minimum-evidence/`SE`/`k` constants are system-owned/versioned, not L&D-editable.
- **Confirmed design:** dual-format schema/readers, legacy-configuration admission gate, explicit conversion and transaction protocol in the linked design.
- **Open:** authoritative external production contracts and numerical/executable/browser validation. Numerical calibration remains outside this alignment.
- **Rejected:** per-Role or exploration-specific sampling/bounds for new attempts, history relabel/rescore/reset, shared fixed published baseline, fixed difficulty ladder, client scoring, raw score as mastery or unanswered prior as a result.

Confirmed | Provisional | Open | Rejected.
