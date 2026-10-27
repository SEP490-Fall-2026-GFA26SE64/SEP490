# Review Initial Adaptive Pathway

**Function:** REQ-019-F01. **Actor:** assigned Expert. **Status:** Cluster2 source/API UI implemented; authoritative assignment/revocation and owner-policy integration/runtime evidence incomplete.

## Current Scope Alignment

Inspect the system-generated initial Employee/Role-Level proposal, use REQ-020-F01/F02 include/exclude, and confirm its exact current valid revision before Employee learning. [Shared API/state/data design](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md). Mandatory confirmation is confirmed, not advisory.

Existing /expert/pathway-review and /expert/pathway-review/:pathwayId are the visual integration baseline. Extend current design/components. Historical drag-and-drop/AI regeneration/exclusions-across-regeneration UI promises do not authorize those additional runtime commands in this initial full-flow slice.

## Actor, read projection and trigger

Trusted active Expert/org plus current assignment to applicable Role/discipline/Employee review scope; missing authoritative assignment denies, not organization-wide access. Queue filters authorization before paging/counts. Client may supply queue filters/opaque proposal ID; confirmation supplies expected revision/hash and command key. Actor/learner/tenant/approval state/Module sequence/mastery are server-owned.

Authorized Expert receives frozen Role+Level, safe gap/UNKNOWN evidence, source versions, ordered unique Module/content refs/instructionLevel/matched targets/reasons/duration/price, included/excluded overrides, dependencies/readiness and unresolved diagnostics. Protected answer keys/theta/SE/other tenant records excluded. Employee only gets safe own status until confirmation.

## Ordered reads and writes

1. Authorize assignment, then read current request/proposal. Queue cannot imply all generated work has a reviewable proposal: GENERATING, UNRESOLVED and NO_LEARNING_REQUIRED are distinct.
2. Inspect gap origins and planned coverage/prerequisites; include/exclude via their own versioned commands. Display validation errors and lock reasons in product language; no localStorage authority.
3. On confirmation, reauthorize and resolve an exact retained key/body receipt first; only a new command locks/CAS-checks expected current revision/hash. Older revision or selection/source drift on a new command→409, not approval of refreshed unseen content. Replay of a prior success does not grant access or approve a newer revision; reconcile current GET afterward.
4. Re-read/revalidate publication/content availability, complete mandatory plan coverage, dependency/internal ordering and readiness gate definitions. Pending future readiness can keep future modules locked; missing mapping/cycle/unresolved coverage cannot be approved.
5. If valid/current, atomically save confirmation actor/assignment/version/hash/timestamp and approval lifecycle pointer/receipt/audit/outbox. Idempotent replay returns same approval; any subsequent changed content needs a new exact confirmation.
6. Employee learning authorization reads this exact approved revision and actual readiness; audit/outbox delivery alone does not unlock. Dependency failure/transaction failure leaves no partial approval.

No-gap is a separate recorded outcome, never manufactured learning completion/Level certification. Exact no-gap acknowledgement UX remains Proposed design. Draft edit reason optional; mandatory reason policy not silently introduced.

No-gap needs no proposal approval; acknowledgement is optional Proposed UX without an authorized new command here. Request reads expose separate generation/review/validation state and show APPROVED after exact confirmation. Readiness gate definitions/content versions belong to the approved hash; current PASS/FAIL and availability remain live access projections. Assignment revocation denies new commands/replays; retroactive effect on a historical approval remains an Open owner policy, with current required validity checks failing closed.

## Failures, history and alignment

Unauthorized401/403/safe404; invalid/unresolved content422; revision/hash/key/input drift409; outage503 with rollback and exact retry. Concurrent include/exclude/confirm uses one CAS winner. Role change archives prior path read-only under existing owner contract; stale reviewed proposal is not overwritten by automatic generation. Later approved-path recalculation/re-review policy remains outside initial scope.

Routed queue/detail now consume typed API state instead of localStorage. Source includes assigned authorization, read-only validation, immutable edits/receipts and exact confirmation; owner assignment/revocation and catalog/readiness remain unavailable by default. [C2 checks/limitations](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md#10-cluster-2-source-implementation-and-verification--2026-10-27) do not certify the integrated flow. V4 administrator approval naming remains legacy storage, never System Administrator authority.

## Acceptance-to-test mapping

R01–R12 in [test plan](../../testing/REQ-041-042-initial-pathway-test-plan.md): assigned queue/detail isolation, correct input/explanation, safe edit/validation, exact-current confirmation, protected data, stale/race/replay/outage atomicity, no preapproval learning and no-gap outcome. Planned/Not run.

Confirmed: mandatory Expert gate | Source implemented: durable commands/read/API UI | Proposed: no-gap acknowledgement UX | Open: authoritative assignment/revocation and runtime integration/acceptance.
