# View Adaptive Pathway

## Confirmed Employee visual restoration — 2026-10-28

User approved restoring the reference screenshots on the existing Employee roadmap/timeline files, replacing the generic InitialPathwayModules card-grid/list bypass. Show a compact Role/Level/status and view toolbar, baseline-target count/search, a top Role node with approved Modules down the center and their actual teaching skills on both sides, connecting lines, and the existing timeline track composition. Keep Module order/dependencies from the approved projection. Scope the responsive styles to this trusted path; preserve independent-skill consumers and existing shared primitives/tokens/EN-VI. Module/skill activation opens a read-only detail dialog; safe content links remain conditional on live AVAILABLE entry/current non-archived status.

Extend the own approved/own approved-archived GET only with safe context (frozen roleId/levelId/occupationId) and the existing frozen RoleGap.Result: names/requirements/mastery/confidence/UNKNOWN from the exact prepared input. Do not serialize full profile/input/worker candidates or change approval hashes. Non-approved/empty responses expose neither these learning details nor Modules. Reads retain own authorization and final revision/hash check and perform no writes or migrations. Baseline snapshot is historical planning evidence, not live learning progress; the denominator is mandatory Role skills, deduplicated, and a met target requires known mastery >= its exact requiredScore. Optional/out-of-Role targets do not alter that count. An out-of-Role target absent from the retained role snapshot displays its ID and unavailable evidence rather than guessed mastery/threshold/name.

Source design contains mocked Success/In Progress/70%-exam/certification states, simulation commands and a Target Role Verified footer. Those behaviors are not restored. Approved means Expert confirmed the plan; AVAILABLE/LOCKED/UNAVAILABLE/ARCHIVED come from trusted access projection and never prove completion. Explain unavailable learning content separately from plan generation, with a concise common notice and details on demand. No extra page header. Only the trusted current Role is shown; Skill navigation uses the existing skill-selection route, not fabricated pathway history. Empty/pending/stale/error/archive behavior stays explicit and safe.

Acceptance E01–E09 extends to source layout restoration, search/highlight, accurate frozen baseline counts/UNKNOWN and absent targets, safe no-write projection and dialogs, responsive EN/VI, correct access messages and retained archived/no-entry guards. Planned executable evidence remains C3 Not run; C2 build/manual observations are recorded separately. Confirmed.

**Function:** REQ-004-F01. **Actor:** Employee. **Status:** C2 projection/API UI0.11 format/notes source updated/built2026-10-28; positive approved-view evidence pending. Current user milestone ends at pathway display; learning-content/start execution is deferred to its owner.

## Current Scope Alignment

Employee sees own generation/review outcome, then the Expert-confirmed ordered initial pathway with prerequisite lock reasons. No include/exclude/reorder capability. [Shared flow/API/data design](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md). Module learning/assessment execution is a dependency, not implemented by this read Function.

Current milestone boundary: [shared design17](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md#17-current-milestone-and-machine-transfer-gate--2026-10-28). Employee must see the safe exact approved sequence/notes even when individual learning entries remain LOCKED/UNAVAILABLE. Source maps access423/503 per Module without fabricating entry/PASS. Planning prerequisite/availability inputs remain required upstream. Protected start/content/segment rules below are retained future owner contracts, not instructions to implement the learning page or execute learning during this manual milestone. All positive approved-view/runtime security acceptance remains unverified.

## Actor, client/server fields and protected output

Trusted active Employee/org only. Read current selection/request and own approved revision, or own archived path ID. Never accept arbitrary learner/org/approval/progress/readiness from client. Output safe Role-Level/order, distinct Module amounts, per-skill teachingFocus/difficultyLevel and nonblocking fallback notes (“Cần Expert xem xét”), server states and useful lock/unavailable reasons. No answer keys/theta/SE/foreign learner or draft candidate rankings. Supporting benefit is explanatory, never a claim that another skill gap is closed.

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
5. Return projection; reads do not confirm, advance progress, write mastery or dispatch. Protected Module/content/start/internal-segment routes must independently invoke exact approval/current tenant/content/readiness checks on each applicable access; a projected entry or contentUri is not an access token. A direct public Markdown link is not sufficient enforcement. Independent ready branches remain usable without global ordinal locks.

Dependency failure→explicit unavailable/retry, not empty/no-path/UNKNOWN or newly unlocked access. A locked content direct request remains denied. Current revoke/unpublish restriction cannot be bypassed using frozen display metadata.

Request polling and pathway reads use the shared generation/review/validation projection; after approval the current display is APPROVED rather than the generation worker's earlier awaiting-review outcome. Each response uses a coherent revision/hash pointer. Live readiness/availability can restrict an approved Module without mutating its frozen hash or fabricating progress. Historical command receipts are outcomes to reconcile, not current access tokens. Archived own-ID read is a separate proposed route in shared design section5.

## History and compatibility

Role change archives old pathway and retains recorded sequence/progress. Returning to that Role does not reactivate archived path. Blueprint replacement/deactivation alone governs baseline admission, not deletion of mastery or automatic archival of an otherwise active approved pathway. A Module/content/access change may independently restrict access; post-approval catalog-driven recalculation/re-review belongs to REQ-043/lifecycle policy and is not silently implemented here.

Employee timeline/roadmap now uses typed legacy/new pair parsing and shared teaching/attention explanations, explicit search-limit text and existing typography/tokens/EN–VI; independent consumers remain untouched. Source retains historical format1 hash computation/readers/content refs without latest-version substitution. Actual content/start/segment mounting is still missing; a hook is not direct-access evidence. The default-off local assignment adapter checks real exact stored approval, not unconditional success. Owner assessment/readiness/content ports remain denied until integrated; scaffold/mastery is not PASS. [Actual build receipt](../../../testing/system/REQ-041-042-v011-source-build.md) records no runtime/UI execution.

## Acceptance-to-test mapping

E01–E09 in [test plan](../../../testing/REQ-041-042-initial-pathway-test-plan.md): own/no-write scope, lifecycle/error states, unique amounts/order/0.11 notes, exact approval, independent/prerequisite/internal locks and actual direct-access denial, legacy archive/no-resume, history/revocation/failure. All executable evidence Planned/Not run. C2 source/build completion is a separate milestone from the user-deferred evening manual/UI verification on another machine; do not call runtime accepted before its evidence.

Confirmed: own approved/locked view and safe pair/attention explanations | Source implemented/built: C2 adaptation | Open: live readiness/content-start, runtime/UI evidence and later recalculation | Rejected: UI-only security, fake unlock/PASS or tests without C3.

## Confirmed local Compose amendment ? 2026-10-28

[Shared design18](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md) supersedes earlier missing-planner-input labels for the explicitly gated local demo once implemented. Fixed seed availability and original compatible mastery/UNKNOWN drive planning-only prerequisite decisions; no assessment PASS/internal gate is fabricated. Main dev Compose and FE rule review are approved C2 scope. Production owner adapters and executable acceptance remain Open/Not run.
