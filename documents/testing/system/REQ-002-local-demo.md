# REQ-002 local demo — actual operations and replacement boundary

2026-10-22, Asia/Bangkok. Explicit user approval: implement the proposed temporary local bypass to prioritize UI/full baseline operations, then update the existing walkthrough. This supersedes Session3's unavailable-only boundary **inside this demo only**. [Contract](../../features/Baseline%20knowledge%20assessment/Local%20Demo%20Flow.md); TMP-REQ002-12 records activation/consumers/owner/replacement.

## What now runs

One main Compose command `docker compose -f compose.dev.yml up --build -d` starts API with local,local-baseline-demo, explicit local-demo enabled, !prod. Migration remains local,migrate. Server-defined persona slugs ld/employee-a/b/c/admin map to five deterministic dedicated accounts in existing local organization; an HttpOnly/SameSite=Strict cookie selects only an allowlisted persona. No real authentication/grants/revocation claim. Shared shell Mode/localStorage is not a baseline principal.

LocalDemoConfiguration explicitly routes @Primary demo ports; ordinary constructors retain default-false publication/review behavior. Demo catalog permits unreviewed active paths in the one Occupation; item eligibility/preview/content/scoring read exact135 DRAFT versions without publishing/changing their source. Normal C2 remains unchanged/off. The fitted artifact is SHA089ecd096815fe6e41fce47bfed53ec655f774132ddf486c811cc90bf55bf70e, with generating truth kept separate; c=.25 fixed. Runtime reference model/mapping are explicitly demo-only, unapproved. V18 set source=SEEDED/status=PROMOTED is a storage eligibility tag with SYNTHETIC diagnostics/model artifact_ref; no actual-pilot calibration run/real approval/V23 pointer/command receipt is fabricated.

Real domain/use cases/JDBC perform Save/Preview/Activate, full-union admission, pinned attempts/responses/deadlines/finalization/result/history/allowance. LocalBaselineDemoPanel uses existing Button/Text/font/tokens and EN/VI, with a visible demo warning. L&D workspace/list and Employee direct Occupation route are usable. Selected-role entry still needs owner selection integration; use direct Occupation for this walkthrough. No C/Admin calibration UI was added: the already fitted artifact supplies the demo baseline, not an observed persisted C1/C2 operation.

## Actual allowed verification

[Machine-readable bounded manual operation/preservation](REQ-002-local-demo-observation.json). These are main-source compile/static checks and explicit live demo HTTP operations, **not executable acceptance tests**.

| Observation | Actual result / limit |
| --- | --- |
| Java21 compile/package |294 main sources,8 app resources +26 migration/seed/demo resources; final Docker package BUILD SUCCESS23:33:26+07. Test resources not copied/test sources not compiled/tests skipped. Initial ambiguous Configuration import corrected; one in-progress build stopped before deployment to correct mapping configuration hash |
| FE static/build |140 production TS roots/0 diagnostics/0 test imports; direct Vite build exit0 with existing bundle-size advisory; new panel lint exit0. No tsc -b/Vitest/Playwright |
| Main Compose |Build/start exit0; migrate exit0, API/PostgreSQL/Neo4j healthy, WEB8088 running. Existing named data volumes retained. No helper stack/reset/import |
| Readiness |OCC-15-1212.00,135 eligible items,15 skills,minimum3/skill=45 questions,missing parameters0 |
| L&D Save |Information Security baseline demo,45 questions/2700 seconds, expected revision0 created working revision1 |
| Preview/Activate |Preview feasible=true; new Blueprint1844e809-6a04-4bda-bcd8-3f70eff3876b/version1 Active. No old Active overwritten |
| Employee C |Direct OCCUPATION_EXPLORATION; saved first displayed option without reading answer keys. Resume after one answer kept exact attempt ID/deadline.45 accepted responses → AUTO_SUBMITTED |
| Result/history |15 skills,assessmentScope=OCCUPATION; own history1/contains attempt. Completed start retry409 ALLOWANCE_CLOSED; Employee B reading C result404 NOT_FOUND |
| User personas |A/B have no attempt/completion; reserved for user. C is intentionally completed and retained for history/allowance checks |
| Restart/idempotency |Repeat exact cached Compose startup re-created migrate/API; all86 platform table counts/canonical row digests before versus after restart identical. No extra accounts/sets or reset of learner progress |
| Source/history preservation |All23 migration bytes and official release/sidecar hashes unchanged; question_bank/item_version/target_selection/target_selection_request and both V23 tables retain original digests. Existing11 selections unchanged; V23 tables still empty |
| Browser |Fresh tool inventory apps/browsers empty. Rendered UI, EN/VI, keyboard/responsive **NOT RUN**, not inferred from HTTP/Vite |

The [observation](REQ-002-local-demo-observation.json) lists exact changed table counts. Additions:5 demo accounts/roles,3 learner states,1 model/mapping/set with135 parameters,1 Blueprint/version/current,1 completed demo attempt/45 responses/15 skill results/evidence and normal command/audit/outbox records. No original account/selection/history reset or official-content write. Demo evidence must remain distinguishable by dedicated accounts/model/pins when real consumers arrive; never relabel it as real-learner calibration/validation.

Recovery: `.tools/local-baseline-demo/20261022` contains before-source copies/dirty patch, fresh readable custom PostgreSQL dump and pre-provision/pre-restart count/digests; dump size/hash in observation. pg_restore full decode exit0, no live restore. All earlier backups retained. An initial restart command used the workspace rather than repo directory and failed before any action; corrected verification used the main Compose from repo.

## Remaining verification and rollback

### Handoff continuation — 2026-10-23

The previous turn was interrupted during memory/progress synchronization by the tool approval-review usage quota; runtime implementation and the22 October smoke had already completed. The user requested continuation. Decision/task/CURRENT/Vietnamese progress/CORE_FLOW are now synchronized. Read-only HTTP recheck: health UP, demo persona ld, baseline version1/admissionReadiness READY; terminal history rows A=0/B=0/C=1. No new attempt or business mutation was performed in this continuation. Static recheck:38 protected migration/release hashes unchanged,9 local guide/contract/evidence links resolve, tracked executable-test diff unchanged from demo intake, git diff --check0, HEAD unchanged/index empty. No build/test rerun or new rendered-UI claim.

The [updated existing guide](../../../../../s2%20work/Test%20Guides/REQ-002-F02-full-walkthrough-test-guide.md) gives exact URL/persona/input45/45/labels/expected/actual for user walkthrough. Replacement/Deactivate with an in-progress Employee, no-grace deadline, injected failure/retry, legacy records, rendered accessibility/responsive and authenticated production controls remain unobserved here. Do not reset completed C or old learners to manufacture scenarios.

All39 existing acceptance IDs/QBI/C1/C2 and new demo cases remain Planned/Not run for executable evidence. Future explicit Cluster3 scope: no-profile/prod gating, constrained persona/cookie, schema/content integrity/drift/restart, field/pin/no-key DTOs, owner isolation, full/legacy allowance/deadline/preservation, wiring replacement and numerical/reference/regression/performance design. No executable source/test compilation/runner created or run; no stage/commit/push.

Rollback removes local-baseline-demo from API profiles and turns demo/adaptive FE flags off, rebuilding with the same main command. Normal dependencies again fail closed. Keep dedicated demo records/history/pins and original backups; no deletion, down migration, restore-over-live or old fixed/mock admission. Actual owner Identity/Catalog/review/publication/real model/dataset/C promotion integration remains Open, as previously recorded.

Confirmed: user-authorized temporary demo and actual bounded baseline HTTP operation | Provisional: persona/readiness/reference model/fitted SYNTHETIC runtime | Open: rendered UI, missing owner integrations and executable evidence | Rejected: calling demo data production truth/psychometric validation or operational synthetic promotion.
