# Target Role Selection

**Requirement:** REQ-001
**Actor:** Employee

Employees browse organization-scoped target roles, inspect requirements, and choose one development goal. Browsing is read-only; choosing changes transactional state.

## Functions

| Function | Scope | Status |
| --- | --- | --- |
| [View Target Roles](View%20Target%20Roles.md) | List/detail same-organization, `ACTIVE`, catalog-valid roles | Clarified; local/demo base implemented |
| [Choose Target Role](Choose%20Target%20Role.md) | Create or replace the employee's single active selection | Clarified; implementation pending |

## Shared boundary

- Neo4j owns current role catalog data; PostgreSQL owns selection, revision, audit, outbox, and historical snapshots.
- Tenant and actor identity come from trusted context, never client-supplied identity fields.
- Selection rechecks role availability but does not check baseline settings or question coverage.
- Baseline, gap, pathway generation, soft-skill reuse, and notification delivery belong to downstream Functions.
- Local/demo may use flagged server-side actor and deterministic seed; production remains deny-by-default until Auth and Catalog adapters are integrated.
