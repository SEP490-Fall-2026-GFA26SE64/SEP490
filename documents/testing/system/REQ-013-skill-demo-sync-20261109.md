# REQ-013 — development Skill data synchronization, 9 November 2026

Scope: synchronize the 79 existing Skills in the local `workspace-development` organization to the repository's development knowledge dataset, as explicitly selected by the user. This is a data operation, not a new Skill approval UI or human review.

## Source and preservation

Source: `documents/dataset/import/ontology_seed-prerequisite-knowledge.json`, SHA-256 `a73e9571b5a16cab37341cb34124db36062b0383168871b8b97fcabc9c7233f8`.

All 79 IDs, names and definitions matched before the operation. The transition required the exact old state: ACTIVE, NEEDS_EXPERT_REVIEW, version 0.12.0; no existing reviewer, review timestamp, provision configuration or outcomes. It refused authored/reviewed drift. The synchronized fields are status, review metadata/source, version, provisionMode and the three outcome code/label arrays.

The new state matches the development source: ACTIVE/APPROVED, version 0.12.1, MODULE_ONLY, Foundation/Intermediate/Advanced outcomes. Provenance is `DEVELOPMENT_KNOWLEDGE_BANK_V1`, with the declared non-login system publisher `dadcdc29-1cf2-36d1-9252-9e46c6d8413a`. Its actual account was created/verified using the existing seed account shape and `DEVELOPMENT_NO_LOGIN`; no human profile or new membership/role was created. All Skill review timestamps remain null. No human approval is asserted.

The dev API was stopped for the guarded write and restarted afterward. Full graph and PostgreSQL backups were saved privately in ignored `local/skill-knowledge-sync-20261109-202554/`; `pg_restore --list` validated the dump. The graph patch ran in one explicit transaction with locks, a concurrency check and full readback before commit. All 999 graph nodes and 4,711 relationships were compared: only the approved fields of the 79 owned Skills changed. All other nodes, all relationships and the five Job Positions were preserved. PostgreSQL fingerprints before/after the write matched for every platform table except the intentional new system publisher account. Question banks, Modules, learner progress and member assignments were not rewritten.

## Actual verification

| Check | Result |
|---|---|
| Guarded graph update/readback | Passed: 79 Skills match source; outside nodes and every relationship unchanged |
| Backup readability | Passed |
| Real Expert API | Passed: 79 eligible choices, identical source IDs; all 79 Skill DTOs have three module knowledge levels and exact outcome sets (237 total) |
| Real browser Create module | Passed: 80 options including placeholder; selected `MS-FS04`, FOUNDATION, `MS_FS04_FOUNDATION`; no empty-choice warning, Save draft enabled, 0 page errors |
| L&D assignment preservation | Passed: `ld@workspace.dev.invalid` remains LD_MANAGER in Engineering & Cognitive Systems |
| Test Module creation | Not performed: form cancelled without saving |
| Unit/build rerun | Not applicable: no application source, schema or dependency change in this data operation |

Receipts: `assets/skill-demo-sync-20261109/verification.json`, `create-module.png`, and the private backup receipt. This establishes local demo readiness of Skill choices/configuration; it is not a production approval or full learning-workflow acceptance.

Manual check: sign in as `expert@workspace.dev.invalid`, open `/workspace/workspace-development/expert/modules`, refresh, and open Create module. Select **use query languages**, knowledge level **Foundation**, and covered outcome **MS_FS04_FOUNDATION**. Supply the normal Module title/content/lesson fields before saving a real Module.
