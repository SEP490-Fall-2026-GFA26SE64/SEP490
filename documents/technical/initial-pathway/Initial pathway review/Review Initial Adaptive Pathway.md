# Review Initial Adaptive Pathway

## Confirmed responsive workspaces — 2026-10-28

User approved responsive status sizing and linked workspace heights. Awaiting-review badges keep one line with natural width/consistent padding; wide queue tables scroll within their own region on narrow screens. Desktop Included/Excluded share header and body grid tracks: top and bottom edges align and the longer list sets both body heights, including empty destinations. The full stretched body is the existing guarded drop surface, so lower modules can move horizontally into the opposite workspace without scrolling to its top. Remove the redundant excluded subheading that offset its body. Shared page scrolling moves both panels together; no independent list scrollers or saved-order change.

Narrow screens stack the panels with content-driven height and existing Include/Exclude buttons. Review controls, module rows, long names/codes, filters, pagination, metadata, footer and metrics must fit their available width; use existing tokens/primitives. Retain exact hash/key/membership/approval guards and real reads; no DTO/backend/history change. Manual mapping extends R01/R03/R14/E09 with asymmetric/empty/reversed lists, expanded content, valid lower-edge drops, desktop/tablet/mobile and EN/VI. Browser acceptance remains pending until actually observed; C3 Not run. Confirmed.

## Confirmed screenshot layout restoration — 2026-10-28

User explicitly requires the original queue and detail composition from the supplied screenshots. Restore the existing queue file's four StatCards, titled queue Card with inline search/status controls, seven-column table and paging. Restore the existing detail file's four-column learner/context strip, Catalog dock with full-width rows and inline controls, then parallel Included/Excluded lists with counts/duration, step badges and excluded strike-through. No standalone page-title header; shared workspace navigation remains. Fold the added ReviewModuleBoard helper into the existing detail file so the original feature remains the single UI path.

Retain real read/include/exclude/validation/exact-confirm APIs and hash/key/authorization locks. The queue API is paged and has no total, Occupation or generation timestamp: counts explicitly describe the loaded page; fetch existing authorized detail reads for persisted module counts/duration; show Role Level/review revision instead of inventing absent fields. Domain-filter position uses actual teaching focus. Unsupported reorder/delete/preemptive Catalog exclusion controls retain original positions but are disabled with explanations. Original mock regeneration, fake learning unlocks and localStorage are not restored. Acceptance is planned visual comparison for queue/catalog/parallel-list structure, EN/VI, responsive layout and existing command boundaries; C3 remains Not run. Confirmed.

## Confirmed Expert UX restoration — 2026-10-28

User approved the source-main comparison and C2 restoration: Catalog above side-by-side Included/Excluded, cross-list drag/drop mapped to existing include/exclude, equivalent keyboard/mobile buttons, search and real teaching/difficulty filters. Existing shared tokens/typography and API states remain. This does not approve manual sequence changes, preemptive Catalog→Excluded bans, deleting override history or Regenerate. Server still owns feasibility/order and exact approval.

Assignment authorization precedes learner context reads. Additive Summary fields expose only the assigned learner ID and same-tenant account identifier (nullable if unavailable), never credentials/contact data/answers. Included order and distinct costs remain server projections. Excluded is derived from the latest persisted INCLUDE/EXCLUDE override for each Module, excluding currently selected IDs; retain optional reason. FE must parse existing revision.overrides rather than use localStorage. An excluded item absent from the current eligible candidate inventory stays visible as unavailable and cannot be restored without eligibility.

Drop intent comes only from a Module rendered in the current authorized response. Reject external/unknown payloads, same-list reorder and stale drag hash; lock dragging/buttons during pending commands and after approval/archive. A supported drop submits exactly one existing command with key/expected revision/hash/reason, reconciles GET and displays server order/diagnostics; never optimistically manufacture a saved revision. Unknown outcomes retain the same retry key/body. Stale/failure leaves no claimed successful move. No response learner field is accepted as command authority.

Acceptance/manual mapping: R01/R03–R14 and E09; plan cross-list include/exclude/restore, unavailable excluded item, external/same-list/stale drop rejection, busy/approved locks, exact retry, retained warning/order/hash, keyboard buttons, EN/VI and narrow/wide presentation. New executable cases remain Planned/Not run pending C3. Confirmed UX/C2 scope | Open: actual UI/manual observations | Rejected: mock persistence, reorder/regeneration or fabricated learner names.

**Function:** REQ-019-F01. **Actor:** authorized Expert. **Status:** C2 source/API UI0.11 warnings/format/local assignment updated/built2026-10-28; runtime evidence incomplete.

## Current Scope Alignment

Inspect the system-generated initial Employee/Role-Level proposal, use REQ-020-F01/F02 include/exclude, and confirm its exact current valid revision before Employee learning. [Shared API/state/data design](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md). Mandatory confirmation is confirmed, not advisory.

Existing /expert/pathway-review and /expert/pathway-review/:pathwayId are the visual integration baseline. Extend current design/components. Historical drag-and-drop/AI regeneration/exclusions-across-regeneration UI promises do not authorize those additional runtime commands in this initial full-flow slice.

## Actor, read projection and trigger

Trusted active Expert/org plus current assignment to applicable review scope. Production assignment failure denies. The temporary local adapter is implemented/default-off, only local-baseline-demo & !prod with existing enabled gates, one configured Expert/fixed demo tenant, optional Role allowlist and explicit query bound; see [section14.5](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md#145-local-assignment-substitute-and-mandatory-owner-ports). No activation/runtime proof. Queue filters scope before paging/counts. Client supplies filters/opaque ID/expected revision/hash/key, never actor/tenant/learner/approval/mastery.

Authorized Expert receives frozen Role+Level, safe gap/UNKNOWN evidence/source versions, grouped unique Modules/content refs, per-skill focus/difficulty/coverage role/preference/fallback reasons, distinct totals/quality, included/excluded overrides, dependencies and separate errors/warnings. “Cần Expert xem xét” identifies fallback; warnings alone do not invalidate complete coverage. Supporting benefit cannot silently replace a Primary provider; incidental never covers. Protected answer keys/theta/SE/foreign records are excluded. Employee only gets safe own status until confirmation.

## Ordered reads and writes

1. Authorize assignment, then read current request/proposal. Queue cannot imply all generated work has a reviewable proposal: GENERATING, UNRESOLVED and NO_LEARNING_REQUIRED are distinct.
2. Inspect gap origins and planned coverage/prerequisites; include/exclude via their own versioned commands. Display validation errors and lock reasons in product language; no localStorage authority.
3. On confirmation, reauthorize and resolve an exact retained key/body receipt first; only a new command locks/CAS-checks expected current revision/hash. Older revision or selection/source drift on a new command→409, not approval of refreshed unseen content. Replay of a prior success does not grant access or approve a newer revision; reconcile current GET afterward.
4. Re-read/revalidate publication/content availability, complete mandatory coverage under confirmed focus/difficulty rules, dependency/internal ordering and readiness gate definitions. Validate the Expert's **fixed selected set** without adding/removing modules to reoptimize duration/price; it may be valid without being the generation optimum. Hash-bound warnings/quality/overrides must match the inspected revision. Missing mapping/cycle/unresolved coverage or unproved fixed-set validation cannot be approved; pending future readiness keeps future modules locked.
5. If valid/current, atomically save confirmation actor/assignment/version/hash/timestamp and approval lifecycle pointer/receipt/audit/outbox. Idempotent replay returns same approval; any subsequent changed content needs a new exact confirmation.
6. Employee learning authorization reads this exact approved revision and actual readiness; audit/outbox delivery alone does not unlock. Dependency failure/transaction failure leaves no partial approval.

No-gap is a separate recorded outcome, never manufactured learning completion/Level certification. Exact no-gap acknowledgement UX remains Proposed design. Draft edit reason optional; mandatory reason policy not silently introduced.

No-gap needs no proposal approval; acknowledgement is optional Proposed UX without an authorized new command here. Request reads expose separate generation/review/validation state and show APPROVED after exact confirmation. Readiness gate definitions/content versions belong to the approved hash; current PASS/FAIL and availability remain live access projections. Assignment revocation denies new commands/replays; retroactive effect on a historical approval remains an Open owner policy, with current required validity checks failing closed.

## Failures, history and alignment

Unauthorized401/403/safe404; invalid/unresolved content422; revision/hash/key/input drift409; outage503 with rollback and exact retry. Concurrent include/exclude/confirm uses one CAS winner. Role change archives prior path read-only under existing owner contract; stale reviewed proposal is not overwritten by automatic generation. Later approved-path recalculation/re-review policy remains outside initial scope.

Routed queue/detail retain exact receipts/CAS/revisions/approval. Source now carries new enums/warnings/quality, revision-hash reconciliation and fixed-set review. Gate-off ReviewAssignments still denies; gated LocalPathwayAssignments verifies active scope and real persisted exact approval without provisioning/auto-approve. Format readers retain original hashes; actual SQL/replay/security behavior remains Not run. [Current receipt](../../../testing/system/REQ-041-042-v011-source-build.md) records builds only. V4 administrator naming is not System Administrator authority.

## Acceptance-to-test mapping

R01–R14 in [test plan](../../../testing/REQ-041-042-initial-pathway-test-plan.md): scoped queue/detail, real exact approval, local substitute gates/replacement, preserved warnings/fixed-set validation, protected data, stale/race/replay/outage atomicity, no preapproval learning and no-gap outcome. Planned/Not run; no C1 test/build execution or runtime/UI claim.

Confirmed: exact Expert gate/0.11 explanations/local scope | Source implemented/built: C2 adaptation/default-off substitute | Proposed: no-gap acknowledgement UX | Open: production assignment/revocation, readiness/content and runtime evidence | Rejected: fake approval/PASS or automatic C3.

## Confirmed local Compose amendment ? 2026-10-28

[Shared design18](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md) supersedes earlier missing-planner-input labels for the explicitly gated local demo once implemented. Fixed seed availability and original compatible mastery/UNKNOWN drive planning-only prerequisite decisions; no assessment PASS/internal gate is fabricated. Main dev Compose and FE rule review are approved C2 scope. Production owner adapters and executable acceptance remain Open/Not run.
