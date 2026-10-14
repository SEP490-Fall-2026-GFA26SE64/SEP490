# Set Required Proficiency

## Current Scope Alignment
Assigned Expert sets required proficiency and relative importance for role competencies/micro-skills; representation needs schema agreement. L&D does not edit these requirements. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-015-F03  
**Actor:** Domain Expert  
**Status:** Implemented  
**Feature:** [Role Requirements](README.md)

## Description

Maintain the benchmark proficiency threshold for a role's required micro-skill so diagnostic gap analysis and adaptive pathway generation can compare employee mastery with the defined target.

**Input:** Authorized draft target role, linked micro-skill requirement, and threshold percentage (1–100%).  
**Outcome:** A validated `targetMastery: Float [0, 1]` property stored on the `[:REQUIRES_SKILL]` relationship in Neo4j.

## Confirmed Related Rules

- **Scale Representation & Storage**:
  - UI Input: integer percentage between `1%` and `100%` with slider and numerical step inputs.
  - Neo4j Graph Storage: normalized `targetMastery: Float` ranging from `0.01` to `1.0`.
- **Elimination of Weights**: All linked micro-skills have benchmark thresholds; weighting has been eliminated per Schema V5.
- **Publication Requirement**: All micro-skill requirements linked to a role must possess a valid threshold (&ge; 1%) before the role can be published.
- **In-Progress Attempt Isolation**: Ongoing baseline attempts retain their starting skill requirements and thresholds; updated thresholds apply to new diagnostic attempts.

## Acceptance Baseline

Gap analysis can compare employee proficiency against the role's required benchmark on a unified `[0, 1]` mastery scale.

- **Acceptance Criteria**: Validation blocks publication if any linked threshold is outside `[1, 100]%`.
- **Test Evidence**: Target role authoring modal validation and publication checklist modal.