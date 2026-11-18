# Employee Learning Experience

**Source alignment — 2026-11-07.** Confirmed behavior is distinguished from checked-in implementation below. [Current source/schema/API contract](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md) records local profile gates, exact ownership and remaining mismatches. Runtime/database acceptance is not established by this prose update.

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 5.

**Contract basis:** confirmed behavior plus the later L&D Role–Level / Expert Skill–knowledge configuration decisions. Historical evidence retains its original scope; it is not a fresh passing result.

## Current Implementation

**Current rule-flow source inspected:** `2c2468b5`,2026-11-18. Code presence is distinguished from dated runtime evidence; this task adds no executable/runtime result.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-06.01](#fr-06-01) | Prototype | The shared profile screen reads actor-specific browser profiles and offers local name/password changes. | These changes do not update the authenticated account/password or a persisted Employee work profile. Real administrator member edits are a separate feature. |
| [FR-06.05](#fr-06-05) | Partial | The Role gap dialog uses persisted baseline evidence and the authorized Role+Level gap API; the separate legacy gap-analysis screen retains prototype behavior. | RuleKnowledgeProfileService now reads diagnostics, official exact evidence and review flags; full runtime/production compatibility remains unverified here. |
| [FR-06.06](#fr-06-06) | API-backed slice | Role roadmap/timeline reads the Employee's own exact approved pathway, ordered Modules and safe frozen baseline context. | Generated entry access now checks current approval, content version and prerequisites before serving real lessons/progress. Requirement-root alternatives, exact rule-assessment entry and assessment-driven supplementation now exist in source; full merged browser/certificate/bypass acceptance remains unverified; independent-skill prototype consumers are not recertified. |
| [FR-06.07](#fr-06-07) | Partial | The Skills tab loads real micro-skills/macro competencies through catalog APIs and lets Employees track/untrack skills locally. | Duration/level metadata is synthesized in the browser; tracking and sample module/roadmap content are not a persisted independent-learning context with approved mapped content. |
| [FR-06.09](#fr-06-09) | Partial; current Role flow server-backed | Role Overview reads own selection/target requirements, official evidence coverage and current requirement pathway. Rule attempt/module history, pathway timing and RIASEC history use their separate server owners. | Skill-mode/independent/legacy widgets retain their separate prototype limits; this is not one universal persisted progress aggregate or new runtime acceptance. |

<a id="overview-riasec-tab"></a>

### Overview RIASEC tab — implemented local surface, 2026-11-18

`/employee/overview?tab=riasec` mounts [RiasecExperience](../../../frontend/src/features/employee/riasec/RiasecExperience.tsx) for trusted Employee org/account, independently of Role, graph, baseline and pathway. It stays mounted after opening; hidden tabs pause polling. Owner changes remount; accepted answers live in the server draft. Standalone/learner and recognized Assessment entries redirect here.

Four summary cards show assessment entry/current/history/inactive. Start requires confirmation. The saved draft supports 60 EN/VI activities, autosave, explicit editor takeover, review and confirmed submit. Server raw 0–40 scores display before AI, with keyboard/touch/hover radar and up to three Job Position comparisons/details. UI is bilingual; generated explanations remain English.

One history dialog offers date/ID search, current/history/inactive and AI-status filters, newest/oldest ordering and counts. Confirmed View opens only active results, changing the viewed radar but not server current. Inactive rows show their 7-day recovery deadline without View. Inactive/Recover/permanent Delete have distinct confirmations; recovery never reruns AI. Confirmed New assessment/Retry AI obey server guards; only current FAILED AI retries, and success including empty output is final.

Explore more checks current active same-org position IDs, then navigates `/employee/upskilling?tab=roles&jobPositionId=...`; published Role/member Level choice remains explicit with existing locks/access. No chat, cosine percentage or mastery/pathway write is introduced. Save/conflict/network/catalog/AI states remain explicit; unsaved answers can be lost on closing before accepted save.

[Assessment](../Assessment%20workflows/README.md#riasec-personal-assessment--current-implementation-2026-11-18) owns scoring/storage/API/retention; [guidance](../Role%20guidance/README.md#riasec-job-position-exploration) owns AI/candidates/snapshots. Earlier browser evidence predates latest history UI; that follow-up has build/static evidence only. This reconciliation adds no runtime/accessibility/production acceptance.

### Current RIASEC source limits

Direct source inspection at `2c2468b5` differs from earlier handoff prose in three presentation details:

- Active RiasecRadarPanel only renders RiasecScoreRadar; comparison details show dimension names and original paired scores. A separate meaning/leading-group summary, boundary-tie disclosure and equal/zero-profile notice are absent. The six values themselves retain equality; no unique Holland code is calculated.
- The manifest retains source/hash/translation/license/modification/validation metadata. Active RiasecExperience/RiasecAttemptPanel renders activity instructions, but does not read/render that source/adaptation notice metadata. Stored notices are not proof of a visible launch notice or validated adaptation.
- Server GET exposes catalogAvailable, but the current frontend View type/component does not consume it. On a catalog-read failure the empty active-ID list disables Explore more with the same unavailable message used for removed/inactive positions; a dedicated catalog-outage state is not shown.

These are source observations, not new runtime findings or an implementation authorization. Other interaction/accessibility behavior remains limited to its recorded version of evidence.

### Role pathway display — new direction

Only own approved/current or own archived revisions are projected from trusted Employee/organization context; no draft candidates, foreign records or answer keys. Preserve explicit pending/unresolved/stale/empty/error/archive and live AVAILABLE/LOCKED/UNAVAILABLE reasons. Reads cannot generate, approve, advance progress or award achievement. Archived records are read-only; preview/notification grants no access.

The hierarchy becomes **skill/requirement → module alternatives** (or the assigned certificate), retaining current Roadmap/Timeline style, toolbar/search/details, components, colors, fonts, sizes, spacing and layout conventions. Show exact knowledge/outcomes, dependencies, official versus diagnostic evidence and bypass reasons. Numeric baseline mastery counts are not official completion/certification. RequirementPathwayPresentation now renders this hierarchy; module cards carry assessment status and roots carry requirement state. [Adaptive behavior](../Adaptive%20engine/README.md#initial-requirement-steps-and-alternatives) owns planning rules; the current technical read contract identifies the active owners and retained historical designs.

**Entry points:** `/profile`, `/employee/overview`, `/employee/gap-analysis`, `/employee/pathway`, `/employee/upskilling?tab=skills`. Older skills-catalog routes redirect to the consolidated Skills tab.

**Code references:** [profile prototype](../../../frontend/src/features/profile/ProfilePage.tsx), [browser learning state](../../../frontend/src/shared/hooks/useEmployeeLearningState.ts), [gap screen](../../../frontend/src/features/employee/components/CompetencyGapAnalysis.tsx), [pathway screen](../../../frontend/src/features/employee/pathway/AdaptivePathwayPage.tsx), [real skill reads/local tracking](../../../frontend/src/features/employee/target-roles/UpskillSkillsPanel.tsx), [overview](../../../frontend/src/features/employee/overview/EmployeeOverviewPage.tsx). See [Assessment workflows](../Assessment%20workflows/README.md#current-implementation) for module-reader and quiz limitations.

## Baseline/pathway/Skill Assessment — source update, 2026-11-18

Current source freezes baseline papers/timing, binds Role/Level at pathway request, shows only accepted learning choices and preserves exact per-module progress/assessment history. Admin placement and the learning target remain separate. Official evidence is exact Skill+knowledge+Skill version; baseline pass stays diagnostic. MAIN pass, content completion and official achievement are separate while mandatory supplements remain.

PathwayTimingSummary displays NOT_STARTED, LEGACY_UNTIMED, IN_PROGRESS/OVERDUE or COMPLETED with UTC start/deadline/completion and on-time outcome. First actual approval starts the clock; later revision does not reset it. Expert rejection retains the bound target and no new proposal learning access is granted. Per-module Open/Resume/Retake/history uses server context and independent allowance/wait; a new retake includes every configured prerequisite group.

Outcome processing may be pending even after a finalized score. Recalculation adds real prerequisite provision, accepts genuine evidence and refreshes the same requirement; optional/parallel work does not inflate REQUIRED progression. [Current ordered contract](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md#current-flow-2026-11-18). Source inspection is not new browser/runtime verification.

## Employee behavior for the new pathway

### Choose, learn, switch and resume

1. Review explicit requirements and diagnostic results for selected Role/member Level; [request submission locks both](../Role%20guidance/README.md#rolelevel-selection-and-lock), including pending Expert review. Browsing another target changes no binding.
2. After exact initial approval, open an available requirement. MODULE_ONLY offers approved equivalent choices; choose or switch without discarding each module's pinned content/progress. Preserve access/content guards and gates for established shortages; unassessed B inferred solely from baseline never gates initial A learning. Unrelated steps remain available.
3. Resume real lessons through existing reader/progress behavior. Completing content only satisfies learning eligibility for the exact compatible requirement; it is not official achievement.
4. Take the [shared skill assessment](../Assessment%20workflows/README.md#shared-engine-scope-and-policy), including main and all prerequisite groups. Show each group result, veto/retake and required supplementation versus optional NEED_REVIEW.
5. One successful module + assessment and required completion conditions satisfies the requirement. Other alternatives stay optional/accessible with independent history. Recalculation adds/reuses required steps automatically, showing missing provision/Expert action without sample fallback.

Official achievements are exact Skill/knowledge/Skill-version evidence from accepted learning+assessment or approved certificate. Baseline pass only skips initial module assignment; it never becomes official profile achievement. Later prerequisite failure of an officially achieved item shows NEED_REVIEW without revocation/mandatory relearning. Missing/not-assessed differs from failed.

### Certificate evidence and review

For CERTIFICATE_ONLY, display the single assigned certificate definition, Skill/knowledge/Skill version and reference URL. Employee submits a **link OR PDF OR picture** as evidence; all three forms must be supported but all three are not required together. Catalog reference URL is not the learner's evidence.

Input binds evidence to the Employee's exact organization/requirement and accepted definition/version. Server derives learner/organization/status; no editable reviewer/pass fields. Uploaded evidence stays private with access limited to the learner and authorized reviewers. Validate evidence form/content and authorized ownership; show upload/access failure with retry rather than a successful submission. Accept one HTTPS link OR one PDF OR one PNG/JPEG per submission; max 10 MiB/file subject to a tighter applicable existing limit. Validate actual media/size and private access; do not fetch remote URLs automatically. Replacement after rejection creates linked new-flow history; no generalized verification/expiry engine is included.

Submission becomes pending, not achieved. Show reviewer decision and actual reason/history; rejection stays unmet and allows the defined resubmission path. Only authorized Expert approval updates official exact achievement and triggers recalculation. Repeated submit/approve or concurrent stale decisions cannot duplicate achievement or overwrite accepted history. Current routing uses CertificateController with PENDING/APPROVED/REJECTED submission status, current assigned Expert review, expected revision and immutable definition/decision history. These source paths were not runtime-exercised here.

### Bypass, progress and target release

Show waived/bypassed unmet needs separately from fulfilled requirements. Prerequisite bypass temporarily permits dependent learning; later provision relocks not-started dependents, preserves started content but waits on supplementation before new completion, and retains completed results with supplementary work. Never erase progress or silently replace another active target. After target release, carry the old bypass as parallel supplementation without gates on new-pathway work.

Required-work completion or only approved bypass needs remaining releases Role/Level selection. Optional alternatives and optional review do not block release. A new target reuses compatible official evidence and carries original bypass needs as parallel supplementation without gates on its other skills. Diagnostic reuse is limited to the same unchanged request/context, not a new-target exemption; no self-declared-title exemption.

Independent upskill remains separate. The same module cannot be opened via skill browsing, optional-module lists, deep links or another context to evade its current pathway LOCKED state. All server admission and media/content paths must retain tenant/actor/prerequisite guards; hiding a button is insufficient. SkillLearningService now rechecks assigned/accepted module access; exact rule-exam admission is a separate server check. Full bypass/deep-link/security behavior remains unverified here.

Progress/history distinguishes lessons, attempts and per-group results, official achievements, diagnostics, pending evidence, optional alternatives, bypass and pathway revisions. It must not count every alternative as compulsory, every baseline pass as certified, or waived needs as achieved. Mocks/localStorage are not integration evidence.

Current source implements the local rule flow and versioned mappings described in the technical contract. Full runtime, authorization, certificate/bypass/backfill and production verification remain unproved; source-policy mismatches are retained explicitly.

## Requirements

<a id="fr-06-01"></a>

### FR-06.01: Manage personal profile

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-06.01 |
| 2. Requirement Name | Manage personal profile |
| 3. Description | The Employee shall view and update personal and work-related profile information. |
| 4. Actor | Employee |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-06-05"></a>

### FR-06.05: Review competency profile and gaps

Employees can open **My Skills** from their menu or Profile to view officially achieved levels across pathway and individual learning. Search and level filters retain exact Skill versions; each attained level opens its recorded evidence. Diagnostics never award a displayed level, higher levels do not imply lower ones, and review annotations retain prior achievement. [Local verification and checklist](../../testing/system/FR-06.05-09-my-skills-20261117.md).

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-06.05 |
| 2. Requirement Name | Review competency profile and gaps |
| 3. Description | The Employee shall view the current competency profile and skill gaps against the selected target role. |
| 4. Actor | Employee |
| 5. Preconditions | Trusted Employee reading own selected Role/member Level and compatible evidence. |
| 6. Main Flow | Read explicit requirements; compare official exact achievements, diagnostics and remaining needs; inspect provenance/review/bypass reasons. |
| 7. Alternative / Exception Flows | Missing/incompatible/outage is explicit, distinct from failure; unauthorized/foreign records denied. |
| 8. Postconditions | Read-only profile/needs projection; baseline pass is not official achievement. |
| 9. Acceptance Criteria | No numeric gap subtraction; exact knowledge levels, diagnostic/official distinction, NEED_REVIEW and bypass remain separate. |

<a id="fr-06-06"></a>

### FR-06.06: Follow a learning pathway

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-06.06 |
| 2. Requirement Name | Follow a learning pathway |
| 3. Description | The Employee shall follow requirement-root pathways, choose equivalent module alternatives or submit the assigned certificate, and see authorized recalculation updates. |
| 4. Actor | Authorized Employee reading their own pathway. |
| 5. Preconditions | Trusted own scope; exact initial approval and live content/prerequisite/access readiness for learning. |
| 6. Main Flow | Read requirement steps/dependencies; choose or switch alternatives; resume content; complete assessment or certificate review; view supplemental updates. |
| 7. Alternative / Exception Flows | Pending/unresolved/missing/stale/locked states stay explicit; draft/archive grants no learning; switching retains progress. |
| 8. Postconditions | One successful alternative satisfies a requirement; optional choices/history remain. Viewing grants no completion. |
| 9. Acceptance Criteria | Requirement-root graph/timeline keeps current visual design; exact approved scope, separate evidence states, full retake, safe recalculation and request-onset target lock. |

The Employee module lesson route uses a dedicated reading layout with the shared workspace navbar, module progress and collapsible syllabus. The compact document view uses a single module title, light active/completed syllabus states and heading-derived in-page navigation on wide screens; narrow screens keep a single reading column. Global feature navigation is omitted on this route; returning to a normal workspace page restores it. Return navigation in the Reader header and completion banner is context-aware: opening a module from Upskilling preserves `from=upskilling`, `skillId` and `level` in URL query parameters and returns directly to that Skill and knowledge-level tab (`/employee/upskilling?tab=skills&skillId=...&level=...`), whereas Pathway and direct entries return to `/employee/pathway`. The Reader omits inline Skill Assessment controls and optional-module lists at the bottom of the lesson, directing completed learners back to their Skill or Pathway assessment surface. [Verification and checklist](../../testing/system/FR-06.06-07-08-reader-navigation-20261118.md).

The new contract supersedes the initial-view-only scope. Approval alone does not establish readiness or protected content access. The [technical read contract](../../technical/initial-pathway/Adaptive%20pathway/View%20Adaptive%20Pathway.md) separates implemented projection, owner learning dependencies and actual evidence.

<a id="fr-06-07"></a>

### FR-06.07: Learn an individual skill

Each selected Skill knowledge-level tab has one Skill Assessment section above its learning modules. Completed eligible modules at the current Skill version provide learning evidence; multiple eligible completions require an explicit choice. Module cards retain learning/review actions and pass `from=upskilling`, `skillId` and `level` when opening the Reader so returning from the Reader restores the selected Skill and knowledge-level tab. Assessment history and retake limits remain specific to the selected module/revision; viewing the catalog never starts an exam. [Local slice evidence](../../testing/system/FR-06.07-08-skill-level-assessment-20261117.md) · [Reader return navigation evidence](../../testing/system/FR-06.06-07-08-reader-navigation-20261118.md).

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-06.07 |
| 2. Requirement Name | Learn an individual skill |
| 3. Description | The Employee shall browse available micro-skills, select a skill for independent learning, and access its mapped learning modules and content. |
| 4. Actor | Employee |
| 5. Preconditions | Trusted Employee with authorized skill/knowledge learning context and live access/prerequisite guards. |
| 6. Main Flow | Browse skill provision; choose an eligible module; resume independent progress through existing reader behavior. |
| 7. Alternative / Exception Flows | Current pathway LOCKED modules cannot be admitted through skill/optional/deep-link routes; wrong organization or missing content denies entry. |
| 8. Postconditions | Independent learning/progress remains separate; content alone grants no official achievement or pathway unlock. |
| 9. Acceptance Criteria | Preserve independent study without bypassing shared access guards or treating any same-skill module as an equivalent requirement choice. |

<a id="fr-06-09"></a>

### FR-06.09: Track learning progress

My Skills provides the achieved-only summary; ongoing study and content completion remain in the learning views. Partial or unavailable achievement history stays explicit instead of implying a missing achievement.

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-06.09 |
| 2. Requirement Name | Track learning progress |
| 3. Description | The Employee shall view completed learning activities, assessment outcomes, competency progress, and pathway status. |
| 4. Actor | Employee |
| 5. Preconditions | Trusted Employee reading own persisted progress/evidence/pathway history. |
| 6. Main Flow | Inspect lessons, attempts/group results, diagnostics, official achievements, pending certificate decisions and requirement revisions. |
| 7. Alternative / Exception Flows | Missing/prototype data remains unavailable; optional, waived, failed and NEED_REVIEW states cannot be collapsed into achieved. |
| 8. Postconditions | Read-only traceable progress/history; no generated completion or reviewer metadata. |
| 9. Acceptance Criteria | Separate official versus diagnostic/bypass, preserve all attempts/alternative progress and show real mandatory pending work. |

## Legacy ID Traceability

These anchors preserve existing references, not additional functional requirements. They identify related source-level records only; former subfunctions, UI choices, policies and implementation claims are not reconfirmed by this mapping. Historical test results retain their original scope. Legacy IDs remain reserved and must not be reassigned.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-056"></a>REQ-056 | [FR-06.01](#fr-06-01) |
| <a id="req-056-f01"></a>REQ-056-F01 | [FR-06.01](#fr-06-01) |
| <a id="req-056-f02"></a>REQ-056-F02 | [FR-06.01](#fr-06-01) |
| <a id="req-006"></a>REQ-006 | [FR-06.05](#fr-06-05) |
| <a id="req-006-f01"></a>REQ-006-F01 | Related to [FR-06.05](#fr-06-05); graph presentation is not a separate function in section 3.2(c). |
| <a id="req-006-f02"></a>REQ-006-F02 | [FR-06.05](#fr-06-05) |
| <a id="req-004"></a>REQ-004 | [FR-06.06](#fr-06-06) |
| <a id="req-004-f01"></a>REQ-004-F01 | [FR-06.06](#fr-06-06) |
| <a id="req-005"></a>REQ-005 | Related to [FR-06.06](#fr-06-06); a separate recommendation-explanation function is not specified in section 3.2(c). |
| <a id="req-005-f01"></a>REQ-005-F01 | Related to [FR-06.06](#fr-06-06); a separate recommendation-explanation function is not specified in section 3.2(c). |
| <a id="req-007"></a>REQ-007 | [FR-06.08](../Assessment%20workflows/README.md#fr-06-08) |
| <a id="req-007-f01"></a>REQ-007-F01 | [FR-06.08](../Assessment%20workflows/README.md#fr-06-08) |
| <a id="req-009"></a>REQ-009 | [FR-06.09](#fr-06-09) |
| <a id="req-009-f01"></a>REQ-009-F01 | [FR-06.09](#fr-06-09) |
| <a id="req-009-f02"></a>REQ-009-F02 | [FR-06.09](#fr-06-09) |
| <a id="req-010"></a>REQ-010 | [FR-06.06](#fr-06-06) |
| <a id="req-010-f01"></a>REQ-010-F01 | [FR-06.06](#fr-06-06) |
| <a id="req-055"></a>REQ-055 | [FR-06.07](#fr-06-07) |
| <a id="req-055-f01"></a>REQ-055-F01 | [FR-06.07](#fr-06-07) |
| <a id="req-055-f02"></a>REQ-055-F02 | [FR-06.07](#fr-06-07) |
| <a id="req-055-f03"></a>REQ-055-F03 | [FR-06.07](#fr-06-07) |
| <a id="req-055-f04"></a>REQ-055-F04 | [FR-06.07](#fr-06-07); [FR-06.08](../Assessment%20workflows/README.md#fr-06-08) |
| <a id="req-070"></a>REQ-070 | [FR-06.09](#fr-06-09) |
| <a id="req-070-f01"></a>REQ-070-F01 | [FR-06.09](#fr-06-09) |

## Assigned Module roadmap/timeline — R5 (2026-10-29)

Employees use the existing roadmap/timeline presentation to browse their actual Expert-confirmed assignments, view mapped skills and content completion, and open the real lesson reader. An assigned released module can be displayed before starting; simply viewing the pathway does not pin a version or create progress. Unavailable modules have a retry state; a successful empty assignment response leaves the pathway body blank (superseded by R6 below). Both English/Vietnamese and mobile layouts are supported.

The page contains no simulated diagnostic unlock, recommendation score, sample Module or inferred mastery. Module ordering is manually confirmed by an Expert; generated/adaptive pathways remain outside this integration. Content completion is distinct from exam/mastery evidence. [Verification and manual checklist](../../testing/system/REQ-013-learning-content-R5.md).


## Original pathway and lesson presentation — R6 (2026-10-29)

The original roadmap/timeline and lesson-reader layouts now display actual assigned pathways, ordered Text/Video lessons and persisted content progress. Employees can inspect module/skill details, navigate the syllabus and resume real video playback using the restored player controls. Selecting a pathway loads fresh authorized snapshots for that pathway; unavailable modules in another pathway do not block it. A successful response with no assignments leaves the pathway body blank; loading and retry states remain distinct.

The reader retains its original sidebar, large content area, next-item footer and progress bar. Video completion still requires 90% distinct watched coverage plus explicit confirmation. The exam action remains unavailable until real exam admission exists. This does not implement pathway generation or assessment-derived mastery. [Verification and manual checklist](../../testing/system/REQ-013-learning-content-R6.md).


## Persisted Learning Content — 2026-10-29

The existing reader layout now resolves approved assigned content for the requested Module instead of a fixed mock package. Lesson order is freely navigable. Text completion requires reaching the end; Video completion requires at least 90% distinct actual watched coverage, followed by explicit confirmation. Seeking/replay cannot add unseen coverage. Progress resumes across sessions; learners keep their pinned version until opting into the latest approval. Only unchanged stable lessons retain progress; historical rows remain.

The reader supports unavailable-video retry/reporting and durable issue/new-version notifications. All lessons completed means **Content completed**, not passed assessment or verified mastery. Uploaded MP4 and YouTube were exercised live; Vimeo provider restrictions remain a documented acceptance blocker. [Test evidence/manual checklist](../../testing/system/REQ-013-learning-content.md).

R4 media follow-up (2026-10-29): the existing private video reader passed actual playback, seeking/90% explicit completion and reload regression after correcting session revalidation on async media dispatch. This introduces no new completion/mastery rule. [Evidence](../../testing/system/REQ-013-learning-content-R4.md).


## Adaptive Pathway component integration — R7 (2026-10-29)

The Employee pathway now enters the existing roadmap/timeline component owners with actual assigned snapshots. The source presentation from target-roles-flow supplies the search toolbar, original graph geometry, Module/skill detail hierarchy and timeline track/cards. Module details expose actual duration, lesson progress, mapped skills and lesson navigation. Successful empty assignments remain blank. Role/Skill context, mastery, certification and simulated adaptation are not invented where persisted evidence is unavailable. The lesson reader and version/progress policies are preserved. [Verification and manual checks](../../testing/system/REQ-013-learning-content-R7.md).

## Initial pathway and assigned learning content — 2026-10-29 integration

The default pathway view uses main's server-generated initial role pathway and Expert review states. Existing manual Expert-confirmed learning remains available through Assigned modules when present. Both sources can open actual stored lesson content; manual lessons return to assigned mode, while generated entries return to the initial pathway. Generated access requires current exact approval and live prerequisite/content-version checks. Missing content or unsupported internal segment gates remain unavailable. Successful empty initial/manual responses do not show sample routes. Content completion remains separate from mastery/exams. [Verification and manual checks](../../testing/system/REQ-013-main-pathway-integration.md).

## Manual test pathway retired — 2026-10-30

This supersedes the manual selector/assignment and blank-empty-state behavior in R5–R7 and the integration notes above. Employee uses the real initial pathway; no R4 sample selector or Assigned modules entry is shown. Without an initial pathway, the page retains its roadmap/timeline frame and offers Review Roles guidance. The old assigned query does not open test mode. Historical assignments/progress remain stored but manual assignments no longer grant lesson access. Generated pathway approval/version/prerequisite checks and the existing lesson reader remain in place. [Verification and manual checklist](../../testing/system/REQ-013-retire-manual-pathway.md).

### Optional Modules for the same Skill — 2026-11-05

**Pre-transition implementation:** an Employee with an authorized Module or original skill completion can study other approved, active Modules teaching that Skill within the organization. Each Module retains its own pinned content and progress; optional study does not change pathway membership/order. Completing one Module leaves the others available. Loading, empty, retry and access-denial states use real APIs. [Learning contract](../../technical/Skill-Learning-Eligibility.md).
Current requirement alternatives additionally use exact knowledge/outcome/Skill version and accepted-access guards. Legacy same-Skill eligibility is not exam authorization; arbitrary independent assessment contexts remain incomplete.
