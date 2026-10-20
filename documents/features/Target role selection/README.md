# Target Role Selection

## Current Scope Alignment

**Source:** [System Overview](../../adapt_learn_graph_system_overview.md); REQ-001. **Actor:** Employee. **Status:** Entry dependency synchronized with approved REQ-002 contract.
Employee views an authorized available role and selects/confirms it immediately. Selection does not wait for baseline: a completed mastery-producing baseline for the role's Occupation satisfies the dependency; otherwise the role remains selected and that Occupation baseline is required before gap/pathway steps. Baseline identity is Employee + Occupation, not Employee + role.

## Historical Contract and Evidence
The retained details below describe the prior contract, not acceptance of revised scope.

**Requirement:** REQ-001
**Actor:** Employee

Employees browse organization-scoped target roles, inspect requirements, and choose one development goal. Browsing is read-only; choosing changes transactional state.

## Functions

| Function | Scope | Status |
| --- | --- | --- |
| [View Target Roles](View%20Target%20Roles.md) | List/detail same-organization, `ACTIVE`, catalog-valid roles | Local implementation/test review complete; production adapters provisional |
| [Choose Target Role](Choose%20Target%20Role.md) | Create or replace the employee's single active selection | Local implementation/test/Cụm-4 review complete; production adapters provisional |

## Shared boundary

- Neo4j owns current role catalog data; PostgreSQL owns selection, revision, audit, outbox, and historical snapshots.
- Tenant and actor identity come from trusted context, never client-supplied identity fields.
- Selection rechecks role availability but does not check baseline settings or question coverage.
- Baseline, gap, pathway generation, soft-skill reuse, and notification delivery belong to downstream Functions.
- When a dependent Function finalizes or changes its contract—especially Auth, catalog availability, assessment activity/status, gap, pathway lifecycle, or notifications—its owner must recheck F01/F02 ports, provisional adapters, UI assumptions, and affected tests; completion downstream does not automatically make the current Choose implementation compatible.
- Local/demo may use flagged server-side actor and deterministic seed; production remains deny-by-default until Auth and Catalog adapters are integrated.
