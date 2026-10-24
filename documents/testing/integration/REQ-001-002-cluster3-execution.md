# REQ-001/002 Cluster 3 — real-adapter execution receipt

**Subsequent 2026-10-23 update:** [Cluster 4 evidence](../system/REQ-001-002-cluster4-evidence.md) records the approved header repair and current passing rerun. This receipt preserves its original Cluster 3 execution date, scope, counts and limitations; statements that Cluster 4/repair were not yet authorized describe that earlier boundary.

Date:2026-10-23, Asia/Bangkok. Base HEAD480b890. **34 unique integration cases Pass,0 Fail,0 Skipped**: current PostgreSQL24, current Neo4j4, affected historical selection PostgreSQL6. These are targeted executions across several disposable containers, not one34-test run. [Commands](../../../../../.tools/cluster3/20261023/commands.json), [exact per-method/report results](../../../../../.tools/cluster3/20261023/case-results.json), [fixture/hash manifest](../../../../../.tools/cluster3/20261023/fixture-manifest.json), [summary/remaining limits](../system/REQ-001-002-cluster3-execution.md).

## Isolation and fixtures

Every PostgreSQL suite owns its PostgreSQLContainer(postgres:17.6-alpine), random mapped port and disposable database. Current suite migrates V1–V26 and recreates only its own platform/public Flyway fixture between tests. Neo4jContainer(neo4j:5.26-community) owns its graph; fixture cleanup targets only that container. No integration JDBC/Bolt URL points at development Compose. All containers use normal Testcontainers lifecycle, no reuse/dev volume.

Default actor is E1 UUID(0,3)/OrgA UUID(0,1). Other Employee UUID(0,4), OrgB UUID(0,2)/Employee UUID(0,6), manager UUID(0,5) and inactive/revoked variants exercise boundaries. F3-v1 has three skills/nine explicit published test items,6/9-item retained legacy variant,9/540sec common configuration and exact IDs UUID(0,10/11/12). A second Occupation retains its own source attempt/version. Manager grants/eligibility are deterministic test ports; tests explicitly using trustedContext use real LocalAdaptiveAttemptContext/account-role queries and activation locks. This is not production Identity/publication integration.

Current PG paths use real JdbcAdaptiveBlueprintStore/Listing/Preview/TechnicalVersionStore, JdbcAdaptiveAttemptStore/Content/Scoring/Outcome/ResultQuery, PinnedAdaptiveAttemptPolicyAdapter, CurrentRoleSelectionStore and CurrentOccupationProfile, with real transactions/FKs/triggers. Numerical constants are reference fixtures, not an approved pilot oracle.

## Current PostgreSQL methods — all Pass

Actual file: backend/src/test/java/com/adaptlearngraph/assessment/adaptive/RoleBaselinePostgresIntegrationTest.java. All rows use F3 unless noted; source/hash and commands C09/C16/C20/C21/C22/C25/C26/C28 bind exact fixtures to runs. Each row's observed outcome matched the stated expected outcome. The last parameterized method contributes two cases.

| Method | Function / acceptance | Trigger → expected = observed |
| --- | --- | --- |
| abA05ExpiredAnswerAndWorkerSubmitRaceProduceOneInvalidation | REQ-002-F01 / AB-A05 | Expired answer rejected with unchanged digest; worker/submit race yields one DEADLINE invalidation and no mastery/profile. |
| rb13StartReplayResumePreservesDeadlinePinsAndBlocksRoleChange | REQ-001-F02 + REQ-002-F01 / RB13 | Exact start replay, same deadline/pool; active assessment blocks Role change; unpresented answer denied. |
| abA09AndR02LegacyRoleResultReaderRetainsOriginalSubsetWithoutCatalog | REQ-002-F01 + REQ-009-F01/F02 / AB-A09/R02 | Real legacy Role result retains s1/s2, original names and EARLIER_ROLE; no s3/current-catalog substitution or read writes. |
| rb04ActorTenantIsolationAndInactiveTransactionDenied | REQ-001-F02 / RB04 | Foreign org/other Employee see no selection; inactive/wrong-tenant command denied. |
| mm01MultipleOccupationProfilesKeepIndependentSourceVersions | Profile boundary / MM01 | Two genuine results in distinct Occupations yield two own profiles with original attempt/version identities; foreign org empty. |
| abC15ListBoundsLiteralWildcardTenantAndNoWriteDuringCatalogOutage | REQ-002-F02 / AB-C15/C19, RB17 | Literal %_ search, bounded page/total, foreign/empty grants and size101 rejection; history remains readable during Catalog outage; all-table digest unchanged. |
| rb12ConcurrentAnswersAndHistoricalReplayHaveOneWinner | REQ-002-F01 / RB12, AB-A04 | One concurrent answer winner; stale loser; exact historical replay survives later answer; changed body/key conflicts. |
| rb07And14Mm01And03SufficientWrongAnswersInitializeOriginalProfileNoScoreThreshold | REQ-002-F01 + REQ-009 / RB07/14, MM01/03 | All nine answers wrong still produce sufficient evidence, raw0 and three-skill profile; added current-skill input does not repin original coverage; no retake. |
| rb16RealIdentityReloadsActiveRoleAndTenantOnEveryCall | REQ-001/002 / RB16 | Actual local Identity adapter reloads persisted active account/EMPLOYEE role; foreign learner/tenant and revocation denied. |
| rb15EarlyManualInvalidationAndLinkedReplacementRetainOldVersion | REQ-002-F01 / RB15 | Early submit INVALIDATED/MANUAL; no skill result/profile; exact replay; one linked replacement with old version. |
| rb15AtomicProfileFailureRollsBackTerminalResponseEvidenceAndReceipt | REQ-002-F01 / RB15, AB-S02 | Injected profile insert failure rolls back final response/header/result/evidence/receipt; exact retry succeeds once. |
| vb04ReceiptFailureRollsBackVersionDraftPointerAndTransition | REQ-002-F02 / VB04 | Receipt failure rolls back release, Draft close, current pointer and transition; exact retry releases v2 once. |
| vb04ConcurrentDraftCreationAndActivationHaveSingleWinner | REQ-002-F02 / VB03/04, AB-C06/C09 | Competing Draft creates and activations each have one winner; no duplicate release. |
| rb10InfeasibleActiveIsDistinctFromMissingActive | REQ-002-F01 / RB10 | Coherent reduced eligible pool gives BASELINE_UNAVAILABLE, not NO_BASELINE; no writes. |
| rb05SelectionRaceOneWinnerAndRollbackNoPartialWrites | REQ-001-F02 / RB05 | One initial selection race winner; stale loser; injected transaction failure leaves identical all-table digest. |
| rb10MissingActiveAndInfeasibleAreDistinctAndNoWrite | REQ-002-F01 / RB10 | No Active yields NO_BASELINE and no writes; infeasible counterpart is the separate method above. |
| vb01And04SaveOnlyDraftPreviewReadOnlyDiscardReplayAndStaleIdentity | REQ-002-F02 / VB01/03/04 | Save/no-op touches sole Draft, not release; Preview digest unchanged; stale ID conflicts; discard replay retains old version. |
| rb15ValidHistoricalOutcomeWithoutProfileRemainsPendingAndDoesNotUnlockRetake | REQ-002-F01 / RB15 | Genuine result missing profile is PROFILE_PENDING; no automatic import/repeat/write. |
| abA08DeactivateStartRacePreservesExistingPinsAndDeniesLaterNewStart | REQ-002-F01/F02 / AB-A08 | Actual local context shares activation coordination; either old pin wins before disable or new start is denied; later first-use learner cannot start; resume keeps deadline. |
| rb05SelectionReplayNoOpChangeAndImmutableHistory | REQ-001-F02 / RB05/09 | One current selection; same-role unchanged revision/events; change preserves old snapshot; exact replay and mismatch conflict. |
| mm02ForeignResultsAndNoStateChangeReads | REQ-009-F01/F02 + profile / MM02, RB17 | Empty/nonterminal/foreign results fail safely; no data/count leak or domain writes. |
| rb12StaleSelectionBetweenPrecheckAndStartCannotStartWrongOccupation | REQ-001-F02 + REQ-002-F01 / RB12 | Role changes between precheck/start; actual context rejects wrong Occupation, writes no attempt/receipt, preserves new selection. |
| rb06PartialAndInvalidProfileValuesNeverClaimCompleteCoverage(String)[1]/[2] | REQ-002-F01 + profile / RB06/07/15, MM02 | Explicit incomplete owner-profile fixtures: valid zero values count; missing/null/UNKNOWN do not; PROFILE_INCOMPLETE and explicit mastery-read failure; no read mutation. No retake-remediation policy inferred. |

The digest helper hashes canonical row JSON for every platform table, before/after the tested read or injected rollback. This proves only the bounded transaction/read assertions in those methods, not a global audit of the user's live databases. No event delivered_at or downstream processing receipt is fabricated.

## Graph and historical compatibility

CurrentRoleCatalogIntegrationTest.java runs rb02And08FullUnionStringIdsAndLevelFields, rb04ForeignOrganizationDeniedBeforeDataAndForeignNodesExcluded, rb08AmbiguousOwnershipFailsClosed and rb17RepeatedReadsDoNotWriteCatalog: all4 Pass. F15-graph-v1 has three current string-ID Roles, fifteen distinct skills, shared skill-0, separate Level metadata, a foreign graph branch and an ambiguous-owner negative variant. Reads compare graph properties/edges before/after. Local ACTIVE-only review bypass is explicit; this does not validate production catalog publication.

TargetRoleSelectionPostgresIntegrationTest.java ran6 current-source historical UUID selection tests, all Pass: initial/no-op/change/replay, unique claims/concurrency, stale loser, pathway failure rollback, provisional archive ownership and published-reference bridge. Their actual method names/reports are in case-results.json. A stale old runner XML included the removed developmentSelectionSeederIsRepeatableWithTwoImmutableRoleReferences method; it was excluded from this session's counts and was not recreated or rerun.

Earlier fixture errors remain in raw logs: missing item options/model JSON, missing Catalog port/activation event and inconsistent published coverage. They were corrected in test support, with no changed runtime expectations. Original nonzero exits are retained. Forward migration of a populated real legacy deployment, production-owner integration and numerical/performance validation are not established by these disposable fixtures.
