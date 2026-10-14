# View Micro-Skills

## Current Scope Alignment
Expert views micro-skills within assigned subject-matter scope. Employee skill discovery for independent learning is REQ-055, not authoring access. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-012-F02  
**Actor:** Domain Expert, L&D Manager  
**Status:** Implemented  
**Test Evidence:** [unit/REQ-012](../../testing/unit/REQ-012-micro-skill-management.md), [integration/REQ-012](../../testing/integration/REQ-012-micro-skill-management.md), [system/REQ-012](../../testing/system/REQ-012-micro-skill-management.md)  
**Feature:** [Micro-Skill Management](README.md)

## Description

Browse and inspect micro-skills that the expert or manager is authorized to access within their organization.

**Input:** Expert scope and optional search query (`q`).  
**Outcome:** Skill list and detail information for authorized records.

## Confirmed Rules

- **Multi-Tenant Isolation:** Cypher queries filter strictly by `organizationId`.
- **Search Query:** Supports case-insensitive fuzzy filtering across code and name.
- **Strict Architecture Fields:** Returns `id`, `code`, `name`, `description`, `macroCompetencyCode`, `status`, `createdAt`, `updatedAt`. Legacy mock attributes (`bloomLevel`, `observableOutcome`, `provenance`) are eliminated.
- **REST Endpoint:** `GET /api/v1/organizations/{organizationId}/micro-skills?q={optional}`

## Acceptance Baseline

Results respect the agreed knowledge ownership model and do not disclose private catalog content from other organizations.