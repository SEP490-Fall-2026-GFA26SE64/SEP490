# Baseline, Role selection and pathway review ? integration

Feature coverage: Role baseline configuration, frozen attempts, evidence reuse, target locks, generation, revisions and assigned Expert approval. This is not a demo rehearsal.

Detailed committed cases are maintained in the existing requirement documents:

- [REQ-002 baseline](../REQ-002-F02-baseline-authoring.md): F01?F03, S01?S02.
- [REQ-001 Role selection](../REQ-001-F02-choose-target-role.md): F04?F06, S03.
- [REQ-041/042 pathway](../REQ-041-042-initial-pathway-test-plan.md): F07?F09, S04.
- [Skill Assessment](FR-06.08-skill-assessment.md): F11/F12/S05 and backend E01.
- [Policy/certificate](FR-07.05-provision-certificate.md): F14/F15/S06/S07.
- [RIASEC](FR-WF05-06-riasec.md): F16?F18.
- [Unit/context/provision](../unit/FR-06.08-skill-assessment.md): F10/F13 and supplemental U01.
- [Browser feature check](../system/FR-06.08-skill-assessment.md): supplemental SYS01.

Together these preserve exactly F01?F18, E01, S01?S07. Do not count the same IDs again when following links.

Recorded full run: **26/26 PASS**, 2026-11-23, Java21, PostgreSQL17.6 Testcontainers and real JPA. Fixtures control graph/catalog, identity, assignment, subscription and private-file metadata as applicable. E01 is service-level backend integration, not browser end-to-end.

From backend: `mvn -o -Pbm04-wf05 test`. The profile selects only committed methods. Supplemental unit/integration checks use the separate `wf05-feature` group; see the Skill Assessment document. No dev database is used; `WF05_JDBC_URL` must be absent.

Local workspace evidence, outside the product repository: [full log](../../../../../.tools/bm04-wf05-run-20261123/fixed-full-155637.log), [execution receipt](../../../../../.tools/bm04-wf05-run-20261123/FIX_RESULT.md), [archived XML/text](../../../../../.tools/bm04-wf05-run-20261123/fixed-full-reports/). These links require the original workspace. No CI, browser or production readiness claim. Report5 unchanged.
