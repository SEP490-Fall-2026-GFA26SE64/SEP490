# REQ-001-F02 Choose Target Role — Test Plan

**Status:** Planned; executable tests not created or run
**Gate:** Start only after approval for implementation cluster 2

| Level | Required coverage |
| --- | --- |
| Unit/function | Initial/change/no-op policy; input and idempotency validation; GET empty/current and PUT response mapping; replay preserves the original `changed` value; stale expected selection; active-assessment block; HTTP 400/401/403/404/409/503 mapping |
| Integration | PostgreSQL transaction, unique active row, request replay/hash conflict, snapshot, revision, audit/outbox atomicity and payload v1, concurrent commands, rollback on pathway/catalog failure |
| Contract | F01 actor UUID mapping; trusted organization availability recheck; current-release reference resolution; malformed/mismatched/missing/ambiguous catalog dependency; assessment/pathway ports; configured assessment block/allow; provisional pathway archive/no-pathway/mismatched-selection behavior; real owner adapters when delivered |
| System | Employee GET `204`/current and PUT `200` flow, required idempotency header, confirm/cancel, same-role retry, unavailable/cross-tenant role, concurrent tabs, dependency failure, local-only allowance and production deny |
| Regression | F01 browse/detail plus downstream selection consumers |

## Fixtures and expected invariants

- Two organizations, employees in each, active/inactive roles, one employee with and one without an active selection.
- Deterministic idempotency keys and request hashes; the local cross-store seed has stable IDs and remains setup data only, never the production oracle.
- Every scenario records actor/tenant, input, expected response/state, test method, command, date, and result.
- Tests must prove: one active selection, exactly-once revision/event, no cross-tenant disclosure, immutable snapshot, and full rollback on failure.

## Dependency rerun

After real Auth, Catalog, assessment-activity, and pathway adapters replace provisional ones, rerun contract, authorization/tenant, PostgreSQL integration, full system, and regression suites before marking F02 complete.
