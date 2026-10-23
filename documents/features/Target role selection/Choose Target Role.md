# Choose Target Role

**Function:** REQ-001-F02. **Actor:** Employee.

## Goal and context

Commit one authorized desired Role immediately, then evaluate the Occupation baseline next step. Selection does not wait for baseline readiness and does not start an assessment, calculate gaps or generate a pathway. [Unified contract](Role%20Selection%20and%20Occupation%20Baseline.md).

Trusted server context supplies active Employee/organization. Client sends `roleId`, `expectedCurrentSelectionId` (explicitly absent selection for initial choice) and Idempotency-Key. Actor/tenant, snapshot, timestamps, revisions and membership are server-owned. Current catalog IDs are strings; never remap historical IDs by matching names.

## Ordered operations

1. Authorize; serialize with assessment-start coordination for this learner, then lock learner state.
2. Resolve exact actor/key/hash replay; key reuse with another body conflicts. Reauthorize retained outcomes.
3. Recheck expected selection and current catalog visibility/unique Occupation ownership. Initial selection cannot overwrite another current choice.
4. Same Role is a no-op with replayable outcome. A different Role is blocked during an active assessment. Consult assessment/pathway lifecycle ports; unavailable dependencies fail without changes.
5. End the previous row and create the new immutable display snapshot and next target revision; archive the old pathway through its owning port. Commit selection, receipt, audit and outbox in one PostgreSQL transaction.
6. Return committed selection. Read next-step coverage afterward. If that read fails, retain selection and retry GET; never resend a new selection because reconciliation failed.

At most one active selection per Employee. Concurrent/stale requests cannot silently overwrite a winner. Evidence, mastery, prior attempts, snapshots and pathway history are preserved. Neo4j is read-only catalog authority; PostgreSQL owns selection and history.

## Output and events

Return selection ID, Role/Occupation display snapshot, selected time, target revision and changed/no-op outcome. Never include mastery, readiness or protected answer data in the selection snapshot. Current selection/next-step reads are read-only and return explicit no-selection state. `PUT /api/v1/employee/target-role-selection` is the command boundary; GET reads its committed state.

Audit/outbox actions are TARGET_ROLE_SELECTED / TARGET_ROLE_CHANGED, with trusted learner aggregate, committed target revision and correlation identity. Preserve the existing versioned event envelope: organizationId, learnerId, selectionId, previousSelectionId, roleId, targetRevision and occurredAt. Outbox storage does not certify notification or downstream delivery.

## Errors and recovery

| Condition | Outcome; changes |
| --- | --- |
| Missing identity/forbidden | 401/403; none |
| Unavailable/invalid/foreign Role | Safe 404; none |
| Invalid input/key | 400; none |
| Key/body mismatch, stale expected selection or competing command | 409; none |
| Assessment in progress | 409; preserve selection/pathway and offer resume |
| Catalog/activity/pathway dependency unavailable | 503; rollback all writes |
| Unknown write outcome | Retain exact key/body and retry; after known success reconcile reads only |

Pending UI commands block double submission and retain exact retry identity. Browser navigation can interrupt a pending command; it must not trigger an automatic alternative selection. Confirm initial versus replacement actions with appropriate copy.

## Acceptance and dependencies

RB03–RB05/RB09/RB11–RB13/RB16–RB17 in the [acceptance plan](../../testing/REQ-001-002-role-baseline-flow-test-plan.md) cover replay/no-op, revision, tenant/actor boundaries, transactional rollback, races, blocked changes and no-write reads. Identity, catalog publication/references, activity and pathway lifecycle are owner dependencies; [implementation alignment](../../testing/system/REQ-001-002-final-synchronization-review.md) records their actual state without changing this contract.

Confirmed | Open: cross-owner production integration.
