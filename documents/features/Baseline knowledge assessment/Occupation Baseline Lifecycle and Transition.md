# Occupation Baseline Lifecycle and Transition

**Current23 October2026:** full-Occupation slices1-5 and V20-V23 are implemented locally; read-only live V1-V23 checksums match. [Local demo exception](Local%20Demo%20Flow.md) bypasses owner readiness only under explicit profile/property/!prod; production dependencies remain open. [Current schema/review](../../testing/system/REQ-002-memory-schema-sync.md); [actual operations/limits](../../testing/system/REQ-002-local-demo.md). Browser/executable/numerical acceptance remains open; no history reset/repin.

## Scope and authority

22 October 2026; Cluster 1 design for REQ-002-F01/F02 and adaptive-baseline REQ-009-F01/F02. Confirmed rules are in [Configure](Configure%20Baseline%20Assessment.md) and [Complete](Complete%20Baseline%20Assessment.md). Recommendations below are **approved for Cluster 2 implementation in slices**. Historical starting inventory: runtime baseline618d772/migrations throughV19; current uncommitted source retains V20–V22. This is not a claim about the user's live database.

One organization+Occupation has one stable Blueprint, immutable versions and at most one open Draft/Active. Every new attempt uses the full deduplicated active-role skill/item union and one bounds pair. Role A/B are not separate tests/allowances. “Full” means Occupation scope and minimum skill coverage; adaptive may stop before maximum, without exhausting the bank.

## Recommended decisions — all Approved design

| ID | Recommendation | Reason / approval boundary |
| --- | --- | --- |
| OB-P01 | Derive version status from current pointer and pinned IN_PROGRESS count; do not persist Retiring/Inactive separately | Avoid duplicate availability truth and worker/status races |
| OB-P02 | List Draft/version rows grouped by stable Occupation Blueprint; Draft key=working ID, version key=Blueprint ID+version; display type/name/Occupation/status/labeled date | Four filters without pretending versions are separate baselines |
| OB-P03 | Literal case-insensitive saved-name search; sort Draft.updatedAt or version.createdAt, labeled Updated/Activated; default newest first with stable type/ID tie-breaker | Versions are created during activation; Employee completion must not change their sorting |
| OB-P04 | Server pagination, default 20/max 100; authorize/filter/order before paging and totals | Bounded results; approved target values; runtime availability remains slice-dependent |
| OB-P05 | Reactivate only through new Draft/revalidation/new version | Avoid stale-snapshot activation |
| OB-P06 | Preview the saved Draft/revision; FE enables Activate after a successful preview of that unchanged saved revision; no persisted preview token/history | Reload/edit/refresh invalidates local preview; server always revalidates, never trusts client success |
| OB-P07 | Server-owned full-Occupation discriminator plus dual historical readers; new admission requires full-Occupation version | No silent conversion of old Role/exploration snapshots |
| OB-P08 | L&D explicitly confirms a new single Occupation bounds pair; no sum/average/default from old per-Role values | No inferred question/time budget |
| OB-P09 | Server no-op Save checks stale revision first, then stores a receipt referencing unchanged revision without config/history change | FE normally sends no unchanged Save; direct/retried requests remain deterministic |
| OB-P10 | PostgreSQL historical list without Catalog; readiness separate; Deactivate needs authorization/current revision/reason, not fresh Catalog/items | Dependency failure should not prevent stopping starts |

**Confirmed limits:** name at most 100 Unicode characters after trimming. Total whole-second duration must be between 30 * maxQuestions and 120 * maxQuestions, inclusive. The 30-120-second rate is a calculator/total-budget constraint, not a per-question timeout. Retain nearest-whole-second conversion and show the effective total; no blank fallback. Legacy snapshots retain their original name/bounds.

## Source → processing → storage → output

Authorized Catalog Occupation/active-role union -> PostgreSQL published-item/complete-parameter intersection -> deduplicate stable skill/item-version IDs -> check every union skill's pinned minimum evidence -> validate common maximum against coverage/model/capacity -> save -> preview -> activate immutable version -> pin individual attempt -> safe result/history. Never shrink skill union to make a small maximum feasible; report missing skill/item/parameter coverage instead.

Example: Role A uses S1/S2 and Role B uses S2/S3. Scope is S1/S2/S3, one maximum/duration; S2 contributes once. With a versioned minimum 3 answers/skill, maximum below 9 is infeasible even with 12 eligible items. These numbers explain the constraint; they are not seed/test truth or new numerical policy. Completion closes the Employee+Occupation allowance, not proof that every Role threshold is achieved.

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

## Approved API ownership

Keep route families where practical. The table gives the approved completed target; implementation is staged. Slices 1–3 expose common Save, explicit conversion, saved-revision Preview, full-union admission, confirmed activation/deactivation and management list under the existing local/demo/non-prod gates. Slices 4–5 now consume these contracts; interactive browser verification remains pending. Legacy aliases map to one use case or are explicitly retired; no duplicate handlers.

| Operation | Client input | Server result/rule |
| --- | --- | --- |
| Workspace/readiness | Authorized occupationId | Identity, sole Draft/current, safe capacity/model coverage bounds, activation revision, scope policy/readiness |
| List | Search/status/date direction/page, optional authorized Occupation | Row ID/name/Occupation/type/version/status/labeled date; scoped total/page metadata |
| Save | expectedRevision/key; configuration={name, occupationBounds:{maxQuestions,timeLimitSeconds}} | Normalized config, working ID/revision/time/no-op result; no Role/exploration map |
| Convert legacy Draft | workingRevisionId/expectedWorkingRevision/key; explicit new common configuration | POST /working/convert; archive original content/creation audit, new ID/revision 1 and CONVERT receipt retaining both snapshots, atomically; no activation |
| Preview | Saved working ID+expected revision | Safe feasibility/sample/shortages; no writes or answer/correctness/rationale/parameters |
| Activate | Draft ID/revision, expected activation revision, expected current version or explicit none, key | Immutable version+activation; changed replacement target conflicts |
| Deactivate | Confirmed current version/revision, reason/key | No start current; safe former-version projection |
| Employee start | Existing SELECTED_ROLE entry or authorized Occupation+key | Same full union/pair; server-derived role only as provenance |
| Own result/history | Owned attempt ID/existing scope | Recorded scope/skill snapshots; public legacy/full distinction, no internal pins |

Client cannot edit actor/tenant/learner, format policy, timestamps, pins, correctness/mastery or counts/status. Reject mixed old/new config rather than drop fields. Preserve old command hash/receipt decoding for replay; use a new contract/hash namespace for new semantics, never reinterpret a retained key/body.

**Historical remaining-slice-1 wire checkpoint (superseded for activation/no-op by slices 2–3 below):** existing base `/api/v1/ld/adaptive-baseline-blueprints/occupations/{occupationId}`. PUT `/working` accepts the common shape; POST `/test` accepts only `{workingRevisionId,expectedWorkingRevision}`; POST `/working/convert` additionally accepts the new configuration and Idempotency-Key. Full-format response configuration contains only name/occupationBounds; historical responses retain name/exploration/roles. The full command canonical fields include `FULL-OCCUPATION-COMMAND-V2`; legacy SAVE canonical fields are unchanged. New legacy writes are rejected after receipt lookup. A successful unchanged Save still revises until the approved slice-3 no-op implementation. Fresh `/finalize` is temporarily blocked pending slice-2 admission, rather than exposing a new version to the old Role resolver; retained receipts still replay. FE adaptation is pending.

## Admission, atomicity and concurrency

- Resume/allowance/ownership checks precede current readiness. A completed legacy Role-scoped baseline still consumes its existing Employee+Occupation allowance; this preserves history, not a claim it originally covered the full Occupation.
- Approved design new-start protocol: authorize, serialize existing actor/learner/scope coordination, check replay/completion/active attempt. Only for a genuinely new attempt, hold a shared activation-row lock through re-read/current-format/readiness validation and insertion of attempt/pool/skill state/first item/receipt.
- Activate/Deactivate hold an exclusive lock on that same scope. Start either pins before the switch or sees the new state after it; no old-version start after Deactivate wins. Validate confirmed previous current and Draft after locking; unique constraints remain final cardinality guards.
- Management must not acquire learner/attempt row locks after activation merely to count Retiring attempts; counts are read projections. Answer/finalizer/worker do not require activation locks. Slices 2–3 inspected and adapted JdbcAdaptiveAttempt coordination: actor and active-attempt locks first, learner provenance lock, shared scope advisory plus activation-row lock only for a new attempt; management never locks learner rows for counts.
- An absent activation row needs serialized scope creation; locking a missing row is insufficient. Cross-store readiness uses before/after catalog/version fingerprints, not a distributed ACID claim. Drift rolls back/conflicts.
- Preview reserves nothing. Exact key/body replays after authorization; stale/mismatched requests conflict. Pointer/version/Draft-close/audit/receipt changes are atomic. Pending UI locks synchronously and obtains fresh replacement confirmation when current changes.

## Approved forward migration and rollout - applied locally through V23

1. Inventory config/pool/JSON/SQL/trigger/API/FE/seed/test consumers. Add server-owned scope marker: null/legacy means historical role/exploration; new full-Occupation versions explicitly use new marker and single pair. Add conditional shape/field/FK/trigger checks and dual readers; [Data architecture](Adaptive%20Baseline%20Data%20Architecture.md) names affected tables. Do not rewrite old values/pins/pools/responses/results. Metadata defaults must not imply historical full scope.
2. Preserve legacy Draft content. An explicit Update baseline configuration action closes/archives it with audit and creates the sole new-format Draft in one scope transaction. Carry name/context only; an old exploration pair may be shown as unconfirmed suggestion but requires explicit L&D input/save. No per-Role aggregation. Conversion command/receipt is itself Approved design.
3. At new-flow cutover, block new starts on old-format current with actionable update reason. No fallback to Role sampling or silent reuse of old exploration bounds. Resume/answer/submit/worker/history retain dual readers. Activate a validated new-format Draft to reopen starts. Do not reset reported Role A completion or its allowance.
4. Inspect actual migration inventory before choosing the next unused number (currently latest V23, verified23 October2026). Never edit applied V18/V19. Roll out one intended admission policy across instances and gate starts during upgrade; old binaries must not start old-role attempts after cutover or read new rows incorrectly. Production deny-by-default and existing local/demo gates remain.
5. Rollback disables new starts and retains data. A compatible dual-reader binary must finish/read both formats; do not downgrade to a role-only binary after new rows exist, down-migrate, reseed volumes or reactivate old config to bypass admission. Keep event/receipt identities; durable outbox is not REQ-041 delivery.

## Historical transition inventory at618d772 - changes now implemented locally

| Surface | Disposition | Required alignment |
| --- | --- | --- |
| Actor/organization/Occupation isolation, stable identity, sole Draft | Keep | Extend boundaries to list/new commands |
| AdaptiveBlueprint.Configuration/API exploration+roles; FE bounds rows | Migrate | One pair; historical readers isolated |
| AdaptiveAttemptSnapshot/starting context role skills/bounds | Migrate | Full union for all new starts, old pins retain original scope |
| V18 config constraints/version-role insert/immutability triggers | Compatible extension | Conditional new-format checks, no historical UPDATE/drop |
| V19 purpose/bounds/pool-scope checks/reconstruction | Compatible extension | Pinned policy branch, preserve ownership/allowance/deadline |
| JdbcAdaptiveAttemptResultQuery role-filtered skill-name lookup | Migrate | New result skill names come from pinned union; legacy keeps role restriction |
| Finalize/Disable and activation events | Compatible extension | Expected replacement target/list/projection; renaming alone insufficient |
| Save always revises, invalid Save disabled | Migrate | No-op server/UI and field feedback, exact pending retry |
| B8 result/guard, B9 hook/API/timer | Keep/extend | Own-terminal safety, real active guard, public scope display |
| Fixed shared baseline generation/answer reveal | Deprecate for new flow | Keep generic/legacy artifacts until separately approved removal |
| Gated seeds/fakes/localStorage module/RIASEC/downstream consumers | Retain/separate follow-up | No production truth, completion reset or scope expansion |

## Dependencies and review gate

Identity/authorization and authoritative Catalog/release/publication remain external. Employee-authorized Occupation discovery is missing; never reuse L&D discovery/infer client membership. REQ-001 selection/guard is a dependency, not permission to redesign it. REQ-041 delivery, RIASEC/calibration owner UI, gap/pathway migration are outside this scope.

Acceptance: AB-C01–C20, AB-A01–A11 and AB-R01–R05 in [test plan](../../testing/REQ-002-adaptive-baseline-test-plan.md). Approved implementation sequence: schema/dual readers/admission compatibility -> common config/domain/API/pool -> management list/lifecycle -> form -> result/history. Each slice stays buildable with pinned attempts preserved. Cluster 2 only compile/build/manual smoke; Cluster 3 executable tests require separate approval.

**Confirmed:** product/security/history/allowance rules. **Confirmed design:** OB-P01–P10, API/list/preview/lock/migration/conversion/admission/rollback. **Provisional:** local/demo adapters and numerical constants. **Open:** production dependencies and numerical validation. **Rejected:** inferred Role aggregation, historical relabel/rescore/reset, two Active versions, persistent preview or unapproved scope expansion/commit/push.

## Slices 2–3 implemented API and transaction contract — 2026-10-22

- `GET /api/v1/ld/adaptive-baseline-blueprints`: `search` (trimmed, literal case-insensitive saved name), optional `status=DRAFT|ACTIVE|RETIRING|INACTIVE`, `direction=NEWEST|OLDEST`, zero-based `page`, `size` default20/max100 and optional authorized `occupationId`. Returns rows/total/page/size from one read-only repeatable-read PostgreSQL snapshot; tenant/grants/filtering precede totals/paging. Stable ties use type/Blueprint/working ID/version. Rows group by stable Blueprint ID; Draft key is working ID, version key is Blueprint ID+version. Draft `revision` is its working revision; version `revision` is activation revision. List exposes no Employee IDs or response/mastery data and does not claim live Catalog readiness.
- Row date is Draft.updatedAt (`UPDATED`) or immutable version.createdAt (`ACTIVATED`); completion does not reorder versions. Status is OPEN→Draft, current→Active, noncurrent with IN_PROGRESS→Retiring, otherwise Inactive. Expired IN_PROGRESS still counts until actual finalization. SQL failure is unavailable, never an invented zero. Occupation label comes from persisted version snapshots; a Draft with no version/name snapshot returns its recorded Occupation ID as the label, without a Catalog dependency or fabricated name.
- Under `/occupations/{occupationId}`, fresh `PUT /working` with positive `expectedRevision` also requires `expectedWorkingRevisionId`. This closes the old-Draft/new-Draft revision1 ABA race before no-op comparison. Creation uses expectedRevision0 and no working ID. Normalized unchanged config produces `noOp:true`, original revision/time and only a new immutable receipt. The request hash adds `DRAFT-IDENTITY-CAS-V2` only when the ID is present; previously issued hashes and receipt results remain replayable. Old positive-revision shapes are replay-only.
- Fresh `POST /finalize` and `/disable` require the `expectedCurrent` property: a version pair `{blueprintId,version}` or explicit null for no current. Omission retains the old canonical hash solely for authorized historical replay. New canonical fields add `OCCUPATION-LIFECYCLE-V2` and the confirmed pair/NONE. Draft identity/revision, activation revision and current pair are checked under the scope/activation lock. Deactivate also requires its nonblank reason and an actual current. A closed/inactive version cannot be directly reactivated: save/revalidate a new Draft and activate a new immutable version.
- Workspace `admissionReadiness` is `NO_ACTIVE`, `CONFIGURATION_UPDATE_REQUIRED`, `BLUEPRINT_STALE`, `INFEASIBLE` or `READY`; current status stays independent. New-start legacy gate returns409 `CONFIGURATION_UPDATE_REQUIRED` with an actionable explanation. The Employee wire target still accepts SELECTED_ROLE or OCCUPATION_EXPLORATION; role/selection are provenance only for new full-format snapshots. No client policy/pool/budget/pins are accepted.
- Trusted L&D actor and server Occupation grants are reauthorized before receipts; list/Deactivate/no-op/replay do not need Catalog. New/changed Save, Preview, Activate and genuinely new starts still revalidate dependencies. Existing configured local/demo grants remain TMP-REQ002-07/08, deny-by-default and excluded from prod. Selected-role scope discovery still needs its authoritative Catalog source; owned GET, known receipt scope and explicit authorized Occupation avoid that discovery dependency.
- A new start holds the same scope advisory key **shared** (including missing activation-row coordination) and activation row FOR SHARE through pool/skill/first-item/receipt commit. Management holds that advisory key exclusive, then identity and activation FOR UPDATE; it never takes learner/attempt locks to count status. Resume/completed allowance/receipt replay avoid current activation/readiness. Before/after Catalog/eligibility and snapshot rechecks detect drift around policy/content reads; this is not distributed ACID. Full rows explicitly persist scope_policy; readers check exact pins/bounds/policy, while NULL historical policy retains original role/exploration meaning. No schema, seed backfill or historical rewrite accompanies these slices.

## Slices 4–5 implemented client and result contract — 2026-10-22

- Manager directory reads the authorized PostgreSQL list directly: debounced saved-name search, status, date direction and pagination20. Optional authorized Occupation discovery opens separately; its Catalog failure does not suppress historical list/confirmed direct Deactivate. Availability and live admission readiness remain distinct. Missing capacity is unavailable, never zero.
- New/common editing exposes only trimmed name (<=100 Unicode code points), one maximum and a total-time/seconds-per-question calculator. Last edited duration field drives calculation, nearest whole second is submitted, and clearing a field never silently restores a default. An initial editable60-second rate is a UI suggestion, not a server policy/seed. Coverage/model/capacity and30..120 seconds per maximum are checked with field errors plus a linked, focused error summary after submit. Legacy Draft bounds are read-only references; explicit conversion creates a new Draft ID and does not infer a common pair or alter its historical content.
- Save sends name/occupationBounds plus returned Draft ID/revision and idempotency key. Semantically unchanged saved values disable Save and the hook makes no request. Preview sends saved ID/revision only; edits, refresh and commands invalidate the local preview. Activate requires that exact saved revision's feasible preview. Confirmation captures current pair/none and activation/Draft revisions; stale targets require refreshed review. Cancel makes no command.
- Unknown write outcomes retain exact payload/key; synchronous locks prevent duplicate submission. Once write success is known, recovery retries GET only. A successful write followed by Catalog/workspace failure permits return to the PostgreSQL directory. Discard confirmation covers dirty workspace back/refresh; reload has beforeunload protection. Unrelated shell navigation is not a general route blocker and remains a browser-review limitation.
- Public attempt/result DTO adds assessmentScope: OCCUPATION for full policy, EARLIER_ROLE for legacy with a Role, EARLIER_OCCUPATION for legacy without one. These public labels derive only from recorded policy/provenance; the internal scope_policy, technical pins and protected scoring inputs are not disclosed. Role is provenance, never a full-result skill filter.
- Result SQL preserves organization+learner+active Employee predicates and pinned version joins. Full-policy skill names resolve across the entire immutable version union; legacy Role reads retain the original Role predicate. Missing names, ambiguous full-union name/version snapshots or inconsistent scope/result projection fail dependency503, without substituting current Catalog names or fabricated scores.
- History remains unpaged and returns terminal attempts by finished_at DESC, attempt_id, skill ID. UI labels completion date and original scope/optional Role, separates raw score from conservative skill mastery/confidence, and links owned invalidated predecessor/replacement. INVALIDATED carries null raw score and no skill evidence. GET never finalizes or writes; existing no-store and one-success allowance remain.
- Both actors reuse PageHeader/cards/typography and a shared LoadingCard. Shared Pagination accepts translated labels; Dialog accepts a translated close label and adds focus entry/trap/restore. Existing tokens/fonts remain. Actual keyboard, responsive layout, modal focus and EN/VI rendering require the linked manual browser checklist; source/build and live API observations do not prove them.

No schema, migration, graph, seeder, historical receipt format, numerical policy or REQ-041 delivery change belongs to slices4–5. Production Identity/Catalog/grants and history pagination/retention remain separate dependencies. See [bounded evidence and browser checklist](../../testing/system/REQ-002-F02-REQ-009-occupation-ui-results.md).
