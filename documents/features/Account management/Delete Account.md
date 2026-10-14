# Delete Account

## Current Scope Alignment
System Administrator deactivates accounts while preserving required history. The legacy function ID/name is retained; physical deletion is not inferred from current scope. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-022-F04  
**Actor:** Organization Administrator  
**Status:** Pending clarification  
**Feature:** [Account Management](README.md)

## Description

Remove an organization account according to the agreed retention policy while respecting assessment history and ownership dependencies.

**Input:** Organization account and removal request.  
**Outcome:** Deletion/deactivation or a blocked request under the agreed policy.

## Open Decisions

- Deactivation, anonymization, or hard deletion and retention periods.
- Last-administrator protection, self-deletion, and reassignment of expert-owned roles.
- Session revocation, subscription seat release, and historical reporting treatment.

## Acceptance Baseline

Account removal must not leave unauthorized active access or silently orphan learning records.