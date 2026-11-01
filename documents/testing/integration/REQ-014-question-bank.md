# REQ-014 — Question Bank persistence integration

Date: 2026-10-30. `QuestionBankPersistenceIntegrationTest`: **1 passed**, real PostgreSQL Testcontainers, in the latest backend package run (23 tests total including unit/architecture), `/tmp/sep490-question-bank-bounded-backend.log`.

## Verified boundaries

- Existing workspace migrations through V35 followed by forward V36, repeat migration/checksum compatibility; historical migrations remain unchanged.
- Legacy question IDs/publication definitions retained, generated readable code, absent creators/reviewers left honestly absent. Authorized draft repair/review publishes through the existing item-version store.
- Full authoring aggregate, content fields, actor/timestamps, revisions, snapshots, read acknowledgement and notices persist and round-trip. Draft-only nullable fields remain legitimate nulls until entered.
- Two competing expected-revision commands produce one success and one conflict; failed bulk/import transactions leave no partial decisions.
- Same-organization membership/role recheck; cross-organization isolation; inactive member denial; cross-bank stable identity fails closed.
- Retirement removes stable questions from the real adaptive candidate query, retaining published rows/content and historical IDs; reactivation preserves the prior publication.
- Durable mail failure records retry independently of the committed question command. SMTP is simulated in this test; real local capture is a system check.
- An unresponsive graph result times out inside a real bank transaction:503, no new question/code persisted, rollback releases the organization lock and a subsequent bank read completes within the regression's bound. Async graph transport is controlled here; the SQL transaction and lock behavior are real PostgreSQL.

The graph catalog is a controlled integration dependency here, not a claim of real Neo4j acceptance. The dedicated Compose system suite uses actual Neo4j. No user development database was reset, reseeded or migrated by these tests.

Command and consistent-run receipt: [unit evidence](../unit/REQ-014-question-bank.md). The canonical V29 migration has matching SQL to workspace V36; the executed runtime fixture uses the workspace lineage. Do not apply that lineage over the learning-module-manage development database whose applied V36 has another meaning.

### Automatic codes / creation-only import — 2026-11-01

Real PostgreSQL Testcontainers scenario passed267.2s as part of25 passing focused tests (`/tmp/qb-auto-backend-final.log`). New manually created and imported Q-UUID codes round-trip through JSON aggregate and question_bank_identity; repeated confirmation adds exactly one question, preview code matches persisted code, whole invalid batches roll back, and prior history/concurrency/isolation/retirement/deadline checks remain. Existing V1–V36 checksums/migration behavior unchanged. `generatedCodes` is an additive receipt marker in the existing JSON document; old missing marker defaults false and cannot authorize new import confirmation. No Neo4j graph schema/migration changes.
