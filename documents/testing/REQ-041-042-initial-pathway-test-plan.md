# Initial gap/pathway acceptance-to-test plan

**Current evidence synchronized:** 2026-10-29, Cluster4. Functions REQ-019-F01, REQ-020-F01/F02 and direct REQ-042-F01/REQ-004-F01 review/read dependencies. Existing G/P/R/E rule IDs and acceptance intent are retained. C3-REVIEW-r1 is complete within this selected scope: BE160/FE49/real-system2 Passed, with no final failure/error/skip. [Current receipt and actual acceptance→method→command→fixture mapping](system/REQ-002-041-042-workspace-integration.md#c4-review-evidence-synchronization--2026-10-29) distinguish unit/mock, API/security,29 real integration and2 real browser cases. The proposed destinations below retain planning history; they are not the actual executed command list. Broader G/P rules and owner execution remain unconfirmed by this run.

Business requirements: [Expert review](../features/Pathway%20review/README.md#fr-05-07). Current technical contracts: [shared](../technical/initial-pathway/Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md), [review](../technical/initial-pathway/Initial%20pathway%20review/Review%20Initial%20Adaptive%20Pathway.md), [Include](../technical/initial-pathway/Pathway%20adjustment/Include%20Pathway%20Module.md), [Exclude](../technical/initial-pathway/Pathway%20adjustment/Exclude%20Pathway%20Module.md), [Employee view](../technical/initial-pathway/Adaptive%20pathway/View%20Adaptive%20Pathway.md). [Testing guidance](README.md) applies.

## Current acceptance and evidence boundary

- Real server identity/tenant/membership/entitlement/CSRF and scoped assignment precede existence/count/receipt reads. Include workspace variants, revocation/foreign tenant/flag-off/prod/source drift and identity-switch pending/cache cleanup.
- Include/Exclude/neutral Remove use exact expected revision/hash/key. Cover already-included/absent/neutral no-ops, persisted latest override, eligible versus ineligible Catalog return, missing-provider UNRESOLVED and Include repair; no catalog/history/mastery deletion.
- Move Up/Down swaps exactly one adjacent position and persists ordinals/hash/revision/history. Cover inverse restore, first/last/nonmember, skill/provider inversion with422 and unchanged whole draft/receipt/history, valid external evidence, missing/internal/version-mismatched gates and cycles. Titles/difficulty must not define prerequisites.
- Check always validates on the server. Equal hash retains detail; changed hash reloads; persisted/fresh mismatch remains STALE. Include reconciles then rechecks; a follow-up Check error cannot resend a committed Include. Preview refreshes/checks and stays draft-only; final confirmation binds the captured exact revision/hash.
- Preserve explicit valid order through Check/reload/membership/preview/confirmation and own Employee projection; insert new prerequisites before dependents without losing valid relative order. Approved/archive locks apply to every edit surface, including Check repair suggestions.
- Preserve existing four-stat queue, horizontal Catalog/parallel lists, full-height guarded cross-list drops, keyboard/mobile alternatives, page-local search/filter/count truth, shared tokens, long-content/empty/asymmetric responsive layout and equivalent EN/VI.
- Own Employee read retains exact approved order/dependencies/frozen baseline and live unavailable/lock reasons, with no draft leak or writes. Baseline attainment is not completion. Actual content/start/segment execution (E04–E06) remains deferred to its owner; preserve the planned protection rules.

The [workspace integration receipt](system/REQ-002-041-042-workspace-integration.md#scoped-document-and-source-reconciliation--2026-10-29) preserves dated BE428/FE2507/lint, V35 row preservation and bounded HTTP observations. The user confirms Move Up/Down and Remove UI happy cases. These are separate manual/build evidence, not executable-test passes, agent browser verification, benchmarks or full security/concurrency proof. Subsequent user edits mean revision11/18 cannot be treated as current.

At the earlier document reconciliation, `frontend/system-tests/REQ-019-F01-expert-pathway-review-flow.spec.ts` still expected Regenerate/prototype feedback. Approved C3 reconciled that file in place with the real review flow; final2-case system evidence now passes. The original archived/unresolved equal-hash Include-disabled assertion initially failed; the user separately approved exactly one C2 guard `blocked || !editable || approval !== null`, followed by successful component and real-system retest. [Failure/repair history](system/REQ-002-041-042-workspace-integration.md#preserved-failure-and-repair-history) remains retained. C4 performs document checks only, no executable rerun/runtime mutation/stack startup or automatic C5.

### C3-REVIEW-r1 executed disposition

| Acceptance / Function scope | Actual evidence disposition | Limit |
| --- | --- | --- |
| R01–R14, REQ-019-F01/REQ-020-F01/F02 | Passed for selected review rules across unit/API/component, real adapters and real system as individually mapped in the receipt | Assignment/owner positives use named local/test policies; no production owner certification. Native browser drag Not run; cross-list intent is component evidence |
| E01–E03/E07–E09, direct REQ-004-F01 | Passed for mapped own/approved/archive/no-draft/no-write projection and fail-closed hooks; same revision5/hash/order14 rendered by Employee in real browser | Protected content/start/segment portions of E08/E09 and E04–E06 Deferred/Not run; no execution/PASS/completion claim |
| Direct G11/G12/P12/P13 and P07–P11/P18–P20 dependencies | Only exercised selection/receipt/fencing/provider/gate/identity/retention/budget branches mapped to actual methods | Do not mark whole G/P rows or full optimizer/whole-baseline acceptance Passed from a dependency subset |
| Remaining G/P baseline/generation, production assignment and management CRUD | Outside C3-REVIEW-r1; retained planning/historical evidence only | No new result inferred; no scope expansion |

Exact current files/invocations replace proposed destinations **for executed subsets only** via the [unit/API/component mapping](system/REQ-002-041-042-workspace-integration.md#unit-component-and-api-security-mapping), [real integration mapping](system/REQ-002-041-042-workspace-integration.md#real-integration-mapping), [real system mapping](system/REQ-002-041-042-workspace-integration.md#real-system-mapping-and-isolation) and [recorded commands](system/REQ-002-041-042-workspace-integration.md#recorded-commands). No rerun totals are added to final counts.

## Retained dependent acceptance planning

The following previously approved baseline/development variants retain their original scope. This review does not change baseline UI, add fixture/reset authority or run their tests. Current runtime authorization remains the explicit scope of this task.

Confirmed Employee UI refinement2026-10-28 extends G01–G03/G11/G12 and existing Role selection acceptance planning: explicit native-radio member-Level list, current pair preselected only when bound, summary Review skill gap button/always-visible baseline state, no summary scope/timestamp, one fixed Employee persona and B/C denial, wide dialogs with hidden scrollbars/reachable footer and keyboard access, semantic selected/focus/text highlights. Opening/preview must not change selection/mastery/pathway. These are planned C3 cases, not executable evidence or authorization; manual C2 observations belong in the Compose receipt.

Confirmed local planning amendment2026-10-28: shared design18 adds TMP-REQ001-10 and main dev Compose. C3 variants to implement after separate approval: exact seed Module/content allowlist and foreign tenant/source drift denial; mastery equal/below prerequisite threshold and compatible UNKNOWN reason; exact evidence/gate/version identity; no invented internal gate with separate-provider repair; startup idempotence/sealed catalog and optional explicit dev reset; FE validation tied to exact hash, safe locked reasons and server-issued persona switching A/B/C. These extend G13/P07/P10/P19/P20/R03/R14/E01/E03/E09. Bounded C2 manual observations are recorded separately in system/REQ-002-041-042-compose-manual.md and never mark these executable cases Pass.

## Actors, fixtures and method mapping

- ORG-A/Employee-A and ORG-B/Employee-B; Expert-A assigned to Role-A, Expert-U unassigned, revoked Expert-R; one configured local Expert-L with separate default-off gate/Role scope; unauthenticated/other-actor/mixed-prod cases. Opaque synthetic fixture IDs are not production truth.
- Employee explicitly selects Role R with member Level L-J or L-S; server derives effective-choice IDs. Duplicate/foreign/nonmember/unpublished/missing pairs included; no guessed Level or enterprise mapping.
- Mastery fixture: SQL0.60 required0.75; Modeling0.80 required0.70; Quality new absent; mandatory/optional flags. Genuine immutable baseline/profile original scope and history; corrupt expected original skill is a separate fixture.
- Isolated graph fixture: A/B/C needs and prerequisite P, MBC with B PRIMARY/C SUPPORTING plus C's own Primary MC, alternative MA1/MA2, unusable Primary variants, internal-gate variants and cycles. Shared coverage is legal only under confirmed fallback permission; every Module has exactly one Primary. Pin graph/policy/content/readiness version; use deterministic hand-authored expected objectives, never the development seed as oracle.
- Exact pair enums are PRIMARY/SUPPORTING/INCIDENTAL and LOW/MEDIUM/HIGH; include one Module with independent per-skill difficulties, invalid/missing/retired fields and zero/multiple Primary fixtures. Format1 instructionLevel remains only a historical-read fixture, never translated into new teaching fields.
- Mastery-band fixtures include0,1, finite decimals on both sides of1/3 and2/3, rational equality at the policy boundary where representable by the policy fixture, UNKNOWN/null with reason, known gap0, invalid evidence and prerequisite-only needs. Expected classification uses exact comparisons; no rounded decimal stands in for exact1/3.
- Real readiness fixtures expose version-matched PASS/FAIL/NOT_ASSESSED evidence through approved owner contracts; they are independent of difficulty bands. Missing contract/outage denies; no completion-to-PASS fixture shortcut.
- Every row below inherits actor/tenant fixture plus trigger→expected. Each rule maps to proposed method name equal to rule ID or a descriptive method carrying that ID.

| Suite code | Proposed file / method naming | Proposed command (not run) |
| --- | --- | --- |
| GU | backend/src/test/java/com/adaptlearngraph/recommendation/domain/RoleGapTest.java, Gxx_* | backend: `.\mvnw.cmd '-Dtest=RoleGapTest' test` |
| PU | backend/src/test/java/com/adaptlearngraph/recommendation/domain/InitialPathwayPlannerTest.java, Pxx_* | backend: `.\mvnw.cmd '-Dtest=InitialPathwayPlannerTest' test` |
| RU | backend/src/test/java/com/adaptlearngraph/pathway/application/InitialPathwayReviewTest.java, Rxx_* | backend: `.\mvnw.cmd '-Dtest=InitialPathwayReviewTest' test` |
| API | backend/src/test/java/com/adaptlearngraph/pathway/api/InitialPathwayApiBoundaryTest.java, G/P/R/Exx_* | backend: `.\mvnw.cmd '-Dtest=InitialPathwayApiBoundaryTest' test` |
| INT | backend/src/test/java/com/adaptlearngraph/pathway/infrastructure/InitialPathwayAdapterIntegrationTest.java, G/P/R/Exx_* | backend: `.\mvnw.cmd '-Dtest=InitialPathwayAdapterIntegrationTest' test` |
| SYS | frontend/system-tests/REQ-041-042-initial-pathway.spec.ts, rule-tagged scenarios | frontend: npx playwright test system-tests/REQ-041-042-initial-pathway.spec.ts |

Package/file names are Proposed until implementation structure exists; later evidence must replace them with actual file/method and exact commands. INT starts one disposable PostgreSQL/Neo4j Testcontainers environment per approved suite, real adapters and fresh migrations; never development Compose volumes. SYS real-stack execution requires separately authorized environment and real contract, not mocked localStorage approval. Unit fake ports verify policy only, not integration.

| Function | Acceptance rule mapping |
| --- | --- |
| REQ-041-F02 | G01–G11/G13; G12 at confirmation handoff only |
| REQ-001-F02 confirmation extension | G03/G08/G11/G12, P01/P12/P13; original selection rules retain their separate historical plan |
| REQ-042-F01 | P01–P20 |
| REQ-020-F01 include | R01/R03–R05/R07/R09–R14; P19 historical-read dependency |
| REQ-020-F02 exclude | R01/R05–R14; P19 historical-read dependency |
| REQ-019-F01 review/Check/move/remove/confirm | R01–R03/R05/R06/R08–R14; E04 downstream denial; P19 exact old approval/hash |
| REQ-004-F01 read | E01–E03/E07–E09; E04–E06 additionally verify actual content/start/segment owner gates; P19 history |
| REQ-046 limited consistency/recovery | G11/G12/P12/P13/R10/R11 only for this flow; no full REQ-046 delivery claim |

The tables here define acceptance/planned suite ownership; actual executed methods/results are only those in the dated C4 mapping above. Read-only cases compare before/after learner state, receipts/outbox, selection, baseline pins and pathway pointers in their isolated fixtures; operational request logging is permitted. Identity/assignment unavailability and protected response-cache scope are failure variants, never permissive defaults. Unexecuted proposal-dependent choices retain their planning status.

## F02 and confirmation — G01–G13

| Rule | Actor/fixture and trigger | Expected output/state | Suites |
| --- | --- | --- | --- |
| G01 | Employee-A previews explicit roleId+levelId with valid profile; repeat another member Level on same Role | Exact selected-Level requirements/gaps from one immutable profile; stable hash per source, no max/union; reject foreign/nonmember Level | GU/API/INT |
| G02 | Employee-B, unassigned actor or foreign/unpublished/missing/ambiguous binding preview | Deny safe404/403/configuration; scope filtered before output; no mutation | API/INT |
| G03 | Employee-A repeatedly previews different BRs | No selection/archive/request/profile/progress/history writes; no automatic generation | API/INT/SYS |
| G04 | SQL below/equal/above0.75 with stored conservative vs point mastery | max(0,requiredScore-conservative); equality0; display rounding cannot affect decision | GU |
| G05 | Same known mastery with LOW/MEDIUM/HIGH label | Same gap; confidence explanatory only; no second SE penalty | GU/API |
| G06 | One mandatory skill surplus, another deficit; optional deficit | No mandatory compensation; optional does not alter required aggregate | GU |
| G07 | New absent/incompatible skill vs missing expected original data/read outage | Genuine absent→UNKNOWN/null gap+foundation; integrity/outage→error, no fabricated UNKNOWN | GU/INT |
| G08 | Baseline vOld complete; catalog adds mandatory Quality | Learning need without retake/reset/re-score/repin; original profile skill set unchanged | GU/INT/SYS |
| G09 | All mandatory known/gap0; optional gap remains | NO_LEARNING_REQUIRED; no empty path/fake completion/certification | GU/API/SYS |
| G10 | Empty mandatory/malformed/nonfinite requirement input | Invalid configuration, no empty-set success/partial result | GU/INT |
| G11 | Preview Role-B while Role-A current; confirm B; also stale preview/selection/profile/catalog variants | Current preview succeeds and planning hash binds resulting B selection; stale variants409 with no winner overwrite; no hash circularity or client source substitution | API/INT |
| G12 | Same key/body replay after later selection change; key/different body; different-key equivalent input; competing confirmations/write failure | Reauthorize exact receipt before new-command checks; mismatch409; equivalent generation input converges; one effective result/atomic state, no duplicate dispatch or replay-driven selection restore | API/INT/SYS |
| G13 | Same original v08/v010 profile against reviewed v011; unsupported origin, changed skill semantics and unchanged pairs | Known exact provenance retains identical mastery/confidence/origin pins; requirements follow selected Level; unsupported/changed semantics deny; no fingerprint overwrite/reset/retake/rescore/repin or new baseline allowance | GU/API/INT |

Baseline allowance/admission remains existing evidence scope plus new regression; this plan does not claim re-execution of baseline suites.

## Generation — P01–P20

| Rule | Actor/fixture and trigger | Expected output/state | Suites |
| --- | --- | --- | --- |
| P01 | Explicit Employee confirmation with usable current F02; preview/bare GET; missing or in-progress baseline | Only explicit usable intent schedules; accepted PENDING/GENERATING until proposal durable, then AWAITING_EXPERT_REVIEW; baseline-required next step admits no pathway request | API/INT/SYS |
| P02 | A/B/C with shared transitive P and repeated providers | Related graph metadata dedup, no per-skill N+1 adapter calls by default; preserved missing reasons | PU/INT |
| P03 | Valid pair enums, one Module with differing per-skill difficulties; numeric/missing/retired fields; Primary outside initial need subset; zero/two Primary variants | Exact full Module teaching inventory checked, one Primary enforced; malformed contract rejected, no instructionLevel conversion/module-wide difficulty guess | PU/INT |
| P04 | Several full pathways with different quality/minutes/VND/benefit/count and exact ties | Compare confirmed whole-path tuple, count amounts once, suitable plan beats shorter fallback, final IDs/assignments stable; per-offer first-valid ranking cannot substitute | PU |
| P05 | UNKNOWN need with exact LOW available, then only MEDIUM/HIGH eligible; absent suitability/own evidence | Preferred LOW and retained null mastery/reason; ordered flagged difficulty fallback when allowed; no forced mastery0/fixed gain, missing policy/corrupt evidence blocks | PU/INT |
| P06 | MBC B PRIMARY/C SUPPORTING with MC C PRIMARY available; then no usable C Primary anywhere; incidental C variant | Normally retain MC for C; benefit may improve a true tie. Legal Supporting coverage only when Primary infeasible, with warning; module amounts dedup and incidental never covers | PU/INT |
| P07 | Top provider infeasible; ranked alternative feasible | Whole-path selection tries valid alternative deterministically, not independent top1-only sort | PU |
| P08 | P before A, independent B/C, multi-hop prerequisites | Feasible topo order respects dependencies; independent steps not unnecessarily serial-locked | PU/INT |
| P09 | Same provider teaches prerequisite/dependent with/without explicit internal gate | Valid internal contract represented; absent contract not silently self-loop dropped | PU/INT |
| P10 | Readiness PASS/FAIL/NOT_ASSESSED/mismatched version/missing mapping | Only exact PASS meets access gate; planned readiness step possible with mapping; absent mapping unresolved | PU/INT |
| P11 | Missing content/cycle/no feasible provider/limit exhaustion | Explicit unresolved/limit reasons, no approvable full path or silently removed need/edge | PU/INT/SYS |
| P12 | Same-input concurrent worker/retry/crash before/after commit/outbox delivery; lease expires and old worker resumes; retry exhausted | One effective immutable result/current pointer; only current claim token commits; dedup receipt/outbox; exhausted work explicit failure with no duplicate success | INT |
| P13 | Catalog/selection drift between graph batches/during compute, Role switch, or Expert review started | Reject mixed snapshot; old-selection work cannot commit; history retained, no automatic replacement of review edits or stale publication; owner freshness protocol needed | INT/SYS |
| P14 | Valid complete path needs>5 Modules; outage after partial read | No rank5 truncation; outage not missing-content/UNKNOWN and never partial success | PU/INT |
| P15 | Known mandatory need at exact conceptual band boundaries/neighboring finite decimals,0/1; same positive gap at differing mastery; known gap0; prerequisite-only UNKNOWN/known | Correct unrounded3m comparison, preferred LOW/MEDIUM/HIGH; gap gates need rather than band; known gap0 excluded; prerequisite uses its own evidence; invalid evidence distinct from UNKNOWN | PU/API/INT |
| P16 | Each preferred difficulty with all alternatives; wrong-band Primary vs exact-band Supporting; Primary unavailable vs outage/limit | LOW→MEDIUM→HIGH; MEDIUM→LOW→HIGH; HIGH→MEDIUM→LOW. Primary precedence/absence proved under mandatory conditions; every coverage fallback has attention+reason; warnings separate from validation errors | PU/INT |
| P17 | Multi-need competing fallback counters; duration tie/price tie; independent Supporting pair difficulties; duplicate beneficiary/UNKNOWN/prerequisite/gap0 cases | Minimize Supporting count, then rank2 count, then rank1 count, then minutes/VND; maximize distinct eligible Supporting beneficiaries only after ties, retain actual pair difficulty; no double-count coverage-as-benefit or implicit change to coverage rank; fewer modules then stable IDs | PU |
| P18 | First feasible path is suboptimal; same optimum via different iteration orders; search budget before proof with feasible incumbent; proven infeasibility | Proven best required for generation publication; deterministic result; SEARCH_LIMIT/NOT_PROVEN is not SUCCEEDED/current valid proposal; errors/outages do not establish Primary absence or infeasibility | PU/INT/SYS |
| P19 | Existing format1 revision/approval/receipt and original hashes; format2 write/read; unknown format; changed warning/content/version | Exact old decoding/hash retained, new shape enforces per-pair/coverage constraints and immutable history, no label/backfill/fake legacy value; new hash binds warnings/policy/overrides; unknown/corrupt format denies | PU/API/INT |
| P20 | Missing/mismatched policy/readiness/catalog/search/worker version/config; gate off/prod; same config then changed config | Explicit configuration failure before valid publication; real pins bind admitted work; preserve claim/CAS/history, no guessed operational defaults or successful partial path | API/INT |

## Review/adjustment — R01–R14

| Rule | Actor/fixture and trigger | Expected output/state | Suites |
| --- | --- | --- | --- |
| R01 | Assigned/unassigned/revoked/cross-org Expert queue/detail | Authorize before existence/count/paging; no foreign review/evidence | API/INT/SYS |
| R02 | Expert inspects current proposal | Source versions, safe gap/UNKNOWN, grouped Modules/per-skill focus/difficulty/coverage/benefit, separate warnings/errors/totals/quality/dependencies match exact revision; no answer keys/theta/SE | API/SYS |
| R03 | Assigned Expert includes eligible alternative; moves adjacent independent module; reload/Check/preview | New revision/hash/ordinal/override history; dependency-valid saved Expert order retained; no approval/mastery mutation | RU/INT/SYS |
| R04 | Include foreign/unpublished/unsuited Module | Deny or invalid eligibility without partial writes | RU/API/INT |
| R05 | Include-existing/Exclude-absent/Remove-neutral; current/stale tuple; boundary/nonmember moves | Current membership no-op preserves revision/history with one receipt; stale409; boundary/nonmember422/no write; replay safe | RU/INT |
| R06 | Exclude or Remove sole provider; Remove from Excluded; eligible/ineligible candidates | Missing coverage stays UNRESOLVED/no auto-readd; EXCLUDE persists exclusion; REMOVE clears membership and only eligible content returns to neutral Catalog; all history retained | RU/INT/SYS |
| R07 | Include suitable replacement after exclusion | New revision can recover VALID; previous excluded action/history retained | RU/INT/SYS |
| R08 | Confirm unresolved/cyclic/missing mapping proposal |422/no confirmation or learning unlock | RU/API/INT |
| R09 | Fresh Check, equal/changed hash, preview refresh, final confirm vs stale; manual order | Fresh server validation always; equal hash no detail reload, drift cannot approve; preview sends no approval; only final exact snapshot approved with saved order | RU/INT/SYS |
| R10 | Concurrent distinct edits/confirmation; concurrent identical key/body; same-key/different body | Distinct edits have one CAS winner/409 loser; identical accepted retries return one receipt; mismatch409, no lost edit/stale approval | INT |
| R11 | Dependency outage/write failure/unknown commit; replay accepted revision4→5 edit after revision6; new key with revision4 | Rollback on failed transaction; authorized replay returns original revision5 outcome without reapplying; new stale command409; GET returns current revision6; no approval transfer | INT |
| R12 | No-gap without proposal; initial unresolved without draft vs excluded invalid draft; Role drift/archive/revoked reviewer | No mandatory no-gap approval/fake completion; only existing editable draft repaired; preserve history, restrict stale/archived/revoked scope including receipt replay | API/INT/SYS |
| R13 | Configured Expert-L/ORG-A/Role allowlist vs wrong Expert/tenant/Role, inactive account/grant, flag-off/prod and substitute replacement | Filter before existence/paging/receipt; store versioned local scope; real exact persisted approval still required; revocation/replacement denies as required without deleting approval/history; no unconditional valid adapter | API/INT/SYS |
| R14 | Fixed-set membership/order, prerequisite inversion, external/internal gates, warnings, Primary exclusion leaving Supporting, search uncertainty, Check repair | Preserve selected set and valid relative order; insert new prerequisites before dependents; inversion422 with reasons/no writes; no title/difficulty prerequisite inference; warnings retained, incomplete/unproved cannot approve; Check repair lifecycle locks; same receipt/CAS/hash rules | RU/API/INT/SYS |

## Employee read/access — E01–E09

| Rule | Actor/fixture and trigger | Expected output/state | Suites |
| --- | --- | --- | --- |
| E01 | Own/foreign/unauthed read or forced learner/org fields | Own only, deny foreign safely, server context authoritative | API/INT |
| E02 | GET in no-request/pending/generating/review/unresolved/blocked/retry/stale/no-gap state, then exact approval | Coherent generation/review/validation fields and EN/VI display; approval ends awaiting-review polling; no GET generation or premature learning links | API/INT/SYS |
| E03 | Exact approval after Expert adjacent reorder and membership repair; own Employee Roadmap/Timeline; live readiness change | Same approved revision/hash/ordinals/providers/dependencies; preview grants no Employee access; live lock reasons do not mutate frozen history; no global ordinal lock | API/INT/SYS |
| E04 | Direct content/start API before approval/with old approval | Deny even if UI bypassed; no learning mutation | API/INT/SYS |
| E05 | P readiness absent/fail/pass/version mismatch vs completion-only | Lock/unlock from exact readiness+approval; list position/completion alone cannot pass | API/INT/SYS |
| E06 | Independent Module after another locked branch; same-module internal gate | No artificial global sequential lock; internal gate still respected | API/INT/SYS |
| E07 | Archived path, return to same Role, later baseline Blueprint change | History read-only/no resume; Blueprint alone not erase progress/mastery/archive active path | API/INT/SYS |
| E08 | Readiness/content permission revoked or dependency outage during read/start | Restricted/unavailable; no permissive default or write from projection GET | API/INT/SYS |
| E09 | Own approved0.11 path with per-skill fallback notes and legacy archive; repeat reads with availability change; direct content/segment request bypassing UI | Natural equivalent EN/VI notes and useful lock reasons, no draft rankings or false gap closure; old content refs unchanged, no GET learner writes; actual protected route rechecks current tenant/exact approval/readiness, no public contentUri bypass | API/INT/SYS |

## Retained manual procedure — results are recorded separately

This procedure was originally planned before the shared workspace journey. Later HTTP/manual results retain their own fixture/date; the dated C4 receipt separately records actual C3 new-order approval→Employee and scoped negative/browser evidence. This procedure itself is not an executable pass or a new pending-operation instruction. Reuse existing Target Roles, /expert/pathway-review, /expert/pathway-review/:pathwayId and /employee/pathway only within an authorized runtime scope; never target preserved development DBs for disposable tests. No manual steps or executable cases were rerun in C4.

1. LD authors/reviews/publishes a genuine baseline for the scoped fixture; Employee-A completes it and views persisted mastery, then authorized exact Role+Level gaps. Retain pair if selected earlier; verify skill explanations, optional skills and no selection mutation from preview.
2. Confirm Role with retained retry identity; see generating, then awaiting review only after persisted valid proposal.
3. Authorized Expert-A (or explicitly configured local Expert-L with a real same-tenant account/grant) opens scoped queue/detail, inspects focus/difficulty/notes and unique totals. Exclude sole provider; see missing coverage and blocked confirmation. Include replacement, inspect fixed-set order/warnings, validate then confirm exact revision; no automatic approval/reoptimization. Finish current manual journey by returning as the same Employee and viewing the safe approved sequence/notes; no learning start is required. Access may remain LOCKED/UNAVAILABLE without a fabricated entry.
4. Employee-A reads own exact approved sequence/notes and safe LOCKED/UNAVAILABLE states where learning input is absent. End the current milestone here; no Module start/content interaction required.
5. Repeat cross-tenant/stale/replay/failure cases in isolated fixture environment, verify history and no unauthorized writes.

Deferred owner scope: direct protected Module/start/segment denial and real versioned readiness PASS/unlock observations remain in E04–E06 for separately approved integration; never manufacture progress/PASS. Automated variants of all manual cases remain C3-only.

The current C4 receipt supplies actual C3 date/environment/HEAD, fixture IDs, commands/files/methods, counts/results, failures and limits for the selected subset. Remaining cases still require their own execution evidence. Static source/JSON/document review is not executable acceptance.

## Cluster1 document amendment receipt — 2026-10-28

Reference source5b17c7768dee4dbcee3a19881177e5b476b4350a, owner main4c33273, preserved c932981/7080f00/85e1ff6. User confirmed0.11 semantics/quality/fallback/search choices and requested C1 updates. Seven Function contracts, shared flow/data design, architecture/planned schema, Mermaid source and acceptance/index were updated:12 product Markdown files. New rules G13/P15–P20/R13–R14/E09 remain Planned/Not run.

Document QA: `git diff --check` passed;21 added/changed local-link occurrences resolved to existing files/fragments; changed Markdown code-fence counts are balanced. Diff scope contains no non-Markdown files, backend/frontend/config/migration changes or staged entries. Mermaid source was inspected, not rendered. This receipt is document QA only, not executable-test, build, deployment, security, optimizer or runtime evidence. Workspace task/current/temporary09/Vietnamese records are updated separately.

No executable tests, compile/build/lint, DB/network-to-DB, migration/import, container/tool installation, Git stage/commit/push or automatic C2 transition occurred. User-reported installed JDK/Node and usable external DB are environment context, not this agent's runtime verification. The planned C2 source/build milestone and user-deferred evening manual/UI acceptance remain separate and unexecuted.

## Cluster1 document review receipt — 2026-10-27

Source base HEAD1580e44c235423e0961977f2c0949452ab3037aa. Continuation rechecked the same HEAD and source JSON:181 instructionLevel mappings (14/80/87), no numeric OC in current review payload and no instructionLevel in all181 pinned0.9 TEACHES rows. All5471 review nodes/relationships remain NEEDS_EXPERT_REVIEW. No owner validator/importer/test execution, workbook verification or runtime DB check. Scoped git diff --check found no added whitespace errors;24 Markdown files (21 product +3 coordination) and353 local link occurrences were inspected for file targets/fragments/fences, with no new broken links or unbalanced fences. Six pre-existing stale testing-index anchor occurrences are unchanged from HEAD and remain outside this flow's scope; not counted as new-link success. Mermaid source was inspected, not rendered or runtime-validated. Two-space Markdown hard breaks are retained deliberately.

Only documents changed, all unstaged; no runtime/migration/frontend implementation/owner Neo4j source changes, tests/builds/DB/container/Git index operations. This receipt is **document QA**, not executable acceptance. All cases above remain Planned/Not run.

## Numerical/performance and open dependencies

No numerical scoring validation, latency SLA or production planner capacity is certified. [C3 bounded measurements](system/REQ-002-041-042-workspace-integration.md#bounded-measurements-and-remaining-limits) record real Check3 needs/4 offers/3 selected/1 edge/budget10000,3 warmups+30 sequential samples/1 thread/330 JDBC prepares, p50=284.120ms/p95=314.969ms. Graph queries/DB hits/cold costs are excluded. Separate in-memory validator samples and post-system resource snapshots have different scopes. Correctness/no-write assertions pass; timing/resource observations are descriptive, without SLA/p99/production benchmark claims.

Owner production publication/semantic/assignment/revocation and live readiness/content remain integration dependencies. Historical V28/native observations below do not limit the new real-adapter C3 evidence: the workspace V34→V35 suite now proves full aggregate/checksum retention, persisted legacy/new-format identity, approval and concurrency/recovery for its fixtures. This does not certify production migration rollout or owner policies. Job/search/lease settings are explicit test inputs; operational production settings remain separate. Learning-content/start/segment execution remains deferred. Any seed is only a named fixture/source, never a production oracle. Unmapped G/P/owner cases retain Planned/Not run status.

Confirmed acceptance intent | Selected C3 review/read evidence: Passed as mapped | C4 documentation: synchronized | Open: production owners, native browser drag, deferred execution and broader G/P evidence | C5: not started.
