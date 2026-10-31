# REQ-023 Manual Browser System Check

## Current Scope Alignment
This is the old-contract browser procedure, not proof of revised acceptance. Follow [current system criteria](README.md#current-scope-alignment); revalidate Expert configuration/completion, separate L&D publication/approval and current actor permissions after implementation.

## Historical Manual Procedure

Use this checklist against the local development Compose stack to verify the browser-observed end-to-end target role management and expert authoring workflows (REQ-023-F01 through REQ-023-F05).

---

## 1. Start and Verify the Stack

From the project root:

```powershell
docker compose -f compose.dev.yml up --build -d
docker compose -f compose.dev.yml ps
Invoke-RestMethod http://127.0.0.1:8088/api/v1/system/status
Invoke-RestMethod -Uri http://127.0.0.1:8088/api/v1/organizations/comp-technova/target-roles -Headers @{'X-User-Role'='LD_MANAGER'}
```

Expected:
- `postgres` and `neo4j` are healthy.
- `migrate` completed with code `0`.
- `api` is healthy and `web` is running on port `8088`.
- The target-role endpoint returns the seeded roles for `comp-technova` directly from Neo4j (`ROLE-AI-ARCH`, `ROLE-GENAI-01`, `ROLE-MLOPS-02`, `JAVA_BACKEND_P3`).

---

## 2. Check L&D Manager Target Role Creation Flow (Dynamic Levels & No Competencies)

1. Open the browser to <http://127.0.0.1:8088/ld-manager/target-roles>.
2. Confirm the active company is `comp-technova` (TecNova Technologies).
3. Click the primary **Create Target Role** button in the header.
4. Fill in the modal form:
   - **Role Code**: (Optional, auto-generated if left blank based on Title)
   - **Role Title**: `Senior Data Platform Engineer`
   - **Job Domain**: `DATA` (Data Engineering & Analytics)
   - **Career Family**: `PYTHON_DATA`
   - **Track**: `PROFESSIONAL`
   - **Seniority Levels**: Dynamic level items (e.g. `Junior`, `Middle`, `Senior`, or click `+ Add Level` to add custom levels). Verify no `context` or `mastery` fields are requested.
   - **Assigned Domain Expert**: Select `expert-chen` (Dr. Aris Chen)
   - **Description**: `Enterprise data engineer responsible for streaming ingestion and distributed lakehouse storage.`
   - Confirm that **no competency mapping card** is shown to L&D Manager (this is now the Domain Expert's responsibility).
5. Click **Initialize Role Draft**.
6. **Expected Outcome**:
   - Toast notification confirms draft role creation.
   - The new role appears in the list with a `DRAFT` status badge.
   - Levels are created with ranks and auto-generated codes, without `mastery` or `context`.
7. Refresh the browser (`Ctrl + F5`) and confirm the role remains in `DRAFT` status.

---

## 3. Check Dispatching to Domain Expert (DRAFT &rarr; SENT)

1. Locate `ROLE-DATA-ENG` in the list.
2. Click the **Send to Expert** button (or action menu option).
3. **Expected Outcome**:
   - Toast notification: `Target Role Sent to Expert`.
   - Status badge transitions from `DRAFT` to `SENT`.
   - Network inspector confirms a `PUT` request to `/api/v1/organizations/comp-technova/target-roles/{roleId}` with `status: "SENT"`.
4. Refresh the browser and confirm the status remains `SENT`.

---

## 4. Check Domain Expert Authoring (Competencies + Micro-skills Linking)

1. Navigate to the Domain Expert portal: <http://127.0.0.1:8088/expert/target-roles>.
2. Confirm user context is `expert-chen` (Dr. Aris Chen).
3. **Isolation Check**:
   - Verify that roles assigned to other experts (such as `expert-rivera`) are **not visible** in Chen's queue.
   - `ROLE-DATA-ENG` (and other assigned roles) are visible.
4. Select `ROLE-DATA-ENG` or click the Sliders icon to open the authoring modal.
5. **Authoring Competencies & Micro-skills**:
   - In **Required Competencies**: Select a competency from the live catalog (e.g. `Junior Application engineering and quality`) and click **+ Add**.
   - In **Add Micro-skill Target**: Select a micro-skill and threshold (e.g. `80%`) and click **+ Assign**.
   - Confirm both competencies and micro-skills are mapped to the role.
6. Click **Submit to L&D Manager**.
7. **Expected Outcome**:
   - Role transitions to `SUBMITTED` (`APPROVED` status for review).
   - Authoring modal closes and status updates immediately.

---

## 5. Check Successor Draft Creation by Domain Expert & Version Override

1. In Domain Expert portal (<http://127.0.0.1:8088/expert/target-roles>), locate a `PUBLISHED` role (e.g. `ROLE-AI-ARCH` v1.0).
2. Click the **New Draft** button on the published role row.
3. **Expected Outcome**:
   - Successor draft (e.g. `v1.1`) is created in Neo4j and assigned to the active expert.
   - Authoring modal opens automatically to allow configuring updated competencies and micro-skills.
4. Once completed, submit the draft.
5. In L&D Manager portal (<http://127.0.0.1:8088/ld-manager/target-roles>), publish the draft `v1.1`.
6. **Version Override Verification**:
   - When `v1.1` is published, it replaces `v1.0` as the active operational version.
   - Older published versions (`v1.0`) are superseded and hidden from standard view.

---

## 6. Check Domain Expert Cannot Reject Target Roles

1. In Domain Expert portal (<http://127.0.0.1:8088/expert/target-roles>), inspect table actions and authoring modal footer.
2. **Expected Outcome**:
   - There is **no "Reject" button** in table action columns.
   - There is **no "Reject Proposal" button** in the authoring modal footer.
   - Any manual PUT call with `X-User-Role: DOMAIN_EXPERT` and `status: REJECTED` returns `400 Bad Request` with message: *"Domain Experts can no longer reject target roles"*.

---

## 7. Check Imported Occupations on `/ld-manager/occupations`

1. Open <http://127.0.0.1:8088/ld-manager/occupations>.
2. Confirm the 5 standard O*NET occupations imported from `ontology_dataset.xlsx` render live from Neo4j:
   - `15-1212.00` — Information Security Analysts
   - `15-1243.00` — Database Architects
   - `15-1252.00` — Software Developers
   - `15-1253.00` — Software Quality Assurance Analysts and Testers
   - `15-1299.08` — Computer Systems Engineers/Architects
3. Verify search filter, status filter, and RIASEC profile bars render with real data.

---

## 8. Check Competencies Management Tab on `/expert/ontology`

1. Open <http://127.0.0.1:8088/expert/ontology>.
2. Click the **Competencies** tab in the top navigation bar.
3. **Expected Outcome**:
   - Badge counter displays live competency count (`472`).
   - The table displays Competency Code, Competency Name & Owning Level, Member Micro-skills count, and Status badge.
   - Search box filters competencies in real-time.
   - Click **View Details** (eye icon) on any competency to inspect full description, owning level, and member micro-skills list.
   - Click **+ Add Competency** to test creating a new competency.
5. Verify that `Archived` status has been removed from all filters, dropdowns, and status badges.

---

## 9. Check Live Micro-Skills & Prerequisites Ingestion on `/expert/ontology`

1. Open <http://127.0.0.1:8088/expert/ontology>.
2. **Expected Outcome**:
   - The **Micro-skills** statcard at the top displays **79** (loaded from Neo4j seed).
   - The **Competencies** statcard displays **472**.
   - The **Skill Prerequisites** statcard displays **11**.
   - The **Micro-skills Catalog** table displays all 79 seeded micro-skills (e.g. `MS-ARC01`, `MS-DE01`, etc.) with code, name, definition/description, and owning competency.
   - The **Skill Prerequisites** tab displays all 11 prerequisite sequences connecting micro-skills.

---

## 10. Check Live Learning Modules Ingestion on `/expert/modules`

1. Open <http://127.0.0.1:8088/expert/modules>.
2. **Expected Outcome**:
   - The **Total Learning Modules** statcard displays **85** (loaded from Neo4j seed).
   - The **Learning Modules Inventory** table lists all 85 instructional modules (e.g. `MOD-DE-J-MODEL-01` through `MOD-SE-S-01`).
   - Each module row displays its title, schema type (`LESSON_AND_PRACTICE`), duration (e.g. `45m`), content reference URI, status badge (`ACTIVE` / `PUBLISHED`), and the count of taught micro-skills (e.g. `3 TEACHES`).
   - Click the view/eye action on any module to verify its details and associated micro-skills.

---

## 11. Finish and Report

To stop the containers while preserving local data:

```powershell
docker compose -f compose.dev.yml down
```

Report template:

```text
Micro-skills live count (79 from Neo4j seed): PASS | FAIL
Competencies live count (472 from Neo4j seed): PASS | FAIL
Prerequisites live count (11 from Neo4j seed): PASS | FAIL
Learning Modules live count (85 from Neo4j seed): PASS | FAIL
Target Role Creation (DRAFT) in Neo4j: PASS | FAIL
Dispatch to Expert (SENT) and Isolation: PASS | FAIL
Expert Micro-Skill Linking & Publish: PASS | FAIL
Successor Draft (v1.1) Ordering & Persistence: PASS | FAIL
Browser/OS/Date:
```
