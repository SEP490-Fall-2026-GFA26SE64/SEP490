# View Accounts

## Current Scope Alignment
System Administrator views accounts and their status under authorized access rules. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md); this is not a platform multi-organization dashboard.

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-022-F02  
**Actor:** Organization Administrator  
**Status:** Pending clarification  
**Feature:** [Account Management](README.md)

## Description

Browse and inspect accounts within the administrator's organization.

**Input:** Organization context and optional account filters.  
**Outcome:** An organization-scoped account list and account details.

## Open Decisions

- List columns, search, role/status filters, and pagination.
- Visibility of inactive accounts, invitation status, and last activity.
- Personal details visible here versus assessment evidence available through progress reporting.

## Acceptance Baseline

Account browsing cannot expose another organization's accounts or any stored password material.