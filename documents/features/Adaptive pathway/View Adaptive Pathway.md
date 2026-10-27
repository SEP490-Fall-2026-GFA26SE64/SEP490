# View Adaptive Pathway

**Function:** REQ-004-F01. **Actor:** Employee. **Status:** Cluster2 read/access-policy/API UI source implemented; live readiness/content-start integration and runtime acceptance incomplete.

## Current Scope Alignment

Employee sees own generation/review outcome, then the Expert-confirmed ordered initial pathway with prerequisite lock reasons. No include/exclude/reorder capability. [Shared flow/API/data design](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md). Module learning/assessment execution is a dependency, not implemented by this read Function.

## Actor, client/server fields and protected output

Trusted active Employee/org only. Read current selection/request and own approved revision, or an authorized own archived path ID. Never accept arbitrary learner/org/approval/progress/readiness from client. Output safe Role-Level/sequence/Module details and server-computed states/reasons. No answer keys/theta/SE/foreign learner or unapproved candidate graph.

| Condition | Visible behavior |
| --- | --- |
| No confirmed request | Prompt Role review/confirmation; never generate on GET |
| PENDING | Request durably accepted, preparation pending; no duplicate confirmation needed or learning actions |
| GENERATING | “Your pathway is being prepared” / “Đang tạo lộ trình học”; no learning actions |
| AWAITING_EXPERT_REVIEW | “Your pathway is awaiting review” / “Lộ trình học đang chờ duyệt”; no learning access |
| UNRESOLVED/BLOCKED | Explain content/configuration issue safely; no complete valid-path claim |
| FAILED_RETRYABLE/STALE | Reconcile/refresh appropriate state; no silent new Role or fake empty result |
| NO_LEARNING_REQUIRED | No additional mandatory learning for this snapshot; no fabricated certification/completion |
| APPROVED current | Ordered Modules and explicit available/locked/unavailable/completed projection from trusted owner sources |
| Archived | Read-only recorded sequence/history; no resume or new assessment actions |

## Ordered reads and no-state-change guarantee

1. Authenticate/authorize own scope before request/path existence reads.
2. Resolve current selection and request/approved revision through ports; do not infer readiness from a terminal baseline attempt alone or localStorage.
3. Verify approved exact revision/hash pointer and allowed visibility. Read frozen sequence/content refs plus actual current availability/readiness for applicable gates.
4. Compute lock reasons server-side. A Module with unmet prerequisites stays locked even if ordinal is next. Independent modules need not be sequentially locked merely because another Module precedes them. Final unlock requires defined version-matched readiness PASS, not completion/list position alone.
5. Return projection; reads do not confirm proposal, advance progress, write mastery or dispatch generation. Applicable Module/content/start APIs must independently enforce the same gate and actor/tenant checks; hiding a button is not security.

Dependency failure→explicit unavailable/retry, not empty/no-path/UNKNOWN or newly unlocked access. A locked content direct request remains denied. Current revoke/unpublish restriction cannot be bypassed using frozen display metadata.

Request polling and pathway reads use the shared generation/review/validation projection; after approval the current display is APPROVED rather than the generation worker's earlier awaiting-review outcome. Each response uses a coherent revision/hash pointer. Live readiness/availability can restrict an approved Module without mutating its frozen hash or fabricating progress. Historical command receipts are outcomes to reconcile, not current access tokens. Archived own-ID read is a separate proposed route in shared design section5.

## History and compatibility

Role change archives old pathway and retains recorded sequence/progress. Returning to that Role does not reactivate archived path. Blueprint replacement/deactivation alone governs baseline admission, not deletion of mastery or automatic archival of an otherwise active approved pathway. A Module/content/access change may independently restrict access; post-approval catalog-driven recalculation/re-review belongs to REQ-043/lifecycle policy and is not silently implemented here.

Existing Employee Role timeline/roadmap now consumes C2 API projections with the same typography/tokens/components/EN–VI; independent skill/assessment consumers remain separate. A storage projection/policy hook is not direct-access evidence. Existing Module assessments/pass criteria remain their owner's contracts; no new tracing or proficiency formula. [Actual C2 integration limits](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md#10-cluster-2-source-implementation-and-verification--2026-10-27).

## Acceptance-to-test mapping

E01–E08 in [test plan](../../testing/REQ-041-042-initial-pathway-test-plan.md): own read/isolation and no-state-change, lifecycle/no-gap/error states, sequence/shared provider dedup, exact approval gate, prerequisite/independent Module locks and direct API denial, archived no-resume, Blueprint-history preservation, dependency/revocation behavior. All new executable evidence Planned/Not run.

Confirmed: own approved/locked view | Source implemented: API/policy/UI | Open: live readiness/content-start integration, runtime acceptance and later recalculation policy.
