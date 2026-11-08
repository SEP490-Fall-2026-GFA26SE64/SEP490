# Complete Baseline and Skill Assessment

REQ-002-F01 and direct Skill execution; Employee/System.

Source checkpoint: HEAD `61d334c`, 2026-11-07. Confirmed contract and source implementation are distinguished below; current composition is local/workspace-baseline and excludes prod/demo. [Complete field/key/API and conflict mapping](../Organization%20Rule%20Assessment%20and%20Pathway.md) owns the shared technical detail. Applied DB state and full runtime behavior were not verified in this documentation task.

## Goal and position

Resolve selected explicit MODULE_ONLY target groups minus exact compatible official evidence for BASELINE; keep certificate-only/unconfigured needs separate. SKILL_ASSESSMENT requires current accepted exact completed option (step/module revision/content, Skill version/knowledge/outcomes) and MAIN plus ALL configured transitive prerequisite groups. Official prerequisite evidence does not exempt those groups.

RuleAssessmentAttemptService validates active scoped policy/catalog and all bank coverage, samples once, freezes groups/items/rules/options and sets server start/deadline only after a complete paper exists. Resume retains the paper/deadline/accepted answers; only presented options at expected revision before deadline are accepted. Explicit submit and server expiry both FINALIZE once, with SUBMITTED/DEADLINE reason; unanswered=0. Each group has its own count/pass/mandatory/veto/reasons. Retake is a new full paper with configured max/wait and latest previousAttemptId, no carry-over. Current Skill attempt context includes exact module/revision despite shared policy.

## Result semantics

RuleKnowledgeProfileService and RuleAssessmentOutcomeService read PostgreSQL diagnostics/group results separately from official skill_knowledge_evidence and NEED_REVIEW. Baseline only creates diagnostics for actually assessed groups; a pass skips initial corresponding learning, never ACHIEVED or module completion. It does not create B solely from A prerequisite topology. No numeric gap subtraction, title exemption or lower-knowledge inheritance.

Official evidence requires exact org/learner/Skill/knowledge/Skill version/outcome coverage with accepted MODULE_ASSESSMENT or CERTIFICATE source. Bypass is a waiver, not achievement. Failed already-achieved prerequisite yields NEED_REVIEW without revocation; later genuine compatible evidence may resolve it. Result finalization differs from pending downstream processing; WAITING_REQUIRED_SUPPLEMENT is not a new scoring failure.

## Transaction and recovery

Learner transaction, attempt row lock/revision and immutable command receipts serialize supported operations. Finalization stores all group results and durable outcome work; worker re-reads persisted owner, not event-supplied tenant. NEED_REVIEW/official evidence/recalculation remain downstream and retryable. Authentication/tenant/owner/assignment denial, stale identities/revisions/hashes, changed-body idempotency conflict, missing policy/bank/provider and dependency/integrity outages remain distinct. Reconcile an uncertain outcome with the same key/body and authorized current/receipt reads; do not invent success or reset history. No executable checks or learner actions ran in this task.

## Retained section aliases

These aliases preserve older links; the current sections above replace the numeric/IRT/optimizer contract at those entry points. No retired Function is reopened.

<a id="trusted-context-and-client-input"></a>
<a id="ordered-operations"></a>
<a id="start-or-resume"></a>
<a id="answer-and-select-next"></a>
<a id="submit-or-auto-submit"></a>
<a id="resume-versioning-and-history"></a>
<a id="failure-and-concurrency-branches"></a>
<a id="dependencies-and-implementation-alignment"></a>
<a id="acceptance-to-test-mapping"></a>
<a id="decision-status"></a>

Historical references retained: REQ-002-F01, REQ-009, REQ-001, REQ-002-F02, REQ-041, REQ-002. They do not expand this task or approve new implementation.

## Historical evidence references

The following retained records describe their original dates/contracts only; they were not rerun or recertified here.

[Current alignment/evidence](../../testing/system/REQ-001-002-final-synchronization-review.md)

## Retained numerical research reference

The following original numerical description is preserved as historical research/design, not active rule-scoring behavior or a new result. No calibration/IRT operation was executed.

### IRT 3PL behavior

For item discrimination `a`, difficulty `b`, guessing `c` and current ability `theta`:

```text
P(correct | theta) = c + (1 - c) / (1 + exp(-a * (theta - b)))
```

- Responses are evidence whose strength depends on `a/b/c`; they are not manually weighted points.
- The estimator updates theta and standard error (`SE`) for the assessed MicroSkill after each accepted response.
- The selector chooses an eligible unseen item with useful information while satisfying Blueprint bounds.
- The attempt may stop early at sufficient precision; maximum questions and server deadline remain hard stops.
- Difficulty labels are for authoring/cold-start explanation. The algorithm does not follow a fixed Easy → Medium → Hard ladder.

Estimation/prior/minimum-evidence/technical validity stay system-managed/versioned. Planned organization policy supplies stop SE, confidence cutoffs and k; Employee cannot supply them. Numerical validation is a separate acceptance dependency; UI success or difficulty labels never establish calibration validity.
