# Generate Soft-Skill AI Comments

## Current Scope Alignment
Retired REQ-044-F01; follow the [disposition](README.md#current-scope-alignment) and [target role guidance](../Target%20role%20guidance/README.md), REQ-048, generated from baseline/RIASEC for Expert review.

## Historical Specification
The material below is not a current implementation requirement.

**Function ID:** REQ-044-F01  
**Actor:** Automated system  
**Status:** Pending clarification  
**Feature:** [Soft-Skill AI Comments](README.md)

## Description

Generate comments connecting soft-skill assessment evidence to the employee's selected target role and make the output available for expert review.

**Input:** Permitted soft-skill evidence, role expectations, and agreed evaluation rubric.  
**Outcome:** Identifiable AI-generated comments associated with the evidence and target role.

## Related Policy Requiring Revalidation

- In [Choose Target Role](../Target%20role%20selection/Choose%20Target%20Role.md) (REQ-001-F02), 2026-09-26, the user selected reuse of existing soft-skill results with newly generated AI comments relative to the new role, but explicitly requested revalidation.
- Clarified on 2026-09-26: Revalidation means revisiting the product decision later. This role-change policy remains provisional and deferred in Choose Target Role; no operational validation step, additional approval workflow, or result validity period is introduced by this decision.

## Open Decisions

- AI provider/model, prompt/rubric, language, output sections, and evidence references.
- Personal data minimization, provider retention, disclosure, and inappropriate/unsupported output handling.
- Generation trigger, retries, cost limits, employee visibility, and effect on pathway decisions.

## Acceptance Baseline

AI comments are distinguishable from verified assessment results and remain subject to the agreed human review process.