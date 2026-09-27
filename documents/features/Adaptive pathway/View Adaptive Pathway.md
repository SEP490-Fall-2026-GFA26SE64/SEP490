# View Adaptive Pathway

**Function ID:** REQ-004-F01  
**Actor:** Employee  
**Status:** Pending clarification  
**Feature:** [Adaptive Pathway](README.md)

## Description

Display the employee's generated module sequence and module statuses. The employee cannot add, exclude, reorder, or choose pathway modules.

**Input:** Employee's target role and current pathway.  
**Outcome:** A read-only pathway view with access to the relevant module details and assessments.

## Confirmed Related Rule

- From [Choose Target Role](../Target%20role%20selection/Choose%20Target%20Role.md) (REQ-001-F02), 2026-09-26: Changing the target role archives the previous pathway as read-only history, preserving its recorded sequence and progress. The archived pathway cannot be resumed, including after returning to that role.
- Only the selected role may have an active pathway. Archived pathways do not permit edits or new assessment attempts; archiving does not remove mastery evidence available for the agreed role-change baseline rules.
- From the role-readiness interview, 2026-09-27, option A: Loss of baseline readiness alone does not interrupt learning through an existing active pathway. Employees may continue accessing its modules and module assessments subject to their own authorization and availability checks. Do not pause or archive that pathway solely because baseline setup becomes unready. Catalog visibility and baseline-start restrictions remain separate.

## Open Decisions

- List, graph, or both; progress indicators and module status vocabulary.
- Whether expert review blocks visibility or assessment access.
- Sequential unlocking versus access to every assigned module; empty, generating, and stale pathway states.
- Navigation to archived pathway history and the historical details displayed.
- The continuation decision does not settle requirement-version handling, generation, or recalculation when role configuration changes; those remain governed by the corresponding functions. Module availability and assessment eligibility details still require clarification.

## Acceptance Baseline

The displayed sequence matches the employee's current authorized pathway and does not offer employee editing controls.

- An archived pathway is distinguishable from the active pathway and remains read-only, with no resume or start-assessment action. Returning to its target role does not reactivate it.
- Given an active pathway with otherwise accessible modules and eligible assessments, loss of the role's baseline question coverage does not hide that pathway or block its learning actions. Preserve progress. An independently unavailable module or assessment remains restricted, and an archived pathway remains non-resumable.

## Decision Log

| Date | Question | Confirmed answer |
| --- | --- | --- |
| 2026-09-27 | Should existing pathway learning continue if the role loses baseline readiness? | Option A: Continue modules and module assessments, subject to their own availability checks. Baseline readiness loss alone does not pause the existing pathway. |