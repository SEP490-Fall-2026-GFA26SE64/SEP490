# Baseline Knowledge Assessment

## Current scope

**Source:** [System Overview](../../adapt_learn_graph_system_overview.md). **Requirement:** REQ-002. **Actors:** L&D Manager configures; Employee later completes the published assessment.

REQ-002-F02 Occupation-scoped authoring is implemented and executable-tested on the local opt-in boundary. One Occupation owns one logical blueprint containing all current roles. L&D may explicitly distribute a role total, adjust detailed counts and percentage weights, switch EN/VI without losing unsaved state, and keep multiple role panels open. A zero-total role stays visible but contributes no coverage demand, generated item or score.

```text
Neo4j Occupation and role-skill catalog
  -> L&D saves immutable PostgreSQL blueprint version
  -> aggregate published-question coverage
  -> deterministic no-repeat assessment manifest
  -> exact-hash review and immutable publication
```

Production Identity authorization and Catalog tenant visibility/publication/release snapshots are still dependencies. Employee attempt/resume, response persistence, scoring/evidence/mastery and RIASEC are not part of the completed authoring slice.

Executable evidence is in [REQ-002-F02 testing](../../testing/REQ-002-F02-baseline-authoring.md).

## Functions

| Function | Status |
| --- | --- |
| [Configure Baseline Assessment](Configure%20Baseline%20Assessment.md) | Occupation-scoped authoring and UX/i18n delta implemented/tested locally; production adapters open. |
| [Complete Baseline Assessment](Complete%20Baseline%20Assessment.md) | Deferred; requires a separate define/implementation/test gate. |
