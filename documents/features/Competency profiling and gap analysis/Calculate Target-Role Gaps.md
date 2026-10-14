# Calculate Target-Role Gaps

## Current Scope Alignment
System compares evidence-based competency estimates with selected-role requirements, including proficiency and relative importance. Exact gap measures remain open. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-041-F02  
**Actor:** Automated system  
**Status:** Pending clarification  
**Feature:** [Competency Profiling and Gap Analysis](README.md)

## Description

Compare the employee's competency evidence with selected target-role requirements to identify remaining skill gaps and relevant prerequisite deficits.

**Input:** Competency state, required proficiency, and prerequisite relationships.  
**Outcome:** Skill-level gaps usable by generation, explanation, and recalculation evaluation.

## Open Decisions

- Gap formula, aggregation weights, and confidence/unknown-evidence handling.
- Prerequisite propagation and technical versus soft-skill treatment.
- Thresholds for material gaps and behavior when role requirements change.

## Acceptance Baseline

Each reported gap references a role requirement and the applicable employee evidence; unknown evidence is not silently treated as proven mastery.