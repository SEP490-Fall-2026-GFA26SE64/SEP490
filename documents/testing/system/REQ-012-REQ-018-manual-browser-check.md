# Manual Browser Verification Checklist: REQ-012 & REQ-018

## Current Scope Alignment
This is the old-contract browser procedure, not proof of revised acceptance. Follow [current system criteria](README.md#current-scope-alignment); revalidate discipline/role assignments and publication boundaries after implementation.

## Historical Manual Procedure

**Features Covered:**
- **REQ-012**: Micro-skill Management (Create, View, Update, Delete)
- **REQ-018**: Target-Role Graph Editing (View Target-Role Graph, Edit Prerequisite Relationships)

**Target Actors:** Domain Expert (`expert-chen`), L&D Manager (`ld-manager-sarah`)  
**Target Environment:** Local dev stack (`frontend` running at `http://127.0.0.1:5173`, `backend` running at `http://127.0.0.1:8088`)

---

## 1. Prerequisites & Setup

1. Backend running with PostgreSQL and Neo4j (`docker compose -f compose.dev.yml up -d`).
2. Frontend dev server running (`npm run dev` in `frontend/`).
3. Browser opened to `http://localhost:5173`.
4. Role switcher set to **L&D Manager** or **Domain Expert**.

---

## 2. Test Procedures for REQ-012 (Micro-Skill Management)

### Scenario 12.1: View Micro-Skills in Competency Ontology
- **Path:** Navigate to `Competency Ontology` (`/manager/ontology`).
- **Steps:**
  1. Scroll down to the **Micro-Skills (Atomic Learning Units)** data table.
  2. In the search bar above the table, type `Docker` or `Java`.
- **Expected Results:**
  - Table filters dynamically in real-time.
  - Architectural fields displayed in columns: **Skill Code** (`code`), **Skill Name** (`name`), **Parent Macro-Competency** (`macroCompetencyCode`), **Status** (`status`), **Updated At** (`updatedAt`).
  - No legacy mock fields (`bloomLevel`, `observableOutcome`, `ruleRef`) are visible.

### Scenario 12.2: Create a New Micro-Skill
- **Path:** `Competency Ontology` (`/manager/ontology`).
- **Steps:**
  1. Click the **+ New Skill** button above the micro-skills table.
  2. Modal opens:
     - **Skill Code:** `K8S-HELM`
     - **Skill Name:** `Helm Package Manager & Chart Orchestration`
     - **Macro-Competency:** Select `DEV-01 (Cloud-Native Infrastructure & DevOps)`
     - **Description:** `Deploys and versions Kubernetes workloads using Helm templating.`
  3. Click **Create Micro-Skill**.
- **Expected Results:**
  - Modal closes, green toast notification appears.
  - Table automatically refreshes and displays `K8S-HELM`.
  - Node is created in Neo4j with label `:MicroSkill` linked via `(:MacroCompetency)-[:HAS_SKILL]->(:MicroSkill)`.

### Scenario 12.3: Update Existing Micro-Skill
- **Path:** `Competency Ontology` (`/manager/ontology`).
- **Steps:**
  1. Find `K8S-HELM` in the table and click the **Edit** (pencil) icon.
  2. Change the name to `Helm 3 Package Manager & Chart Orchestration`.
  3. Click **Save Changes**.
- **Expected Results:**
  - Skill name updates immediately in the table.
  - Neo4j node attributes updated in database.

### Scenario 12.4: Delete Micro-Skill In Use vs. Unused (Conflict Check)
- **Path:** `Competency Ontology` (`/manager/ontology`).
- **Steps:**
  1. Find a micro-skill that is required by a target role or has prerequisites (e.g., `SKILL-JAVA-CORE`). Click the **Delete** (trash) icon.
  2. Confirm deletion in the prompt dialog.
  3. Now find the newly created `K8S-HELM` (which has no target role dependencies or prerequisites). Click **Delete** and confirm.
- **Expected Results:**
  - For `SKILL-JAVA-CORE`: Backend returns `409 Conflict` (`MicroSkillInUseException`); red error toast displays: *"Cannot delete micro-skill: it is currently required by one or more target roles or has active prerequisites."* Skill is preserved.
  - For `K8S-HELM`: Deletion succeeds with `204 No Content`. Row is removed from the table and Neo4j node is removed.

---

## 3. Test Procedures for REQ-018 (Target-Role Graph Editing)

### Scenario 18.1: View Target-Role Subgraph Modal (REQ-018-F01)
- **Path:** Navigate to `Target Roles` (`/manager/target-roles`) or `Assigned Target Roles` (`/expert/roles`).
- **Steps:**
  1. Locate any published or draft role card (e.g., `ROLE-AI-01: AI Knowledge Architect` or `ROLE-BE-01: Senior Java Backend Engineer`).
  2. Click the **Knowledge Graph** button (with network/branch icon) on the role card.
- **Expected Results:**
  - `TargetRoleGraphModal` opens smoothly with title: `Target-Role Knowledge Graph: Senior Java Backend Engineer`.
  - An interactive vis-network canvas renders:
    - **Center Node (Orange):** The Target Role itself (`ROLE-BE-01`), showing seniority (`P3`) and track.
    - **Skill Nodes (Teal / Blue):** All micro-skills required by this role, each showing required mastery (e.g. `85%`).
    - **Directed Prerequisite Arrows (Red dashed lines):** Directed dependencies between skills indicating prerequisite order with minimum mastery thresholds (`≥ 70%`).
  - Layout switch between **Hierarchical** (top-down dependency tree) and **Organic** (force-directed physics) works dynamically.
  - Clicking any node opens the **Element Inspector** drawer displaying track, seniority, status, target mastery, and required prerequisite gates.

### Scenario 18.2: Create Prerequisite Relationship (REQ-018-F02)
- **Path:** `Competency Ontology` (`/manager/ontology`).
- **Steps:**
  1. Click the **Manage Prerequisites** button above the visualizer or in the sidebar.
  2. Select:
     - **Source Prerequisite:** `Core Java & Concurrency` (`SKILL-JAVA-CORE`)
     - **Target Micro-Skill:** `Distributed Systems & Kafka` (`SKILL-KAFKA`)
     - **Minimum Mastery:** Move slider or input `85%` (`minMastery = 0.85`).
  3. Click **Establish Dependency**.
- **Expected Results:**
  - Success toast appears.
  - Prerequisite edge is added to the list: `SKILL-JAVA-CORE` ➔ `SKILL-KAFKA` (`minMastery: 85%`).
  - Graph canvas updates and draws a directed arrow between the two skills.

### Scenario 18.3: Cycle Prevention Invariant (REQ-018-F02)
- **Path:** `Competency Ontology` (`/manager/ontology`).
- **Steps:**
  1. With `SKILL-JAVA-CORE` ➔ `SKILL-SPRING-BOOT` and `SKILL-SPRING-BOOT` ➔ `SKILL-KAFKA` existing, attempt to create:
     - **Source Prerequisite:** `SKILL-KAFKA`
     - **Target Micro-Skill:** `SKILL-JAVA-CORE`
  2. Click **Establish Dependency**.
- **Expected Results:**
  - Backend evaluates Neo4j Cypher DAG path `[:PREREQUISITE_OF*1..25]`.
  - Backend rejects with `400 Bad Request` and `PrerequisiteCycleException`.
  - Error banner displays in the modal: *"Cannot create prerequisite: adding this dependency would create a cycle in the skill graph."*
  - No edge is created in the database or canvas.

### Scenario 18.4: Delete Prerequisite Relationship (REQ-018-F02)
- **Path:** `Competency Ontology` (`/manager/ontology`).
- **Steps:**
  1. In the **Existing Prerequisite Dependencies** list, find any dependency edge.
  2. Click the red trash icon next to it.
- **Expected Results:**
  - Modal confirms deletion and sends `DELETE /api/v1/organizations/{orgId}/prerequisites?sourceSkillId=...&targetSkillId=...`.
  - Edge is removed from Neo4j; graph visualizer updates immediately.
