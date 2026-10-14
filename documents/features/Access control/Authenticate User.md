# Authenticate User

## Current Scope Alignment
Authenticate System Administrator, L&D Manager, Expert, and Employee within the internal single-organization system. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md). Legacy actor codes require explicit migration design.

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-037-F01  
**Actor:** Employee, Domain Expert, Organization Administrator, Platform Administrator  
**Status:** Pending clarification  
**Feature:** [Access Control](README.md)

## Description

Authenticate an account before providing access to protected product functions. First-time password replacement is documented separately.

**Input:** Credentials or another approved identity proof.  
**Outcome:** An authenticated session with the applicable account and organization context, or an authentication failure.

## Open Decisions

- Email/password only versus enterprise SSO; MFA requirements for privileged users.
- Session duration, concurrent sessions, logout, and inactivity handling.
- Password recovery scope, failed-attempt protection, and disabled/expired organization access.

## Acceptance Baseline

Invalid credentials do not establish a session, and passwords are never returned in authentication responses or logs.