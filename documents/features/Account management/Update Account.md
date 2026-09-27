# Update Account

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