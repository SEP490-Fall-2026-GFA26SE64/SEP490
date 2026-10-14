# View Assessment History

## Current Scope Alignment
Employee views own baseline, RIASEC and module history, including independent learning evidence. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md); old soft-skill records retain their original meaning.

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-009-F02  
**Actor:** Employee  
**Status:** Pending clarification  
**Feature:** [Assessment Results](README.md)

## Description

List the employee's previous assessment attempts and provide access to their available result details.

**Input:** Employee and optional history filters.  
**Outcome:** An own-attempt history spanning the supported assessment types.

## Confirmed Related Rule

- From [Choose Target Role](../Target%20role%20selection/Choose%20Target%20Role.md) (REQ-001-F02), 2026-09-27: After a role change, retain all previous assessment attempts in the employee's read-only history, labeled with their original role, date, and results.
- A role change does not delete previous attempts, restrict history to the current role, or relabel past attempts as belonging to the new role. This confirms retention across role changes, not an indefinite data-retention period.

## Open Decisions

- Filters, sorting, additional displayed columns beyond role/date/results, and pagination.
- How unfinished attempts are labeled and which date field is displayed.
- Whether comparisons between attempts are needed and how long history is retained.

## Acceptance Baseline

Distinct attempts remain distinguishable and cannot be confused with the employee's latest competency state.

- After a role change, all previous attempts remain accessible to the employee as read-only history with their original role, date, and recorded results, without exposing another employee's attempts.