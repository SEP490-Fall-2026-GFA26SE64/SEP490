# View Competency Graph

## Current Scope Alignment
Employee views own competency estimates, role requirements, gaps and learning relationships, not an unrestricted graph editing surface. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-006-F01  
**Actor:** Employee  
**Status:** Pending clarification  
**Feature:** [Competency Graph](README.md)

## Description

Show the employee's target-role requirements, assessed skill state, gaps, and relevant learning relationships in a personal graph. This is visualization, not graph editing.

**Input:** Authorized competency state and target-role graph.  
**Outcome:** A read-only graph of the employee's development context.

## Open Decisions

- Node/edge types to display by default and whether modules or questions appear.
- Skill-state legend, unknown-skill display, filters, search, and detail panels.
- Large-graph limits and access to historical competency snapshots.

## Acceptance Baseline

The graph distinguishes assessed evidence from target requirements without exposing other employees' private states.