# Baseline Knowledge Assessment

## Current scope

**Source:** [System Overview](../../adapt_learn_graph_system_overview.md). **Requirement:** REQ-002. **Actors:** L&D Manager configures; Employee later completes the published assessment.

REQ-002-F02 Occupation-scoped management is implemented on the local opt-in boundary. One organization + Occupation owns one release line with immutable Blueprint/assessment history, at most one pending chain, one open candidate and one active assessment. L&D may create/resume/finalize a Blueprint revision, generate/edit/review/publish an assessment, replace reviewed content, restore history, disable the active version or abandon pending work. Active and open candidate may coexist; publish atomically switches the active pointer.

```text
Neo4j Occupation and role-skill catalog
  -> L&D manages one PostgreSQL release line and working revision
  -> finalize immutable blueprint version
  -> aggregate published-question coverage
  -> deterministic no-repeat editable Draft
  -> exact-hash review
  -> atomic active publication with immutable history
```

Normal management DTOs never expose protected answers. A separate audited `no-store` reveal is enabled only in local/demo and awaits Person 1's production permission/separation-of-duty contract. Production Identity authorization and Catalog tenant visibility/publication/release snapshots remain dependencies. Employee attempt/resume, response persistence, scoring/evidence/mastery and RIASEC are outside this authoring Function.

Current FE 83/83 and full BE 204/204, including PostgreSQL V1–V17 and Neo4j Testcontainers, passed on 2026-10-19. Concurrent management commands and the updated Compose/Playwright lifecycle still need execution; see the evidence document for the exact scope.

Executable evidence is in [REQ-002-F02 testing](../../testing/REQ-002-F02-baseline-authoring.md).

## Functions

| Function | Status |
| --- | --- |
| [Configure Baseline Assessment](Configure%20Baseline%20Assessment.md) | Occupation-scoped lifecycle management implemented locally; Docker-backed management evidence and production adapters remain open. |
| [Complete Baseline Assessment](Complete%20Baseline%20Assessment.md) | Deferred; requires a separate define/implementation/test gate. |
