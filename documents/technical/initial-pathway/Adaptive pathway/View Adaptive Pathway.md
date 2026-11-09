# View Requirement Adaptive Pathway

REQ-004-F01; Employee own view and permitted assigned Expert preview.

Source checkpoint: HEAD `61d334c`, 2026-11-07. Confirmed contract and source implementation are distinguished below; current composition is local/workspace-baseline and excludes prod/demo. [Complete field/key/API and conflict mapping](../../Organization%20Rule%20Assessment%20and%20Pathway.md) owns the shared technical detail. Applied DB state and full runtime behavior were not verified in this documentation task.

## Goal, preconditions and fields

RequirementPathwayView/Access project own current/archived requirement revisions, module choices, per-option learning progress, exact certificate, dependency, waived/parallel provenance and actual assessment source. RequirementPathwayPresentation reuses graph/timeline styling: requirement root → module alternatives; assessment badges belong to module cards.

New content admission requires a current accepted exact option/Skill version/knowledge/module revision/content and valid assignment approval/provider. Unrelated displayed order is not a gate. Authentic started pins may continue after later supplementation/target changes; archived view alone grants no new start. Exact learning completion then admits Skill paper; completion alone never creates official evidence. One qualified successful option satisfies the requirement while others retain optional independent history.

Employee certificate submission accepts one HTTPS link OR private PDF OR PNG/JPEG ≤10 MiB subject to tighter platform limit; only actual assigned review creates official evidence. Full certificate/bypass/backfill/parallel runtime scenarios remain unverified here.

## Visible lifecycle and ordered reads

### Implemented UI updates — 2026-11-09

- Roadmap and Timeline order actual prerequisites before dependents without changing persisted revisions/order/history. Shared prerequisites appear once; separate parallel work remains outside the required dependency sequence.
- Module cards distinguish content completion, assessment result and official achievement. Their assessment entry shows Open, Resume or Retake according to the latest exact module-context attempt, with a separate per-module/revision Assessment history dialog. Finalized Skill Assessment results link back to pathway.
- Certificate cards use success-green styling when the persisted requirement state is FULFILLED, matching the achieved Skill root in both views. Upload, pending review and certificate catalog publication alone do not imply achievement. Reference links and submission actions have separate spacing and semantic primary/secondary emphasis.
- Certificate submission accepts the existing single-link/private-file evidence forms. Expert review is now reached from the Certificates sidebar, with pending and approved/rejected history views, scoped employee display names, decision reasons and timestamps. Employee resubmission links a new submission to the latest rejected one; old evidence/decisions remain retained. The visible Reference URL label is shorter; HTTPS validation remains.
- A replacement pathway revision awaiting approval can hide all option cards and lock new admission until Expert approval. The module choices/history still exist in storage. This current projection behavior must not be described as deleted modules or automatically attributed to a failed prerequisite; the generic locked message still has that ambiguity.

These updates describe delivered source. Frontend build/type-check/scoped lint, backend offline package with tests skipped and bounded local deployment checks passed. No fresh-volume bootstrap, authenticated full learner/reviewer scenario or new executable test was performed for this document refresh. See the shared contract sections1.2–1.5 for placement/rank, Overview, certificate fixture and verification boundaries.

Employee /api/v1/employee/pathway, /pathways/{id}, request status; Expert own assigned detail. Distinguish request generation/review from requirement states and assessment processing. GET does not request generation, approve, pin or advance lessons. Timer-aware attempt reads may finalize expiry in their separate owner and must not be treated as DB-metadata-only reads.

## Failures, history and compatibility

Authentication/tenant/owner/assignment denial, stale identities/revisions/hashes, changed-body idempotency conflict, missing policy/bank/provider and dependency/integrity outages remain distinct. Reconcile an uncertain outcome with the same key/body and authorized current/receipt reads; do not invent success or reset history. No executable checks or learner actions ran in this task.

## Retained section aliases

These aliases preserve older links; the current sections above replace the numeric/IRT/optimizer contract at those entry points. No retired Function is reopened.

<a id="roadmap-timeline-and-readiness-rules"></a>
<a id="implementation-alignment-and-evidence"></a>

Historical references retained: REQ-004-F01, REQ-002, REQ-041. They do not expand this task or approve new implementation.

## Historical evidence references

The following retained records describe their original dates/contracts only; they were not rerun or recertified here.

[workspace receipt](../../../testing/system/REQ-002-041-042-workspace-integration.md)

[test plan](../../../testing/REQ-041-042-initial-pathway-test-plan.md)
