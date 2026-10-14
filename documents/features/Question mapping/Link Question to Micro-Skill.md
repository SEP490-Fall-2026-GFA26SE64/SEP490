# Link Question to Micro-Skill

## Current Scope Alignment
Expert links/classifies module questions to micro-skills and difficulty in assigned scope for evidence/tracing. Baseline eligibility/cardinality needs L&D policy agreement. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

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

- From [Configure Baseline Assessment](../Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md), 2026-09-27, option A: A baseline question assesses exactly one micro-skill. Its coverage and answer evidence belong to that skill; multiple assessed-skill mappings are not supported for baseline questions. An unmapped question is not eligible for baseline use.

## Open Decisions

- Mapping cardinality, primary versus supporting skills, and scoring distribution for module and soft-skill assessments. Baseline questions use exactly one assessed skill, without multi-skill weighting.
- Mapping validation against role/module context and versioning after use.

## Acceptance Baseline

A submitted answer can be traced to the question's applicable skill mapping.

- Adding a second assessed micro-skill to a baseline question is rejected without altering its existing mapping. A valid first mapping satisfies the single-skill requirement but does not bypass other eligibility checks.