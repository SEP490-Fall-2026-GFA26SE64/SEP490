# Adapt-Learn-Graph: Product Overview

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
| REQ-001 | Target role selection | View same-organization, active, catalog-valid target roles and inspect their competency requirements; choose an available role for personal development. Browsing does not depend on baseline settings or eligible-question coverage; those checks belong to assessment start. Recheck catalog availability on list/detail requests and before selection; no background updates. If an open role becomes unavailable, replace its detail with the unavailable message and Back to roles without exposing cross-tenant existence. Retain an already-selected role after later assessment-readiness loss: block new question-based baseline attempts until repair, preserve existing attempts, and allow existing active-pathway modules and module assessments subject to their own availability checks. Evidence-only fulfillment follows REQ-002. Soft-skill readiness effects and concurrent-edit consistency stay open; see [View Target Roles](features/Target%20role%20selection/View%20Target%20Roles.md). |
| REQ-002 | Baseline knowledge assessment | Allow one baseline attempt per employee per target role, consumed at successful test start rather than submission. Evidence-only fulfillment separately closes the allowance without a test attempt or fabricated score: for an already-selected role, require valid requirements and prerequisites, saved settings, and no unknown skills, but skip question coverage. This does not bypass coverage for catalog visibility, new selection, configuration saving, or question-based tests. An interruption permits resume of the same attempt, not a fresh start; role switching, configuration changes, and readiness repair do not reset the allowance. A request blocked before successful start does not consume it. Cover role micro-skills and prerequisites using Expert-configured depth, question maximum, and starting difficulty. Defaults are depth 3, maximum 5 questions per skill, and Medium difficulty; upper limits are depth 5 and 10 questions per skill. A permitted first baseline after a role change assesses only unknown skills; reuse evidence and retain known gaps for pathway planning. Group single-answer multiple-choice questions by micro-skill with Easy/Medium/Hard difficulty; deliver one at a time and select the next based on the preceding result. Record competency evidence. Newly unknown skills on return to a fulfilled role and adaptive transitions remain open; see the [assessment function](features/Baseline%20knowledge%20assessment/Complete%20Baseline%20Assessment.md). |
| REQ-003 | Soft skill assessment | Complete the configured soft skill assessment; retain responses and results for target-role matching and expert review of AI comments. |
| REQ-004 | Adaptive pathway | View the generated sequence of system-selected modules and their current statuses. The employee cannot manually select or modify pathway modules. |
| REQ-005 | Recommendation explanation | View why a module is recommended, including the relevant target-role gap or prerequisite dependency. |
| REQ-006 | Competency graph | View a personal graph showing target-role requirements, assessed skills, gaps, and relevant learning relationships. |
| REQ-007 | Dummy learning modules | View recommended dummy module descriptions, intended outcome skills, and the associated assessment without requiring real course content. |
| REQ-008 | Module assessment | Submit answers for a recommended module's assessment; record question-level outcomes linked to micro-skills. |
| REQ-009 | Assessment results | View own baseline, soft skill, and module assessment results and history, including skill-level outcomes where supported by the assessment method. |
| REQ-010 | Recalculation visibility | When a pathway changes automatically, view the revised pathway and an explanation linking the change to failed questions and the identified gap. |

### 4.2 Domain Expert Workspace

**Baseline assessment configuration (REQ-002-F02):** View and configure prerequisite assessment depth, questions per micro-skill, and starting difficulty for an authorized target role. New configurations default to depth 3, a maximum of 5 questions per micro-skill, and Medium starting difficulty. Depth ranges from 0 through 5; depth 0 includes only directly required role skills, without prerequisite expansion. The question maximum ranges from 3 through 10 per micro-skill; this is not a minimum-answer requirement before early stopping. The Expert can change starting difficulty before saving; existing saved values are preserved. One question maximum and one starting difficulty apply uniformly across all assessed role and prerequisite skills, without per-skill overrides; actual question counts and later difficulty sequences may still differ through confidence-based stopping and adaptive selection. These settings govern the Employee baseline workflow under REQ-002. Successful saves activate settings for new attempts without a separate activation step; in-progress attempts retain their original settings, including on resume. If no role configuration is saved, block attempt start until an authorized Expert saves one; do not automatically use defaults. Remaining validation, blocked-state messaging and notifications, configuration requirements for evidence-only completion, historical retention, and minimum evidence before early stopping remain open; see [Configure Baseline Assessment](features/Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md).

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

- [Capstone registration letter](Copy%20of%20FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43.md).
- Stakeholder product clarification supplied in this conversation on 2026-09-25.
