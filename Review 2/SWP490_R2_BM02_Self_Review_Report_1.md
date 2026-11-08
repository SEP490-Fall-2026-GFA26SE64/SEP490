SWP490 · CAPSTONE PROJECT · REVIEW 2 · BM02


**Scope update — 2026-11-06:** The approved ACT-04 package now contains Module and learning content only, with one MicroSkill per Module. F13's former requirement to include a module-assessment snapshot in that approval package is superseded. Its separate concern about authoritative assessment scoring/evidence remains outside ACT-04. Historical findings below retain their original wording.

# SRS/SDD Self-Review Report – Review 2

## Current source disposition — 2026-11-07

The findings/estimates below are retained historical review records, not rewritten results. At HEAD `61d334c`, authoritative rule Skill papers/results, exact completion/evidence and requirement recalculation now exist in the local gated composition. Thus F13/F14's older missing-source observations no longer describe all current source; their end-to-end acceptance remains unverified. F18's stale architecture prose is corrected in Report4; LLM/ROI remain incomplete. Current limits include per-Skill policy assignment, eligible-option exclusion conflict, module-specific retake contexts, unverified certificate/bypass/parallel/backfill and unavailable applied DB metadata. No runtime/test result or finding closure is fabricated. [Current source contract](../documents/technical/Organization%20Rule%20Assessment%20and%20Pathway.md).


## 1. Run Information

| Project code | FA26SE267 (registration identifier) |
| --- | --- |
| Project name | Knowledge Graph-Based Adaptive Learning and Competency Intelligence Platform (Adapt-Learn-Graph) |
| Team | Đặng Minh Hoàng (leader), Nguyễn Trần Việt An, Nguyễn Anh Khôi, Trần An Quốc |
| Supervisor | Hoàng Thu Hà |
| AI tool and model | AI assistant using Copilot SDK in VS Code; model identifier not available |
| Run date | 02 November 2026 (UTC+07:00) |
| Repository tag / commit | Working-tree review; original run commit not recorded; `review-2` tag not found locally on 02 November 2026 |
| Registration form version used | [Capstone Register Version 2](../documents/FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), FA26SE267 |
| Version | 1.0 — draft; original AI findings retained; team dispositions pending confirmation |
| Date | 02 November 2026 |

## 2. Standard Prompt

```text
You are reviewing the SRS and SDD of a software capstone project against its
registration form and source code. Report only; do not change any file.

Inputs: the registration form, SRS, SDD (with diagrams), source code and
database script in this repository.

Check:
1. Scope: FRs in the SRS not covered by the registration form, and
   registration items with no FR.
2. Requirements: FRs without an actor or testable acceptance criteria;
   NFRs without metric, threshold and measurement method.
3. Data: entities missing from the Logical ERD; ERD entities or attributes
   missing from the database script, and tables not in the ERD.
4. States: for each main entity, states used in code but missing from its
   state machine; transitions with no triggering FR; states with no exit.
5. Flows: main business flows in activity diagrams with no implementation
   or no test.
6. Architecture: components or third-party services in code but not in the
   architecture diagram, and the reverse.
7. Design vs code: modules, APIs or business rules implemented differently
   from the SDD.

Output one table: ID | Category | Location | Finding | Severity
(High/Medium/Low) | Evidence. Then list the 5 most important findings.
If something cannot be verified from the repository, say so; do not guess.
```

## 3. Findings and Team Response

| ID | Category | Location | Finding | Severity | Evidence | Team response |
| --- | --- | --- | --- | --- | --- | --- |
| F01 | Scope / traceability | ACT-01; FR-01.01/07.03 | Starter-catalog selection and post-payment copying are implemented and diagrammed but not explicitly specified by these FRs or the registration form. This is an **untraced extension**, not a proven unauthorized scope change. | Medium | [ACT-01](../documents/diagrams/mermaid/act-01.mmd) adds selection/copy/retry steps absent from the [FR details](Report3_Software%20Requirement%20Specification.md#L841); [V47](../backend/src/main/resources/db/migration/V47__workspace_catalog_import.sql#L1) persists them. | Pending confirmation; responsibility role: S1; due date: not confirmed. |
| F02 | Requirements | FR-06.03; FR-07.08 | Acceptance rules remain incomplete: RIASEC refers to a “defined scoring method” without identifying the instrument/scoring contract; adaptation must preserve “compatible Expert decisions” without defining compatibility. These outcomes lack an unambiguous acceptance oracle. | Medium | [RIASEC requirements](Report3_Software%20Requirement%20Specification.md#L1794), [adaptation requirements](Report3_Software%20Requirement%20Specification.md#L2164), and [open decisions](Report3_Software%20Requirement%20Specification.md#L2483). | Pending confirmation; responsibility role: S2; due date: not confirmed. |
| F03 | NFRs | NFR-R03/R04; NFR-S02 | Not every NFR supplies a metric, threshold and measurement method. Historical retention lacks a verification procedure; recovery objectives are explicitly unspecified; “protect credentials and payment information” lacks concrete acceptance criteria and a measurement procedure. The performance NFRs are substantially more measurable. | Medium | [Reliability NFRs](Report3_Software%20Requirement%20Specification.md#L2356) and [security NFRs](Report3_Software%20Requirement%20Specification.md#L2376). | Pending confirmation; responsibility role: S1; due date: not confirmed. |
| F04 | Data / migration lineage | SDD §2.1–2.1.1 | The database baseline is stale: the SDD specifies **V1–V32/113 tables**, while the current migration directory contains **V1–V47 and 150 CREATE TABLE definitions**. Several ledger filenames/version assignments no longer match—for example, documented V8 registration versus current V8 question metadata. The report cannot serve as the current migration inventory. | High | [SDD baseline and ledger](Report4_Software%20Design%20Document.md#L300); current [migration directory](../backend/src/main/resources/db/migration). Applied versions were **not independently verified**. | Pending confirmation; responsibility role: S1; due date: not confirmed. |
| F05 | Data / Logical ERD | LERD-01–04 | Current learning-content, module-authoring, assessment-policy and registration-catalog entities are missing from the detailed Logical ERDs. Their persisted relationships therefore cannot be traced through the logical design. | Medium | [LERD-01](../documents/diagrams/mermaid/lerd-01.mmd), [LERD-02](../documents/diagrams/mermaid/lerd-02.mmd), [LERD-04](../documents/diagrams/mermaid/lerd-04.mmd) omit entities introduced by [V36](../backend/src/main/resources/db/migration/V36__module_authoring.sql), [V38](../backend/src/main/resources/db/migration/V38__learning_content.sql), [V44](../backend/src/main/resources/db/migration/V44__organization_assessment_policy.sql), and [V47](../backend/src/main/resources/db/migration/V47__workspace_catalog_import.sql). | Pending confirmation; responsibility role: S4; due date: not confirmed. |
| F06 | Data / attributes | Logical ERDs; SDD dictionary | **Logical-ERD attribute coverage cannot be verified:** the logical diagrams contain entity names and relationships, not attribute lists. Separately, current assessment-policy pin fields are absent from the SDD dictionary. | Medium | [LERD-02](../documents/diagrams/mermaid/lerd-02.mmd); [SDD dictionary](Report4_Software%20Design%20Document.md#L634); [V44](../backend/src/main/resources/db/migration/V44__organization_assessment_policy.sql#L87) adds `assessment_policy_mode`, version, hash and snapshot. | Pending confirmation; responsibility role: S4; due date: not confirmed. |
| F07 | States | ST-19; initial pathways | ST-19 describes the legacy recommendation/pathway lifecycle, not the implemented initial-pathway aggregate. It omits `GENERATING`, `NO_LEARNING_REQUIRED`, `UNRESOLVED`, `FAILED_RETRYABLE`, `AWAITING_EXPERT_REVIEW` and the separate validation/review dimensions. Retryable failures consequently have no corresponding modeled recovery path. | Medium | [ST-19](../documents/diagrams/mermaid/st-19.mmd) versus [InitialPathwayState.java](../backend/src/main/java/com/adaptlearngraph/entities/domain/InitialPathwayState.java#L4). | Pending confirmation; responsibility role: S2; due date: not confirmed. |
| F08 | States | ST-11; module offerings | The offering state machine omits implemented publication/archive states: `RETURNED`, `PUBLISH_PENDING`, `RELEASED`, `ARCHIVE_REQUESTED`, `ARCHIVE_PENDING`, and `ARCHIVED`. Approval is modeled too simply to explain recoverable cross-store publication failures. | Medium | [ST-11](../documents/diagrams/mermaid/st-11.mmd) versus [ModuleAuthoringService.java](../backend/src/main/java/com/adaptlearngraph/services/ModuleAuthoringService.java#L267). | Pending confirmation; responsibility role: S4; due date: not confirmed. |
| F09 | States | ST-10/ST-12; roles and skills | Target diagrams do not provide the implemented legacy-state mapping: roles include `SENT`, `REJECTED`, `ACTIVE`, `RETIRED`; skills use `RETIRED`, while ST-12 uses `ARCHIVED`. The SDD acknowledges the distinction but supplies no complete current lifecycle alongside the target lifecycle. | Medium | [RoleStatus.java](../backend/src/main/java/com/adaptlearngraph/entities/domain/RoleStatus.java#L3), [SkillStatus.java](../backend/src/main/java/com/adaptlearngraph/entities/domain/SkillStatus.java#L3), and [SDD lifecycle notes](Report4_Software%20Design%20Document.md#L5860). | Pending confirmation; responsibility role: S4; due date: not confirmed. |
| F10 | States / exits | ST-17 | “New Current selection” has an incoming transition but **no exit**. Unlike an intentionally terminal historical state, a successor current selection must permit subsequent replacement/no-op behavior. The diagram also splits predecessor-ending and successor-creation into alternative arrows despite describing an atomic operation. | Medium | [ST-17](../documents/diagrams/mermaid/st-17.mmd#L11); [SDD selection rules](Report4_Software%20Design%20Document.md#L6013). | Pending confirmation; responsibility role: S2; due date: not confirmed. |
| F11 | States / triggering FR | Module retirement; ST-15 | Module archive/restore and IRT calibration/promotion have technical triggers but no explicit FR-level command/actor/acceptance mapping. Their authorization and transition rules cannot be traced unambiguously to the SRS. This does not establish that the internal operations are out of scope. | Medium | [Archive/restore implementation](../backend/src/main/java/com/adaptlearngraph/services/ModuleAuthoringService.java#L280), `ST-15` (historical reference; source missing in this checkout), and [SRS learning-catalog requirements](Report3_Software%20Requirement%20Specification.md#L1540). | Pending confirmation; responsibility role: S4; due date: not confirmed. |
| F12 | Flows / implementation / tests | ACT-06; RIASEC and AI guidance | The RIASEC→AI-guidance portion is not the documented backend workflow. The reachable assessment page scores and stores RIASEC locally; role recommendations use fixed scores/reasons rather than local-model inference. The inspected RIASEC browser test checks page/chart presence, not persisted scoring or guidance. | High | [ACT-06](../documents/diagrams/mermaid/act-06.mmd); [local RIASEC submission](../frontend/src/features/employee/assessment/AssessmentPage.tsx#L999); [fixed recommendations](../frontend/src/features/employee/target-roles/TargetRoleBrowsePanel.tsx#L37); [browser test](../frontend/system-tests/REQ-003-F01-riasec-calibration.spec.ts#L3). | Pending confirmation; responsibility role: S2; due date: not confirmed. |
| F13 | Flows / design vs code | ACT-04; FR-04.06/05.06/05.08 | Real module/content approval exists, but its package does **not include the module-assessment snapshot** required by the SRS/SDD offering bundle. Module quiz submission remains browser-scored/local-storage behavior, not authoritative assessment evidence. The inspected reader/exam test only verifies navigation. | High | [Offering sequence](../documents/diagrams/mermaid/seq-06.mmd#L13); [ModuleAuthoring.Package](../backend/src/main/java/com/adaptlearngraph/entities/domain/ModuleAuthoring.java#L54); [quiz submission](../frontend/src/features/employee/assessment/AssessmentPage.tsx#L1388); [reader test](../frontend/system-tests/REQ-004-F01-module-reader-exam-redirect.spec.ts#L3). | Pending confirmation; responsibility role: S4; due date: not confirmed. |
| F14 | Flows / implementation / tests | ACT-06; FR-07.06/07.08 | The central **module result→mastery update→remaining-pathway recalculation** loop remains incomplete. Initial generation/review/read has real evidence, but that is not proof of continuous adaptive learning. No complete-loop acceptance was established by the inspected evidence. | High | [Adaptive-engine boundary](../documents/features/Adaptive%20engine/README.md#L13) explicitly leaves later mastery processing/recalculation incomplete; [executed pathway evidence](../documents/testing/system/REQ-002-041-042-workspace-integration.md#L5) excludes learning execution. | Pending confirmation; responsibility role: S2; due date: not confirmed. |
| F15 | Flows / implementation | ACT-07; FR-06.07 | Independent skill browsing/tracking is not a complete independent-learning flow. The UI mixes API skill reads with browser learning state and predefined roadmap assumptions; the implemented module-access path requires assignment through a confirmed pathway. An independent evidence/access context is not established. | High | [ACT-07](../documents/diagrams/mermaid/act-07.mmd); [UpskillSkillsPanel.tsx](../frontend/src/features/employee/target-roles/UpskillSkillsPanel.tsx#L107); [module access checks](../backend/src/main/java/com/adaptlearngraph/services/ModuleAuthoringService.java#L337). | Pending confirmation; responsibility role: S3; due date: not confirmed. |
| F16 | Data / flows | ACT-08; FR-04.07/07.09 | Actual cost/benefit recording and ROI reporting are not implemented end-to-end. Conceptual Training Cost/Monetary Benefit entities have no corresponding actual-finance ledger; reachable dashboards generate sample/derived learning metrics. `roi_scenario` is explicitly not an actual ledger. | High | [Conceptual finance entities](../documents/diagrams/mermaid/cerd-04.mmd#L20); [SDD finance boundary](Report4_Software%20Design%20Document.md#L6041); [Dashboard.tsx](../frontend/src/features/manager/learning-outcomes/Dashboard.tsx#L86) supplies fixed scores/completion rates. | Pending confirmation; responsibility role: S4; due date: not confirmed. |
| F17 | Architecture | Architecture image; third-party declaration | YouTube and Vimeo are runtime dependencies absent from the architecture diagram and third-party-service declaration. Both server metadata requests and browser player/script requests cross these external boundaries. | Medium | [Architecture image](../documents/diagrams/system-architecture-report4.png); [provider declaration](Report4_Software%20Design%20Document.md#L140); [ExternalLearningVideo.java](../backend/src/main/java/com/adaptlearngraph/helper/ExternalLearningVideo.java#L47); [LessonVideo.tsx](../frontend/src/shared/components/learning/LessonVideo.tsx#L135). | Pending confirmation; responsibility role: S1; due date: not confirmed. |
| F18 | Architecture / design vs code | SDD §1.1/3.3/3.5 | Implementation-status declarations are stale: MinIO is described as planned, and offering/initial-pathway services as planned responsibilities, although local-profile implementations now exist. Conversely, local LLM and actual ROI remain target-only. Target components must not be interpreted as deployed capabilities. | Medium | [SDD provider status](Report4_Software%20Design%20Document.md#L147); [local composition](../backend/src/main/java/com/adaptlearngraph/config/ModuleAuthoringConfiguration.java#L22); [MinIO adapter](../backend/src/main/java/com/adaptlearngraph/repository/PrivateLearningAssets.java#L24); [initial-pathway APIs](../backend/src/main/java/com/adaptlearngraph/apis/InitialPathwayController.java#L18). | Pending confirmation; responsibility role: S1; due date: not confirmed. |
| F19 | Design vs code / modules | SDD §1.2.1; package diagrams | The SDD describes feature-based hexagonal namespaces as the actual structure. Current code uses layer packages such as `apis`, `services`, `repository`, `entities`, and `config`; the architecture tests enforce those layers. The package design is no longer an accurate code map. | Medium | [SDD package description](Report4_Software%20Design%20Document.md#L242) versus [LayeredArchitectureTest.java](../backend/src/test/java/com/adaptlearngraph/architecture/LayeredArchitectureTest.java#L13); [recorded refactor](../documents/testing/unit/layered-architecture-refactor-20261101.md#L5). | Pending confirmation; responsibility role: S1; due date: not confirmed. |
| F20 | Design vs code / APIs and rules | SDD §3.3.1; target-role API | The SDD says the legacy target-role controller is behind an explicit property gate, but the inspected controller and its service composition have no such gate. Creation permits Expert callers and accepts a requested lifecycle status, rather than representing the documented L&D-create/Expert-submit/L&D-publish handoff. Runtime exploitability was not assessed. | High | [SDD assertion](Report4_Software%20Design%20Document.md#L5838); [controller creation path](../backend/src/main/java/com/adaptlearngraph/apis/OrganizationTargetRoleController.java#L42); [service composition](../backend/src/main/java/com/adaptlearngraph/config/CatalogConfiguration.java#L29). | Pending confirmation; responsibility role: S4; due date: not confirmed. |
| F21 | Verification limits | NFR-P01–P04; payment/email; deployed schema | **Cannot verify acceptance** of latency/load/recommendation targets, live payOS/Gmail delivery, or the currently applied database schema from the inspected repository evidence. Existing local test results do not establish these outcomes; they must not be reported as passed. | Medium | [Performance targets](Report3_Software%20Requirement%20Specification.md#L2365); [test evidence exclusions](../documents/testing/README.md#L71); [SDD baseline claim](Report4_Software%20Design%20Document.md#L300) is historical, not a new verification. | Pending confirmation; responsibility role: S4; due date: not confirmed. |

## 4. Top 5 Findings (as reported by the AI)

| # | Finding ID | Summary |
| --- | --- | --- |
| 1 | F14 | **Incomplete adaptive-learning loop:** initial pathways are not continuous assessment-driven adaptation. |
| 2 | F13 | **Missing authoritative module-assessment integration:** approval and learning do not produce the required backend evidence chain. |
| 3 | F12 | **RIASEC/AI guidance remains local/static:** the documented intelligence workflow is not implemented. |
| 4 | F16 | **Actual ROI reporting lacks its financial ledger:** displayed development metrics are not evidence-based ROI. |
| 5 | F04 | **Stale migration baseline:** the SDD cannot reliably describe or reproduce the current database schema. |

## 5. Summary

| Severity | Total | Fixed | Kept | Planned |
| --- | --- | --- | --- | --- |
| High | 7; all team dispositions pending confirmation | 0 | 0 | 0 |
| Medium | 14; all team dispositions pending confirmation | 0 | 0 | 0 |
| Low | 0 | 0 | 0 | 0 |
