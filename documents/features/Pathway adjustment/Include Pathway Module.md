# Include Pathway Module

**Function:** REQ-020-F01. **Actor:** assigned Expert. **Status:** Cluster2 command/revision/API UI source implemented; owner integration/runtime acceptance incomplete.

## Current Scope Alignment

Include an eligible Module in an initial pathway draft without granting learning access. Expert supplies intent; engine owns revalidation/order. [Shared design](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md). Subsequent confirmation is REQ-019-F01, not an effect of inclusion.

## Actor, fields and ordered flow

Trusted server actor/org and current reviewer assignment are required. Client sends proposal ID, moduleId, expected revision/hash, optional reason and command key. Server owns scope, eligibility, target matching/instructionLevel, ordinal/lock, status and new revision. Neither arbitrary learner/org nor client-supplied mastery/order is accepted.

1. Authorize assignment before resource/receipt read; load own-scope current initial draft. Reauthorize replay; exact key/body replays, key reuse conflicts.
2. Lock/CAS expected revision/hash. Stale/approved/archived proposal cannot be silently edited. If already included, return no-op after revision checks.
3. Read current Module/content/publication/suitability and related needs/dependencies through ports. Only eligible permitted content can be included; catalog downtime is not permission.
4. Construct proposed new Module set, retain explicit Expert inclusion/reason and selection source. Dedup one Module, keep actual per-skill targets.
5. Run coverage/prerequisite/internal-gate/order/freshness validation and recompute order server-side. Valid or explicitly UNRESOLVED editable draft can be saved; dependency failure rolls back.
6. Atomically save immutable next revision/override/receipt/audit/outbox and current pointer CAS. Return resulting revision/hash/validation and reasons, not approved status. No mastery/baseline/learning access change.

Proposed fields/routes/storage are in shared design; physical DB changes not executed. Compulsory justification/reorder/AI regeneration are not assumed. Cannot include content from another tenant or inaccessible release to fix a gap.

For a previously accepted exact command, return its retained receipt after reauthorization before checking the now-old expected revision. New commands still require the current revision, including include-existing no-ops. A generation failure without a proposal is not an editable draft. Readiness results remain live; revision hash freezes gate definitions and actual content/targets/overrides as shared design section5.1 specifies.

## Failure, history and acceptance

401/403 or safe404 for forbidden scope;400/422 invalid input/eligibility;409 revision/key conflict;503 dependency outage. Unknown commit→same key/body replay. Concurrent include/exclude/confirm produces one winner; no lost updates. Do not erase previous excluded record; new override explicitly supersedes it in this initial review. Later recalculation preservation remains REQ-043 dependency.

R03–R06/R09–R12 in [test plan](../../testing/REQ-041-042-initial-pathway-test-plan.md): assigned Expert only, duplicate/no-op, suitability/dedup/order, unresolved draft cannot approve, stale/race/outage rollback, history/receipt and no learning unlock. Planned/Not run. Routed inclusion now uses API state; [C2 limits](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md#10-cluster-2-source-implementation-and-verification--2026-10-27) retain absent assignment/policy integration and unexecuted transactions.

Confirmed: authorized intent/revalidation | Source implemented: API/storage/UI | Open: reviewer/content owner integration and runtime acceptance.
