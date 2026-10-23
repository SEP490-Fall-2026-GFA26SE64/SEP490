# Create Learning Module

## Current Scope Alignment
Expert creates a module in an assigned discipline and submits it to L&D for approval before organizational use; no dummy-only restriction. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

**Module–Skill mapping (v0.9.0):** A Module may teach several skills and a skill may have several teaching Modules. Return all current mapped skill IDs for authoring/viewing. Published mappings require actual teaching content; completion does not automatically pass all skills.

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-013-F01  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Learning Module Management](README.md)

## Description

Create a dummy learning module with descriptive metadata. Outcome-skill mapping is documented under Module Outcomes; real course authoring is outside scope.

**Input:** Module metadata and authorized catalog context.  
**Outcome:** A module record that can be mapped to outcomes and assessment questions.

## Open Decisions

- Required fields, duration/difficulty representation, and optional resource links.
- How assessments are associated with the module.
- Publication readiness and minimum outcomes/question coverage before recommendation eligibility.

## Acceptance Baseline

A module can be represented without video or SCORM content and cannot be created in an unauthorized catalog.