# Assign Account Role

## Current Scope Alignment
System Administrator assigns/removes System Administrator, L&D Manager, Expert, or Employee access roles under the agreed access policy. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md); old product actor names are superseded, not automatically mapped to runtime codes.

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

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