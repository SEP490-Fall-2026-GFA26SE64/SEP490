# Configure Baseline Assessment

**Function:** REQ-002-F02. **Actor:** L&D Manager.

## Goal and position

Manage one stable baseline Blueprint per authorized organization + Occupation. Every new Employee attempt assesses the entire Occupation through an individual adaptive sequence. There are no separate Role tests, Role question/time settings or exploration settings.

~~~text
trusted L&D + authorized Occupation
 -> read active-role catalog and deduplicated Occupation skills/items
 -> open/resume the sole Draft
 -> set name and one Occupation maximum-question/total-duration pair
 -> Save draft -> Preview assessment -> Activate version
 -> atomically replace current, or Deactivate directly
 -> new Employee attempts pin the Active version
~~~

Save never activates. Activate creates an immutable version and switches availability atomically; no Expert review or shared generated assessment/Publish step exists. Preview creates no Employee attempt. A shared Occupation configuration does not mean an identical fixed question sequence for everyone. Role selection, scoring, calibration, gap and pathway generation are dependencies, not owned by this Function.

### Actor, context, source and input ownership

- Server authentication supplies actor, organization and L&D permission. Every read/list/write/preview reauthorizes Occupation visibility.
- Catalog ports supply the authorized Occupation, all active Role/skill memberships and publication/version information. Deduplicate MicroSkill IDs and eligible item-version IDs across the whole Occupation. Draft/inactive/archived/removed Roles and ineligible questions never enter a new snapshot.
- PostgreSQL supplies eligible published item/parameter data, configuration, revisions, history and attempts. Neo4j supplies catalog relationships, never learner state.
- Client sends name, the single bounds pair, expected working/activation revisions, command key and deactivation reason. Server owns identity/version, scope policy, actor/tenant, pins, fingerprints, timestamps, status and attempt counts. Confirmed design DTO/list semantics are in [Lifecycle and transition design](Occupation%20Baseline%20Lifecycle%20and%20Transition.md).

### Configuration and form contract

| Field/rule | Meaning | Status |
| --- | --- | --- |
| Occupation | One stable Blueprint per organization+Occupation; at most one open Draft and one Active version | Confirmed |
| Name | Required nonblank display name with required marker; maximum 100 Unicode characters | Confirmed |
| Maximum questions | One required positive integer for the full Occupation, at most its authoritative deduplicated eligible capacity; maximum does not promise an exact question count | Confirmed |
| Minimum feasible maximum | Cover every union skill under the pinned minimum-evidence policy and stay within the pinned model response limit; reject infeasible coverage rather than omit skills | Confirmed design |
| Total time | One required whole-second duration between 30 * maxQuestions and 120 * maxQuestions; understandable time/minutes in UI, no blank-field default | Confirmed |
| Estimated time per question | Calculator aid, not an item timeout or separately persisted field; initial explicit suggestion 60 seconds, bidirectional total/rate calculation; persist only final total duration | Confirmed |
| Clear/re-enter | Retain a valid calculation basis where possible; if all time inputs are cleared, require explicit entry or reselecting the 60-second suggestion | Confirmed |
| Role/exploration bounds | Absent from new configuration; Role membership is read-only scope/provenance | Confirmed |
| IRT policy | Model/parameter/mapping pins, MAP prior, minimum evidence, SE stop target and conservative factor are system-owned/versioned, not L&D fields | Confirmed boundary; constants Provisional |

Current Java/API bounds are positive 32-bit integers and FE serializes whole seconds. These are technical ceilings, not sensible business duration/name limits. Confirmed design readiness exposes actual model/coverage/capacity bounds; never hardcode sample capacity or invent a time range. Name 100-character maximum, 30-120-second average budget and nearest-whole-second rounding are now confirmed by the user; preserve old snapshot values.

Save remains actionable when fields are missing: show field-specific errors and a summary, focus the first invalid field, and send no API request. Distinguish missing, non-integer, non-positive, over-capacity and out-of-range input. Disable for actual pending commands/authorization restrictions with an explanation. Unchanged Save sends no new command or revision. Ambiguous writes retain the exact key/body and block new writes until resolved; server no-op handling is Confirmed design separately.

### List, lifecycle and presentation

- Search saved names, sort by date and filter Draft/Active/Retiring/Inactive. Stable Blueprint identity, released version and working-revision counter are distinct. Row/date/paging semantics are Confirmed design.
- Save updates the same open Draft; only Activate creates a released version. Draft and Active may coexist. Replacement dialog identifies current and new name/version and explains effects on new starts.
- Active accepts new starts. Retiring accepts none but has pinned IN_PROGRESS attempts. Inactive accepts none and has none remaining. Multiple old versions may be Retiring; none is a second Active. Draft never supplies Employee starts.
- Direct Deactivate works without a replacement and preserves immutable versions, attempts, responses, deadlines and history. Separate it from primary actions; report impact, success and next step.
- Show understandable current-version/saved-draft/unsaved-change summaries; revisions/pins are optional diagnostics. English primary, Role in EN; Vị trí / Vị trí làm việc mong muốn in VI. Working revision is not a release number.

### Ordered reads and writes

1. **Read/list:** authorize scope, query only allowed records, return safe configuration/availability; write no Draft/pointer/receipt/attempt. Confirmed design historical list remains readable without Catalog.
2. **Save:** authorize; serialize stable organization/Occupation scope; check exact replay and expected working revision; normalize/validate the single configuration against authoritative feasibility; create/update sole Draft and receipt atomically. Confirmed design no-op semantics never overwrite newer edits.
3. **Preview:** read saved Draft/revision, resolve/compare Catalog and technical pins, validate whole-union feasibility and return safe sample/shortages. No version, receipt, activation, learner state or preview-history write. Confirmed design local preview binding is in the linked design.
4. **Activate:** authorize; lock activation scope; verify Draft ID/revision, activation revision and confirmed replacement target; revalidate full union/items/parameters/technical policy; allocate and insert immutable version/membership; close Draft, switch current and append transition/receipt in one transaction. Roll back everything on failure.
5. **Deactivate:** authorize; lock same scope; verify confirmed current version/revision, reason and replay identity; clear current and append event/receipt atomically. Do not mutate learners. This command does not require fresh Catalog/items.
6. **Concurrent starts:** follow [Data architecture](Adaptive%20Baseline%20Data%20Architecture.md). A start pins before or after the atomic switch; no new old-version attempt after Deactivate wins. Existing pinned attempts continue.

### Outputs, failure and recovery

| Condition | Outcome / invariant |
| --- | --- |
| Authorized empty list | Helpful empty state and permitted open-Draft action; no fabricated rows |
| Wrong actor/tenant/invisible scope | Deny without names/capacity/count/history leakage; no writes |
| Invalid fields/infeasible union | Field errors/structured shortages; no client-invalid API call or partial server write |
| Fingerprint/item drift | Refresh/readiness conflict; no silent pool trimming or pinned-attempt mutation |
| Draft/Active changed after dialog | Conflict; refresh and reconfirm the observed replacement pair |
| Same key/body | Replay after reauthorization; no duplicate revision/version/event |
| Same key/different body | Conflict; no mutation |
| Unchanged Save | Clear no-change feedback; no revision. Server receipt/no-op behavior Confirmed design |
| Preview/dependency failure | Retry without changing Draft; no synthesized capacity or answers |
| Unknown attempt count | Unavailable status, never false Inactive |
| Ambiguous response | Preserve exact pending command; recover/retry it without issuing a different write |
| Activate/Deactivate race/failure | No partial pointer/version/history; preserve all attempts/history |

Return only safe working/version/readiness and authorized aggregate lifecycle metadata. Exclude protected keys, correctness/rationales, Employee identities/results, theta/SE and foreign-scope data.

## Version identity and Draft discard

Manage reads the exact selected version or Draft. Edit/save of v1 45 questions/45 minutes to 100/110 updates only the sole Draft; v1 remains unchanged. Save does not allocate a release number. Create new/Edit with an existing Draft offers Continue or confirmed Delete Draft; Cancel unsaved editing sends no command. Discard is bound to expected Draft ID/revision and idempotency key, closes the Draft and releases its registry atomically while retaining immutable command/history. Stale URLs require reconciliation; no silent overwrite or second Draft.

Integer time inputs and approximate derived displays must preserve the exact submitted whole-second total. For example, 45 questions/50 minutes displays approximately 67 seconds/question but retains 3000 seconds.

## Compatibility, acceptance and alignment

Historical settings remain readable with their original format. Explicit legacy Draft conversion preserves old content/creation audit and creates a new Draft from explicitly confirmed common bounds, with a replayable CONVERT receipt; no aggregation or in-place reinterpretation. Resume/history retain original pins. Changes use forward-only migrations and compatible readers.

AB-C01–C20/AB-A08–A11 in the [adaptive plan](../../testing/REQ-002-adaptive-baseline-test-plan.md), and VB01–VB04/RB17 in the [Role-to-baseline plan](../../testing/REQ-001-002-role-baseline-flow-test-plan.md), map validation, no-write reads/Preview, replay/no-op, stale/race/rollback, exact record presentation and historical preservation. [Implementation/evidence](../../testing/system/REQ-001-002-final-synchronization-review.md) is separate from this contract.

Confirmed | Provisional: exact model numerical constants | Open: external owner contracts and numerical validation | Rejected: historical rewrite, per-Role bounds, persisted preview or silent Draft overwrite.
