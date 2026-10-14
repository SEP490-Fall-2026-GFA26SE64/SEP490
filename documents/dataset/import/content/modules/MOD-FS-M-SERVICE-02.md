# Middle Application services and data - Module 2: Independent troubleshooting

Module ID: MOD-FS-M-SERVICE-02. Content version: 1.1. Review: NEEDS_EXPERT_REVIEW.

## Learn

Read [the local lesson: Making service boundaries explicit](../topics/FS-SERVICE.md). It includes a conceptual explanation, worked example and a self-check with an answer. Then use the linked official resources for additional detail.

## Skill focus

- **MS-FS12: Validate application inputs** — Enforce input constraints and provide usable validation feedback on client and server.
- **MS-FS13: Enforce application authorization** — Check permissions for protected actions and resources.
- **MS-FS14: Use database transactions** — Commit related updates atomically and roll back unsuccessful operations.

## Study and practice sequence

1. Read the linked local explanation and work through its example.
2. Answer the self-check before looking at the answer.
3. Inspect the official learning resources below for the techniques used in this module.
4. Complete the assigned tasks below and record checks and evidence.

## Learning prerequisites

- Before MS-FS14, demonstrate MS-FS04: Understand data-changing operations before grouping them in a transaction.

Prerequisites taught within this module are studied first. Cross-module prerequisites are scheduled by the pathway engine. These are pending local learning-order decisions, not claims of universal occupational dependency.

## Assigned tasks and submission evidence


In Application services and data, demonstrate the following middle tasks:

- MS-FS12: Define consistent validation across layers independently; test boundaries and usable error feedback.
- MS-FS13: Implement authorization independently across actions and resources; test user and ownership boundaries.
- MS-FS14: Design transaction boundaries independently; test consistency under failures and concurrent updates.

Submit evidence:

- MS-FS12: Validation rules, client/server code and boundary/bypass test results.
- MS-FS13: Permission matrix, authorization checks and allow/deny/bypass tests.
- MS-FS14: Transaction code, boundary rationale and rollback/concurrency results.

## Official learning resources

- [MDN Fetch guide](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)

## Assessment boundary

Completion is not an attainment decision. Rubric 1.2, level-specific evidence and approved catalog dependencies are required for official assessment. This lesson has not yet received that approval.
