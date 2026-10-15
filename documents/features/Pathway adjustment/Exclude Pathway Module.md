# Exclude Pathway Module

## Current Scope Alignment
Authorized Expert excludes a module during initial pathway review before confirming Employee access; Employee cannot override modules. Dependency/reason/override preservation rules remain open. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-020-F02  
**Actor:** Domain Expert  
**Status:** Pending clarification  
**Feature:** [Pathway Adjustment](README.md)

## Description

Exclude a module from an employee pathway under authorized expert review, independently of automatic failure-driven recalculation.

**Input:** Reviewed pathway, selected module, and any required justification.  
**Outcome:** An expert-adjusted pathway with the agreed exclusion behavior.

## Open Decisions

- Exclusion of prerequisite, in-progress, or completed modules.
- Required replacement when exclusion leaves a role gap uncovered.
- Whether exclusion is permanent across recalculations and how history and notifications are handled.

## Acceptance Baseline

An Employee cannot exclude modules; the system must not silently interpret expert exclusion as evidence of skill mastery.