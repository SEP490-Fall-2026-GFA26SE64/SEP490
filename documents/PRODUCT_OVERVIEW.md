# Adapt-Learn-Graph: Product Overview

## Baseline/pathway rule-flow update — 2026-11-18

L&D maintains one Baseline configuration per organization and Role. The selected Role Level determines the Employee's questions. The Expert keeps one common Skill Assessment editor. Activation applies its question, timing and retake settings only to currently assigned Roles. A new paper uses its learning Role's configuration, including when another Role contains the same Skill, and retains those settings. Baseline checks the required knowledge level and lower levels, including certificate-mode Skills. Results guide initial learning without awarding official achievement. Skill Assessment can reveal additional learning or certificate requirements. Used attempts, waiting periods and history still share the same Employee, Skill, knowledge level and Skill version across Roles and modules. Separate Role configuration does not yet separate those attempt records. Expert review and later updates preserve completed work and history.

[Authoritative ordered flow/API/worker/schema mapping](technical/Organization%20Rule%20Assessment%20and%20Pathway.md#current-flow-2026-11-18) · [Assessment schema](diagrams/postgresql-assessment.svg) · [Pathway schema](diagrams/postgresql-pathway.svg) · [Flow image](diagrams/baseline-pathway-flow.svg). These selected learning views are aligned with current source on 2026-11-23, including Role configuration and V79-V82 certificate/notification additions; they are not a live DB capture. Older confirmation-pending/OC/V62 snapshots below keep historical scope. RIASEC documentation remains separate. This update runs no runtime/tests, migrates no data and makes no new release claim.

## RIASEC personal exploration — current source, 2026-11-18

Implemented local opt-in source `2c2468b5`: Employee completes 60 local EN/VI activities, responses 0–4; server retains six raw integer sums 0–40 independently of baseline/Skill Assessment/Role/mastery. One server draft per account/org supports autosave and explicit takeover. Submitted results support current/history, confirmed inactive/recover/permanent-delete actions and 7-day inactive retention.

At `/employee/overview?tab=riasec`, scores display before internal Ollama selects/ranks up to 3 ACTIVE same-org Job Positions with complete integer 0–40 profiles, allowing ties/zero suggestions. Saved English explanations use original-score comparisons. There is no cosine/Department-only matching, chat, automatic Role choice or Expert guidance-review gate. Explore more filters existing Role browsing; Employee explicitly chooses a published Role/member Level under existing rules.

PostgreSQL workspace V74 owns drafts/results/durable AI jobs/snapshots; Neo4j owns six optional all-or-none Job Position interest properties. [Assessment](features/Assessment%20workflows/README.md#riasec-personal-assessment--current-implementation-2026-11-18), [AI guidance](features/Role%20guidance/README.md#riasec-job-position-exploration), [catalog fields](features/Departments%20and%20occupations/README.md#riasec-job-position-profiles), [architecture](ARCHITECTURE.md#riasec-personal-exploration), [storage diagram](diagrams/riasec-storage.svg), [runtime diagram](diagrams/riasec-flow.svg) define current boundaries.

The rich manifest is frontend-bundled, not a backend manifest archive. Demo position profiles are not official normalized O*NET ratings. Earlier verification remains version-scoped; latest history/permanent-delete UI has build/static evidence without fresh browser/executable checks. This documentation task runs no application/tests/migration/seed. Adaptation, general AI quality, member performance and production readiness remain unvalidated.

## Assessment/pathway contract — source 2026-11-07

The Employee selects a Role and Level. Baseline checks each target Skill through its required knowledge level. Compatible official evidence and available history are considered before questions are assigned. Passing Baseline may avoid initial learning but does not award official achievement. A later Skill Assessment can still identify a learning or certificate requirement.

Pathway steps are skill/knowledge requirements with equivalent module choices or one assigned certificate. Initial Expert approval remains; valid supplementation recalculates automatically. Module+assessment/certificate approval creates official achievement; bypass remains **Cần bổ sung**. Lock Role/Level from request submission until mandatory work resolves or bypass-only remains. Carried old bypass needs are parallel and do not gate the next target's other skills.

Preserve FE design, security and unrelated features. [Features](features/README.md), [target schema/API/flow](technical/Organization%20Rule%20Assessment%20and%20Pathway.md) define this flow, replacing IRT/numeric gap/optimizer rules. The local rule composition now implements scoped configuration, papers/results, exact evidence and requirement-pathway services. Applied DB state and full certificate/bypass/parallel behavior were not verified here. L&D configures Baseline per Role–Level; Expert configures Skill Assessment per Skill–knowledge, shared across equivalent modules. Legacy IRT/optimizer source is retained outside the active workspace route; research obligations remain separate.

**Functional scope source:** [Capstone Register Version 2](./FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c).

**Aligned:** 2026-10-28. **Scope:** 48 functional requirements across six human actors and the automated System.

## Purpose

Adapt-Learn-Graph connects organization onboarding and subscriptions, workspace administration, role and skill configuration, learning content, assessments, employee competency development and adaptive learning pathways. The overview below distributes every functional bullet in Version 2 to its authoritative record in the [feature catalog](features/README.md).

## Actors and Responsibilities

| Actor / performer | Source requirements | Functional responsibilities |
| --- | --- | --- |
| Guest | 4 | Register an organization; select and pay for a subscription; track onboarding and access the workspace. |
| Platform Administrator | 3 | Manage organizations; configure existing subscriptions; monitor platform activity. |
| System Administrator | 6 | Manage accounts, departments, roles, permissions, organization settings, workspace activity and organization subscriptions. |
| L&D Manager | 7 | Manage job positions and Expert assignments, target roles and publication, baseline configuration, offering approval and employee development. |
| Expert | 8 | Manage micro-skills, role competency requirements and submissions, prerequisites, modules, module assessments, initial pathway review and content submissions. |
| Employee | 9 | Manage a profile, complete assessments, review role guidance and competency gaps, follow pathways, learn individual skills and track progress. |
| System | 11 | Authenticate/authorize; process payments; provision workspaces; maintain entitlements; evaluate assessments; update competencies/gaps; generate guidance and pathways; aggregate development/ROI; send emails; record activity. |
| **Total** | **48** | **System is an automated performer, not a seventh human actor.** |

## Implemented Account Policy

The approved 2026-10-28 account policy supplements the source requirements; it is not an additional Version 2 functional bullet:

- Each activated account has one effective role. Role changes replace it; platform authority cannot be combined with organization membership.
- Platform Administrator is seeded from private environment configuration and uses password-only login without email verification or MFA. No default password or public self-promotion endpoint is supplied.
- Organization Administrator retains email verification and MFA. Invited Employee, Expert and L&D Manager accounts activate using their email link and then sign in without MFA.
- Trusted stored role determines workspace entry. Employee assignment/seat checks, organization isolation and last-administrator protection remain enforced.

See [implementation and seed operation](ARCHITECTURE.md#single-role-identity-and-platform-seed-2026-10-28) and [verification/manual checks](testing/system/REQ-037-single-role-activation.md).

## Functional Requirement Distribution

Each link resolves to one nine-field requirement record. A requirement spanning multiple capabilities is kept together as one source bullet rather than duplicated in several domains.

| Requirement ID | Actor | Version 2 requirement | Owning domain |
| --- | --- | --- | --- |
| [FR-01.01](features/Organization%20onboarding/README.md#fr-01-01) | Guest | Register an organization | Organization onboarding |
| [FR-01.02](features/Subscription%20lifecycle/README.md#fr-01-02) | Guest | Select a subscription | Subscription lifecycle |
| [FR-01.03](features/Subscription%20lifecycle/README.md#fr-01-03) | Guest | Pay for a subscription | Subscription lifecycle |
| [FR-01.04](features/Organization%20onboarding/README.md#fr-01-04) | Guest | Track onboarding and access the workspace | Organization onboarding |
| [FR-02.01](features/Platform%20administration/README.md#fr-02-01) | Platform Administrator | Manage organizations | Platform administration |
| [FR-02.02](features/Subscription%20lifecycle/README.md#fr-02-02) | Platform Administrator | Configure subscriptions | Subscription lifecycle |
| [FR-02.03](features/Platform%20administration/README.md#fr-02-03) | Platform Administrator | Monitor platform activity | Platform administration |
| [FR-03.01](features/Workspace%20administration/README.md#fr-03-01) | System Administrator | Manage user accounts | Workspace administration |
| [FR-03.02](features/Departments%20and%20occupations/README.md#fr-03-02) | System Administrator | Manage departments | Departments and job positions |
| [FR-03.03](features/Workspace%20administration/README.md#fr-03-03) | System Administrator | Manage roles and permissions | Workspace administration |
| [FR-03.04](features/Workspace%20administration/README.md#fr-03-04) | System Administrator | Manage system configuration | Workspace administration |
| [FR-03.05](features/Workspace%20administration/README.md#fr-03-05) | System Administrator | Monitor system activity | Workspace administration |
| [FR-03.06](features/Subscription%20lifecycle/README.md#fr-03-06) | System Administrator | Manage organization subscription | Subscription lifecycle |
| [FR-04.01](features/Departments%20and%20occupations/README.md#fr-04-01) | L&D Manager | Manage job positions | Departments and job positions |
| [FR-04.02](features/Departments%20and%20occupations/README.md#fr-04-02) | L&D Manager | Assign Experts | Departments and job positions |
| [FR-04.03](features/Role%20catalog/README.md#fr-04-03) | L&D Manager | Manage target roles | Role catalog |
| [FR-04.04](features/Role%20catalog/README.md#fr-04-04) | L&D Manager | Manage target role publication | Role catalog |
| [FR-04.05](features/Assessment%20workflows/README.md#fr-04-05) | L&D Manager | Manage baseline assessment configuration | Assessment workflows |
| [FR-04.06](features/Learning%20catalog/README.md#fr-04-06) | L&D Manager | Approve learning offerings | Learning catalog |
| [FR-04.07](features/Development%20reporting/README.md#fr-04-07) | L&D Manager | Monitor employee development | Development reporting |
| [FR-05.01](features/Learning%20catalog/README.md#fr-05-01) | Expert | Manage micro-skills | Learning catalog |
| [FR-05.02](features/Role%20catalog/README.md#fr-05-02) | Expert | Manage role competency requirements | Role catalog |
| [FR-05.03](features/Role%20catalog/README.md#fr-05-03) | Expert | Submit completed target role configurations | Role catalog |
| [FR-05.04](features/Learning%20catalog/README.md#fr-05-04) | Expert | Manage skill prerequisites | Learning catalog |
| [FR-05.05](features/Learning%20catalog/README.md#fr-05-05) | Expert | Manage learning modules | Learning catalog |
| [FR-05.06](features/Assessment%20workflows/README.md#fr-05-06) | Expert | Manage module assessments | Assessment workflows |
| [FR-05.07](features/Pathway%20review/README.md#fr-05-07) | Expert | Review initial learning pathways | Pathway review |
| [FR-05.08](features/Learning%20catalog/README.md#fr-05-08) | Expert | Submit content for approval | Learning catalog |
| [FR-06.01](features/Employee%20experience/README.md#fr-06-01) | Employee | Manage personal profile | Employee experience |
| [FR-06.02](features/Assessment%20workflows/README.md#fr-06-02) | Employee | Complete baseline assessment | Assessment workflows |
| [FR-06.03](features/Assessment%20workflows/README.md#fr-06-03) | Employee | Complete RIASEC assessment | Assessment workflows |
| [FR-06.04](features/Role%20guidance/README.md#fr-06-04) | Employee | Review target role guidance | Role guidance |
| [FR-06.05](features/Employee%20experience/README.md#fr-06-05) | Employee | Review competency profile and gaps | Employee experience |
| [FR-06.06](features/Employee%20experience/README.md#fr-06-06) | Employee | Follow a learning pathway | Employee experience |
| [FR-06.07](features/Employee%20experience/README.md#fr-06-07) | Employee | Learn an individual skill | Employee experience |
| [FR-06.08](features/Assessment%20workflows/README.md#fr-06-08) | Employee | Complete learning and assessments | Assessment workflows |
| [FR-06.09](features/Employee%20experience/README.md#fr-06-09) | Employee | Track learning progress | Employee experience |
| [FR-07.01](features/Workspace%20administration/README.md#fr-07-01) | System | Authenticate users and authorize access | Workspace administration |
| [FR-07.02](features/Subscription%20lifecycle/README.md#fr-07-02) | System | Process subscription payments | Subscription lifecycle |
| [FR-07.03](features/Organization%20onboarding/README.md#fr-07-03) | System | Provision organization workspaces | Organization onboarding |
| [FR-07.04](features/Subscription%20lifecycle/README.md#fr-07-04) | System | Maintain subscription entitlements | Subscription lifecycle |
| [FR-07.05](features/Assessment%20workflows/README.md#fr-07-05) | System | Generate and evaluate assessments | Assessment workflows |
| [FR-07.06](features/Adaptive%20engine/README.md#fr-07-06) | System | Update competency profiles and gaps | Adaptive engine |
| [FR-07.07](features/Role%20guidance/README.md#fr-07-07) | System | Generate target role guidance | Role guidance |
| [FR-07.08](features/Adaptive%20engine/README.md#fr-07-08) | System | Generate and adapt learning pathways | Adaptive engine |
| [FR-07.09](features/Development%20reporting/README.md#fr-07-09) | System | Generate development summaries and ROI | Development reporting |
| [FR-07.10](features/Notifications%20and%20audit/README.md#fr-07-10) | System | Send email notifications | Notifications and audit |
| [FR-07.11](features/Notifications%20and%20audit/README.md#fr-07-11) | System | Record system activity | Notifications and audit |

## Detail and Scope Boundaries

- Domain records use Requirement ID, Requirement Name, Description, Actor, Preconditions, Main Flow, Alternative / Exception Flows, Postconditions and Acceptance Criteria.
- Names, descriptions and actors come from Version 2. Unaffected unspecified fields remain blank. Confirmed assessment/pathway decisions populate their affected contracts; implemented, partial and unverified status is separately described rather than inferred from a requirement statement.
- The [feature index](features/README.md#reading-rules) defines stable FR identifiers and legacy REQ traceability. Old IDs are references, not extra requirements or fresh certification of historical tests.
- Non-functional targets, architecture, research evaluation, work packages and delivery history are outside this functional overview. They remain in the source or their dedicated documents, not duplicated as functional requirements.
- This documentation reconciliation does not change application code, schemas, historical test evidence or runtime behavior.
