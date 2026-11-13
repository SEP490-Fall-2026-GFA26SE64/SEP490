# Target Role Flow Index & Detailed Test Case Specifications (Report 5)

This document is the authoritative test specification and cross-reference index for all **22 committed automated test cases** (20 feature tests across 10 core functions, 1 end-to-end workflow test, and 1 state transition test) tracked in [`Report5_Test Report(1).xlsx`](../../Report5_Test%20Report(1).xlsx) for the Target Role Authoring, Competency Ontology, and Knowledge Graph workflows.

---

## Committed Test Cases Overview (22 Total Automated Test Cases)

| Test type | Count | Automated in CI | Responsible member(s) | Playwright Test Spec |
|:---|:---:|:---:|:---|:---|
| *Feature tests (≥ 3 per feature)* | 20 | 20 | Nguyễn Anh Khôi | [`REQ-WF02-report5-flow.spec.ts`](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts) |
| *End-to-end workflow test (≥ 1)* | 1 | 1 | Nguyễn Anh Khôi | [`REQ-WF02-e2e-workflow.spec.ts`](../../frontend/system-tests/REQ-WF02-e2e-workflow.spec.ts) |
| *State transition tests (≥ 1 per transition)* | 1 | 1 | Nguyễn Anh Khôi | [`REQ-WF02-state-transitions.spec.ts`](../../frontend/system-tests/REQ-WF02-state-transitions.spec.ts) |
| **Total for this workflow** | **22** | **22** | **Nguyễn Anh Khôi** | **All 22 automated end-to-end** |

---

## 1. Quick Navigation: The 10 Functions & 20 Feature Test Cases

| No | Function Name | Excel Sheet Name | Test Case ID | Test Case Title | Primary Actor & URL Route |
|:--:|:---|:---|:---:|:---|:---|
| **1** | **Competencies Management** | `Competencies management` | `TC-WF02-F01`<br>`TC-WF02-F02`<br>`TC-WF02-F03`<br>`TC-WF02-F04` | • Create, view, and update a competency with valid fields<br>• Validation on duplicate code and empty required fields<br>• Search competencies by keyword & inspect member skills<br>• Deletion integrity & cascade protection | L&D Manager / Expert<br>`/workspace/{slug}/manager/ontology` |
| **2** | **Manage Micro-Skills & Taxonomy** | `Micro-skills management` | `TC-WF02-F05`<br>`TC-WF02-F06`<br>`TC-WF02-F07` | • Create, filter, and update micro-skills with parent competency<br>• Validation on duplicate micro-skill code and blank fields<br>• Micro-skill deletion protection when referenced by Target Roles | L&D Manager / Expert<br>`/workspace/{slug}/manager/ontology` |
| **3** | **Directed Skill Prerequisites** | `Micro-skills management` | `TC-WF02-F08`<br>`TC-WF02-F09` | • Create directed skill prerequisite edge with knowledge levels<br>• Enforce DAG cycle detection and self-reference prevention | L&D Manager / Expert<br>`/workspace/{slug}/manager/ontology` |
| **4** | **Create Target Role Draft & Expert Assignment** | `Target roles management` | `TC-WF02-F10`<br>`TC-WF02-F11` | • Create Target Role draft with mastery hierarchy & assign Expert<br>• Strict department scoping for selectable Job Positions | L&D Manager<br>`/workspace/{slug}/ld-manager/target-roles` |
| **5** | **Configure Role Requirements** | `Target roles management` | `TC-WF02-F12`<br>`TC-WF02-F13` | • Expert maps micro-skills & knowledge levels per role level<br>• Validation requires knowledge level & blocks duplicate skills | Domain Expert<br>`/workspace/{slug}/expert/target-roles` |
| **6** | **Role Review, Revision & Publishing** | `Target roles management` | `TC-WF02-F14`<br>`TC-WF02-F15` | • L&D review loop with actionable revision feedback & resubmit<br>• L&D publishes role (immutable) & spawns successor draft v1.1 | L&D Manager & Expert<br>`/workspace/{slug}/ld-manager/target-roles` |
| **7** | **Unpublish Target Role** | `Target roles management` | `TC-WF02-F16` | • L&D unpublishes role; enforce RBAC restrictions on Expert | L&D Manager<br>`/workspace/{slug}/ld-manager/target-roles` |
| **8** | **Browse Published Roles** | `Target roles management` | `TC-WF02-F17` | • Employee browses published roles; unapproved roles stay hidden | Employee<br>`/workspace/{slug}/employee/target-roles` |
| **9** | **Interactive Knowledge Graph** | `Ontology Graph` | `TC-WF02-F18` | • Graph canvas initialization, entity palette & hierarchical expansion | Expert / L&D Manager<br>`/workspace/{slug}/expert/ontology` |
| **10** | **Interactive Edge Linking & Canvas Operations** | `Ontology Graph` | `TC-WF02-F19`<br>`TC-WF02-F20` | • Connect nodes with `[:HAS_SKILL_PREREQUISITE]` synced to Neo4j<br>• Entity search highlight, Node Inspector & clean canvas reset | Expert / L&D Manager<br>`/workspace/{slug}/expert/ontology` |

---

## 2. Test Environment & Actor Personas

Tests execute against the running Docker Compose environment (`compose.dev.yml`) using the seeded workspace `TechNova Cognitive Labs` (workspace slug: `workspace-development`):

| Persona | Sign-in Account | Default Password | Workspace Permissions |
|:---|:---|:---|:---|
| **L&D Manager** | `manager@technova.com` | `Password123!` | Create role drafts, department scoping, review loop, approve/publish/unpublish roles, manage competency ontology. |
| **Domain Expert** | `expert@technova.com` | `Password123!` | Configure assigned roles, map micro-skills & required mastery levels, submit for review, author competencies, interact with Knowledge Graph. |
| **Employee** | `employee@technova.com` | `Password123!` | Browse published target roles matching department, view required skills & progressive levels, select target role for diagnostic learning. |

---

## 3. Detailed Test Case Specifications

```
================================================================================
FUNCTION 1: COMPETENCIES MANAGEMENT
Sheet Name: Competencies management
Target Portal: /workspace/workspace-development/manager/ontology (Competencies Tab)
================================================================================
```

### TC-WF02-F01: Verify creating, viewing, and updating a competency successfully with valid required fields
- **Test Case ID:** `TC-WF02-F01`
- **Feature / Function:** Competencies Management
- **Excel Sheet:** `Competencies management`
- **Pre-conditions:**
  1. User is authenticated as Domain Expert (`expert@technova.com`) or L&D Manager (`manager@technova.com`).
  2. Workspace `TechNova Cognitive Labs` is active.
- **Test Data:**
  - Code: `COMP-AI-01`
  - Name: `Deep Learning Architecture`
  - Description: `Competency covering convolutional neural networks, transformer pipelines, and model evaluation.`
  - Domain Classification: `Artificial Intelligence`
  - Updated Name: `Advanced Deep Learning & Transformers`
- **Step-by-Step Procedure:**
  1. Log in as L&D Manager or Domain Expert and navigate to `/workspace/workspace-development/manager/ontology`.
  2. Click the **Competencies** tab in the ontology sub-navigation.
  3. Click the `+ Create Competency` button located in the top-right toolbar.
  4. In the Create Competency modal, enter `COMP-AI-01` in the **Competency Code** field.
  5. Enter `Deep Learning Architecture` in the **Competency Name** field.
  6. Enter the description and select `Artificial Intelligence` from the Domain dropdown.
  7. Click the `Create Competency` submit button.
  8. In the Competencies Directory table, locate the row for `COMP-AI-01` and verify the name and domain.
  9. Click the `Edit` button (pencil icon) in the Actions column.
  10. Update the Name to `Advanced Deep Learning & Transformers` and click `Save Changes`.
- **Expected Results:**
  - Modal closes immediately upon submit without UI freezing.
  - Toast notification displays: `Competency Created Successfully`.
  - The newly created row displays in the table with `COMP-AI-01`, domain badge `Artificial Intelligence`, and `ACTIVE` status.
  - The Edit modal successfully saves changes; table reflects `Advanced Deep Learning & Transformers`.
- **Source References:**
  - UI: [`CompetencyOntologyPage.tsx`](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/frontend/src/features/manager/ontology/CompetencyOntologyPage.tsx) (`isCreateCompModalOpen`, `editingCompetency`)
  - Test Spec: [`frontend/system-tests/REQ-018-target-role-authoring-and-graph.spec.ts`](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/frontend/system-tests/REQ-018-target-role-authoring-and-graph.spec.ts)

---

### TC-WF02-F02: Verify validation when creating competency with duplicate Code or empty required fields
- **Test Case ID:** `TC-WF02-F02`
- **Feature / Function:** Competencies Management
- **Excel Sheet:** `Competencies management`
- **Pre-conditions:**
  1. Competency creation modal is open.
  2. At least one competency exists in the database (e.g., `COMP-AI-01`).
- **Test Data:**
  - Duplicate Code: `COMP-AI-01`
  - Alternative Name: `Robotics Perception`
- **Step-by-Step Procedure:**
  1. In the Competencies tab, click `+ Create Competency`.
  2. Leave all fields empty and immediately click the `Create Competency` button.
  3. Verify inline validation messages under Code and Name inputs.
  4. In the Code field, enter existing code `COMP-AI-01`.
  5. In the Name field, enter `Robotics Perception`.
  6. Click `Create Competency`.
- **Expected Results:**
  - Step 2: Form submission is blocked; inline field errors state `Competency code is required` and `Competency title is required`.
  - Step 6: Backend/client validation triggers; error banner or toast displays: `Competency code COMP-AI-01 already exists`.
  - The duplicate record is not created and the modal remains open for correction.
- **Source References:**
  - UI: `CompetencyOntologyPage.tsx` (`handleSaveCompetency`)

---

### TC-WF02-F03: Verify searching competencies by keyword and viewing member micro-skills
- **Test Case ID:** `TC-WF02-F03`
- **Feature / Function:** Competencies Management
- **Excel Sheet:** `Competencies management`
- **Pre-conditions:**
  1. Multiple competencies exist in the catalog (e.g., `COMP-ARCH-J01`, `COMP-SEC01`).
- **Test Data:**
  - Search Keyword: `Solution Architecture` or `COMP-ARCH`
- **Step-by-Step Procedure:**
  1. In the Competencies tab, locate the search toolbar.
  2. Type `Solution Architecture` in the `Search competencies...` input.
  3. Verify the rows in the table dynamically update to only matching entries.
  4. Click the `View Details` (eye icon) button on the matching competency row.
  5. Inspect the View Details modal layout, domain classification, and Member Micro-skills list.
  6. Click `Close` to dismiss the modal.
- **Expected Results:**
  - Search input filters the table with no border clipping or UI lag.
  - Non-matching competencies are hidden; only matching competencies render.
  - The View Details modal renders with human-centric semantics (Code badge, Scope & Description, Member Micro-skills chips).
  - Modal closes cleanly without leaving an active backdrop overlay.
- **Source References:**
  - UI: `CompetencyOntologyPage.tsx` (`compSearchQuery`, `viewingCompetency`)

---

### TC-WF02-F04: Verify deletion integrity rules when deleting a competency
- **Test Case ID:** `TC-WF02-F04`
- **Feature / Function:** Competencies Management
- **Excel Sheet:** `Competencies management`
- **Pre-conditions:**
  1. User is authenticated as L&D Manager.
  2. An isolated, unused competency exists (0 assigned micro-skills).
  3. A linked competency exists having at least 1 member micro-skill attached.
- **Step-by-Step Procedure:**
  1. Locate the unused competency in the table and click the `Delete` button (trash icon).
  2. Confirm deletion in the confirmation modal.
  3. Locate the linked competency with member micro-skills and click `Delete`.
  4. Confirm deletion in the prompt.
- **Expected Results:**
  - Unused competency is deleted successfully; table row is removed immediately.
  - Deletion of the linked competency is rejected; destructive alert or toast notifies: `Cannot delete competency: Competency has active member micro-skills assigned`.
- **Source References:**
  - UI: `CompetencyOntologyPage.tsx` (`handleDeleteCompetency`)

```
================================================================================
FUNCTION 2: MANAGE MICRO-SKILLS & TAXONOMY
Sheet Name: Micro-skills management
Target Portal: /workspace/workspace-development/manager/ontology (Micro-skills Tab)
================================================================================
```

### TC-WF02-F05: Verify creating, filtering, and updating a micro-skill with parent competency
- **Test Case ID:** `TC-WF02-F05`
- **Feature / Function:** Manage Micro-Skills & Taxonomy
- **Excel Sheet:** `Micro-skills management`
- **Pre-conditions:**
  1. Authenticated as Domain Expert or L&D Manager.
  2. At least one Competency exists (e.g. `COMP-ARCH-J01`).
- **Test Data:**
  - Code: `MS-PY-001`
  - Name: `Python AsyncIO Concurrency`
  - Parent Competency: `COMP-ARCH-J01`
  - Description: `Mastery of event loops, coroutines, and concurrent task orchestration.`
- **Step-by-Step Procedure:**
  1. Navigate to `/workspace/workspace-development/manager/ontology` and open the **Micro-skills** tab.
  2. Click the `+ Create Micro-skill` button.
  3. In the modal, fill Code `MS-PY-001`, Title `Python AsyncIO Concurrency`, Description, and select Parent Competency `COMP-ARCH-J01`.
  4. Click `Create Micro-skill`.
  5. Use the **Parent Competency** filter dropdown to filter the catalog by `COMP-ARCH-J01`.
  6. Click `Edit` on the newly created micro-skill, edit description, and click `Save Changes`.
- **Expected Results:**
  - Micro-skill is created; success toast `Micro-skill Created` appears.
  - The table displays the skill with `ACTIVE` badge and parent competency tag.
  - The Parent Competency dropdown filter correctly isolates all skills belonging to `COMP-ARCH-J01`.
  - Edits save and persist accurately.
- **Source References:**
  - UI: `CompetencyOntologyPage.tsx` (`handleSaveMicroSkill`, `selectedCompFilter`)
  - Test Spec: [`frontend/system-tests/REQ-user-roles-unpublish-levels.spec.ts`](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/frontend/system-tests/REQ-user-roles-unpublish-levels.spec.ts#L199-L212)

---

### TC-WF02-F06: Verify validation on duplicate code and blank required fields for micro-skills
- **Test Case ID:** `TC-WF02-F06`
- **Feature / Function:** Manage Micro-Skills & Taxonomy
- **Excel Sheet:** `Micro-skills management`
- **Pre-conditions:**
  1. Create Micro-skill modal is open.
  2. Micro-skill `MS-PY-001` exists in the system.
- **Step-by-Step Procedure:**
  1. Leave Title, Code, and Parent Competency blank; click `Create Micro-skill`.
  2. Verify inline error indicators under required inputs.
  3. Enter existing Code `MS-PY-001` with a different Title.
  4. Select a Parent Competency and click `Create Micro-skill`.
- **Expected Results:**
  - Blank submission blocked with validation messages (`Skill code is required`, `Skill name is required`).
  - Duplicate code triggers error: `Micro-skill code MS-PY-001 already exists`.
- **Source References:**
  - UI: `CompetencyOntologyPage.tsx` (`handleSaveMicroSkill`)

---

### TC-WF02-F07: Verify micro-skill deletion protection when skill is referenced by Target Roles
- **Test Case ID:** `TC-WF02-F07`
- **Feature / Function:** Manage Micro-Skills & Taxonomy
- **Excel Sheet:** `Micro-skills management`
- **Pre-conditions:**
  1. An unreferenced micro-skill exists (not part of any Target Role).
  2. An in-use micro-skill exists (mapped to an active Target Role level).
- **Step-by-Step Procedure:**
  1. Click `Delete` on the unreferenced skill and confirm prompt -> deletion succeeds.
  2. Click `Delete` on the in-use skill and confirm prompt.
- **Expected Results:**
  - Unreferenced skill is deleted cleanly from catalog and Neo4j store.
  - In-use skill deletion is aborted; system displays warning toast: `Cannot delete micro-skill: Skill is currently required by active Target Role(s)`.
- **Backend Test:** `backend/src/test/java/com/adaptlearngraph/services/TargetRoleAndMicroSkillNeo4jIntegrationTest.java`

```
================================================================================
FUNCTION 3: DIRECTED SKILL PREREQUISITES
Sheet Name: Micro-skills management
Target Portal: /workspace/workspace-development/manager/ontology (Prerequisites Tab)
================================================================================
```

### TC-WF02-F08: Verify creating directed skill prerequisite edge with required knowledge levels
- **Test Case ID:** `TC-WF02-F08`
- **Feature / Function:** Directed Skill Prerequisites
- **Excel Sheet:** `Micro-skills management`
- **Pre-conditions:**
  1. Two distinct micro-skills exist in the system (e.g. `MS-CORE01` and `MS-ARC01`).
- **Test Data:**
  - Source Skill: `MS-CORE01`
  - Target Skill: `MS-ARC01`
  - Required Knowledge Level: `Intermediate`
  - Minimum Benchmark Mastery: `75%`
- **Step-by-Step Procedure:**
  1. Open `/workspace/workspace-development/manager/ontology` and click the **Skill Prerequisites** tab.
  2. Click `+ Create Prerequisite`.
  3. In the modal, select Source Skill `MS-CORE01` and Target Skill `MS-ARC01`.
  4. Select Knowledge Level `Intermediate` and set Minimum Mastery to `75`.
  5. Click `Create Prerequisite Edge`.
  6. Inspect the Prerequisites directory table.
- **Expected Results:**
  - Directed edge is saved and rendered in the table as `MS-CORE01 -> MS-ARC01`.
  - The mastery pill displays `75% Mastery` using the standardized outline design token (`border border-border/80 text-foreground`).
  - Graph relationship `[:HAS_SKILL_PREREQUISITE]` is persisted to Neo4j.
- **Test Spec:** [`frontend/system-tests/REQ-017-F01-ontology-and-roles-flow.spec.ts`](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/frontend/system-tests/REQ-017-F01-ontology-and-roles-flow.spec.ts#L72-L100)

---

### TC-WF02-F09: Verify self-referencing and circular prerequisite dependency detection is rejected
- **Test Case ID:** `TC-WF02-F09`
- **Feature / Function:** Directed Skill Prerequisites
- **Excel Sheet:** `Micro-skills management`
- **Pre-conditions:**
  1. Prerequisite edge `Skill A -> Skill B` already exists.
- **Step-by-Step Procedure:**
  1. Open Create Prerequisite modal and set Source = `Skill A` and Target = `Skill A`.
  2. Attempt to submit.
  3. Open modal again, select Source = `Skill B` and Target = `Skill A` (creating cycle `A -> B -> A`).
  4. Click `Create Prerequisite Edge`.
- **Expected Results:**
  - Step 2: Self-referencing is blocked with validation error: `Source and target skills must be distinct`.
  - Step 4: Circular dependency detection (DAG cycle check) halts transaction with message: `Circular prerequisite dependency detected: Path creates a closed loop`.
- **Documentation:** `documents/testing/unit/REQ-018-target-role-graph-editing.md`

```
================================================================================
FUNCTION 4: CREATE TARGET ROLE DRAFT & EXPERT ASSIGNMENT
Sheet Name: Target roles management
Target Portal: /workspace/workspace-development/ld-manager/target-roles
================================================================================
```

### TC-WF02-F10: Verify L&D Manager creates Target Role Draft and assigns Domain Expert
- **Test Case ID:** `TC-WF02-F10`
- **Feature / Function:** Create Target Role Draft & Expert Assignment
- **Excel Sheet:** `Target roles management`
- **Pre-conditions:**
  1. User is authenticated as L&D Manager (`manager@technova.com`).
  2. At least one active Job Position exists in Manager's department.
  3. Domain Expert account (`expert@technova.com`) is provisioned.
- **Test Data:**
  - Role Code: `ROLE-AI-ENG`
  - Title: `Enterprise AI Solutions Architect`
  - Levels Hierarchy:
    - Rank 1: Senior Level (Duration: 6 months)
    - Rank 2: Middle Level (Duration: 4 months)
    - Rank 3: Junior Level (Duration: 3 months)
  - Assigned Expert: `expert@technova.com`
- **Step-by-Step Procedure:**
  1. Log in as L&D Manager and navigate to `/workspace/workspace-development/ld-manager/target-roles`.
  2. Click the `+ Create Target Role` button.
  3. Fill in Role Code `ROLE-AI-ENG`, Title, and select the Job Position.
  4. Configure 3 mastery levels ensuring Rank 1 is the highest level (Senior).
  5. In the Assigned Expert dropdown, select `expert@technova.com`.
  6. Click `Create Target Role`.
  7. Log in as Domain Expert (`expert@technova.com`) and navigate to `/workspace/workspace-development/expert/target-roles`.
- **Expected Results:**
  - Role is successfully initialized in `DRAFT` status (version `v1.0`).
  - Stat card `TOTAL ROLE PROFILES` increments.
  - The role row displays in the L&D Manager catalog with `DRAFT` badge and assigned expert name.
  - The role appears immediately in the Expert's personal queue ready for micro-skill configuration.
- **Source References:**
  - UI: [`TargetRolesPage.tsx`](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/frontend/src/features/manager/target-roles/TargetRolesPage.tsx)
  - Test Spec: [`frontend/system-tests/REQ-018-target-role-authoring-and-graph.spec.ts`](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/frontend/system-tests/REQ-018-target-role-authoring-and-graph.spec.ts)

---

### TC-WF02-F11: Verify L&D Manager can only select Job Positions within their assigned Department
- **Test Case ID:** `TC-WF02-F11`
- **Feature / Function:** Create Target Role Draft & Expert Assignment
- **Excel Sheet:** `Target roles management`
- **Pre-conditions:**
  1. Manager's department is `Software Department`.
  2. Another department `Cloud Department` exists with isolated Job Positions.
- **Step-by-Step Procedure:**
  1. Open `+ Create Target Role` modal as L&D Manager.
  2. Click the Job Position dropdown.
  3. Review all available options.
- **Expected Results:**
  - Only Job Positions belonging to `Software Department` appear in the dropdown.
  - Job Positions from `Cloud Department` or other business units are completely hidden (strict departmental scoping).
- **Test Spec:** [`frontend/system-tests/REQ-department-job-position-scoping.spec.ts`](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/frontend/system-tests/REQ-department-job-position-scoping.spec.ts)

```
================================================================================
FUNCTION 5: CONFIGURE ROLE REQUIREMENTS
Sheet Name: Target roles management
Target Portal: /workspace/workspace-development/expert/target-roles
================================================================================
```

### TC-WF02-F12: Verify Expert configures micro-skills and required knowledge levels per role level
- **Test Case ID:** `TC-WF02-F12`
- **Feature / Function:** Configure Role Requirements
- **Excel Sheet:** `Target roles management`
- **Pre-conditions:**
  1. Role `ROLE-AI-ENG` is assigned to Domain Expert in `DRAFT` status.
- **Test Data:**
  - Senior Level: `MS-ARC01` (Advanced), `MS-CORE01` (Advanced)
  - Junior Level: `MS-CORE01` (Intermediate)
- **Step-by-Step Procedure:**
  1. Authenticate as Domain Expert and open `/workspace/workspace-development/expert/target-roles`.
  2. Locate `ROLE-AI-ENG` and click `Configure Micro-skills` (network nodes icon).
  3. In the Configuration modal, select `Senior Level` tab.
  4. Add micro-skill `MS-ARC01` and set knowledge requirement to `Advanced`.
  5. Add micro-skill `MS-CORE01` and set knowledge requirement to `Advanced`.
  6. Switch to `Junior Level` tab, add `MS-CORE01` with `Intermediate`.
  7. Click `Save Draft`.
- **Expected Results:**
  - Skills matrix updates cleanly per level.
  - Success toast confirms: `Target Role Configuration Saved`.
  - Reopening the View Details modal reflects the newly configured competencies and micro-skills with their assigned levels.
- **Source References:**
  - UI: [`ExpertAssignedRolesPage.tsx`](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/frontend/src/features/expert/target-roles/ExpertAssignedRolesPage.tsx)

---

### TC-WF02-F13: Verify validation requires knowledge level selection and blocks duplicate skill assignments
- **Test Case ID:** `TC-WF02-F13`
- **Feature / Function:** Configure Role Requirements
- **Excel Sheet:** `Target roles management`
- **Pre-conditions:**
  1. Configure Micro-skills modal is open for a role level.
- **Step-by-Step Procedure:**
  1. Attempt to add a micro-skill without selecting a required knowledge level.
  2. Select a skill that has already been added to the same role level.
- **Expected Results:**
  - Missing knowledge level blocks addition with inline error prompt.
  - Duplicate skill is rejected or disabled in selection list; each skill may only appear once per role level.
- **Source References:**
  - UI: `ExpertAssignedRolesPage.tsx` (`handleSaveRequirements`)

```
================================================================================
FUNCTION 6: ROLE REVIEW, REVISION & PUBLISHING
Sheet Name: Target roles management
Target Portal: /workspace/workspace-development/ld-manager/target-roles
================================================================================
```

### TC-WF02-F14: Verify L&D Manager review with revision feedback and Expert resubmission
- **Test Case ID:** `TC-WF02-F14`
- **Feature / Function:** Role Review, Revision & Publishing
- **Excel Sheet:** `Target roles management`
- **Pre-conditions:**
  1. Expert has completed configuration and clicked `Submit for Review` (Role status = `SUBMITTED`).
- **Test Data:**
  - Feedback Comment: `Please add security micro-skills to Senior level before publishing.`
- **Step-by-Step Procedure:**
  1. Log in as L&D Manager and locate the submitted role in `/ld-manager/target-roles`.
  2. Click `Review Submission`.
  3. Click `Request Revision` (or Reject), enter the revision feedback comment, and submit.
  4. Log in as Domain Expert -> open `/expert/target-roles`.
  5. Verify the role status is `REJECTED` and inspect the amber revision feedback banner.
  6. Update configuration and click `Submit for Review` again.
- **Expected Results:**
  - Empty revision comments are rejected (feedback is required).
  - Role lifecycle transitions correctly: `DRAFT -> SUBMITTED -> REJECTED -> SUBMITTED`.
  - Expert receives visible feedback and can resubmit smoothly.
- **Backend Test:** [`backend/src/test/java/com/adaptlearngraph/entities/domain/TargetRoleLifecycleTest.java`](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/entities/domain/TargetRoleLifecycleTest.java)

---

### TC-WF02-F15: Verify L&D Manager publishes approved role and creates successor draft v1.1
- **Test Case ID:** `TC-WF02-F15`
- **Feature / Function:** Role Review, Revision & Publishing
- **Excel Sheet:** `Target roles management`
- **Pre-conditions:**
  1. Target role is in `SUBMITTED` status and verified by L&D Manager.
- **Step-by-Step Procedure:**
  1. Log in as L&D Manager and click `Publish Role`.
  2. Confirm publication dialog.
  3. Verify role row updates to `PUBLISHED` status badge.
  4. Attempt to edit the published role (verify direct editing is locked).
  5. Click `Create Successor Draft` on the published role.
- **Expected Results:**
  - Role transitions to `PUBLISHED`; published version becomes immutable.
  - Successor draft `v1.1` is spawned in `DRAFT` status inheriting all competencies and skills.
  - Original `v1.0` remains active and published in the knowledge graph.
- **Backend Test:** `backend/src/test/java/com/adaptlearngraph/services/TargetRoleAndMicroSkillNeo4jIntegrationTest.java`

```
================================================================================
FUNCTION 7: UNPUBLISH TARGET ROLE
Sheet Name: Target roles management
Target Portal: /workspace/workspace-development/ld-manager/target-roles
================================================================================
```

### TC-WF02-F16: Verify L&D Manager can unpublish role and Domain Expert is restricted
- **Test Case ID:** `TC-WF02-F16`
- **Feature / Function:** Unpublish Target Role
- **Excel Sheet:** `Target roles management`
- **Pre-conditions:**
  1. Role is in `PUBLISHED` status.
- **Step-by-Step Procedure:**
  1. Log in as L&D Manager and click `Unpublish` on the published role row.
  2. Confirm unpublication -> role status becomes `UNPUBLISHED`.
  3. Log in as Domain Expert and navigate to `/expert/target-roles`.
  4. Inspect action buttons on published and unpublished roles.
- **Expected Results:**
  - L&D Manager successfully unpublishes the role.
  - Unpublish action button is completely absent for Domain Expert (strict RBAC enforcement).
  - Successor drafts can still be created from an `UNPUBLISHED` role for future revisions.
- **Test Spec:** [`frontend/system-tests/REQ-user-roles-unpublish-levels.spec.ts`](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/frontend/system-tests/REQ-user-roles-unpublish-levels.spec.ts#L180-L212)

```
================================================================================
FUNCTION 8: BROWSE PUBLISHED ROLES
Sheet Name: Target roles management
Target Portal: /workspace/workspace-development/employee/target-roles
================================================================================
```

### TC-WF02-F17: Verify Employee browses published roles and unapproved roles remain hidden
- **Test Case ID:** `TC-WF02-F17`
- **Feature / Function:** Browse Published Roles
- **Excel Sheet:** `Target roles management`
- **Pre-conditions:**
  1. Multiple roles exist in various statuses (`PUBLISHED`, `DRAFT`, `SUBMITTED`, `UNPUBLISHED`).
- **Step-by-Step Procedure:**
  1. Log in as Employee (`employee@technova.com`).
  2. Navigate to `/workspace/workspace-development/employee/target-roles`.
  3. Inspect the catalog cards and career pathway recommendations.
  4. Verify the visibility of draft, submitted, and unpublished roles.
- **Expected Results:**
  - Employee only sees `PUBLISHED` roles relevant to their assigned department.
  - Roles in `DRAFT`, `SUBMITTED`, `REJECTED`, or `UNPUBLISHED` statuses are strictly hidden from the employee portal.
- **Test Spec:** [`frontend/system-tests/REQ-user-roles-unpublish-levels.spec.ts`](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/frontend/system-tests/REQ-user-roles-unpublish-levels.spec.ts#L214-L248)

```
================================================================================
FUNCTION 9: INTERACTIVE KNOWLEDGE GRAPH
Sheet Name: Ontology Graph
Target Portal: /workspace/workspace-development/expert/ontology (Explore Graph Tab)
================================================================================
```

### TC-WF02-F18: Verify graph initialization, entity palette, and expanding hierarchical neighbors
- **Test Case ID:** `TC-WF02-F18`
- **Feature / Function:** Interactive Knowledge Graph
- **Excel Sheet:** `Ontology Graph`
- **Pre-conditions:**
  1. Target role with linked competencies and skills exists in Neo4j database.
- **Step-by-Step Procedure:**
  1. Log in as Domain Expert or L&D Manager and open `/workspace/workspace-development/expert/ontology`.
  2. Click the **Explore Graph** tab.
  3. Verify clean canvas initialization (`0 nodes on canvas`, Zoom In/Out, Fit to Viewport toolbar).
  4. In the entity palette, click `Roles` filter and click a Target Role card to place it on the canvas.
  5. In the Node Inspector panel, click `Neighbors`.
  6. Use Zoom In, Zoom Out, and Fit to Viewport controls.
- **Expected Results:**
  - Canvas initializes without errors; vis-network mounts cleanly.
  - Placing role renders 1 node; clicking `Neighbors` dynamically pulls and expands Levels (Rank 1 as Highest), Competencies, and Micro-skills (>1 nodes).
  - Directed edges (`[:REQUIRES_SKILL]`, `[:HAS_LEVEL]`) render with distinct colors.
  - Zoom and Fit controls smoothly adjust the camera viewport.
- **Test Spec:** [`frontend/system-tests/REQ-017-F02-ontology-explore-graph.spec.ts`](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/frontend/system-tests/REQ-017-F02-ontology-explore-graph.spec.ts#L19-L90)

```
================================================================================
FUNCTION 10: INTERACTIVE EDGE LINKING & CANVAS OPERATIONS
Sheet Name: Ontology Graph
Target Portal: /workspace/workspace-development/expert/ontology (Explore Graph Tab)
================================================================================
```

### TC-WF02-F19: Verify linking two micro-skills with directed prerequisite relationship on canvas
- **Test Case ID:** `TC-WF02-F19`
- **Feature / Function:** Interactive Edge Linking & Canvas Operations
- **Excel Sheet:** `Ontology Graph`
- **Pre-conditions:**
  1. Two unlinked micro-skills are placed on the canvas.
- **Step-by-Step Procedure:**
  1. Place two unlinked micro-skills on canvas.
  2. Select source skill node and click the `Connect` button.
  3. Click target skill node.
  4. Select relationship type `HAS_SKILL_PREREQUISITE` and confirm.
- **Expected Results:**
  - A directed arrow edge appears between the two nodes with label `HAS_SKILL_PREREQUISITE`.
  - Neo4j database is updated immediately with the new directed edge.
- **Test Spec:** [`frontend/system-tests/REQ-017-F02-ontology-explore-graph.spec.ts`](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/frontend/system-tests/REQ-017-F02-ontology-explore-graph.spec.ts#L91-L122)

---

### TC-WF02-F20: Verify entity search highlights nodes, displays Node Inspector, and Clear Canvas resets
- **Test Case ID:** `TC-WF02-F20`
- **Feature / Function:** Interactive Edge Linking & Canvas Operations
- **Excel Sheet:** `Ontology Graph`
- **Pre-conditions:**
  1. Multiple entities are placed on the canvas.
- **Step-by-Step Procedure:**
  1. Type an entity title in the Graph Search bar.
  2. Inspect the canvas focus and Node Inspector side drawer.
  3. Click the `Clear Canvas` button in the top action toolbar.
- **Expected Results:**
  - Canvas smoothly animates to center and highlight the searched node; inspector displays metadata, code, and attributes.
  - Clicking `Clear Canvas` resets the canvas to clean initial state (`0 nodes on canvas`) without deleting underlying database records.
- **Test Spec:** [`frontend/system-tests/REQ-017-F02-ontology-explore-graph.spec.ts`](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/frontend/system-tests/REQ-017-F02-ontology-explore-graph.spec.ts)

---

```
================================================================================
END-TO-END WORKFLOW & STATE TRANSITION SUITE (COMMITTED CAPSTONE TEST CASES)
================================================================================
```

### TC-WF02-E2E01: Complete End-to-End Target Role Lifecycle with Neo4j Target Role and Graph Inspection (Capstone Demo)
- **Test Case ID:** `TC-WF02-E2E01`
- **Test Type:** End-to-End Workflow Test (Capstone Evaluation Live Script)
- **Primary Actors:** L&D Manager (`manager@technova.com`), Domain Expert (`expert@technova.com`), Employee (`employee@technova.com`)
- **Target Portals:**
  - L&D Manager Target Roles (`/workspace/{slug}/ld-manager/target-roles`)
  - Expert Assigned Target Roles (`/workspace/{slug}/expert/target-roles`)
  - Expert Ontology & Explore Graph (`/workspace/{slug}/expert/ontology`)
  - Employee Upskilling Catalog (`/workspace/{slug}/employee/target-roles`)
- **Pre-conditions:**
  1. Full Docker Compose stack running with PostgreSQL and Neo4j (`compose.dev.yml`).
  2. Workspace `TechNova Cognitive Labs` active.
  3. L&D Manager, Domain Expert, and Employee accounts authenticated.
- **Step-by-Step Procedure (Kịch bản Demo Capstone):**
  1. **L&D Manager creates Target Role:**
     - Navigate to `/workspace/{slug}/ld-manager/target-roles`.
     - Click `+ Create` button.
     - Enter code (e.g. `ROLE-NEO4J-xxxx`) and title: `Neo4j Target Role`.
     - Align with Job Position `15-1252.00 Software Developers`.
     - Add 4th progressive rank: `Fresher`.
     - Assign Domain Expert: `expert@technova.com` (`Dr. Sarah Chen`).
     - Click `Create & Send to Expert`.
  2. **L&D Manager inspects Target Role Graph:**
     - Locate `Neo4j Target Role` row in the catalog.
     - Click Knowledge Graph action button (`View Architecture Graph`).
     - Inspect interactive SVG canvas showing role root, levels, and linked entities.
     - Close graph modal cleanly.
  3. **Domain Expert configures micro-skills:**
     - Log in as `expert@technova.com` and open `/workspace/{slug}/expert/target-roles`.
     - Locate `Neo4j Target Role` in status `DRAFT`.
     - Click `Configure Micro-skills`.
     - Configure member competencies and micro-skills for Senior, Middle, Junior ranks.
     - Click `Save Draft` and close modal.
  4. **Domain Expert explores Ontology Graph:**
     - Navigate to `/workspace/{slug}/expert/ontology`.
     - Switch to `Explore Graph` tab.
     - Interact with the graph canvas for `Fresher` level configuration.
     - Verify zoom controls and fit-to-viewport.
  5. **Domain Expert verifies role graph & submits:**
     - Return to `/workspace/{slug}/expert/target-roles`.
     - Click Knowledge Graph on `Neo4j Target Role` to verify complete graph alignment.
     - Click `Configure Micro-skills` -> `Submit to L&D Manager`.
  6. **L&D Manager reviews and publishes:**
     - Log in as `manager@technova.com`.
     - Locate `Neo4j Target Role` in status `SUBMITTED`.
     - Click `View Details` modal to review specifications and levels.
     - Click `Approve & Publish`.
     - Verify role status updates to `PUBLISHED`.
  7. **Employee browses upskilling catalog:**
     - Log in as `employee@technova.com` and navigate to `/workspace/{slug}/employee/target-roles`.
     - Verify `Neo4j Target Role` is visible in the published target role catalog for upskilling enrollment.
- **Expected Results:**
  - Role traverses creation, expert configuration, graph inspection, L&D publication, and employee visibility seamlessly.
  - Zero hardcoded hex colors, zero unhandled errors, and clean dialog closures throughout.
- **Automated Test Spec:** [`frontend/system-tests/REQ-WF02-e2e-workflow.spec.ts`](../../frontend/system-tests/REQ-WF02-e2e-workflow.spec.ts)

---

### TC-WF02-ST01: Target Role Lifecycle State Transitions (DRAFT -> SUBMITTED -> REJECTED -> SUBMITTED -> PUBLISHED -> UNPUBLISHED)
- **Test Case ID:** `TC-WF02-ST01`
- **Test Type:** State Transition Test (Lifecycle State Machine Integrity)
- **Primary Actors:** L&D Manager (`manager@technova.com`), Domain Expert (`expert@technova.com`), Employee (`employee@technova.com`)
- **Pre-conditions:**
  1. Workspace active; user roles configured with proper RBAC.
- **State Transition Matrix Verified:**
  1. `[Initial] -> DRAFT`: L&D Manager authors draft role (`Save as Draft`).
  2. `DRAFT -> SUBMITTED`: Domain Expert configures required mastery levels and clicks `Submit to L&D Manager`.
  3. `SUBMITTED -> REJECTED`: L&D Manager reviews role, inputs revision guidance (`Please calibrate intermediate proficiency thresholds`), and confirms return. Status updates to `REJECTED` / `FEEDBACK`.
  4. `REJECTED -> SUBMITTED`: Expert inspects feedback, updates configuration, and resubmits to L&D Manager.
  5. `SUBMITTED -> PUBLISHED`: L&D Manager approves role (`Approve & Publish`). Status updates to `PUBLISHED`.
  6. `PUBLISHED -> UNPUBLISHED`: L&D Manager unpublishes role with operational confirmation dialog. Role transitions to `UNPUBLISHED` (or draft).
  7. **Visibility Isolation Assertion:** Employee account verifies role is removed/isolated from active upskilling catalog.
- **Expected Results:**
  - Every state transition strictly enforces access control and updates UI badges.
  - Rejection feedback is preserved and surfaced to the Expert.
  - Unpublished roles cannot be accessed or enrolled in by Employees.
- **Automated Test Spec:** [`frontend/system-tests/REQ-WF02-state-transitions.spec.ts`](../../frontend/system-tests/REQ-WF02-state-transitions.spec.ts)

---

## 4. How to Execute Tests

### Run Playwright System Tests (Report 5 Automated Test Suites)
The automated test suites covering all 22 committed test cases are located in `frontend/system-tests/`:

```bash
# 1. Run the Complete 20 Feature Test Cases (10 core functions)
npx --prefix frontend playwright test REQ-WF02-report5-flow.spec.ts --config=frontend/playwright.system.config.ts

# 2. Run the End-to-End Workflow Test (Capstone Live Demo Script: Neo4j Target Role)
npx --prefix frontend playwright test REQ-WF02-e2e-workflow.spec.ts --config=frontend/playwright.system.config.ts

# 3. Run the Target Role Lifecycle State Transitions Test
npx --prefix frontend playwright test REQ-WF02-state-transitions.spec.ts --config=frontend/playwright.system.config.ts

# 4. Run All 22 Committed Test Cases Together
npx --prefix frontend playwright test REQ-WF02-report5-flow.spec.ts REQ-WF02-e2e-workflow.spec.ts REQ-WF02-state-transitions.spec.ts --config=frontend/playwright.system.config.ts
```

### Additional Granular System Tests
```bash
# Run Target Roles & Ontology Graph Playwright spec
npx --prefix frontend playwright test REQ-018-target-role-authoring-and-graph.spec.ts --config=frontend/playwright.system.config.ts

# Run Scoping & Unpublish RBAC test
npx --prefix frontend playwright test REQ-user-roles-unpublish-levels.spec.ts --config=frontend/playwright.system.config.ts
```

### Run Backend Unit & Integration Tests
```bash
# Run Target Role Lifecycle Domain Test
./gradlew test --tests "com.adaptlearngraph.entities.domain.TargetRoleLifecycleTest"

# Run Neo4j Integration Test
./gradlew test --tests "com.adaptlearngraph.services.TargetRoleAndMicroSkillNeo4jIntegrationTest"
```

