**SWP490 · CAPSTONE PROJECT · REVIEW 2 · BM04**

# **Review 2 Commitment**

## **1\. Project Information**

| Project code | FA26SE267 |
| :---- | :---- |
| **Project name** | Knowledge Graph-Based Adaptive Learning and Competency Intelligence Platform |
| **Team** | GFA26SE64 |
| **Supervisor** | Hoàng Thu Hà |
| **Review 2 date** | 03/11/2026 |
| **Reviewer 1** | ThinhDP2 |
| **Reviewer 2** | PhuongLHK |
| **Version** | 1.0 |
| **Date** | 01/11/2026 |

## **2\. Final Registration Form**

| Final version | Version 3 |
| :---- | :---- |
| **Approved at Review 2 (Yes/No)** |  |
| **Attached file name** | FA26SE267\_KNOWLEDGE\_GRAPH\_BASED\_ADAPTIVE\_LEARNING\_\_haht43\_Version\_3.docx |

## **3\. Mandatory Features**

| ID | Feature | Actor | Acceptance criteria | Workflow | Owner |
| :---- | :---- | :---- | :---- | :---- | :---- |
| FR-WF01-01 | Register an organization | Guest | Validate and persist organization/administrator details; verify email; enroll MFA and issue recovery codes; resume the same registration; persist the optional starter catalog selection without granting workspace access. | WF-01 | Đặng Minh Hoàng |
| FR-WF01-02 | Select a subscription | Guest | Compare available plans by price, currency, calendar-month duration and Employee seats; select an immutable available plan version; reject unavailable selections and prevent client-controlled commercial terms. | WF-01 | Đặng Minh Hoàng |
| FR-WF01-03 | Pay for a subscription | Guest | Create owner-bound checkout from trusted plan terms; distinguish verified full payment from pending/partial/unknown/failed payment; enforce idempotent requests and permitted retry/replacement without duplicate charges. | WF-01 | Đặng Minh Hoàng |
| FR-WF01-04 | Track onboarding and access the workspace | Guest | Show authoritative registration/payment/application/setup status; deny unauthorized status access; permit entry at the reserved workspace slug only after verified payment, completed setup and valid owner assurance. | WF-01 | Đặng Minh Hoàng |
| FR-WF01-05 | Provision organization workspaces | Guest | Atomically create the organization/workspace, initial administrator membership and purchased paid period; copy selected catalog with tenant-owned IDs before READY; record failures and retry eligible processing without duplicate grants. | WF-01 | Đặng Minh Hoàng |
| FR-WF01-06  | Manage Platform Organizations, Subscriptions & Monitoring  | Platform Administrator | Manage organizations and workspace status, configure subscription plans, and monitor platform activity, payments, errors, and audit records.  | WF-01 | Đặng Minh Hoàng |
| FR-WF01-07 | Manage Organization Users, Departments & Subscriptions  | Organization Administrator | Manage organization users, departments, roles, permissions, workspace settings, employee-seat limits, subscription renewals, and activity records.  | WF-01 | Đặng Minh Hoàng |
| FR-WF01-08 | Monitor employee development | L\&D Manager | View employee competency profiles, skill gaps, assessment outcomes, learning progress and department summaries; filter by department and job position. | WF-01 | Đặng Minh Hoàng |
| FR-WF02-01 | Competencies Management | Expert | Create domain competencies with unique code validation; browse ontology hierarchy; update title and description; permanently delete competencies and detach graph relationships in Neo4j. | WF-02 | Nguyễn Anh Khôi |
| FR-WF02-02 | Micro-skills Management & Prerequisites | Expert | Define micro-skills under parent competencies; query and filter without status constraint; establish directed prerequisites with required knowledge levels; enforce deletion safety (block deletion of in-use skills; allow delete of unassigned skills). | WF-02 | Nguyễn Anh Khôi |
| FR-WF02-03 | Target Roles Management & Versioning | Expert, L\&D Manager | Create role drafts under job positions; assign eligible Experts; configure ordered Levels and per-level estimated learning durations; configure multi-level skill knowledge level; submit and handle revision feedback loop; publish approved roles; enforce published role immutability and create successor draft versions while isolating active roles. | WF-02 | Nguyễn Anh Khôi |
| FR-WF02-04 | Ontology Knowledge Graph Playground | Expert | Interactively visualize, search, and navigate (zoom/pan/fit) nodes and relationships across Job Positions, Target Roles, Competencies, and Micro-skills with vis-network; expand hierarchical neighbors; link prerequisite edges. | WF-02 | Nguyễn Anh Khôi |
| FR-RQ02-01 | RQ2 \-Neo4j query latency | System | Benchmark 3-5-hop pathfinding on 1k, 5k and 10k-node synthetic ontologies; run 1,000 queries per size and report mean and P95 latency. | RQ2 | Nguyễn Anh Khôi |
| FR-WF03-01 | Author, search and import questions | Expert | Responsible Expert saves drafts; submit requires one approved Skill, prompt, four distinct options, one correct answer, difficulty. Excel/JSON preview rejects invalid batches; confirmation creates drafts once. | WF-03 | Nguyễn Trần Việt An |
| FR-WF03-02 | Review, version and assign responsibility | Expert, L\&D Manager | L\&D acknowledges the exact submitted version before approval; return/withdraw requires a reason. Stale/bulk conflicts cause no partial decision. Published content remains immutable; one successor draft is permitted. | WF-03 | Nguyễn Trần Việt An |
| FR-WF03-03 | Security, history and availability | Expert, L\&D Manager | Peer Experts are read-only; L\&D assigns/transfers responsibility with a reason. Retirement/reactivation requires L\&D decision; saved assessment references survive. Cross-organization and Employee staff-data access is denied. | WF-03 | Nguyễn Trần Việt An |
| FR-WF04-01 | Author and import Modules/content | Expert | Owner creates/edits a Module with exactly one Skill and orders Text/Video lessons. Incomplete drafts may be saved; submit/import needs valid content. Excel/ZIP preview and confirmation are atomic and enforce ownership. | WF-04 | Nguyễn Trần Việt An |
| FR-WF04-02 | Review submission and enforce permissions | Expert | Owner submits an exact Module/content revision and revises returned content. Peer Experts remain read-only. Released snapshots survive successor editing; history records actual actors and times. The current Module lifecycle has no withdrawal action. | WF-04 | Nguyễn Trần Việt An |
| FR-WF04-03 | Intake, release and archive lifecycle | L\&D Manager, Expert | L\&D reviews all lessons in the submitted revision, returns with feedback or approves. Failed publication/archive remains pending and supports retry. Archive preserves coverage/history; restore requires reapproval. | WF-04 | Nguyễn Trần Việt An |
| FR-RQ01-01 | RQ1 \- Graph vs CBF relevance | System | Compare Graph-Traversal and Content-Based Filtering top-5 module recommendations using a 500-user synthetic dataset and a 50-profile expert-annotated reference set; report Hit Rate@5. | RQ1 | Nguyễn Trần Việt An |
| FR-RQ03-01 | RQ3 \- Adaptive vs static pathways | System | Simulate 100 learners failing random modules; compare the total remedial modules assigned by adaptive recalculation and static curricula. | RQ3 | Nguyễn Trần Việt An |
| FR-WF05-01 | Baseline assessment | Employee, L\&D Manager, System | L\&D configures Role-Level policy; Employee starts/resumes, submits or reaches deadline. Store frozen questions, group results and history. Baseline diagnostics do not award achievement. | WF-05 | Trần An Quốc |
| FR-WF05-02 | Choose or change Role | Employee, System | Employee selects a published Role and actual Level. Block changes while an assessment or mandatory request-bound work remains; preserve previous evidence/history. | WF-05 | Trần An Quốc |
| FR-WF05-03 | Generate and approve pathway | Employee, assigned Expert, System | Compare results with target requirements; generate requirement roots with eligible alternatives/certificates. The Assigned Expert approves the exact revision; the Employee then views the authorized pathway. | WF-05 | Trần An Quốc |
| FR-WF05-04 | Learn, recalculate and complete | Employee, System | The employee learns and takes skill assessments. Recalculate from accepted evidence; enforce supplementation/veto/full retake, preserve completed work, and finish only when mandatory requirements are resolved. | WF-05 | Trần An Quốc |
| FR-WF05-05 | Configure Skill provision and assessment | Expert, System | Expert maps each Skill-knowledge scope to module alternatives OR its certificate and configures MAIN/prerequisite assessment groups. Validate ownership, coverage and bank readiness; retain policy versions. | WF-05 | Trần An Quốc |
| FR-WF05-06 | RIASEC Assessment & Local AI Job Position Recommendation | Employee, System | Score and save submitted RIASEC answers; use Local AI to compare results with available Job Positions and explain matches. Do not use competency evidence or recommend/assign Target Roles. Employees may explore roles independently. | WF-05 | Trần An Quốc |

## **4\. Non-Functional Requirements**

| ID | Quality attribute | Metric | Threshold | Measurement method | Owner |
| :---- | :---- | :---- | :---- | :---- | :---- |
| NFR-P01 | Performance \- ordinary requests | Ordinary request response time measured on representative interactions. | Responsive handling under documented test conditions; measurements reported without a fixed latency threshold. | Select representative ordinary read/save actions, record response times and test environment, and report observed results. Measure external payment/email processing, file transfer, and AI inference separately. | Đặng Minh Hoàng |
| NFR-P02 | Performance \- graph queries | Execution latency of representative Role, Skill, prerequisite, and pathway graph queries. | Graph query execution times measured and reported on a recorded Neo4j dataset; no fixed query-time threshold. | Run representative graph queries using documented dataset versions and parameters. Record query execution timings and conditions separately from full HTTP/UI response times. | Nguyễn Anh Khôi |
| NFR-P03 | Performance \- concurrent learning | Concurrent module-progress and quiz/assessment submissions; accepted-write integrity and duplicates. | Concurrent learning operations supported under documented workloads; accepted submissions persist without duplicate business records. | Run concurrent module-progress saves and assessment-answer submissions under a recorded workload. Report request timings and failures; reconcile accepted submissions with persisted records and check for duplicates. | Nguyễn Trần Việt An |
| NFR-P04 | Performance \- pathway processing | Time until accepted pathway generation and compatible-evidence updates are saved. | Accepted operations are processed and reflected in the saved pathway; processing times are measured and reported without a fixed completion-time threshold. | Use representative valid generation and evidence-update cases. Measure acceptance to saved pathway, including background queue time; record data, environment, failures and outcomes. Exclude Expert waiting and learning time. | Trần An Quốc |

## **5\. Out of Scope**

| Item | Reason |
| :---- | :---- |
| Generative AI content creation; video streaming infrastructure; SCORM compliance | Focus effort on assessment quality and adaptive recommendations using Expert-reviewed content. Existing storage and video players avoid building a streaming platform; SCORM support would add a separate content-packaging and runtime-conformance workload. |
| Native mobile applications; HR/payroll integration; external course purchasing; automatic certification | A responsive web client supports the six actors without maintaining separate mobile apps. HR/payroll connectors, external purchasing and certification would introduce additional synchronization, commercial and credential-verification responsibilities beyond the core learning workflow. |
| Refund/cancellation workflows; report export | Prioritize reliable purchases, renewals and in-app development reporting. Refunds/cancellations require additional payment-reversal and entitlement policies; exports require separate file-generation, access-control and data-disclosure handling. |

## **6\. Workflow Commitments**

### **6.1 Workflow WF-01**

| Workflow name | Organization Onboarding |
| :---- | :---- |
| **Owner (one member)** | Đặng Minh Hoàng |
| **Supporting members** |  |
| **Actors** | Guest; System Administrator |
| **Trigger** | Guest register an organization or resume an existing registration |
| **Business outcome** | A verified administrator purchases an existing subscription; the System creates exactly one organization workspace at its reserved slug, assigns the initial administrator, activates the purchased paid period and copies the selected starter catalog before allowing workspace entry. Empty selection produces an empty catalog. This is the committed Defense outcome, not a new execution claim. |
| **Main entity state path** | Organization Registration, creation → EMAIL\_PENDING → MFA\_PENDING → REGISTERED |
| **Activity diagram (Report 4 section)** | Section 4.1.1 (*Organization Registration Activity Diagram)* |

**Features in this workflow**

| Feature ID | Feature | Acceptance criteria | Test case IDs |
| :---- | :---- | :---- | :---- |
| FR-WF01-01 | Register an organization | Validate and persist organization/administrator details; verify email; enroll MFA and issue recovery codes; resume the same registration; persist the optional starter catalog selection without granting workspace access. | TC-WF01-F01-F03 |
| FR-WF01-02 | Select a subscription | Compare available plans by price, currency, calendar-month duration and Employee seats; select an immutable available plan version; reject unavailable selections and prevent client-controlled commercial terms. | TC-WF01-F04-F06 |
| FR-WF01-03 | Pay for a subscription | Create owner-bound checkout from trusted plan terms; distinguish verified full payment from pending/partial/unknown/failed payment; enforce idempotent requests and permitted retry/replacement without duplicate charges. | TC-WF01-F07-F09 |
| FR-WF01-04 | Track onboarding and access the workspace | Show authoritative registration/payment/application/setup status; deny unauthorized status access; permit entry at the reserved workspace slug only after verified payment, completed setup and valid owner assurance. | TC-WF01-F10-F12 |
| FR-WF01-05 | Provision organization workspaces | Atomically create the organization/workspace, initial administrator membership and purchased paid period; copy selected catalog with tenant-owned IDs before READY; record failures and retry eligible processing without duplicate grants. | TC-WF01-F13-F15 |
| FR-WF01-06 | Manage Platform Organizations, Subscriptions & Monitoring | Manage organizations and workspace status, configure subscription plans, and monitor platform activity, payments, errors, and audit records. | TC-WF01-F16-F18 |
| FR-WF01-07 | Manage Organization Users, Departments & Subscriptions | Manage organization users, departments, roles, permissions, workspace settings, employee-seat limits, subscription renewals, and activity records. | TC-WF01-F19-F21 |
| FR-WF01-08 | Monitor employee development | View employee competency profiles, skill gaps, assessment outcomes, learning progress and department summaries; filter by department and job position. | TC-WF01-F22-F24 |

**Demo scenarios**

| Scenario ID | Type | Preconditions and data | Main steps | Expected result | Presenter |
| :---- | :---- | :---- | :---- | :---- | :---- |
| DS-01a | Main | The organization has not registered. The administrator can access their email and authenticator app. Subscription plans and starter learning content are available. | 1\. Enter organization details and select starter learning content. 2\. Create the administrator account, verify email and set up the authenticator. 3\. Select a subscription plan and complete payment. 4\. Wait for workspace preparation to finish. 5\. Enter the workspace and check the organization, subscription and selected content. | The organization is registered successfully. The administrator can enter their organization's workspace after payment is confirmed and preparation is complete. The workspace shows the purchased subscription and selected learning content, without creating a duplicate organization. | Đặng Minh Hoàng |
| DS-01b | Exception | An existing email and workspace address are available for checking duplicates. The registrant has not verified their email. Another account belongs to a different organization. | 1\. Enter a duplicate email or workspace address, or an invalid password. 2\. Enter an incorrect email verification code or try to skip verification. 3\. Use the other account to view the registrant's payment or workspace. 4\. Correct the information and continue registration. | Clear messages explain invalid or duplicate information and incorrect verification codes. Registration cannot continue until the errors are corrected and email is verified. Another organization's account cannot view the payment information or enter the workspace. The registrant can correct the information and continue without registering again. | Đặng Minh Hoàng |
| DS-01c | Exception | The administrator has verified their email but has not finished setting up the authenticator. An incorrect code and a valid current code are available. | 1\. Enter the incorrect authenticator code and confirm. 2\. Check the error message and reopen registration. 3\. Enter the valid code, save the recovery codes and complete setup. | The incorrect code is rejected with a clear message. Registration remains incomplete and workspace access is not granted. The administrator can retry with a valid code and complete setup without creating another account. | Đặng Minh Hoàng |

**Committed test cases**

| Test type | Count | Automated in CI | Responsible member(s) |
| :---- | :---- | :---- | :---- |
| *Feature tests (≥ 3 per feature)* | 24 | 24 | Đặng Minh Hoàng |
| *End-to-end workflow test (≥ 1\)* | 1 | 1 | Đặng Minh Hoàng |
| *State transition tests (≥ 1 per transition)* | 1 | 1 | Đặng Minh Hoàng |
| *Total for this workflow* | 26 | 26 | Đặng Minh Hoàng |

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

### **6.2 Workflow WF-02**

| Workflow name | Target Role & Competency Ontology Management |
| :---- | :---- |
| **Owner (one member)** | Nguyễn Anh Khôi |
| **Supporting members** |  |
| **Actors** | L\&D Manager, Expert, Employee |
| **Trigger** | L\&D Manager initiates organizational competency definitions or creates target role drafts under defined job positions to benchmark workforce capabilities. |
| **Business outcome** | Complete, validated organizational competency taxonomy, directed micro-skill prerequisite knowledge graph, and published target roles with skills available for diagnostic career matching and learning pathway generation. |
| **Main entity state path** | Target Role: DRAFT/STAGED → SENT → REJECTED→ SUBMITTED → PUBLISHED → UNPUBLISHED / SUCCESSOR DRAFT.  |
| **Activity diagram (Report 4 section)** | Section 4.2.1 (*Target Role Management Activity Diagram*) |

**Features in this workflow**

| Feature ID | Feature | Acceptance criteria | Test case IDs |
| :---- | :---- | :---- | :---- |
| FR-WF02-01 | Competencies Management | Create domain competencies with unique code validation; browse ontology hierarchy; update title and description; permanently delete competencies and detach graph relationships in Neo4j. | TC-WF02-F01-F04 |
| FR-WF02-02 | Micro-skills Management & Prerequisites | Define micro-skills under parent competencies; query and filter without status constraint; establish directed prerequisites; enforce deletion safety (block deletion of in-use skills; allow delete of unassigned skills). | TC-WF02-F05-F09 |
| FR-WF02-03 | Target Roles Management & Versioning | Create role drafts under job positions; assign eligible Experts; configure ordered Levels and per-level estimated learning durations; configure multi-level skill knowledge level; submit and handle revision feedback loop; publish approved roles; enforce published role immutability and create successor draft versions while isolating active roles. | TC-WF02-F10-F17  |
| FR-WF02-04 | Ontology Knowledge Graph Playground | Interactively visualize, search, and navigate (zoom/pan/fit) nodes and relationships across Job Positions, Target Roles, Competencies, and Micro-skills with vis-network; expand hierarchical neighbors; link prerequisite edges. | TC-WF02-F18-F20 |

**Demo scenarios**

| Scenario ID | Type | Preconditions and data | Main steps | Expected result | Presenter |
| :---- | :---- | :---- | :---- | :---- | :---- |
| DS-02a | Main | Existing organization for use. User accounts for L\&D Manager, Expert, and Employee are active in the organization workspace. Organization admin imports target roles when onboarding for use. | 1\. L\&D Manager assigns an eligible Expert, and dispatches.2\. Expert imports competencies, micro-skills and their relationships through import functions.3\. Expert modifies the relationships by reverse prerequisites, delete prerequisites, add prerequisites through explore graph. 4\. Expert opens the assigned role, sets competencies and micro-skill with knowledge level across target role levels, and submits to Manager. 5\. L\&D Manager reviews submitted specifications, approves, and publishes the role. | End-to-end role authoring, assignment, configuration, and publication lifecycle completes successfully. Knowledge Graph dynamically renders updated entities. | Nguyễn Anh Khôi |
| DS-02b | Exception | Target role is in SUBMITTED status. | 1\. L\&D Manager reviews submitted role, identifies missing configuration in competency and micro-skill, inputs revision feedback, and returns role. 2\. Expert views revision feedback alert banner, add competency and micro-skill with knowledge level, and resubmits to Manager. 3\. L\&D Manager reviews submitted specifications, approves, and publishes the role..  | Alternative flow for role authoring, assignment, configuration, and publication lifecycle. Knowledge Graph dynamically renders updated entities. | Nguyễn Anh Khôi  |
| DS-02c | Exception | Target role is in PUBLISHED status; Micro-skill is required by published target role.  | 1\. Attempt direct editing of published role \-\> verify direct modification is locked. 2\. Click "Create Successor Draft" \-\> verify successor draft is generated in DRAFT status below previous published target role, inheriting configurations. 3\. Attempt deleting an in-use micro-skill \-\> verify deletion is rejected with destructive warning toast. | Published role immutability is strictly enforced. Successor draft is isolated in draft state. Referential integrity blocks deletion of micro-skills required by active roles.  | Nguyễn Anh Khôi  |

**Committed test cases**

| Test type | Count | Automated in CI | Responsible member(s) |
| :---- | :---- | :---- | :---- |
| *Feature tests (≥ 3 per feature)* | 20 | 20 | Nguyễn Anh Khôi |
| *End-to-end workflow test (≥ 1\)* | 1 | 1 | Nguyễn Anh Khôi |
| *State transition tests (≥ 1 per transition)* | 1 | 1 | Nguyễn Anh Khôi |
| *Total for this workflow* | 22 | 22 | Nguyễn Anh Khôi |

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
| **Trigger** | Domain Expert creates or bulk-imports assessment questions under an approved Micro-skill, or creates a successor draft to revise a published question. |
| **Business outcome** | Validated, versioned multiple-choice questions are reviewed and published by the L\&D Manager for eligible future assessment selection, while enforcing strict ownership, immutable published revisions, availability governance (retirement/reactivation), and complete audit history. |
| **Main entity state path** | Question Version: DRAFT → SUBMITTED → PUBLISHED (Return / Withdraw: SUBMITTED → DRAFT; Successor: PUBLISHED → new DRAFT). Availability: NOT\_RETIRED → RETIREMENT\_REQUESTED → RETIRED → REACTIVATION\_REQUESTED → NOT\_RETIRED. |
| **Activity diagram (Report 4 section)** | Section 4.4.1 (Question Bank Management Activity Diagram) |

**Features in this workflow**

| Feature ID | Feature | Acceptance criteria | Test case IDs |
| :---- | :---- | :---- | :---- |
| FR-WF03-01 | Author, Validate, Search & Import Questions | Save incomplete DRAFT questions with immutable system codes (Q-UUID); validate required submission fields (prompt, one approved Micro-skill, four distinct options, one correct answer, difficulty); search/filter catalog; preview Excel/JSON batches, reject invalid or legacy code-bearing batches atomically, confirm idempotently, and require duplicate content acknowledgement. | TC-WF03-F01-F03 |
| FR-WF03-02 | Review, Approval, Versioning & Ownership Transfer | Require L\&D Manager to open and acknowledge the exact submitted version before approval; reject stale revisions atomically on single/bulk approval; require non-empty reasons for L\&D return and Expert withdrawal; enforce published immutability, isolate successor DRAFT edits, and support L\&D ownership transfer with reason. | TC-WF03-F04-F06 |
| FR-WF03-03 | Availability Governance, Security & Audit History | Enforce peer Expert read-only access and block Employee or cross-organization access to answer-bearing data; manage L\&D-confirmed retirement and reactivation while preserving saved assessment references without auto-publishing drafts; retain accurate, non-fabricated audit history and scoped notifications. | TC-WF03-F07-F09 |

**Demo scenarios**

| Scenario ID | Type | Preconditions and data | Main steps | Expected result | Presenter |
| :---- | :---- | :---- | :---- | :---- | :---- |
| DS-03a | Main | Seeded organization workspace with active Expert (owner), L\&D Manager, and an approved Micro-skill; valid four-option question and import template prepared. | 1\. Expert creates a complete four-option question (and previews/imports a valid batch) linked to the approved Micro-skill, then submits for approval. 2\. L\&D Manager opens the submitted version, acknowledges review, and approves it to PUBLISHED. 3\. Expert creates a successor DRAFT from the published question and inspects audit history. | Question is published for eligible future assessment selection; successor edits stay isolated in DRAFT without modifying the published version; ownership, review decisions, and audit history persist after reload. | Nguyễn Trần Việt An |
| DS-03b | Exception | Incomplete DRAFT missing correct answer; valid SUBMITTED question with stale reviewer view; PUBLISHED question referenced by a saved assessment; peer Expert and Employee accounts. | 1\. Expert submits incomplete draft \-\> blocked; L\&D returns a valid submission with reason, Expert revises and resubmits. 2\. L\&D attempts approval from a stale view \-\> rejected atomically; reload, acknowledge, and approve. 3\. Peer Expert attempts edit and Employee attempts access \-\> denied; Owner requests retirement and L\&D confirms \-\> RETIRED while saved assessment references stay intact. | Invalid submissions, stale approvals, and unauthorized mutations are rejected without partial writes; return feedback, audit history, and assessment references are preserved. | Nguyễn Trần Việt An |

**Committed test cases**

| Test type | Count | Automated in CI | Responsible member(s) |
| :---- | :---- | :---- | :---- |
| *Feature tests (≥ 3 per feature)* | 9 | 9 | Nguyễn Trần Việt An |
| *End-to-end workflow test (≥ 1\)* | 1 | 1 | Nguyễn Trần Việt An |
| *State transition tests (≥ 1 per transition)* | 1 | 1 | Nguyễn Trần Việt An |
| *Total for this workflow* | 11 | 11 | Nguyễn Trần Việt An |

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
| **Supporting members** |  |
| **Actors** | L\&D Manager, Expert, Employee |
| **Trigger** | Domain Expert creates or bulk-imports a Learning Module with ordered Text/Video lessons mapped to one approved Micro-skill, or revises a released/archived module. |
| **Business outcome** | Reviewed Learning Modules teaching exactly one approved Micro-skill are released with ordered Text and Video lessons to the Employee learning catalog, preserving immutable released snapshots, ownership transfer, failure-resilient publish/archive retries, and accurate audit history. |
| **Main entity state path** | Learning Module: DRAFT → SUBMITTED → PUBLISH\_PENDING → RELEASED (Return: SUBMITTED → RETURNED → DRAFT / SUBMITTED; Successor: RELEASED → new DRAFT; Archive: RELEASED → ARCHIVE\_REQUESTED → ARCHIVE\_PENDING → ARCHIVED → restored DRAFT). |
| **Activity diagram (Report 4 section)** | Section 4.3.1 (Learning Module and Content Management Activity Diagram) |

**Features in this workflow**

| Feature ID | Feature | Acceptance criteria | Test case IDs |
| :---- | :---- | :---- | :---- |
| FR-WF04-01 | Author, Order Lessons, Search & Bulk Import Modules | Create and save incomplete DRAFT modules with one approved Micro-skill and ordered Text/Video lessons; enforce submission validation and persist lesson reordering across reload; search/filter catalog by title, Skill, state, and owner; preview/confirm Excel/ZIP packages idempotently under authenticated Expert ownership and reject invalid batches atomically. | TC-WF04-F01-F03 |
| FR-WF04-02 | Review Queue, Batch Approval, Versioning & Responsibility Transfer | Filter/paginate L\&D approval queue over actionable items only; preview Text/Video lessons before approval or return with mandatory feedback; support single and batch approval releasing modules to Employee catalog; enforce optimistic locks, released immutability, successor DRAFT isolation, L\&D responsibility transfer, and RBAC/org isolation. | TC-WF04-F04-F06 |
| FR-WF04-03 | Intake, release and archive lifecycle | L\&D reviews all lessons in the submitted revision, returns with feedback or approves. Failed publication/archive remains pending and supports retry. Archive preserves coverage/history; restore requires reapproval. | TC-WF04-F07-F09 |

**Demo scenarios**

| Scenario ID | Type | Preconditions and data | Main steps | Expected result | Presenter |
| :---- | :---- | :---- | :---- | :---- | :---- |
| *DS-04a* | *Main* | Seeded organization workspace with active Expert (owner), L\&D Manager, Employee, approved Micro-skill, and valid Text/Video lesson content. | 1\. Expert creates a Learning Module mapped to one approved Micro-skill, adds and reorders Text and Video lessons, and submits for approval. 2\. L\&D Manager opens the approval queue, previews all lessons, and approves (single/batch) the module. 3\. Module transitions to RELEASED; Employee opens the learning catalog and inspects the released module and ordered lessons. | Module is released to the Employee catalog with exact Skill mapping, lesson order, and content; approved revision and audit history persist across reload. | Nguyễn Trần Việt An |
| *DS-04b* | *Exception* | Incomplete DRAFT module; SUBMITTED module; RELEASED module with coverage; peer Expert, second eligible Expert, and foreign-org account. | 1\. Expert submits incomplete draft \-\> blocked; L\&D returns a valid submission with feedback, Expert revises and resubmits. 2\. Peer Expert edit and foreign-org access \-\> denied; L\&D transfers module responsibility to another Expert \-\> previous owner loses mutation rights. 3\. Direct edit of RELEASED module \-\> blocked (create successor DRAFT instead); archive of coverage-required module \-\> blocked; restore of ARCHIVED module \-\> creates DRAFT requiring full re-approval. | Invalid submissions, unauthorized access, direct edits of released snapshots, and unsafe archives are blocked; ownership transfer, feedback, and audit history remain intact. | Nguyễn Trần Việt An |

**Committed test cases**

| Test type | Count | Automated in CI | Responsible member(s) |
| :---- | :---- | :---- | :---- |
| *Feature tests (≥ 3 per feature)* | 9 | 9 | Nguyễn Trần Việt An |
| *End-to-end workflow test (≥ 1\)* | 1 | 1 | Nguyễn Trần Việt An |
| *State transition tests (≥ 1 per transition)* | 1 | 1 | Nguyễn Trần Việt An |
| *Total for this workflow* | 11 | 11 | Nguyễn Trần Việt An |

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
| **Activity diagram (Report 4 section)** | Section 4.5.1 (Adaptive Pathway Generation Activity Diagram) |

**Features in this workflow**

| Feature ID | Feature | Acceptance criteria | Test case IDs |
| :---- | :---- | :---- | :---- |
| FR-WF05-01 | Baseline assessment | L\&D configures Role-Level policy; Employee starts/resumes, submits or reaches deadline. Store frozen questions, group results and history. Baseline diagnostics do not award achievement. | TC-WF05-F01, TC-WF05-F02, TC-WF05-F03, TC-WF05-S01, TC-WF05-S02 |
| FR-WF05-02 | Choose or change Role | Employee selects a published Role and actual Level. Block changes while an assessment or mandatory request-bound work remains; preserve previous evidence/history. | TC-WF05-F04, TC-WF05-F05, TC-WF05-F06, TC-WF05-S03 |
| FR-WF05-03 | Generate and approve pathway | Compare results with target requirements; generate requirement roots with eligible alternatives/certificates. The Assigned Expert approves the exact revision; the Employee then views the authorized pathway. | TC-WF05-F07, TC-WF05-F08, TC-WF05-F09, TC-WF05-S04 |
| FR-WF05-04 | Learn, recalculate and complete | The employee learns and takes skill assessments. Recalculate from accepted evidence; enforce supplementation/veto/full retake, preserve completed work, and finish only when mandatory requirements are resolved. | TC-WF05-F10, TC-WF05-F11, TC-WF05-F12, TC-WF05-E01, TC-WF05-S05 |
| FR-WF05-05 | Configure Skill provision and assessment | Expert maps each Skill-knowledge scope to module alternatives OR its certificate and configures MAIN/prerequisite assessment groups. Validate ownership, coverage and bank readiness; retain policy versions. | TC-WF05-F13, TC-WF05-F14, TC-WF05-F15, TC-WF05-S06, TC-WF05-S07 |
| FR-WF05-06 | RIASEC Assessment & Local AI Job Position Recommendation | Score and save submitted RIASEC answers; use Local AI to compare results with available Job Positions and explain matches. Do not use competency evidence or recommend/assign Target Roles. Employees may explore roles independently. | TC-WF05-F16-F18 |

**Demo scenarios**

| Scenario ID | Type | Preconditions and data | Main steps | Expected result | Presenter |
| :---- | :---- | :---- | :---- | :---- | :---- |
| *DS-05a* | *Main* | Employee, L\&D Manager and the Expert assigned to the selected Role are available in the same workspace. The Role is published and contains the selected Level. The question bank has enough eligible questions for the baseline and Skill Assessment policies. Prepare one unmet module-based requirement with two accepted module choices, A1 and A2. Use an Employee who has no compatible official evidence for that requirement. | Log in as the assigned Expert. Configure the Skill requirement to use approved modules and check the required learning outcomes. Save and publish the Skill Assessment policy, including the MAIN group, prerequisite groups and retry rules. Log in as L\&D Manager. Select the exact Role and Level, configure the baseline policy, and publish it after the question bank is ready. Log in as Employee. Select that published Role and its actual Level. Start the baseline, answer some questions, leave the page and reopen it. Check that the same questions, saved answers and remaining time are retained. Finish and submit the baseline. Open the results and history. Check that the result shows the Employee's current knowledge and gaps; it does not itself award an official Skill achievement. Preview the unmet requirements and confirm the learning request. Open the generated pathway and check that the requirement shows all eligible module choices. Log in as the assigned Expert. Review the current pathway, remove only an allowed unstarted module choice if needed, save the choices and approve the current version. Return as Employee. Open the approved pathway, choose an accepted module, complete its required content and take its Skill Assessment. Use answers that satisfy the MAIN and required prerequisite conditions. After result processing finishes, refresh the pathway and knowledge profile. Check the accepted evidence, completed requirement and remaining required work. The target can change only after every required blocker is resolved. Reopen the other accepted module choice. Check that it keeps its own learning progress, assessment result, retry allowance and waiting period. It must not display a passed assessment simply because the first choice fulfilled the requirement. | The baseline, learning request, Expert approval, assessment results and accepted evidence remain available in history. The Employee accesses the approved work. Official achievement comes from qualifying evidence, and completion is shown only after all mandatory work is resolved. Related Report 5 cases: TC-WF05-F01-TC-WF05-F14; TC-WF05-E01; TC-WF05-S01-TC-WF05-S04. | Trần An Quốc |
| *DS-05b* | *Exception* | Prepare separate examples so each check starts from its stated condition: an incomplete policy or insufficient question bank; a bound Role-Level target; a pathway with a stale version; an unassigned Expert or another Employee; and a genuinely missing provision. Also prepare an approved certificate-only requirement, a valid certificate definition, an HTTPS evidence link or an owned private PDF/PNG/JPEG file, and the assigned certificate reviewer. | With L\&D Manager or the assigned policy editor, try to publish a policy whose required groups or question bank are not ready. Check the error and confirm that the previous active policy remains unchanged. As Employee, try to change the Role or Level while an assessment or mandatory request-bound work is still pending. Check that the change is blocked and the current target and history remain intact. Open an assessment or pathway as another Employee, and try the review action as an unassigned Expert. Check that the system denies access or the change. Using a prepared older pathway version, try to approve after the current version has changed. Check that approval is refused; reload and review the current version before trying again. For a requirement with suitable provision still available, try to bypass it and check that the action is refused. In the separate missing-provision example, enter the required reason and perform the allowed bypass. Check that no Skill achievement is awarded. As Employee, open the certificate requirement in the approved pathway. Submit one valid HTTPS link or one owned private file. Check that the submission is waiting for review and the requirement is still incomplete. In separate examples, try an HTTP link, a link and file together, or a file owned by another Employee. Check that invalid evidence is rejected without creating an accepted submission. As the assigned Expert, open the submitted evidence and reject it with a clear reason. First check that a rejection without a reason is refused. As Employee, read the rejection reason and submit corrected evidence linked to the latest rejected submission. Check that the previous evidence and decision remain visible in history. As the assigned Expert, review the replacement and approve it with a reason. Refresh the Employee's pathway after processing. Check that official evidence is created once and the matching certificate requirement becomes fulfilled. | Invalid publication, target changes, stale approvals and unauthorized actions do not overwrite accepted data. A bypass only resolves an allowed missing-provision blocker and grants no achievement. Certificate evidence alone does not complete the requirement. Rejection keeps its reason and history; only assigned approval creates official evidence and allows the compatible requirement to be fulfilled. Related Report 5 cases: TC-WF05-F02, TC-WF05-F05, TC-WF05-F08-TC-WF05-F09, TC-WF05-F13-TC-WF05-F15; TC-WF05-S01, TC-WF05-S03-TC-WF05-S04, TC-WF05-S06-TC-WF05-S07. | Trần An Quốc |
| DS-05c | Exception | Prepare an approved pathway with module A and a Skill Assessment whose MAIN group checks A and whose prerequisite group checks B. Use controlled answers where MAIN passes, B fails and no veto condition applies. Prepare suitable learning provision for B and a later allowed A retake. A second prepared example may contain prior official B evidence to show the need-review condition without deleting that evidence. | As Employee, finish module A and take its Skill Assessment. Answer so that MAIN passes and prerequisite B fails, without triggering a veto. Open the result and refresh the pathway after processing. Identify the B learning requirement added because of the failed prerequisite. Check that A is not treated as fully qualified while its required supplement remains unresolved. In the example with prior official B evidence, check the need-review indication and verify that the old evidence is still present. When the Employee is eligible to retake A under its retry rules, take the retake and pass B within that assessment. Reopen the already assigned B learning step. Check that the later A retake does not remove the B learning work that was already required. The Employee must still resolve that work through suitable qualifying provision. Open the required B provision, complete its learning content and satisfy its assessment, or follow the assigned certificate route when B is certificate-based. Wait for accepted evidence and refresh the pathway. Reopen A's result and the pathway. Check that the system reevaluates the remaining conditions using compatible official evidence and preserves earlier attempts and completed work. Refresh again and repeat the same allowed submission or decision only where the interface permits it. Check that history and achievement are not duplicated. If the prepared processing example is retryable, let the authorized retry finish and check the same records. Try changing the target before all required work is resolved, then try again after all blockers are genuinely resolved. Check that only the later change is allowed and previous evidence/history remain available. | The failed prerequisite remains traceable to its actual assessment result. Passing B inside a later A retake does not silently cancel previously assigned B learning. Accepted compatible B evidence allows reevaluation; A qualifies only when all of its required rules are satisfied. Repeated processing does not create duplicate evidence or discard completed work. Related Report 5 cases: TC-WF05-F10-TC-WF05-F12; TC-WF05-S02-TC-WF05-S05. | Trần An Quốc |

**Committed test cases**

| Test type | Count | Automated in CI | Responsible member(s) |
| :---- | :---- | :---- | :---- |
| *Feature tests (≥ 3 per feature)* | 18 | 18 | Trần An Quốc |
| *End-to-end workflow test (≥ 1\)* | 1 | 1 | Trần An Quốc |
| *State transition tests (≥ 1 per transition)* | 7 | 7 | Trần An Quốc |
| *Total for this workflow* | 26 | 26 | Trần An Quốc |

**Pass criteria at Defense 1.1**

| Criterion | Committed |
| :---- | :---- |
| *Runs end-to-end on staging with seeded data* | *Yes \- commitment; not verified.* |
| *Main scenario passes* | *Yes \- commitment; not run.* |
| *Exception scenarios passing* |  |
| *Test pass rate for this workflow* |  |
| *Open Critical / High defects* | *0 \- Defense target; current status unverified.* |

**Reviewer note**

| Note |  |
| :---- | :---- |

## 

## **7\. Individual Commitments**

### **7.1 Member 1**

| Full name | Đặng Minh Hoàng |
| :---- | :---- |
| **Student ID** | SE193626 |
| **Role in team** | Leader |

**Ownership**

| Type | Items (IDs / names) | Notes |
| :---- | :---- | :---- |
| *Main workflow(s) owned* | WF-01 \- Organization Onboarding |  |
| *Mandatory features owned* | FR-WF01-01; FR-WF01-02; FR-WF01-03; FR-WF01-04; FR-WF01-05; FR-WF01-06; FR-WF01-07; FR-WF01-08 |  |
| *Modules / entities owned* | Registration, account, payment order, organization, workspace |  |
| *Design decisions owned (D-IDs)* |  |  |
| *NFRs responsible* | NFR-P01 |  |

**Delivery commitments to Defense 1.1**

| Commitment | Committed (count / IDs) | Due |
| :---- | :---- | :---- |
| *Functional test cases written* | 26 functional cases: 24 feature tests (TC-WF01-F01-F24) \+ 1 E2E workflow test \+ 1 state transition test. | Defense 1.1 |
| *Of which automated in CI* | 26 | Defense 1.1 |
| *Demo scenarios presented* | 3: DS-01a, DS-01b , DS-01c  | Defense 1.1 |
| *Required fixes owned (section 9\)* |  |  |
| *Documentation sections (Report / section)* | BM04 6.2, 7.2; Report 3 (SRS: 3.2); Report 4 (SDD 3.1, 4.1); | Defense 1.1 |

**Ownership verification at Review 2 (completed by reviewers)**

| Result | Weak points observed | Follow-up (by whom, by when) |
| :---- | :---- | :---- |
| *☐ Verified* *☐ Partly verified* *☐ Not verified* |  |  |

**Member confirmation**

| Signature / date |  |
| :---- | :---- |

### **7.2 Member 2**

| Full name | Nguyễn Anh Khôi |
| :---- | :---- |
| **Student ID** | SE192491 |
| **Role in team** | Developer |

**Ownership**

| Type | Items (IDs / names) | Notes |
| :---- | :---- | :---- |
| *Main workflow(s) owned* | WF-02 \- Target Role & Competency Ontology Management. |  |
| *Mandatory features owned* | FR-WF02-01, FR-WF02-02, FR-WF02-03, FR-WF02-04. |  |
| *Modules / entities owned* | Competencies, Micro-skills, Directed Skill Prerequisites, Target Roles, Role Levels |  |
| *Design decisions owned (D-IDs)* |  |   |
| *NFRs responsible* | NFR-P02 |  |

**Delivery commitments to Defense 1.1**

| Commitment | Committed (count / IDs) | Due |
| :---- | :---- | :---- |
| *Functional test cases written* | 22 functional cases: 20 feature tests (TC-WF02-F01-F20) \+ 1 E2E workflow tests \+ 1 state transition tests. | Defense 1.1 |
| *Of which automated in CI* | 22 | Defense 1.1 |
| *Demo scenarios presented* | 3: DS-02a, DS-02b, DS-02c. | Defense 1.1 |
| *Required fixes owned (section 9\)* |  |  |
| *Documentation sections (Report / section)* | BM04 6.2, 7.2; Report 3 (SRS: 3.7); Report 4 (SDD 3.2, 4.2). | Defense 1.1 |

**Ownership verification at Review 2 (completed by reviewers)**

| Result | Weak points observed | Follow-up (by whom, by when) |
| :---- | :---- | :---- |
| *☐ Verified* *☐ Partly verified* *☐ Not verified* |  |  |

**Member confirmation**

| Signature / date |  |
| :---- | :---- |

### **7.3 Member 3**

| Full name | Nguyễn Trần Việt An |
| :---- | :---- |
| **Student ID** | SE184889 |
| **Role in team** | Developer |

**Ownership**

| Type | Items (IDs / names) | Notes |
| :---- | :---- | :---- |
| *Main workflow(s) owned* | WF-03 \- Question Bank Management; WF-04 \- Learning Module Management |  |
| *Mandatory features owned* | FR-WF03-01, FR-WF03-02, FR-WF03-03; FR-WF04-01, FR-WF04-02, FR-WF04-03 |  |
| *Modules / entities owned* | **WF-03:** Question, Question Version, Answer Option, Skill Association, Import Batch, Review/Revision History, Ownership and Availability Records.  **WF-04:** Learning Module, Module Revision, Text/Video Lesson, Skill Association, Module Assignment, Publication/Archive Records and Audit History. |  |
| *Design decisions owned (D-IDs)* |  |  |
| *NFRs responsible* | NFR-P03 (Performance \-concurrent learning); organization-level data isolation, RBAC & ownership enforcement, atomic import consistency, immutable published/released revisions, reliable publish/archive retry, and accurate audit history. |  |

**Delivery commitments to Defense 1.1**

| Commitment | Committed (count / IDs) | Due |
| :---- | :---- | :---- |
| *Functional test cases written* | 22 functional cases: 18 feature tests (TC-WF03-F01-F09, TC-WF04-F01-F09) \+ 2 E2E workflow tests (TC-WF03-E01, TC-WF04-E01) \+ 2 state transition tests (TC-WF03-S01, TC-WF04-S01). | Defense 1.1 |
| *Of which automated in CI* | 22 | Defense 1.1 |
| *Demo scenarios presented* | 4: DS-03a, DS-03b; DS-04a, DS-04b. | Defense 1.1 |
| *Required fixes owned (section 9\)* |  |  |
| *Documentation sections (Report / section)* | BM04 6.3, 6.4, 7.3; Report 4 (SDD 3.3, 3.4, 4.3, 4.4); Report 5 (Question Bank management & Learning Module management sheets). | Defense 1.1 |

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
| *Main workflow(s) owned* | WF-05 \- Assessment and Adaptive Learning Pathway. |  |
| *Mandatory features owned* | FR-WF05-01, FR-WF05-02,  FR-WF05-03,  FR-WF05-04,  FR-WF05-05; FR-WF05-06 |  |
| *Modules / entities owned* | Assessment policies, attempts/results, evidence and pathway revisions.; RIASEC results and Local AI Job Position recommendations |  |
| *Design decisions owned (D-IDs)* |  |  |
| *NFRs responsible* | WF-05 security, integrity, usability and performance. NFR-P04 |  |

**Delivery commitments to Defense 1.1**

| Commitment | Committed (count / IDs) | Due |
| :---- | :---- | :---- |
| *Functional test cases written* | 26 functional cases: existing 23 committed cases \+ 3 RIASEC/Local AI feature tests (TC-WF05-F16-F18). | Defense 1.1 |
| *Of which automated in CI* | 26 | Defense 1.1 |
| *Demo scenarios presented* | 3 planned: DS-05a-c. | Defense 1.1 |
| *Required fixes owned (section 9\)* |  |  |
| *Documentation sections (Report / section)* | BM04 6.5, 7.4; assessment/pathway sections in Reports 3-4. | Defense 1.1 |

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
| WF-01 | Đặng Minh Hoàng | 8 | 3 (1 main / 2 exception) | 26 | 26 |
| WF-02 | Nguyễn Anh Khôi | 4 | 3 (1 main / 2 exception) | 22 | 22 |
| WF-03 | Nguyễn Trần Việt An | 3 | 2 (1 main / 1 exception) | 11 | 11 |
| WF-04 | Nguyễn Trần Việt An | 3 | 2 (1 main / 1 exception) | 11 | 11 |
| WF-05 | Trần An Quốc | 6 | 3 (1 main / 2 exception) | 26 | 26 |
| Total | 4 | 24 | 13 | 96 | 96 |

### **8.2 By member**

| Member | Workflows owned | Features | Test cases | Automated | Demo scenarios | Review 2 verification |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Đặng Minh Hoàng | WF-01 | 8 | 26 | 26 | 3 |  |
| Nguyễn Anh Khôi | WF-02 | 4 | 22 | 22 | 3 |  |
| Nguyễn Trần Việt An | WF-03; WF-04 | 6 | 22 | 22 | 4 |  |
| Trần An Quốc | WF-05 | 6 | 26 | 26 | 3 |  |
| Total | 5 | 24 | 96 | 96 | 13 |  |

### **8.3 Committed Numbers**

| Number of main workflows | 5 |
| :---- | :---- |
| **Number of demo scenarios (main / exception)** | 13 (5 main / 8 exception) |
| **Committed functional test cases** | 96 |
| **Of which automated in CI** | 96 |

### **8.4 Eligibility Thresholds for the Viva**

| Criterion | Minimum threshold | Agreed threshold |
| :---- | :---- | :---- |
| *Main workflows* | *100% run end-to-end* | *100% run end-to-end* |
| *Demo scenarios* | *100% main; ≥ 80% exception* | *100% main; ≥ 80% exception* |
| *Test case count* | *≥ committed number* | *≥ committed number* |
| *Test pass rate* | *≥ 90% overall; 100% main-path tests of mandatory features* | *≥ 90% overall; 100% main-path tests of mandatory features* |
| *Automation* | *≥ 50% run in CI* | *≥ 50% run in CI* |
| *Defects* | *No open Critical or High defects* | *No open Critical or High defects* |
| *Individual* | *Each member demos the workflow they own and meets their delivery commitments* | *Each member demos the workflow they own and meets their delivery commitments* |

## **9\. Required Fixes**

| ID | Item | Related workflow | Owner | Due |
| :---- | :---- | :---- | :---- | :---- |
| FIX-01 | Complete Platform Administrator and System Administrator management features (organizations, plans, monitoring, users, departments, seats and renewals); not yet covered by WF-01 demo scenarios. | WF-01 | Đặng Minh Hoàng | Before Defense 1.1 |
| FIX-02 | Complete RIASEC assessment and Local AI Job Position suggestions based only on RIASEC results; add a matching demo scenario. No competency evidence or Target Role recommendations. | WF-05 | Trần An Quốc | Before Defense 1.1 |
| FIX-03 | Complete L\&D employee/department development summaries and include a demonstration of the reporting flow. | WF-01 | Đặng Minh Hoàng | Before Defense 1.1 |
| FIX-04 | Run and document RQ1 (Graph vs CBF, Hit Rate@5) and RQ3 (adaptive vs static, 100 simulated learners); retain reproducible results for Defense. | RQ1; RQ3 | Nguyễn Trần Việt An | Before Defense 1.1 |
| FIX-05 | Run and document RQ2 Neo4j latency benchmark on 1k, 5k and 10k nodes; report mean and P95 with reproducible measurements. | RQ2 | Nguyễn Anh Khôi | Before Defense 1.1 |

## **10\. Review 2 Conclusion (completed by reviewers)**

☐ Pass     ☐ Conditional pass     ☐ Re-review

## **11\. Confirmation**

| Role | Full name | Signature | Date |
| :---- | :---- | :---- | :---- |
| *Reviewer 1* |  |  |  |
| *Reviewer 2* |  |  |  |
| *Supervisor* |  |  |  |
| *Team leader* |  |  |  |

