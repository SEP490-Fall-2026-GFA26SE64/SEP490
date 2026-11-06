SWP490 · CAPSTONE PROJECT · REVIEW 2 · BM01

# Design Brief – Review 2

## 0. Header

| Project code | FA26SE267 (registration identifier) |
| --- | --- |
| Project name | Knowledge Graph-Based Adaptive Learning and Competency Intelligence Platform (Adapt-Learn-Graph) |
| Team | Đặng Minh Hoàng (leader), Nguyễn Trần Việt An, Nguyễn Anh Khôi, Trần An Quốc |
| Supervisor | Hoàng Thu Hà |
| Repository link (tag review-2) | [SEP490](https://github.com/SEP490-Fall-2026-GFA26SE64/SEP490); `review-2` tag not found locally |
| Version | 1.0 — draft |
| Date | 02 November 2026 |

## 1. Scope

### 1.1 Registration Changes

| Section | Current | Proposed | Reason |
| --- | --- | --- | --- |
| Registration Version 2 | Approved scope baseline | No changes | No registration amendment is confirmed. |

### 1.2 Out of Scope

| Item | Reason |
| --- | --- |
| Generative AI content creation; video streaming infrastructure; SCORM compliance | Focus effort on assessment quality and adaptive recommendations using Expert-reviewed content. Existing storage and video players avoid building a streaming platform; SCORM support would add a separate content-packaging and runtime-conformance workload. |
| Native mobile applications; HR/payroll integration; external course purchasing; automatic certification | A responsive web client supports the six actors without maintaining separate mobile apps. HR/payroll connectors, external purchasing and certification would introduce additional synchronization, commercial and credential-verification responsibilities beyond the core learning workflow. |
| Refund/cancellation workflows; report export | Prioritize reliable purchases, renewals and in-app development reporting. Refunds/cancellations require additional payment-reversal and entitlement policies; exports require separate file-generation, access-control and data-disclosure handling. |

## 2. System at a Glance

Adapt-Learn-Graph addresses static corporate training by connecting role requirements, assessment evidence and learning content. Guest, Platform Administrator, System Administrator, L&D Manager, Expert and Employee use isolated organization workspaces. PostgreSQL owns transactions and evidence; Neo4j models competencies, prerequisites and learning coverage. Experts review initial pathways; later assessments are intended to update mastery and remaining recommendations. MinIO supports private learning files; payOS and SMTP support onboarding. Local-model role guidance and actual ROI reporting remain incomplete. The core value is evidence-based, prerequisite-aware learning rather than identical course sequences for every employee. The [SDD architecture diagram](../documents/diagrams/system-architecture-report4.png) distinguishes logical responsibilities; its target capabilities are not all implemented.

## 3. Key Design Decisions

| ID | Decision | Options considered | Chosen option and rationale | Owner | Related FR / diagram |
| --- | --- | --- | --- | --- | --- |
| D1 | Backend architecture | Microservices; layered modular monolith | Java/Spring Boot monolith with `apis`, `services`, `repository` and `entities` layers; simplify deployment and local transactions while enforcing dependencies through ArchUnit. | S1 | FR-07.01; SYS-01; package diagrams |
| D2 | Persistence architecture | PostgreSQL only; Neo4j only; polyglot persistence | PostgreSQL for transactional records/evidence and Neo4j for competency/prerequisite traversal; stable IDs and versioned projections connect stores without assuming cross-store ACID. | S2 | FR-07.06/07.08; LERD-02–04 |
| D3 | Assessment snapshot/versioning strategy | Read mutable current questions/models; pin immutable versions per attempt | Persist question, policy, model and mapping snapshots/version pins in PostgreSQL; preserve reproducible scoring and history when configuration changes. | S4 | FR-06.02/07.05; SEQ-08; ST-14 |
| D4 | Frontend architecture and server-state management | Server-rendered pages; browser-only state; API-backed SPA | React/TypeScript SPA with REST APIs, TanStack Query and backend sessions; separate server state from UI state and expose loading/error states. Remaining browser-only prototypes are gaps. | S3 | FR-06.02/06.06; SYS-01; frontend package diagram |
| D5 | Pathway-generation algorithm | Static sequences; Content-Based Filtering; prerequisite-aware graph planning | Bounded deterministic planning over versioned graph inputs; verify prerequisite/coverage feasibility rather than publish an unproven approximation. CBF benchmarking and post-learning recalculation remain incomplete. | S2 | FR-07.08; LERD-03/04; SEQ-10 |

## 4. Top Risks

| ID | Risk | Impact | How we verify or mitigate | Owner |
| --- | --- | --- | --- | --- |
| R1 | Learning/AI/ROI prototypes mistaken for complete workflows | Invalid acceptance and defense claims | Demonstrate persisted outcomes; disclose missing services and blocked tests. | S4 |
| R2 | Cross-store failures or tenant-scope errors | Inconsistent or unauthorized records | Two-organization denial, replay, crash/retry and version-pin tests. | S1 |
| R3 | Stale design/schema and unmeasured algorithms | Non-reproducible deployment or research | Reconcile migrations/diagrams; freeze datasets and retain raw benchmark results. | S2 |

## 5. Known Gaps

| ID | Gap | Location | Plan | Owner | Due |
| --- | --- | --- | --- | --- | --- |
| F04 | SDD V1–V32/113-table baseline differs from current V1–V47/150 CREATE TABLE definitions | SDD §2.1; migrations | Disposition pending confirmation; reconcile lineage and inventory. | S1 | Not confirmed |
| F12 | RIASEC is browser-local; guidance uses fixed recommendations | ACT-06; assessment/role UI | Disposition pending confirmation; specify and integrate scoring/inference. | S2 | Not confirmed |
| F13 | Offering approval excludes authoritative module-assessment evidence | ACT-04; module package/quiz | Disposition pending confirmation; integrate versioned assessments. | S4 | Not confirmed |
| F14 | Post-learning mastery/adaptation loop is incomplete | ACT-06; adaptive engine | Disposition pending confirmation; implement and test the complete loop. | S2 | Not confirmed |
| F15 | Independent skill learning lacks an established access/evidence context | ACT-07; skill/module access | Disposition pending confirmation; connect independent learning without replacing role choice. | S3 | Not confirmed |
| F16 | Actual cost/benefit ledger and ROI aggregation are absent | ACT-08; reporting | Disposition pending confirmation; approve ledger and evidence-based reporting. | S4 | Not confirmed |
| F20 | Target-role API differs from documented gate/publication handoff | SDD §3.3.1; role API | Disposition pending confirmation; reconcile authority and API/design behavior. | S4 | Not confirmed |

## 6. Proposed Mandatory Features

| ID | Feature | Actor | Acceptance criteria (testable) | Test | Status |
| --- | --- | --- | --- | --- | --- |
| F-01 | Organization registration and provisioning | Guest; System | Valid verification completes registration; incomplete proof blocks entry; payment replay creates one workspace. | TC-F01-01..03 | In progress |
| F-02 | Subscription purchase and renewal | Guest; System Administrator; System | Confirmed terms create one paid period; duplicate evidence adds none; excess seats block application. | TC-F02-01..03 | In progress |
| F-03 | Role configuration/publication | Expert; L&D Manager | Expert submits; only L&D publishes; returned versions remain unavailable until approved. | TC-F03-01..03 | In progress |
| F-04 | Offering approval | Expert; L&D Manager | Approval binds module/content/assessment versions; returned bundles stay unavailable; history remains unchanged. | TC-F04-01..03 | In progress |
| F-05 | Baseline and RIASEC assessment | Employee; System | Persist scored submissions with versions; replay adds no duplicate; interests never overwrite mastery. | TC-F05-01..03 | In progress |
| F-06 | Guidance and initial pathway review | Employee; Expert; System | Guidance uses authorized published candidates; Employee chooses; only confirmed exact pathway becomes learnable. | TC-F06-01..03 | In progress |
| F-07 | Adaptive and independent learning | Employee; System | New evidence updates mastery/pathway once; completed work remains; independent learning preserves selected role. | TC-F07-01..03 | Planned |
| F-08 | Development and actual ROI | L&D Manager; System | Comparable recorded inputs reconcile to ROI; zero cost returns not calculable; foreign records are excluded. | TC-F08-01..03 | Planned |

## 7. Non-Functional Requirements

| ID | Quality attribute | Metric | Threshold | Measurement method |
| --- | --- | --- | --- | --- |
| NFR-P01 | Interactive performance | P95 request latency | ≤2 seconds; 30 concurrent users; ≥2 organizations | Fixed workload/environment; record endpoint mix, duration and percentiles; separate external/file latency. |
| NFR-P02 | Scalability | Learner-interaction response time | ≥300 concurrent interactions; ≤500 ms | Load module-completion/quiz-submission APIs; retain distribution and maximum. |
| NFR-P03 | Graph latency | Complex traversal duration | ≤150 ms | Frozen 3–5-hop queries; 1k/5k/10k-node graphs; 1,000 runs/size; record cold/warm timing. |
| NFR-P04 | Recommendation relevance | Hit Rate@5 | ≥80% | Expert-annotated held-out profiles; frozen candidates/seeds; compare with Content-Based Filtering. |
| NFR-S01 | Organization isolation | Unauthorized successful operations | 0 in the defined test suite | Cross-tenant/role/assignment/entitlement API and private-file tests across two workspaces. |
| NFR-R01 | Retry integrity | Duplicate business outcomes | 0 in the defined replay/concurrency suite | Replay submissions/webhooks; interrupt/retry workers; inspect persisted identities and counts. |

## 8. Ownership Map

| Member | Role | Owned parts (2–3) | Main workflow owned | Key decisions / PRs |
| --- | --- | --- | --- | --- |
| S1; student-role mapping not confirmed | Platform Backend & Relational Data | Identity/organization; subscriptions/provisioning; relational infrastructure | WF-01 | D1; PRs not confirmed |
| S2; student-role mapping not confirmed | Competency & Graph Algorithms | Ontology/gaps; scoring/guidance; adaptive algorithms | WF-03 | D2, D5; PRs not confirmed |
| S3; student-role mapping not confirmed | Frontend & Visualization | Six-actor interfaces; API integration; learning/report visualization | WF-04 | D4; PRs not confirmed |
| S4; student-role mapping not confirmed | Learning Services, Data & Evaluation | Catalog/approval APIs; assessment/reporting services; datasets/evaluation | WF-02 | D3; PRs not confirmed |

# Appendix A – Defense 1.1 Targets

### A1. Main Workflows

| ID | Workflow | Actors | Trigger | Business outcome | Features | Entity states | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WF-01 | Registration, purchase and workspace entry | Guest; payOS; System | Guest registers and pays | One isolated, paid workspace | F-01, F-02 | Registration EMAIL_PENDING → MFA_PENDING → REGISTERED; order PENDING → PAID; workspace PROVISIONING → READY | S1 |
| WF-02 | Role and offering approval | Expert; L&D Manager | Expert submits configuration/content | Published role and approved versioned offering | F-03, F-04 | Target role Draft → Submitted → Published; offering Draft → Submitted → Approved (target business states) | S4 |
| WF-03 | Assessment, guidance and initial review | Employee; Expert; System | Employee requests development guidance | Evidence-backed role choice and confirmed pathway | F-05, F-06 | Attempt IN_PROGRESS → SUBMITTED; initial-pathway review AWAITING_EXPERT_REVIEW → APPROVED | S2 |
| WF-04 | Learning, adaptation and reporting | Employee; L&D Manager; System | Employee completes learning/assessment | Updated mastery, remaining pathway and actual development report | F-07, F-08 | Learning incomplete → completed; current pathway → successor revision (target behavior) | S3 |

### A2. Demo Scenarios

| ID | Workflow | Type | Preconditions and data | Main steps | Expected result | Presenter |
| --- | --- | --- | --- | --- | --- | --- |
| DS-01 | WF-01 | Main | Planned staging; seeded plans, Guest and test payment adapter; environment not confirmed | Register, verify, enroll MFA, pay, enter workspace | One organization/workspace/paid period; authorized entry | S1; student not confirmed |
| DS-02 | WF-01 | Exception | Same fixture; duplicate authenticated payment observation | Replay payment and retry setup | No duplicate workspace or period; truthful setup status | S1; student not confirmed |
| DS-03 | WF-02 | Main | Planned staging; assigned Expert/L&D accounts, draft role and complete offering; environment not confirmed | Submit role/offering; L&D approves; Employee reads | Exact approved versions available in their organization | S4; student not confirmed |
| DS-04 | WF-02 | Exception | Same fixture; foreign or unassigned Expert | Attempt submission/publication | Denial; no publication or historical mutation | S4; student not confirmed |
| DS-05 | WF-03 | Main | Planned staging; approved bank/model, RIASEC instrument, local model and eligible modules; incomplete prerequisites | Complete assessments; request guidance; choose role; Expert confirms pathway | Versioned scores, authorized suggestions and exact approved pathway | S2; student not confirmed |
| DS-06 | WF-03 | Exception | Same fixture; unavailable inference service | Request guidance | Explicit inference failure; mastery/choice unchanged; no invented advice | S2; student not confirmed |
| DS-07 | WF-04 | Main | Planned staging; approved pathway, module assessment and financial ledger; incomplete prerequisites | Learn, submit, recalculate; record comparable costs/benefits; view report | One evidence update; retained completed work; reconciled actual ROI | S3; student not confirmed |
| DS-08 | WF-04 | Exception | Same fixture; replayed submission and zero-cost reporting input | Replay result; request ROI | No duplicate evidence/revision; ROI not calculable rather than fabricated | S3; student not confirmed |

### A3. Functional Test Case Target

| Source | Count | Minimum per item | Subtotal |
| --- | --- | --- | --- |
| Mandatory features | 8 | 3 | 24 |
| Main workflows (end-to-end) | 4 | 1 | 4 |
| State transitions of main entities | 12 targeted transitions in A1 | 1 | 12 |
| Agreed NFRs | 6 proposed; agreement not confirmed | 1 | 6 |
| Committed total | Commitment not confirmed | — | 46 proposed cases; at least 23 targeted for CI |

Automated in CI: at least 50% of the committed total.
