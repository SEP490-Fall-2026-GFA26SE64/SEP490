# Review Initial Adaptive Pathway

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

Routed queue/detail retain exact receipts/CAS/revisions/approval. Source now carries new enums/warnings/quality, revision-hash reconciliation and fixed-set review. Gate-off ReviewAssignments still denies; gated LocalPathwayAssignments verifies active scope and real persisted exact approval without provisioning/auto-approve. Format readers retain original hashes; actual SQL/replay/security behavior remains Not run. [Current receipt](../../testing/system/REQ-041-042-v011-source-build.md) records builds only. V4 administrator naming is not System Administrator authority.

## Acceptance-to-test mapping

R01–R14 in [test plan](../../testing/REQ-041-042-initial-pathway-test-plan.md): scoped queue/detail, real exact approval, local substitute gates/replacement, preserved warnings/fixed-set validation, protected data, stale/race/replay/outage atomicity, no preapproval learning and no-gap outcome. Planned/Not run; no C1 test/build execution or runtime/UI claim.

Confirmed: exact Expert gate/0.11 explanations/local scope | Source implemented/built: C2 adaptation/default-off substitute | Proposed: no-gap acknowledgement UX | Open: production assignment/revocation, readiness/content and runtime evidence | Rejected: fake approval/PASS or automatic C3.
