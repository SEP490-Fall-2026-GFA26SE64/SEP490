# Include Pathway Module

**Function:** REQ-020-F01. **Actor:** assigned Expert. **Contract updated:** 2026-10-29.
Business requirements: [FR-05.07](../../../features/Pathway%20review/README.md#fr-05-07).

## Goal and preconditions

Add an eligible Catalog module or restore an Excluded module to the existing initial draft. Inclusion adjusts the fixed selected set and can repair missing coverage/prerequisites; it grants no approval, mastery or learning access. Require current trusted Expert/org/assignment, existing AWAITING_EXPERT_REVIEW proposal and exact current expected revision/hash. UNRESOLVED is editable; approved/archive and generation failures without a draft are not.

## Input, output and protected fields

POST `/api/v1/expert/initial-pathways/{id}/inclusions`: opaque pathway ID, moduleId, expectedRevision, expectedContentHash, optional reason <=2000 characters, Idempotency-Key. Actor/org/learner/assignment, eligible teaching pairs, providers, order, validation and timestamps come from the server. Unknown request properties are rejected.

Return pathwayId, resulting revision/revisionContentHash, reviewStatus, validationStatus and diagnostics in a retained receipt. Authorized detail exposes actual grouped modules, per-skill teaching metadata, warnings/quality/dependencies and safe gaps. No protected answer/theta/SE or client-owned approval/order/mastery is accepted or exposed.

## Ordered flow

1. Authenticate and authorize assignment before existence/receipt reads. Validate command shape and exact expected tuple.
2. Reauthorize exact receipt replay before checking the now-current revision. Same key/body returns the accepted outcome; changed body conflicts. An unseen command must match the editable current draft.
3. If already selected, return current-revision no-op: no duplicate module/revision/override, but store the accepted receipt after current selection/binding/assignment checks. A new stale key still conflicts.
4. Otherwise resolve current pinned configuration/binding and planning problem through graph, suitability, availability and readiness ports. Require a matching offer that can cover a learning need; ineligible/foreign/unavailable content cannot be included.
5. Add only the requested module, append INCLUDE/reason and validate the exact new set. Dedup totals by module; keep actual per-skill PRIMARY/SUPPORTING/INCIDENTAL, difficulty, coverage/ancillary role, UNKNOWN/fallback warnings and source pins. Review may reassign providers within the set but cannot silently remove/add other selected modules or infer global Primary absence from an exclusion.
6. When explicit Expert order exists, preserve valid relative order and insert new prerequisite providers before dependents. Without an explicit move, use deterministic dependency-valid server order. Internal gates and valid external evidence remain required; titles and difficulty do not establish prerequisites.
7. Persist a VALID or editable UNRESOLVED revision. Advisory warnings alone are not blocking; incomplete coverage/gates/cycles/search uncertainty cannot be VALID. A dependency outage is an error, not fabricated missing evidence.
8. Under learner coordination, recheck receipt/expected tuple/current selection/binding/assignment; atomically save revision, module ordinals/teaching/dependencies, override, pointer CAS, receipt, audit/outbox. Roll back the whole write on failure.
9. Reconcile authorized detail and run a fresh Check. Follow-up Check failure does not erase the successful Include or require a new mutation key. Preview and exact final approval remain REQ-019-F01.

## Alternative and failure flows

Catalog→Included and eligible Excluded→Included drag/drop are the same intent as Include/Restore buttons. Ignore external/same-list/stale drag payloads. Lock all edit surfaces during pending/unknown outcome, preview and approved/archive states. An ineligible excluded item stays visible with Restore disabled.

400 rejects invalid body/key; 401/403/safe404 protects scope; 422 MODULE_NOT_ELIGIBLE rejects unsuitable membership; 409 rejects stale revision/selection, reused key with different body or invalid lifecycle; 503 reports dependency/integrity failure without a partial edit. Unknown outcome retains the exact key/body; a recorded success is reconciled with GET, never reinterpreted as approval.

## History, implementation and acceptance

A new INCLUDE changes current membership without deleting earlier EXCLUDE/REMOVE/MOVE history. REMOVE returns an eligible module to neutral Catalog and is distinct from Exclude. No catalog, baseline/profile/progress or learning-authority write belongs here. Later recalculation is a separate dependency.

InitialPathwayReview.edit/mutate, InitialReviewOrder and JdbcInitialRevisions implement this path at cced745. PostgreSQL holds revisions/history; catalog reads stay in Neo4j. Preserve original format1/2 content identities and applied V28/V35; no backfill, old migration edit or down-migration. Runtime gates/production owner limitations and the Check repair lifecycle gap are described in the [review contract](../Initial%20pathway%20review/Review%20Initial%20Adaptive%20Pathway.md).

R01/R03–R05/R07/R09–R14 and P19 map eligibility/no-op, order preservation, fixed-set/warnings, repair, scope/CAS/replay/failure/no-unlock/history in the [test plan](../../../testing/REQ-041-042-initial-pathway-test-plan.md). The [dated receipt](../../../testing/system/REQ-002-041-042-workspace-integration.md) contains bounded HTTP repair observations; it does not pass executable cases or all production/security branches.

Status: Confirmed.
