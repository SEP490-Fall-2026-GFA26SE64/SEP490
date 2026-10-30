# REQ-001/002 Cluster 3 — unit and function execution receipt

**Subsequent 2026-10-23 update:** [Cluster 4 evidence](../system/REQ-001-002-cluster4-evidence.md) records the approved header repair and current passing rerun. This receipt preserves its original Cluster 3 execution date, scope, counts and limitations; statements that Cluster 4/repair were not yet authorized describe that earlier boundary.

Executed 2026-10-23, Asia/Bangkok, at product HEAD 480b890352e26612d1991aab4e098724ce68ac41. Explicit user approval covers tests/fixtures/test wiring only. This is the required Cluster 3 execution receipt; Cluster 4 document synchronization and Cluster 5 have not begun.

Result: **62 JUnit + 26 Vitest = 88 unique tests, all Pass**. Counts combine targeted runs, not one full-suite invocation. Builds, compilation and manual observations are excluded. [Exact commands/exit codes](../../../../../.tools/cluster3/20261023/commands.json), [method-level reports/results](../../../../../.tools/cluster3/20261023/case-results.json), [fixture definitions and SHA-256](../../../../../.tools/cluster3/20261023/fixture-manifest.json), [Vietnamese rerun guide](../../../../../s2%20work/Test%20Guides/REQ-001-002-cluster3-rerun-guide.md).

## Actor, fixture and scope

F15-flow-v1: trusted E1 UUID(0,3), OrgA UUID(0,1), three Roles and fifteen distinct skills with repeated skill-0; the 14/15 variant verifies union forwarding. F3-v1: three union skills, nine independently authored items, max9/540sec, exact technical IDs UUID(0,10/11/12). Zero-mastery initializer values are explicit fixtures, not development-seed expected scores. Frontend fixtures distinguish historical v1 45/3000, current v2 and sole Draft 100/6600, with empty/one/multiple profiles. Definition hashes are in the manifest; F3 definition SHA-256 is 125c96ebc69db36381ac7060ecedde653694685ad4d6f723df7699658cd8dde1.

Mockito/FE port fakes isolate the tested function. MVC tests use the real controller and registration conditions, with a fake use-case boundary; they do not certify production Identity or cross-owner integration.

## Mapping and observed assertions

| Function / acceptance | Actual test class/file | Trigger → expected; actual | Count |
| --- | --- | --- | ---: |
| REQ-001-F01/F02, REQ-002-F01; RB02/03/05/06/08/11/13/16/17 | learning/application/RoleBaselineFlowTest.java | Search current string IDs; full union deduplicates; deleted snapshot retained; empty union unavailable; replay/stale/active-assessment/reauthorization guards; reads issue no commands. All asserted as expected. | 10 |
| REQ-001-F02; RB13 | learning/infrastructure/ConfiguredAssessmentActivityGuardAdapterTest.java | Retained test filename now checks the real replacement adapter boundary: persisted activity, fail-closed outage and invalid identity before SQL. It no longer instantiates the retired configured boolean adapter. Pass. | 2 |
| REQ-001/002 profile boundary; RB04/16/17, MM01/02 | learning/api/CurrentRoleFlowControllerTest.java | Safe empty/no-store;403 versus503; reject injected actor/org fields and malformed body; valid command contains only allowed fields; gate-off/prod/mixed profiles never register current controller. Pass. | 11 |
| REQ-002-F01; RB13/15, AB-A02/A05/A06/A09/S01 | assessment/adaptive/AdaptiveAttemptContractTest.java | Full versus legacy scope; manual insufficiency INVALIDATED/MANUAL/no mastery; deadline equality rejects answer; linked pins; all-correct/all-wrong sufficient evidence; deterministic selector; exact closed-form P(theta=b,c=.25)=.625 and logistic(0)=.5. Pass; not a numerical benchmark. | 7 |
| REQ-002-F01/F02; RB07/15, AB-C03, MM04 | assessment/adaptive/CurrentOccupationProfileTest.java | Genuine terminal fixture with zero mastery initializes; invalidated/incomplete outcomes write no profile; Unicode100 and time bounds enforced while legacy bounds retain their values. Pass. | 3 |
| REQ-002-F02; AB-C07 | assessment/adaptive/AdaptiveBlueprintAuthorizationTest.java | Employee/Admin/no-role, missing/inactive identity and foreign grants denied before store/eligibility/preview queries. Pass. | 2 |
| Historical REQ-001-F02 and fixed Blueprint security compatibility only | TargetRoleSelectionDomainTest; TargetRoleSelectionServiceTest; SelectionRequestHasherTest; TargetRoleSelectionProductionBoundaryTest; BaselineBlueprintProductionBoundaryTest | Existing domain/replay/security contract assertions pass. These 27 tests retain their historical oracle; they are not substituted for current string-ID/adaptive acceptance. | 27 |
| REQ-001-F01/F02 + REQ-002-F01; RB01/02/03/05/07/11/13/14/17 | employee/target-roles/RoleBaselineFlow.test.tsx | Real current panel/gate: Level detail, committed-write GET-only recovery, ambiguous exact retry, resume/complete destinations, search and 12-row pagination/filter reset. Pass. | 7 |
| Profile/REQ-009-F01; MM01/02/03/05 | employee/baseline-assessment/MyMasteryPage.test.tsx | Empty/one/multiple profiles; zero mastery; original result/version links; explicit outage/retry; raw100% separate from mastery0%; help/focus/Escape and later-learning limitation. Pass. Browser mobile is separately Fail. | 6 |
| REQ-002-F02; MM04, AB-C03/C04 | manager/baseline-assessments/adaptiveBaselineDraft.test.ts | 3000sec survives clear/re-entry and record switch; no hidden duration default; Unicode/integer/time bounds. Pass. | 3 |
| REQ-002-F02; VB01/02/03/04 | manager/baseline-assessments/useAdaptiveBaselineWorkspace.test.tsx | Draft versus Active; unchanged Save; known-commit GET-only retry; stale/confirmed discard identity; exact retry key/body; preview invalidation. Pass. | 5 |
| REQ-002-F02; VB02/03, MM04 | manager/baseline-assessments/AdaptiveBaselinePage.test.tsx | Identified historical v1 shows45/50min, never Draft100/110 or Active v2; switching restores Draft; stale Draft URL locks writes. Pass. | 2 |
| REQ-001 navigation/retained route compatibility | app/AppTargetRoleRoute.test.tsx; manager/baseline-assessments/LegacyBaselineAssessmentRedirect.test.tsx | Server route without legacy selection/localStorage writes; existing redirect contracts retained. App mock gained the existing EmployeeUpskillingPage export. Pass. | 3 |

Java files above are under backend/src/test/java/com/adaptlearngraph; FE files are under frontend/src/features except the explicitly named app file. Exact method names, report path and per-case status are in case-results.json, not inferred from filenames.

## Corrections and limits

Initial failures were separated from acceptance: retired test-class reference, duplicate helper name, ambiguous Cancel selector, Mockito restubbing and outdated App mock. They were corrected only in tests; original logs/exit1 remain in commands.json. Six selector-filtered Vitest skips in the pagination-only run do not erase the six earlier executed passes.

The current Role-first contract overrides the old testing README journey that places RIASEC/guidance before selection. AB-A06's old reject-and-continue wording and AB-A11's current-version replacement wording conflict with confirmed early invalidation/original-chain pins; current confirmed behavior is the oracle. Frontend DESIGN_SYSTEM.md also contains an older26/14px scale versus repository AGENTS/live tokens28/15.5px; no runtime style was changed here.

AB-S01 exact formula/structural invariants ran. Independent theta/SE golden vectors, model acceptance tolerances and production calibration remain Blocked/Not run pending an approved oracle/version. Performance workload/threshold/environment policy is also Blocked/Not run. No arbitrary benchmark threshold was invented.
