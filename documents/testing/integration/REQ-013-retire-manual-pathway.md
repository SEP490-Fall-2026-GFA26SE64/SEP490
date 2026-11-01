# REQ-013 — manual test grant retirement (2026-10-30)

Passed: LearningContentIntegrationTest (1/1), PostgreSQL 17.6 Testcontainers; migrations 1–35 then forward through 41. Existing asset/settings/lesson/progress/resume/notification preservation checks pass. New checks assert absent generated authorization denies admission and generated callback isolates organization, learner and module.

Command: Maven -Dtest=ManualPathwayRetirementTest,LearningContentIntegrationTest,GeneratedModuleContentAccessTest test. Combined result 3/3, no failed/skipped tests; /tmp/sep490-remove-manual-backend.log.

No schema or migration change; historical manual rows remain stored. Neo4j integration is not applicable to this removal: no graph mapper/query/catalog operation changed. The real generated pathway must still pass existing current-entry validation. This run does not certify initial generation readiness or end-to-end approved learning.
