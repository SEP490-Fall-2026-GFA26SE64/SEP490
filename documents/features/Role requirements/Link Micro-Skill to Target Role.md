# Link Micro-Skill to Target Role

## Current Scope Alignment
Assigned Expert adds competency/micro-skill requirements with proficiency/importance and submits completed configuration; L&D reviews/publishes, not edits requirements. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-015-F01  
**Actor:** Domain Expert  
**Status:** Implemented  
**Feature:** [Role Requirements](README.md)

## Description

Connect an active micro-skill to an assigned target role with a defined proficiency threshold (`targetMastery: Float [0, 1]`) so diagnostic gap analysis and pathway generation treat it as a role benchmark.

**Input:** Assigned target role, selected micro-skill from catalog, and required threshold percentage (1–100%).  
**Outcome:** A `(:TargetRole)-[:REQUIRES_SKILL {targetMastery: Float}]->(:MicroSkill)` graph relationship in Neo4j.

## Confirmed Related Rules

- **Exclusivity to Domain Experts**: Only the authorized assigned Domain Expert (`assignedExpertId`) can link micro-skills to a target role. L&D Managers cannot link micro-skills.
- **Elimination of Weights & Mandatory Flags**: Per Neo4j Schema V5, redundant `weight` and `mandatory` flags are not used; all linked micro-skills represent role benchmarks.
- **Searchable Dropdown Selection**: The authoring dialog incorporates top-level search filtering across active micro-skills with clear code and outcome descriptions per UI-UX Pro Max standards.
- **Draft Isolation**: Requirement link additions apply to `DRAFT` roles without altering published role versions.

## Acceptance Baseline

Only experts authorized for the target role can add its skill requirements.

- **Acceptance Criteria**: Role cannot be published with 0 linked micro-skills.
- **Test Evidence**: Target role authoring modal in frontend and graph schema integration.