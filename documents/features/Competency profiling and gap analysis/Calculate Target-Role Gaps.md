# Calculate Target-Role Gaps

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