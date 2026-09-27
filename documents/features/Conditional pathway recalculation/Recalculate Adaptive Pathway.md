# Recalculate Adaptive Pathway

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