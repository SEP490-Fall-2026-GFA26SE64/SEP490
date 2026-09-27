# Enforce Permissions and Organization Isolation

**Function ID:** REQ-037-F02  
**Actor:** Automated system, serving the four human actors  
**Status:** Pending clarification  
**Feature:** [Access Control](README.md)

## Description

Authorize each protected operation using actor permissions, organization membership, ownership, and expert assignments. Apply the same restrictions to graph access, reports, and exports.

**Input:** Authenticated identity, requested operation, and target resource.  
**Outcome:** Authorized access or a denied operation without unauthorized data disclosure.

## Open Decisions

- Exact permission matrix, multiple actor roles, and multiple organization memberships.
- Shared-catalog access, expert employee-review scope, and platform support access.
- Subscription restrictions, authorization audit records, and mid-session permission changes.

## Acceptance Baseline

Changing resource identifiers cannot expose another organization's private records; organization administrators cannot grant platform privileges.