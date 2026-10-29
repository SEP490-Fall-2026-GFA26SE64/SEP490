# Initial gap-to-pathway flow and data design

**Current contract consolidated:** 2026-10-29. **Source inspected:** product cced745. Sections1–8 are the current shared design, including the confirmed Expert adjacent moves and neutral removal. Sections9–18 retain dated design/implementation history and existing link anchors; their old source-only, unapplied-migration, no-reorder and pending-runtime statements are historical, not the current contract. Detailed dated verification stays in the [workspace receipt](../../../testing/system/REQ-002-041-042-workspace-integration.md).

## 1. Product goal, example and Function boundaries

An Employee selects a target Role and its member Level, completes a genuine full-Occupation baseline when required, reviews own gaps and explicitly confirms generation. An assigned Expert inspects and edits the proposal, Checks it, previews Roadmap/Timeline and finally confirms the exact valid revision. Employee display then uses that same approved order. Learning execution is a separate owner integration.

| Function | Responsibility | Boundary |
| --- | --- | --- |
| REQ-041-F02 | No-write own Role+Level gap preview | No mastery rewrite or module selection |
| REQ-001-F02 handoff | Confirm exact pair/input and durably admit generation with existing selection coordination | No synchronous graph planning in selection transaction |
| REQ-042-F01 | Bounded deterministic initial planning, providers, order and diagnostics | No Expert approval or mastery certification |
| REQ-020-F01/F02 | Include/Exclude fixed draft membership with history | No automatic replacement, fake readiness or learning unlock |
| REQ-019-F01 | Inspect, adjacent Move Up/Down, neutral Remove, Check, preview and exact final approval | No unrestricted order array, AI regeneration or catalog CRUD |
| REQ-004-F01 | Own approved/current and own approved-archived sequence, dependencies and access reasons | No learning execution/content engine or progress fabrication |

Example: SQL required0.75/mastery0.60 has gap0.15 and preferred MEDIUM; Modeling required0.70/mastery0.80 needs no extra provider; missing compatible Quality evidence is UNKNOWN/null and prefers LOW. A SQL module's SUPPORTING Quality teaching is a benefit, not automatic replacement for an available Quality PRIMARY. Distinct module costs count once. Examples and development seeds are not production truth or test oracles.

## 2. Sources, versions and dependency ownership

Neo4j owns catalog Role/Level/skills, per-TEACHES focus/difficulty and skill-prerequisite edges. PostgreSQL owns selection, immutable baseline/mastery, gap snapshot, request/run/revision/modules/dependencies, overrides/approvals/receipts/audit/outbox. Learner state is never stored in Neo4j.

New planning consumes teachingFocus PRIMARY/SUPPORTING/INCIDENTAL and difficultyLevel LOW/MEDIUM/HIGH independently per module–skill pair, exactly one PRIMARY per module. Historical instructionLevel retains its old meaning; never translate it into new fields. Bind coherent graph release/requirements/semantic compatibility/content/readiness/policy/algorithm/configuration identities. Unknown formats, mixed source identity or corrupt expected evidence fail safely.

Relevant ports are Bindings, Profiles, Semantics, Graphs, SuitabilityPolicy, ReadinessDefinitions, Availability, ReviewAssignments, LiveReadiness and ContentAccess. Availability/readiness definitions for planning do not establish live protected learning entry. Production source-coherence, publication, assignment and retroactive revocation remain owner contracts. PostgreSQL locks do not make Neo4j and PostgreSQL one serializable transaction.

## 3. Confirmed learning-need and ranking rules

Known gap=max(0, requiredScore−stored conservative mastery), with no extra confidence penalty. Mandatory positive gap and genuine UNKNOWN require learning; optional deficits and known gap0 do not create mandatory providers. Missing/corrupt expected evidence is an error rather than UNKNOWN. All mandatory known/gap0 yields NO_LEARNING_REQUIRED without proposal approval, certification or fabricated completion. Role/Level changes reuse full-Occupation evidence and preserve allowance/history.

For a need's own mastery m in[0,1], compare exactly: 3m<1 LOW; else3m<2 MEDIUM; else HIGH. UNKNOWN prefers LOW with original reason, not numeric0. Prerequisite-only needs retain their own evidence/provenance. No fixed mastery gain or obligation to study three difficulties.

PRIMARY provides normal coverage. SUPPORTING may cover only when the eligible source universe has no feasible usable PRIMARY-backed option across all three difficulties under the same frozen mandatory conditions. An Expert exclusion cannot manufacture Primary unavailability. INCIDENTAL is neither coverage nor benefit. Difficulty preference order is LOW→MEDIUM→HIGH, MEDIUM→LOW→HIGH, HIGH→MEDIUM→LOW. Coverage fallbacks carry separate hash-bound Expert-attention reasons; warnings alone do not invalidate a complete feasible set.

After mandatory eligibility, coverage, prerequisites, versions, tenant and gate constraints, compare complete generation plans lexically: fewer Supporting coverage fallbacks; fewer rank2 difficulty fallbacks; fewer rank1 fallbacks; lower distinct duration; lower distinct price; more distinct required-need Supporting beneficiaries; fewer modules; deterministic module IDs then provider assignments. Supporting coverage is not extra benefit to the same need. Optional/gap0/incidental/unrelated links do not earn benefit.

Bounded search must prove the generation optimum. SEARCH_LIMIT/NOT_PROVEN cannot publish an approximate successful current proposal. Fixed-set review retains the Expert's selected modules and validates coverage/providers; it may cost more than the generation optimum. It cannot add/remove modules to reoptimize, fake global optimality or approve search uncertainty.

## 4. Ordered read, compute and write pipeline

1. Authorize Employee/org before profile/selection/existence/receipt reads. Resolve exact Role+member Level, requirements, original compatible profile and versions. Missing baseline uses the existing admission rules; it is not an accepted generation PENDING.
2. Preview computes gaps and deterministic gapInputHash in memory with expected selection identity. No selection/pathway/mastery writes.
3. Explicit confirmation recomputes authoritative input and compares expected pair/selection/preview hash. Stale input conflicts without substitution.
4. In the existing PostgreSQL selection UoW, commit selection change/no-op, frozen gap snapshot, durable request, receipt and audit/outbox. Later worker failure does not undo accepted selection.
5. Worker claims frozen work with lease/token/fencing; batches relevant graph/prerequisite/provider data under configured closure/provider/search limits. Pins cover the exact selection, profile, catalog, policy and configuration.
6. Build needs/provider/gate assignments; apply full metadata/availability/Primary/fallback rules and bounded whole-path search. Derive module DAG from actual skill prerequisite/provider assignments. External evidence can satisfy an edge; co-teaching needs a real versioned internal gate. No title/difficulty-derived prerequisite or fabricated PASS.
7. Recheck selection/binding and claim before atomic publication. Persist exact ordered revision, targets/dependencies/reasons and current pointer. Infeasible/cycle/search-limit and dependency failures stay explicit; never publish approvable partial coverage.
8. Expert Include/Exclude/Remove validates the fixed resulting set and stores VALID or editable UNRESOLVED. Remove clears membership; Exclude retains explicit exclusion. After an explicit Move, preserve valid relative order and insert new prerequisites before dependents.
9. Move swaps one adjacent pair, checks fresh actual dependencies and rejects inversion with safe diagnostics/no writes. Successful edits append ordinals/hash/revision/override/receipt/audit/outbox. Old records remain immutable.
10. Check freshly reviews the persisted set/order without a write. FE reloads detail only on hash difference. Preview refreshes and checks again, captures exact revision/hash and grants no approval/access.
11. Final confirmation reauthorizes assignment, expected revision/hash, current selection/binding and fixed-set validity. Atomically persist exact approval/receipt/current review state/audit/outbox.
12. Employee GET projects the exact approved order/dependencies with safe frozen baseline and live lock/unavailable reasons. Protected learning owner routes must reauthorize independently. GET does not generate, approve, complete learning or write mastery.

## 5. HTTP and DTO contract — current source

All paths use /api/v1 and no-store responses. Actor/org/learner/assignment come from trusted context. Current activation is non-production gated (section8), not a deployed production API claim.

| Route | Client fields | Output / rule |
| --- | --- | --- |
| GET /employee/role-gaps | roleId, levelId | Own safe gaps, gapInputHash and expected selection ID/revision |
| POST /employee/initial-pathway-requests | roleId, levelId, expectedSelectionId/revision, expectedGapInputHash; key |202 durable outcome; exact replay, no client module/mastery/status |
| GET /employee/initial-pathway-requests/{id} | Own opaque ID | Safe generation/review/validation/display status |
| GET /expert/initial-pathways | offset(default0), limit(default20,max100) | Assignment-filtered IDs before SQL paging; UI search/filter/stats are page-local |
| GET /expert/initial-pathways/{id} | Assigned ID | Summary, frozen gaps, revision/selected set/history/plan and candidate teaching offers |
| GET /expert/initial-pathways/{id}/validation | Assigned ID | Fresh validationStatus, diagnostics, revisionContentHash, warnings, quality, search; no write |
| POST /expert/initial-pathways/{id}/inclusions | Edit tuple | Include eligible module; current Include-existing no-op |
| POST /expert/initial-pathways/{id}/exclusions | Edit tuple | Explicit exclusion; current Exclude-absent no-op, no preemptive ban |
| POST /expert/initial-pathways/{id}/moves | Edit tuple + direction UP/DOWN | Adjacent move or422 with prerequisite diagnostic |
| POST /expert/initial-pathways/{id}/removals | Edit tuple | Neutral REMOVE; current already-neutral no-op |
| POST /expert/initial-pathways/{id}/confirmation | expectedRevision, expectedContentHash; key | Exact valid approval; no preview-side approval |
| GET /employee/pathway | No learner/tenant fields | Own status or exact approved current sequence |
| GET /employee/pathways/{id} | Own archived ID | Implemented read-only archived projection, no resume/entry |

Edit tuple: moduleId, expectedRevision>=1, expectedContentHash(64 lowercase hex), optional reason<=2000 characters and Idempotency-Key header. Reject unknown body properties, body>16384 characters, arbitrary actor/org/mastery/approval/order. Candidate grouping and EN/VI text are presentation only; coverage is server-owned.

### 5.1 Input identity and exact retry — current technical contract

gapInputHash identifies Role binding, original baseline/profile, normalized requirements and compatibility/calculation policy; expected current selection is a separate precondition. planningInputHash binds that snapshot to the resulting selection and planning source/policy/configuration. revisionContentHash binds selected set, content refs, actual ordinals, teaching/provider assignments, needs, dependencies/gate definitions, warnings/quality, pins and ordered override history. Format2 search execution counters/scope/proof metadata are retained outside the material content hash; live readiness/availability is also outside it.

Command body hash covers operation/resource/expected tuple/module/reason. Receipts are scoped by actor+tenant+operation+resource+key. Authorize/re-authorize -> receipt lookup -> conflict or exact outcome -> only new command checks current expected state -> coordinated CAS/write/receipt. A revision4→5 success may replay its original revision5 outcome after revision6; a new key expecting4 conflicts. Replay does not confer current approval/access. No-op still requires current draft/selection/binding/assignment and writes only its receipt.

Unknown outcome retains original key/body. A successful POST followed by failed GET requires read reconciliation; it does not warrant a new intent. Concurrent edits/confirmations must retain one CAS winner and no partial writes. This is the required invariant; full concurrent evidence remains unrun.

### 5.2 Status projection and recovery — current wire contract

generationStatus: PENDING, GENERATING, SUCCEEDED, NO_LEARNING_REQUIRED, UNRESOLVED, BLOCKED, FAILED_RETRYABLE, STALE. reviewStatus: NONE, AWAITING_EXPERT_REVIEW, APPROVED, STALE, ARCHIVED. validationStatus: null without revision, else VALID/UNRESOLVED/BLOCKED/STALE. displayState combines these, so SUCCEEDED never means learning authority and exact approval ends awaiting-review display.

A generation failure without a proposal differs from an editable draft made UNRESOLVED by exclusion/removal. Corrected authoritative input requires fresh preview/confirmation; refreshing an already reviewed stale draft remains an owner decision, not an authorized regeneration endpoint. No-gap acknowledgement is optional Proposed UX with no command in this slice.

Errors generally carry code/retryable/correlationId; prerequisite-order rejection specifically returns code+diagnostics. Identity/CSRF filters can have a smaller safe envelope. FE handles safe codes/status and optional diagnostics, never assumes all error envelopes contain the same fields. Network/5xx/invalid responses are treated as uncertain for commands. Caches are actor/tenant scoped and cleaned on identity switch.

## 6. Persistence and consistency design — current source

| Record | Ownership / invariant |
| --- | --- |
| initial_gap_snapshot | Frozen own confirmed input/resulting selection, original baseline/profile/evidence/requirements and hashes |
| initial_pathway_request/run | Frozen planning identity, generation state, claim/lease/attempt/fencing and failure history |
| initial_pathway_current | Scoped mutable current revision/review/archive pointer; CAS and lifecycle checks |
| initial_pathway_revision | Immutable format/content/hash/selected set/override history |
| initial_pathway_module / target / teaching_v2 / dependency | Exact module ordinal/content/cost, legacy or per-pair teaching metadata and versioned provider/gate definitions |
| initial_pathway_override / approval | Expert/assignment ID/version, action/reason, previous/next revision; exact approved revision/hash/time |
| receipt / audit / outbox | Atomic accepted outcome and events with owned state; recoverable idempotent delivery |

V27 initial storage and V28 format2 source/readers exist; dated receipts record application, including workspace V1–V35. V35 widens only override.action to INCLUDE/EXCLUDE/MOVE_UP/MOVE_DOWN/REMOVE, with no table/column or graph change. It is applied on shared development per recorded evidence; this document review neither queries nor changes live DB.

Format1 keeps original instructionLevel, codec and identity; format2 uses a separate discriminator/material hash with immutable teaching_v2 children. Unknown format/hash mismatch denies. Never backfill old history, edit applied migration/checksum, narrow CHECK or downgrade to a reader that cannot handle new records. Rollback stops new writes/substitutes and retains forward schema/dual readers/receipts/approvals/history. Production/native migration rollout is separate scope.

## 7. Lifecycle, failure and acceptance

| Condition | Required result |
| --- | --- |
| Unauthenticated/wrong role/foreign/unassigned |401/403 or safe404; no scoped detail/count/receipt leak |
| Invalid shape/enum/key |400; no writes |
| Ineligible Include / nonmember or boundary Move |422; no revision/override |
| Provider-order inversion |422 PREREQUISITE_ORDER_VIOLATION with provider/dependent/skill reasons; entire draft/history unchanged |
| Missing coverage after membership edit | Save editable UNRESOLVED with reasons; no approval or fake mastery |
| Stale expected revision/hash/selection / approved/archive edit |409; preserve winner/history |
| Same key/different command |409 IDEMPOTENCY_CONFLICT |
| Invalid final draft / changed validation identity |422 INVALID_PATHWAY_DRAFT /409 VALIDATION_CHANGED |
| Dependency/config/integrity failure | Explicit503 or worker failure state; no permissive fallback/partial edit/approval |
| Read concurrent pointer change |409 STALE_PATHWAY_VIEW; no mixed successful projection |
| Unknown commit / worker crash | Exact receipt/claim recovery, never duplicate approval/current revision |
| No gap | Recorded no-learning-required outcome, no fabricated completion |

Role changes retain archived history and make old-selection work ineligible to commit. Blueprint replacement alone does not reset baseline/mastery or archive an approved pathway. Current revoke/unpublish/readiness restrictions must deny protected access without rewriting frozen history. Retroactive effect of assignment revocation and post-approval catalog recalculation remain open owner policies.

[Acceptance plan](../../../testing/REQ-041-042-initial-pathway-test-plan.md): G01–G13/P01–P20/R01–R14/E01–E09. Required cases cover tenant/actor/assignment, empty/not-found/outage/no-write reads, exact retry/CAS/fencing, both formats, fixed-set repair, saved order, Check/preview/final confirmation and own projection. E04–E06 learning execution remains deferred owner scope; no new executable tests are authorized here.

## 8. Implementation alignment and remaining dependencies

| Existing behavior | Disposition / state |
| --- | --- |
| Full-Occupation baseline/original mastery/history/allowance | Keep; no reset/rescore/retake/repin |
| Selection UoW, generation planner/worker, fixed-set review | Compatible extensions already in source; preserve current gates/ports |
| Disabled Expert arrows/trash/no-manual-reorder scope | Replaced by confirmed adjacent Move/neutral Remove, not catalog deletion or unrestricted drag order |
| UI browser/localStorage approval or invented readiness | Rejected; real exact approval and trusted ports required |
| API-backed EN/VI Catalog/Included/Excluded/preview/Employee views | Keep established components and saved order; Check-dialog repair lifecycle guard has a conditional source gap |
| Development fixtures | Keep explicit activation/temporary registry; never production publication/assignment/learning truth |
| Applied migrations and historical format/hash/receipts | Keep; no edit/down-migration or history cleanup |

Current runtime source: InitialPathwayController and WorkspaceInitialPathwayConfiguration require local+workspace-baseline+!local-baseline-demo+!prod with initial/workspace gates. WorkspacePathwayActors resolves real server session, current membership/role/entitlement; WorkspaceInitialPathwaySecurity retains session CSRF. Legacy local-baseline-demo is mutually exclusive, has separate explicit bypass gates/allowlist and keeps the new arrows/trash disabled.

ReviewAssignments remains a bounded configured development Expert/org/optional Role scope with live account/grant checks and real exact persisted approval verification. Local catalog release/semantic compatibility and planning availability/prerequisite evidence are exact development artifacts. TMP-REQ001-11/12 are the current workspace/SE registry routes. LocalSeedPlanning uses original compatible mastery against the exact prerequisite threshold for planning only; it writes no PASS and invents no internal gate. LiveReadiness/ContentAccess default-deny. Production publication/coherence/semantic/assignment adapters and actual protected learning routes are incomplete.

The SE source bank and module/prerequisite supplements are development startup inputs. The earlier restore to100 real user responses was a separate one-time database maintenance operation, not seed behavior or a Docker startup reset. Preserve all subsequent user edits, baseline/Security/approval history and sealed graph.

Source/build/manual receipt records BE428/FE2507/lint, V35 preservation and selected HTTP branches. User confirms Move Up/Down and Remove UI happy cases. No new runtime operation or executable test was performed in this document reconciliation. New-order exact final approval→Employee, negative UI/EN-VI/focus/mobile, full two-tenant/revocation/CAS/outage/internal-gate/legacy/performance proof remain unverified. Old revisions11/18 are historical observations, never current pointers.

Open decisions are limited to owning contracts: retroactive assignment-revocation effects and safe refresh of reviewed stale drafts. They are not prerequisites to correcting these confirmed documents and do not authorize new runtime/API/schema work. Conditional UI lifecycle gap and obsolete Regenerate spec are recorded separately in the [reconciliation matrix](../../../testing/system/REQ-002-041-042-workspace-integration.md#scoped-document-and-source-reconciliation--2026-10-29).

Status: Confirmed.

## Dated design and implementation history

Sections9–18 below preserve original dated context and anchors. Their observations apply only to their recorded environment/date; current requirements, source status, authority and deployment limits are consolidated above. No old reset/volume-deletion/next-session approval instruction is current authority. Historical evidence is linked rather than promoted to a new pass.

## 9. C2-00 engineering closure — 2026-10-27

These technical choices implement the approved invariants, without defining missing owner business policy.

- Identity encoding `initial-canonical-v1`: SHA-256, lowercase hex, over UTF-8 typed length-prefixed values. Null is `n;`; text is `s<UTF8-byte-count>:<exact text>;`; decimal is `d<stripTrailingZeros().toPlainString()>;`; boolean is `b0;`/`b1;`; sequences are `l<count>:[<encoded elements>]`; maps are `m<count>:{<encoded key,value pairs>}` sorted by exact string key. IDs use exact strings, UUID lowercase standard form; instants use ISO-8601 UTC. Hash input begins with the encoding version and purpose. Sets are sorted explicitly; display labels, confidence labels, clock time and live readiness results are excluded from content identities. Profile identity includes immutable origin pins and stored mastery, not a rescored value.
- Gap, planning, revision and command hashes have distinct purpose tags. Gap includes binding/release/requirement/compatibility/calculation versions and original profile identity. Planning additionally binds the resulting selection ID/revision and versioned planner/search/readiness/suitability pins. Revision includes ordered modules, matched targets, frozen dependency/internal gates, source pins and overrides. Command identity includes operation/resource/expected state; retry key is only the receipt key.
- Wire DTOs use exact decimal JSON numbers, string catalog IDs, UUID aggregate IDs, explicit nullable expected selection ID/revision, the separate status enums in §5.2 and safe `{code,retryable,correlationId}` errors. Missing mandatory fields or unknown command fields are rejected. No arbitrary client actor/organization/status/module list is accepted.
- Additive migration candidate is **V27**, verified free after V26 at HEAD1580e44. Physical namespace: `initial_gap_snapshot`, `initial_pathway_request`, `initial_pathway_run`, `initial_pathway_revision`, `initial_pathway_module`, `initial_pathway_target`, `initial_pathway_dependency`, `initial_pathway_override`, `initial_pathway_approval`, `initial_pathway_current`, `initial_pathway_receipt`. Composite organization/learner/selection/revision keys reference real V25 selection and occupation-profile identities. Immutable snapshots/revisions/receipts/overrides/approvals use the existing history-mutation trigger. Mutable request/claim/current projections are separate. No V4 keys or rank ceiling are reused.
- One JDBC/DataSource transaction manager participates in the current selection store's transaction. Reuse its `AB-ATTEMPT-ACTOR-V1` advisory lock plus active learner row lock. Archive new-path pointers and mark old-selection pending requests STALE within `CurrentRoleSelectionStore.select`; retain the unsupported legacy published-path guard. Confirmation calls the same store and writes snapshot/request/receipt/audit/outbox inside that transaction. Graph/source preparation occurs outside; only owner token/currentness validation participates in admission/commit. A PostgreSQL lock cannot establish graph freshness.
- Algorithm identity is `initial-ranked-feasible-v1`: prerequisite-first stable skill order, ranked alternatives, deterministic backtracking across the whole provider assignment; suitable shared providers deduplicated, explicit internal gates, full validation and stable topological ordering. Exhaustion yields `SEARCH_LIMIT`, never partial success. This is a feasibility heuristic, not a global time/price optimum claim.
- Operational activation is default-off. Search/worker configuration must supply a nonblank configuration version and positive closure-node/edge, provider, search-state, batch, lease, attempt and backoff limits; backoff maximum must be at least minimum. No numeric defaults are inherited. Invalid/missing configuration prevents worker activation. Database clock governs leases; token+unexpired-lease fencing is checked in the publication transaction. Dispatch is not enabled by the auth bypass. Operator recovery and stale reviewed-draft refresh remain Open and have no command here.
- Local identity uses the existing HttpOnly persona cookie, explicit allowlisted server mappings, local/demo profile plus `pathway.local-auth-bypass.enabled=true` plus `!prod`. Expert is explicitly mapped, never an Employee fallback. Account activity/tenant is still checked in PostgreSQL. No account seeding or reviewer assignments are created by activation. Missing owner binding/publication/compatibility/suitability/assignment/readiness adapters deny with a safe dependency code; they cannot produce fabricated success.

Physical DDL is source only until separately authorized migration application. Actual content/start hook, coherent release protocol, prior-approval revocation and owner assignment remain Open. C2 verification is compilation/build/source review only until authorized isolated runtime infrastructure exists; all G/P/R/E executable evidence remains Planned/Not run.

## 10. Cluster 2 source implementation and verification — 2026-10-27

**Partial implementation, not a successful full flow or Cluster 2 completion.** The user authorized implementation of C2-00–17 and subsequently explicitly authorized creation of the V27 source (11 `initial_*` tables, composite constraints/indexes/history triggers and two additive V25 unique keys) after automatic review rejected the attachment-based authorization. Creation succeeded; no SQL was applied. Base HEAD remains `1580e44c235423e0961977f2c0949452ab3037aa`; the original 21 document changes were retained.

The Java source now implements stored-decimal gap/UNKNOWN calculation and separate canonical identities; a scoped original-profile reader; selection-owner transaction participation and new-path archive; durable admission/semantic dedup/receipts/audit/outbox; batched graph closure behind a required immutable-published-session provider; suitability/readiness filtering, ranked whole-assignment alternatives, shared-module dedup, internal/dependency gates and topological validation; fenced default-off dispatch; assigned Expert queue/detail/edit/exact approval; and Employee current/archive projections plus reusable content/start/segment policy. Missing owner data is not replaced with successful fake state. Source compilation does not validate SQL, Spring context/security matching, live transactions or algorithm acceptance.

Technical refinements: dependency rows retain **dependent skill + prerequisite skill**, avoiding loss of different gate edges on a shared module. Request frozen input cannot be updated/deleted. Runs pin the operational worker configuration identity, separate from planning's search configuration hash. Bare baseline selection retains its old receipt namespace/no-op rules; initial admission calls the same private owner write with a distinct initial receipt and a legacy-path guard even for same-Role confirmation. Initial admission cannot silently create new work over an existing reviewed draft; stale reviewed-draft refresh remains Open. Employee archived reads show a recorded sequence only if that exact revision has a historical approval. Employee DTOs omit candidate preferences/diagnostics and unapproved learning links.

Read-only `GET /expert/initial-pathways/{id}/validation` exposes current validation/hash comparison without saving approval/revision/receipts. Include/exclude and confirmation retain the section5 command protocol. Content entry is a protected app-relative path; module entry checks external gates, and the owner must enforce frozen internal gates on dependent segments using `InitialPathwayAccess.requireSegment`. No actual content/start controller is mounted by this source; a hook class is not proof of direct-access enforcement.

The existing Roles cards now open gap preview and explicit confirmation, retaining Role-first baseline entry and the existing Upskilling URL. Expert queue/detail use API state, not `pathwayReviewStore`; include/exclude/validation/exact confirmation replace browser approval/reorder/regeneration for this initial scope. Employee Role pathway passes the same server DTO to its existing timeline/roadmap; API failure cannot reach diagnostic mock unlock. Independent skill/assessment consumers remain provisional and retain their data. The orphaned legacy Expert store/localStorage data remains untouched, with no routed page consumer. EN/VI copy uses live shared typography/tokens (28/15.5); the older design-document scale remains a recorded conflict.

### Activation and unavailable integrations

- API/security/wiring require `local-baseline-demo & !prod` and **all three** properties `assessment.baseline.local-demo.enabled=true`, `pathway.local-auth-bypass.enabled=true`, `pathway.initial.enabled=true`. New pathway properties have no enabling default. The baseline profile's pre-existing provisioning is not executed by this task; do not start it on a shared database.
- Session uses the existing HttpOnly cookie and fixed server Employee aliases. An Expert alias is offered only with bypass enabled and server property `pathway.local-auth-bypass.expert-account-id=<real configured account UUID>`. PostgreSQL still checks same-organization active account and `DOMAIN_EXPERT`; activation creates no accounts/roles/assignments. Missing/unknown alias denies new-flow use. Production/mixed prod profiles cannot load this configuration.
- Admission requires explicit `pathway.initial.search.{version,max-closure-nodes,max-closure-edges,max-providers,batch-size,max-states}`. Dispatch also needs `worker.enabled=true`, `worker.version`, positive `worker.{lease-ms,max-attempts,minimum-backoff-ms,maximum-backoff-ms,poll-interval-ms}`; maximum backoff is at least minimum. No operational numbers were set or benchmarked. Worker version plus its settings hash is retained for completed runs. Missing values prevent dispatch/admission; gap preview does not require worker settings.
- Required owner implementations remain absent: semantic compatibility, authoritative catalog release/immutable coherent graph session, versioned suitability, readiness mappings/evidence, assignment/revocation/prior-approval validity, content availability and protected content entry. Section12 resolves Role-Level mapping and UI selection IDs through explicit pair choice; concrete binding/graph consumers are wired behind these owner ports. Default beans explicitly deny with `*_NOT_CONFIGURED`. The Neo4j reader is **not wired to the mutable current graph** without the owner's published session. Catalog0.9 is still incompatible and no graph import occurred. Production Identity/string-ID routing is not integrated.
- V27 must be applied only in a separately authorized isolated environment before running this source. The selection archive extension uses its new tables even for a bare Role change; disabling the pathway feature is not a schema downgrade. Roll out compatible source+schema together. Once deployed, rollback disables new admission/review/worker/bypass while retaining forward schema, immutable records, receipts, audit/outbox and learner history; never use a down migration/reset or revert to browser approval.

### Actual allowed checks and limitations

On Windows/Java21, backend `.\mvnw.cmd '-Dmaven.test.skip=true' compile` completed successfully. Frontend `npm.cmd run build` completed successfully (TypeScript + Vite); the build reports a bundle-size warning. Scoped `npm.cmd run lint -- <19 affected FE runtime files>` completed with **0 errors / 3 existing warnings** in the legacy timeline state effect, legacy roadmap dependencies and WorkspaceLayout state effect; source comparison with HEAD confirms these predate this change. Introduced helper-export warnings were removed. Earlier sandbox build-artifact access and `npm.ps1` execution-policy failures were resolved using approved elevated build commands and `npm.cmd`; no packages or security settings were changed.

Manual UI/full-flow smoke was **not performed**: browser inventory was empty. A temporary static-only server at127.0.0.1:5178 returned unavailable for API paths with no backend proxy; it was stopped after the browser blocker. No app/backend/DB/container/import/reset/rescore/repin or seed was started. No JUnit/ArchUnit/Vitest/Playwright/Testcontainers or automated assertion script was created/run. Migration application/SQL execution, runtime transactions/fencing/security, numerical/performance and G01–G12/P01–P14/R01–R12/E01–E08 all remain **Not run**. Compile/build/lint are not executable-test evidence.

Next continuation is still Cluster 2: supply/confirm owner contracts and operational configuration, then prepare a concrete isolated migration/runtime scope for authorization and manual observations. Full successful review/access integration and visual QA remain incomplete; no automatic Cluster3 or Git index/commit/push is authorized.

## 11. C2 catalog continuation — source implementation

User requested the next catalog integration slice after confirming that ontology0.10 was merged before C1. Keep Neo4j as the catalog source; no JSON runtime fallback, graph import, Compose startup or seed rewrite is authorized by this continuation. Preserve all existing C2 source and the member-owned catalog package.

`CurrentCatalogRoleReferences` resolves the user's explicit Role+Level pair through the existing scoped current catalog and validates exact membership. Its internal effective-choice ID is canonical, with no separate enterprise Role mapping. `Neo4jInitialBindings` hydrates actual names and decimal requirements from Neo4j. `ReleaseAuthority` and `PublishedSessions` remain the owner release/currentness and coherent/immutable read boundaries; neither database name nor version alone proves immutability. Missing authority/session adapters deny; no configured publication PASS for the NEEDS_EXPERT_REVIEW seed.

Concrete catalog reader validates exact ownership and unique node/relationship identities, metadata and tenant scope. The existing schema already defines publication: ACTIVE + APPROVED + nonblank reviewedBy + timezone-aware reviewedAt; this is consumed, not a newly invented policy. Required Role/Level/requirement/skill records must be published. Provider metadata uses the same strict publication rule; ineligible unapproved modules/mappings cannot become learning offers. No baseline demo review bypass is shared with pathway readers.

Require explicit `versions.catalog` and a positive `pathway.initial.catalog.max-requirement-rows` budget (limit+1 detects exhaustion; never truncate requirements). Ownership subqueries retain up to two matches to detect ambiguity. Graph closure/provider queries also limit results and count scanned provider rows before publication filtering, so rejected candidates cannot bypass the configured read budget. Role selection fingerprint stays separate from release token/gap identity. Currentness delegates to the owner release protocol without graph scanning in the learner transaction. The pair mapping is now Confirmed by section12; owner release/semantics/suitability/readiness/assignment/content integration remains Open.

Allowed verification remains compilation and source review only; no executable tests or runtime/DB/container operations. Record actual results after implementation, without marking G/P/R/E Pass.

Source verification on2026-10-27: BE compile with `-Dmaven.test.skip=true` passed; paired FE TypeScript/Vite build passed; scoped10-file FE lint0 errors/0 warnings. No SQL/Cypher execution, Spring runtime context or visual/full-flow proof. The existing large-bundle warning remains; no new test source or package/dependency change. Concrete `Bindings`/`Graphs` beans replace the former direct unavailable placeholders; their release authority/session dependencies still deny until real integration is supplied.

## 12. Confirmed amendment — Employee selects Role + Level

The user explicitly confirmed on2026-10-27: a catalog Role with three Levels represents three effective target choices. The Employee chooses Role then Level, and required target mastery comes from that exact Level→REQUIRES_SKILL→Skill edge. There is no inferred highest Level, title-to-Level conversion, global per-skill threshold or mastery-to-instruction-depth formula. This supersedes the earlier no-separate-Level/business-binding assumption in this document and linked C1 descriptions; it is a current-task confirmed decision, not an Open proposal.

REQ-001-F02/041-F02/042-F01 client fields become explicit `roleId` + `levelId`; the server validates the selected Level belongs to that Role/Occupation and is visible/published. An internal effective-choice ID is a versioned canonical hash of the pair, not a new graph Role, fabricated UUID or name match. A different Level on the same Role is a different target selection: new selection ID/revision, existing active-assessment guard, owned pathway archive, explicit new preview/confirmation and frozen planning identity. Same pair is a no-op selection; no generation on preview or bare selection.

Baseline remains full-Occupation evidence and allowance. Level changes never reset/rescore/repin/retake or rewrite initialized mastery. Current stored conservative mastery is compared independently with each selected Level's requiredScore; missing genuine evidence remains UNKNOWN. A Junior and Senior requirement can therefore produce different gaps from the same immutable baseline evidence.

Persistence uses an additive **JSON snapshot format**, not an applied-migration edit: V25 `role_snapshot` remains an object, with new writes `{snapshotVersion:1, role:<catalog Role snapshot>, levelId:<selected Level>}`. Legacy unwrapped Role snapshots and receipts retain levelId=null and remain readable; no historical Level is guessed or backfilled. Expose nullable levelId on selection reads. Updated UI/new pathway confirmation requires an explicit Level; legacy role-only baseline calls retain their original receipt hash/behavior and cannot fabricate a Level-bound pathway.

No new SQL migration is required for the pair: selection identity/revision already scopes V27 records and frozen input carries the exact Level. New snapshot/receipt readers must verify identity and selected-Level membership. This does not apply V27 or authorize DB/container operations. The catalog release/coherence, suitability, semantic compatibility, reviewer assignment and live readiness/content policies remain separate dependencies; the pair decision resolves the business Role-Level mapping ambiguity only.

Gap requires only catalog/binding/publication/requirements/compatibility version pins. Suitability and readiness-definition pins are required before admitting a positive/UNKNOWN mandatory learning request and before planner construction, not to calculate gap arithmetic. A no-learning-required outcome does not fabricate unused module-policy versions or approval. Planning still freezes available actual policy pins and search configuration. No unknown/absent policy receives a successful default.

Rollback must retain the dual snapshot reader: old binaries that only understand an unwrapped Role cannot read new snapshotVersion1 writes. Disable new commands/worker/bypass as needed while keeping compatibility readers and all history; do not erase snapshots or invent historical Levels to run an older binary.

Acceptance amendment (Planned/Not run): preview two Levels of the same Role using one profile; verify different authoritative requirements/gaps and no writes; select/change/no-op pair with active-assessment/archive/replay races; reject foreign/nonmember Level; legacy snapshot/receipt read without guessed Level; unchanged baseline allowance/history; confirm exact selected pair/hash and Employee/Expert display of the frozen Level. No executable tests are created/run in Cluster2.

## 13. Authorized latest local catalog/database integration — 2026-10-27

Confirmed user scope: apply the latest checked-in catalog and PostgreSQL migrations, align consumers and verify manually; use authentication bypass locally until the authentication owner supplies real identity. Expert-to-Role assignment is another owner's work, not permission to grant every Expert every pathway. User explicitly permits NEEDS_EXPERT_REVIEW seed use in local/demo only; retain original review metadata and production publication checks. No learner reset/rescore/repin, destructive volume replacement, executable tests or Git commit/push is authorized.

Source main fb521bc is already included in current HEAD1580e44. Source catalog0.10.0 SHA256 `fb4b308402e5413a246de65621f97df464d3538ad36264f40e827be005728b25` contains833 nodes/4638 edges. The old runtime was0.8.0, not0.9. Compose uses a fresh `neo4j_catalog_v010_data` volume; preserve old `neo4j_data` and a stopped-volume archive. PostgreSQL is backed up before forward-only V27. Preserve original bank/item/model/attempt/profile records; new catalog metadata does not silently promote or relabel historical evidence.

`LocalCatalogBootstrap` accepts only the exact pinned latest bytes and an empty or exact graph, creates six uniqueness constraints and verifies all nodes/edges in the import transaction. Different nonempty graphs are refused. The question bank keeps its v0.9 manifest/scope/hash; local compatibility checks require unchanged assessment skill/Role/requirements semantics, allowing only catalog-version and Level explanatory-context changes. LearningModule duration/price and TEACHES depth are separate from baseline assessment semantics. Neither bank content nor historical pins are regenerated for this cutover.

Local review activation requires existing local-baseline-demo/!prod + baseline-demo, pathway.initial and local-auth-bypass gates, plus `pathway.initial.catalog.allow-review-seed=true`. `LocalReviewCatalogRelease` verifies complete source/graph parity and actual read-only database access before opening catalog sessions. `CATALOG_READ_ONLY=true` seals the graph after initial bootstrap; stop API/worker before any unseal or future release cutover. Per-read verification detects drift/unsealing; local cached commit-token checks do not establish a production distributed consistency protocol. No production ReleaseAuthority is fabricated. NEEDS_EXPERT_REVIEW is usable only under this explicit exception; REJECTED/inactive/incompatible data remains denied, and graph review metadata is never changed to APPROVED. Owner production release/authorization/assignment/readiness/content adapters remain separate work.

Initial empty environment: start postgres/neo4j with `CATALOG_READ_ONLY=false`, run migrate then seed; seal Neo4j with `CATALOG_READ_ONLY=true`, then start API/web. Subsequent startup on the exact sealed catalog is idempotent and does not write graph schema/data. Review-exception and auth flags default off in tracked Compose; this authorized workstation may opt in through ignored local environment configuration. A new latest release requires explicit source/hash/version and compatibility review rather than silently following an arbitrary filename or rewriting pins.

Module-depth discussion: user has not confirmed a suitability policy/fallback. Proposed current-conservative-mastery bands (not gap magnitude) are UNKNOWN or [0,0.4)→FOUNDATIONAL, [0.4,0.7)→INTERMEDIATE, [0.7,1]→ADVANCED. No rounding from the historical numeric-OC conversion applies. Skills already satisfying requirements do not create learning needs. Missing exact-depth providers, prerequisites and multi-skill modules still require eligibility/fallback decisions. No range implementation or invented suitability version is activated.

Status: Confirmed local integration authority and review-seed exception; Proposed mastery-band suitability; production publication/assignment/readiness/content integration Open. Runtime observations are recorded separately from executable evidence.

Final local verification: ordinary Compose startup succeeded after wiring/query fixes; API/DB/graph healthy and web running. Direct/proxied Roles returns48 Roles/144 Levels at0.10.0. MicroSkill has no code property; the legacy DTO field is nullable and FE parser accepts missing/null values. After the exact-artifact compatibility continuation below, Junior/Senior gap previews both return200 on the same original profile, retaining mastery with different Level targets/gaps. Expert identity works; queue still denies missing assignment. No full pathway/review/content-start result is claimed. [Manual evidence](../../../testing/system/REQ-041-042-local-catalog-cutover.md).

Local compatibility continuation: source comparison found that all15 original Occupation skill records retain identical properties except catalog version. The profile's stored fingerprint is an **eligibility** fingerprint, not the raw catalog fingerprint. Reconstructing the versioned AB-CATALOG-V1 paths plus the original pinned bank's AB-ELIGIBILITY-V1 item manifest produces exactly the stored original fingerprint. The local adapter may therefore preserve original evidence only when the historical seed/bank byte hashes, original eligibility fingerprint, current catalog fingerprint and exact skill properties (excluding version only) all match. Unknown fingerprints or changed skill semantics deny; genuinely missing original evidence remains UNKNOWN. This implements the existing identity-compatibility requirement for these exact local artifacts, without numeric remapping, repinning, a guessed policy or production compatibility approval. Module suitability remains unconfirmed.

## 14. Confirmed catalog0.11 policy and implementation contract — 2026-10-28

User confirmed the reviewed schema/quality/fallback/search proposal and explicitly requested this C1 document update. This section governs new planning; no source, migration, configuration, DB or executable-test implementation is performed by the amendment. Current reference source is5b17c7768dee4dbcee3a19881177e5b476b4350a, including owner4c33273; preserved checkpoints are c932981/7080f00/85e1ff6. No history rewrite, commit or push is authorized.

### 14.1 Need, focus and difficulty

1. Authorize and freeze exact Role+Level requirements and original compatible evidence. Known mandatory positive gap and mandatory UNKNOWN are learning needs; known gap0 and optional deficits do not create mandatory providers. Prerequisite-only needs come from skill-prerequisite readiness definitions; preserve their separate provenance without changing the Role's attainment set.
2. A known need uses its own stored mastery:0≤m<1/3 LOW;1/3≤m<2/3 MEDIUM;2/3≤m≤1 HIGH. Compare3m with1 and2 without rounding. A finite decimal immediately below1/3 remains LOW; do not pretend rounded0.333333 equals the mathematical boundary. UNKNOWN uses preferred LOW plus original reason, not numeric0. Invalid/out-of-range/corrupt evidence is an error. Confidence does not add a penalty.
3. Read exact per-pair focus/difficulty independently. Every candidate Module must have exactly one PRIMARY across all its TEACHES, including links outside the initial queried needs. A Module's Supporting difficulty cannot be copied from its Primary link. Legacy FOUNDATIONAL/INTERMEDIATE/ADVANCED values are retained only in legacy records; neither focus nor difficulty may be reconstructed from them.
4. Assign one responsible provider to each required learning need. PRIMARY is normal coverage. SUPPORTING is coverage only when no usable PRIMARY-backed feasible option exists across **all** three difficulties under the same frozen mandatory conditions. Excluding a Primary from an Expert's fixed set does not manufacture global Primary unavailability. Missing content/permissions or impossible prerequisite combinations can make Primary unusable; outages/unknown metadata/search exhaustion cannot prove absence. INCIDENTAL is never coverage or benefit.
5. Preferred difficulty has rank0; first fallback rank1; second rank2: LOW→MEDIUM→HIGH, MEDIUM→LOW→HIGH, HIGH→MEDIUM→LOW. PRIMARY at another difficulty precedes SUPPORTING used as coverage merely for an exact band. All coverage fallbacks receive `expertAttention=true` and a short reason bound to the revision. UNKNOWN's explanation is retained even without fallback. Warnings are separate from blocking errors, and do not imply approval.
6. No requirement to study three levels, no constant expected mastery gain, no module-prerequisite catalog edge and no completion-to-readiness-PASS conversion. When the same Module legitimately supplies both prerequisite and dependent coverage through the permitted fallback rules, explicit versioned internal readiness gates are still required.

### 14.2 Whole-path objective, search and fixed review sets

First enforce all required coverage, skill prerequisites, publication/availability, content versions, tenant/actor boundaries, valid metadata and complete gate mappings. Among these feasible assignments compare, in order:

| Priority | Comparison |
| --- | --- |
| 1 | Fewer required needs fulfilled by SUPPORTING fallback |
| 2 | Fewer responsible coverage assignments at difficulty fallback rank2 |
| 3 | Fewer responsible coverage assignments at difficulty fallback rank1 |
| 4 | Lower total durationMinutes across distinct selected Modules |
| 5 | Lower total priceVnd across distinct selected Modules |
| 6 | More distinct frozen learning-need skills receiving suitable additional SUPPORTING benefit |
| 7 | Fewer distinct selected Modules |
| 8 | Lexicographically sorted Module IDs, then sorted skill→provider assignments; no randomness or locale-dependent ordering |

The first three counters form a lexical quality tuple, not an undocumented weighted sum. A need's fallback difficulty is evaluated on the exact teaching pair assigned to cover it. Dedup Module costs before totaling. Benefit counts once per beneficiary skill, including UNKNOWN and prerequisite-only skills in the frozen required-need set. It requires an eligible SUPPORTING pair under the frozen versioned suitability policy; no bonus for gap0, incidental, optional-only or unrelated skills. Preserve that pair's actual difficulty without copying its Primary difficulty or changing the responsible provider's rank. A Supporting pair already used as that need's coverage is not an additional benefit. The presence of extra benefit cannot remove its required Primary provider.

Generation must explore complete feasible alternatives and prove the winning objective using deterministic bounded branch-and-bound or exhaustive comparison. Nonnegative partial costs/admissible bounds may prune only when they preserve that objective; no independent top-k provider truncation or first-valid success. Version the policy/algorithm/configuration, and record visited-state count, configured bounds and `optimality=PROVEN|NOT_PROVEN` separately from coverage validity. Technical identifiers are fixed in C2 before writes, with canonical version dispatch; they do not change this business ordering.

At budget exhaustion: persist the run's SEARCH_LIMIT/NOT_PROVEN reason without publishing a successful/current valid proposal or learning links. A feasible incumbent is not an approved approximate recommendation. Dependency outage remains retryable/unavailable rather than a false proof of no provider. Proven infeasibility has distinct coverage/cycle/provider reasons. Mandatory feasibility is never traded for duration/price. No runtime latency/optimality benchmark is claimed.

Expert include/exclude freezes the explicit selected Module set. Validation finds a legal coverage assignment and deterministic order for that set, retaining selected eligible extras; it must not remove/add Modules to regain the generation optimum. Use the same global source eligibility/Primary-fallback permission and required gates. A valid edited set may cost more than the generated optimum and remains approvable after exact Expert inspection. An invalid set remains editable with all blocking reasons. Search uncertainty cannot mark it VALID. Approval requires feasible exact content, not a new unrestricted generation search. Search metadata distinguishes `scope=GENERATION|FIXED_SET`; global optimality applies only to generation. A fixed-set revision records whether coverage validation completed, not a false global-optimum label copied from its parent. Any recorded generation-proof provenance identifies the original generated revision separately.

### 14.3 Contract/DTO and protected projections

Client command fields/routes in section5 remain unchanged. Actor/org/learner/mastery/preferred difficulty/score/approval/search outcome are never supplied by the client. Server response additions are planned:

- Expert candidate/selected teaching pair: skillId, teachingFocus, difficultyLevel, `coverageRole=COVERAGE|ANCILLARY`, preferredDifficulty when this skill has a need, nullable coverage difficultyFallbackRank, expertAttention and attentionReason; effective policy version and safe explanation. A missing explanation for an actual fallback is invalid content. Candidate modules are grouped by moduleId with per-skill links, not duplicated per pair.
- Proposal: distinct totals, quality tuple, Supporting-beneficiary skill IDs, nonblocking warnings, blocking diagnostics, optimality/search metadata and actual source/policy versions. Frozen original UNKNOWN reasons remain visible. Expert receives only authorized review evidence, never answer keys/theta/SE.
- Employee: own status, exact approved ordered Modules, safe per-skill focus/difficulty/attention notes, current accessState/reason and protected entry when allowed. Hide candidate rankings/draft links; archived paths remain read-only. Both EN/VI show natural benefit-focused copy; VI fallback label is “Cần Expert xem xét”. Technical configuration/search internals do not become product labels.
- Read-only validation returns expected revision content hash plus blocking errors and separate warnings; approval revalidates these exact values. No warning can be lost during include/exclude, DTO parsing, hash computation or projection. Mutable live readiness/availability remains outside approved content identity.

Authorization precedes scoped existence/count/paging/receipt reads. Replays retain existing body hashes and original outcomes before new-command revision checks; client reconciles current GET afterward. CAS/claim fencing/immutable revisions/audit/outbox remain unchanged in intent. Stale catalog/selection/revision→409; invalid requested content→400/422; absent configuration/outage→503 or explicit worker BLOCKED; no partial new draft/approval on dependency failure.

### 14.4 Planned forward schema, format and compatibility

Select the next unused migration after rechecking the actual source/DB head; V28 is a candidate, not an applied migration. Retain V27 and all its immutable rows/checksums. Planned additive shape:

| Planned record/change | Contract |
| --- | --- |
| initial_pathway_revision.format_version | Discriminator1/2; existing records read as1, new records write2. Adding the version discriminator must not recalculate any historical content/hash |
| initial_pathway_teaching_v2 | Composite request/revision/module/skill key and FK to the scoped revision's Module; focus/difficulty exact enums; coverageRole; preferredDifficulty nullable outside needs; difficultyFallbackRank nullable for ancillary rows; expertAttention/reason, policy version. Coverage cannot be INCIDENTAL; fallback/reason consistency required. Store all selected Module teaching links, distinguish fulfillment from ancillary metadata |
| New version2 revision content | Explicit formatVersion2 envelope; frozen needs/provenance, selected Module/content refs, teaching metadata, assignments/benefit, warnings, dependencies, totals/quality/source pins and search result. Mutable readiness is excluded |
| Existing initial_pathway_target | Preserve old instruction_level meaning and rows for format1. Do not write fake old values for format2, translate old labels or backfill immutable teaching rows |

The new table needs the same immutable UPDATE/DELETE guard as other revision children and composite ownership/FK checks, not an unscoped lookup by Module ID. Existing format1 revision identity/decoding remains exact. Format2 hash has its own purpose/version tag and includes both fields, actual coverage, warning codes/reasons, selected content, dependencies and effective overrides/policy/objective identity with deterministic ordering. Readers dispatch by stored format; unknown format or hash mismatch denies safely. New writes require compatible forward schema/readers together. Legacy receipts are never decoded as new commands or used as current authority.

Compatibility remains exact-artifact based in local mode: preserve v08 original bank/seed hashes and recognized v010 eligibility fingerprints; add reviewed v011 source explicitly. A new current fingerprint is not a replacement for an old stored fingerprint. Check unchanged skill semantics independently of teaching/content changes, and return original Evidence unchanged. Unknown or changed semantics deny rather than rescore/repin. Nine module content revisions affect new recommendations; retain old content references/history, never silently retarget an archived/approved revision to1.3.

Rollback disables new admission/dispatch/review mutation/local substitutes while retaining forward schema, both format readers, approved/history records, immutable profiles/pins/receipts/audit/outbox. Pre-format2 binaries are not a safe rollback reader. No down migration, DB reset, learner retake or browser-approval restoration. No DB cutover is performed in C1.

### 14.5 Local assignment substitute and mandatory owner ports

Authentication substitute remains the existing default-off local identity path. The separately planned assignment substitute is **not yet implemented**. Activation requires local-baseline-demo & !prod, existing baseline-demo/auth/initial gates and a separate default-off assignment flag. Server configuration supplies one trusted Expert account and organization plus an optional explicit Role allowlist. Client fields/cookies cannot choose arbitrary organization/Expert identity. Verify active account/grant and filter authorized proposals before paging/counting; never expose a broad organization-wide learner list through a generic Expert switch.

Store a versioned local assignment identity with each override/approval. The adapter's approval-validity path must verify the real persisted exact pathway/revision/hash approval, configured tenant/scope and applicable active account/grant; it cannot return unconditional success. Removing the local authorization denies subsequent commands/replay/current approval access while retaining history. Production assignment/revocation semantics remain the owning team's contract. Replace the substitute behind ReviewAssignments; keep exact-revision validation/approval and current-scope checks. A temporary registry records gate/consumers/owner/replacement/retained code and deferred tests before activation.

ReadinessDefinitions, LiveReadiness, Availability and ContentAccess still require real owner adapters/data. The source hook has no protected owner controller mounting yet. An approved pathway GET may project locks but cannot secure a public contentUri by itself. Actual content/start/internal-segment routes must independently call trusted approval/tenant/content/readiness checks at each protected access. Missing contract/evidence/version denies or reports unavailable. A Markdown scaffold, baseline/mastery threshold, completion, assignment bypass or reachable DB is not readiness PASS. Do not add module-prerequisite graph fields or implement the owner's assessment engine in this Function.

### 14.6 Work order, environment and evidence boundary

Reuse existing gap/profile/selection/transaction/receipt/revision/worker/review paths. Extend ports/domain → additive persistence/dual reader →0.11 release/compatibility → confirmed suitability/whole-plan optimizer → local assignment → owner access integration → API/FE. Keep slices small; build/type/lint in C2 only, executable tests only in separately approved C3. The required owner ports may stay safely denied while source work proceeds, but successful full flow remains incomplete until integrated.

User reports JDK and Node installed and PostgreSQL/Neo4j usable on another machine. Docker/local DB installation is excluded from today's work; do not probe/connect/import/migrate remote DB without scoped authority and connection context. Native Java/Node can compile/build independently of DB. The existing agent process still resolved Java8/no Node during intake; refresh process-local tool paths/verify JDK21 and Node22 in C2 instead of reinstalling based on that stale observation. No toolchain verification claim follows from this document.

Document required settings for later deployment: real DB/Neo4j endpoints/secrets; local activation gates; exact catalog seed/version/hash and compatibility artifacts; suitability/readiness/algorithm versions; bounded closure/provider/batch/search settings; worker enabled/version/lease/attempts/backoff/poll; configured Expert/scope. An environment file is not automatically forwarded into a container. Native execution can use process-local configuration; keep real secrets out of tracked docs/code and do not silently reuse local-only paths such as /seed on Windows. Operational values must be explicit/versioned and checked before worker activation; no arbitrary inherited caps.

Today's intended C2 milestone is **source updates plus compile/build/type-check/scoped lint**, after explicit cluster transition. User will perform bounded manual/UI checks later on the DB-capable machine. Those observations need actual source SHA/environment/date/actor/tenant/fixture/steps/results; until then status is “code/build complete, runtime/UI pending” if source/build actually succeeds, not full C2 accepted. New executable evidence remains Not run; user manual verification does not authorize JUnit/Vitest/Playwright/Testcontainers.

Acceptance mapping: unchanged G01–G12 plus G13 history/compatibility; P01–P20 generation/policy/objective/format/config; R01–R14 Expert revision/local assignment/warnings; E01–E09 own projection/protected access. See the [updated acceptance plan](../../../testing/REQ-041-042-initial-pathway-test-plan.md). Technical limits do not certify numerical/performance results. Remaining production Identity/catalog publication/semantic contracts and actual readiness/content integration stay explicit Open items.

Confirmed: selected Role+Level, exact mastery policy, per-pair focus/difficulty, fallback/quality/search and local assignment design | C1 target/source distinction: section15 supersedes earlier pending-source labels | Open: owner readiness/content, production adapters and runtime/UI evidence | Rejected: history rewrite, fake PASS/approval, unauthorized DB changes/tests/cluster transition.

## 15. C2 source/build update — 2026-10-28

User explicitly approved C1 and requested C2 execution. Reference base5b17c77 plus uncommitted scoped changes; preserved checkpoints/history and the C1 amendment. Updated source is **built, not deployed or runtime-accepted**. [Build/static receipt](../../../testing/system/REQ-041-042-v011-source-build.md) records actual commands/environment/artifact hashes and limitations.

- Domain/ports: exact mastery-thirds-focus-v1, own prerequisite evidence, per-pair enums/coverage/ancillary metadata, separate warnings/quality/frozen needs/search scope. Old instructionLevel exists only for legacy read/identity; new providers cannot infer it.
- Catalog/compatibility: bounded full candidate teaching inventory/one Primary, exact0.11 bootstrap/hash/parity/sealed-read checks, preserved v08/v010 eligibility sources plus v011; historical/native source paths configurable. Compose source uses new v011 volume/seed, retains old volumes and forwards explicit bounds/worker/assignment settings, all activation default-off. No container/DB operation performed.
- Planner initial-whole-path-v2: bounded Primary-feasibility pass over the eligible source universe, then iterative whole-path search with admissible partial-quality/nonnegative distinct-cost bounds. Only proved generation publishes; SEARCH_LIMIT preserves its reason without falsely asserting missing providers. Fixed-set review cannot add/remove Expert choices. Correctness/performance remains untested until C3.
- Persistence: new V28 adds format discriminator/scoped immutable teaching_v2/one coverage constraint; envelope codec and JDBC dispatch raw format1 versus format2, keeping the original legacy hash computation. Version2 hash binds material needs/teaching/coverage/warnings/quality/content/dependencies/source/policy/overrides. Search execution scope/proof counters are immutable metadata outside that learning-content hash, allowing unchanged exact revalidation to retain identity. SQL/hash round-trip is Not run.
- TMP-REQ001-09 implemented/default-off through ReviewAssignments: trusted fixed local tenant, configured Expert, optional Role allowlist, explicit proposal-query bound, active account/grant and real exact persisted approval. No account/assignment/approval/PASS provisioning. API/FE reads focus/difficulty/notes and unique totals, groups alternative pairs by Module, preserves exact command keys/current revision checks and same-origin actor cache boundaries. New shared composition reuses current tokens/typography; no design scale change.

Actual verification: Java21 package passed with all test resources/compilation/execution skipped; Node26.12.1 FE TypeScript/Vite build and8-file scoped lint passed. Existing deprecated-API/bundle-size notices retained. No application startup/manual API/UI/DB/import/migration/test suite, commit or push. User's later manual/UI run remains pending.

ReadinessDefinitions/LiveReadiness/Availability/ContentAccess and actual protected content/start/segment-owner mounting remain **Open/default-deny**. Production Identity/publication/coherence/assignment/revocation remain distinct limits. Missing readiness version blocks positive/UNKNOWN admission; an arbitrary version cannot implement the owner. A reachable DB/scaffold is not sufficient. Today's achieved milestone is the implemented source/build scope; full C2 completion still requires those mandatory integrations and suitable runtime evidence. Rollback retains forward schema/dual readers/history and disables new writes/substitutes.

Confirmed: C2 authority and source/build observations | Source implemented: scoped0.11 policy/planner/format/local assignment/API/FE/config | Open: SQL/hash/optimizer/security runtime proof, real readiness/content and deferred manual/UI | Rejected: full C2/production/test-pass claim from builds, reset/repin, fake PASS/approval, commit/push or automatic C3.

## 16. Native DB cutover and bounded manual observations — 2026-10-28

User subsequently authorized applying current database versions and starting fresh without preserving learner data. This supersedes earlier no-DB/deferred-runtime boundaries for this local fixture; it does not change normal baseline/mastery/history rules or authorize C3. [Native cutover receipt](../../../testing/system/REQ-041-042-v011-native-cutover.md) records actual commands/environment/actors/artifact/results/limits. Earlier source-build observations remain dated.

Isolated PostgreSQL17.11 on15432, database adapt_learn_graph_v011, applied V1–V28 successfully; twelve initial tables and V28 constraints exist. Existing installed PG5432 was untouched. Separate workspace Neo4j2026.10.1 configuration/data imported exact0.11/994 nodes/5121 relationships, retained review metadata, and is online/read-only under dedicated service AdaptLearnGraphNeo4jV011.135 DRAFT bank items imported. Local seed configuration now accepts native seed/scope paths with existing defaults/gates/hash checks; Java21 package12:57:16+07 succeeded with tests skipped.

API18080/FE5173 started. Employee reads48 Roles/144 Levels0.11; fresh gap preview422 BASELINE_REQUIRED. Configured local Expert session and empty queue200, own empty pathway200, health/FE/proxied catalog200. Local assignment substitute is explicitly enabled only in ignored native configuration; actual same-tenant account/grant exists. No profile/baseline attempt/pathway request/revision/approval or readiness PASS was invented. No interactive browser/positive generation/review/content observation, retained-history/hash round-trip or executable tests.

DB migration/import/connectivity is complete for this fresh local fixture. Full C2 remains incomplete: real owner ReadinessDefinitions/LiveReadiness/Availability/ContentAccess and protected content/start/segment mounting remain Open/default-deny, worker off. Fresh baseline requires the actual LD author/review/publish flow. Preserve forward schema/dual readers; stop owned services gracefully for rollback, no down-migration. Generated credentials/local properties/logs remain ignored under workspace .tools/runtime/native-v011, not tracked deployment config.

Confirmed: fresh local DB authority and actual migration/import/read observations | Open: mandatory owner integration, positive full flow, actual UI and executable acceptance | Rejected: fake PASS/approval, full C2 claim from DB availability, automatic C3 or Git operations.

## 17. Current milestone and machine-transfer gate — 2026-10-28

User clarified the completion journey: actual baseline → persisted mastery → selected Role+Level gaps → explicit confirmation/generation → Expert include/exclude/validate/exact approval → Employee sees own approved pathway. **The milestone ends at pathway display.** Actual module learning/content/start/segment/assessment execution belongs to another owner. Earlier sections retain those protected contracts for future integration; their execution is not an additional acceptance step for this view-only milestone.

Planning-required ReadinessDefinitions/prerequisite evidence/gate mappings and module-version Availability remain mandatory and currently unavailable. Excluding the learning page does not provide these planner inputs. Source `InitialPathwayView` returns approved Module summaries and maps per-module access423/503 to LOCKED/UNAVAILABLE with no entry; this allows safe read-only display while learning access stays denied. Positive confirmation/proposal/review/approved-view evidence is still missing.

[Final static reconciliation and ordered blockers](../../../testing/system/REQ-041-042-v011-handoff-review.md) supersedes stale source-only/planned0.11 labels in earlier historical notes. Reviewed policy/schema/DTO/format/review paths align statically; no executable correctness/full-flow claim. Fresh Compose must separately provide same-tenant Expert/account/grant, real baseline publication, explicit gates/search/worker settings and exact writable-import→graceful-stop→read-only catalog cutover. Native state/secrets/cookies do not transfer.

Next-machine session first reads/reconciles and reports understanding, transferred state, gaps and plan, then waits for user OK. After OK prepare a **manual Compose walkthrough document** and bounded manual/API/UI verification; no executable tests are authorized by that step. Only after the agreed manual journey is accepted, request separate Cluster3 executable-test authority. No automatic C3/C4/C5, commit/push or Git rewrite. This handoff cleanup changes documentation only and preserves source/migrations/runtime data/history.

Confirmed: own approved pathway view endpoint and next-session report/OK gate | Open: planner inputs/fresh Compose/manual evidence | Deferred: learning execution and executable tests | Rejected: fake PASS/approval/version, default compose-up as full-flow proof, automatic cluster transition.

## 18. Confirmed reproducible Compose demo amendment — 2026-10-28

The user approved this document amendment and subsequent C2 implementation together. Goal: anyone using the repository's main `compose.dev.yml` can prepare a genuine full-Occupation baseline, obtain persisted mastery, confirm an exact Role+Level, review/edit/approve as Expert and see the same Employee's approved pathway. Learning execution remains outside scope. Existing acceptance G/P/R/E and history/tenant/replay/CAS rules remain; executable tests require separate C3 authority.

### Trusted local planning inputs

Separate default-off `pathway.initial.local-planning.enabled`, existing local-baseline-demo/initial/auth gates and `!prod` activate TMP-REQ001-10. Fixed server LOCAL-DEMO organization only. Exact checked-in v0.11 seed/hash defines eligible ACTIVE Module IDs and exact content versions. This is a local availability exception for planning, not production content publication or a protected learning entry.

Version `local-baseline-prerequisite-v1` defines a planning-only prerequisite decision: read original PostgreSQL profile through Profiles, resolve exact semantic compatibility through Semantics, compare that skill's unchanged mastery to the exact seed prerequisite edge requiredScore. Known mastery >= threshold satisfies that edge for planning. Lower mastery or missing compatible evidence creates a prerequisite learning need with original mastery or null plus its UNKNOWN reason. Pin profile/evidence identity, threshold and policy version. Never write PASS, modify mastery, rescore, repin or infer completion.

Each applicable external gate has a deterministic definition tied to seed/module/skill edge and this policy version. No internal gate is invented: a Module cannot simultaneously supply an unmet prerequisite and its dependent coverage; the shared validator must choose separate Modules or report unresolved. Missing/mismatched source, tenant, policy or profile integrity denies. Missing compatible skill is UNKNOWN; unavailable/corrupt evidence is an error. ContentAccess and LiveReadiness stay unavailable; approved summaries remain visible with no learning entry.

### Dev lifecycle and verification

Compose explicitly opts into these local substitutes with fixed server Expert identity and an additive active same-tenant DOMAIN_EXPERT fixture. It orchestrates migrate, exact graph/bank seed, await indexes and graceful read-only sealing before API/worker/web. Restart is idempotent and preserves data. Explicit deletion of this project's verified dev volumes is user-authorized; no startup reset and no deletion of unrelated volumes. Bank items remain DRAFT until actual LD author/review/activation; attempts, profiles, requests and approvals are never seeded.

FE review covers server-session/tenant caches, Role+member Level and no-write preview, explicit confirm/retry states, fixed-set Expert editing/exact approval, own approved locked cards, protected-data exclusion, empty/error/loading/mutation states, shared components/tokens and natural EN/VI. Actual tokens/AGENTS use 28px page and 15.5px body; DESIGN_SYSTEM.md's older 26/14 figures are stale and must be aligned without changing live tokens.

Acceptance extensions: G13/P10/P19/P20 cover exact compatibility, threshold equality/UNKNOWN, unavailable/version/tenant failures and deterministic gate definitions; P07/R03/R14 cover no invented internal gate and fixed-set repair; E01/E03/E09 cover safe approved read-only display. Planned C3 cases remain Not run. C2 build and bounded manual evidence goes in `documents/testing/system/REQ-002-041-042-compose-manual.md`.

Confirmed: reproducible main dev Compose, gated planning policy and FE rule review | Open: runtime/manual verification and production owner replacements | Rejected: fabricated learner evidence/PASS/approval, automatic resets, executable tests or automatic cluster transitions.
