# RIASEC scoring, persistence and Job Position recommendation

## Current feature verification ? 23 November 2026

These cases follow the feature, not a demo scenario. Committed IDs are retained for traceability. Their recorded result is the single 26-case local run on 23 November (18 feature +1 backend workflow +7 state, 0 failures/errors/skips); regression and supporting checks are not added to that commitment count. Older sections retain historical evidence only.

### Evidence and scope

Java21/JUnit/Surefire and disposable PostgreSQL17.6 Testcontainers through V83. Catalog/identity/assignment and some external ports are controlled fixtures, not full deployed-system verification. E01 is a backend workflow, not browser E2E. RIASEC uses a deterministic HTTP model response, not live-model quality. No CI or NFR result is inferred. Report5 remains deferred.

### TC-WF05-F16 — RIASEC scoring

- **Preconditions/data:** Employee workspace; sixty 0–4 answers.
- **Steps:** Submit incomplete/invalid answers; save complete answers; submit/replay; check zero-score boundary.
- **Expected:** Invalid data denied; one result; raw sums R40/others20; AI QUEUED; draft cleared; six zero sums valid.
- **Actual:** PASS; all assertions in the mapped method passed in the full run above.
- **Automation:** [WF05RiasecCommitmentTest.java](../../../backend/src/test/java/com/adaptlearngraph/services/WF05RiasecCommitmentTest.java), method `sixtyAnswersAreScoredAndSavedOnce`.

### TC-WF05-F17 — RIASEC draft and ownership

- **Preconditions/data:** Saved draft; second editor and other account.
- **Steps:** Read draft; takeover; stale editor save; submit; access/delete/retry from another account/organization.
- **Expected:** Draft persists; old revision fenced; results remain tenant and owner scoped.
- **Actual:** PASS; all assertions in the mapped method passed in the full run above.
- **Automation:** [WF05RiasecCommitmentTest.java](../../../backend/src/test/java/com/adaptlearngraph/services/WF05RiasecCommitmentTest.java), method `draftAndHistoryRemainOwnerScoped`.

### TC-WF05-F18 — Grounded Job Position recommendation

- **Preconditions/data:** Submitted RIASEC; one allowed Position; local deterministic HTTP model stub.
- **Steps:** Claim job; use real AI HTTP client; persist result; inspect prompt/snapshot; validate foreign ID and duplicate dimensions.
- **Expected:** Only supplied Position; server scores30/20 retained; profile-only prompt; invalid outputs denied; no Skill evidence/Target Role selection; not live model quality.
- **Actual:** PASS; all assertions in the mapped method passed in the full run above.
- **Automation:** [WF05RiasecCommitmentTest.java](../../../backend/src/test/java/com/adaptlearngraph/services/WF05RiasecCommitmentTest.java), method `recommendationsAreGroundedJobPositionSnapshots`.

