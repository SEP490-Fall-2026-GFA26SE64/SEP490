# Functional Requirements Catalog

**Source:** [Capstone Register Version 2](../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Coverage:** 48 source requirements, six human actors and the automated System, across 14 domains.

The [Product Overview](../PRODUCT_OVERVIEW.md) provides the complete product-scope directory. Each source bullet has exactly one authoritative nine-field record in the domain documents below. Each domain also includes a separate, source-inspected implementation snapshot dated 2026-10-28.

**Initial gap/pathway integration:** the [retained shared contract](../technical/initial-pathway/Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md) defines REQ-041-F02 → explicit REQ-001-F02 confirmation → REQ-042-F01 → REQ-019-F01/REQ-020-F01/F02 → REQ-004-F01. [Workspace integration](../technical/Workspace%20Adaptive%20Integration.md) preserves those confirmed rules under the domain structure below. The branch contains persisted baseline/gap/generation/review/approved-view source; the new real-auth shared-development composition still needs runtime verification. Historical checkpoint results are not new executable evidence.

## Current Reading Rules

## Reading Rules

- Only section 3.2(c) defines the functional requirements in this catalog. Requirement names and descriptions retain the source wording; Markdown escaping is normalized for display.
- FR-AA.NN is the source-level identifier: AA identifies the source actor group (01 Guest, 02 Platform Administrator, 03 System Administrator, 04 L&D Manager, 05 Expert, 06 Employee, 07 System); NN identifies the bullet assigned during this reconciliation. Keep these IDs stable in future revisions; do not renumber or reuse retired IDs.
- Requirement ID, Requirement Name, Description and Actor are populated from the source. It does not specify complete precondition, ordered-flow, exception-flow, postcondition or acceptance contracts. Those five fields are deliberately empty for later design; blanks do not mean that no rules or tests will be needed.
- Do not infer policies from old implementation notes, prototype fields or generic defaults. Details such as validation limits, timing, pricing, MFA, scoring formulas and retry behavior require later design; this catalog does not change application behavior or invalidate historical decisions outside its source-only scope.
- Existing REQ-nnn and REQ-nnn-Fnn anchors remain in the owning domains as legacy traceability references. They are not additional active requirements and do not make every old subfunction a Version 2 obligation. Historical test IDs and results remain unchanged.
- Implementation snapshots describe current behavior, inputs and limitations; they do not fill unspecified acceptance contracts with assumptions or redefine the source requirements. A mismatch between code and Version 2 is a gap, not an approved scope change.
- Non-functional requirements, architecture, research deliverables, implementation briefs, delivery reports and test evidence are not functional records. The Version 2 source remains unchanged; technical documentation and dated [test evidence](../testing/README.md) remain separate.
- System identifies the automated performer, not a seventh human actor. No requirement or empty field implies implementation completion or approved schema changes.

## Current Implementation Overview

The 2026-10-28 main/workspace integration updates the role-selection and baseline slices below. They now use real workspace sessions and tenant readiness guards; legacy local adapters elsewhere are not evidence of this slice's active authorization. The domain/FR distribution is unchanged.

**Inspection date:** 2026-10-28. This snapshot covers the current working tree, including uncommitted changes, rather than only the last commit. Backend handlers/services/persistence, frontend route wiring/data sources, migrations and existing verification references were inspected. No application, payment, email or browser tests were rerun for this documentation update.

| Status | Meaning |
| --- | --- |
| API-backed slice | UI or automated processing is connected to backend behavior and persistence for the described slice. This is not a claim that the entire source requirement is accepted or production-ready. |
| Partial | Some real backend behavior exists, but required workflow, field, authorization or UI integration remains incomplete. |
| Prototype | The described interaction uses component state, browser storage or fixed/demo data rather than an end-to-end business API. |
| Foundation only | Relevant schema, package boundaries or supporting code exists, but the required automated use case is not implemented. |

| Domain | Current implementation and principal boundary |
| --- | --- |
| [Organization onboarding](Organization%20onboarding/README.md#current-implementation) | API-backed registration, email verification, administrator MFA, resumable onboarding, payment-driven provisioning and workspace handoff. Live external delivery is not certified here. |
| [Subscription lifecycle](Subscription%20lifecycle/README.md#current-implementation) | API-backed plan selection/versioning, purchase, renewal, payment processing, periods and seats. Currency is currently VND-only. |
| [Platform administration](Platform%20administration/README.md#current-implementation) | Real workspace listing/suspension; full organization administration and activity monitoring remain incomplete/prototype. |
| [Workspace administration](Workspace%20administration/README.md#current-implementation) | Real account activation, member edits, single-role identity and billing access controls; settings/audit screens remain prototypes and catalog authorization is not fully integrated. |
| [Departments and occupations](Departments%20and%20occupations/README.md#current-implementation) | Real member assignment to stored references; department CRUD, occupation management and occupation Expert assignments remain browser-only. |
| [Role catalog](Role%20catalog/README.md#current-implementation) | Neo4j-backed roles and skill requirements with partial UI integration. Existing Expert publication conflicts with the required Expert-submit/L&D-publish workflow. |
| [Learning catalog](Learning%20catalog/README.md#current-implementation) | Real micro-skill/prerequisite operations; assigned-occupation boundaries are incomplete. Modules/content/approval are prototypes. |
| [Assessment workflows](Assessment%20workflows/README.md#current-implementation) | Real-session baseline configuration, attempts/scoring/results with tenant resource/readiness guards. Module/RIASEC slices and content/model provisioning remain incomplete. |
| [Role guidance](Role%20guidance/README.md#current-implementation) | Authenticated organization-scoped role selection connected to baseline readiness/results; AI-generated guidance remains unimplemented. |
| [Employee experience](Employee%20experience/README.md#current-implementation) | Real skill browsing mixed with local profile, tracking, gaps, progress and pathway demonstrations. |
| [Pathway review](Pathway%20review/README.md#current-implementation) | Assigned Expert review uses persisted draft membership, adjacent order, Check/preview and exact approval commands. Production dependencies and remaining verification gaps are recorded separately. |
| [Adaptive engine](Adaptive%20engine/README.md#current-implementation) | Schema, graph and selection-event foundations; no implemented mastery-update or pathway-generation/recalculation service. |
| [Development reporting](Development%20reporting/README.md#current-implementation) | Sample/derived reporting screens; no connected training-cost/benefit ledger or actual ROI aggregation. |
| [Notifications and audit](Notifications%20and%20audit/README.md#current-implementation) | Durable verification/activation/paid-confirmation mail and selected audit events; learning-workflow events and administrator audit read APIs remain incomplete. |

### Cross-Domain Boundaries

- The [active router](../../frontend/src/app/App.tsx) determines which screens are actually reachable. Older page files are not proof that their workflows are in use. In particular, platform organization navigation uses the real workspace controls, and Employee guidance/RIASEC/skills routes redirect into consolidated pages.
- [Workspace access checks](../../frontend/src/features/subscription/WorkspaceBoundary.tsx) and [authentication](../../backend/src/main/java/com/adaptlearngraph/identity/application/WorkspaceAuthenticationService.java) are real. However, the [local catalog security configuration](../../backend/src/main/java/com/adaptlearngraph/identity/infrastructure/LocalCatalogSecurityConfiguration.java), configured Employee context, client-selected company and legacy actor headers remain in catalog/learning slices. Authenticated layouts alone do not establish trusted organization or Expert-assignment enforcement for those APIs.
- [Company data](../../frontend/src/shared/stores/companyStore.ts) and [Employee learning state](../../frontend/src/shared/hooks/useEmployeeLearningState.ts) still supply many runtime demonstrations. Local success messages, AI labels, reviewer names, progress values and generated durations must not be treated as server records.
- [Database migrations](../../backend/src/main/resources/db/migration/) contain assessment, mastery, recommendation, pathway and analytics structures ahead of executable services. Tables, seed data, graph relationships and package placeholders do not establish completion.
- Existing local verification and manual procedures remain in the [testing documentation](../testing/README.md). Historical results retain their original scope; live payOS/email acceptance, current runtime behavior and full Version 2 completion are not asserted by this snapshot.

## Required Record Structure

| Field | Description |
| --- | --- |
| 1. Requirement ID | A unique, stable identifier. |
| 2. Requirement Name | The name of the functionality. |
| 3. Description | What the system shall do. |
| 4. Actor | The initiating user role or responsible automated/external performer. |
| 5. Preconditions | Conditions required before execution. |
| 6. Main Flow | The ordered normal-execution steps. |
| 7. Alternative / Exception Flows | Alternative scenarios, validation failures and error handling. |
| 8. Postconditions | The expected system state after execution. |
| 9. Acceptance Criteria | Verifiable conditions for acceptance. |

## Domain Distribution

| Domain | Source requirements |
| --- | --- |
| [Organization onboarding](Organization%20onboarding/README.md) | 3 |
| [Subscription lifecycle](Subscription%20lifecycle/README.md) | 6 |
| [Platform administration](Platform%20administration/README.md) | 2 |
| [Workspace administration](Workspace%20administration/README.md) | 5 |
| [Departments and occupations](Departments%20and%20occupations/README.md) | 3 |
| [Role catalog](Role%20catalog/README.md) | 4 |
| [Learning catalog](Learning%20catalog/README.md) | 5 |
| [Assessment workflows](Assessment%20workflows/README.md) | 6 |
| [Role guidance](Role%20guidance/README.md) | 2 |
| [Employee experience](Employee%20experience/README.md) | 5 |
| [Pathway review](Pathway%20review/README.md) | 1 |
| [Adaptive engine](Adaptive%20engine/README.md) | 2 |
| [Development reporting](Development%20reporting/README.md) | 2 |
| [Notifications and audit](Notifications%20and%20audit/README.md) | 2 |
| **Total** | **48** |

## Source Coverage

| Requirement ID | Actor | Version 2 requirement | Owning domain |
| --- | --- | --- | --- |
| [FR-01.01](Organization%20onboarding/README.md#fr-01-01) | Guest | Register an organization | Organization onboarding |
| [FR-01.02](Subscription%20lifecycle/README.md#fr-01-02) | Guest | Select a subscription | Subscription lifecycle |
| [FR-01.03](Subscription%20lifecycle/README.md#fr-01-03) | Guest | Pay for a subscription | Subscription lifecycle |
| [FR-01.04](Organization%20onboarding/README.md#fr-01-04) | Guest | Track onboarding and access the workspace | Organization onboarding |
| [FR-02.01](Platform%20administration/README.md#fr-02-01) | Platform Administrator | Manage organizations | Platform administration |
| [FR-02.02](Subscription%20lifecycle/README.md#fr-02-02) | Platform Administrator | Configure subscriptions | Subscription lifecycle |
| [FR-02.03](Platform%20administration/README.md#fr-02-03) | Platform Administrator | Monitor platform activity | Platform administration |
| [FR-03.01](Workspace%20administration/README.md#fr-03-01) | System Administrator | Manage user accounts | Workspace administration |
| [FR-03.02](Departments%20and%20occupations/README.md#fr-03-02) | System Administrator | Manage departments | Departments and occupations |
| [FR-03.03](Workspace%20administration/README.md#fr-03-03) | System Administrator | Manage roles and permissions | Workspace administration |
| [FR-03.04](Workspace%20administration/README.md#fr-03-04) | System Administrator | Manage system configuration | Workspace administration |
| [FR-03.05](Workspace%20administration/README.md#fr-03-05) | System Administrator | Monitor system activity | Workspace administration |
| [FR-03.06](Subscription%20lifecycle/README.md#fr-03-06) | System Administrator | Manage organization subscription | Subscription lifecycle |
| [FR-04.01](Departments%20and%20occupations/README.md#fr-04-01) | L&D Manager | Manage occupations | Departments and occupations |
| [FR-04.02](Departments%20and%20occupations/README.md#fr-04-02) | L&D Manager | Assign Experts | Departments and occupations |
| [FR-04.03](Role%20catalog/README.md#fr-04-03) | L&D Manager | Manage target roles | Role catalog |
| [FR-04.04](Role%20catalog/README.md#fr-04-04) | L&D Manager | Manage target role publication | Role catalog |
| [FR-04.05](Assessment%20workflows/README.md#fr-04-05) | L&D Manager | Manage baseline assessment configuration | Assessment workflows |
| [FR-04.06](Learning%20catalog/README.md#fr-04-06) | L&D Manager | Approve learning offerings | Learning catalog |
| [FR-04.07](Development%20reporting/README.md#fr-04-07) | L&D Manager | Monitor employee development | Development reporting |
| [FR-05.01](Learning%20catalog/README.md#fr-05-01) | Expert | Manage micro-skills | Learning catalog |
| [FR-05.02](Role%20catalog/README.md#fr-05-02) | Expert | Manage role competency requirements | Role catalog |
| [FR-05.03](Role%20catalog/README.md#fr-05-03) | Expert | Submit completed target role configurations | Role catalog |
| [FR-05.04](Learning%20catalog/README.md#fr-05-04) | Expert | Manage skill prerequisites | Learning catalog |
| [FR-05.05](Learning%20catalog/README.md#fr-05-05) | Expert | Manage learning modules | Learning catalog |
| [FR-05.06](Assessment%20workflows/README.md#fr-05-06) | Expert | Manage module assessments | Assessment workflows |
| [FR-05.07](Pathway%20review/README.md#fr-05-07) | Expert | Review initial learning pathways | Pathway review |
| [FR-05.08](Learning%20catalog/README.md#fr-05-08) | Expert | Submit content for approval | Learning catalog |
| [FR-06.01](Employee%20experience/README.md#fr-06-01) | Employee | Manage personal profile | Employee experience |
| [FR-06.02](Assessment%20workflows/README.md#fr-06-02) | Employee | Complete baseline assessment | Assessment workflows |
| [FR-06.03](Assessment%20workflows/README.md#fr-06-03) | Employee | Complete RIASEC assessment | Assessment workflows |
| [FR-06.04](Role%20guidance/README.md#fr-06-04) | Employee | Review target role guidance | Role guidance |
| [FR-06.05](Employee%20experience/README.md#fr-06-05) | Employee | Review competency profile and gaps | Employee experience |
| [FR-06.06](Employee%20experience/README.md#fr-06-06) | Employee | Follow a learning pathway | Employee experience |
| [FR-06.07](Employee%20experience/README.md#fr-06-07) | Employee | Learn an individual skill | Employee experience |
| [FR-06.08](Assessment%20workflows/README.md#fr-06-08) | Employee | Complete learning and assessments | Assessment workflows |
| [FR-06.09](Employee%20experience/README.md#fr-06-09) | Employee | Track learning progress | Employee experience |
| [FR-07.01](Workspace%20administration/README.md#fr-07-01) | System | Authenticate users and authorize access | Workspace administration |
| [FR-07.02](Subscription%20lifecycle/README.md#fr-07-02) | System | Process subscription payments | Subscription lifecycle |
| [FR-07.03](Organization%20onboarding/README.md#fr-07-03) | System | Provision organization workspaces | Organization onboarding |
| [FR-07.04](Subscription%20lifecycle/README.md#fr-07-04) | System | Maintain subscription entitlements | Subscription lifecycle |
| [FR-07.05](Assessment%20workflows/README.md#fr-07-05) | System | Generate and evaluate assessments | Assessment workflows |
| [FR-07.06](Adaptive%20engine/README.md#fr-07-06) | System | Update competency profiles and gaps | Adaptive engine |
| [FR-07.07](Role%20guidance/README.md#fr-07-07) | System | Generate target role guidance | Role guidance |
| [FR-07.08](Adaptive%20engine/README.md#fr-07-08) | System | Generate and adapt learning pathways | Adaptive engine |
| [FR-07.09](Development%20reporting/README.md#fr-07-09) | System | Generate development summaries and ROI | Development reporting |
| [FR-07.10](Notifications%20and%20audit/README.md#fr-07-10) | System | Send email notifications | Notifications and audit |
| [FR-07.11](Notifications%20and%20audit/README.md#fr-07-11) | System | Record system activity | Notifications and audit |

## Reconciliation Result

The previous index already referenced all 48 source bullets, but the documents mixed them with 59 legacy groups, 146 decomposed functions, non-functional safeguards, assumed policies, implementation briefs and delivery history. They did not use the requested nine-field structure. This revision redistributes those same 48 source bullets into 48 authoritative records; it does not claim that previously missing product capabilities were discovered or implemented. All 205 existing group/function anchors are retained as references, not additional requirements.

## Removed Scope

The following historical identifiers remain reserved, not available for reuse. Listing them here records exclusion, not active product scope.

| Legacy IDs / material | Disposition |
| --- | --- |
| REQ-003, REQ-021, REQ-044 | Separate soft-skill assessment, comments and review are not specified in section 3.2(c). |
| REQ-049 | Expert approval of AI role guidance is not specified; initial pathway review remains FR-05.07. |
| REQ-027 | Report export is not specified. |
| REQ-029 | Subscription cancellation/refunds are not specified. |
| REQ-033 through REQ-036 | Benchmark-management product screens are not functional requirements; research deliverables remain in Version 2. |
| REQ-038 | A mandatory temporary-password first-login flow is not specified. |
| REQ-012-F04, REQ-022-F04 | Skill/account hard deletion is not specified; micro-skill deactivation and membership activation/deactivation remain. |
| REQ-013-F04, REQ-014-F04, REQ-023-F04 | Whole-module, question and target-role deletion are not specified. |
| REQ-023-F05 | Duplicate Expert workspace description is not a separate source requirement. |
| REQ-005; graph-view subfunctions | Recommendation explanations and graph presentation are not separate section 3.2(c) functions; related source records remain linked from their old anchors. |
| REQ-040, REQ-046; recovery subfunctions | Security and integrity/recovery safeguards are outside this functional catalog, not removed from Version 2 or the application. |
| Historical briefs, interviews, UI prescriptions, API/schema details, commercial defaults and delivery claims | Removed from the current requirements records; not promoted into source requirements or fabricated acceptance criteria. Dated testing evidence is unchanged. |
