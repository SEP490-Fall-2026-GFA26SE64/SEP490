# Exclude Pathway Module

**Function:** REQ-020-F02. **Actor:** assigned Expert. **Status:** Cluster2 command/revision/API UI source implemented; owner integration/runtime acceptance incomplete.

## Current Scope Alignment

Exclude an unnecessary/redundant Module from an initial draft, preserving the explicit override and checking coverage/prerequisites. Exclusion is not proof of mastery, readiness or completed learning. [Shared design](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md). Approval is a separate Function.

## Actor, fields and ordered flow

Trusted server Expert/org and current review assignment; client proposal/module IDs, expected revision/hash, optional reason and command key. Server owns authorization, next revision/status/order/validation and all learner state. Employee has no override route.

1. Authorize assignment before resource/replay reads. Return an exact retained key/body receipt before new-command revision checks; otherwise check expected current draft revision/hash. Approved/archived/progress-bearing pathway edits are outside this initial review scope. A historical successful replay cannot edit or approve the now-current revision.
2. Exclude-absent returns safe no-op after expected revision checks. Otherwise remove exactly the intended Module from included set; retain its excluded record and all prior history.
3. Re-evaluate actual remaining per-skill coverage, prerequisite/readiness providers, multi-skill targets and order. Removing shared provider can affect several needs. Do not auto-mark skill mastered or silently re-add an excluded Module.
4. Save a new VALID or explicitly UNRESOLVED draft with uncovered skill/dependency reasons. This permits exclude-then-include repair; incomplete draft must never be approvable. Transient dependencies failing validation cause rollback, not false unresolved content diagnosis.
5. Commit revision/override/receipt/audit/outbox with CAS, return revision/hash/validation/reasons. Prior approval cannot attach to changed content. No baseline/profile/progress mutation.

Only approved current exact complete revision can open learning through REQ-019-F01. Inclusion of an alternative is a separate Expert command; automatic regeneration respecting persistent exclusions is not included in current runtime scope.

## Failure, recovery and acceptance

401/403/safe404 scope errors;400 invalid command;409 stale revision/hash/key mismatch;503 outage with no partial exclusion. Retry unknown outcome with exact key/body; replay reauthorizes. Concurrent edit/approval must not lose history or approve removed content.

R03–R12 in [test plan](../../testing/REQ-041-042-initial-pathway-test-plan.md) cover shared-provider/prerequisite removal, UNRESOLVED draft and blocked approval, replacement via include, absence no-op, tenant/reviewer/replay/race/failure isolation. Planned/Not run. Routed exclusion now uses API state; source compilation is not transaction/acceptance evidence. [C2 limitations](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md#10-cluster-2-source-implementation-and-verification--2026-10-27).

Confirmed: exclusion/revalidation/no fake mastery | Source implemented: API/storage/UI | Open: owner integration/runtime acceptance; later recalculation/active-progress override policy stays outside this Function.
