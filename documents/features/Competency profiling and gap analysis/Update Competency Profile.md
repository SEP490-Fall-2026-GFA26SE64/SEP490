# Update Competency Profile

## Current Scope Alignment
System updates estimates using configured tracing and valid baseline/module evidence, including independent learning. RIASEC interests are not knowledge evidence. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

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

- Knowledge-tracing model, initial priors, evidence weights, mastery scale, and thresholds.
- Repeated attempts, conflicting evidence, missing skills, and time decay.
- Soft-skill integration, model versioning, and transfer of evidence between target roles.

## Acceptance Baseline

The updated state is attributable to assessment evidence and is not duplicated when the same submitted attempt is processed again.