# Recalculate Adaptive Pathway

## Current Scope Alignment
System revises remaining system-selected modules when new evidence changes learning needs. Exact revision criteria and override preservation remain open; automatic revision after every result is not inferred. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Failure-Driven Specification
Conflicting triggers and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-043-F02  
**Actor:** Automated system  
**Status:** Pending clarification  
**Feature:** [Conditional Pathway Recalculation](README.md)

## Description

Revise the system-selected pathway only after failed-question gap evaluation determines that a change is necessary. Explain the changes using the identified gap and prerequisite evidence.

**Input:** Positive recalculation decision, current pathway, competency state, and eligible modules.  
**Outcome:** A revised pathway and explanation, or an explicit inability to produce a valid revision.

## Open Decisions

- Reuse of generation objective and preservation of completed/in-progress modules.
- Expert override precedence, prerequisite protection, and review of revised paths.
- Versioning, simultaneous submissions, no-solution cases, and notification timing.

## Acceptance Baseline

The operation requires a justified recalculation decision and never allows the employee to choose replacement modules manually.