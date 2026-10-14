# Update Account

## Current Scope Alignment
System Administrator updates account information and activation/deactivation status. Employee-editable personal fields belong to REQ-056. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-022-F03  
**Actor:** Organization Administrator  
**Status:** Pending clarification  
**Feature:** [Account Management](README.md)

## Description

Update an existing organization account's permitted attributes. Access-role assignment is documented separately.

**Input:** Organization account and modified attributes.  
**Outcome:** Validated account changes within the same authorized organization.

## Open Decisions

- Editable identity/contact fields and whether email changes require verification.
- Whether suspension/reactivation is included and how existing sessions are handled.
- Audit information, self-edit restrictions, and any effect on expert assignments.

## Acceptance Baseline

An administrator cannot use account updates to move a user into an unauthorized organization or grant platform privileges.