# REQ-002 Session2 — C0 input and architecture alignment

## Latest C1/C2 source handoff — 2026-10-22

The user subsequently permitted **isolated SYNTHETIC simulation, operational promotion ineligible**, and delegated numerical/persistence choices to the agent. The agent selected the fixed-c MML/EM package and minimal forward scoped-selection/receipt design. This supersedes the pending-question checkpoint below; it does not invent content/model approval or a trusted Admin.

Delivered source:24 new main Java files for typed pins/policy/budget/admission, MML E/M steps, immutable dataset/source ports, run/candidate lifecycle and worker lease/cancellation/recovery, separate Admin promotion/CAS/receipt/audit, default-off API/wiring and standalone synthetic operation. Exactly3 pre-existing runtime files extend the technical port/store/eligibility caller for scoped future selection; backups are in workspace `.tools/official-question-bank-session2/20261022/source-before`. V23 adds only the scoped effective-selection and immutable command-receipt structures/guards. **V23 is unapplied; no current DB schema/model/run/set was changed.** [Full contract/source/API/limitations](../../technical/baseline/Calibrate%20and%20Promote%20IRT%20Parameters.md).

[Machine-readable implementation/source/artifact preservation observation](REQ-002-official-question-bank-session2-implementation-observation.json) complements the historical C0 snapshot below. Global worker serialization covers expensive input parsing/preflight as well as fitting, without holding a long SQL transaction.

| Allowed verification actually performed | Actual result | Limits |
| --- | --- | --- |
| Java21 `mvnw.cmd -B -ntp '-Dmaven.test.skip=true' compile` | Final BUILD SUCCESS21:44:06+07,290 main sources,25 migration/seed resources; no final compiler warnings | Initial sandbox target-write denial retried with authorized elevation. Initial record-accessor name-shadowing compile errors corrected. Final repeat followed the worker-lease parsing/preflight bound fix. No test sources/resources/compilation/phase/runner; no SQL execution by compile |
| Explicit SyntheticCalibrationCommand with --synthetic-only, Xmx256m/ActiveProcessorCount1, main classes/resolved runtime jars | All135 item fits/15 skills complete;270,000 synthetic responses;15–48 EM iterations/skill;26,572 objective evaluations; observed fitting1,047ms | File-only bounded manual operation, not test/benchmark/independent numerical certification. No Spring/DB/graph/accounts/attempts/model pin created |
| Static JSON/hash/provenance inventory | [Separate artifacts](../../dataset/calibration/15-1212.00/synthetic-v1/README.md): responses9a60c1e7…bc6e2e, generating ca1ca458…218920, policy ae57a57d…cd4a3, fitted089ecd09…bf70e | Generating parameters/abilities never enter estimator; c=.25 fixed, uncertainty unavailable. Offline fitted file is not a persisted V18 CANDIDATE |
| Descriptive synthetic recovery | a RMSE0.2266064287; b RMSE0.1405933955; max a error0.9745086219; max marginal residual0.0049627199 | No production-quality threshold or approval inferred; c recovery0 is imposed by fixing c. No parameter SE/DIF/practical-skill/generalization claim |
| Source import-boundary inspection | No forbidden API→infrastructure/domain→application/infrastructure/Spring or application→adapter imports in new sources | Static inspection only; ArchUnit not compiled/run |
| Existing-main PostgreSQL READ ONLY after simulation | **All84 tables** in the post-cutover digest snapshot have identical canonical count/MD5; C model/run/set/response counts0; Flyway22/max22/all successful | The baseline snapshot contains84 tables after V22, rather than only the original53 before migration. No new-state write, V23 apply, reset, retarget or schema assertion from source |
| Preservation checks | All14 release sidecars/all135 item hashes and V1–V22 bytes unchanged; original ontology/workbook and source backups retained; HEAD/index/stash retained | No stage/commit/push, graph/container/volume lifecycle or D cleanup |

Actual source V23 SHA256 `404d77227e59d2d0da2d473198c597ae614275bf8aa58fa085cc16638bd37362`. This is source identity only; SQL syntax/trigger/FK/transaction/race behavior has not been executed. PostgreSQL main remains V22. Do not start main migration/startup blindly from the changed tree.

Source behavior reviewed: authorized identical run identity returns its immutable state; changed request/scope conflicts; claim/completion are short transactions with no partial candidate; timed-out/crashed runs require explicit recovery, not reset. Global session worker lease prevents overlapping computation across instances. Cancel is a durable request, polled and checked at commit. Candidate admission repeats full135 exact tuple coverage/finite/bounds/convergence/origin checks. Promotion is a separate authorized transaction and rejects SYNTHETIC unconditionally. Replayed promotion returns the original receipt after reauthorization, before checking current selection; changed/new commands cannot rewind an old set. Future selection uses org+bank+model and holds existing pointer FOR SHARE through a Blueprint transaction. Historical exact-pin readers are unchanged. These are implemented source paths, **not observed PostgreSQL/security race passes**.

Remaining real blockers: exact existing/authorized model pins and approval state; actual trusted System Administrator and grant/revocation coordination; server-approved dataset registry; owner Catalog/content review/publication/readiness. C1 currently accepts the agreed synthetic design only. Actual pilot data/estimation policy needs separate alignment before creating an operationally eligible candidate. Default-off administration configuration has no Authorization/Readiness/DatasetSource implementations, no local Admin/permitAll bypass and no new UI. Enabling it without dependencies fails startup; existing production security remains deny-all. Actual HTTP deny/success and enabled wiring have not been exercised.

Executable acceptance remains Planned/Not run for all39 existing IDs/QBI/AB-K01 and C1-01–04/C2-01–04. Future Cluster3 must cover real-adapter V18 completion/rollback/cancel/expiry/unknown commit, V23 migration/receipt/selection guards, trusted same/foreign/revoked Admin versus L&D/Employee, stale/concurrent/replay, scoped query/no-state-change/protected data, and old/new Blueprint/attempt pins. Historical tests that stub only findPromoted need an approved scoped-selection alignment; do not restore the global fallback to make them pass.

Rollback: keep administration flag off and preserve all artifacts/history. Main DB has no V23 to roll back. After a future authorized upgrade, use a forward compatibility fix/recovery target; never edit/down-migrate V1–V23 or delete promoted sets/receipts. Do not restore removed bootstrap/seeders. [Session3 prompt](../../../../../s2%20work/Ongoing%20Plan/CODEX_PROMPTS_QUESTION_BANK_C_D.md) is prepared with these actual blockers; D was not executed.

## Historical C0 checkpoint before the user replied

2026-10-22, Asia/Bangkok. **C0 prepared; user decisions pending. C1/C2 implementation remains incomplete.** This records static inspection and bounded manual READ ONLY observations, not executable-test evidence or calibration results.

The user explicitly requested agreement on authorized responses, simulation/actual pilot and numerical/input policy before algorithm work. Questions were submitted for response origin, a concrete numerical demo package and scoped promotion persistence. No answer/approval is inferred from elapsed time. [Reviewable contract and decisions](../../technical/baseline/Calibrate%20and%20Promote%20IRT%20Parameters.md).

## Actual observations

| Observation | Result | Limit |
| --- | --- | --- |
| Git HEAD/index/stash |70679bb43e1798f1235a17d6a9a843701e76a796; index empty; stash3a8b19d1ea11fdb8592adb89518b85baeea1fac7 | Dirty Session1/cutover and outer user edits retained; no reset/stage/commit/push |
| SHA256 of original manifest/scope/ontology |52d065a031aa9adca51808c59a7682872b7436343f0c300db84cfe1beb2fe882 / c2454bde23764d061b6b25b54d434141715326d75eaa3201026618e7e4136231 /0006bb11ac5c20687eb90be4807289ecea309a5657781543792e18f556eb5125 | Read actual bytes; no bank selection/content changes |
| Canonical item content hashes |135/135 match;135 distinct versions,15 exact skills | Recursively sorted compact UTF-8 JSON excluding contentHash plus questionBankId, array order retained; no protected content printed |
| Release sidecar hashes | All14 artifact hashes match release-manifest.json | Preserve the entire pinned release directory, including README/import/source/readback documents; new C0 evidence is stored separately |
| Migration/official source preservation |22/22 V1–V22 match Session1 byte hashes; ontology JSON/workbook unchanged; all5 Session1 source recovery copies match their backup hashes | No new SQL migration; prior backups retained |
| Existing Docker inventory | Only main postgres/neo4j healthy on existing ports15432/7474/7687 | Initial sandbox pipe access denied; read-only elevated retry succeeded. No lifecycle/volume command |
| PostgreSQL17.6, database adapt_learn_graph | READ ONLY transactions, statement_timeout5s: public Flyway history22 SQL migrations/max22/all successful; pinned bank135 DRAFT/15 skills | First SELECT used wrong platform Flyway schema and aborted its read-only transaction; corrected by pg_tables inventory. No write or main schema change |
| Response/model/parameter counts | model_version0; irt_calibration_run0; irt_parameter_set0; baseline_attempt_response0; item_response0 | No authorized external pilot source supplied; absence here does not prove none exists elsewhere |
| Identity | account_role contains one EMPLOYEE assignment; production SecurityConfiguration denies other routes by default; existing local APIs use configured actors | No trusted System Administrator or bank/model authorization implementation; no role alias/fake principal introduced |
| Target-selection preservation |11 rows/1 ended_at-null current; canonical JSONB-row MD5 `34adace4faa1899e15a878fe749ca483`, identical to local-readback.json | Canonical digest is md5(string_agg(to_jsonb(row)::text,newline ORDER BY to_jsonb(row)::text)); row_to_json formatting has a different digest. Full53-table comparison was not repeated |
| V18–V22/runtime inventory | V18 supports immutable run/candidate/items; existing findPromoted selects latest model-wide, with no bank/tenant pointer or Admin receipt | Scoped selection and typed receipt design remains Proposed; no unscoped promotion implemented |

[Machine-readable observation with all135 item-version/content pins](REQ-002-official-question-bank-session2-observation.json). Session1 full Neo4j payload equality and135-item all-field DB readback remain their original evidence; neither was rerun or relabeled as new C0 evidence.

## Conflicts and decisions

- Older Complete Baseline Assessment/task sections permit demo a=1/b-by-label/c=.25 and synthetic histories. Current explicit user instruction supersedes this permission: bootstrap stays removed; simulation needs fresh explicit agreement; generated values never masquerade as fitted values or learner data.
- Architecture says agree actor-code mapping rather than automatically treating legacy administrator codes as System Administrator. Existing importer role aliases/local-seed creator mode do not authorize C2. Missing Identity/grants is a real external blocker.
- V18 retains historical PROMOTED rows but cannot express scoped effective selection and exact Admin-command replay on its own. Existing Blueprint receipts have unrelated operation constraints; processing_receipt deduplicates event handlers; generic audit has no command-result payload. The proposed minimal forward pointer/receipt schema is awaiting approval, not a reason to edit V18/delete old sets/add arbitrary fields.
- Current model table is empty. There is no exact model ID/configuration hash to pin yet. Reference factories/constants are provisional implementation values, not approved model data.
- DRAFT/content and catalog NEEDS_EXPERT_REVIEW remain unchanged. An explicitly permitted isolated synthetic experiment would still not prove operational promotion/readiness.

## Work actually delivered and pending

Delivered: source/bytes/Git/live read-only inventory; concrete proposed input/numerical/run/candidate/recovery/diagnostic/promotion/authorization/effective-selection contracts; V18 reuse/gap inventory; proposed acceptance mapping; CURRENT/task/temporary/progress routing. All detailed target contracts are marked Proposed/Open where not already confirmed.

Pending user decisions: response origin; numerical package and remaining numerical precision/optimizer details; C2 pointer/receipt migration approach. Pending owner/input prerequisites: actual trusted Identity grants/revocation coordination, exact model pins/approval, any authorized actual pilot, content/catalog review and publication. No estimator/simulation/run/candidate/diagnostic result/promotion created. C1/C2 code/API/persistence/compile/runtime evidence remain **Not implemented/Not run**, not completed by this document.

No runtime/test/frontend/source-release edit, executable-test creation/compilation/runner, Docker test stack, database write, migration application, fake accounts, historical repin/rescore/reset, D implementation, stage/commit/push. Main-only build was not rerun because this checkpoint changes documents only. Existing39 acceptance IDs/QBI/AB-K01 and proposed C cases remain Planned/Not run.

## Continuation boundary

Resume Session2 by reading the C0 contract and explicit user answers. Freeze only the decisions needed by the next independent slice, then implement small C1/C2 slices. A missing trusted Identity adapter must remain denied even after persistence exists. Do not create synthetic data, a model approval, a new bank or a principal to pass a gate.

The [Session3 prompt](../../../../../s2%20work/Ongoing%20Plan/CODEX_PROMPTS_QUESTION_BANK_C_D.md) remains a future handoff template, not permission to start D while C0/C1/C2 are incomplete. Its runtime dependencies must be updated to actual Session2 outcomes after implementation; no synthetic/production readiness claim is available now.
