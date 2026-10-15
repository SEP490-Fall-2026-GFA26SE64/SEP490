# Adapt-Learn-Graph: Product Overview

**Current scope baseline:** [Adapt-Learn-Graph System Overview](adapt_learn_graph_system_overview.md)  
**Aligned:** 2026-10-14  
**Product model:** Internal enterprise system serving one organization  
**Status:** Scope and traceability baseline, not a finalized SRS or claim of implementation.

## Current Product Purpose

Adapt-Learn-Graph manages employee competencies and personalized learning within one organization. Its knowledge graph connects disciplines, target roles, competencies, micro-skills, learning modules, courses, and assessment mappings. Evidence supports competency estimates, gap analysis, Expert-reviewed AI role guidance, and adaptive pathways.

The System Overview controls current scope and responsibilities. Older requirements, clarification logs, registration material, and test results below are historical where they conflict. Architecture and schema documents remain the authority for existing technical fields; this update does not change code or databases.

## Actors and Boundaries

There are exactly four human actors. Automated services are not actors.

| Actor | Responsibilities | Boundary |
| --- | --- | --- |
| System Administrator | Accounts, roles/permissions, organization-wide technical configuration, audit and operational activity. | Assessment business rules remain with L&D/Expert. |
| L&D Manager | Disciplines, discipline Expert assignments, target-role creation and Expert assignment, baseline assessment configuration, role publication, learning approval, employee monitoring. | Does not edit the Expert's role competency requirements. |
| Expert | Assigned-discipline skills, prerequisites, modules, courses, questions/module assessments; assigned-role competency requirements; AI guidance and initial pathway review. | Does not publish target roles or approve organizational learning offerings on behalf of L&D. |
| Employee | Personal profile, baseline/RIASEC and learning assessments, reviewed role guidance and role selection/confirmation, reviewed pathways, independent skill learning, progress tracking. | Does not author graph definitions or manually alter target-role pathway modules. |

Single-organization deployment does not imply unrestricted access. Assignment, authorized review, and personal-record permissions still apply. Multiple roles per person and reviewer delegation remain open.

## Scope and Business Flows

1. System Administrator maintains accounts, permissions, system settings, and activity records.
2. L&D creates/updates/deactivates disciplines and assigns/removes Experts from disciplines.
3. L&D creates a target role and assigns an Expert. The Expert configures competencies, micro-skills, required proficiency and importance, and submits the configuration as complete. L&D reviews and publishes/unpublishes it without editing those requirements.
4. Experts maintain assigned-discipline skills, prerequisites, modules, courses/content, and module assessments. L&D approves submitted modules, courses, and assessments or returns them for revision.
5. L&D defines baseline competencies covered, question selection, and scoring. Employee completes baseline and RIASEC assessments; the system suggests roles/comments; an Expert confirms, revises, or rejects guidance; Employee views reviewed guidance and selects/confirms a role.
6. The system calculates gaps and proposes an ordered pathway. An Expert reviews it, includes/excludes modules, and confirms it before Employee learning starts.
7. Learning and assessments update progress and competency estimates through configured knowledge-tracing rules. New evidence can change remaining learning needs and cause pathway recalculation; exact triggers remain open, not a confirmed failure-only restriction.
8. Employee can independently browse/select a micro-skill and learn its mapped modules/courses without starting or changing a target-role pathway. Assessment evidence can update competency estimates.
9. L&D monitors profiles, gaps, assessment results, and learning progress.

**Out of scope:** Multi-organization registration/workspaces, subscriptions, payment processing, PayOS, cancellation, and SaaS billing. Platform Administrator and Organization Administrator are not current actors. Soft-skill comments are not a replacement for baseline/RIASEC role guidance. Learning content is not restricted to dummy modules. A research benchmark workspace and report exports are not committed by the System Overview.

## Current Requirement Traceability

Existing IDs remain stable; obsolete IDs are retired rather than reused. New capabilities receive new IDs. See [features/README.md](features/README.md) for function links and clarification status.

| IDs | Current capability and ownership |
| --- | --- |
| REQ-001 | Employee role selection/confirmation after Expert-reviewed guidance; publication must gate availability. Earlier immediate-selection/publication-independent rules need revision. |
| REQ-002 | Employee baseline assessment; configuration (F02) belongs to L&D. One logical blueprint is grouped by Occupation and contains per-role/skill/difficulty configuration for every role in that Occupation; a role may contribute zero questions. Employee attempt, coverage/defaults and adaptive scoring still require revalidation before role selection. |
| REQ-004, REQ-005, REQ-006 | Employee adaptive pathway, recommendation explanation, and competency graph; initial pathway starts only after Expert confirmation. |
| REQ-007, REQ-008, REQ-009, REQ-010 | Module/course access, module assessments, own baseline/RIASEC/module results, and recalculation visibility. REQ-007's legacy folder name does not impose dummy-only scope. |
| REQ-011 through REQ-018 | Expert assigned-role access; assigned-discipline skill/module/question management, role requirements, module outcomes, mappings, and graph prerequisites. Module assessment configuration belongs to Expert, not baseline configuration. |
| REQ-019, REQ-020 | Expert initial pathway review and confirmation, with module inclusion/exclusion before Employee starts. |
| REQ-022, REQ-037 | System Administrator account/role management and system-enforced access control for the four current actors. |
| REQ-023, REQ-024 | L&D target-role creation/update and assigned-Expert management; discipline assignments are separate. |
| REQ-025, REQ-026 | L&D employee development monitoring and supporting learning statistics; exact metrics remain open. |
| REQ-038, REQ-039, REQ-040 | Supporting account activation, operational notifications, and sensitive-data protection; policies remain open and exclude subscription events. |
| REQ-041, REQ-042, REQ-043, REQ-046 | Automated competency/gap analysis, initial pathway generation for review, evidence-driven recalculation, and consistent learning state. |
| REQ-047 | Employee RIASEC assessment for interest-based guidance, not knowledge mastery. |
| REQ-048 | System-generated, Expert-reviewed target-role guidance viewed by Employee before role selection/confirmation. |
| REQ-049 | Expert confirms, revises, or rejects baseline/RIASEC-based AI role guidance. |
| REQ-050 | L&D discipline create/view/update/deactivate. |
| REQ-051 | L&D discipline Expert assignment/removal and assignment viewing. |
| REQ-052 | L&D review of completed role configuration and publication/unpublication. |
| REQ-053 | L&D module/course/assessment approval or return for revision. |
| REQ-054 | Expert course/content authoring, organization within modules, removal, and submission for approval. |
| REQ-055 | Employee independent micro-skill learning through mapped content; system progress/evidence updates. |
| REQ-056 | Employee personal/work profile viewing and updating. |
| REQ-057 | System Administrator technical system configuration. |
| REQ-058 | System Administrator audit/operational activity viewing. |
| REQ-059 | Automated knowledge tracing from assessment evidence using configured rules. |

### Superseded and Deferred IDs

| IDs | Disposition |
| --- | --- |
| REQ-003, REQ-021, REQ-044 | Retired soft-skill assessment/comments/review. Replaced in current scope by REQ-047/048/049; old responses must not be relabeled as RIASEC. |
| REQ-028 through REQ-032, REQ-045 | Retired SaaS billing/payment/platform organization capabilities. |
| REQ-033 through REQ-036 | Registration-era research workspace, not committed current product functionality or a new administrator permission. |
| REQ-027 | Export capability deferred; need, access, and formats require separate agreement. |

## Architecture and Acceptance

Neo4j remains the catalog relationship store; PostgreSQL remains the transactional store. [ARCHITECTURE.md](ARCHITECTURE.md) and [neo4j_schema.md](neo4j_schema.md) distinguish implemented fields from design gaps for disciplines, courses, publication/approval, RIASEC, guidance reviews, and knowledge tracing. Do not infer new fields or database migrations from this overview alone.

Acceptance must verify actor/assignment boundaries, L&D publication and approval, Expert-reviewed guidance before selection, Expert-confirmed initial pathways before learning, independent skill learning without pathway modification, and consistent evidence/progress updates. Historical test results apply only to their recorded contract versions; they do not prove the revised requirements are implemented. Documentation checks validate links, scope coverage, ownership, and traceability; runtime verification follows future implementation.

## Open Decisions

- Baseline scope before role selection, attempt limits, question selection/scoring, proficiency levels, evidence reuse, and RIASEC instrument/scoring/versioning.
- AI provider/input minimization, review assignment, revision/rejection workflow, Employee visibility, and role-change behavior.
- Discipline membership/history, role configuration completion/publication checks, and withdrawal effects on existing learning.
- Course/content delivery, approval/versioning, module assessment eligibility, and independent learning progress rules.
- Knowledge-tracing parameters, mastery/gap thresholds, recalculation criteria, prerequisite validation, and interaction with Expert overrides.
- Activation, notifications, privacy/retention, monitoring metrics, and migration of legacy actor codes/organization fields without historical data loss.

Registration performance/research targets remain historical until adopted for the current scope; no measured outcome is claimed.

## Historical Product Baseline

<details>
<summary>Superseded 2026-09-25 enterprise SaaS overview and decision history</summary>

The following material is retained for historical requirement/test traceability only. It is not the current product model, actor matrix, scope, or acceptance contract. Conflicting confirmed/proposed statements below are superseded by the current sections above.

**Full name:** Knowledge Graph-Based Adaptive Learning and Competency Intelligence Platform  
**Domain:** Software Engineering  
**Product model:** Subscription-based platform serving enterprises  
**Document language:** English  
**Status:** Product overview based on the capstone registration and stakeholder clarification dated 2026-09-25; not a finalized Software Requirements Specification.

## 1. Product Purpose

Adapt-Learn-Graph helps enterprises identify employee competency gaps and provide personalized development pathways toward Software Engineering target roles. A knowledge graph connects target roles, competencies, micro-skills, learning modules, and assessment questions. Assessment evidence supports competency profiling, pathway generation, and conditional pathway recalculation.

Employees view system-selected dummy learning modules and complete assessments. Domain Experts maintain role-related knowledge and review generated pathways. Organization Administrators manage enterprise access, role ownership, subscriptions, and learning oversight. Platform Administrators manage platform-level subscription configuration, statistics, and research benchmarks.

The three must-have capabilities are:

1. **Pathway generation:** Generate a personalized pathway from baseline knowledge assessment results and target-role requirements.
2. **Graph editing:** Maintain target-role requirements and relationships among micro-skills, modules, and questions.
3. **Pathway recalculation:** Revise a pathway only when failed questions and the resulting gap calculation indicate that a change is necessary.

## 2. Scope and Evidence

The registration establishes the knowledge-graph recommendation engine, competency gap analysis, research questions, and proof-of-concept content constraints. The stakeholder clarification establishes the four actors, enterprise subscription model, PayOS payments, soft-skill AI review, and product functions described below.

Functions marked by requirement IDs are requested product capabilities. Sections explicitly labeled **proposed** or **open** are recommendations or unresolved policies, not confirmed stakeholder decisions. No capability or performance result is claimed to be implemented or achieved.

### 2.1 In Scope

- Enterprise-scoped employee development in Software Engineering.
- Exactly four human actors with role-based access.
- Baseline knowledge assessment, soft skill assessment, and module assessment.
- Competency profiles, target-role gaps, and employee competency graph visualization.
- Expert-managed target-role graphs, micro-skills, dummy modules, and questions.
- System-selected pathways, expert review and module inclusion/exclusion, and conditional automatic recalculation.
- AI-generated soft-skill comments reviewed by a Domain Expert against the employee's target role.
- Organizational progress reporting, statistics, and exports.
- Subscription configuration, PayOS payments, subscription cancellation, and payment statistics.
- Email notifications, first-time password handling, and protection of sensitive information.
- A benchmark workspace for creating datasets, running, viewing, and comparing RQ1, RQ2, and RQ3 experiments.

### 2.2 Out of Scope

- A full commercial LMS, video streaming infrastructure, or SCORM compliance.
- Producing real educational courses, videos, or detailed course syllabi.
- Generative AI for educational content creation. AI soft-skill comments are a separate, explicitly requested capability.
- Separate self-assessment and 360-degree feedback workflows from the registration; the clarified assessment scope contains only the three assessment types above. The soft-skill assessment format remains open.
- Employee selection, addition, removal, or reordering of pathway modules; the system selects them, with the specified expert override.
- Automatic pathway revision after every assessment regardless of outcome.
- Claims of proven workplace competency, promotion readiness, financial training ROI, or real-world learning improvement from synthetic benchmark results alone.

## 3. Actors and Responsibilities

**Organization Administrator** is retained because the role owns organization administration and billing as well as learning oversight. It is distinct from the Platform Administrator.

| Actor | Primary responsibility | Main access scope | Responsibility boundaries |
| --- | --- | --- | --- |
| Employee | Complete assessments, pursue a target role, and track personal competency development. | Own profile, available organization target roles, own assessments, graph, and pathway. | Cannot edit graph definitions, select pathway modules, manage accounts, or inspect other employees' results. |
| Domain Expert | Maintain assigned target-role knowledge and review the suitability of employee pathways and AI soft-skill comments. | Assigned target roles, associated knowledge assets, and employee records needed for authorized reviews. | Does not manage subscriptions or organization accounts. Access to unrelated roles or organizations is not implied. |
| Organization Administrator | Administer the enterprise's accounts, target roles, expert assignments, subscriptions, and learning oversight. | Own organization's users, role catalog, progress, statistics, exports, and billing. | Cannot access other organizations or configure platform-wide subscriptions. Creating a target role does not itself grant expert graph-editing functions. |
| Platform Administrator | Operate platform-level subscription configuration, aggregate statistics, and research evaluation tools. | Platform payment and organization statistics, subscription settings, and benchmark workspace. | Platform administration does not automatically grant unrestricted access to employee answers or private expert reviews. |

The adaptive engine, AI service, email service, and PayOS are automated components or external integrations, not additional human actors. Whether one person can hold multiple actor roles is an access-control design decision.

## 4. Features and Functions

Each requirement ID identifies a function for later SRS and test traceability. CRUD means create, read, update, and delete; deletion must respect historical references and tenant boundaries.

### 4.1 Employee Experience

| ID | Feature | Function / expected behavior |
| --- | --- | --- |
| REQ-001 | Target role selection | View same-organization, active, catalog-valid target roles and choose one active development goal. Selection rechecks availability, is idempotent and concurrency-safe, snapshots minimal role display data, and preserves history. Role change is blocked during an active assessment and archives the old pathway through its owner boundary. Baseline, gap, new pathway generation, soft-skill reuse, and notification delivery remain separate functions; see [Target Role Selection](features/Target%20role%20selection/README.md). |
| REQ-002 | Baseline knowledge assessment | L&D maintains one versioned blueprint per Occupation, containing all roles in that Occupation and exact per-role/skill/difficulty question counts and weights. A role configured with zero total questions remains visible but does not contribute questions, coverage demand or scoring. Employee attempt, evidence reuse, adaptive delivery and result rules remain open/revalidation work; the earlier Expert-configured depth/cap contract is historical. See [Configure Baseline Assessment](features/Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md) and [Complete Baseline Assessment](features/Baseline%20knowledge%20assessment/Complete%20Baseline%20Assessment.md). |
| REQ-003 | Soft skill assessment | Complete the configured soft skill assessment; retain responses and results for target-role matching and expert review of AI comments. |
| REQ-004 | Adaptive pathway | View the generated sequence of system-selected modules and their current statuses. The employee cannot manually select or modify pathway modules. |
| REQ-005 | Recommendation explanation | View why a module is recommended, including the relevant target-role gap or prerequisite dependency. |
| REQ-006 | Competency graph | View a personal graph showing target-role requirements, assessed skills, gaps, and relevant learning relationships. |
| REQ-007 | Dummy learning modules | View recommended dummy module descriptions, intended outcome skills, and the associated assessment without requiring real course content. |
| REQ-008 | Module assessment | Submit answers for a recommended module's assessment; record question-level outcomes linked to micro-skills. |
| REQ-009 | Assessment results | View own baseline, soft skill, and module assessment results and history, including skill-level outcomes where supported by the assessment method. |
| REQ-010 | Recalculation visibility | When a pathway changes automatically, view the revised pathway and an explanation linking the change to failed questions and the identified gap. |

### 4.2 Domain Expert Workspace

**Historical baseline configuration:** The former Domain Expert contract for per-role prerequisite depth, uniform question caps and starting difficulty is superseded. REQ-002-F02 now belongs to L&D and groups one blueprint by Occupation while retaining per-role/skill/difficulty configuration inside it. Expert ownership continues only for module assessments and assigned-domain content. See [Configure Baseline Assessment](features/Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md).

| ID | Feature | Function / expected behavior |
| --- | --- | --- |
| REQ-011 | Assigned target roles | View target roles assigned by the Organization Administrator and access their authorized management workspace. |
| REQ-012 | Micro-skill management | Create, view, update, and delete micro-skills within the expert's authorized scope. |
| REQ-013 | Learning module management | Create, view, update, and delete dummy learning modules and their descriptive information. |
| REQ-014 | Question management | Create, view, update, and delete assessment questions and their scoring information. |
| REQ-015 | Role requirements | Link or unlink micro-skills to assigned target roles and maintain the required proficiency information used by gap analysis. |
| REQ-016 | Module outcomes | Define and update the micro-skills that a learning module is intended to develop. |
| REQ-017 | Question mapping | Link or unlink assessment questions to micro-skills so results can inform the competency profile and gap calculation. |
| REQ-018 | Target-role graph editing | View and edit the authorized target-role graph, including prerequisite relationships used in pathway generation and recalculation. |
| REQ-019 | Initial pathway review | Review an employee's generated pathway after baseline assessment, using the target-role requirements, assessment evidence, and recommendation explanations. |
| REQ-020 | Pathway adjustment | Include or exclude a module in the reviewed employee pathway. This is an expert override, distinct from automatic recalculation. |
| REQ-021 | AI soft-skill review | Review AI-generated comments about an employee's soft skills and their match to the selected target role. Editing, approval, and employee publication rules remain open. |

### 4.3 Organization Administration

**Baseline assessment configuration (REQ-002-F02):** An active L&D Manager selects an Occupation and maintains its single logical blueprint. The system displays every TargetRole belonging to that Occupation; L&D enters Easy/Medium/Hard counts and score weights for each role's skills. Setting every count for a role to zero keeps the role in the configuration but excludes it from coverage, generation and scoring. Each save creates an immutable version; generated content is reviewed by exact hash before publication. This flow is implemented and executable-tested on the local opt-in Identity/Catalog boundary; production tenant visibility, publication/release snapshots and the Employee attempt lifecycle remain open dependencies.

| ID | Feature | Function / expected behavior |
| --- | --- | --- |
| REQ-022 | Account management | Create, view, update, and delete organization accounts and assign permitted organization-level roles. An Organization Administrator cannot grant Platform Administrator access. |
| REQ-023 | Target role management | Create, view, update, and delete the organization's Software Engineering target roles. Detailed knowledge relationships are maintained by assigned experts. |
| REQ-024 | Expert assignment | Assign or reassign target roles to Domain Experts responsible for maintaining those roles and performing authorized reviews. |
| REQ-025 | Employee progress | View employees' selected roles, assessment completion, pathway progress, and competency development within the organization. |
| REQ-026 | Organizational statistics | View organization-scoped learning, skill, and role statistics, such as assessment completion, competency gaps, and progress toward target-role requirements. |
| REQ-027 | Report export | Export organization-scoped learning, skill, and role statistics under the same access restrictions as the dashboard. Export formats are not yet specified. |
| REQ-028 | Subscription payment | View available subscription offerings, initiate subscription payment through PayOS, and view the resulting payment and subscription status. |
| REQ-029 | Subscription cancellation | Request cancellation of the organization's subscription and view its effective status. Effective date, refunds, and retained access follow a policy to be confirmed. |

### 4.4 Platform Administration

| ID | Feature | Function / expected behavior |
| --- | --- | --- |
| REQ-030 | Payment statistics | View platform-level payment statistics with successful, pending, failed, or cancelled payment states distinguished where applicable. |
| REQ-031 | Organization statistics | View organization-level platform statistics, such as organization counts, subscription status, and aggregate usage. |
| REQ-032 | Subscription configuration | Configure the subscription offerings used for organization purchases. Exact prices, billing periods, limits, and entitlements remain product-policy decisions. |
| REQ-033 | Benchmark dataset creation | Create and configure datasets for each of RQ1, RQ2, and RQ3 in a dedicated benchmark workspace. |
| REQ-034 | Benchmark execution | Select a dataset and experiment configuration, start a benchmark run, and view execution status or failure information. |
| REQ-035 | Benchmark results | View metrics and results for completed benchmark runs, with the dataset and configuration identified. |
| REQ-036 | Benchmark comparison | Compare algorithms or experiment runs within the same research question using compatible datasets, configurations, and metrics. |

### 4.5 Automated and Shared Functions

| ID | Feature | Function / expected behavior |
| --- | --- | --- |
| REQ-037 | Access control | Authenticate users and enforce actor permissions and organization isolation for screens, operations, reports, exports, and employee review access. |
| REQ-038 | First-time password | Support secure initial account access using a first-time password that must be changed before normal use. The delivery method and expiry policy require confirmation. |
| REQ-039 | Email notifications | Send email notifications for configured account, learning, review, and subscription events. The event list and recipients require confirmation. |
| REQ-040 | Sensitive data protection | Protect important stored information with mechanisms appropriate to the data. Passwords require salted adaptive hashing; recoverable sensitive data requires encryption and access controls, not irreversible hashing alone. |
| REQ-041 | Competency profiling and gap analysis | Derive and update an employee's competency profile from assessment evidence and compare it with selected target-role requirements. |
| REQ-042 | Initial pathway generation | Use baseline results, identified gaps, module outcomes, and skill prerequisites to generate and explain a system-selected learning pathway. |
| REQ-043 | Conditional pathway recalculation | After failed questions, map failures to micro-skills and evaluate the remaining gap. Recalculate only when that evaluation indicates the current pathway needs to change; otherwise retain it. |
| REQ-044 | Soft-skill AI comments | Generate comments about soft-skill assessment evidence in relation to the selected target role and make them available for authorized expert review. |
| REQ-045 | Payment confirmation | Verify PayOS payment outcomes server-side, associate them with the correct organization and subscription, and process duplicate notifications without duplicate activation. A browser redirect alone is not proof of payment. |
| REQ-046 | Consistent learning state | Keep assessment evidence, competency state, and pathway data consistent across the relational and graph stores. Repeated processing must not create conflicting results or duplicate updates. |

## 5. Pathway and Assessment Rules

### 5.1 Confirmed Behavior

1. An employee chooses a target role and completes the baseline knowledge assessment.
2. The system calculates the competency gap and generates an initial pathway using role requirements and the knowledge graph.
3. A Domain Expert can review that employee's initial pathway and include or exclude modules.
4. The employee views recommended dummy modules and completes module assessments. The employee does not choose pathway modules.
5. Assessment results update the available evidence about the employee's skills. Passing an assessment does not by itself trigger pathway replanning.
6. When questions are failed, the system checks the mapped skills, prerequisite gaps, and whether the existing pathway needs revision.
7. If revision is necessary, the system recalculates the pathway and explains the changes. If not, it retains the pathway while recording the assessment result.
8. Soft skill assessment produces evidence for AI comments and expert review. Its effect on knowledge-pathway generation is not yet defined.

**Illustrative decision table:**

| Assessment event | Gap decision | Expected pathway action |
| --- | --- | --- |
| Baseline completed | Initial gaps calculated | Generate initial pathway; make it available for expert review. |
| Module assessment contains no failed questions | No failure-driven recalculation trigger | Update results and relevant progress; do not automatically replan. |
| Module assessment contains failed questions | Current pathway already addresses the relevant gap | Keep the pathway; show results and the gap explanation. |
| Module assessment contains failed questions | Gap requires a pathway change | Recalculate system-selected modules and explain the revision. |
| Expert includes or excludes a module | Authorized manual review action | Apply the expert adjustment subject to the agreed validation policy. |

### 5.2 Proposed Safeguards

- Preserve assessment attempts and pathway revisions so progress and changes remain explainable.
- Record the expert, timestamp, and reason for manual module inclusion or exclusion.
- Validate graph edits and expert overrides for missing dependencies, invalid references, and prerequisite cycles before publishing changes.
- Keep dummy module viewing/completion separate from assessed mastery; opening a module does not prove skill acquisition.
- Report insufficient evidence or missing learning content instead of presenting an unsupported claim of mastery or a complete valid pathway.
- Preserve historical references when accounts, roles, skills, modules, or questions are deleted, using deactivation or archival where necessary.

## 6. Knowledge Graph Concepts

| Concept | Meaning and responsibility |
| --- | --- |
| Target role | An organization-defined Software Engineering development goal, created by the Organization Administrator and maintained in detail by an assigned Domain Expert. |
| Competency | A broader capability used to organize micro-skills and present competency profiles. A separate competency CRUD workflow has not been requested. |
| Micro-skill | A granular skill linked to target-role requirements, prerequisite skills, module outcomes, and assessment questions. |
| Learning module | A dummy learning item with defined outcome skills and associated assessment; selected by the system or included through expert review. |
| Assessment question | An item whose skill mapping allows question-level results to contribute to gap analysis. Soft-skill item format and scoring are still open. |
| Employee competency state | The current evidence-based representation of an employee's skills, used to calculate gaps against a target role. |
| Adaptive pathway | A personalized sequence of modules addressing identified gaps, with explanations and potential expert adjustments. |

Core relationships include: target role **requires** micro-skill; competency **groups** micro-skills; micro-skill **depends on** prerequisite micro-skill; module **teaches** micro-skill; question **assesses** micro-skill; employee **has assessed state for** micro-skill.

The registration proposes Neo4j for relationships and PostgreSQL for transactional records. These are technical context, not additional product actors. Catalog ownership and sharing across enterprises must be settled before graph-editing permissions are finalized.

## 7. Research Benchmark Workspace

The Platform Administrator uses a dedicated screen or workspace to create datasets, configure and run experiments, inspect results, and compare runs. Synthetic data must remain separate from operational employee records.

| Research question | Dataset creation capability | Run and comparison capability |
| --- | --- | --- |
| RQ1: Recommendation relevance | Create 500 synthetic employee profiles with varied skill gaps; maintain an expert-annotated reference set for 50 sample profiles, with five relevant modules per profile as described in the registration. | Compare graph-based recommendation against Content-Based Filtering using Hit Rate@5. Show run configuration and per-profile and aggregate outcomes. |
| RQ2: Graph query latency | Create synthetic ontologies of 1,000, 5,000, and 10,000 nodes with recorded edge counts and prerequisite depth. | Run the selected 3-hop to 5-hop traversal workload 1,000 times per graph size; compare mean and P95 latency across sizes and runs. |
| RQ3: Pathway efficiency | Create 100 simulated learners and reproducible module-failure scenarios. | Compare adaptive versus static pathways using remedial module counts and a defined target-role gap/distance measure, while reporting whether required competencies and prerequisites remain covered. |

**Evaluation rules and limitations:**

- Use the registration's Content-Based Filtering baseline for RQ1; collaborative filtering is mentioned elsewhere in the registration but is not the stated RQ1 experiment baseline.
- Define Hit Rate@5 before evaluation. A proposed definition is the fraction of evaluated profiles with at least one expert-relevant module in the top five recommendations; it is not equivalent to Precision@5.
- Store dataset versions, algorithm versions, parameters, random seeds, and environment information with results for reproducibility.
- Expert annotations must be independently curated or reviewed; algorithm-generated labels alone are not an expert ground truth. The annotation input workflow is still open.
- Compare RQ3 algorithms under equivalent learner scenarios and competency requirements. Fewer assigned modules alone does not demonstrate better learning or a valid pathway.
- Treat the exact gap/distance measure and recalculation thresholds as methodology decisions, not established formulas.

## 8. Security, Notifications, and Subscription Policies

The following are **proposed implementation policies** supporting the requested functions:

- Enforce tenant isolation on all organization-owned records and graph traversals, not just dashboard filtering.
- Restrict Domain Experts to assigned roles and authorized employee reviews; avoid exposing unrelated personal data in platform statistics.
- Use a modern password-hashing algorithm such as Argon2id or bcrypt with unique salts. Never store plaintext passwords or use a fast general-purpose hash alone for passwords.
- Prefer a short-lived account activation flow; if a first-time password is issued, make it single-use, expire it, and require replacement. Do not log credentials or resend a permanent password.
- Encrypt sensitive values that must later be recovered. Hashing, encryption, and access control address different needs and are not interchangeable.
- Validate payment amounts, organization ownership, subscription identifiers, and provider authenticity before activating access.
- Do not assume subscription cancellation automatically creates a refund or that recurring charging is supported. Define the billing behavior around the selected PayOS integration.
- Suggested email events: initial account access, initial pathway ready, expert review requested/completed, pathway recalculated, payment outcome, and subscription cancellation confirmation. Confirm recipients and avoid sensitive assessment content in email bodies.
- Limit data sent to the soft-skill AI provider and define retention and disclosure policies before using actual employee data.

## 9. Registration Targets and Acceptance Examples

### 9.1 Inherited Non-Functional Targets

These remain capstone targets to validate, not measured outcomes:

| Area | Registration target | Qualification needed |
| --- | --- | --- |
| Recommendation relevance | Hit Rate@5 >= 80% against expert-annotated data. | Freeze the metric definition, reference dataset, and evaluation procedure. |
| Graph latency | Complex Neo4j traversals <= 150 ms. | Define graph size, hardware, cache state, and whether the limit applies to mean, P95, or every query. |
| API scalability | At least 300 concurrent learner interactions with response times <= 500 ms. | Define workload, response-time percentile, errors, and treatment of external payment, email, and AI processing. |
| Data integrity | Transactional consistency between PostgreSQL and Neo4j. | Specify and test cross-store commit, failure recovery, and visibility guarantees; two databases do not automatically share one transaction. |

### 9.2 Observable Acceptance Examples

- **Generation:** Given a selected target role, mapped modules, and scored baseline answers, the employee receives a pathway whose recommendations reference identified gaps and prerequisites (REQ-002, REQ-005, REQ-042).
- **Graph editing:** An assigned expert can update a role's skill relationships; an expert without that assignment cannot make the same change (REQ-011, REQ-015, REQ-018, REQ-037).
- **Conditional recalculation:** Failed questions produce a pathway revision only when the configured gap decision requires a change; a failure already addressed by the current pathway leaves it unchanged (REQ-043).
- **Expert adjustment:** An authorized expert can include or exclude a module after baseline pathway generation; an Employee cannot perform that operation (REQ-019, REQ-020).
- **Organization isolation:** An Organization Administrator cannot view or export another organization's learning records (REQ-025 through REQ-027, REQ-037).
- **Payment handling:** Repeated delivery of the same verified successful payment event does not activate multiple subscriptions or duplicate the purchase (REQ-045).
- **Benchmarking:** The Platform Administrator can create datasets for each research question, execute the corresponding experiment, and compare completed compatible runs (REQ-033 through REQ-036).

## 10. Open Decisions Before Detailed SRS

The following do not block this overview, but must be agreed before their detailed implementation requirements are finalized:

1. **Assessment and pathway governance:** Choose baseline/module scoring, mastery thresholds, and the gap rule that triggers recalculation. Define soft-skill assessment format, AI evidence and review actions, comment visibility, and whether soft-skill results influence pathways. Decide whether initial expert review blocks employee access, how later recalculations respect expert overrides, and what happens when an employee changes target role.
2. **Knowledge ownership and data access:** Decide whether micro-skills, modules, and questions are organization-owned or shared catalogs; define review assignment where multiple experts manage a role. Specify who may see detailed employee answers, data retention/deletion rules, and how independently expert-annotated RQ1 references enter the benchmark workspace.
3. **Commercial and operational policies:** Set subscription plans, billing periods, entitlements, renewal behavior, cancellation effective date, refund policy, and post-cancellation data access. Confirm initial password delivery/expiry, notification events and recipients, and report export formats.

## 11. Source

- Capstone registration letter (historical source is not checked into this repository).
- Stakeholder product clarification supplied in this conversation on 2026-09-25.

</details>
