# Target Role Flow Index & Detailed Test Case Specifications (Report 5)

This document is the authoritative test specification and cross-reference index for all **22 committed automated test cases** (20 feature tests across 10 core functions, 1 end-to-end workflow test, and 1 state transition test) tracked in [`Report5_Test Report(2).xlsx`](../../Report5_Test%20Report(2).xlsx) for the Target Role Authoring, Competency Ontology, and Knowledge Graph workflows.

---

## Committed Test Cases Overview (22 Total Automated Test Cases + 1 NFR Benchmark)

| Test type | Count | Automated in CI | Responsible member(s) | Test Spec Reference |
|:---|:---:|:---:|:---|:---|
| *Feature tests (≥ 3 per feature)* | 20 | 20 | Nguyễn Anh Khôi | [`REQ-WF02-report5-flow.spec.ts`](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts) |
| *End-to-end workflow test (≥ 1)* | 1 | 1 | Nguyễn Anh Khôi | [`REQ-WF02-e2e-workflow.spec.ts`](../../frontend/system-tests/REQ-WF02-e2e-workflow.spec.ts) |
| *State transition tests (≥ 1 per transition)* | 1 | 1 | Nguyễn Anh Khôi | [`REQ-WF02-state-transitions.spec.ts`](../../frontend/system-tests/REQ-WF02-state-transitions.spec.ts) |
| *Non-Functional Requirement (NFR-P02 Performance)* | 1 (4 queries × 10 runs) | 1 | Nguyễn Anh Khôi | [`GraphQueryPerformanceBenchmarkTest.java`](../../backend/src/test/java/com/adaptlearngraph/repository/GraphQueryPerformanceBenchmarkTest.java) |
| **Total for this workflow** | **23** | **23** | **Nguyễn Anh Khôi** | **All 23 automated and verified** |

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
| **11** | **End-to-End Target Role Lifecycle** | `Target roles management` / BM04 Table 11 (`DS-02a`) | `TC-WF02-E2E01` | • DS-02a Main Flow: Role onboarding/assignment, Excel ontology import, graph prerequisite DAG modifications, multi-level micro-skill configuration, approval & publication | L&D Manager, Expert, Employee<br>`/ld-manager/target-roles`, `/expert/roles`, `/employee/target-roles` |
| **12** | **Target Role Lifecycle State Transitions** | `Target roles management` / BM04 Table 11 (`DS-02b`, `DS-02c`) | `TC-WF02-ST01` | • 6 lifecycle states: `DRAFT -> SUBMITTED -> REJECTED -> SUBMITTED -> PUBLISHED -> UNPUBLISHED`<br>• Enforces alternative revision loop (`DS-02b`), immutability & referential integrity (`DS-02c`) | L&D Manager, Expert, Employee<br>`/ld-manager/target-roles`, `/expert/roles`, `/employee/target-roles` |

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

`
================================================================================
FUNCTION 1: COMPETENCIES MANAGEMENT
Sheet Name: Competencies management
Target Portal: /workspace/{slug}/manager/ontology (Competencies Tab)
================================================================================
`

### TC-WF02-F01: Verify creating, viewing, and updating a competency successfully with valid required fields
- **Test Case ID:** TC-WF02-F01
- **Feature / Function:** Competencies Management
- **Excel Sheet:** Competencies management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. User is authenticated as Expert or L&D Manager.
  2. Organization workspace is active.
- **Step-by-Step Procedure:**
  1. Log in as Domain Expert or L&D Manager.
  2. Navigate to "Competencies" tab on Ontology page.
  3. Click "+ Create Competency", enter Code (e.g. COMP-AI-01), Name (e.g. Deep Learning), Description, and Domain classification.
  4. Click "Create Competency" submit button.
  5. In the competency table, verify the new competency appears, then click "Edit".
  6. Update Name/Description and save changes.
- **Expected Results:**
  1. Modal closes and success toast "Competency Created" appears.
  2. The new competency appears in the catalog with code, name, and domain.
  3. Edit modal saves updates successfully without errors.
- **Source / UI Implementation:** CompetencyOntologyPage.tsx (isCreateCompModalOpen, editingCompetency)
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

### TC-WF02-F02: Verify validation when creating competency with duplicate Code or empty required fields
- **Test Case ID:** TC-WF02-F02
- **Feature / Function:** Competencies Management
- **Excel Sheet:** Competencies management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. Create Competency modal is open.
  2. At least one competency already exists in database.
- **Step-by-Step Procedure:**
  1. Click "+ Create Competency" button.
  2. Leave Name or Code field blank and click "Create Competency".
  3. Enter an existing Code (e.g. COMP-AI-01) with a new Name.
  4. Click "Create Competency".
- **Expected Results:**
  1. Blank required fields display inline validation errors ("Code is required", "Name is required").
  2. Duplicate code triggers error: "Competency code already exists."
  3. Submission is blocked and no duplicate record is created.
- **Source / UI Implementation:** CompetencyOntologyPage.tsx (handleSaveCompetency)
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

### TC-WF02-F03: Verify searching competencies by keyword and viewing member micro-skills
- **Test Case ID:** TC-WF02-F03
- **Feature / Function:** Competencies Management
- **Excel Sheet:** Competencies management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. Multiple competencies exist in the catalog.
- **Step-by-Step Procedure:**
  1. Navigate to Competencies catalog.
  2. In the search input, type a keyword (e.g. "Architecture" or "COMP-ARCH").
  3. Inspect filtered results list.
  4. Click on a competency row or "View Details" to open competency overview.
- **Expected Results:**
  1. Table dynamically filters and displays only matching competencies.
  2. Details modal opens displaying full description, domain classification, and list of associated micro-skills.
- **Source / UI Implementation:** CompetencyOntologyPage.tsx (compSearchQuery, viewingCompetency)
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

### TC-WF02-F04: Verify deletion integrity rules when deleting a competency
- **Test Case ID:** TC-WF02-F04
- **Feature / Function:** Competencies Management
- **Excel Sheet:** Competencies management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. User is authenticated as L&D Manager.
  2. Test competencies (isolated and linked) exist.
- **Step-by-Step Procedure:**
  1. Select an unused/isolated competency and click "Delete".
  2. Confirm deletion in prompt -> competency is removed.
  3. Select a competency that has active child micro-skills assigned and attempt to delete.
- **Expected Results:**
  1. Isolated unused competency is deleted cleanly from catalog and Neo4j graph.
  2. Competency with active micro-skills triggers rejection: cannot delete while child micro-skills are referenced.
- **Source / UI Implementation:** CompetencyOntologyPage.tsx (handleDeleteCompetency)
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

`
================================================================================
FUNCTION 2: MANAGE MICRO-SKILLS & TAXONOMY
Sheet Name: Micro-skills management
Target Portal: /workspace/{slug}/manager/ontology (Micro-skills Tab)
================================================================================
`

### TC-WF02-F05: Verify creating, filtering, and updating a micro-skill with parent competency
- **Test Case ID:** TC-WF02-F05
- **Feature / Function:** Manage Micro-Skills & Taxonomy
- **Excel Sheet:** Micro-skills management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. User is authenticated as Expert/Manager.
  2. At least one Competency exists.
- **Step-by-Step Procedure:**
  1. Log in as Domain Expert or L&D Manager and open Micro-skills tab.
  2. Click "+ Create Micro-skill", enter Code (e.g. MS-PY-001), Name (e.g. Python Core), Description, and select Parent Competency and select ways to verify passing condition for each knowledge level.
  3. Click "Create Micro-skill".
  4. Filter table by Parent Competency dropdown.
  5. Click "Edit", modify description, and save.
- **Expected Results:**
  1. Modal closes and success toast appears.
  2. The new skill appears with ACTIVE badge under selected competency.
  3. Competency filter correctly filters down to this skill.
  4. Updates persist successfully.
- **Source / UI Implementation:** CompetencyOntologyPage.tsx (handleSaveMicroSkill, selectedCompFilter)
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

### TC-WF02-F06: Verify validation on duplicate code and blank required fields for micro-skills
- **Test Case ID:** TC-WF02-F06
- **Feature / Function:** Manage Micro-Skills & Taxonomy
- **Excel Sheet:** Micro-skills management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. Create Micro-skill modal is open.
  2. Code MS-PY-001 already exists in catalog.
- **Step-by-Step Procedure:**
  1. Click "+ Create Micro-skill" button.
  2. Leave required fields blank and click submit.
  3. Enter existing Code (e.g. MS-PY-001) with different title and click submit.
- **Expected Results:**
  1. Inline validation errors highlight missing fields.
  2. Duplicate code triggers error: "Micro-skill code already exists."
  3. Submission is rejected.
- **Source / UI Implementation:** CompetencyOntologyPage.tsx (handleSaveMicroSkill)
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

### TC-WF02-F07: Verify micro-skill deletion protection when skill is referenced by Target Roles
- **Test Case ID:** TC-WF02-F07
- **Feature / Function:** Manage Micro-Skills & Taxonomy
- **Excel Sheet:** Micro-skills management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. One unassigned skill and one assigned skill exist in organization.
- **Step-by-Step Procedure:**
  1. Identify an unassigned micro-skill and confirm deletion -> deletion succeeds.
  2. Identify a micro-skill actively mapped to a Target Role level and attempt deletion.
- **Expected Results:**
  1. Unassigned skill is deleted and removed from ontology catalog.
  2. In-use skill deletion is blocked with error: "Cannot delete micro-skill: Skill is currently required by active Target Role(s)."
- **Source / UI Implementation:** TargetRoleAndMicroSkillNeo4jIntegrationTest.java
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

`
================================================================================
FUNCTION 3: DIRECTED SKILL PREREQUISITES
Sheet Name: Micro-skills management
Target Portal: /workspace/{slug}/manager/ontology (Prerequisites Tab)
================================================================================
`

### TC-WF02-F08: Verify creating directed skill prerequisite edge with required knowledge levels
- **Test Case ID:** TC-WF02-F08
- **Feature / Function:** Directed Skill Prerequisites
- **Excel Sheet:** Micro-skills management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. Both source and target skills exist and are distinct.
- **Step-by-Step Procedure:**
  1. Navigate to "Prerequisites" tab/section.
  2. Click "+ Add Prerequisite".
  3. Select Source Skill (e.g. MS-PY-001).
  4. Select Target Skill (e.g. MS-FAST-01).
  5. Click "Save Prerequisite".
- **Expected Results:**
  1. Modal closes and success toast appears.
  2. Directed relationship [:HAS_SKILL_PREREQUISITE] is stored in Neo4j.
  3. Edge appears in prerequisites list and in interactive knowledge graph.
- **Source / UI Implementation:** PrerequisitesTab.tsx
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

### TC-WF02-F09: Verify self-referencing and circular prerequisite dependency detection is rejected
- **Test Case ID:** TC-WF02-F09
- **Feature / Function:** Directed Skill Prerequisites
- **Excel Sheet:** Micro-skills management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. Existing prerequisite edge A -> B exists in database.
- **Step-by-Step Procedure:**
  1. In Add Prerequisite modal, select same skill as both Source and Target -> attempt to save.
  2. Given existing directed edge Skill A -> Skill B, attempt to add prerequisite Skill B -> Skill A.
  3. Click "Save Prerequisite".
- **Expected Results:**
  1. Self-reference triggers error: "Source and target skills cannot be identical."
  2. Circular dependency triggers graph cycle detection error: "Circular dependency detected: Prerequisite loop is not permitted."
  3. Graph remains a directed acyclic graph (DAG).
- **Source / UI Implementation:** SkillPrerequisiteService.java (DAG cycle detection)
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

`
================================================================================
FUNCTION 4: CREATE TARGET ROLE DRAFT & EXPERT ASSIGNMENT
Sheet Name: Target roles management
Target Portal: /workspace/{slug}/ld-manager/target-roles
================================================================================
`

### TC-WF02-F10: Verify L&D Manager creates Target Role Draft and assigns Domain Expert
- **Test Case ID:** TC-WF02-F10
- **Feature / Function:** Create Target Role Draft & Expert Assignment
- **Excel Sheet:** Target roles management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. User is authenticated as L&D Manager.
  2. Job Position and Expert account exist.
- **Step-by-Step Procedure:**
  1. Log in as L&D Manager.
  2. Navigate to Target Roles page and click "+ Create Target Role".
  3. Enter Code, Title, select Job Position, define Levels with durations (e.g. Senior: 6m, Middle: 4m, Junior: 3m).
  4. Assign an eligible Domain Expert and click "Create Target Role".
- **Expected Results:**
  1. Role draft is created in DRAFT status with defined level hierarchy (Rank 1 as Highest).
  2. Assigned role appears in the assigned Expert's personal workspace queue.
- **Source / UI Implementation:** TargetRolesPage.tsx
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

### TC-WF02-F11: Verify L&D Manager can only select Job Positions within their assigned Department
- **Test Case ID:** TC-WF02-F11
- **Feature / Function:** Create Target Role Draft & Expert Assignment
- **Excel Sheet:** Target roles management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. Multiple departments with distinct job positions exist in the system.
- **Step-by-Step Procedure:**
  1. Open "+ Create Target Role" modal as L&D Manager.
  2. Inspect the Job Position dropdown options.
  3. Verify that only Job Positions belonging to the Manager's department are selectable.
- **Expected Results:**
  1. Dropdown is strictly filtered to the Manager's department scope.
  2. Job Positions from other departments are not accessible or selectable.
- **Source / UI Implementation:** CreateTargetRoleModal.tsx (department job position scoping)
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

`
================================================================================
FUNCTION 5: CONFIGURE ROLE REQUIREMENTS
Sheet Name: Target roles management
Target Portal: /workspace/{slug}/expert/target-roles
================================================================================
`

### TC-WF02-F12: Verify Expert configures micro-skills and required knowledge levels per role level
- **Test Case ID:** TC-WF02-F12
- **Feature / Function:** Configure Role Requirements
- **Excel Sheet:** Target roles management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. Target role is assigned to the Expert in DRAFT status.
- **Step-by-Step Procedure:**
  1. Log in as assigned Expert and open assigned role in DRAFT status.
  2. Select a level tab (e.g. Senior - Rank 1).
  3. Add Competency and micro-skills.
  4. Select Required Knowledge Levels (Foundation, Intermediate, Advanced) for each micro-skill.
  5. Click "Save Configuration".
- **Expected Results:**
  1. Micro-skills are mapped to the specific level.
  2. Neo4j creates [:REQUIRES_SKILL] edges with requiredKnowledgeLevels list.
  3. Success toast confirms requirements saved.
- **Source / UI Implementation:** ExpertAssignedRolesPage.tsx (handleSaveRequirements)
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

### TC-WF02-F13: Verify validation requires knowledge level selection and blocks duplicate skill assignments
- **Test Case ID:** TC-WF02-F13
- **Feature / Function:** Configure Role Requirements
- **Excel Sheet:** Target roles management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. Expert is on the Role Configuration matrix screen.
- **Step-by-Step Procedure:**
  1. In Add Micro-skill panel, select Competency and Micro-skill.
  2. Leave all knowledge level pills unselected and attempt to assign.
  3. Select valid level and assign skill.
- **Expected Results:**
  1. Unselected knowledge levels block assignment with validation notice.
- **Source / UI Implementation:** ExpertAssignedRolesPage.tsx (knowledge level validation)
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

`
================================================================================
FUNCTION 6: ROLE REVIEW, REVISION & PUBLISHING
Sheet Name: Target roles management
Target Portal: /workspace/{slug}/ld-manager/target-roles
================================================================================
`

### TC-WF02-F14: Verify L&D Manager review with revision feedback and Expert resubmission
- **Test Case ID:** TC-WF02-F14
- **Feature / Function:** Role Review, Revision & Publishing
- **Excel Sheet:** Target roles management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. Target role is submitted by Expert.
- **Step-by-Step Procedure:**
  1. Expert clicks "Submit for Approval" -> role transitions to SUBMITTED.
  2. L&D Manager reviews role, enters feedback: "Please add Advanced level to PyTorch", and clicks "Return for Revision".
  3. Role status transitions to REJECTED.
  4. Expert opens role, views feedback alert banner, adjusts requirements, and resubmits.
- **Expected Results:**
  1. Returning role requires non-empty feedback comment.
  2. Role transitions correctly: DRAFT -> SUBMITTED -> REJECTED -> SUBMITTED.
  3. Revision banner displays feedback to Expert; resubmission updates state.
- **Source / UI Implementation:** TargetRoleLifecycleTest.java
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

### TC-WF02-F15: Verify L&D Manager publishes approved role and creates successor draft v1.1
- **Test Case ID:** TC-WF02-F15
- **Feature / Function:** Role Review, Revision & Publishing
- **Excel Sheet:** Target roles management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. Role is fully configured in SUBMITTED status.
- **Step-by-Step Procedure:**
  1. L&D Manager approves and clicks "Publish Role".
  2. Role transitions to PUBLISHED; direct editing is locked (immutable).
  3. Click "Create Successor Draft" to spawn v1.1.
  4. Verify v1.1 inherits all previous levels (Rank 1 as Highest), competencies, and skills in DRAFT status.
- **Expected Results:**
  1. Role publishes successfully.
  2. Published role cannot be directly edited.
  3. Successor draft (v1.1) is created in DRAFT while v1.0 remains active and published.
- **Source / UI Implementation:** TargetRoleService.java (publish & successor draft spawn)
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

`
================================================================================
FUNCTION 7: UNPUBLISH TARGET ROLE
Sheet Name: Target roles management
Target Portal: /workspace/{slug}/ld-manager/target-roles
================================================================================
`

### TC-WF02-F16: Verify L&D Manager can unpublish role and Domain Expert is restricted
- **Test Case ID:** TC-WF02-F16
- **Feature / Function:** Unpublish Target Role
- **Excel Sheet:** Target roles management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. A target role is in PUBLISHED status.
- **Step-by-Step Procedure:**
  1. Log in as L&D Manager and click "Unpublish" on a published role -> role transitions to UNPUBLISHED.
  2. Log in as Domain Expert and inspect the same role -> unpublish action is hidden/unauthorized.
  3. Verify successor draft can still be created from an UNPUBLISHED role.
- **Expected Results:**
  1. L&D Manager successfully unpublishes the role.
  2. Expert lacks unpublish permissions (RBAC enforcement).
  3. Successor drafts can still be created from UNPUBLISHED roles for future revisions.
- **Source / UI Implementation:** TargetRolesPage.tsx & ExpertAssignedRolesPage.tsx (RBAC check)
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

`
================================================================================
FUNCTION 8: BROWSE PUBLISHED ROLES
Sheet Name: Target roles management
Target Portal: /workspace/{slug}/employee/target-roles
================================================================================
`

### TC-WF02-F17: Verify Employee browses published roles and unapproved roles remain hidden
- **Test Case ID:** TC-WF02-F17
- **Feature / Function:** Browse Published Roles
- **Excel Sheet:** Target roles management ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. Roles in various statuses (Published, Draft, Unpublished) exist.
- **Step-by-Step Procedure:**
  1. Log in as Employee.
  2. Navigate to "Upskilling" / Target Roles catalog.
  3. Inspect published role details, level duration, and required skills.
  4. Verify that roles in DRAFT, SUBMITTED, REJECTED, and UNPUBLISHED statuses are completely hidden.
- **Expected Results:**
  1. Employee views active PUBLISHED roles matching their department/career path.
  2. Non-published roles are strictly isolated from the Employee view.
- **Source / UI Implementation:** EmployeeTargetRolesPage.tsx (published isolation)
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

`
================================================================================
FUNCTION 9: INTERACTIVE KNOWLEDGE GRAPH
Sheet Name: Ontology Graph
Target Portal: /workspace/{slug}/expert/ontology (Explore Graph Tab)
================================================================================
`

### TC-WF02-F18: Verify graph initialization, entity palette, and expanding hierarchical neighbors
- **Test Case ID:** TC-WF02-F18
- **Feature / Function:** Interactive Knowledge Graph
- **Excel Sheet:** Ontology Graph ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. Target role with linked competencies and skills exists in Neo4j.
- **Step-by-Step Procedure:**
  1. Log in as Expert or L&D Manager and open "Ontology Graph" explorer.
  2. Drag and drop a Target Role node onto canvas.
  3. Click "Neighbors" button to expand connected nodes.
  4. Use Zoom In, Zoom Out, and Fit to Viewport controls.
- **Expected Results:**
  1. Canvas initializes cleanly with action toolbar (Zoom, Pan, Fit, Clear).
  2. Expanding neighbors dynamically renders Levels (Rank 1 as Highest), Competencies, and Micro-skills.
  3. Directed edges ([:REQUIRES_SKILL], [:HAS_LEVEL]) render with distinctive color-coded markers.
- **Source / UI Implementation:** OntologyExploreGraphTab.tsx (vis-network initialization)
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

`
================================================================================
FUNCTION 10: INTERACTIVE EDGE LINKING & CANVAS OPERATIONS
Sheet Name: Ontology Graph
Target Portal: /workspace/{slug}/expert/ontology (Explore Graph Tab)
================================================================================
`

### TC-WF02-F19: Verify linking two micro-skills with directed prerequisite relationship on canvas
- **Test Case ID:** TC-WF02-F19
- **Feature / Function:** Interactive Edge Linking & Canvas Operations
- **Excel Sheet:** Ontology Graph ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. Two unlinked micro-skills are placed on the canvas.
- **Step-by-Step Procedure:**
  1. Place two unlinked micro-skills on canvas.
  2. Select source skill, click "Connect", and click target skill.
  3. Select relationship type (HAS_SKILL_PREREQUISITE) and confirm.
- **Expected Results:**
  1. A directed arrow edge appears between the two nodes with label HAS_SKILL_PREREQUISITE.
  2. Neo4j graph database is updated immediately with the new directed edge.
- **Source / UI Implementation:** OntologyExploreGraphTab.tsx (edge linking [:HAS_SKILL_PREREQUISITE])
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

### TC-WF02-F20: Verify entity search highlights nodes, displays Node Inspector, and Clear Canvas resets
- **Test Case ID:** TC-WF02-F20
- **Feature / Function:** Interactive Edge Linking & Canvas Operations
- **Excel Sheet:** Ontology Graph ([Report5_Test Report(2).xlsx](../../Report5_Test%20Report(2).xlsx))
- **Pre-conditions:**
  1. Multiple entities are placed on canvas.
- **Step-by-Step Procedure:**
  1. With multiple nodes on canvas, type an entity name in Graph Search bar.
  2. Verify matching node is highlighted and Node Inspector panel opens displaying details.
  3. Click "Clear Canvas" toolbar button.
- **Expected Results:**
  1. Canvas centers and highlights the searched node; inspector displays code, title, and metadata.
  2. "Clear Canvas" resets canvas to clean initial state (0 nodes) without deleting database entities.
- **Source / UI Implementation:** OntologyExploreGraphTab.tsx (search highlight, Node Inspector, Clear Canvas)
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-report5-flow.spec.ts](../../frontend/system-tests/REQ-WF02-report5-flow.spec.ts)

---

```
================================================================================
END-TO-END WORKFLOW & STATE TRANSITION SUITE (COMMITTED CAPSTONE TEST CASES)
Based on SWP490_R2_BM04_Review2_Commitment_1(1).docx (Tables 11, 12, 13)
================================================================================
```

### TC-WF02-E2E01: End-to-End Target Role Lifecycle with Neo4j Target Role and Graph Inspection (Capstone Demo Scenario DS-02a)
- **Test Case ID:** `TC-WF02-E2E01`
- **Scenario Reference:** `DS-02a` | Type: `Main` (End-to-End Role Authoring, Assignment, Configuration, Graph Inspection, and Publication Lifecycle)
- **Document Reference:** `SWP490_R2_BM04_Review2_Commitment_1(1).docx` (Table 11: Demo Scenario DS-02a; Table 12: WF-02 Committed Test Cases)
- **Excel Reference:** `Target roles management` ([`Report5_Test Report(2).xlsx`](../../Report5_Test%20Report(2).xlsx))
- **Test Type:** End-to-End Workflow Test (Capstone Evaluation Live Script)
- **Responsible Member / Presenter:** Nguyễn Anh Khôi
- **Primary Actors:** L&D Manager (`manager@technova.com`), Domain Expert (`expert@technova.com`), Employee (`employee@technova.com`)
- **Target Portals:**
  - L&D Manager Target Roles (`/workspace/{slug}/ld-manager/target-roles`)
  - Expert Assigned Target Roles (`/workspace/{slug}/expert/roles`)
  - Expert Ontology & Explore Graph (`/workspace/{slug}/expert/ontology`)
  - Employee Upskilling Catalog (`/workspace/{slug}/employee/target-roles`)

#### BM04 Committed Scenario Specification (Table 11: DS-02a)
> **Scenario ID:** DS-02a  
> **Type:** Main  
> **Preconditions and data:**  
> Existing organization for use.  
> User accounts for L&D Manager, Expert, and Employee are active in the organization workspace. Organization admin imports target roles when onboarding for use.  
> **Main steps:**  
> 1. L&D Manager assigns an eligible Expert, and dispatches.  
> 2. Expert imports competencies, micro-skills and their relationships through import functions.  
> 3. Expert modifies the relationships by reverse prerequisites, delete prerequisites, add prerequisites through explore graph.  
> 4. Expert opens the assigned role, sets competencies and micro-skill with knowledge level across target role levels, and submits to Manager.  
> 5. L&D Manager reviews submitted specifications, approves, and publishes the role.  
> **Expected result:**  
> End-to-end role authoring, assignment, configuration, and publication lifecycle completes successfully. Knowledge Graph dynamically renders updated entities.  
> **Presenter:** Nguyễn Anh Khôi

#### Detailed Step-by-Step Procedure & Test Execution Details
1. **Pre-condition Setup (Onboarding & User Accounts):**
   - Active organization: `TechNova Cognitive Labs` (workspace slug: `workspace-development`).
   - Active user accounts: L&D Manager (`manager@technova.com`), Domain Expert (`expert@technova.com`), Employee (`employee@technova.com`).
   - Organization admin has imported initial target roles (e.g. `Java Backend Developer` / `Application Developer`) during onboarding via Excel workbook (`01_Org_Structure_Brightpath.xlsx`).
2. **Step 1 — L&D Manager assigns an eligible Expert, and dispatches:**
   - Log in as L&D Manager (`manager@technova.com`) and navigate to `/workspace/workspace-development/ld-manager/target-roles`.
   - Locate the target role in `DRAFT` status (or create/dispatch `ROLE-NEO4J-xxxx` aligned with Job Position `15-1252.00 Software Developers` with levels Senior, Middle, Junior, and Fresher).
   - Assign an eligible Domain Expert (`Dr. Sarah Chen` / `expert@technova.com`) and click `Create & Send to Expert` (or dispatch assigned role).
   - Role status initializes in `DRAFT` / `SENT` synchronized across L&D Manager and Expert catalogs.
   - L&D Manager clicks `View Architecture Graph` (Knowledge Graph icon) on the target role row to inspect role root, progressive levels, and baseline nodes on the interactive SVG canvas.
3. **Step 2 — Expert imports competencies, micro-skills and their relationships through import functions:**
   - Log in as Domain Expert (`expert@technova.com`) and open `/workspace/workspace-development/expert/ontology`.
   - On the ontology toolbar, click the unified `Import` button.
   - Upload the Excel workbook containing domain competencies, micro-skills, and their parent groupings.
   - Confirm import: entities and graph relationships persist immediately to PostgreSQL and Neo4j.
4. **Step 3 — Expert modifies the relationships by reverse prerequisites, delete prerequisites, add prerequisites through explore graph:**
   - In Ontology Explorer, switch to the `Explore Graph` tab (`vis-network` interactive canvas).
   - Drag micro-skill and competency nodes onto canvas; click `Neighbors` to expand connected entities.
   - **Add prerequisites:** Use `Connect` tool to establish directed relationship `[:HAS_SKILL_PREREQUISITE]` between source and target micro-skills.
   - **Reverse / Delete prerequisites:** Interactively select prerequisite edges to delete or reverse them.
   - Validate DAG cycle detection blocks circular prerequisite loops (`A -> B -> A`).
   - Test Zoom In, Zoom Out, and Fit to Viewport controls; inspect Node Inspector drawer.
5. **Step 4 — Expert opens the assigned role, sets competencies and micro-skill with knowledge level across target role levels, and submits to Manager:**
   - Navigate to `/workspace/workspace-development/expert/roles` and locate the assigned role in `DRAFT` status.
   - Click `Configure Micro-skills` (network nodes icon).
   - Across target role levels (Senior - Rank 1, Middle, Junior, Fresher), map member competencies and assign micro-skills with specific Required Knowledge Levels (`Foundation`, `Intermediate`, `Advanced`).
   - Click `Save Draft` (or `Save Configuration`) and click `Submit to L&D Manager`.
   - Role status transitions from `DRAFT` to `SUBMITTED`.
6. **Step 5 — L&D Manager reviews submitted specifications, approves, and publishes the role:**
   - Log in as L&D Manager (`manager@technova.com`) and navigate to `/workspace/workspace-development/ld-manager/target-roles`.
   - Locate the submitted role in `SUBMITTED` status.
   - Open review modal, inspect all level competencies, micro-skill knowledge levels, and durations.
   - Click `Approve & Publish`.
   - Role status updates to `PUBLISHED` (direct editing is locked/immutable; graph nodes and edges are activated).
   - Log in as Employee (`employee@technova.com`) and navigate to `/workspace/workspace-development/employee/target-roles` to verify the published role is visible in the upskilling catalog while draft roles remain strictly hidden.

- **Expected Results (from DS-02a):**
  - End-to-end role authoring, assignment, configuration, and publication lifecycle completes successfully.
  - Knowledge Graph dynamically renders updated entities.
  - Zero hardcoded hex colors, zero unhandled errors, and clean dialog closures throughout.
- **Automated Test Spec Reference:** [`frontend/system-tests/REQ-WF02-e2e-workflow.spec.ts`](../../frontend/system-tests/REQ-WF02-e2e-workflow.spec.ts)

---

### TC-WF02-ST01: Target Role Lifecycle State Transitions (DRAFT/STAGED → SENT → REJECTED → SUBMITTED → PUBLISHED → UNPUBLISHED / SUCCESSOR DRAFT)
- **Test Case ID:** `TC-WF02-ST01`
- **Scenario Reference:** `DS-02b` (Alternative Revision Loop) & `DS-02c` (Immutability & Referential Integrity)
- **Document Reference:** `SWP490_R2_BM04_Review2_Commitment_1(1).docx` (Table 11: Demo Scenarios DS-02b, DS-02c; Table 12: WF-02 Committed Test Cases; Table 13: Pass Criteria)
- **Excel Reference:** `Target roles management` ([`Report5_Test Report(2).xlsx`](../../Report5_Test%20Report(2).xlsx))
- **Test Type:** State Transition Test (Lifecycle State Machine Integrity & Exception Recovery)
- **Responsible Member:** Nguyễn Anh Khôi
- **Primary Actors:** L&D Manager (`manager@technova.com`), Domain Expert (`expert@technova.com`), Employee (`employee@technova.com`)
- **Pre-conditions (from DS-02b, DS-02c):**
  1. Workspace `TechNova Cognitive Labs` active with seeded departments and job positions.
  2. Role accounts authenticated with strict role-based access control (RBAC).
  3. Pre-existing micro-skills and competencies available for mapping.
- **State Transition Matrix & Exception Scenarios Verified (DRAFT/STAGED → SENT → REJECTED → SUBMITTED → PUBLISHED → UNPUBLISHED / SUCCESSOR DRAFT):**
  1. **Phase 1: DRAFT/STAGED → SENT (Create / Stage Role & Dispatch to Expert)**
     - Initial State: Target role exists in DRAFT / STAGED status (created or imported during onboarding, scoped to department).
     - L&D Manager assigns an eligible Domain Expert (Dr. Sarah Chen / expert@technova.com) and clicks Create & Send to Expert (or Send to Expert).
     - Role transitions to SENT status, synchronized in real time across L&D Manager and Domain Expert queues.
  2. **Phase 2: SENT → REJECTED (DS-02b Step 1: L&D Manager Revision Feedback Loop)**
     - L&D Manager reviews dispatched/sent role specifications, identifies missing competencies or requires threshold adjustments (e.g. Please calibrate intermediate proficiency thresholds and add Advanced level to PyTorch).
     - L&D Manager enters actionable revision feedback comment and clicks Return for Revision.
     - Status updates to REJECTED; direct editing on the L&D Manager table is locked to preserve revision delegation to the assigned Expert.
  3. **Phase 3: REJECTED → SUBMITTED (DS-02b Step 2: Expert Revision & Submission)**
     - Domain Expert logs in and inspects the assigned role in REJECTED status.
     - Amber revision feedback alert banner surfaces L&D Manager's exact comments and guidance.
     - Expert adds missing competencies and adjusts micro-skills with required knowledge levels (Foundation, Intermediate, Advanced).
     - Expert clicks Submit to L&D Manager -> status transitions from REJECTED to SUBMITTED.
  4. **Phase 4: SUBMITTED → PUBLISHED (DS-02b Step 3: Approval & Immutable Graph Publication)**
     - L&D Manager reviews resubmitted specifications, approves, and clicks Approve & Publish.
     - Role transitions to PUBLISHED; status updates across all tables; Neo4j graph nodes and edges ([:REQUIRES_SKILL], [:HAS_LEVEL]) are activated.
     - Direct modification is locked immediately (immutability rule).
  5. **Phase 5: PUBLISHED → UNPUBLISHED / SUCCESSOR DRAFT (DS-02c: Immutability, Successor Draft & Unpublish)**
     - **DS-02c Step 1 (Immutability Lock):** Attempt direct editing of published role -> verify direct modification is locked and disabled.
     - **DS-02c Step 2 (Successor Draft Spawn):** Click Create Successor Draft -> verify successor draft 1.1 is spawned in DRAFT status below the previous published role, inheriting configurations while 1.0 remains active and published.
     - **DS-02c Step 3 (Referential Integrity Protection):** Attempt deleting a micro-skill actively mapped to the published target role -> deletion is rejected with destructive warning toast (Cannot delete micro-skill: Skill is currently required by active Target Role(s)).
     - **Unpublish Action:** L&D Manager unpublishes role with confirmation dialog -> role transitions to UNPUBLISHED.
     - **Employee Isolation Assertion:** Employee account verifies role is immediately removed/isolated from active upskilling catalog.
- **Expected Results (from DS-02b, DS-02c & Table 13):**
  - All 6 lifecycle states execute flawlessly without data corruption or orphan records.
  - Exception scenario DS-02b (Alternative Revision Loop): 100% passing.
  - Exception scenario DS-02c (Immutability & Referential Integrity): 100% passing.
  - Test pass rate: 22/22 committed cases pass (100%), 0 open defects.
- **Automated Test Spec Reference:** [frontend/system-tests/REQ-WF02-state-transitions.spec.ts](../../frontend/system-tests/REQ-WF02-state-transitions.spec.ts)

---

## 4. Non-Functional Requirement: NFR-P02 (Performance — Graph Queries)

```
================================================================================
NON-FUNCTIONAL REQUIREMENT SPECIFICATION: NFR-P02
Quality Attribute: Performance — Graph Queries
Responsible Member: Nguyễn Anh Khôi
Automated Benchmark Suite: GraphQueryPerformanceBenchmarkTest.java
Target SLA: Every selected query runs within 1.0 s (1000 ms) after warm-up
================================================================================
```

### 4.1 Requirement Specification & Evaluation Criteria
- **Requirement ID:** `NFR-P02`
- **Quality Attribute:** Performance — graph queries
- **Specification:** Execution time of selected Role, Skill, prerequisite and pathway catalog queries. Every selected query run within 1 s after warm-up on the recorded catalog.
- **Benchmark Protocol:**
  - Select 4 representative queries:
    1. **Target Role Query (`Q1`):** Role hierarchical traversal with progressive mastery levels, competencies, and required micro-skills.
    2. **Skill & Taxonomy Query (`Q2`):** Micro-skill and competency taxonomy retrieval with certification prerequisites.
    3. **Prerequisite Query (`Q3`):** Directed skill prerequisite DAG traversal & multi-hop reachability check.
    4. **Pathway Catalog Query (`Q4`):** Adaptive baseline pathway catalog multi-entity expansion (`JobPosition -> TargetRole -> Level -> MicroSkill`).
  - Warm each query (3 warm-up runs discarded) to prime query plan caches and JVM execution paths.
  - Record 10 runs per query with fixed parameters on the recorded catalog snapshot.
  - Measure graph execution time in milliseconds, including result consumption; exclude full HTTP/UI network transport.
  - Retain all timings (Runs 1 to 10, Min, Max, Mean, Median p50, 95th Percentile p95).
  - Assert that all measured executions meet the strict threshold of **≤ 1.0 s (< 1000 ms)**.
- **Responsible Member:** Nguyễn Anh Khôi

### 4.2 Recorded Catalog Snapshot & Benchmark Environment
The benchmark was executed against the live Docker Compose environment (`compose.dev.yml`) with the official seeded organization `TechNova Cognitive Labs` (`e0000000-0000-0000-0000-000000000001`):
- **Graph Database Engine:** Neo4j Community Kernel `5.26.31`
- **Total Graph Nodes:** `1,098` nodes
  - `LearningModule`: 504
  - `Level`: 242
  - `MicroSkill`: 147
  - `Competency`: 108
  - `TargetRole`: 80
  - `JobPosition`: 8
  - `Department`: 7
  - `Certificate`: 2
- **Total Graph Relationships:** `4,486` edges
  - `REQUIRES_SKILL`: 2,185
  - `HAS_SKILL`: 736
  - `HAS_COMPETENCY`: 645
  - `TEACHES`: 504
  - `HAS_LEVEL`: 242
  - `HAS_ROLE`: 82
  - `HAS_SKILL_PREREQUISITE`: 79
  - `HAS_JOB_POSITION`: 11
  - `REQUIRES_CERTIFICATE`: 2
- **Hardware / Host Runtime:** Intel / AMD x86_64, Windows 11 host with Docker Desktop Linux container, Java 21 LTS runtime.

### 4.3 Representative Cypher Queries & Parameters

#### Query 1 (Q1): Target Role Hierarchical Traversal
- **Purpose:** Traverses a Target Role by code, expanding progressive mastery levels (`HAS_LEVEL`), competency groupings (`HAS_COMPETENCY`), and member micro-skill requirements (`REQUIRES_SKILL`, `HAS_SKILL`).
- **Fixed Parameters:** `organizationId = "e0000000-0000-0000-0000-000000000001"`, `code = "APPLICATION_DEVELOPER"`
- **Cypher Statement:**
```cypher
MATCH (r:TargetRole)
WHERE r.organizationId = $organizationId AND (r.code = $code OR r.baseCode = $code)
OPTIONAL MATCH (r)-[:HAS_LEVEL]->(l:Level)
WITH r, l ORDER BY coalesce(l.rank, 999) ASC, l.name ASC
WITH r, [x IN collect(DISTINCT CASE WHEN l IS NOT NULL THEN l.name END) WHERE x IS NOT NULL] AS graphLevels,
     [x IN collect(DISTINCT CASE WHEN l IS NOT NULL THEN { name: l.name, duration: coalesce(l.duration, '') } END) WHERE x IS NOT NULL] AS graphLevelDetails
OPTIONAL MATCH (r)-[:HAS_LEVEL]->(clvl:Level)-[:HAS_COMPETENCY]->(comp:Competency)
WHERE (comp.organizationId IS NULL OR comp.organizationId = r.organizationId) AND coalesce(comp.status, 'ACTIVE') = 'ACTIVE'
WITH r, graphLevels, graphLevelDetails,
     [x IN collect(DISTINCT CASE WHEN comp IS NOT NULL THEN {
         levelName: clvl.name,
         competencyId: comp.id,
         competencyCode: coalesce(comp.code, comp.id)
     } END) WHERE x IS NOT NULL] AS graphCompetencies
OPTIONAL MATCH (r)-[req:REQUIRES_SKILL]->(s:MicroSkill)
WHERE req.status='ACTIVE' AND (s.organizationId IS NULL OR s.organizationId=r.organizationId) AND s.status='ACTIVE'
WITH r, graphLevels, graphLevelDetails, graphCompetencies, [x IN collect(DISTINCT CASE WHEN s IS NOT NULL THEN {
    skillId: s.id,
    skillCode: s.code,
    skillName: s.name,
    level: coalesce(req.level, '')
} END) WHERE x IS NOT NULL] AS directSkills
OPTIONAL MATCH (r)-[:HAS_LEVEL]->(lvl:Level)-[:HAS_COMPETENCY]->(c:Competency)-[:HAS_SKILL]->(cs:MicroSkill)
OPTIONAL MATCH (lvl)-[lreq:REQUIRES_SKILL]->(cs)
WITH r, graphLevels, graphLevelDetails, graphCompetencies, directSkills, [x IN collect(DISTINCT CASE WHEN cs IS NOT NULL THEN {
    skillId: cs.id,
    skillCode: cs.code,
    skillName: cs.name,
    level: coalesce(lreq.level, lvl.name, '')
} END) WHERE x IS NOT NULL] AS levelSkills
WITH r, graphLevels, graphLevelDetails, graphCompetencies, CASE WHEN size(directSkills) > 0 THEN directSkills ELSE levelSkills END AS graphSkills
RETURN r, graphSkills, graphLevels, graphLevelDetails, graphCompetencies
```

#### Query 2 (Q2): Micro-Skill & Competency Taxonomy Search
- **Purpose:** Traverses micro-skills, their parent competencies, status filters, and certification requirements across the organization.
- **Fixed Parameters:** `organizationId = "e0000000-0000-0000-0000-000000000001"`
- **Cypher Statement:**
```cypher
MATCH (c:Competency)-[:HAS_SKILL]->(s:MicroSkill)
WHERE (c.organizationId IS NULL OR c.organizationId = $organizationId)
  AND (s.organizationId IS NULL OR s.organizationId = $organizationId)
  AND coalesce(c.status, 'ACTIVE') = 'ACTIVE'
  AND coalesce(s.status, 'ACTIVE') = 'ACTIVE'
OPTIONAL MATCH (s)-[reqCert:REQUIRES_CERTIFICATE]->(cert:Certificate)
RETURN s.id AS skillId, s.code AS skillCode, s.name AS skillName,
       c.id AS competencyId, c.name AS competencyName,
       collect(DISTINCT cert.name) AS certificates
ORDER BY s.code ASC
```

#### Query 3 (Q3): Directed Skill Prerequisite DAG Traversal
- **Purpose:** Traverses all active directed prerequisite relationships (`[:HAS_SKILL_PREREQUISITE]`), maps source and target skills, dependent and prerequisite knowledge levels, and evaluates transitive multi-hop prerequisite paths up to depth 5.
- **Fixed Parameters:** `organizationId = "e0000000-0000-0000-0000-000000000001"`
- **Cypher Statement:**
```cypher
MATCH (source:MicroSkill)-[rel:HAS_SKILL_PREREQUISITE]->(target:MicroSkill)
WHERE (source.organizationId IS NULL OR source.organizationId = $organizationId)
  AND (target.organizationId IS NULL OR target.organizationId = $organizationId)
  AND coalesce(rel.status, 'ACTIVE') = 'ACTIVE'
OPTIONAL MATCH path = (source)-[:HAS_SKILL_PREREQUISITE*1..5]->(ancestor:MicroSkill)
RETURN source.code AS sourceCode, source.name AS sourceName,
       target.code AS targetCode, target.name AS targetName,
       rel.dependentKnowledgeLevel AS dependentLevel,
       rel.prerequisiteKnowledgeLevel AS prerequisiteLevel,
       length(path) AS depth
ORDER BY source.code ASC, target.code ASC
```

#### Query 4 (Q4): Adaptive Baseline Pathway Catalog Snapshot
- **Purpose:** Full multi-entity traversal across `JobPosition` -> `TargetRole` -> `Level` -> `MicroSkill` used by `Neo4jAdaptiveBaselineCatalogAdapter` to construct an employee's adaptive baseline learning pathway.
- **Fixed Parameters:** `organization = "e0000000-0000-0000-0000-000000000001"`, `jobPosition = "OCC-15-1252.00"`
- **Cypher Statement:**
```cypher
MATCH (jobPosition:JobPosition {id:$jobPosition}) WHERE jobPosition.status='ACTIVE'
  AND (jobPosition.organizationId IS NULL OR jobPosition.organizationId=$organization)
OPTIONAL MATCH (jobPosition)-[membership:HAS_ROLE]->(role:TargetRole)
WHERE membership.status='ACTIVE' AND role.status IN ['ACTIVE','PUBLISHED']
  AND (role.organizationId IS NULL OR role.organizationId=$organization)
  AND (membership.organizationId IS NULL OR membership.organizationId=$organization)
OPTIONAL MATCH (owner:JobPosition)-[ownership:HAS_ROLE]->(role)
WHERE owner.status='ACTIVE' AND ownership.status='ACTIVE'
WITH jobPosition,membership,role,collect(DISTINCT owner.id) AS owners
OPTIONAL MATCH (role)-[roleLevel:HAS_LEVEL]->(level:Level)-[requirement:REQUIRES_SKILL]->(skill:MicroSkill)
WHERE roleLevel.status='ACTIVE' AND level.status='ACTIVE' AND requirement.status='ACTIVE' AND skill.status='ACTIVE'
  AND (roleLevel.organizationId IS NULL OR roleLevel.organizationId=$organization)
  AND (level.organizationId IS NULL OR level.organizationId=$organization)
  AND (requirement.organizationId IS NULL OR requirement.organizationId=$organization)
  AND (skill.organizationId IS NULL OR skill.organizationId=$organization)
RETURN elementId(jobPosition) AS jobPositionNode,elementId(role) AS roleNode,elementId(level) AS levelNode,elementId(skill) AS skillNode,
       properties(jobPosition) AS jobPosition,properties(membership) AS membership,properties(role) AS role,
       owners,properties(roleLevel) AS roleLevel,properties(level) AS level,
       properties(requirement) AS requirement,properties(skill) AS skill
```

### 4.4 Measured Benchmark Results (10 Runs per Query)

#### Summary Metrics Table
| Query ID | Representative Query Description | Consumed Records | Min (ms) | Max (ms) | Mean (ms) | Median (p50) | P95 (ms) | Target SLA | Test Result |
|:---:|:---|---:|---:|---:|---:|---:|---:|:---:|:---:|
| **Q1** | **Target Role Hierarchical Traversal** | 1 | 20.26 ms | 87.81 ms | 29.78 ms | 23.15 ms | 87.81 ms | ≤ 1,000 ms | **PASSED** |
| **Q2** | **Micro-Skill & Competency Taxonomy Search** | 330 | 25.58 ms | 64.76 ms | 33.26 ms | 28.83 ms | 64.76 ms | ≤ 1,000 ms | **PASSED** |
| **Q3** | **Directed Skill Prerequisite DAG Traversal** | 540 | 19.44 ms | 37.30 ms | 26.88 ms | 26.45 ms | 37.30 ms | ≤ 1,000 ms | **PASSED** |
| **Q4** | **Adaptive Baseline Pathway Catalog Snapshot** | 398 | 34.10 ms | 66.49 ms | 48.80 ms | 45.35 ms | 66.49 ms | ≤ 1,000 ms | **PASSED** |

#### Detailed 10-Run Timing Matrix (Retained All Timings)
| Run # | Q1: Role Query (ms) | Q2: Skill Query (ms) | Q3: Prerequisite Query (ms) | Q4: Pathway Query (ms) |
|:---:|:---:|:---:|:---:|:---:|
| **Run 1** | 27.07 ms | 37.39 ms | 28.63 ms | 62.98 ms |
| **Run 2** | 22.86 ms | 28.30 ms | 24.89 ms | 58.71 ms |
| **Run 3** | 24.98 ms | 34.02 ms | 28.64 ms | 51.67 ms |
| **Run 4** | 26.11 ms | 26.52 ms | 27.55 ms | 45.97 ms |
| **Run 5** | 22.58 ms | 26.64 ms | 24.69 ms | 44.72 ms |
| **Run 6** | 23.43 ms | 25.58 ms | 19.44 ms | 42.24 ms |
| **Run 7** | 21.98 ms | 29.35 ms | 25.72 ms | 41.92 ms |
| **Run 8** | 87.81 ms | 64.76 ms | 37.30 ms | 66.49 ms |
| **Run 9** | 20.26 ms | 31.82 ms | 27.18 ms | 39.22 ms |
| **Run 10** | 20.69 ms | 28.26 ms | 24.77 ms | 34.10 ms |
| **Mean** | **29.78 ms** | **33.26 ms** | **26.88 ms** | **48.80 ms** |
| **p50 (Median)** | **23.15 ms** | **28.83 ms** | **26.45 ms** | **45.35 ms** |
| **p95** | **87.81 ms** | **64.76 ms** | **37.30 ms** | **66.49 ms** |

### 4.5 Formal Test Case Specification: TC-NFR-P02

### TC-NFR-P02: Benchmark Execution Time of Selected Role, Skill, Prerequisite, and Pathway Catalog Queries (SLA ≤ 1.0 s)
- **Test Case ID:** `TC-NFR-P02`
- **Quality Attribute / Requirement:** NFR-P02 (Performance — Graph queries)
- **Test Type:** Non-Functional Automated Performance Benchmark Test
- **Responsible Member:** Nguyễn Anh Khôi
- **Excel Reference:** `Report 5 / Quality Attributes / NFR-P02`
- **Target Component:** Neo4j Graph Database Kernel (`5.26.31`) & Graph Repositories
- **Pre-conditions:**
  1. Docker Compose test environment (`compose.dev.yml`) is running with container `adapt-learn-graph-dev-neo4j-1`.
  2. The recorded catalog is pre-seeded with at least 1,000 nodes and 4,000 relationships for workspace `TechNova Cognitive Labs` (`e0000000-0000-0000-0000-000000000001`).
  3. Fixed query parameters configured for Target Role, Micro-Skill, Prerequisite DAG, and Adaptive Baseline Pathway.
- **Test Data & Query Parameters:**
  - Catalog Snapshot: 1,098 nodes, 4,486 relationships.
  - Q1 (Target Role): `organizationId = "e0000000-0000-0000-0000-000000000001"`, `code = "APPLICATION_DEVELOPER"`
  - Q2 (Skill Taxonomy): `organizationId = "e0000000-0000-0000-0000-000000000001"`
  - Q3 (Prerequisite DAG): `organizationId = "e0000000-0000-0000-0000-000000000001"`
  - Q4 (Pathway Catalog): `organization = "e0000000-0000-0000-0000-000000000001"`, `jobPosition = "OCC-15-1252.00"`
- **Step-by-Step Procedure:**
  1. Establish active Bolt driver connection to `bolt://127.0.0.1:7687` using credentials `neo4j` / `local-only-neo4j`.
  2. Inspect and verify database metadata, version (`5.26.31`), total node counts (1,098), and relationship counts (4,486).
  3. **Warm-up Phase:** Execute each of the 4 representative queries 3 times without recording timings to ensure Cypher query plans are compiled, cached in memory, and the JVM JIT compiler optimizes execution hot paths.
  4. **Measurement Phase — Q1 (Target Role Hierarchical Traversal):**
     - Record timestamp with nanosecond resolution (`System.nanoTime()`).
     - Execute Cypher query and iterate/consume the entire returned record set.
     - Record elapsed time in milliseconds ($t = \Delta \text{ns} / 10^6$).
     - Repeat for exactly 10 sequential iterations.
  5. **Measurement Phase — Q2 (Micro-Skill & Competency Taxonomy Search):**
     - Repeat timed execution and full result consumption for 10 iterations.
  6. **Measurement Phase — Q3 (Directed Skill Prerequisite DAG Traversal):**
     - Repeat timed execution and full result consumption for 10 iterations.
  7. **Measurement Phase — Q4 (Adaptive Baseline Pathway Catalog Snapshot):**
     - Repeat timed execution and full result consumption for 10 iterations.
  8. **Statistical Analysis & Verification:**
     - Compute Min, Max, Mean (Average), Median (p50), and 95th Percentile (p95) for each query.
     - Assert that every measured duration $t_i \le 1,000\text{ ms}$ (1.0 s).
- **Expected Results:**
  - All 4 queries return valid, complete record sets corresponding to the active catalog schema.
  - 100% of measured query runs (40 out of 40 runs) complete execution and result consumption within 1.0 s (1,000 ms).
  - No query timeouts, connection drops, or Cypher syntax/runtime exceptions occur.
- **Actual Measured Results:**
  - **Q1 (Role):** Min = 20.26 ms, Max = 87.81 ms, Mean = 29.78 ms, Median = 23.15 ms, p95 = 87.81 ms $\rightarrow$ **PASSED** (87.81 ms << 1,000 ms)
  - **Q2 (Skill):** Min = 25.58 ms, Max = 64.76 ms, Mean = 33.26 ms, Median = 28.83 ms, p95 = 64.76 ms $\rightarrow$ **PASSED** (64.76 ms << 1,000 ms)
  - **Q3 (Prerequisite):** Min = 19.44 ms, Max = 37.30 ms, Mean = 26.88 ms, Median = 26.45 ms, p95 = 37.30 ms $\rightarrow$ **PASSED** (37.30 ms << 1,000 ms)
  - **Q4 (Pathway):** Min = 34.10 ms, Max = 66.49 ms, Mean = 48.80 ms, Median = 45.35 ms, p95 = 66.49 ms $\rightarrow$ **PASSED** (66.49 ms << 1,000 ms)
  - Steady-state warm executions: 11.95 ms – 54.60 ms.
- **Status:** **PASSED (100% SLA Compliance)**
- **Automated Benchmark Spec:** [`backend/src/test/java/com/adaptlearngraph/repository/GraphQueryPerformanceBenchmarkTest.java`](../../backend/src/test/java/com/adaptlearngraph/repository/GraphQueryPerformanceBenchmarkTest.java)

---

### 4.6 Evaluation Analysis & Conclusion
- **SLA Compliance:** Every individual query run across all 40 measured runs completed and was fully consumed in **≤ 87.81 ms**, well under **9%** of the 1,000 ms SLA upper boundary.
- **Latency Distribution:** Average query latency spans between **26.88 ms** and **48.80 ms**, proving lightning-fast response times on multi-hop graph traversals across more than 1,000 nodes and 4,400 relationships.
- **Verification Outcome:** **PASSED (100% compliance with NFR-P02)**.
- **Automated Benchmark Spec:** [`backend/src/test/java/com/adaptlearngraph/repository/GraphQueryPerformanceBenchmarkTest.java`](../../backend/src/test/java/com/adaptlearngraph/repository/GraphQueryPerformanceBenchmarkTest.java)

---

## 5. How to Execute Tests

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

### Run Non-Functional Performance Benchmark (NFR-P02 Graph Queries)
```bash
# Execute Graph Query Performance Benchmark against live Neo4j catalog
java -cp "backend/target/classes;backend/target/test-classes;backend/target/deps/*" com.adaptlearngraph.repository.GraphQueryPerformanceBenchmarkTest
```

### Run Backend Unit & Integration Tests
```bash
# Run Target Role Lifecycle Domain Test
.\backend\mvnw.cmd test -Dtest=TargetRoleLifecycleTest

# Run Neo4j Integration Test
.\backend\mvnw.cmd test -Dtest=TargetRoleAndMicroSkillNeo4jIntegrationTest
```

