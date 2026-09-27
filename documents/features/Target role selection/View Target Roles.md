# View Target Roles

**Function ID:** REQ-001-F01  
**Actor:** Employee  
**Status:** In clarification  
**Feature:** [Target Role Selection](README.md)

## Description

Display only published, active, baseline-ready target roles within the employee's organization and the competency requirements of a selected role. Viewing a role does not select it as the employee's development goal. For this visibility gate, fully configured means baseline-ready as defined below.

**Input:** Authenticated employee, organization context, optional role-name search, and optional seniority filter.  
**Outcome:** An authorized role list and role details; no target selection is changed.

## Confirmed Rules

- Employees can view organization target roles and their competency requirements.
- Other organizations' roles are not exposed through this function.
- Only published, active roles whose configuration is complete are visible. Draft, inactive, archived, and incompletely configured roles are hidden from employee browsing. Publication and active status alone do not establish configuration completeness.
- Baseline readiness requires defined role requirements and prerequisite relationships, saved baseline assessment settings, and passing eligible-question coverage for the configured role-and-prerequisite scope. Apply the established cap-per-difficulty rule: with cap 5, each scope skill needs at least 5 eligible Easy, 5 Medium, and 5 Hard questions. A previously successful configuration save alone is not proof that current question coverage still passes.
- Mapped learning modules and their module assessments are not prerequisites for employee role visibility. Baseline readiness does not guarantee that a complete learning pathway can already be generated. Publication, active status, and organization isolation remain separate requirements.
- Display the role name, description and responsibilities, seniority level, competency requirements, and required proficiency for each micro-skill.
- The assigned Domain Expert's name is not part of the selected employee-facing field set.
- Provide search by role name and filtering by seniority. A required-micro-skill filter is not included in the selected scope.
- Search and filtering operate only on published, active, fully configured roles within the employee's organization.
- Recheck current role availability on every list or detail request, including loading, refreshing, searching, changing or clearing filters, opening details, and returning to the role list. Check organization authorization, publication, active status, and baseline readiness. Do not use background polling or pushed updates to refresh idle role lists or details.
- An already-open page may retain previously returned content until the next request; it is not proof of current availability. Always recheck availability before confirming an initial selection or role change, as specified in [Choose Target Role](Choose%20Target%20Role.md). Reject an unavailable candidate without changing the existing selection or pathway.
- When the search/filter returns no results, show "No matching roles" with a **Clear filters** action.
- **Clear filters** resets the role-name search and seniority filter and reloads the permitted role list. It does not remove organization or role-visibility restrictions.
- When the organization has no roles meeting all visibility conditions even without search/filter criteria, show "No roles available. Please contact your Organization Administrator." This message does not initiate an automatic notification or support request.
- When the system detects that the viewed role has become unpublished, inactive, archived, or no longer baseline-ready, replace its details with "This role is no longer available" and a **Back to roles** action. Do not automatically redirect the employee. This includes loss of eligible-question coverage while the role remains published and active.
- **Back to roles** returns to the currently permitted role list. This browsing behavior does not itself change an existing target-role selection or pathway; those lifecycle rules belong to the selection and learning functions.
- Related selection decision, 2026-09-27: An already-selected role remains selected after baseline readiness loss even though it is excluded from new catalog responses. New baseline attempts are blocked until readiness is restored; existing attempts may continue with their preserved configuration. See [Choose Target Role](Choose%20Target%20Role.md). This does not authorize catalog details or a new selection of the unavailable role.
- Related evidence-only decision, 2026-09-27: An already-selected role can have its baseline fulfilled through evidence with valid requirements, prerequisites, and saved settings, even when question coverage fails, provided no unknown skills remain in the resolved scope. This closes the employee-role allowance without a test attempt or score. The role remains hidden from new catalog responses while coverage fails; this exception does not authorize catalog details or a new selection.
- Existing-pathway decision, 2026-09-27, option A: Learning through an existing active pathway continues after baseline readiness loss, including modules and module assessments, subject to their own availability and authorization checks. This is separate from catalog visibility: the role remains excluded from catalog responses while unready. See [View Adaptive Pathway](../Adaptive%20pathway/View%20Adaptive%20Pathway.md).

## Open Decisions

- Request-time availability checks and no background updates are confirmed. Detailed validation of role requirements and prerequisite relationships belongs to those authoring functions; consistency when setup changes during a check or selection remains to be defined.
- Open-detail behavior, existing-selection retention, blocking new question-based baseline attempts, continuation of preserved attempts, evidence-only scope-and-settings checks, and continuation of existing-pathway learning are confirmed. Effects on soft-skill assessment remain open. Readiness loss alone does not archive a pathway or delete history; generation and recalculation details belong to the corresponding functions.
- The missing-Expert email fallback was not selected. Reconcile the earlier blocked-start notification policy with baseline-ready-only discovery and later readiness loss for existing selections; browsing an empty role list still sends no notification.

## Acceptance Baseline

An authenticated employee can inspect permitted role requirements without modifying the role or seeing another organization's private catalog.

- Given baseline-ready published/active, baseline-incomplete published/active, and draft roles in the same organization, employee browsing returns only baseline-ready published/active roles.
- A published, active organization role with defined requirements and prerequisites, saved baseline settings, and passing coverage can appear even if its learning modules or module assessments are not ready. Missing saved baseline settings or failing coverage keeps it hidden even when modules are ready.
- For cap 5, a scope skill with only 4 eligible Easy questions fails readiness even if it has 5 Medium and 5 Hard questions. A role that passes coverage but is draft or inactive remains hidden.
- Inactive and archived roles are excluded even if they were previously published.
- An available role's details show its description, responsibilities, seniority, required skills, and the target proficiency associated with each micro-skill.
- Role-name search and the seniority filter narrow the permitted role list without exposing draft, inactive, archived, incompletely configured, or other-organization roles. Direct access to employee-facing catalog details must not expose an incompletely configured role either; this does not decide historical or existing-learning views.
- Given search/filter criteria with no matching permitted roles, show "No matching roles" and **Clear filters**.
- Activating **Clear filters** removes both discovery criteria and reloads only published, active, fully configured roles in the employee's organization; it does not change the employee's target-role selection.
- Given an organization with no roles meeting all visibility conditions and no search/filter criteria, show "No roles available. Please contact your Organization Administrator." This includes the case where all roles have unfinished configuration. Do not expose hidden roles or automatically contact the administrator.
- Given an open role detail view, when the system detects that the role is no longer published and active, replace the details with "This role is no longer available" and **Back to roles**, without an automatic redirect.
- Given an open detail view for a published, active role, when the system detects that its baseline readiness no longer passes, replace the details with the same unavailable message and **Back to roles**. Do not retain the role details or automatically navigate away. This UI change does not itself alter an existing selection, pathway, assessment attempt, or history.
- Activating **Back to roles** returns to the authorized role list, which excludes the unavailable role and applies the agreed empty-state behavior if necessary.
- Given a role loses readiness after a list or detail response, an idle page sends no background availability checks and receives no automatic availability updates. The next list request excludes that role; the next detail request shows the agreed unavailable state without automatically redirecting.
- Given an outdated page still presents a role as available, an initial-selection or role-change request rechecks current availability. If readiness has been lost, reject it without changing the current selection or pathway. Restoring readiness permits the role to appear on a later request only if all other visibility conditions also pass.

## Decision Log

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