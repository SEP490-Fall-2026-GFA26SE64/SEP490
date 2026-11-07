# Configure Baseline Assessment

**Current flow revision: 2026-11-05-r3.** [Target schema/API/flow](../Organization%20Rule%20Assessment%20and%20Pathway.md) supersedes this document's older active assessment/mastery/gap/optimizer assumptions. Material below is retained previous design/source/operation history, not proof of r3 being applied. Keep non-conflicting security/content/retry safeguards. Baseline covers selected Role–Level, records only assessed diagnostics and does not pre-add prerequisites; two separate policy configs share an engine; skill assessment discovers supplementation; cross-target old bypass work is parallel/non-gating. Old affected dev records may be rebuilt; new-flow history and unrelated/shared evidence/backups remain. Do not automatically run retained setup/reset/test commands below.

**Function:** REQ-002-F02. **Actor:** L&D Manager.

**2026-11-01 C1/C2 status:** [organization Assessment Policy](#organization-assessment-policy--planned) extends this Function with confirmed L&D ownership/tab placement. Domain/use-case/store/controller and EN/VI tab source now compile/build; forward SQL exists but is **not applied**. API/browser/concurrency acceptance is Not run. The contract below remains the rollout target; older system-owned SE/k wording is superseded only here, without production-readiness claims.

## Goal and position

Manage one stable baseline Blueprint per authorized organization + Job Position. Every new Employee attempt assesses the entire Job Position through an individual adaptive sequence. There are no separate Role tests, Role question/time settings or exploration settings.

~~~text
trusted L&D + authorized Job Position
 -> read active-role catalog and deduplicated Job Position skills/items
 -> open/resume the sole Draft
 -> set name and one Job Position maximum-question/total-duration pair
 -> Save draft -> Preview assessment -> Activate version
 -> atomically replace current, or Deactivate directly
 -> new Employee attempts pin the Active version
~~~

Save never activates. Activate creates an immutable version and switches availability atomically; no Expert review or shared generated assessment/Publish step exists. Preview creates no Employee attempt. A shared Job Position configuration does not mean an identical fixed question sequence for everyone. Role selection, scoring, calibration, gap and pathway generation are dependencies, not owned by this Function.

### Actor, context, source and input ownership

- Server authentication supplies actor, organization and L&D permission. Every read/list/write/preview reauthorizes Job Position visibility.
- Catalog ports supply the authorized Job Position, all active Role/skill memberships and publication/version information. Deduplicate MicroSkill IDs and eligible item-version IDs across the whole Job Position. Draft/inactive/archived/removed Roles and ineligible questions never enter a new snapshot.
- PostgreSQL supplies eligible published item/parameter data, configuration, revisions, history and attempts. Neo4j supplies catalog relationships, never learner state.
- Client sends name, the single bounds pair, expected working/activation revisions, command key and deactivation reason. Server owns identity/version, scope policy, actor/tenant, pins, fingerprints, timestamps, status and attempt counts. Confirmed design DTO/list semantics are in [Lifecycle and transition design](Job Position%20Baseline%20Lifecycle%20and%20Transition.md).

Resolve the bank/model/mapping tuple from the exact trusted organization+graph Job Position ID for new feasibility, Preview and activation. Validate bank ownership and technical eligibility; neither a non-null resource ID nor a browser-selected organization establishes readiness. Missing resources return an explicit unavailable reason without borrowing another tenant's tuple, creating resources or narrowing full-Job Position coverage. Historical reads and Deactivate retain their existing independence from fresh catalog readiness. [Organization integration contract](../Workspace%20Adaptive%20Integration.md#organization-scoped-source-and-operation-contract).

### Configuration and form contract

| Field/rule | Meaning | Status |
| --- | --- | --- |
| Job Position | One stable Blueprint per organization+Job Position; at most one open Draft and one Active version | Confirmed |
| Name | Required nonblank display name with required marker; maximum 100 Unicode characters | Confirmed |
| Maximum questions | One required positive integer for the full Job Position, at most its authoritative deduplicated eligible capacity; maximum does not promise an exact question count | Confirmed |
| Minimum feasible maximum | Cover every union skill under the pinned minimum-evidence policy and stay within the pinned model response limit; reject infeasible coverage rather than omit skills | Confirmed design |
| Total time | One required whole-second duration between 30 * maxQuestions and 120 * maxQuestions; understandable time/minutes in UI, no blank-field default | Confirmed |
| Estimated time per question | Calculator aid, not an item timeout or separately persisted field; initial explicit suggestion 60 seconds, bidirectional total/rate calculation; persist only final total duration | Confirmed |
| Clear/re-enter | Retain a valid calculation basis where possible; if all time inputs are cleared, require explicit entry or reselecting the 60-second suggestion | Confirmed |
| Role/exploration bounds | Absent from new configuration; Role membership is read-only scope/provenance | Confirmed |
| Technical IRT configuration | Algorithm/model/parameter pins, MAP prior and minimum evidence stay system-managed; no L&D a/b/c or calibration controls | Confirmed boundary |
| Organization assessment policy | L&D manages stop SE, confidence SE cutoffs and k in Assessment Policy; new attempts pin its effective immutable version | Confirmed target; Planned design below |

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
2. **Save:** authorize; serialize stable organization/Job Position scope; check exact replay and expected working revision; normalize/validate the single configuration against authoritative feasibility; create/update sole Draft and receipt atomically. Confirmed design no-op semantics never overwrite newer edits.
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

## Planned catalog source alignment — revision19

L&D discovery, Save, Preview and Activate must read the same [normalized catalog contract](../Workspace%20Adaptive%20Integration.md#authored-catalog-consumer-alignment--revision19) used by Employee selection and exact-Level gap. Authored mode requires explicit own Role→Job Position binding and member Levels/requirements; neither a name/family match nor a non-null resource tuple supplies these facts. Display authoritative source readiness separately from a saved policy/Blueprint; missing binding/publication/resources never causes automatic provisioning or activation.

The existing full-Job Position union remains mandatory across every admitted Role/explicit Level. Shared Skill IDs require coherent source identity/version; incomplete/malformed membership is unavailable rather than a smaller successful bank coverage set. Save/Preview/Activate revalidate complete fingerprint/binding revision and genuine publication with existing CAS/replay rules. Revision18 org policy and technical pins are unchanged; old active versions/attempts use original snapshots. Source and binding changes require refresh/new explicit configuration, not silent rescore/repin. No owner Catalog Management/Expert UI, new mapping editor or SQL is implemented by this C1. [CA19-06–08](../../testing/REQ-002-adaptive-baseline-test-plan.md#authored-catalog-alignment--revision19) is planned verification only.

## Version identity and Draft discard

Manage reads the exact selected version or Draft. Edit/save of v1 45 questions/45 minutes to 100/110 updates only the sole Draft; v1 remains unchanged. Save does not allocate a release number. Create new/Edit with an existing Draft offers Continue or confirmed Delete Draft; Cancel unsaved editing sends no command. Discard is bound to expected Draft ID/revision and idempotency key, closes the Draft and releases its registry atomically while retaining immutable command/history. Stale URLs require reconciliation; no silent overwrite or second Draft.

Integer time inputs and approximate derived displays must preserve the exact submitted whole-second total. For example, 45 questions/50 minutes displays approximately 67 seconds/question but retains 3000 seconds.

## Compatibility, acceptance and alignment

Historical settings remain readable with their original format. Explicit legacy Draft conversion preserves old content/creation audit and creates a new Draft from explicitly confirmed common bounds, with a replayable CONVERT receipt; no aggregation or in-place reinterpretation. Resume/history retain original pins. Changes use forward-only migrations and compatible readers.

AB-C01–C20/AB-A08–A11 in the [adaptive plan](../../testing/REQ-002-adaptive-baseline-test-plan.md), and VB01–VB04/RB17 in the [Role-to-baseline plan](../../testing/REQ-001-002-role-baseline-flow-test-plan.md), map validation, no-write reads/Preview, replay/no-op, stale/race/rollback, exact record presentation and historical preservation. [Implementation/evidence](../../testing/system/REQ-001-002-final-synchronization-review.md) is separate from this contract.

Confirmed | Provisional: existing model numerical constants | Open: external owner contracts and numerical validation | Rejected: historical rewrite, per-Role bounds, persisted preview or silent Draft overwrite.

## Organization Assessment Policy — planned

Trusted L&D session/organization/membership/entitlement → validate four values → save an immutable PostgreSQL version → explicitly activate for future new attempts → return own version/activation feedback. One policy applies across the org's Job Positions; Blueprint question/time bounds remain per Job Position. No new Function ID or owner Role/Skill/publication/assignment CRUD.

| Client field | Planned validation and behavior |
| --- | --- |
| stopSe | Finite >0; precision target after existing minimum coverage, subject to existing maximum questions/responses/deadline. |
| highConfidenceSe | Finite >0; HIGH when SE<=high. |
| mediumConfidenceSe | Finite >high; MEDIUM when high<SE<=medium, otherwise LOW. |
| k | Finite0<k<=10, preserving existing supported mapping range; conservative mastery=sigmoid(theta-k*SE). No change to theta/SE/confidence; k0 excluded. |

No extra order between stopSe and confidence cutoffs is invented. UI suggestions .5/.35/.7/1 match existing factories but never constitute active settings, fallback or an overwrite of non-default stored JSON. Prior mean0/SD1 and technical/item/calibration controls remain system-managed; c remains0.25.

Proposed base `/api/v1/ld/adaptive-baseline-policy`; trusted session, CSRF mutations, no-store, bounded strict JSON (4KiB write body; duplicate/unknown/trailing/coerced/nonfinite/null values rejected):

| Operation | Client input | Safe output / transaction |
| --- | --- | --- |
| GET base | None | Own active version or null and activationRevision (0 before first write); no provisioning. |
| GET /versions?page=&size= | page>=0; size default20/max100 | Own immutable versions, server version descending, consistent bounded count/page; no foreign existence. |
| POST /versions | commandKey UUID + four values | Save immutable own version and receipt/audit atomically;201 new/200 content no-op. Save never activates. |
| POST /activation | commandKey UUID, policyVersionId, expectedActivationRevision>=0 | Own version only; exclusive scope lock/CAS, pointer+receipt/audit atomic;200. Current-version activation is a recorded no-op, no revision bump. |

Server owns actor/org/IDs/version/hash/timestamps/revision. Multiple inactive versions allowed; no mutable policy Draft, deactivate or delete endpoint. Save identical canonical own values reuses the version with a receipt. Same actor/org/key/body replays its original response after fresh authorization; different operation/body conflicts. Unknown outcomes retain key/body for reconciliation; replay cannot reapply an old activation. Errors:400 validation;401 unauthenticated;403 wrong-role/membership/entitlement;404 absent/foreign version via scoped query;409 stale revision/key conflict;503 dependency unavailable. Empty policy differs from unavailable storage. No partial command or learner state.

UI reuses active `/ld-manager/baseline-assessments` root (Baseline Config redirects here): Assessment Policy / Chính sách đánh giá tab alongside Blueprint management, independent of Job Position/bank/Blueprint readiness. Reuse established tokens/font/typography/Tabs/Input/Button/Card/Dialog and EN/VI. Show saved versus active version, explicit Activate confirmation, loading/empty/error/pending/stale/retry/reload. Save validates/focuses errors without invalid requests; identity changes clear prior-scope forms/pending commands. Explain precision/confidence/conservatism without technical IDs or item parameter editors. Platform Admin UI excluded.

### Confirmed activation prerequisite —2026-11-01

New Blueprint Activate/FINALIZE requires an active Assessment Policy belonging to the trusted L&D organization. Authorize actor/Job Position and replay an existing exact receipt first; only a new command checks the effective policy inside the Blueprint transaction, before allocating/inserting versions, closing Draft, changing activation or writing events/receipts. Use the existing organization policy coordination lock/current activation. Blueprint does not pin a policy: each new learner attempt still pins the then-effective policy. A saved inactive policy does not satisfy the gate. Verified absence returns422 `ASSESSMENT_POLICY_REQUIRED` with no write; storage/integrity outages remain503. Deactivate, historical reads/replay and existing attempts retain their prior behavior. No policy is implicitly seeded or activated.

Baseline Config exposes addressable `?tab=policy`. On Activate, FE checks current own policy; absent policy directs L&D there with only known Job Position/Draft/version return fields. Backend repeats the gate. Policy Save and Activate remain explicit; once an active policy is confirmed, a return action opens the same baseline/Draft for refreshed Preview and explicit Activate confirmation/CAS. Never auto-activate on return. Missing-policy notices also cover previously active baselines; retain existing activation/history and tell L&D to configure policy. Unknown mutation outcomes must be reconciled before navigation. Do not accept an arbitrary external return URL, client organization, automatic default policy or unsaved Draft loss. Apply EN/VI feedback and preserve the existing shared components. C2 source/build proof is separate from planned executable acceptance.

[Data design](Adaptive%20Baseline%20Data%20Architecture.md#planned-organization-policy-storage-and-admission) owns exact schema/first-write locks/pins/legacy rollout; [AP01–AP09](../../testing/REQ-002-adaptive-baseline-test-plan.md#organization-policy-and-calibration-amendment--2026-11-01) owns planned verification. **Confirmed:** L&D tab/four-value tenant target. **Proposed:** API/validation/storage/activation above, pending C2. **Provisional:** existing technical defaults. **Open:** production readiness/executable verification. **Rejected:** client org/actor, implicit activation/default policy, global JSON mutation, historical reset/rescore/repin.
