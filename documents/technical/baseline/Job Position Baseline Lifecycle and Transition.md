# Scoped Assessment Policy Lifecycle and Transition

REQ-002-F02; filename retained for historical links, not current Job Position scope.

Source checkpoint: HEAD `61d334c`, 2026-11-07. Confirmed contract and source implementation are distinguished below; current composition is local/workspace-baseline and excludes prod/demo. [Complete field/key/API and conflict mapping](../Organization%20Rule%20Assessment%20and%20Pathway.md) owns the shared technical detail. Applied DB state and full runtime behavior were not verified in this documentation task.

## Scope

L&D owns BASELINE per organization+Role+actual member Level. Expert owns SKILL_ASSESSMENT per organization+Skill+knowledge, shared across equivalent modules. Directory resolves real catalog scopes and flags missing member-Level identities, filtering/counting before pagination. Confirmed sort is draft first, then unconfigured, then other states; draft-first ordering is confirmed as of 2026-11-08.

One draft and one active pointer may coexist per exact scope. Configuration includes exact groups, count/requiredCorrectCount, timing/maxAttempts/wait, and Skill mandatory/veto rules. Baseline uses common count/pass settings by knowledge level with mandatory/veto false. No numeric mastery/SE/k/model promotion is needed by the rule flow. Missing approved bank/outcome coverage cannot be paper-filled from another group.

## Lifecycle rules

Baseline draft/editor save is separate from complete-and-activate; only complete valid snapshot activates. Published version/configuration/hash is immutable; active pointer can replace prior version. V60 retains abandoned baseline draft; V62 scope-local label migration preserves IDs/hash/attempt/receipt identities and records old labels. No routine history rewriting/deactivate/restore route.

## API, transaction and retry contract

Policy mutation carries commandKey, scope key, expected draft/activation revision and catalog hash; org/actor/publication/time are server values. Advisory lock org+purpose plus scoped unique/FK keys support concurrency; frozen learner attempts continue pinned. Authentication/tenant/owner/assignment denial, stale identities/revisions/hashes, changed-body idempotency conflict, missing policy/bank/provider and dependency/integrity outages remain distinct. Reconcile an uncertain outcome with the same key/body and authorized current/receipt reads; do not invent success or reset history. No executable checks or learner actions ran in this task.

## Retained section aliases

These aliases preserve older links; the current sections above replace the numeric/IRT/optimizer contract at those entry points. No retired Function is reopened.

<a id="statusquery-semantics"></a>
<a id="client-and-protected-read-contract"></a>
<a id="compatibility-and-rollback"></a>
<a id="acceptance-and-dependencies"></a>

Historical references retained: REQ-002-F01, REQ-002, REQ-001. They do not expand this task or approve new implementation.

## Historical evidence references

The following retained records describe their original dates/contracts only; they were not rerun or recertified here.

[adaptive plan](../../testing/REQ-002-adaptive-baseline-test-plan.md)

[Role plan](../../testing/REQ-001-002-role-baseline-flow-test-plan.md)

[Current implementation/evidence](../../testing/system/REQ-001-002-final-synchronization-review.md)
