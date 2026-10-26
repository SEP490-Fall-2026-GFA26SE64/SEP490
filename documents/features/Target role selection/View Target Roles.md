# View Target Roles

**Function:** REQ-001-F01. **Actor:** Employee.

## Goal and position

Let an Employee inspect authorized available Roles and their Level/skill requirements before choosing a target. Browsing has no baseline, mastery or pathway prerequisite. [Unified contract](Role%20Selection%20and%20Occupation%20Baseline.md).

## Context, input and sources

Server authentication supplies active Employee and organization; clients send only discovery controls or a Role ID. The catalog port owns visibility/publication validation and maps Neo4j records into safe domain projections. Query Occupation/HAS_ROLE/TargetRole/HAS_LEVEL/Level/REQUIRES_SKILL/MicroSkill; ownership must be unique and requirements valid. IDs are stable strings. Do not invent track, seniority or responsibilities absent from the current schema.

Display Role identity/name/scope, owning Occupation, separate Levels with rank/context and skill requirements with requiredScore/isMandatory. Required proficiency is a catalog requirement, never a learner score. Shared metadata and field definitions follow [Neo4j schema](../../neo4j_schema.md).

## Read flow and output

1. Authorize actor and tenant; obtain only visible, available and valid catalog Roles.
2. Apply trimmed case-insensitive name search, Occupation filter and selected sort; bound presentation with 12-row pages. Keep deterministic stable-ID ties and reset out-of-range pages after filtering.
3. Detail rechecks availability and returns current Role/Occupation/Level requirements. Recheck on loading/refresh/search/detail and before selection; no background update requirement is introduced.
4. Return safe list/detail and discovery state. No selection, receipt, attempt, profile, audit, outbox or pathway write is permitted.

`GET /api/v1/employee/target-roles` and `GET /api/v1/employee/target-roles/{roleId}` are read boundaries. UI filtering/paging must never broaden the authorized result. The page is independent of Upskilling; existing navigation/search aliases resolve to this page.

## Failure and recovery

| Condition | Behavior |
| --- | --- |
| Unauthenticated/unauthorized | Deny without private catalog data |
| No permitted Roles | Helpful no-roles state; contact organization administrator |
| Search/filter has no matches | No matching roles; Clear filters preserves tenant restrictions |
| Missing/removed/foreign/invalid Role | Public unavailable/not-found; Back to roles action, no automatic replacement |
| Catalog timeout/failure | Dependency error and retry; never empty catalog |
| Stale open detail | Revalidate on next request and selection; never grant availability from cached UI |

## Acceptance and alignment

RB01–RB04/RB08/RB17 in the [acceptance plan](../../testing/REQ-001-002-role-baseline-flow-test-plan.md): current string IDs/Level fields, no legacy choices, scoped visibility, search/filter/paging, safe unavailable states and no domain writes. Historical tests certify only their dated contract; [current implementation alignment](../../testing/system/REQ-001-002-final-synchronization-review.md) is recorded separately.

Confirmed | Open: authoritative catalog publication/release integration.
