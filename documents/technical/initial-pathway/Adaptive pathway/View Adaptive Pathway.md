# View Adaptive Pathway

**Function:** REQ-004-F01. **Actor:** Employee. **Contract updated:** 2026-10-29.
[Business requirement](../../../features/Employee%20experience/README.md#fr-06-06). This milestone ends at own pathway display; protected learning execution/content/start/segment/assessment integration remains owner scope.

## Goal, preconditions and fields

After exact Expert confirmation, the Employee reads the same approved revision, saved module order, teaching details and dependency/lock explanations in Roadmap or Timeline. Before confirmation, show safe lifecycle status rather than draft modules/candidates or learning links. Own historical approved-archived pathways are read-only.

Require trusted active Employee/org/entitlement. GET current accepts no learner/tenant input; GET archived accepts only own opaque pathway ID. Server resolves selection, current request, exact revision/hash and approval. Never accept client approval, progress, readiness or mastery.

Safe approved output contains status, archived flag, frozen Role/Level/Occupation context, frozen RoleGap.Result, unique module IDs/ordinals/content versions/duration/price and per-skill legacy or current teaching metadata. Dependencies expose module/provider/dependentSkill/prerequisiteSkill/internal flag. Access fields are AVAILABLE/LOCKED/UNAVAILABLE/ARCHIVED, reasonCode and nullable entry. Exclude worker candidates, draft detail, answer keys, theta/SE and foreign data.

## Visible lifecycle and ordered reads

| State | Behavior |
| --- | --- |
| No request | Empty state and Role review/confirmation guidance; GET never generates |
| PENDING / GENERATING | Preparation status; no duplicate admission or learning actions |
| AWAITING_EXPERT_REVIEW | Awaiting-review status; no draft module/context/baseline learning projection |
| UNRESOLVED / BLOCKED / FAILED_RETRYABLE / STALE | Safe reason/retry or refresh guidance; never fake successful/empty pathway |
| NO_LEARNING_REQUIRED | No additional mandatory learning for that snapshot; no certification/completion claim |
| APPROVED current | Exact approved module order and dependency projection with live access restrictions |
| ARCHIVED | Own recorded approved sequence with ARCHIVED entries and null links; no resume |

1. Authenticate/authorize own scope before existence reads. Current GET resolves request and checks its selection still matches the current server selection.
2. Read lifecycle/approval visibility. Without an approved current revision or exact approved archived record, return status and empty modules/dependencies/context/baseline.
3. Load the immutable revision using tenant/learner/request/revision and validate stored format/content identity. Keep persisted module sequence and dependency providers; do not regenerate, canonicalize Expert order or substitute newest content.
4. For current modules, InitialPathwayAccess checks exact current VALID approval, current selection, assignment validity, current binding, module availability/version and applicable external prerequisite readiness. Internal gates are passed to ContentAccess. Map access423 to LOCKED and503 to UNAVAILABLE with null entry; other authorization/stale failures fail the response. Archive maps every module to ARCHIVED/null without granting entry.
5. Reread request revision/hash/review state after projection and reject changed content with409 STALE_PATHWAY_VIEW. Return safe frozen context/baseline and dependencies from that same revision.
6. Reads create no selection, mastery, progress, approval, command receipt or outbox record. Dependency failures cannot fabricate ready access. This is application coherence checking, not cross-store serializability.

## Roadmap, Timeline and readiness rules

Use the existing Role/Module/flanking-skill Roadmap and Timeline, compact view/search toolbar and read-only module/skill dialogs with shared tokens and equivalent EN/VI. Show the trusted current Role, persisted module order and real teaching skills. Do not restore mock Success/In Progress, simulated exam percentages, certification or Target Role Verified claims.

Frozen baseline counts use deduplicated mandatory Role skills and known mastery meeting their exact target. UNKNOWN and out-of-Role absent evidence stay explicit; baseline attainment is not live learning completion. Supporting benefit cannot imply another gap is closed.

A prerequisite provider appearing earlier is planning order, not PASS. Current version-matched readiness evidence governs access; independent branches do not inherit a global ordinal lock. Internal prerequisite/dependent teaching requires its defined internal gate. Content/start/segment owner routes must independently enforce approval/tenant/version/readiness on each protected request; a displayed URL or public Markdown path is not authority. This contract does not implement those owner routes.

Expert preview is a separate authorized draft projection with PREVIEW/null entry, never an Employee response or approval. Only final exact confirmation allows the own approved read. Editing a draft or a UI success banner cannot unlock learning.

## Failures, history and compatibility

401/403/safe404 protect identity/scope;409 handles stale selection/view or nonarchived ID at archived route;503 signals integrity/dependency failures, with per-module unavailable projection where supported. Empty/not-found/outage are distinct. Repeat read is safe and does not dispatch work.

Role changes retain archived history and do not reactivate old pathways when returning to that Role. Blueprint replacement alone does not reset mastery or erase approval history. Later catalog-driven recalculation/re-review is a separate owner policy. Format1 and2 keep their original hashes and content references; no legacy relabeling, latest-version substitution, reset or repin.

## Implementation alignment and evidence

InitialPathwayView/Access, JdbcInitialPathways/Revisions and typed initialPathway.ts own this path at cced745. Archived GET is implemented, not merely proposed. Workspace identity is real-session based but assignment/catalog/planning adapters remain explicitly development-gated; ContentAccess and LiveReadiness default-deny. Modules may therefore stay UNAVAILABLE/null after approval. Production assignment/publication and protected owner mounting are incomplete.

The [workspace receipt](../../../testing/system/REQ-002-041-042-workspace-integration.md) records an older exact approved3-module Employee HTTP read; it does not prove Employee projection after the newer manual reorder. User-confirmed Move/Remove UI happy cases do not establish browser-observed Employee/negative/security cases.

E01–E03/E07–E09 and P19 in the [test plan](../../../testing/REQ-041-042-initial-pathway-test-plan.md) cover own/no-write/empty/error/state, frozen counts, exact order/hash/dependencies, access reasons, format/history and responsive EN/VI. E04–E06 retain future protected learning-owner rules; execution remains deferred. New executable cases remain Planned/Not run.

Status: Confirmed.
