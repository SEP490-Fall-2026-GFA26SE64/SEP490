# Learning Catalog and Approval

**Source alignment — 2026-11-07.** Confirmed behavior is distinguished from checked-in implementation below. [Current source/schema/API contract](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md) records local profile gates, exact ownership and remaining mismatches. Runtime/database acceptance is not established by this prose update.

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 5.

**Contract basis:** confirmed behavior plus the later L&D Role–Level / Expert Skill–knowledge configuration decisions. Historical evidence retains its original scope; it is not a fresh passing result.

## Current Implementation

**Source-inspected:** HEAD `61d334c`, 2026-11-07. Older module/content results remain separately dated; no new behavior checks were run. See the [implementation legend](../README.md#current-implementation-overview).

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-04.06](#fr-04-06) | API-backed module/content slice | L&D reads submitted immutable Module revisions, inspects numbered lessons/history, returns with feedback or approves publication to Neo4j; pending projection can be retried. | Module assessment construction/review and full production learning acceptance remain separate. |
| [FR-05.01](#fr-05-01) | Partial | Micro-skill APIs and Neo4j persistence support search, create, update/status and guarded deletion. The ontology page loads skills and macro competencies and calls skill mutations. | The authoring model covers code/name/description/macro category/status, not complete assigned-job position proficiency-level management. Legacy actor headers/browser company context remain. |
| [FR-05.04](#fr-05-04) | Partial | Active rule readers require exact dependent/prerequisite knowledge pairs. Retained legacy prerequisite authoring still exposes numeric fields and separate authorization risks; it is not a numeric fallback for the rule flow. The ontology UI uses those APIs. | Trusted assignment-scoped authorization and complete update UX remain unestablished. Local import/browser data is not equivalent to a persisted prerequisite operation. |
| [FR-05.05](#fr-05-05) | API-backed module/content slice | The responsible Expert authors skill-mapped Modules and ordered Text/Video lessons through authenticated APIs; PostgreSQL owns versions/history and MinIO owns private assets. Excel/ZIP preview and atomic confirmation preserve ownership. | Vimeo live-provider acceptance and production delivery remain limited as recorded in dedicated evidence. |
| [FR-05.08](#fr-05-08) | API-backed module/content slice | Owner-only submit/withdraw and L&D return/approval operate on exact persisted Module/content revisions; peers can inspect history. | This does not construct or submit a complete module assessment bundle. Question Bank has its own review workflow. |

**Entry points:** `/expert/ontology`, `/expert/modules`, `/expert/assessment-bank`, `/ld-manager/modules`, `/ld-manager/approvals`.

**Code references:** [ontology page](../../../frontend/src/features/manager/ontology/CompetencyOntologyPage.tsx), [micro-skill API](../../../backend/src/main/java/com/adaptlearngraph/apis/MicroSkillController.java), [prerequisite service](../../../backend/src/main/java/com/adaptlearngraph/services/PrerequisiteService.java), [shared module workspace](../../../frontend/src/features/expert/modules/ModuleManagementWorkspace.tsx), [approval entry](../../../frontend/src/features/manager/approvals/ContentApprovalQueuePage.tsx). Module assessment authoring is separately described in [Assessment workflows](../Assessment%20workflows/README.md#current-implementation).

## Requirements

The Module management UI uses the Job Positions visual language: a compact, filterable directory separates lifecycle, review and intake/authoring workflow; details group business information and actual lessons/history with technical metadata collapsed. Catalog records without lesson data state that limitation explicitly. Create/Edit keeps the existing ordered Text/Video editor and fixed actions; Import uses Upload → Review → Confirm with server-reported errors and batch reference diagnostics. Excel/ZIP uses moduleRef only to link module and lesson rows; the system generates module IDs. Each batch creates new drafts, with blank/duplicate/unmatched references blocking confirmation; existing modules are edited separately. Old templates/previews require reupload. Its XLSX/ZIP upload supports drag/drop and keyboard file browsing through the same shared dropzone as Assessment Bank, with uploads blocked while busy. Missing optional metadata uses —. Existing owner/peer and L&D approval boundaries remain unchanged. [Local UI verification](../../testing/system/REQ-013-module-ui-m1-20261111.md).

Expert and L&D module details provide a read-only View as learner tab for the selected content snapshot, including legacy Markdown, desktop/mobile sizing and full preview. Catalog views resolve the matching content URI/version rather than the latest draft; unavailable lesson data is stated explicitly. Create/Edit uses a compact, grouped rich-text icon toolbar with active formatting states, named tooltips and additional mobile tools, alongside the shared learner-preview tab. Staff preview does not record learner progress. At the import Review step, each parsed Module offers View as learner using its server-preview Text/Video lessons before confirmation. Closing the viewer returns to the same batch without creating Modules or learner progress. After confirming an import, Expert can navigate only the newly saved draft modules and their lessons in the shared learner preview, including uploaded video, desktop/mobile sizing and full preview. The viewer uses the commit response snapshots and returns to the module directory without submitting or publishing them. Existing revision history and approval actions remain available. Module catalog, working-revision detail and Approvals reuse the same information, learner-preview and version-history tabs. Approval-specific request metadata and recorded comparison remain inside that shared presentation. The L&D Module directory omits the responsible Expert name under Workflow; responsibility remains visible in details.

L&D Content Approvals presents pending publication/archive requests and projection retries in a dedicated queue. Review opens the exact current revision in a centered, wide dialog with fixed decision actions, recorded request identity/time, editor/feedback, lesson content, history and available released snapshots. Existing server search/Skill/module-type filters, revision locks, required return feedback and state-specific authorization remain authoritative; missing request history or snapshots is explicit. [Content Approvals UI verification](../../testing/system/REQ-053-content-approvals-a1-20261111.md).

L&D Learning Content groups Modules and Approvals under one sidebar entry and stable parent header. Modules defaults to the Active/Approved catalog using server filtering before pagination; All statuses is explicit. Matching retained release content is used for published detail, while newer working revisions are labelled separately and never substituted for a missing published snapshot. Approvals retains pending/retry decisions, with compact result counts and distinct loading/empty/filter states. [Unified workspace verification](../../testing/system/REQ-053-learning-content-l1-20261111.md).

### Module outcomes and prerequisite requirements

Each module teaches exactly one skill at one knowledge level (FOUNDATION / INTERMEDIATE / ADVANCED), with explicit outcomes and normal content/version/publication/access metadata. Multiple modules are interchangeable only when Expert validates equivalent minimum outcomes. Same skill identity alone is insufficient. Preserve responsible-Expert ownership, immutable content review, ordered lessons, private assets and independent progress.

Expert defines prerequisites by exact skill/knowledge/outcomes and dependency meaning. These drive real learning gates and assessment groups; display order is not a prerequisite. Reject self-dependencies, duplicates, cycles and stale/foreign references; missing mappings remain unresolved. Numeric minimum mastery, teachingFocus and module difficulty do not determine readiness or alternatives in this flow. MAIN/PREREQUISITE is a role within an assessment, not a fixed module/question type.

### Provision modes and certificate definitions

| Organization + skill + knowledge level | Allowed provision | Missing provision |
| --- | --- | --- |
| MODULE_ONLY | All approved, active, accessible modules meeting equivalent outcomes form alternatives. One completed module plus successful assessment and required completion conditions satisfies the requirement. | No eligible module gives NEEDS_EXPERT_ACTION. |
| CERTIFICATE_ONLY | One assigned accepted certificate definition. Employee submits evidence; authorized Expert approval establishes exact official achievement. | No definition gives NEEDS_EXPERT_ACTION. |

Modes are mutually exclusive. Provisioned CERTIFICATE_ONLY has exactly one assigned certificate definition, not a list of alternatives or a module fallback. Absence remains unmet until provisioned or explicitly bypassed for the learner. Explicit mode changes preserve evidence, progress and history; treatment of active work/validity remains open for define C2.

### Expert Add certificate

The applicable existing Expert catalog surface must support an **Add certificate** tab listing skills with knowledge levels. **Add** on the intended skill–level opens entry of the required certificate, including a mandatory reference URL. The definition identifies the accepted certificate and exact skill/knowledge/outcome scope; organization, author and version are trusted server values. Reject missing URL, invalid/foreign references and conflicting MODULE_ONLY/existing certificate provision.

The catalog definition/reference URL differs from Employee evidence. Saving it awards no achievement and approves no learner submission. Current source places certificate catalog/review tabs in the Expert module workspace. CertificateCatalogRepository uses REQUIRES_CERTIFICATE, locks/rechecks the owned Skill and exact version, validates HTTPS and retains definition history. Learner approval is separately assigned and persisted in PostgreSQL; full runtime acceptance remains unverified. Reuse current list/actions/dialogs/forms and navigation patterns.

### Authoring, publication and later provision

1. Reauthorize organization/Expert ownership or assignment; read current skill/knowledge/outcome/provision revision.
2. Author module/content for MODULE_ONLY or the assigned certificate definition for CERTIFICATE_ONLY; validate scope/mode. Retain module submit/L&D publication safeguards.
3. Keep immutable versions and actual author/reviewer history. Output eligible provision and missing/blocked reasons; clients cannot supply approval or learner achievement.
4. Later provision triggers scoped [recalculation/backfill](../Adaptive%20engine/README.md#recalculation-bypass-and-later-provision), preserving started/completed work. Never automatically approve evidence or convert bypass to ACHIEVED.

[Employee evidence](../Employee%20experience/README.md#certificate-evidence-and-review) supports link OR PDF OR picture with private authorized access. [Expert decisions](../Pathway%20review/README.md#certificate-and-missing-provision-decisions) handle approval/rejection and scoped bypass.

Keep current Module workspace, shared components, tokens, fonts, sizes, spacing, density and responsive EN/VI. Detailed UI/data binding needs user review in define C2. Current mapping uses Skill version + exact knowledge + outcome coverage, exclusive provision and immutable definition/submission snapshots. One HTTPS link or PDF/PNG/JPEG up to 10 MiB (subject to tighter platform limits) is supported in source. General expiry/revocation is excluded; arbitrary active mode transitions and full runtime acceptance are not established.

<a id="fr-04-06"></a>

### FR-04.06: Approve learning offerings

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-04.06 |
| 2. Requirement Name | Approve learning offerings |
| 3. Description | The L&D Manager shall review submitted learning modules, learning content, and module assessments; approve them; or return them to Experts for revision. |
| 4. Actor | L&D Manager |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-05-01"></a>

### FR-05.01: Manage micro-skills

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.01 |
| 2. Requirement Name | Manage micro-skills |
| 3. Description | The Expert shall create, view, update, and deactivate micro-skills within assigned job positions, including descriptions and proficiency levels. |
| 4. Actor | Expert |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-05-04"></a>

### FR-05.04: Manage skill prerequisites

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.04 |
| 2. Requirement Name | Manage skill prerequisites |
| 3. Description | The Expert shall manage skill–knowledge prerequisite requirements, outcomes and dependency semantics for learning and assessment groups. |
| 4. Actor | Expert |
| 5. Preconditions | Trusted authorized Expert; same-organization exact requirement references and current revision. |
| 6. Main Flow | Define dependent/prerequisite skill/knowledge/outcomes; validate acyclic references; save traceable version. |
| 7. Alternative / Exception Flows | Reject self/cyclic/duplicate/stale references; missing mapping/provision remains unresolved, not a numeric default/pass. |
| 8. Postconditions | Dependencies are available to consumers without rewriting official evidence/attempts. |
| 9. Acceptance Criteria | Only actual dependencies gate learning; numeric mastery and screen order do not define prerequisites. |

<a id="fr-05-05"></a>

### FR-05.05: Manage learning modules

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.05 |
| 2. Requirement Name | Manage learning modules |
| 3. Description | The Expert shall author/import modules and content for exactly one skill at one knowledge level/outcome scope, and manage exclusive module/certificate provision as defined above. |
| 4. Actor | Expert |
| 5. Preconditions | Trusted responsible Expert; valid skill/knowledge/outcome mapping, provision mode and revision. |
| 6. Main Flow | Choose scope; author/import content or Add certificate with mandatory reference URL; follow applicable review/publication. |
| 7. Alternative / Exception Flows | Incomplete drafts do not supply requirements; wrong scope/mode conflict or missing provision remains explicit. |
| 8. Postconditions | Versioned provision preserves prior evidence/progress; authoring awards no achievement. |
| 9. Acceptance Criteria | Equivalent module alternatives OR one assigned certificate definition per skill/knowledge level, never both modes. |

<a id="fr-05-08"></a>

### FR-05.08: Submit content for approval

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.08 |
| 2. Requirement Name | Submit content for approval |
| 3. Description | The Expert shall submit new or revised learning modules, including their learning content and module assessments, to the L&D Manager for approval. |
| 4. Actor | Expert |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

## Legacy ID Traceability

These anchors preserve existing references, not additional functional requirements. They identify related source-level records only; former subfunctions, UI choices, policies and implementation claims are not reconfirmed by this mapping. Historical test results retain their original scope. Legacy IDs remain reserved and must not be reassigned.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-012"></a>REQ-012 | [FR-05.01](#fr-05-01) |
| <a id="req-012-f01"></a>REQ-012-F01 | [FR-05.01](#fr-05-01) |
| <a id="req-012-f02"></a>REQ-012-F02 | [FR-05.01](#fr-05-01) |
| <a id="req-012-f03"></a>REQ-012-F03 | [FR-05.01](#fr-05-01) |
| <a id="req-012-f05"></a>REQ-012-F05 | [FR-05.01](#fr-05-01) |
| <a id="req-018"></a>REQ-018 | [FR-05.04](#fr-05-04) |
| <a id="req-018-f01"></a>REQ-018-F01 | Related to [FR-05.04](#fr-05-04); graph presentation is not a separate function in section 3.2(c). |
| <a id="req-018-f02"></a>REQ-018-F02 | [FR-05.04](#fr-05-04) |
| <a id="req-013"></a>REQ-013 | [FR-05.05](#fr-05-05) |
| <a id="req-013-f01"></a>REQ-013-F01 | [FR-05.05](#fr-05-05) |
| <a id="req-013-f02"></a>REQ-013-F02 | [FR-05.05](#fr-05-05) |
| <a id="req-013-f03"></a>REQ-013-F03 | [FR-05.05](#fr-05-05) |
| <a id="req-013-f05"></a>REQ-013-F05 | [FR-05.05](#fr-05-05) |
| <a id="req-016"></a>REQ-016 | [FR-05.05](#fr-05-05) |
| <a id="req-016-f01"></a>REQ-016-F01 | [FR-05.05](#fr-05-05) |
| <a id="req-016-f02"></a>REQ-016-F02 | [FR-05.05](#fr-05-05) |
| <a id="req-054"></a>REQ-054 | [FR-05.05](#fr-05-05) |
| <a id="req-054-f01"></a>REQ-054-F01 | [FR-05.05](#fr-05-05) |
| <a id="req-054-f02"></a>REQ-054-F02 | [FR-05.05](#fr-05-05) |
| <a id="req-054-f03"></a>REQ-054-F03 | [FR-05.05](#fr-05-05) |
| <a id="req-054-f04"></a>REQ-054-F04 | [FR-05.05](#fr-05-05) |
| <a id="req-054-f05"></a>REQ-054-F05 | [FR-05.05](#fr-05-05) |
| <a id="req-053"></a>REQ-053 | [FR-04.06](#fr-04-06); [FR-05.08](#fr-05-08) |
| <a id="req-053-f01"></a>REQ-053-F01 | [FR-05.08](#fr-05-08) |
| <a id="req-053-f02"></a>REQ-053-F02 | [FR-04.06](#fr-04-06) |
| <a id="req-053-f03"></a>REQ-053-F03 | [FR-04.06](#fr-04-06) |
| <a id="req-053-f04"></a>REQ-053-F04 | [FR-04.06](#fr-04-06) |

## Learning Content local delivery — 2026-10-29

The existing Module workspace now supports ordered Text/Video lessons, rich text/table/code/link/private-image editing and preview, MP4 upload, YouTube/Vimeo adapters, and immutable content revisions. Incomplete manual drafts can be saved; submission/import requires complete valid content. L&D reviews the whole Module revision. Creator, responsible Expert, subsequent editor and reviewer history stay in PostgreSQL; another Expert has read-only access.

Excel imports use Modules/Lessons sheets; ZIP packages add referenced Markdown/video/images. Preview makes no Module writes; confirmation revalidates the complete batch atomically. A foreign-owned duplicate rejects the batch. An owned released duplicate requires explicit confirmation to create a new draft revision; unresolved draft/review conflicts are rejected. Legacy Markdown becomes one stable Text lesson; absent content is shown as Needs content.

Manual test assignment was retired on 2026-10-30. Employee lesson access now requires the current authorized generated pathway entry; historical manual rows do not grant access. Versioned content, resume/coverage/completion and notifications are persisted; private bytes are stored in MinIO. Upload limits are audited global Platform Administrator settings. No automatic asset deletion is installed. [Architecture/store fields](../../ARCHITECTURE.md#learning-content-runtime-extension--v35v38), [actual tests and manual checklist](../../testing/system/REQ-013-learning-content.md). Local YouTube and uploaded MP4 playback passed; Vimeo live acceptance remains blocked by the external provider's connection-security restriction. This does not claim full production or module-assessment completion.


## R4 local refinement — 2026-10-29

Module and content creation now require the responsible Expert's real organization/session, valid skill mappings and the existing content rules; no Job Position selection or grant is required. Content reuse is not filtered by Job Position. New records have no job position membership; old snapshot tags/history remain intact. Excel/ZIP templates omit job positionIds, and the optional old column is ignored. Owner and cross-organization protections remain enforced.

L&D Details & history displays each revision's **Lesson 1, Lesson 2, Lesson 3…** as individual cards with title, Reading/Video, duration and actual content/player. The combined “Preview this content version” expander is removed. Review still approves or returns the complete Module revision, not individual lessons. Shared preview components use the same numbered presentation.

Private media also revalidates the trusted session/workspace on async servlet redispatch, fixing an actual AccessDenied stream failure without public access or fake identities. The pre-existing catalog intake permission controls remain explicitly labeled intake-only.

Verified locally: creation without Job Position, three-lesson desktop/mobile L&D reading/playback/release, Excel new/legacy compatibility, organization/owner isolation, Employee private video 90%/reload, 43 backend unit/API checks, 12 frontend checks and 2 affected store-integration scenarios across focused runs. [Evidence and manual checklist](../../testing/system/REQ-013-learning-content-R4.md). This refinement does not certify the separate Vimeo/live-provider or complete module-assessment boundaries.


## Module responsibility and peer visibility

For the implemented local FR-05.05/FR-05.08 slice, each Module has one responsible Expert. A new Module is owned by its authenticated creator. Only that Expert may edit, submit, delete an eligible draft, request archiving or restore a Module. Other Experts in the same organization may inspect content, creator, edit dates and review history; sharing an Job Position grants no editing permission. Organization isolation and existing deletion/archive safeguards remain in effect.

L&D selects exactly one Expert when assigning a catalog Module for intake; only that Expert can receive it. L&D continues approving or returning submitted revisions under FR-04.06. The local existing-data handover assigns modules to the selected development Expert with an audit event, preserves previous versions/decisions and does not auto-approve imported content. Creator/editor/reviewer names and dates are shown separately.

### Manual test assignment retired — 2026-10-30

Expert Module Management retains import/authoring and removes the test assignment panel. Manual assignment endpoints return 410; existing content and learning history are preserved. Employee sees its real initial pathway or guidance to review Roles. [Verification/manual checklist](../../testing/system/REQ-013-retire-manual-pathway.md).

## Merge verification boundary — 2026-11-01

The current router uses the shared API-backed workspace for Expert authoring and separate L&D module catalog/approval views. The retired standalone L&D content URL redirects to the module catalog; lessons remain inside module details/history. This supersedes prototype-only observations dated28 October above. [Current integration evidence](../../testing/integration/REQ-013-014-merge-resolution.md) and [deployment/manual checklist](../../testing/system/REQ-013-014-merge-resolution.md) distinguish verified stores, local8088 smoke checks and remaining full-browser acceptance. Existing IDs and unagreed requirements remain unchanged.

### Module workspace navigation — 2026-11-01

Expert Modules has no local Modules/Content Studio navigation or copy-existing-content selector. Create and Import actions sit in the page header with the same compact Plus/Upload button treatment as Target Roles; Import opens the existing Excel/ZIP upload, template, preview and confirmation flow in a shared dialog; no inline import section is displayed. Closing an idle dialog discards only its unconfirmed preview. Dismissal is blocked during upload or import confirmation. The Expert composes Text/Video lessons within the module editor; opening existing modules retains their saved lessons. The editor offers Edit content and View as learner tabs for current unsaved lesson values, with mobile/full preview. Create/revise opens a wide authoring surface with separate Module details/Learning content tabs, a collapsible lesson list and one selected lesson at a time. Reordering retains the selected lesson identity. Tiptap uses shared reading typography and semantic paragraph/heading styles; native required-field validation reveals the owning tab. L&D review offers the same read-only presentation for the exact requested revision; published/history content remains separately selected. These previews reuse Employee document/video rendering and private asset URLs without starting learning or writing progress. The import template link uses the existing download endpoint with a highlighted, accessible icon treatment.

L&D uses **Modules** for catalog lookup, lessons/history and responsible Expert information. Eligible unmanaged catalog modules offer intake assignment inside View module details. **Approvals** lists only submitted revisions, archive requests and publication/archive actions awaiting retry; filtering and totals are calculated before pagination. Approval/return/retry buttons appear only in this queue. The old intake-permission panel and standalone Learning content navigation are removed; the legacy content URL redirects to Modules. Module/content records, assets, version history and the existing owner/review rules remain intact. [Verification and manual checklist](../../testing/system/REQ-013-ld-approval-queue.md).

Module statistics reuse the Target Roles gradient StatCard treatment, with contextual icons, semantic value colors and concise English/Vietnamese descriptions. Matching modules, available content and available skills retain their existing API-backed counts and filters.

L&D Modules/Approvals navigation uses shared button styling inside a bordered card surface. The current section has a solid primary fill and `aria-current="page"`; the other section has a soft tint. Decorative icons distinguish catalog from review. Existing routes, pagination reset and permissions are unchanged.

L&D navigation text uses medium weight, primary-foreground on the active button and muted-foreground on the inactive button. Pending actions counts submitted reviews, archive requests and pending publication/archive processing; it is not the catalog module total.

Module workspace loading exposes a screen-reader-only status without a visual placeholder or progress bar. Navigation, pagination and dropdown filters request fresh data immediately; only search text is debounced180ms. L&D catalog/approval reads omit the unused content payload and fetch Expert choices in parallel with other reference data. No response cache is introduced; existing abort/error handling is retained.

L&D Modules and Approvals routes render the same ModuleManagementWorkspace component with different mode props. Switching between them preserves the mounted session state rather than remounting through a separate page wrapper. List data is still re-requested for the selected mode; server-side identity and authorization remain unchanged. Leaving/re-entering the workspace still initializes its session normally.

Both L&D module routes share a persistent parent route and the same workspace-entitlement query scope (account/organization scoped). Existing15-second identity and5-second entitlement polling, logout cache clearing, server request authorization and failure screens remain in place. Switching these two sections no longer unmounts the workspace while a new path-keyed access query starts. Other routes retain their existing scope.

Module cards group View module first in the same wrapping action row as Details & history and available Edit/request/review actions. Button handlers and ownership/role eligibility are unchanged.

Module status labels reuse shared Badge variants: Approved/Active/Released use success; submitted/review/publication/archive-pending and intake use warning; Rejected/Returned use destructive; Draft uses secondary; Archived/unknown remain neutral outline. Labels retain text and align at their natural height. Status data, decisions and action buttons are unchanged.

Companion state machine for the current Module/Content main review flow: [ST-11](../../diagrams/mermaid/st-11.mmd) ([SVG](../../diagrams/mermaid/st-11.svg)). This models the current document revision; lessons are reviewed together and published history remains immutable.

### Single-Skill Module authoring — 2026-11-05

FR-05.05 now requires exactly one Skill for each authored/imported Module; a Skill may have multiple Modules. The TEACHES relationship is retained. The editor, import template and active catalog responses omit Teaching focus and difficulty. Existing ownership, same-organization choices, review and publication safeguards remain. Dataset 0.12 narrows each Module to its actual content; eight Skills have no dedicated provider and are reported explicitly. Legacy snapshots remain readable. [Technical contract and dataset audit](../../technical/Skill-Learning-Eligibility.md).

The Module editor presents Skill selection before learning content so the Expert chooses the teaching target before composing lessons.

The current Module payload/projection adds knowledgeLevel, skillVersion and outcomeCodes to the single-Skill rule; new documents omit price under V61. Exact completion is recorded in a sidecar and checked by rule exam admission. Optional same-Skill study remains constrained by accepted module access, rather than granting every same-Skill provider. Certificate flow source exists separately; the older dataset audit/results above retain their historical scope.

### Module directory and staff preview layout

Expert Module directory omits the creator subtitle under Workflow, while identities remain available in details/history. Vietnamese status labels use compact wording and consistent centered single-line badges; desktop and tablet retain the compact table with horizontal scrolling inside the directory when required; mobile screens use the card layout. Shared staff learner preview keeps lesson navigation items at a fixed size. Long titles wrap within the bounded item, with the complete name available on hover/focus or through the information button on touch. The selected lesson heading retains its full title and wraps within the reading area. Selection and preview do not write learner progress.

Staff learner preview groups read-only status, device sizing and full-screen controls in a compact toolbar. Lesson navigation shows a fixed card with number, Reading/Video type, actual duration and an internal full-title information action. The selected card has a primary marker. Shared document spacing and selected contents-link styling keep the reading hierarchy consistent with Employee rendering. Imported text remains intact; the viewer does not remove duplicate authored headings or generate replacement lesson content.
