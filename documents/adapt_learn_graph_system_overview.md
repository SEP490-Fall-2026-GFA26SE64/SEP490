# Adapt-Learn-Graph System Overview

**Current source checkpoint,2026-10-22:** approved slices1–5 now include full-Occupation admission, common Manager form/calculator/list/lifecycle and pinned full/legacy Employee result/history. Main compile, production FE type/lint/build and bounded isolated manual observations passed. Browser interaction remains unverified; no executable acceptance, user-data migration, stage/commit/push or automatic Cluster3. See [evidence/checklist](testing/system/REQ-002-F02-REQ-009-occupation-ui-results.md).

## 1. System Overview

**Adapt-Learn-Graph** is an internal enterprise system for managing employee competencies and supporting personalized learning within one organization. It connects target roles, competencies, micro-skills, learning modules and assessments through a knowledge graph. The system identifies skill gaps, recommends learning pathways, and updates those pathways based on assessment outcomes.

The system has four human actors: **System Administrator, L&D Manager, Expert, and Employee**. AI-assisted role guidance, competency gap analysis, and pathway recommendation are automated system functions.

## 2. System Boundary and Scope

### In scope

- User account and access administration.
- Discipline, target role, and competency requirement management.
- Micro-skill, prerequisite, learning module, question bank, and assessment management.
- Baseline and RIASEC assessments.
- AI-assisted target role guidance reviewed by an Expert.
- Competency profile and skill gap analysis.
- Learning pathway generation and initial Expert review, including module inclusion or exclusion.
- Learning progress tracking, knowledge tracing, and pathway recalculation.
- Employee-selected learning of individual micro-skills, independent of a target role pathway.

### Out of scope

- Multi-organization registration and workspace allocation.
- Subscription selection, payment processing, and SaaS billing.

## 3. Actors at a Glance

| Actor | Primary responsibility |
|---|---|
| **System Administrator** | Maintains user accounts, access, system configuration, and activity records. |
| **L&D Manager** | Creates target roles, assigns them to Experts for competency configuration, manages baseline assessment settings and target role publication, approves learning offerings, and monitors development. |
| **Expert (Subject Matter Expert)** | Manages discipline-specific skills and learning/assessment content; reviews AI role guidance and generated pathways. |
| **Employee** | Completes assessments and learning activities, reviews competency gaps, and develops toward a target role. |

## 4. Actors and Main Functions

### 4.1 System Administrator

**Purpose:** Maintain system access and operation.

- **Manage user accounts:** Create accounts, update user information, activate or deactivate accounts, and view account status.
- **Manage roles and permissions:** Assign or remove system roles and control access to functions and data.
- **Manage system configuration:** Set organization-wide technical options and other administrative parameters. Assessment content and business rules are managed by the L&D Manager or Expert according to assessment type.
- **Monitor system activity:** View audit records and operational activity for troubleshooting and oversight.

### 4.2 L&D Manager

**Purpose:** Set the organization’s competency and learning direction.

- **Manage disciplines:** Create, update, view, and deactivate disciplines used to organize expertise and learning content.
- **Assign Experts:** Assign or remove Experts from disciplines and review current assignments.
- **Manage target roles:** Create and update target role details, assign each target role to an Expert for competency configuration, and view its configuration status.
- **Manage target role publication:** Review the Expert’s completed competency configuration, then publish or unpublish the target role. L&D does not edit the Expert’s competency requirements.
- **Manage baseline assessment configuration:** Maintain one stable versioned baseline per Occupation and one capacity-valid maximum-question/total-duration pair for the full deduplicated active-role skill/item union. Save draft → Preview assessment → Activate, with confirmed atomic replacement, direct Deactivate and Draft/Active/Retiring/Inactive availability that preserves pinned attempts/history. Time-per-question is a calculator aid with an explicit one-minute suggestion, not a separate timeout/default. There are no per-Role/exploration settings, points/weights or shared generated assessment. Detailed lifecycle/transition proposals and unresolved limits are marked in the 2026-10-22 REQ-002 contracts; they are not implementation claims.
- **Approve learning offerings:** Review submitted modules and assessments; approve them for organizational use or return them for revision.
- **Monitor employee development:** View employee competency profiles, skill gaps, assessment results, and learning progress.

### 4.3 Expert (Subject Matter Expert)

**Purpose:** Maintain subject-matter knowledge and validate learning guidance for assigned disciplines.

- **Manage micro-skills:** Create, view, update, and deactivate micro-skills within assigned disciplines, including descriptions and proficiency levels.
- **Manage role competency requirements:** For target roles assigned by the L&D Manager, add or remove required competencies and micro-skills, and set their required proficiency levels and relative importance.
- **Manage skill prerequisites:** Define, update, or remove prerequisite relationships between micro-skills.
- **Manage learning modules:** Create, update, organize, and submit modules for approval; map modules to the micro-skills they teach.
- **Manage learning content:** Add, update, organize, and remove lesson/practice content within a learning module. Each module teaches exactly one micro-skill, and each skill has exactly one module.
- **Manage module assessments:** Create and update assessment questions for assigned learning modules, classify questions by micro-skill and difficulty, configure module assessment rules, and submit assessments for approval.
- **Review AI role guidance:** Review AI-suggested target roles and comments based on an employee’s baseline and RIASEC assessments; confirm, revise, or reject the guidance.
- **Review initial learning pathways:** Review the first pathway generated for an employee and target role before the employee starts it; include or exclude suggested modules and confirm the reviewed pathway.
- **Submit content for approval:** Send new or revised modules and assessments to the L&D Manager for organizational approval.

### 4.4 Employee

**Purpose:** Understand current competencies and develop toward a relevant target role.

- **Manage personal profile:** View and update personal and work-related profile information used by the system.
- **Complete baseline assessment:** Every new entry, through any selected Role or an authorized Occupation, assesses the full Occupation union using the same bounds pair. The Employee receives an individual server-timed adaptive 3PL sequence, not separate Role tests; valid early stopping remains. One prior mastery-producing completion closes the Employee+Occupation allowance across Role choices; only invalidated/no-mastery attempts permit linked replacement. Old attempts/results retain their recorded scope/pins and are never rescored, relabeled or reset by this change.
- **Complete RIASEC assessment:** Answer the questions used to inform interest-based role guidance.
- **Review target role guidance:** View Expert-reviewed AI suggestions and comments, then select or confirm a target role.
- **Review competency profile and gaps:** View estimated competency levels and gaps against the selected target role.
- **Follow a learning pathway:** View and follow the pathway after Expert review.
- **Learn an individual skill:** Browse available micro-skills, choose one to learn, and access its one mapped module without starting or changing a target role pathway.
- **Complete learning and assessments:** Access assigned modules, take their assessments, and submit responses.
- **Track learning progress:** View completed activities, assessment outcomes, and pathway status.

## 5. Main Business Flows

| Business flow | Main actor(s) | Result |
|---|---|---|
| User and access administration | System Administrator | Users have accounts and access appropriate to their responsibilities. |
| Discipline and Expert assignment | L&D Manager | Disciplines are maintained and Experts are assigned to them. |
| Target role setup and publication | L&D Manager; Expert | L&D creates and assigns a target role; the Expert configures its competency requirements and submits it as complete; L&D reviews the status and publishes or unpublishes it. |
| Competency and learning content management | Expert; L&D Manager for approval | Discipline knowledge and learning/assessment content are maintained and approved. |
| Assessment and target role guidance | Employee; Expert reviews guidance | Employee receives reviewed, assessment-informed role guidance. |
| Skill gap analysis and pathway creation | System; Expert; Employee | A pathway is generated, reviewed, and made available to the Employee. |
| Learning, assessment, and adaptation | Employee; system functions | Learning progress and competency estimates are updated, and the pathway can adapt. |
| Individual skill learning | Employee; system functions | Employee selects a micro-skill and studies its mapped learning content independently of a target role pathway; assessment evidence can update the competency estimate. |
| Learning and competency monitoring | L&D Manager | Employee development progress can be reviewed. |

## 6. Automated System Functions

These functions are performed by the system and are not separate actors:

- **AI-assisted target role guidance:** Uses baseline and RIASEC assessment results to suggest target roles and explanatory comments; the Expert reviews the guidance and the Employee selects or confirms a role.
- **Competency gap analysis:** Compares current competency estimates with target role requirements.
- **Knowledge graph recommendation:** Finds relevant modules using skill mappings and prerequisites.
- **Pathway generation:** Proposes an ordered set of learning modules from the Employee’s competency gaps and the knowledge graph; the Expert reviews the initial pathway, includes or excludes modules, and confirms it before the Employee starts. Later pathway recalculations respond to new assessment evidence.
- **Knowledge tracing:** Initializes mastery from versioned baseline IRT evidence, then updates it from later learning evidence without double-counting the baseline responses.
- **Pathway recalculation:** Revises the remaining pathway when new evidence changes the Employee’s learning needs.
- **Progress tracking:** Records assessment, module, and pathway completion status.
- **Skill-based content discovery:** Shows the module mapped to an Employee-selected micro-skill, independent of target role pathway recommendations.

## 7. Responsibility Boundaries

| Activity or decision | Responsible party |
|---|---|
| Accounts, permissions, and system settings | System Administrator |
| Disciplines, target role creation, Expert assignment, baseline assessment configuration, and publication status | L&D Manager |
| Micro-skills, prerequisites, modules, module assessments, and competency requirements for assigned target roles | Expert |
| Organizational approval of learning offerings | L&D Manager |
| AI-generated target role suggestions and comments | System generates; Expert reviews; Employee selects or confirms |
| Initial pathway review and module inclusion or exclusion | Expert |
| Learning participation and assessment completion | Employee |
| Optional learning of individual skills outside a target role pathway | Employee selects a skill; Expert maintains its mapped learning content; system records progress and assessment evidence |
| Competency estimate and pathway updates from recorded evidence | System, using configured rules |
