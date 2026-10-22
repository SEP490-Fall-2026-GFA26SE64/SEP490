# View Assessment History

**Current source checkpoint — slices 1–5, 2026-10-22:** The user accepted slices 2–3 and authorized slices 4–5. The common-configuration form/calculator, saved-preview and confirmed lifecycle actions, PostgreSQL-backed management directory, and safe full/legacy result/history are now implemented in uncommitted source. V1–V22 and historical data remain unchanged. Main Java compile, production-only TypeScript/lint and FE flag-off/on builds passed; bounded isolated live-client/HTTP/SQL observations are recorded in [slice 4–5 evidence](../../testing/system/REQ-002-F02-REQ-009-occupation-ui-results.md). Interactive browser review is unavailable in this session and remains unverified. No executable tests, acceptance certification, user-stack migration, stage/commit/push or automatic Cluster 3.

**Approval update - 2026-10-22:** The user approved OB-P01-P10 and the proposed schema/API/transition/concurrency/rollback design and authorized Cluster 2 implementation in small slices. Earlier review qualifiers are superseded by this approval; implementation status remains explicit. The user then confirmed a maximum of 100 Unicode characters for the name and a total budget of 30-120 seconds multiplied by maxQuestions; this is an average budget, not a per-item timer. Nearest-whole-second calculation is approved. Existing legacy values/history stay unchanged. No Cluster 3/test execution, new commit or push is authorized. Planned schema/behavior is not implemented merely by this approval.

## Current Scope Alignment
Employee views own baseline, RIASEC and module history. This 2026-10-22 Cluster 1 update covers **only adaptive-baseline REQ-009-F02**, with the same disclosure boundary as [View Assessment Result](View%20Assessment%20Result.md). RIASEC/module/independent-learning presentation remains separately scoped. Preserve original Occupation/optional Role and exact technical provenance for authorized processing/audit; do not expose technical pins to Employee.

### Goal, actor, trigger and inputs

An Employee opens own baseline history to find recorded terminal attempts/results and invalidated replacement chains. Client sends only supported safe query parameters; trusted server context supplies actor/organization/learner. Choosing another Role inside the Occupation does not create another baseline entitlement or restrict history to the latest Role. One stable Occupation baseline may have invalidated predecessors plus its sole mastery-producing completion; those are distinct attempts, not separate Role baselines.

### Ordered read and output

1. Authenticate/reload authorized Employee and apply organization+learner predicates before filtering, ordering or counting.
2. Read terminal PostgreSQL attempts and exact pinned/immutable result snapshots, including both historical role-scoped and new full-Occupation attempts. Never replace historical rows with current Blueprint/current mastery or read another employee's chain.
3. Return recorded Occupation/optional Role, attempt state/reason, server start/completion times, safe raw/mastery/confidence summary and owned predecessor/successor links. Apply the result disclosure allowlist; an invalidated attempt has no invented mastery.
4. Public scope wording reflects actual recorded scope: new full-Occupation versus earlier Role-specific/earlier union scope. The selected Role does not filter new full-union skill names. No rescore/relabel/reset and no need to reactivate an old Blueprint to view its result.

Current B8 history query returns terminal attempts newest first. Keep that bounded scope; IN_PROGRESS resume remains REQ-002-F01. Slice5 implements completedAt descending with stable attempt-ID tie-breaker and clearly labels completion date; bounded pagination before large histories remains separate; filters/page sizes are not silently approved by the Blueprint-list requirement. Those UI/API choices remain Open/Approved design. Current unpaged behavior must be recorded, not called scalable production evidence.

### Read guarantees and error branches

| Branch | Outcome |
| --- | --- |
| Authorized learner with no terminal attempts | Helpful empty list, no fabricated attempts or writes |
| Wrong actor/tenant or tampered scope | Deny without counts/names/results leakage |
| Terminal/replacement added concurrently | One coherent committed query snapshot; next refresh may show new row, no duplicate identity |
| Storage/projection unavailable | Explicit retryable read error, not falsely empty history |
| Old/current Role/Blueprint renamed, deactivated or replaced | Recorded row/date/scope/result retained; read requires no current Catalog readiness |
| Invalidated chain / completed legacy Role A | Show chain without fabricating evidence; preserve existing successful Employee+Occupation allowance |

GET changes no attempt/result/receipt/audit-domain event/pointer/outbox delivery and never finalizes expired attempts. No protected answers, per-response correctness, theta/SE, parameters, internal scope enums or foreign IDs. No baseline localStorage history source. Production Identity, retention duration and broader history comparison/filter policies remain dependencies; current configured local/demo adapter is provisional.

### Acceptance and decisions

AB-R01–R05 in the [test plan](../../testing/REQ-002-adaptive-baseline-test-plan.md) map full/legacy scope, own/foreign/empty/error reads, stable original dates/results, replacement linkage, and no-state-change. These are planned evidence only; do not recreate retired temporary A/B checklists or reset completion to run them.


## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-009-F02  
**Actor:** Employee  
**Status:** Pending clarification  
**Feature:** [Assessment Results](README.md)

## Description

List the employee's previous assessment attempts and provide access to their available result details.

**Input:** Employee and optional history filters.  
**Outcome:** An own-attempt history spanning the supported assessment types.

## Confirmed Related Rule

- From [Choose Target Role](../Target%20role%20selection/Choose%20Target%20Role.md) (REQ-001-F02), 2026-09-27: After a role change, retain all previous assessment attempts in the employee's read-only history, labeled with their original role, date, and results.
- A role change does not delete previous attempts, restrict history to the current role, or relabel past attempts as belonging to the new role. This confirms retention across role changes, not an indefinite data-retention period.

## Open Decisions

- Filters, sorting, additional displayed columns beyond role/date/results, and pagination.
- How unfinished attempts are labeled and which date field is displayed.
- Whether comparisons between attempts are needed and how long history is retained.

## Acceptance Baseline

Distinct attempts remain distinguishable and cannot be confused with the employee's latest competency state.

- After a role change, all previous attempts remain accessible to the employee as read-only history with their original role, date, and recorded results, without exposing another employee's attempts.

## Current adaptive decision status

**Confirmed:** own immutable terminal baseline history across Role changes; one-success allowance, legacy/new recorded scope, safe disclosure and read-only behavior. **Confirmed design:** public scope labels, explicit completedAt ordering/tie-breaker and future bounded query shape. **Provisional:** local/demo identity. **Open:** separate history pagination/filter/retention and production Identity. **Rejected:** latest-Role relabel/filter replacing original history, fabricated mastery, completion reset or GET mutation.
