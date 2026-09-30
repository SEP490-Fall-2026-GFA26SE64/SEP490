# View Target Roles

**Function ID:** REQ-001-F01  
**Actor:** Employee  
**Status:** Implementation base and executable test suites available; browser system evidence and production identity integration pending
**Feature:** [Target Role Selection](README.md)

## Description

Display active, catalog-valid target roles owned by the employee's organization and the competency requirements of a selected role. Viewing a role does not select it as the employee's development goal. Baseline-assessment readiness, learner proficiency, skill gap and pathway availability are separate concerns and do not control this browsing function.

**Input:** Authenticated employee, organization context, optional role-name search, and optional seniority filter.  
**Outcome:** An authorized role list and role details; no target selection is changed.

## Implementation Base Contract

This contract supports an extensible first implementation while identity, catalog publication and cross-store versioning continue to evolve.

### Data ownership

- Neo4j owns target roles, micro-skills and `REQUIRES_SKILL.targetMastery`.
- Trusted security context provides the employee identity and `organizationId`; clients must not choose the tenant in query parameters or request bodies.
- PostgreSQL assessment settings, question coverage, learner evidence, mastery and pathways are not read by this function.
- The application depends on a `TargetRoleCatalogPort`; Neo4j records are mapped at the infrastructure boundary and are not exposed directly to the API or frontend.

### TargetRole fields used by this function

| Field | Required | Purpose |
| --- | --- | --- |
| `id` | Yes | Stable technical identifier used by detail requests |
| `code` | Yes | Stable business code |
| `name` | Yes | Display and role-name search |
| `familyCode` | Yes | Role family metadata |
| `track` | Yes | Professional or management track; not seniority |
| `organizationId` | Yes | Tenant scope matched to trusted actor context |
| `seniority` | Yes | Exact grade filter: `P1`–`P5` for `PROFESSIONAL`, `M3`–`M4` for `MANAGEMENT`; not derived from code/name |
| `description` | No | Employee-facing role summary |
| `responsibilities` | No | Employee-facing responsibility list |
| `status` | Yes | Only `ACTIVE` roles are browsable |

Required proficiency is read from active `REQUIRES_SKILL.targetMastery`; it is not a learner score or readiness percentage.

### Minimal API

- `GET /api/v1/employee/target-roles?search=&seniority=`
- `GET /api/v1/employee/target-roles/{roleId}`

The list returns `id`, `code`, `name`, `track`, `seniority`, `description` and `requirementCount`. Detail additionally returns `familyCode`, `responsibilities` and requirements containing `skillId`, `skillCode`, `skillName` and `targetMastery`.

The base has no pagination or catalog revision field. Results sort by normalized role name and then stable ID. Search is a trimmed, case-insensitive role-name substring; seniority is an exact grade-code match. A professional role must use `P1`–`P5`; a management role must use `M3`–`M4`. Grade meaning may differ by domain and role family.

### Current implementation status

- Backend implements the inbound query use case, trusted actor port, Neo4j catalog adapter/mapper, REST list/detail endpoints and feature-local error mapping.
- Local development uses a server-configured actor adapter enabled only by the `local` profile and `catalog.local-actor.enabled=true`; production security remains deny-by-default until the Identity owner supplies the real actor/authorization integration.
- Frontend route `/employee/target-roles` uses TanStack Query for list/detail, search and seniority filtering, with loading, empty, retry and unavailable-detail states. Browse does not call the legacy selection flow.
- Manual local API smoke was completed on 2026-09-30. This is not executable-test evidence; unit, API/security, Neo4j integration and frontend/system tests belong to the separately approved test cluster.

## Confirmed Rules

- Employees can view organization target roles and their competency requirements.
- Other organizations' roles are not exposed through this function.
- A role is browsable only when its `organizationId` matches trusted actor context, its status is `ACTIVE`, its required fields are present, and it has at least one active `REQUIRES_SKILL` to an active skill with `targetMastery` in `[0,1]`.
- `DRAFT`, `RETIRED`, cross-organization and catalog-invalid roles are hidden. The base does not introduce separate published or archived flags.
- Display the role name, description and responsibilities, seniority level, competency requirements, and required proficiency for each micro-skill.
- The assigned Domain Expert's name is not part of the selected employee-facing field set.
- Provide search by role name and filtering by seniority. A required-micro-skill filter is not included in the selected scope.
- Search and filtering operate only on active, catalog-valid roles within the employee's organization.
- Every list or detail request checks the current organization scope, `ACTIVE` status and catalog validity.
- When the search/filter returns no results, show "No matching roles" with a **Clear filters** action.
- **Clear filters** resets the role-name search and seniority filter and reloads the permitted role list. It does not remove organization or role-visibility restrictions.
- When the organization has no roles meeting all visibility conditions even without search/filter criteria, show "No roles available. Please contact your Organization Administrator." This message does not initiate an automatic notification or support request.
- If a detail request finds that the role is inactive, belongs to another organization or has invalid catalog data, show "This role is no longer available" with a **Back to roles** action. Do not redirect automatically; **Back to roles** loads the currently permitted list.

## Acceptance Baseline

An authenticated employee can inspect permitted role requirements without modifying the role or seeing another organization's private catalog.

- List returns only `ACTIVE`, catalog-valid roles whose `organizationId` equals trusted actor context.
- `DRAFT`, `RETIRED`, cross-organization, missing-required-field, dangling-skill and invalid-`targetMastery` roles are not returned.
- Detail displays name, code, description, responsibilities, track, seniority and each active required skill with its `targetMastery`.
- Role-name search is trimmed and case-insensitive; seniority is an exact enum filter. When both are present they use AND semantics.
- Search/filter with no results shows "No matching roles" and **Clear filters**. No permitted roles without discovery criteria shows "No roles available. Please contact your Organization Administrator."
- Direct detail access to a nonexistent or unavailable role returns one public `ROLE_NOT_AVAILABLE` outcome without exposing cross-tenant existence.
- Neo4j timeout or failure produces a dependency error and retry state; it is not converted to an empty catalog or unavailable role.
- Every list/detail request checks current catalog state.
- Browse operations do not create or change target selections, assessment attempts, evidence, mastery, pathways or history.

## Decision Log

Entries before 2026-09-29 are retained as history. Where they conflict with the current contract above, the 2026-09-29 decisions supersede them for REQ-001-F01.

| Date | Question | Confirmed answer |
| --- | --- | --- |
| 2026-09-26 | Which organization target roles can an Employee browse? | Published, active roles only; draft, inactive, and archived roles are hidden. |
| 2026-09-26 | Which additional role information should employees see? | Role description and responsibilities, seniority level, and required proficiency for each micro-skill. Assigned expert name was not selected. |
| 2026-09-26 | Which search and filtering controls should employees have? | Option B: Search by role name and filter by seniority. No required-micro-skill filter. |
| 2026-09-26 | What should happen when search/filter results are empty? | Show "No matching roles" with a Clear filters action. The no-available-roles case was not decided by this answer. |
| 2026-09-26 | What should employees see when the organization has no published, active roles at all? | Option B: "No roles available. Please contact your Organization Administrator." |
| 2026-09-26 | What should happen when the viewed role becomes unavailable? | Option A: Replace its details with "This role is no longer available" and a Back to roles action; do not automatically redirect. |
| 2026-09-27 | Who should receive a blocked-start email when no active Expert is assigned? | Custom answer: A target role whose configuration is not finished must not be shown to employees. This adds a visibility gate rather than selecting an email recipient. Readiness criteria and previously selected role handling remain open. |
| 2026-09-27 | What must be configured before a published, active role becomes visible? | Option A: Baseline-ready. Role requirements and prerequisites are defined, baseline settings are saved, and eligible-question coverage passes. Learning modules and module assessments are not visibility prerequisites. |
| 2026-09-27 | What should an open role detail page show when the system detects loss of baseline readiness? | Option A: Replace the details with "This role is no longer available" and a Back to roles action, matching existing unavailable-role behavior. Do not automatically redirect. Detection timing and existing-selection learning effects remain open. |
| 2026-09-27 | Should already-open role lists and details update automatically when availability changes? | Option A: Recheck on the next request, including loading, refreshing, searching, and opening details. Always recheck before confirming selection. No background updates; idle content may remain outdated until the next request. |
| 2026-09-29 | What determines employee catalog visibility for the implementation base? | Same-organization `ACTIVE` role with required catalog fields and at least one valid active required skill. Assessment settings and question coverage do not control browsing. |
| 2026-09-29 | Where is organization scope stored initially? | `TargetRole.organizationId`, matched against trusted actor context behind `TargetRoleCatalogPort`; a future publication mapping may replace the adapter. |
| 2026-09-29 | How are seniority and responsibilities represented? | Explicit `TargetRole.seniority` and optional `TargetRole.responsibilities`; do not derive seniority from code/name. |
| 2026-09-30 | Which seniority values are valid across different job domains? | Use grade codes `P1`–`P5` for `PROFESSIONAL` and `M3`–`M4` for `MANAGEMENT`. The code is shared for filtering, while each domain/role family defines its detailed meaning. |
