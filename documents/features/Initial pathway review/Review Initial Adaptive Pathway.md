# Review Initial Adaptive Pathway

## Current Scope Alignment
Expert reviews the first Employee/role pathway and its evidence, includes/excludes modules through REQ-020, and confirms it before Employee starts. Initial review is mandatory, not an unresolved advisory choice. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md); reviewer allocation/re-review/reasons remain open.

## Historical Specification
The earlier mandatory-versus-advisory open question below is resolved by current scope; other details need clarification.

**Function ID:** REQ-019-F01  
**Actor:** Domain Expert  
**Status:** Implemented  
**Feature:** [Initial Pathway Review](README.md)

## Description

Review an authorized employee's initial pathway generated from their assigned occupation and chosen target role (selected directly or guided by baseline and optional RIASEC assessment). The expert inspects the curriculum evidence, includes/excludes learning modules (REQ-020-F01), requests algorithmic regeneration with feedback, or approves the pathway for the employee to begin learning.

**Input:** Employee baseline assessment result, assigned occupation, target role, and generated initial adaptive pathway.  
**Outcome:** Expert inspection, module inclusion/exclusion customization, pathway regeneration requests, or pathway approval.

## Confirmed Workflow Rules

- **Review Queue**: All generated pathways (regardless of whether role was selected directly or via optional RIASEC guidance) are routed to `/expert/pathway-review`.
- **Dedicated Desk**: The pathway review view contains strictly initial learning pathways without extraneous tabs.
- **Actions**:
  - *Include / Exclude Modules*: Expert toggles module inclusion before confirmation.
  - *Regenerate Pathway*: Expert provides replanning instructions for the system to generate an updated draft.
  - *Approve for Learning*: Expert approval unlocks the learning pathway for the employee in `/employee/pathway`.

## Acceptance Baseline

An expert can inspect the evidence behind a permitted employee's initial pathway without accessing unrelated employees.