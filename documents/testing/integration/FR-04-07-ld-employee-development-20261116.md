# FR-04.07 Monitor employee development — integration evidence (2026-11-16)

| ID | Check | Result | Notes |
| --- | --- | --- | --- |
| I-01 | New native read queries (`DevelopmentReportJpaRepository`) execute against the real migrated PostgreSQL schema | Passed (via system stack) | Exercised through `/api/v1/ld/development/**` on the isolated Compose stack (fresh volumes, all workspace migrations applied); list and detail returned 200 with real members, target selection and competency data. See [system evidence](../system/FR-04-07-ld-employee-development-20261116.md). |
| I-02 | Dedicated Testcontainers repository test for the new queries | Not run | No new Testcontainers class was added; the standard Maven test compilation of the repository is currently broken by unrelated test sources, so it could not be executed in this session. Next action: add a focused repository test once the test tree compiles. |
| I-03 | Reads do not mutate learner state | Passed (unit + design) | Service never calls `CurrentRoleSelectionStore.transaction` (asserted in U-01) and reads attempts/results directly without the finalizing `readLocked` path. |
