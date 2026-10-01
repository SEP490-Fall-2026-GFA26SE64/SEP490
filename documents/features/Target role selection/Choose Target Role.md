# Choose Target Role

**Function ID:** REQ-001-F02
**Actor:** Employee
**Status:** Clarified — implementation pending
**Feature:** [Target Role Selection](README.md)

## 1. Business outcome

Record one active target role for the current employee. An initial selection takes effect immediately; a role change requires employee confirmation and atomically ends the previous selection.

```text
Employee confirms role
  -> authorize trusted actor/organization
  -> recheck role availability
  -> block change if an assessment is active
  -> lock learner state and verify expected selection
  -> archive old pathway through a port when changing role
  -> write selection + revision + audit + outbox
  -> return the committed selection
```

## 2. Contract

### API

- `GET /api/v1/employee/target-role-selection`
- `PUT /api/v1/employee/target-role-selection`

### PUT input

| Field/context | Required | Rule |
| --- | --- | --- |
| `roleId` | Yes | Stable catalog role ID selected from F01 |
| `expectedCurrentSelectionId` | Required for role change | Omit only for initial selection |
| `Idempotency-Key` header | Yes | Same actor + key + same payload replays the stored outcome; a different payload is rejected |
| actor, `organizationId` | Trusted context | Never accepted from the request body |

### Output

`selectionId`, `roleId`, minimal immutable `roleSnapshot`, `selectedAt`, `targetRevision`, and `changed`.

`roleSnapshot` contains only `id`, `code`, `name`, `track`, and `seniority`. It must not contain requirements, mastery, readiness, or pathway data.

## 3. Confirmed rules

- At most one active selection per employee; selecting the already-active role is a no-op.
- An initial request cannot silently replace an existing selection; the client must send its expected current selection.
- Role availability is rechecked against trusted organization scope, `ACTIVE` status, and catalog validity.
- A role change is blocked while a baseline, soft-skill, or module assessment is in progress.
- Lock `learner_state`, compare `expectedCurrentSelectionId`, then end the old row and create the new row in one PostgreSQL transaction.
- A successful command increments `learner_state.target_revision` once and emits exactly one `TARGET_ROLE_SELECTED` or `TARGET_ROLE_CHANGED` outbox event.
- The old pathway is archived through `PathwayArchivePort`; assessment history, evidence, and mastery are not deleted or relabeled.
- Selection does not start baseline, calculate gaps, generate a pathway, reuse soft-skill results, or deliver notifications.

## 4. Persistence

| Object | Purpose |
| --- | --- |
| `target_selection` | Active/history rows; `role_snapshot` preserves the role display at selection time |
| `target_selection_request` | Command idempotency: key, request hash, status, and replayable committed outcome |
| `learner_state.target_revision` | Optimistic/current target revision |
| `audit_event`, `outbox_event` | Audit trail and downstream trigger in the same transaction |

`role_snapshot` is nullable only for compatibility with pre-V7 rows. Every new F02-created selection must write it.

## 5. Observable errors

| Condition | Result; state change |
| --- | --- |
| Unauthenticated / forbidden | `401` / `403`; none |
| Role unavailable, invalid, or cross-tenant | Public `404`; none |
| Missing/invalid input or idempotency key | `400`; none |
| Same key with different request hash | `409`; none |
| Expected selection is stale | `409`; none |
| Assessment in progress | `409`; none |
| Catalog unavailable | `503`; none |

## 6. Local/demo and dependencies

- **Provisional Auth:** server-side configured actor/organization behind the actor-context port; local/demo flag only.
- **Provisional Catalog:** deterministic Neo4j role and matching PostgreSQL catalog reference/snapshot seed; development only.
- **Provisional guards:** configured `AssessmentActivityGuardPort` and pathway status mapping behind `PathwayArchivePort`.
- Completion requires real adapters from Identity/Catalog/Pathway owners, production deny-by-default, and rerun of authorization, tenant, contract, integration, system, and regression tests.

## 7. Acceptance criteria

1. Initial selection creates one active row, snapshot, revision, audit, and one selected event.
2. Confirmed eligible change ends the old row and creates one new active row atomically.
3. Same-role retry/no-op does not increment revision or emit a duplicate event.
4. Duplicate idempotency request returns the stored outcome; key reuse with another payload is rejected.
5. Concurrent/stale changes cannot create two active rows or silently overwrite the winner.
6. Cross-tenant, unavailable-role, assessment-active, and dependency-failure paths leave selection/pathway unchanged.
7. Old pathway is archived through its port; evidence, mastery, and assessment history remain intact.

Executable tests are not yet created or run. The approved plan is in [../../testing/REQ-001-F02-choose-target-role.md](../../testing/REQ-001-F02-choose-target-role.md).
