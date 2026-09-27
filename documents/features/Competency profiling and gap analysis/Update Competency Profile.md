# Update Competency Profile

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