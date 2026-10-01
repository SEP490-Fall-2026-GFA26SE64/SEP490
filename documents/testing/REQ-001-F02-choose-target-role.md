# REQ-001-F02 Choose Target Role — Test Plan

**Status:** Planned; executable tests not created or run
**Gate:** Start only after approval for implementation cluster 2

| Level | Required coverage |
| --- | --- |
| Unit/function | Initial/change/no-op policy; input and idempotency validation; stale expected selection; active-assessment block; error mapping |
| Integration | PostgreSQL transaction, unique active row, request replay/hash conflict, snapshot, revision, audit/outbox atomicity, concurrent commands, rollback on pathway/catalog failure |
| Contract | Actor/catalog/pathway ports; deterministic local/demo adapters; real Auth/Catalog adapters when delivered |
| System | Employee GET/PUT flow, confirm/cancel, same-role retry, unavailable/cross-tenant role, concurrent tabs, dependency failure |
| Regression | F01 browse/detail plus downstream selection consumers |

## Fixtures and expected invariants

- Two organizations, employees in each, active/inactive roles, one employee with and one without an active selection.
- Deterministic idempotency keys and request hashes; no development seed is used as the production oracle.
- Every scenario records actor/tenant, input, expected response/state, test method, command, date, and result.
- Tests must prove: one active selection, exactly-once revision/event, no cross-tenant disclosure, immutable snapshot, and full rollback on failure.

## Dependency rerun

After real Auth, Catalog, assessment-activity, and pathway adapters replace provisional ones, rerun contract, authorization/tenant, PostgreSQL integration, full system, and regression suites before marking F02 complete.
