# Link Question to Micro-Skill

## Current Scope Alignment
Expert links/classifies questions to MicroSkills and authoring difficulty in assigned scope. A baseline item assesses exactly one MicroSkill; adaptive evidence strength comes from its versioned IRT parameters, not a mapping weight. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-017-F01  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Question Mapping](README.md)

## Description

Associate an authorized question with the skill evidence its answers provide.

**Input:** Question, micro-skill, and any agreed mapping attributes.  
**Outcome:** A question-to-skill assessment relationship usable by scoring and gap evaluation.

## Confirmed Related Rules

- Current adaptive contract: each baseline presentation pins exactly one assessed MicroSkill and the matching item-parameter tuple. An unmapped question or a question without valid parameter coverage is ineligible; module/RIASEC mapping policies remain separate.

## Open Decisions

- Mapping cardinality, primary versus supporting skills, and scoring distribution for module and RIASEC assessments. Baseline questions use exactly one assessed skill, without multi-skill or score weighting.
- Mapping validation against role/module context and versioning after use.

## Acceptance Baseline

A submitted answer can be traced to the question's applicable skill mapping.

- Adding a second assessed micro-skill to a baseline question is rejected without altering its existing mapping. A valid first mapping satisfies the single-skill requirement but does not bypass other eligibility checks.
