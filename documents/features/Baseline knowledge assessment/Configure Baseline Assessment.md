# Configure Baseline Assessment

**Current23 October2026:** full-Occupation slices1-5 and V20-V23 are implemented locally; read-only live V1-V23 checksums match. [Local demo exception](Local%20Demo%20Flow.md) bypasses owner readiness only under explicit profile/property/!prod; production dependencies remain open. [Current schema/review](../../testing/system/REQ-002-memory-schema-sync.md); [actual operations/limits](../../testing/system/REQ-002-local-demo.md). Browser/executable/numerical acceptance remains open; no history reset/repin.

## Current contract — 2026-10-22

**Function:** REQ-002-F02. **Actor:** L&D Manager. **Status:** Cluster 1 approved; Cluster 2 in progress. Confirmed rules supersede the 2026-10-20 role/exploration contract; Detailed design choices are now approved. Current common configuration/form/lifecycle is implemented; legacy readers remain for historical compatibility.

### Goal and position

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

- Server authentication supplies actor, organization and L&D permission. Every read/list/write/preview reauthorizes Occupation visibility. Local/demo configured actors remain explicitly gated, not production authentication.
- Catalog ports supply the authorized Occupation, all active Role/skill memberships and publication/version information. Deduplicate MicroSkill IDs and eligible item-version IDs across the whole Occupation. Draft/inactive/archived/removed Roles and ineligible questions never enter a new snapshot.
- PostgreSQL supplies eligible published item/parameter data, configuration, revisions, history and attempts. Neo4j supplies catalog relationships, never learner state.
- Client sends name, the single bounds pair, expected working/activation revisions, command key and deactivation reason. Server owns identity/version, scope policy, actor/tenant, pins, fingerprints, timestamps, status and attempt counts. Approved design DTO/list semantics are in [Lifecycle and transition design](Occupation%20Baseline%20Lifecycle%20and%20Transition.md).

### Configuration and form contract

| Field/rule | Meaning | Status |
| --- | --- | --- |
| Occupation | One stable Blueprint per organization+Occupation; at most one open Draft and one Active version | Confirmed |
| Name | Required nonblank display name with required marker; maximum 100 Unicode characters | Confirmed |
| Maximum questions | One required positive integer for the full Occupation, at most its authoritative deduplicated eligible capacity; maximum does not promise an exact question count | Confirmed |
| Minimum feasible maximum | Cover every union skill under the pinned minimum-evidence policy and stay within the pinned model response limit; reject infeasible coverage rather than omit skills | Grounded design constraint; validation placement Approved design |
| Total time | One required whole-second duration between 30 * maxQuestions and 120 * maxQuestions; understandable time/minutes in UI, no blank-field default | Confirmed |
| Estimated time per question | Calculator aid, not an item timeout or separately persisted field; initial explicit suggestion 60 seconds, bidirectional total/rate calculation; persist only final total duration | Confirmed |
| Clear/re-enter | Retain a valid calculation basis where possible; if all time inputs are cleared, require explicit entry or reselecting the 60-second suggestion | Confirmed |
| Role/exploration bounds | Absent from new configuration; Role membership is read-only scope/provenance | Confirmed |
| IRT policy | Model/parameter/mapping pins, MAP prior, minimum evidence, SE stop target and conservative factor are system-owned/versioned, not L&D fields | Confirmed boundary; constants Provisional |

Current Java/API bounds are positive 32-bit integers and FE serializes whole seconds. These are technical ceilings, not sensible business duration/name limits. Approved design readiness exposes actual model/coverage/capacity bounds; never hardcode sample capacity or invent a time range. Name 100-character maximum, 30-120-second average budget and nearest-whole-second rounding are now confirmed by the user; preserve old snapshot values.

Save remains actionable when fields are missing: show field-specific errors and a summary, focus the first invalid field, and send no API request. Distinguish missing, non-integer, non-positive, over-capacity and out-of-range input. Disable for actual pending commands/authorization restrictions with an explanation. Unchanged Save sends no new command or revision. Ambiguous writes retain the exact key/body and block new writes until resolved; server no-op handling is Approved design separately.

### List, lifecycle and presentation

- Search saved names, sort by date and filter Draft/Active/Retiring/Inactive. Stable Blueprint identity, released version and working-revision counter are distinct. Row/date/paging semantics are Approved design.
- Save updates the same open Draft; only Activate creates a released version. Draft and Active may coexist. Replacement dialog identifies current and new name/version and explains effects on new starts.
- Active accepts new starts. Retiring accepts none but has pinned IN_PROGRESS attempts. Inactive accepts none and has none remaining. Multiple old versions may be Retiring; none is a second Active. Draft never supplies Employee starts.
- Direct Deactivate works without a replacement and preserves immutable versions, attempts, responses, deadlines and history. Separate it from primary actions; report impact, success and next step.
- Show understandable current-version/saved-draft/unsaved-change summaries; revisions/pins are optional diagnostics. English primary, Role in EN; Vị trí / Vị trí làm việc mong muốn in VI. Working revision is not a release number.
- Reuse merged main 6a3bb3d and existing PageHeader/Heading/Text/Card/StatCard/Button/Badge/Input/Dialog/table patterns, IBM Plex Sans, tokens, responsive density and EN/VI conventions. AGENTS/live tokens use H1=28; DESIGN_SYSTEM's26px is a recorded conflict. No third typography scale, new UI library or duplicate primitive.

### Ordered reads and writes

1. **Read/list:** authorize scope, query only allowed records, return safe configuration/availability; write no Draft/pointer/receipt/attempt. Approved design historical list remains readable without Catalog.
2. **Save:** authorize; serialize stable organization/Occupation scope; check exact replay and expected working revision; normalize/validate the single configuration against authoritative feasibility; create/update sole Draft and receipt atomically. Approved design no-op semantics never overwrite newer edits.
3. **Preview:** read saved Draft/revision, resolve/compare Catalog and technical pins, validate whole-union feasibility and return safe sample/shortages. No version, receipt, activation, learner state or preview-history write. Approved design local preview binding is in the linked design.
4. **Activate:** authorize; lock activation scope; verify Draft ID/revision, activation revision and confirmed replacement target; revalidate full union/items/parameters/technical policy; allocate and insert immutable version/membership; close Draft, switch current and append transition/receipt in one transaction. Roll back everything on failure.
5. **Deactivate:** authorize; lock same scope; verify confirmed current version/revision, reason and replay identity; clear current and append event/receipt atomically. Do not mutate learners. Removing the current implementation's fresh-Catalog dependency for this command is Approved design.
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
| Unchanged Save | Clear no-change feedback; no revision. Server receipt/no-op behavior Approved design |
| Preview/dependency failure | Retry without changing Draft; no synthesized capacity or answers |
| Unknown attempt count | Unavailable status, never false Inactive |
| Ambiguous response | Preserve exact pending command; recover/retry it without issuing a different write |
| Activate/Deactivate race/failure | No partial pointer/version/history; preserve all attempts/history |

Return only safe working/version/readiness and authorized aggregate lifecycle metadata. Exclude protected keys, correctness/rationales, Employee identities/results, theta/SE and foreign-scope data.

### Current implementation and compatibility

**2026-10-22, remaining slice 1 of 5:** gated BE Save accepts `configuration={name,occupationBounds:{maxQuestions,timeLimitSeconds}}`; validates the deduplicated whole union against exact pinned minimum-per-skill, model response limit, item and parameter coverage. Shared skill snapshots must agree; scope is never reduced to make a budget feasible. Workspace exposes safe Occupation capacity/minimum/model bounds. Saved-revision Preview requires working ID and expected revision, returns answer-safe samples and writes nothing.

`POST /working/convert` requires legacy working ID/revision, command key and explicitly supplied new configuration. It archives the old row as ABANDONED (configuration/creation audit unchanged), creates a new working ID at revision 1 under the same Blueprint and appends a CONVERT receipt atomically. The receipt retains both original and resulting snapshots. Stale/wrong-format conversion conflicts; validation/dependency/write failure rolls back every change. Normal Save cannot convert a legacy row in place. Legacy Save is decode/replay-only; old canonical hashes/outcome readers remain supported, and reuse with a different command conflicts.

All routes retain the existing organization/actor checks and local/demo/non-prod gates. V22 extends receipt operations; V1-V21 are untouched in this slice. At the slice-1 checkpoint fresh Activate failed closed; slices 2–3 now remove that temporary guard only with the coherent full-Occupation resolver and confirmed current-version protocol. Exact historical receipts still replay before new-write checks. Save/conversion/Preview leave existing Active, versions, attempts, results and allowance unchanged. Slice 3 now authorizes Deactivate using persisted actor plus server scope grants without consulting Catalog/items.

The common form/calculator, saved Preview, no-op/exact retry, lifecycle confirmations, directory and full/legacy result/history presentation are implemented in slices4-5. Browser acceptance remains unverified. Preserve old JSON/purpose/bounds snapshots and generic/module history; do not deploy an old role-only binary after new rows exist. Build/manual observations and their limits are in [system evidence](../../testing/system/REQ-002-F02-baseline-authoring.md); no executable acceptance is claimed.

### Acceptance and decisions

Use AB-C01–C20 and AB-A08–A11 in the [canonical test plan](../../testing/REQ-002-adaptive-baseline-test-plan.md). Reads cover actor/tenant/query/empty/not-found/dependency/no-state-change; writes cover replay/stale/concurrency/rollback and pinned history. This is planned Cluster 3 evidence, not a recreated temporary checklist.

**Confirmed:** one Occupation baseline/pair; sole Draft/Active; name/date/status capabilities; replacement confirmation/direct Deactivate/lifecycle semantics; form/copy/calculator/no-op/pending behavior and immutable/security boundaries. **Confirmed design:** exact API/list/status/preview/lock/migration/server-no-op design. **Provisional:** local/demo Identity/Catalog and IRT constants. **Open:** external production contracts and numerical validation. **Rejected:** new Role/exploration configuration, historical rewrites, shared generated baseline or persisted preview.

## Slices 2–3 implementation boundary — 2026-10-22

The canonical [API and lock contract](Occupation%20Baseline%20Lifecycle%20and%20Transition.md#slices-23-implemented-api-and-transaction-contract--2026-10-22) now specifies list query/row identities, independent readiness, current confirmation, Draft-ID CAS/no-op receipts, historical hash replay and shared/exclusive admission locks. Existing V20–V22 columns/constraints suffice; no schema/backfill change accompanies these slices. Full attempts explicitly store scope_policy and exact common bounds; NULL historical scope/pins/bounds remain original. Positive Save revisions must bind the returned Draft ID to prevent an earlier Draft's revision1 from overwriting a later Draft's revision1. Frontend integration and scope-aware result/history readers are implemented in slices 4–5; browser review remains unverified.
