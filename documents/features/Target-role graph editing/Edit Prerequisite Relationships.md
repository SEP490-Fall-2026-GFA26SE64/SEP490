# Edit Prerequisite Relationships

**Function ID:** REQ-018-F02  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Target-Role Graph Editing](README.md)

## Description

Create, modify, or remove authorized micro-skill prerequisite relationships used in pathway generation and recalculation.

**Input:** Skill pair, dependency direction, and requested graph change.  
**Outcome:** An updated prerequisite relationship after applicable validation.

## Open Decisions

- Mandatory versus optional prerequisites, weights, and cross-role dependencies.
- Cycle prevention, minimum proficiency conditions, and missing-node validation.
- Draft/publish workflow, concurrent edits, and impact on active pathways without expanding automatic recalculation triggers.

## Acceptance Baseline

The resulting dependency direction is unambiguous and only authorized relationships are changed; exact validity rules remain to be agreed.