# Occupation Baseline Lifecycle and Transition

## Scope

Design for REQ-002-F01/F02 and protected result/history reads. [Role-to-baseline](../Target%20role%20selection/Role%20Selection%20and%20Occupation%20Baseline.md), [Configure](Configure%20Baseline%20Assessment.md) and [Complete](Complete%20Baseline%20Assessment.md) define the confirmed behavior. One organization+Occupation has one stable Blueprint, one open Draft and one Active version; all new attempts use the deduplicated full skill/item union and one bounds pair.

## Lifecycle rules

| ID | Rule | Reason / approval boundary |
| --- | --- | --- |
| OB-P01 | Derive version status from current pointer and pinned IN_PROGRESS count; do not persist Retiring/Inactive separately | Avoid duplicate availability truth and worker/status races |
| OB-P02 | List Draft/version rows grouped by stable Occupation Blueprint; Draft key=working ID, version key=Blueprint ID+version; display type/name/Occupation/status/labeled date | Four filters without pretending versions are separate baselines |
| OB-P03 | Literal case-insensitive saved-name search; sort Draft.updatedAt or version.createdAt, labeled Updated/Activated; default newest first with stable type/ID tie-breaker | Versions are created during activation; Employee completion must not change their sorting |
| OB-P04 | Server pagination, default 20/max 100; authorize/filter/order before paging and totals | Bounded results; confirmed values; bounded authorized pagination |
| OB-P05 | Reactivate only through new Draft/revalidation/new version | Avoid stale-snapshot activation |
| OB-P06 | Preview the saved Draft/revision; FE enables Activate after a successful preview of that unchanged saved revision; no persisted preview token/history | Reload/edit/refresh invalidates local preview; server always revalidates, never trusts client success |
| OB-P07 | Server-owned full-Occupation discriminator plus dual historical readers; new admission requires full-Occupation version | No silent conversion of old Role/exploration snapshots |
| OB-P08 | L&D explicitly confirms a new single Occupation bounds pair; no sum/average/default from old per-Role values | No inferred question/time budget |
| OB-P09 | Server no-op Save checks stale revision first, then stores a receipt referencing unchanged revision without config/history change | FE normally sends no unchanged Save; direct/retried requests remain deterministic |
| OB-P10 | PostgreSQL historical list without Catalog; readiness separate; Deactivate needs authorization/current revision/reason, not fresh Catalog/items | Dependency failure should not prevent stopping starts |

**Confirmed limits:** name at most 100 Unicode characters after trimming. Total whole-second duration must be between 30 * maxQuestions and 120 * maxQuestions, inclusive. The 30-120-second rate is a calculator/total-budget constraint, not a per-question timeout. Retain nearest-whole-second conversion and show the effective total; no blank fallback. Legacy snapshots retain their original name/bounds.

## Status/query semantics

Approved design projection from one authorized PostgreSQL read snapshot:

~~~text
OPEN working row                                -> Draft
version == current                              -> Active
version != current && pinned IN_PROGRESS > 0     -> Retiring
version != current && pinned IN_PROGRESS == 0    -> Inactive
~~~

Availability status and readiness are distinct. Legacy-format current or catalog-stale Active displays “Update required / New starts unavailable”, not false Inactive. Expired attempts remain IN_PROGRESS until real finalization; GET/time passage never fabricate completion. Last terminal transition makes Retiring project Inactive on next read without a new status-write worker. Missing counts mean unavailable, not zero.

List/status/count reads expose no learner IDs/responses/mastery/protected data and write no receipts/events/finalizations. Apply tenant filters before counts. Approved design page reads use consistent snapshots and deterministic sorting; separate pages are not a frozen export.

## API, transaction and retry contract

- `GET /api/v1/ld/adaptive-baseline-blueprints`: `search` (trimmed, literal case-insensitive saved name), optional `status=DRAFT|ACTIVE|RETIRING|INACTIVE`, `direction=NEWEST|OLDEST`, zero-based `page`, `size` default20/max100 and optional authorized `occupationId`. Returns rows/total/page/size from one read-only repeatable-read PostgreSQL snapshot; tenant/grants/filtering precede totals/paging. Stable ties use type/Blueprint/working ID/version. Rows group by stable Blueprint ID; Draft key is working ID, version key is Blueprint ID+version. Draft `revision` is its working revision; version `revision` is activation revision. List exposes no Employee IDs or response/mastery data and does not claim live Catalog readiness.
- Row date is Draft.updatedAt (`UPDATED`) or immutable version.createdAt (`ACTIVATED`); completion does not reorder versions. Status is OPEN→Draft, current→Active, noncurrent with IN_PROGRESS→Retiring, otherwise Inactive. Expired IN_PROGRESS still counts until actual finalization. SQL failure is unavailable, never an invented zero. Occupation label comes from persisted version snapshots; a Draft with no version/name snapshot returns its recorded Occupation ID as the label, without a Catalog dependency or fabricated name.
- Under `/occupations/{occupationId}`, fresh `PUT /working` with positive `expectedRevision` also requires `expectedWorkingRevisionId`. This closes the old-Draft/new-Draft revision1 ABA race before no-op comparison. Creation uses expectedRevision0 and no working ID. Normalized unchanged config produces `noOp:true`, original revision/time and only a new immutable receipt. The request hash adds `DRAFT-IDENTITY-CAS-V2` only when the ID is present; previously issued hashes and receipt results remain replayable. Old positive-revision shapes are replay-only.
- Fresh `POST /finalize` and `/disable` require the `expectedCurrent` property: a version pair `{blueprintId,version}` or explicit null for no current. Omission retains the old canonical hash solely for authorized historical replay. New canonical fields add `OCCUPATION-LIFECYCLE-V2` and the confirmed pair/NONE. Draft identity/revision, activation revision and current pair are checked under the scope/activation lock. Deactivate also requires its nonblank reason and an actual current. A closed/inactive version cannot be directly reactivated: save/revalidate a new Draft and activate a new immutable version.
- Workspace `admissionReadiness` is `NO_ACTIVE`, `CONFIGURATION_UPDATE_REQUIRED`, `BLUEPRINT_STALE`, `INFEASIBLE` or `READY`; current status stays independent. New-start legacy gate returns409 `CONFIGURATION_UPDATE_REQUIRED` with an actionable explanation. New Employee entry accepts SELECTED_ROLE; historical exploration provenance remains readable. No client policy/pool/budget/pins are accepted.
- A new start holds the same scope advisory key **shared** (including missing activation-row coordination) and activation row FOR SHARE through pool/skill/first-item/receipt commit. Management holds that advisory key exclusive, then identity and activation FOR UPDATE; it never takes learner/attempt locks to count status. Resume/completed allowance/receipt replay avoid current activation/readiness. Before/after Catalog/eligibility and snapshot rechecks detect drift around policy/content reads; this is not distributed ACID. Full rows explicitly persist scope_policy; readers check exact pins/bounds/policy, while NULL historical policy retains original role/exploration meaning. Historical pins and receipts are immutable.

- Selected-version GET resolves its exact Blueprint/version and safe saved settings, even if current readiness fails. Draft reads bind their own ID/revision. Save cannot mutate a released version.
- Confirmed Draft discard binds expected ID/revision and exact key/body, closes it as ABANDONED and releases the working registry in one transaction with an immutable DISCARD receipt. Retry replays the outcome; stale deletion conflicts. Cancel unsaved editing sends no command.
- Role selection and attempt start serialize on the same learner coordination boundary. Active assessment blocks a different Role; lifecycle dependency failure rolls back selection/pathway changes.
- Existing profile coverage uses its original required skill set/version. New learners pin the Active version; linked replacement retains the original invalidated chain's pool/version/snapshot. Neither activation nor current catalog updates rewrite existing bindings.
- Finalization commits genuine sufficient mastery/result/evidence and profile initialization atomically at the profile boundary. Early insufficient manual submission is terminal INVALIDATED/MANUAL, with no mastery/profile. Outbox delivery remains a separate processing obligation.

## Client and protected read contract

Directory uses saved-name search, status, date direction and authorized paging. Occupation discovery/readiness failure does not suppress historical records or authorized direct Deactivate. Missing capacity/counts are unavailable, never zero. One working form uses shared typography/tokens/components and EN/VI semantics. Selected-record state cannot leak another Draft's values. Pending writes retain exact body/key with synchronous submission locks; known success followed by read failure retries GET only.

Preview binds saved ID/revision and becomes invalid after edit/refresh/commands. Activation requires that unchanged revision's feasible Preview and confirms the observed current pair. Preview is ephemeral and reserves nothing; server always revalidates.

Result `assessmentScope` derives from recorded policy/provenance: OCCUPATION, EARLIER_ROLE or EARLIER_OCCUPATION. Full-scope skill names resolve from immutable union snapshots; historical names retain the old scope. Missing/ambiguous snapshots fail dependency checks instead of using current Catalog. Own terminal history sorts finished_at descending with stable attempt/skill ties; invalidated attempts have no raw score/mastery evidence. Reads are no-store and never finalize, save or mark delivery.

## Compatibility and rollback

Historical Role/exploration JSON, bounds, purpose, pools, responses, results, receipts and allowance retain their original meaning. Explicit legacy Draft conversion requires a new common configuration; it closes the old row without rewriting its content/creation audit and creates the sole new Draft with a CONVERT receipt. Old-format current configurations block new admission with an update-required reason; historical attempts remain resumable/readable.

Migrations are forward-only. During mixed deployment, gate new admission until all readers understand both formats. Rollback stops new starts and uses compatible readers to finish/read pinned history; no down migration, reset, automatic old-version reactivation or Role-only binary after new-format data exists.

## Acceptance and dependencies

AB-C01–C20/AB-A01–A11/AB-R01–R05 in the [adaptive plan](../../testing/REQ-002-adaptive-baseline-test-plan.md) and RB/VB in the [Role plan](../../testing/REQ-001-002-role-baseline-flow-test-plan.md) cover query isolation/no-write, feasibility, CAS/replay/races/rollback and retained pins. [Current implementation/evidence](../../testing/system/REQ-001-002-final-synchronization-review.md) is separate.

Confirmed | Provisional: exact numerical constants | Open: Identity/catalog/profile/pathway owner integration and numerical validation | Rejected: inferred Role aggregation, history rewrite, duplicate Active state or persistent Preview.
