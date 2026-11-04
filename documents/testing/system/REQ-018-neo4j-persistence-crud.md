# System Test Evidence: REQ-018 Complete Neo4j Schema Persistence & Zero-Mock Reload Verification

## 1. Test Overview

- **Requirement IDs**: REQ-012, REQ-015, REQ-016, REQ-018, REQ-023
- **Test File**: `frontend/system-tests/REQ-018-neo4j-persistence-crud.spec.ts`
- **Execution Target**: Full Docker Compose Stack (`compose.dev.yml`) with PostgreSQL (`adapt-learn-graph-dev-postgres-1`), Neo4j 5.26 (`adapt-learn-graph-dev-neo4j-1`), Spring Boot API (`adapt-learn-graph-dev-api-1`), and Vite Frontend (`web-1`).
- **Primary Schema Truth**: `documents/ARCHITECTURE.md` and `documents/neo4j_schema.md` (Ontology v0.9.0).

---

## 2. Test Objectives & Matrix

| Step | Entity / Node | Operation | Endpoint | Reload Persistence Check | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `MicroSkill` | Create & Read | `POST /api/v1/organizations/{orgId}/micro-skills` | Verified in graph and table across hard page reload | **PASS** |
| **2** | `LearningModule` | Create & Read | `POST /api/v1/organizations/{orgId}/learning-modules` | Verified in graph and table across hard page reload | **PASS** |
| **3** | `Job Position` | Create & Read | `POST /api/v1/organizations/{orgId}/job positions` | Verified in graph and table across hard page reload | **PASS** |
| **4** | `TargetRole` | Create & Read | `POST /api/v1/organizations/{orgId}/target-roles` | Verified in graph and table across hard page reload | **PASS** |

---

## 3. Automated Playwright Test Output

```
Running 1 test using 1 worker

  ok 1 [system-chrome] › system-tests\REQ-018-neo4j-persistence-crud.spec.ts:6:3 › REQ-018 Complete Neo4j Schema Persistence & Zero-Mock Reload Verification › MicroSkill, LearningModule, Job Position, TargetRole, and Competency persist across page reloads (15.7s)

  1 passed (18.5s)
```

---

## 4. Key Implementation Changes

1. **Backend Job Position CRUD Endpoints & Cypher Repository**:
   - `backend/src/main/java/com/adaptlearngraph/repository/Job PositionRepository.java`: Added `findByIdOrCode`, `save`, and `delete`.
   - `backend/src/main/java/com/adaptlearngraph/repository/Neo4jJob PositionRepository.java`: Implemented Cypher `MERGE (o:Job Position {code: $code})` persisting RIASEC profile weights (`realistic`, `investigative`, `artistic`, `social`, `enterprising`, `conventional`), `name`, `jobZone`, and `status`.
   - `backend/src/main/java/com/adaptlearngraph/apis/Job PositionController.java`: Added `POST`, `PUT`, `DELETE` endpoints under `/api/v1/organizations/{orgId}/job positions`.
2. **Backend MicroSkill & Competency Repository Alignment**:
   - `Neo4jMicroSkillRepository.java`: Updated Cypher `MERGE` to set `s.definition = $description` and `s.version = '0.9.0'` per `neo4j_schema.md` Section 3.5.
   - `Neo4jCompetencyRepository.java`: Added `c.attainmentRule = $attainmentRule` to Cypher `ON MATCH SET`.
3. **Frontend Live API Wiring**:
   - `frontend/src/shared/api/job positionApi.ts`: Created typed API client for Job Position CRUD.
   - `frontend/src/features/manager/job positions/Job PositionsManagementPage.tsx`: Wired `handleSaveJob Position` and `handleToggleStatus` directly to `job positionApi`.
   - `frontend/src/features/manager/modules/LearningModulesPage.tsx`: Wired `handleSaveModule`, `handleCreateSuccessorDraft`, `handleDeleteDraftModule`, `handleToggleTeachesSkill`, `handlePublishModule`, and `handleConfirmArchive` directly to `learningModuleApi.ts`.
4. **Mock Data Purge**:
   - `frontend/src/shared/stores/companyStore.ts`: Bumped cache key to `adaptlearn_companies_v4` and cleared initial mock arrays (`competencies: []`, `microSkills: []`, `prerequisites: []`, `modules: []`, `targetRoles: []`).
   - `frontend/src/features/manager/data/ldManagerMockData.ts`: Cleared legacy mock arrays (`INITIAL_PREREQUISITES`, `INITIAL_COMPETENCIES`, `INITIAL_MICRO_SKILLS`, `INITIAL_MODULES`).
   - `frontend/src/app/App.tsx`: Added redirect `/manager/job positions` $\rightarrow$ `/ld-manager/job positions`.

---

## 5. Manual Browser Verification Procedure

### Prerequisites
- Docker Compose dev stack active:
  - Backend API: `http://localhost:18080`
  - Frontend: `http://localhost:8088`
- User role: L&D Manager / Expert (`persona: 'ld'`).

### Verification Steps
1. **Micro-Skill Creation & Persistence**:
   - Navigate to `http://localhost:8088/expert/ontology` (or `/manager/ontology`).
   - Click the top right **Create** button.
   - Enter Skill Code (e.g. `SKILL-CYPHER-TEST`), Title, and Description.
   - Click **Create Micro-skill**.
   - Perform a hard browser reload (`Ctrl + F5` or `Cmd + Shift + R`).
   - Search for `SKILL-CYPHER-TEST` in the table search bar $\rightarrow$ Verify item is still present and populated with real backend Neo4j data.
2. **Learning Module Creation & Persistence**:
   - Navigate to `http://localhost:8088/expert/modules` (or `/manager/modules`).
   - Click **Create**.
   - Enter Unique Module Code (e.g. `MOD-CYP-TEST`), Title, and Content URI.
   - Click **Create Module**.
   - Perform a hard browser reload (`Ctrl + F5`).
   - Search for `MOD-CYP-TEST` $\rightarrow$ Verify module persists with version `1.0` and draft status.
3. **Job Position Creation & Persistence**:
   - Navigate to `http://localhost:8088/ld-manager/job positions` (or `/manager/job positions`).
   - Click **Create**.
   - Enter O*NET Code (e.g. `15-9999.00`), Title, and Summary.
   - Click **Create Job Position**.
   - Perform a hard browser reload (`Ctrl + F5`).
   - Search for `15-9999.00` $\rightarrow$ Verify job position persists in Neo4j and renders in the directory table.
4. **Target Role Creation & Persistence**:
   - Navigate to `http://localhost:8088/ld-manager/target-roles` (or `/manager/target-roles`).
   - Click **Create**.
   - Enter Role Code (e.g. `ROLE-ARCH-TEST`), Title, and select Job Position.
   - Click **Save as Draft**.
   - Perform a hard browser reload (`Ctrl + F5`).
   - Search for `ROLE-ARCH-TEST` $\rightarrow$ Verify target role persists and is displayed with status `DRAFT`.
