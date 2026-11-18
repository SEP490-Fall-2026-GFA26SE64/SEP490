# Organization knowledge graph viewer — integration evidence (2026-11-18)

**Environment:** Testcontainers Neo4j (Docker Desktop, Windows 11).

**Command:** `cd backend; .\mvnw.cmd test -Dtest=Neo4jOrganizationKnowledgeGraphReaderIntegrationTest` (Testcontainers).

| ID | Scenario | Expected | Result |
| --- | --- | --- | --- |
| I-01 (DOD-2, DOD-5) | Two organizations seeded with JobPosition → TargetRole → Level → Competency → MicroSkill, Level-REQUIRES_SKILL, MicroSkill prerequisites, LearningModule-TEACHES, MicroSkill-REQUIRES_CERTIFICATE | Reader returns only the requested organization's nodes and all eight relationship types | Passed |
| I-02 (Q5 rule) | ARCHIVED nodes and an INACTIVE (superseded) REQUIRES_CERTIFICATE relationship present | Only ACTIVE nodes (TargetRole ACTIVE or PUBLISHED) and ACTIVE relationships whose endpoints are both visible are returned | Passed |

Result: **2/2 Passed**, 0 failures/errors/skips.
