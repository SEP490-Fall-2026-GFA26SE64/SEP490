# Exclude Pathway Module

**Function:** REQ-020-F02. **Actor:** authorized Expert. **Status:**0.11 C2 policy/format/local-scope source updated/built2026-10-28; runtime evidence pending.

## Current Scope Alignment

Exclude an unnecessary/redundant Module from an initial draft, preserving the explicit override and checking coverage/prerequisites. Exclusion is not proof of mastery, readiness or completed learning. [Shared design](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md). Approval is a separate Function.

## Actor, fields and ordered flow

Trusted server Expert/org and current review assignment; the explicit local substitute has separate default-off scope/gates in shared section14.5, never blanket Expert access. Client supplies proposal/module IDs, expected revision/hash, optional reason and key. Server owns authorization, focus/difficulty/coverage, warnings, next revision/order/validation and learner state. Employee has no override route.

1. Authorize assignment before resource/replay reads. Return an exact retained key/body receipt before new-command revision checks; otherwise check expected current draft revision/hash. Approved/archived/progress-bearing pathway edits are outside this initial review scope. A historical successful replay cannot edit or approve the now-current revision.
2. Exclude-absent returns safe no-op after expected revision checks. Otherwise remove exactly the intended Module from included set; retain its excluded record and all prior history.
3. Re-evaluate the fixed remaining set's per-skill Primary/fallback coverage, independent Supporting benefit, prerequisites/readiness and order. Removing a provider can affect several needs/bonuses; recompute unique totals and warnings. Excluding a Primary cannot authorize Supporting coverage merely because that Primary is no longer selected while a usable Primary alternative exists. Do not mark mastery or silently re-add/replace the excluded Module.
4. Save a new VALID or editable UNRESOLVED draft with all uncovered skill/dependency reasons and separate retained fallback/UNKNOWN notes. Warnings alone do not invalidate a complete feasible set, but incomplete/search-uncertain content cannot be approved. Include can repair the explicit set later. Transient dependency failure rolls back rather than inventing missing-content reasons.
5. Commit revision/override/receipt/audit/outbox with CAS, return revision/hash/validation/reasons. Prior approval cannot attach to changed content. No baseline/profile/progress mutation.

Only approved current exact complete revision can open learning through REQ-019-F01. Inclusion of an alternative is a separate Expert command; automatic regeneration respecting persistent exclusions is not included in current runtime scope.

## Failure, recovery and acceptance

401/403/safe404 scope errors;400 invalid command;409 stale revision/hash/key mismatch;503 outage with no partial exclusion. Retry unknown outcome with exact key/body; replay reauthorizes. Concurrent edit/approval must not lose history or approve removed content.

R03–R14 in [test plan](../../testing/REQ-041-042-initial-pathway-test-plan.md) cover provider/prerequisite/benefit removal, warnings, fixed-set validity/repair, approval denial, local assignment/tenant gates, no-op/replay/CAS and failure isolation. P19 covers exact historical format/hash reads without old enum conversion. All Planned/Not run; current API source/build history is not transaction/0.11 acceptance evidence.

Confirmed: exclusion/fixed-set revalidation/warnings/no fake mastery | Source implemented/built:0.11 adaptation | Open: owner integration/runtime evidence; later recalculation/progress overrides dependency-only | Rejected: auto-readd, fabricated Primary absence or approval/tests without authority.
