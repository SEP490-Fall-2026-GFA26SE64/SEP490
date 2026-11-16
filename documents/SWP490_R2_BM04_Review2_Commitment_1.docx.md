**SWP490 · CAPSTONE PROJECT · REVIEW 2 · BM04**

# **Review 2 Commitment**

*Form BM04. Completed within 3 working days after Review 2 and confirmed by both reviewers and the supervisor. This document is the sole basis for Defense 1.1 and the Viva. One block per main workflow (section 6\) and one block per member (section 7): duplicate or delete blocks to match the team. Export to PDF. File name: SWP490\_\<ProjectCode\>\_R2\_Commitment.pdf*

## **1\. Project Information**

| Project code | FA26SE267 |
| :---- | :---- |
| **Project name** | Knowledge Graph-Based Adaptive Learning and Competency Intelligence Platform |
| **Team** | GFA26SE64 |
| **Supervisor** | Hoàng Thu Hà |
| **Review 2 date** | 03/11/2026 |
| **Reviewer 1** |  |
| **Reviewer 2** |  |
| **Version** | 1.0 |
| **Date** | 01/11/2026 |

## **2\. Final Registration Form**

| Final version |  |
| :---- | :---- |
| **Approved at Review 2 (Yes/No)** |  |
| **Attached file name** |  |

*After this point the project scope does not change.*

## **3\. Mandatory Features**

| ID | Feature | Actor | Acceptance criteria | Workflow | Owner |
| :---- | :---- | :---- | :---- | :---- | :---- |
| FR-01.01 | Register an organization | Guest | Validate and persist organization/administrator details; verify email; enroll MFA and issue recovery codes; resume the same registration; persist the optional starter catalog selection without granting workspace access. | WF-01 | Đặng Minh Hoàng |
| FR-01.02 | Select a subscription | Guest | Compare available plans by price, currency, calendar-month duration and Employee seats; select an immutable available plan version; reject unavailable selections and prevent client-controlled commercial terms. | WF-01 | Đặng Minh Hoàng |
| FR-01.03 | Pay for a subscription | Guest; payOS; System | Create owner-bound checkout from trusted plan terms; distinguish verified full payment from pending/partial/unknown/failed payment; enforce idempotent requests and permitted retry/replacement without duplicate charges. | WF-01 | Đặng Minh Hoàng |
| FR-01.04 | Track onboarding and access the workspace | Guest; initial System Administrator | Show authoritative registration/payment/application/setup status; deny unauthorized status access; permit entry at the reserved workspace slug only after verified payment, completed setup and valid owner assurance. | WF-01 | Đặng Minh Hoàng |
| FR-07.03 | Provision organization workspaces | System | Atomically create the organization/workspace, initial administrator membership and purchased paid period; copy selected catalog with tenant-owned IDs before READY; record failures and retry eligible processing without duplicate grants. | WF-01 | Đặng Minh Hoàng |
|  |  |  |  |  |  |

## **4\. Non-Functional Requirements**

| ID | Quality attribute | Metric | Threshold | Measurement method | Owner |
| :---- | :---- | :---- | :---- | :---- | :---- |
| NFR-WF01-SEC | Security and tenant isolation | Unauthorized status/order/entry requests denied; secret leakage in ordinary responses and retained evidence | 100% denial for defined unauthorized probes; 0 leaked passwords, email proofs, TOTP secrets or recovery codes | Owner/non-owner/signed-out API and Playwright checks; response/evidence inspection. Defense target, not measured in this document. | Đặng Minh Hoàng |
| NFR-WF01-INT | Transactional integrity and idempotency | Duplicate/orphan workspaces, memberships, paid periods or copied catalog entities per logical initial purchase; foreign catalog relationships | 0 duplicates/orphans; 0 cross-tenant relationships; copied counts equal the captured selection closure | SQL/Neo4j assertions with replay, concurrency, rollback and worker-lease fixtures. Defense target, not measured in this document. | Đặng Minh Hoàng |
| NFR-WF01-REL | Reliable and truthful onboarding | Premature workspace entry; state errors hidden as success; WF-01 case pass rate | 0 premature grants; explicit pending/partial/unknown/failure states; at least 16/17 cases pass and 100% mandatory main-path/E2E cases pass | Three-round report results, feature checks, one Organization Registration state-sequence test and connected Playwright E2E. Current 17 cases are Pending. | Đặng Minh Hoàng |

## **5\. Out of Scope**

| Item | Reason |
| :---- | :---- |
|  |  |
|  |  |
|  |  |

## **6\. Workflow Commitments**

*Minimum number of main workflows \= number of team members. Each workflow has exactly one owner. Each mandatory feature belongs to at least one workflow.*

### **6.1 Workflow WF-01**

| Workflow name | Organization Onboarding |
| :---- | :---- |
| **Owner (one member)** | Đặng Minh Hoàng — Member 1, SE193626 |
| **Supporting members** | S2: graph/catalog-copy integration; S3: registration/subscription/status UI and browser integration; S4: versioned demo fixtures and system-test evidence, following Version 2 section 3.2(g). Support does not create a second workflow owner; all 17 WF-01 case IDs are counted only for Member 1. |
| **Actors** | Guest; System; payOS payment provider; initial System Administrator after authorized workspace handoff. |
| **Trigger** | Guest opens `/guest/register` to register an organization, optionally selects a starter catalog, or opens `/guest/resume` to continue a saved registration. |
| **Business outcome** | A verified administrator purchases an existing subscription; the System creates exactly one organization workspace at its reserved slug, assigns the initial administrator, activates the purchased paid period and copies the selected starter catalog before allowing workspace entry. Empty selection produces an empty catalog. This is the committed Defense outcome, not a new execution claim. |
| **Main entity state path** | One main entity: Organization Registration (ST-01), creation → EMAIL_PENDING → MFA_PENDING → REGISTERED, with resend/rejected-proof, enrollment retry/resume and authenticated resume self-loops. TC_WF01_ST_01 is one sequence test asserting each checkpoint and rejecting direct EMAIL_PENDING → REGISTERED without email/MFA proof. Payment, workspace readiness and catalog copy remain supporting feature/E2E integrations, not separately committed state-test entities in this minimum set. |
| **Activity diagram (Report 4 section)** | ACT-01 Organization onboarding is in [Report 3, section 2.2.1](../Review%202/Report3_Software%20Requirement%20Specification.md), not an activity-diagram section in Report 4. Supporting design: [Report 4, sections 3.1.2 (SEQ-01), 3.1.4 (ST-01), 3.2.2 (SEQ-03) and 3.2.4 (ST-07/ST-22)](../Review%202/Report4_Software%20Design%20Document.md). The template label is retained; no nonexistent Report 4 section is invented. |

**Features in this workflow**

| Feature ID | Feature | Acceptance criteria | Test case IDs |
| :---- | :---- | :---- | :---- |
| FR-01.01 | Register an organization | Validate required fields, unique email/slug and legitimate optional nulls; persist actual email/MFA proof and single-use recovery codes; resume without duplication; preview/save the optional catalog selection. Registration alone grants no paid workspace. | TC_WF01_REG_01 to TC_WF01_REG_03 (3 feature cases: main, data/business rule, exception); selected catalog is also exercised by TC_WF01_E2E_01. |
| FR-01.02 | Select a subscription | Display existing plan terms and select an available immutable version; server-owned amount/currency/duration/seats cannot be overridden by the client; unavailable/unknown/changed selections require explicit resolution. | TC_WF01_PLAN_01 to TC_WF01_PLAN_03 (3 feature cases) |
| FR-01.03 | Pay for a subscription | Create owner-bound checkout; accept only verified full payment; preserve pending/partial/unknown/failed outcomes; deny foreign/CSRF-invalid operations; reuse or replace orders only when permitted and idempotently. | TC_WF01_PAY_01 to TC_WF01_PAY_03 (3 feature cases: main, data/business rule, exception/authorization). |
| FR-01.04 | Track onboarding and access the workspace | Read authoritative registration/payment/application/setup state; surface connectivity/failure explicitly; reject foreign status/entry; hand off to `/workspace/{slug}/admin/subscription` only when the owner, payment and setup are eligible. | TC_WF01_STATUS_01 to TC_WF01_STATUS_03 (3 feature cases: main, data/business rule, exception/authorization). |
| FR-07.03 | Provision organization workspaces | Provision one workspace/membership/paid period atomically; preserve purchased terms; copy the complete selected closure with new tenant IDs before READY; handle rollback/replay/lease/final failures without duplicate entitlement or cross-tenant data. | TC_WF01_PROV_01, TC_WF01_PROV_02, TC_WF01_PROV_05 (3 feature cases: main, data/business rule, exception). Retained IDs are not renumbered. |

**Demo scenarios**

| Scenario ID | Type | Preconditions and data | Main steps | Expected result | Presenter |
| :---- | :---- | :---- | :---- | :---- | :---- |
| DS-01a | Main | The organization has not registered. The administrator can access their email and authenticator app. Subscription plans and starter learning content are available. | 1. Enter organization details and select starter learning content. 2. Create the administrator account, verify email and set up the authenticator. 3. Select a subscription plan and complete payment. 4. Wait for workspace preparation to finish. 5. Enter the workspace and check the organization, subscription and selected content. | The organization is registered successfully. The administrator can enter their organization's workspace after payment is confirmed and preparation is complete. The workspace shows the purchased subscription and selected learning content, without creating a duplicate organization. | Đặng Minh Hoàng |
| DS-01b | Exception | An existing email and workspace address are available for checking duplicates. The registrant has not verified their email. Another account belongs to a different organization. | 1. Enter a duplicate email or workspace address, or an invalid password. 2. Enter an incorrect email verification code or try to skip verification. 3. Use the other account to view the registrant's payment or workspace. 4. Correct the information and continue registration. | Clear messages explain invalid or duplicate information and incorrect verification codes. Registration cannot continue until the errors are corrected and email is verified. Another organization's account cannot view the payment information or enter the workspace. The registrant can correct the information and continue without registering again. | Đặng Minh Hoàng |
| DS-01c | Exception | The administrator has verified their email but has not finished setting up the authenticator. An incorrect code and a valid current code are available. | 1. Enter the incorrect authenticator code and confirm. 2. Check the error message and reopen registration. 3. Enter the valid code, save the recovery codes and complete setup. | The incorrect code is rejected with a clear message. Registration remains incomplete and workspace access is not granted. The administrator can retry with a valid code and complete setup without creating another account. | Đặng Minh Hoàng |

**Committed test cases**

| Test type | Count | Automated in CI | Responsible member(s) |
| :---- | :---- | :---- | :---- |
| *Feature tests (≥ 3 per feature)* | 15: exactly 3 for each of the 5 features (REG, PLAN, PAY, STATUS, PROV). Each feature has 1 main, 1 data/business-rule and 1 exception/authorization case. | 15 planned by Defense 1.1; actual CI execution/mapping not verified. Unit/API, real-store integration and browser checks as applicable. | Đặng Minh Hoàng |
| *End-to-end workflow test (≥ 1\)* | 1: TC_WF01_E2E_01, DS-01a; registration → subscription/payment → catalog-ready workspace entry. | 1 planned Playwright real-API/store journey in CI with controlled external-provider fixtures; not executed. | Đặng Minh Hoàng |
| *State transition tests (≥ 1 per transition)* | 1: TC_WF01_ST_01, Organization Registration only. One sequence asserts creation → EMAIL_PENDING → MFA_PENDING → REGISTERED, the ST-01 self-loops and rejection of direct EMAIL_PENDING → REGISTERED. Each transition has an explicit assertion in this shared case; all checkpoints must pass. No separate workspace/import state cases are committed. | 1 planned API/real-persistence sequence in CI; not executed. Count the case once, not once per checkpoint. | Đặng Minh Hoàng |
| *Total for this workflow* | 17 unique cases = 15 feature + 1 E2E + 1 Organization Registration state-sequence case; each ID counted once. All three Excel rounds are Pending; execution dates/testers remain blank. [Report 5](../Review%202/Report5_Test%20Report.xlsx), seven WF-01 detail sheets and WF-01-only statistics. | 17 planned (100%) by Defense 1.1; 0 newly executed/certified in this report. Historical suites are references only, not passes for these IDs. | Đặng Minh Hoàng |

**Pass criteria at Defense 1.1**

| Criterion | Committed |
| :---- | :---- |
| *Runs end-to-end on staging with seeded data* | Yes — TC_WF01_E2E_01 with synthetic owner, existing P1 and recorded C1 closure; default-on email/MFA/payOS; no development bypass. Commitment, not verified. |
| *Main scenario passes* | Yes — DS-01a and 100% mandatory-feature main-path checks must pass. Current result: not run. |
| *Exception scenarios passing* | 2/2 (100%): DS-01b and DS-01c. Current result: not run. |
| *Test pass rate for this workflow* | Execute all 17 committed cases; at least 16/17 pass (≥ 90%), including 100% mandatory-feature main-path and E2E cases. TC_WF01_ST_01 passes only when every transition checkpoint passes. No skipped/Pending case counts as Passed; all 17 planned CI cases require execution evidence by Defense 1.1. Current measured rate: 0 executed, not yet assessed. |
| *Open Critical / High defects* | 0 — Defense target; current defect status unverified, not asserted as zero. |

**Reviewer note**

| Note | Pending reviewer completion/confirmation. Revised 08/11/2026 to the requested minimum: 3 cases per feature, 1 E2E and 1 state-sequence case for one main entity (Organization Registration). Each ST-01 transition is asserted within that case, including an invalid transition; workspace/import states have no separately counted cases. Initial subscription selection/payment are included because ACT-01 requires them; renewal, platform plan administration, organization suspension/reactivation and downstream learning workflows are outside this slice. No reviewer approval or live-provider acceptance is fabricated; FAILED-workspace reset remains unimplemented. |
| :---- | :---- |

### **6.2 Workflow WF-02**

| Workflow name | Target Role & Competency Ontology Management |
| :---- | :---- |
| **Owner (one member)** | Nguyễn Anh Khôi |
| **Supporting members** |  |
| **Actors** | L\&D Manager, Expert, Employee |
| **Trigger** | L\&D Manager initiates organizational competency definitions or creates target role drafts under defined job positions to benchmark workforce capabilities. |
| **Business outcome** | Complete, validated organizational competency taxonomy, directed micro-skill prerequisite knowledge graph, and published target roles with skills available for diagnostic career matching and learning pathway generation. |
| **Main entity state path** | Job Position: ACTIVE ↔ INACTIVE.  Target Role: DRAFT → SENT → REJECTED→ SUBMITTED → PUBLISHED → UNPUBLISHED / SUCCESSOR DRAFT (v1.1).  Competency & Micro-skill: Draft/Active → Prerequisite Linked → Deleted. |
| **Activity diagram (Report 4 section)** | Section 4.2 (Target Role Configuration, Ontology Engineering & Publication Activity Diagram) |

**Features in this workflow**

| Feature ID | Feature | Acceptance criteria | Test case IDs |
| :---- | :---- | :---- | :---- |
| REQ-023-COMP | Competencies Management | Create domain competencies with unique code validation; browse ontology hierarchy; update title and description; permanently delete competencies and detach graph relationships in Neo4j. | TC\_COMP\_01 to TC\_COMP\_04 |
| REQ-012-SKILL | Micro-skills Management & Prerequisites | Define micro-skills under parent competencies; query and filter without status constraint; establish directed prerequisites with required knowledge levels; enforce deletion safety (block deletion of in-use skills; allow delete of unassigned skills). | TC\_SKILL\_01 to TC\_SKILL\_05 |
| REQ-023-ROLE | Target Roles Management & Versioning | Create role drafts under job positions; assign eligible Experts; configure ordered Levels and per-level estimated learning durations; configure multi-level skill knowledge level; submit and handle revision feedback loop; publish approved roles; enforce published role immutability and create successor draft versions while isolating active roles. | TC\_ROLE\_01 to TC\_ROLE\_08 |
| REQ-018-GRAPH | Ontology Knowledge Graph Playground | Interactively visualize, search, and navigate (zoom/pan/fit) nodes and relationships across Job Positions, Target Roles, Competencies, and Micro-skills with vis-network; expand hierarchical neighbors; link prerequisite edges. | TC\_GRAPH\_01 to TC\_GRAPH\_03 |

**Demo scenarios**

| Scenario ID | Type | Preconditions and data | Main steps | Expected result | Presenter |
| :---- | :---- | :---- | :---- | :---- | :---- |
| DS-02a | Main | Seed Catalog v0.12.0 loaded on Dockerstaging environment. User accounts for L\&D Manager, Domain Expert, and Employee are active in the organization workspace. | 1\. L\&D Manager creates Target Role draft under Software Engineer job position, assigns an eligible Expert, and dispatches. 2\. Domain Expert opens the assigned target role, sets competencies and micro-skill across target role levels, and submits to Manager. 3\. L\&D Manager reviews submitted specifications, approves, and publishes the role. 4\. Employee browses Target Roles catalog and views published target roles. | End-to-end role authoring, assignment, configuration, and publication lifecycle completes successfully. Knowledge Graph dynamically renders updated entities. Published role is immediately accessible to Employees while drafts remain isolated. | Nguyễn Anh Khôi |
| DS-02b | Alternative | Target role is in SUBMITTED status. | 1\. L\&D Manager reviews submitted role, identifies missing configuration in competency and micro-skill, inputs revision feedback, and returns role. 2\. Expert views revision feedback alert banner, add competency and micro-skill, and resubmits to Manager. 3\. L\&D Manager reviews submitted specifications, approves, and publishes the role..  | Alternative flow for role authoring, assignment, configuration, and publication lifecycle. Knowledge Graph dynamically renders updated entities. Published role is immediately accessible to Employees while drafts remain isolated. | Nguyễn Anh Khôi  |
| DS-02c | Exception | Target role is in PUBLISHED status; Micro-skill is required by published target role.  | 1\. Attempt direct editing of published role \-\> verify direct modification is locked. 2\. Click "Create Successor Draft" \-\> verify successor draft is generated in DRAFT status below previous published target role, inheriting configurations, while previous version remains active and visible to Employees. 3\. Attempt deleting an in-use micro-skill \-\> verify deletion is rejected with destructive warning toast. | Published role immutability is strictly enforced. Successor draft is isolated in draft state. Referential integrity blocks deletion of micro-skills required by active roles.  | Nguyễn Anh Khôi  |

**Committed test cases**

| Test type | Count | Automated in CI | Responsible member(s) |
| :---- | :---- | :---- | :---- |
| Feature tests (≥ 3 per feature) | 20 | 20 | Nguyễn Anh Khôi |
| End-to-end workflow test (≥ 1\) | 2 | 2 | Nguyễn Anh Khôi |
| State transition tests (≥ 1 per transition) | 2 | 2 | Nguyễn Anh Khôi |
| Total for this workflow | 24 | 24 | Nguyễn Anh Khôi |

**Pass criteria at Defense 1.1**

| Criterion | Committed |
| :---- | :---- |
| *Runs end-to-end on staging with seeded data* | *Yes* |
| *Main scenario passes* | *Yes* |
| *Exception scenarios passing* |  |
| *Test pass rate for this workflow* |  |
| *Open Critical / High defects* | *0* |

**Reviewer note**

| Note |  |
| :---- | :---- |

### **6.3 Workflow WF-03**

| Workflow name | Question Bank Management |
| :---- | :---- |
| **Owner (one member)** | Nguyễn Trần Việt An |
| **Supporting members** |  |
| **Actors** | L\&D Manager, Expert |
| **Trigger** | The responsible Expert creates/imports a question or revises a published question for an approved MicroSkill. |
| **Business outcome** | Validated, versioned questions are reviewed by L\&D and published for eligible future assessment selection. Ownership, review history and existing assessment references are preserved. Exam construction, scoring and calibration are outside this workflow. |
| **Main entity state path** | Version: DRAFT → SUBMITTED → PUBLISHED; return/withdraw: SUBMITTED → DRAFT. A successor starts a separate DRAFT; published content stays immutable.Availability: Not retired → Retirement requested → Retired → Reactivation requested → Not retired. Returning a request restores its prior availability. |
| **Activity diagram (Report 4 section)** | Report 4: ACT-10 (Question Bank authoring and approval); ST-16A (version lifecycle), ST-16B (availability). |

**Features in this workflow**

| Feature ID | Feature | Acceptance criteria | Test case IDs |
| :---- | :---- | :---- | :---- |
| FR-05.06Question Bank subset | Author, search and import questions | Responsible Expert saves drafts; submit requires one approved Skill, prompt, four distinct options, one correct answer, difficulty and explanation. Excel/JSON preview rejects invalid batches; confirmation creates drafts once. | TC-WF03-F01–F07 |
| FR-05.06Question Bank subset | Review, version and assign responsibility | L\&D acknowledges the exact submitted version before approval; return/withdraw requires a reason. Stale/bulk conflicts cause no partial decision. Published content remains immutable; one successor draft is permitted. | TC-WF03-F08–F12 |
| FR-05.06Question Bank subset | Security, history and availability | Peer Experts are read-only; L\&D assigns/transfers responsibility with a reason. Retirement/reactivation requires L\&D decision; saved assessment references survive. Cross-organization and Employee staff-data access is denied. | TC-WF03-F13–F18 |

**Demo scenarios**

| Scenario ID | Type | Preconditions and data | Main steps | Expected result | Presenter |
| :---- | :---- | :---- | :---- | :---- | :---- |
| *DS-03a* | *Main* | Seeded workspace; owner Expert, L\&D and approved Skill; complete four-option question. | 1\. Expert creates and submits question.2\. L\&D opens and acknowledges the submitted version, then approves.3\. Expert creates a successor draft and checks history. | Published version is available for eligible selection; successor edits do not change it. Actors, decisions and versions persist after reload. | Nguyễn Trần Việt An |
| *DS-03b* | *Exception* | Draft missing correct answer; valid submitted question; outdated reviewer view. | 1\. Submit incomplete draft.2\. L\&D returns valid candidate with reason.3\. Expert revises/resubmits; attempt approval from stale view, then reload/review. | Invalid submit is blocked. Return keeps candidate/history; stale approval is rejected without partial publication. | Nguyễn Trần Việt An |
| DS-03c | Exception | Published question with saved assessment reference; peer Expert and another organization; invalid import row. | 1\. Request/confirm retirement, then reactivation.2\. Attempt peer edit and cross-organization read.3\. Preview/confirm invalid import. | Availability changes only after L\&D decision; saved assessment reference remains. Unauthorized access fails; invalid batch creates no questions. | Nguyễn Trần Việt An |

**Committed test cases**

| Test type | Count | Automated in CI | Responsible member(s) |
| :---- | :---- | :---- | :---- |
| *Feature tests (≥ 3 per feature)* | 18 | Not run | Nguyễn Trần Việt An |
| *End-to-end workflow tests* | 2 | Not run | Nguyễn Trần Việt An |
| *State transition tests* | 14 | Not run | Nguyễn Trần Việt An |
| *Unit tests (separate count)* | 18 | Not run | Nguyễn Trần Việt An |
| *Functional commitment (excludes unit)* | 34 | Not run | Nguyễn Trần Việt An |

**Pass criteria at Defense 1.1**

| Criterion | Committed |
| :---- | :---- |
| *Runs end-to-end on staging with seeded data* | *Yes* |
| *Main scenario passes* | *Yes* |
| *Exception scenarios passing* |  |
| *Test pass rate for this workflow* |  |
| *Open Critical / High defects* | *0* |

**Reviewer note**

| Note |  |
| :---- | :---- |

### **6.4 Workflow WF-04**

| Workflow name | Learning Module Management |
| :---- | :---- |
| **Owner (one member)** | Nguyễn Trần Việt An |
| **Supporting members** | To be confirmed |
| **Actors** | Domain Expert; L\&D Manager |
| **Trigger** | The responsible Expert creates/imports a Module, receives an assigned catalog Module, or prepares a revised learning offering. |
| **Business outcome** | A reviewed Module teaching exactly one Skill is released with ordered Text/Video lessons. Private assets, immutable revisions and audit history are preserved. Assessment construction/scoring and Employee learning execution are outside this workflow. |
| **Main entity state path** | DRAFT → SUBMITTED → PUBLISH\_PENDING → RELEASED. Return: SUBMITTED → RETURNED → DRAFT / SUBMITTED. Released content may have a separate successor DRAFT.RELEASED → ARCHIVE\_REQUESTED → ARCHIVE\_PENDING → ARCHIVED; returned archive request → RELEASED. Restore → DRAFT and reapproval; availability stays archived until publication. Pending publication/archive supports retry; eligible drafts may be deleted. |
| **Activity diagram (Report 4 section)** | Report 4: ACT-04 (Module and Learning Content authoring/approval); ST-11 (Module and Learning Content lifecycle). |

**Features in this workflow**

| FR-05.05 | Author and import Modules/content | Owner creates/edits a Module with exactly one Skill and ordered Text/Video lessons. Incomplete drafts may be saved; submit/import needs valid content. Excel/ZIP preview and confirmation are atomic and enforce ownership. | TC-WF04-F01–F07 |
| :---- | :---- | :---- | :---- |
| FR-05.08 | Review submission and enforce permissions | Owner submits an exact Module/content revision and revises returned content. Peer Experts remain read-only. Released snapshots survive successor editing; history records actual actors and times. The current Module lifecycle has no withdrawal action. | TC-WF04-F08–F12 |
| FR-04.06 | Intake, release and archive lifecycle | L\&D reviews all lessons in the submitted revision, returns with feedback or approves. Failed publication/archive remains pending and supports retry. Archive preserves coverage/history; restore requires reapproval. | TC-WF04-F13–F18 |

| Scenario ID | Type | Preconditions and data | Main steps | Expected result | Presenter |
| :---- | :---- | :---- | :---- | :---- | :---- |
| *DS-04a* | *Main* | Seeded workspace; owner Expert, L\&D and Skill; Text lesson and valid video asset. | 1\. Create Module mapped to one Skill; add/reorder lessons.2\. Submit complete revision.3\. L\&D inspects lessons, approves; publication completes.4\. Reload catalog/history. | Module is RELEASED with correct Skill, lesson order and content. Approved revision and review history persist. | Nguyễn Trần Việt An |
| *DS-04b* | *Exception* | Incomplete draft; submitted revision; peer Expert and another organization. | 1\. Try submitting incomplete content.2\. L\&D returns valid submission with feedback.3\. Owner revises/resubmits.4\. Attempt peer edit and cross-organization asset access. | Invalid submission and unauthorized access fail. Feedback/history remain; only the owner revises the returned Module. | Nguyễn Trần Việt An |
| DS-04c | Exception | Released Module; controlled publication failure; archive-eligible coverage; invalid Excel/ZIP batch. | 1\. Approve successor while publication fails; retry.2\. Request/approve archive, then restore and resubmit.3\. Confirm invalid import. | Failure stays pending until successful retry. Released/history snapshots survive; restore needs approval. Invalid import writes no Modules. | Nguyễn Trần Việt An |

**Committed test cases**

| Test type | Count | Automated in CI | Responsible member(s) |
| :---- | :---- | :---- | :---- |
| *Feature tests (≥ 3 per feature)* | 18 | Not run | Nguyễn Trần Việt An |
| *End-to-end workflow tests* | 2 | Not run | Nguyễn Trần Việt An |
| *State transition tests* | 17 | Not run | Nguyễn Trần Việt An |
| *Unit tests (separate count)* | 16 | Not run | Nguyễn Trần Việt An |

**Pass criteria at Defense 1.1**

| Criterion | Committed |
| :---- | :---- |
| *Runs end-to-end on staging with seeded data* | *Yes* |
| *Main scenario passes* | *Yes* |
| *Exception scenarios passing* |  |
| *Test pass rate for this workflow* |  |
| *Open Critical / High defects* | *0* |

**Reviewer note**

| Note |  |
| :---- | :---- |

### **6.5 Workflow WF-05**

| Workflow name | Assessment and Adaptive Learning Pathway |
| :---- | :---- |
| **Owner (one member)** | Trần An Quốc |
| **Supporting members** |  |
| **Actors** | Employee; L\&D Manager; assigned Expert; System. |
| **Trigger** | Configure Skill provision/assessments; Employee selects a Role-Level and completes the baseline. |
| **Business outcome** | Persist baseline results/gaps; generate an Expert-approved pathway for Employee access, then adapt remaining work until completion. Preserve evidence/history. |
| **Main entity state path** | Policy: DRAFT → active version. Attempt: IN\_PROGRESS → FINALIZED (submit/deadline). Pathway: pending → approved → learning → completed; failures remain retryable. Required work locks the target; bypass never grants achievement. |
| **Activity diagram (Report 4 section)** | Report 4: ACT-05; ST-13/14/17/18/19 (partial/stale; current contracts take precedence). |

**Features in this workflow**

| Feature ID | Feature | Acceptance criteria | Test case IDs |
| :---- | :---- | :---- | :---- |
| FR-04.05 FR-06.02 FR-07.05 | Baseline assessment | L\&D configures Role-Level policy; Employee starts/resumes, submits or reaches deadline. Store frozen questions, group results and history. Baseline diagnostics do not award achievement. | TC-WF05- F01–F03 |
| FR-06.04 | Choose or change Role | Employee selects a published Role and actual Level. Block changes while an assessment or mandatory request-bound work remains; preserve previous evidence/history. | TC-WF05- F04–F06 |
| FR-07.06 FR-07.08 FR-05.07 FR-06.06 | Generate and approve pathway | Compare results with target requirements; generate requirement roots with eligible alternatives/certificates. The Assigned Expert approves the exact revision; the Employee then views the authorized pathway. | TC-WF05- F07–F09 |
| FR-07.08 FR-06.08 FR-06.09 | Learn, recalculate and complete | The employee learns and takes skill assessments. Recalculate from accepted evidence; enforce supplementation/veto/full retake, preserve completed work, and finish only when mandatory requirements are resolved. | TC-WF05- F10–F12 |
| FR-05.05 FR-05.06 Provision/policy subset | Configure Skill provision and assessment | Expert maps each Skill-knowledge scope to module alternatives OR its certificate and configures MAIN/prerequisite assessment groups. Validate ownership, coverage and bank readiness; retain policy versions. | TC-WF05- F13–F15 |

**Demo scenarios**

| Scenario ID | Type | Preconditions and data | Main steps | Expected result | Presenter |
| :---- | :---- | :---- | :---- | :---- | :---- |
| *DS-05a* | *Main* | Authorized actors; published Role-Level; approved provision, question bank and policies. | 1\. Configure provision/policies. 2\. Select Role; complete baseline. 3\. Generate, approve and view pathway. 4\. Learn, assess and recalculate to completion. | Results/revisions persist; only approved work is accessible. Completion reflects qualified evidence and preserves history. | Trần An Quốc |
| *DS-05b* | *Exception* | Insufficient bank; stale revision; another organization; bound Role-Level. | Try invalid activation/start, stale approval, unauthorized access and target change. | Invalid/unauthorized changes are denied without losing accepted data or replacing the bound target. | Trần An Quốc |
| DS-05c | Exception | Prerequisite shortage B; passing main result; duplicate event or interrupted processing. | Retry processing; retake A; complete required B learning and recheck pathway. | No duplicate evidence/revision. Passing B in A's retake does not erase assigned B learning; pending conditions prevent premature completion. | Trần An Quốc |

**Committed test cases**

| Test type | Count | Automated in CI | Responsible member(s) |
| :---- | :---- | :---- | :---- |
| *Feature tests (3 per grouped feature)* | 15 | Not run | Trần An Quốc |
| *End-to-end workflow tests* | 5 | Not run | Trần An Quốc |
| *State transition tests* | 63 | Not run | Trần An Quốc |
| *Confirmed NFR tests* | 18 | Not run | Trần An Quốc |
| *Total (excludes unit tests)* | 101 | Not run | Trần An Quốc |

**Pass criteria at Defense 1.1**

| Criterion | Committed |
| :---- | :---- |
| *Runs end-to-end on staging with seeded data* | *Yes — commitment; not verified.* |
| *Main scenario passes* | *Yes — commitment; not run.* |
| *Exception scenarios passing* | 2 planned exception scenarios; not run. |
| *Test pass rate for this workflow* | Threshold not specified; not measured. |
| *Open Critical / High defects* | *0 — Defense target; current status unverified.* |

**Reviewer note**

| Note |  |
| :---- | :---- |

## **7\. Individual Commitments**

*One block per member. Every member owns at least one main workflow and 2–3 parts. Each test case and each fix is counted for one member only.*

### **7.1 Member 1**

| Full name | Đặng Minh Hoàng |
| :---- | :---- |
| **Student ID** | SE193626 |
| **Role in team** | Team Leader; Platform Backend & Relational Data owner (S1, Version 2 section 3.2(g)). |

**Ownership**

| Type | Items (IDs / names) | Notes |
| :---- | :---- | :---- |
| *Main workflow(s) owned* | WF-01 — Organization Onboarding. | Exactly one accountable owner. S2/S3/S4 support their technical boundaries; all 17 WF-01 case IDs belong to Member 1 for commitment counting. |
| *Mandatory features owned* | 5: FR-01.01 Register an organization; FR-01.02 Select a subscription; FR-01.03 Pay for a subscription; FR-01.04 Track onboarding and access the workspace; FR-07.03 Provision organization workspaces. | Three delivery parts: registration/identity; initial subscription/payment; provisioning/status/workspace handoff. Initial commercial steps are part of ACT-01; renewal and other workflow features are not included in this count. |
| *Modules / entities owned* | Registration/account/email proof/MFA assurance; immutable purchased plan terms/payment order/durable payment application; organization/workspace/initial administrator membership/paid period/catalog-import job and workspace session handoff. | PostgreSQL owns registration, identity and commercial/provisioning state; catalog copy writes organization-owned Neo4j data with graph-owner support. Preserve optional nulls, owner authorization, atomicity, idempotency and truthful readiness. |
| *Design decisions owned (D-IDs)* | No confirmed WF-01 D-IDs supplied; pending team/reviewer assignment. Design responsibilities: trusted owner/session/CSRF, separate verification/payment/setup states, immutable plan terms, atomic initial provisioning and idempotent leased catalog copy. | Reference Report 4 sections 3.1.1–3.1.4 and 3.2.1–3.2.4; do not invent D-IDs or imply approval. Unsupported FAILED reset requires a separately approved implementation design. |
| *NFRs responsible* | NFR-WF01-SEC, NFR-WF01-INT, NFR-WF01-REL (section 4). | 100% defined unauthorized probes denied; zero secret leakage, duplicate/orphan grants, cross-tenant relationships or premature entry; ≥ 90% overall case pass and 100% mandatory main-path/E2E pass. Defense targets; not measured by document preparation. |

**Delivery commitments to Defense 1.1**

| Commitment | Committed (count / IDs) | Due |
| :---- | :---- | :---- |
| *Functional test cases written* | 17 unique cases written in Report 5: TC_WF01_REG_01–03 (3), TC_WF01_PLAN_01–03 (3), TC_WF01_PAY_01–03 (3), TC_WF01_STATUS_01–03 (3), TC_WF01_PROV_01 / TC_WF01_PROV_02 / TC_WF01_PROV_05 (3), TC_WF01_E2E_01 (1), TC_WF01_ST_01 (1). State coverage uses Organization Registration only; all checkpoints belong to the same case. All outcomes Pending; no execution dates/testers fabricated. | Minimum test design revised 08/11/2026; execution/evidence by Defense 1.1. |
| *Of which automated in CI* | 17 planned (100%): 15 feature + 1 connected Playwright E2E + 1 Organization Registration state sequence. Implement/map the retained IDs to unit/API, real SQL/Neo4j integration and browser suites; retain per-run evidence. Existing suites are prior art, not certified CI coverage for these IDs. | Defense 1.1 |
| *Demo scenarios presented* | 3 planned: DS-01a (Main), DS-01b (Validation/proof/authorization exception), DS-01c (Invalid MFA code and enrollment retry). Each is presented by Đặng Minh Hoàng; no completed presentation is claimed. | Defense 1.1 |
| *Required fixes owned (section 9\)* | No WF-01 Review 2 fix IDs are assigned in section 9. Member 1 will own explicitly assigned WF-01 fixes and defects found by the committed tests; no review finding/fix ID is invented. | Assignment/due dates pending reviewer/team confirmation; assigned Defense blockers resolved before Defense 1.1. |
| *Documentation sections (Report / section)* | BM04 3/4 (WF-01 rows), 6.1, 7.1 and WF-01/Member 1 rows of 8.1/8.2; Report 3 2.2.1 (ACT-01), 3.2, 3.3.1–3.3.2; Report 4 3.1.2/3.1.4/3.2.2/3.2.4; Report 5 Cover/Test Cases/Test Statistics and seven WF-01 detail sheets. Related design reports are references, not rewritten by this deliverable. | This commitment/test design prepared 08/11/2026; execution evidence and final reconciliation by Defense 1.1. |

**Ownership verification at Review 2 (completed by reviewers)**

| Result | Weak points observed | Follow-up (by whom, by when) |
| :---- | :---- | :---- |
| *☐ Verified* *☐ Partly verified* *☐ Not verified* — pending reviewers; no result selected. | Pending reviewer observations; document preparation is not ownership verification. | Reviewers/supervisor confirm ownership and any assigned fix IDs; Đặng Minh Hoàng provides the WF-01 demo and CI/real-store evidence by Defense 1.1. Review confirmation date pending. |

**Member confirmation**

| Signature / date | Pending signature and actual confirmation date by Đặng Minh Hoàng. Preparation date 08/11/2026 is not a signed acceptance. |
| :---- | :---- |

### **7.2 Member 2**

| Full name | Nguyễn Anh Khôi |
| :---- | :---- |
| **Student ID** | SE192491 |
| **Role in team** | Developer |

**Ownership**

| Type | Items (IDs / names) | Notes |
| :---- | :---- | :---- |
| *Main workflow(s) owned* | WF-02 — Target Role & Competency Ontology Management. | Ontology and Target Role owner; baseline/upskilling are integrations. |
| *Mandatory features owned* | 4 grouped features in 6.2. | REQ-023-COMP (Competencies); REQ-012-SKILL (Micro-skills & Prerequisites); REQ-023-ROLE (Target Roles & Versioning); REQ-018-GRAPH (Ontology Graph Playground). |
| *Modules / entities owned* | Competencies, Micro-skills, Directed Skill Prerequisites (DAG), Target Roles, Role Levels (Rank 1 as Highest), vis-network Graph Playground. | Dual-database persistence (PostgreSQL \+ Neo4j); immutable published roles; DAG cycle detection. |
| *Design decisions owned (D-IDs)* | TBD — no confirmed D-IDs (relates to D2 Persistence Architecture: PostgreSQL \+ Neo4j dual-store). |   |
| *NFRs responsible* | WF-02 security, referential integrity, and graph visualization performance. | 24 automated CI test checks; shared integration with Department & Job Position governance. |

**Delivery commitments to Defense 1.1**

| Commitment | Committed (count / IDs) | Due |
| :---- | :---- | :---- |
| *Functional test cases written* | 24 functional cases: 20 feature tests (TC\_COMP\_01–04, TC\_SKILL\_01–05, TC\_ROLE\_01–08, TC\_GRAPH\_01–03) \+ 2 E2E workflow tests \+ 2 state transition tests (6.2). | Defense 1.1 |
| *Of which automated in CI* | 24 (100% automated in CI via JUnit 5, Spring Boot Integration tests, and Playwright E2E suites). | Defense 1.1 |
| *Demo scenarios presented* | 3 planned: DS-02a (Main Flow), DS-02b (Alternative Revision Loop), DS-02c (Exception & Integrity). | Defense 1.1 |
| *Required fixes owned (section 9\)* | TBD — section 9 has no assigned items yet. | To be agreed |
| *Documentation sections (Report / section)* | BM04 6.2, 7.2; Report 3 (SRS 3.2.2, 3.2.3); Report 4 (SDD 4.2, 5.2.2); Report 5 (Test Report \- Competencies, Micro-skills, Target roles, Ontology Graph). | Defense 1.1 |

**Ownership verification at Review 2 (completed by reviewers)**

| Result | Weak points observed | Follow-up (by whom, by when) |
| :---- | :---- | :---- |
| *☐ Verified* *☐ Partly verified* *☐ Not verified* |  |  |

**Member confirmation**

| Signature / date |  |
| :---- | :---- |

### **7.3 Member 3**

| Full name |  |
| :---- | :---- |
| **Student ID** |  |
| **Role in team** |  |

**Ownership**

| Type | Items (IDs / names) | Notes |
| :---- | :---- | :---- |
| *Main workflow(s) owned* |  |  |
| *Mandatory features owned* |  |  |
| *Modules / entities owned* |  |  |
| *Design decisions owned (D-IDs)* |  |  |
| *NFRs responsible* |  |  |

**Delivery commitments to Defense 1.1**

| Commitment | Committed (count / IDs) | Due |
| :---- | :---- | :---- |
| *Functional test cases written* |  |  |
| *Of which automated in CI* |  |  |
| *Demo scenarios presented* |  |  |
| *Required fixes owned (section 9\)* |  |  |
| *Documentation sections (Report / section)* |  |  |

**Ownership verification at Review 2 (completed by reviewers)**

| Result | Weak points observed | Follow-up (by whom, by when) |
| :---- | :---- | :---- |
| *☐ Verified* *☐ Partly verified* *☐ Not verified* |  |  |

**Member confirmation**

| Signature / date |  |
| :---- | :---- |

### **7.4 Member 4**

| Full name | Trần An Quốc |
| :---- | :---- |
| **Student ID** | SE182280 |
| **Role in team** | Developer |

**Ownership**

| Type | Items (IDs / names) | Notes |
| :---- | :---- | :---- |
| *Main workflow(s) owned* | WF-05 — Assessment and Adaptive Learning Pathway. | Assessment/engine owner; review/display are integrations. |
| *Mandatory features owned* | 5 grouped features in 6.5. | Baseline; Role selection; generation; recalculation; Skill provision/assessment. |
| *Modules / entities owned* | Assessment policies, attempts/results, evidence and pathway revisions. | Retain versions and history. |
| *Design decisions owned (D-IDs)* | TBD — no confirmed D-IDs. |  |
| *NFRs responsible* | WF-05 security, integrity, usability and performance. | 18 planned NFR checks; shared integration. |

**Delivery commitments to Defense 1.1**

| Commitment | Committed (count / IDs) | Due |
| :---- | :---- | :---- |
| *Functional test cases written* | 83 functional cases planned; 18 NFR cases separately (6.5). | Defense 1.1 |
| *Of which automated in CI* | TBD; no CI execution claimed. | To be agreed |
| *Demo scenarios presented* | 3 planned: DS-05a–c. | Defense 1.1 |
| *Required fixes owned (section 9\)* | TBD — section 9 has no assigned items yet. | To be agreed |
| *Documentation sections (Report / section)* | BM04 6.5, 7.4; assessment/pathway sections in Reports 3–4. | Defense 1.1 |

**Ownership verification at Review 2 (completed by reviewers)**

| Result | Weak points observed | Follow-up (by whom, by when) |
| :---- | :---- | :---- |
| *☐ Verified* *☐ Partly verified* *☐ Not verified* |  |  |

**Member confirmation**

| Signature / date |  |
| :---- | :---- |

## 

## **8\. Summary and Cross-check**

### **8.1 By workflow**

| Workflow | Owner | Features | Demo scenarios (main / exception) | Test cases | Automated |
| :---- | :---- | :---- | :---- | :---- | :---- |
| WF-01 | Đặng Minh Hoàng | 5 | 3 (1 main / 2 exception) | 17 (15 feature + 1 E2E + 1 state) | 17 planned; not verified |
| WF-02 | Nguyễn Anh Khôi | 4 | 3 (1 main / 2 alt & exc) | 24 | 24 |
| *WF-03* |  |  |  |  |  |
| *WF-04* |  |  |  |  |  |
| *WF-05* |  |  |  |  |  |
| *Total* |  |  |  |  |  |

### **8.2 By member**

| Member | Workflows owned | Features | Test cases | Automated | Demo scenarios | Review 2 verification |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Đặng Minh Hoàng | WF-01 | 5 | 17 | 17 planned; not verified | 3 | Pending reviewer confirmation |
| Nguyễn Anh Khôi | WF-02 | 4 | 24 | 24 | 3 |  |
| *Member 3* |  |  |  |  |  |  |
| *Member 4* |  |  |  |  |  |  |
| *Member 5* |  |  |  |  |  |  |
| *Total* |  |  |  |  |  |  |

*The totals in 8.1 and 8.2 must both equal the committed numbers in 8.3.*

### **8.3 Committed Numbers**

| Number of main workflows |  |
| :---- | :---- |
| **Number of demo scenarios (main / exception)** |  |
| **Committed functional test cases** |  |
| **Of which automated in CI** |  |

### **8.4 Eligibility Thresholds for the Viva**

| Criterion | Minimum threshold | Agreed threshold |
| :---- | :---- | :---- |
| *Main workflows* | *100% run end-to-end* |  |
| *Demo scenarios* | *100% main; ≥ 80% exception* |  |
| *Test case count* | *≥ committed number* |  |
| *Test pass rate* | *≥ 90% overall; 100% main-path tests of mandatory features* |  |
| *Automation* | *≥ 50% run in CI* |  |
| *Defects* | *No open Critical or High defects* |  |
| *Individual* | *Each member demos the workflow they own and meets their delivery commitments* |  |

## **9\. Required Fixes**

*Items from the Review 2 minutes and Planned items from Form BM02.*

| ID | Item | Related workflow | Owner | Due |
| :---- | :---- | :---- | :---- | :---- |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |

## **10\. Review 2 Conclusion (completed by reviewers)**

☐ Pass     ☐ Conditional pass     ☐ Re-review

## **11\. Confirmation**

| Role | Full name | Signature | Date |
| :---- | :---- | :---- | :---- |
| *Reviewer 1* |  |  |  |
| *Reviewer 2* |  |  |  |
| *Supervisor* |  |  |  |
| *Team leader* |  |  |  |
