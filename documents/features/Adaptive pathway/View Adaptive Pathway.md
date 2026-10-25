# View Adaptive Pathway

## Current Scope Alignment
Employee follows the initial pathway only after Expert review and confirmation; pathway modules remain system-selected, with authorized Expert overrides. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

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
- Current adaptive-baseline dependency: Blueprint replacement, disablement or stale catalog fingerprint governs new baseline starts only. It does not erase completed mastery or independently pause/archive an existing pathway; module and module-assessment authorization still applies.

## Open Decisions

- List, graph, or both; progress indicators and module status vocabulary.
- Whether expert review blocks visibility or assessment access.
- Sequential unlocking versus access to every assigned module; empty, generating, and stale pathway states.
- Navigation to archived pathway history and the historical details displayed.
- The continuation decision does not settle requirement-version handling, generation, or recalculation when role configuration changes; those remain governed by the corresponding functions. Module availability and assessment eligibility details still require clarification.

## Acceptance Baseline

The displayed sequence matches the employee's current authorized pathway and does not offer employee editing controls.

- An archived pathway is distinguishable from the active pathway and remains read-only, with no resume or start-assessment action. Returning to its target role does not reactivate it.
- Given an active pathway with otherwise accessible modules and eligible assessments, a later Blueprint availability/catalog change does not hide the pathway or remove recorded progress. An independently unavailable module or assessment remains restricted, and an archived pathway remains non-resumable.

## Decision Log

| Date | Question | Confirmed answer |
| --- | --- | --- |
| 2026-10-20 | Does an adaptive Blueprint change invalidate an existing pathway? | No. It controls new baseline starts and does not erase completed mastery or independently pause/archive a pathway. |
