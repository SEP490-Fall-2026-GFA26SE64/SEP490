# Choose Target Role

## Current Scope Alignment
Employee selects/confirms an available published role after Expert-reviewed baseline/RIASEC guidance. Earlier immediate selection before baseline, publication-independent eligibility and per-role baseline sequence need reclarification. Existing history/idempotency protections remain candidates for the revised contract, not proof it is implemented. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification and Decision Log
Conflicting confirmed rules, actors and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-001-F02
**Actor:** Employee
**Status:** Local implementation base — Clusters 1–4 complete/pass; production owner adapters remain provisional
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

GET returns `204 No Content` when there is no active selection. A present GET result uses `changed=false`; PUT returns `200 OK` and preserves the original application outcome for idempotent replay.

The frontend contract parses and validates the selection snapshot and revision before caching it. A prepared choose command owns one generated idempotency key, which is reused by its mutation execution; a successful mutation invalidates the current-selection query. The P12 confirmation flow prepares that command once when the action opens and guards both repeated open and submit events.

The server-backed catalog UI marks the active role, disables selecting it again, and uses separate initial/change confirmation copy. The dialog retains its prepared command during submission, blocks duplicate confirmation, and distinguishes stale, assessment-active, unavailable-role, in-progress, and dependency errors. It does not accept a deadline/readiness benchmark or claim that selection immediately recalculates a pathway.

The F02 page now uses the server selection as its only selection source of truth. Its active-role summary renders loading, dependency-error/retry, empty, and current-selection states from the same cached query as the catalog. The previous unreferenced legacy page containing the mock hero and selection handler was removed after confirming it had no route, export, or import consumer. F02 does not write or synchronize the server result into localStorage or the shared mock employee state. Employee overview, assessment, gap-analysis, and pathway consumers of that legacy state remain a separate migration follow-up owned by their respective Functions.

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
| `target_selection_request` | Command idempotency: key, request hash, status, and replayable committed outcome including the original `changed` value |
| `learner_state.target_revision` | Optimistic/current target revision |
| `audit_event`, `outbox_event` | Audit trail and downstream trigger in the same transaction |

`role_snapshot` is nullable only for compatibility with pre-V7 rows. Every new F02-created selection must write it.

### P6 event envelope — confirmed

- Outbox `event_type`: `TARGET_ROLE_SELECTED` or `TARGET_ROLE_CHANGED`.
- `aggregate_id`: trusted learner ID; `source_revision`: committed target revision.
- `correlation_id`: target-selection request ID.
- Payload version 1: `organizationId`, `learnerId`, `selectionId`, nullable `previousSelectionId`, `roleId`, `targetRevision`, and `occurredAt`.
- Audit action matches the outbox event type, uses the new selection as resource, and records outcome `SUCCEEDED`.

## 5. Observable errors

| Condition | Result; state change |
| --- | --- |
| Unauthenticated / forbidden | `401` / `403`; none |
| Role unavailable, invalid, or cross-tenant | Public `404`; none |
| Missing/invalid input or idempotency key | `400`; none |
| Same key with different request hash | `409`; none |
| Expected selection is stale | `409`; none |
| Assessment in progress | `409`; none |
| Request still pending or selection state conflict | `409`; none |
| Catalog, assessment guard, or pathway dependency unavailable | `503`; none |

## 6. Local/demo and dependencies

- **Provisional Auth:** server-side configured actor/organization behind the actor-context port; local profile/flag only.
- **Provisional Catalog:** deterministic Neo4j role and matching PostgreSQL catalog reference/snapshot seed; development only.
- **Runtime join:** F02 first rechecks the role through the F01 catalog port using the trusted organization, then resolves exactly one `TARGET_ROLE` reference from the PostgreSQL release currently marked `OPEN`. A malformed/mismatched role or missing/ambiguous reference is a dependency failure; selection never creates a catalog reference.
- **Provisional assessment guard:** local/demo property `TARGET_SELECTION_LOCAL_ASSESSMENT_IN_PROGRESS` supplies a server-side blocking result until the assessment owner provides a lifecycle query. It is not production evidence.
- **Provisional pathway archive:** local/demo JDBC adapter changes only the matching learner/selection pathway from `PUBLISHED_CURRENT` to `SUPERSEDED`. It rejects a current pathway belonging to another selection. The current schema does not persist `archivedAt`, and `SUPERSEDED` remains subject to pathway-owner confirmation.
- Temporary dependency beans require `learning.target-selection.local-dependencies.enabled=true` and only load in `local` or `demo`; production remains without this bypass.
- The assembled F02 use case currently loads only in the `local` profile and consumes the configured F01 actor context. Production has no temporary actor fallback and remains deny-by-default until the real Identity adapter is delivered.
- The temporary REST controller and its GET/PUT security allowance load only in `local` when `catalog.local-actor.enabled=true`. CSRF is ignored only for this configured-actor selection endpoint; the production security chain remains unchanged and denies it.
- **Deterministic local seed:** the migrate flow uses stable IDs for organization/account/learner, two Neo4j roles (Java Backend Developer P3 and Platform Engineer P4), the catalog release, and matching immutable PostgreSQL role references. Existing learner revision and selection data are preserved; the seed never creates an active target selection. The second role exists only to exercise change/stale/concurrency/system paths and is not production catalog data.
- Completion requires real adapters from Identity/Catalog/Pathway owners, production deny-by-default, and rerun of authorization, tenant, contract, integration, system, and regression tests.
- Dependency handoff is bidirectional: when Auth, Catalog, assessment activity/status, gap, pathway, notification, or synchronization contracts are finalized or changed, the owning feature must trigger a recheck of F01/F02 ports, provisional adapters, UI assumptions, documentation, and affected tests before F02 can be considered integrated.

## 7. Acceptance criteria

1. Initial selection creates one active row, snapshot, revision, audit, and one selected event.
2. Confirmed eligible change ends the old row and creates one new active row atomically.
3. Same-role retry/no-op does not increment revision or emit a duplicate event.
4. Duplicate idempotency request returns the stored outcome; key reuse with another payload is rejected.
5. Concurrent/stale changes cannot create two active rows or silently overwrite the winner.
6. Cross-tenant, unavailable-role, assessment-active, and dependency-failure paths leave selection/pathway unchanged.
7. Old pathway is archived through its port; evidence, mastery, and assessment history remain intact.

Cluster 2 T1–T6 completed on 2026-10-02. The final clean backend regression passed 84 tests across 17 suites; frontend Vitest passed 30 tests across eight files; the T4 command passed eight tests after adding the repeatable two-reference seed regression. Full Compose API scenarios passed initial/replay/no-op/conflict/outage recovery plus stale, competing role change, and assessment-active state preservation. Pre-Cluster-4 cleanup made the Playwright setup handle both an empty and existing selection, added executable stale/competing-change coverage, and verified accessible F02 dialogs; two Playwright 1.63.0 headless-Chrome scenarios passed. See [../../testing/REQ-001-F02-choose-target-role.md](../../testing/REQ-001-F02-choose-target-role.md) for commands and evidence. The recording F01 port and local/demo dependencies are not real Identity/Catalog/Assessment/Pathway owner integration, so production completion remains gated.
