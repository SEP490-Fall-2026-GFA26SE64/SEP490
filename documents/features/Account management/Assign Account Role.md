# Assign Account Role

**Function ID:** REQ-022-F05  
**Actor:** Organization Administrator  
**Status:** Pending clarification  
**Feature:** [Account Management](README.md)

## Description

Assign permitted organization-level access roles to an organization account. These actor roles differ from Software Engineering target roles.

**Input:** Organization account and selected actor role(s).  
**Outcome:** Updated organization-level permissions.

## Open Decisions

- One actor role per account versus multiple roles.
- Whether administrators can appoint other Organization Administrators and how self-demotion works.
- Session refresh/revocation, audit requirements, and handling removed expert permissions.

## Acceptance Baseline

Platform Administrator privileges cannot be assigned by an Organization Administrator.