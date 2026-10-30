# Explicit SYNTHETIC calibration demonstration — 2026-10-22

**Offline fitted artifact only. No PostgreSQL model/run/parameter set/learner/attempt was created; no promotion.** The user explicitly permitted isolated synthetic responses to demonstrate the flow, with operational promotion ineligible. The user delegated numerical/design selection to the agent. [Selected contract](../../../../technical/baseline/Calibrate%20and%20Promote%20IRT%20Parameters.md) · [actual evidence](../../../../testing/system/REQ-002-official-question-bank-session2.md).

The official content release remains unchanged at [question-bank/15-1212.00](../../../question-bank/15-1212.00/README.md). This directory is separate from that pinned release. Generating a/b/theta are assumptions; fitted a/b are estimates from synthetic responses. Neither is an empirical property of the official questions or a real learner. c=.25 is fixed in both generation and estimation; zero c recovery error is imposed, not learned.

| Artifact | Purpose / SHA256 |
| --- | --- |
| [policy.json](policy.json) | Selected MML/EM fixed-c numerical constraints; ae57a57dac0742d45bf6821ef8f65b0994223b1474df97c36da6525faa1cd4a3 |
| [responses.json](responses.json) | SYNTHETIC options only;30,000 subject-skill vectors/270,000 observations;9a60c1e73423a70ea811201dd36a6762c28b3af286ec0e8c00ff7f41d4bc6e2e |
| [generating.json](generating.json) | Separate generating a/b/c and per-skill synthetic abilities; never supplied to estimator; ca1ca4582b05b0a0ffefbbdb2b78fb155dbfc0f0b8b7abeef6b7990552218920 |
| [fitted.json](fitted.json) | Exact135 item-version/skill/content pins, fitted a/b, fixed c and diagnostics;089ecd096815fe6e41fce47bfed53ec655f774132ddf486c811cc90bf55bf70e |
| [observation.json](observation.json) | Bounded manual computational outcome and measured elapsed fitting time; not executable-test evidence |

Seed20261022; Java21 SplittableRandom/StrictMath Box–Muller; generating a~U(.7,1.8),b~U(-2,2),c=.25 independent of editorial difficulty/Level. Separate N(0,1) abilities per skill;2,000 subjects/skill answer all9 items. Tokens prefixed synthetic have no platform identity. Exact bank/manifest/scope/ontology pins are in fitted.json; protected question text/keys/rationales are not exported here. Treat response/generating artifacts as internal backend research data, never frontend assets.

Observed CLI: SUCCEEDED computationally for all135 items/15 skills,15–48 EM iterations/skill,26,572 objective evaluations. Fitting elapsed1,047ms in this bounded local observation (generation/file I/O excluded); not a benchmark. a range[0.5914740330,2.6425177746],b[-2.1818879940,2.1110785511],c=.25. No admission boundary hit. Every item has2,000 observations, complete coverage and unavailable/unvalidated uncertainty.

Descriptive synthetic recovery, calculated from these two files: a RMSE0.2266064287/bias0.0237890179/max error0.9745086219; b RMSE0.1405933955/bias-0.0184333591/max error0.4399758014. Max absolute observed-minus-predicted marginal proportion0.0049627199. These are no acceptance threshold, independent numerical validation, real-user fit, practical-skill validity or approval. Nine items per skill and one deterministic EM initialization do not establish psychometric readiness. Standard errors, local independence/unidimensionality, DIF and population/generalization remain unverified.

The operation used compiled main classes and existing resolved runtime jars, with test-related jars filtered out: `java -Xmx256m -XX:ActiveProcessorCount=1 -cp <main-classes-and-runtime-jars> com.adaptlearngraph.assessment.adaptive.calibration.infrastructure.SyntheticCalibrationCommand --synthetic-only <repository-root> <new-output-directory-under-documents/dataset/calibration>`. No Spring context, test runner, DB/graph connection or fake principal. Output directory must be absent: this command does not overwrite a prior artifact or its history. This is not the final application one-command startup, which belongs to Session3.

Original bank/source hashes, all V1–V22 migrations and current PostgreSQL data are unchanged. V23 is source-only/unapplied; real model pins, trusted Identity/grants, approved actual-pilot policy/data and catalog/content publication are prerequisites for persisted/operational use. The explicit C2 gate rejects SYNTHETIC even if parameter_set.source would be CALIBRATED after a future authorized persistence operation.
