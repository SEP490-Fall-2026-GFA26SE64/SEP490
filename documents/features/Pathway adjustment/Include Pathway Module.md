# Include Pathway Module

Confirmed UX2026-10-28: Catalog→Included and Excluded→Included drops are alternate gestures for this same command. Keyboard/mobile Include/Restore buttons remain. Only currently eligible candidates from the scoped server response can be included; last persisted overrides determine excluded membership. Ignore external/same-list/stale drag and lock during pending/approved states. Reconcile exact server revision/hash/order; no position field, reorder, localStorage mutation, fabricated success or automatic approval. See REQ-019's confirmed UX restoration; C2 build/manual evidence is separate from planned C3 cases.

**Function:** REQ-020-F01. **Actor:** authorized Expert. **Status:**0.11 C2 source/API UI/format/local-scope adaptation built2026-10-28; runtime evidence pending.

## Current Scope Alignment

Include an eligible Module in an initial pathway draft without granting learning access. Expert supplies intent; engine owns revalidation/order. [Shared design](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md). Subsequent confirmation is REQ-019-F01, not an effect of inclusion.

## Actor, fields and ordered flow

Trusted server actor/org and current reviewer assignment are required; only the confirmed separately gated local assignment adapter may substitute assignment in demo, as [shared section14.5](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md#145-local-assignment-substitute-and-mandatory-owner-ports) defines. Client sends proposal ID, moduleId, expected revision/hash, optional reason and key. Server owns eligibility, teachingFocus/difficultyLevel, coverage/benefit assignments, warnings, order/status and new revision. Arbitrary learner/org/mastery/order is rejected.

1. Authorize assignment before resource/receipt read; load own-scope current initial draft. Reauthorize replay; exact key/body replays, key reuse conflicts.
2. Lock/CAS expected revision/hash. Stale/approved/archived proposal cannot be silently edited. If already included, return no-op after revision checks.
3. Read current Module/content/publication/suitability and related needs/dependencies through ports. Only eligible permitted content can be included; catalog downtime is not permission.
4. Construct the fixed new Module set; retain inclusion/reason/source, dedup Module costs and keep per-skill focus/difficulty/coverage/ancillary metadata. SUPPORTING does not replace an available Primary provider; INCIDENTAL cannot close a need. Include a suitable alternative before explicitly excluding the old provider if desired; no silent replacement.
5. Validate fixed-set coverage/prerequisite/internal-gate/order/freshness with the shared versioned policy. Retain separate Expert-attention fallback notes/UNKNOWN reasons and quality/totals. Do not optimize away selected Modules to restore the generation optimum. A complete feasible warning-bearing draft is VALID; missing coverage/gates remains editable UNRESOLVED; search uncertainty cannot be VALID. Dependency outage rolls back.
6. Atomically save immutable next revision/override/receipt/audit/outbox and current pointer CAS. Return resulting revision/hash/validation and reasons, not approved status. No mastery/baseline/learning access change.

Command routes remain unchanged; format2 codec/storage/DTO source now exists under shared section15, with V28 source unapplied. Original format1 identity computation/reader is retained without relabeling or immutable-row updates; actual round-trip is untested. Compulsory justification/reorder/AI regeneration is not assumed; foreign/inaccessible content cannot fix a gap.

For a previously accepted exact command, return its retained receipt after reauthorization before checking the now-old expected revision. New commands still require the current revision, including include-existing no-ops. A generation failure without a proposal is not an editable draft. Readiness results remain live; revision hash freezes gate definitions and actual content/targets/overrides as shared design section5.1 specifies.

## Failure, history and acceptance

401/403 or safe404 for forbidden scope;400/422 invalid input/eligibility;409 revision/key conflict;503 dependency outage. Unknown commit→same key/body replay. Concurrent include/exclude/confirm produces one winner; no lost updates. Do not erase previous excluded record; new override explicitly supersedes it in this initial review. Later recalculation preservation remains REQ-043 dependency.

R03–R06/R09–R14 in [test plan](../../testing/REQ-041-042-initial-pathway-test-plan.md): authorized Expert/local gates, no-op, pair/benefit/warnings, fixed-set validation, unresolved approval denial, stale/race/outage rollback/history/no unlock. Planned/Not run. [Source/build receipt](../../testing/system/REQ-041-042-v011-source-build.md) does not prove runtime behavior.

Confirmed: authorized intent/fixed-set revalidation/warnings | Source implemented/built:0.11 adaptation | Open: owner content/readiness/production assignment and runtime evidence | Rejected: implicit replacement, fake mastery/approval or tests without C3.

## Confirmed local Compose amendment ? 2026-10-28

[Shared design18](../Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md) supersedes earlier missing-planner-input labels for the explicitly gated local demo once implemented. Fixed seed availability and original compatible mastery/UNKNOWN drive planning-only prerequisite decisions; no assessment PASS/internal gate is fabricated. Main dev Compose and FE rule review are approved C2 scope. Production owner adapters and executable acceptance remain Open/Not run.
