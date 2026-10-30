# Use database transactions

Module ID: MOD-MS-FS14. Catalog: 0.8.0. Content version: 2.0. Review: NEEDS_EXPERT_REVIEW.

Primary and only teaching skill: **MS-FS14 — Use database transactions**.

Commit related updates atomically and roll back unsuccessful operations.

## Study material

This module consolidates existing source-linked material for this skill. Read only the sections relevant to this skill; integrated examples may mention supporting skills without claiming to teach or assess them. Content depth and role suitability still require expert review.

- [MDN Fetch guide](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [the local lesson: Making service boundaries explicit](../topics/FS-SERVICE.md)

## Focused practice

Choose the practice appropriate to the selected Level. These are retained local proposals, not official framework scoring standards.

### Practice adapted from MOD-FS-J-SERVICE-02

- Implement a supplied atomic update and demonstrate rollback on a guided failure.
- Transaction code, boundary rationale and rollback/concurrency results.

### Practice adapted from MOD-FS-M-SERVICE-02

- Design transaction boundaries independently; test consistency under failures and concurrent updates.
- Transaction code, boundary rationale and rollback/concurrency results.

### Practice adapted from MOD-FS-S-SERVICE-02

- Compare transaction strategies across complex interactions; justify consistency and recovery trade-offs.
- Transaction code, boundary rationale and rollback/concurrency results.

## Readiness and assessment

- Confirm readiness for MS-FS04; proposed threshold 0.75.

Assessment tasks, rubric/version selection and evidence rules belong to the assessment service/documentation, not to this ontology. Completing this module alone does not establish skill attainment at every Level. Missing evidence is NOT_ASSESSED, not a score of zero.

## Source trace

- [Earlier teaching material: MOD-FS-J-SERVICE-02](../../../sources/ontology_v07_history/modules/MOD-FS-J-SERVICE-02.md)
- [Earlier teaching material: MOD-FS-M-SERVICE-02](../../../sources/ontology_v07_history/modules/MOD-FS-M-SERVICE-02.md)
- [Earlier teaching material: MOD-FS-S-SERVICE-02](../../../sources/ontology_v07_history/modules/MOD-FS-S-SERVICE-02.md)
