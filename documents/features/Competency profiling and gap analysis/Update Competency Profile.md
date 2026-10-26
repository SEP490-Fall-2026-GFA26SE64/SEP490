# Update Competency Profile

## Current Scope Alignment
System initializes each assessed skill from finalized adaptive-baseline theta/SE/mapped mastery once, then applies later module/independent-learning evidence through the configured BKT model. Baseline answers are not applied again as individual BKT evidence. RIASEC interests are not knowledge evidence. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-041-F01  
**Actor:** Automated system  
**Status:** Pending clarification  
**Feature:** [Competency Profiling and Gap Analysis](README.md)

## Description

Derive and update an employee's skill state using assessment evidence and question-to-skill mappings. Module viewing alone is not evidence of mastery.

**Input:** Valid scored attempts, applicable mappings, and previous skill state.  
**Outcome:** Updated competency evidence/state for the employee.

## Open Decisions

- BKT parameters/thresholds, confidence propagation and mapping of later evidence; baseline mapping is independently versioned.
- Repeated attempts, conflicting evidence, missing skills, and time decay.
- Soft-skill integration, model versioning, and transfer of evidence between target roles.

## Acceptance Baseline

The updated state is attributable to assessment evidence and is not duplicated when the same submitted attempt is processed again.
