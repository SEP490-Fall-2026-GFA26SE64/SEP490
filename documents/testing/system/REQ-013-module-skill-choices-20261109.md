# REQ-013 / FR-05.05 — Module Skill choices and list, 9 November 2026

Scope: Expert Create/Edit Module Skill options and the shared Module list on `http://localhost:8088/workspace/workspace-development/expert/modules`. No schema migration, catalog approval, commit or push in this slice. Earlier runtime recovery evidence remains in its separate dated record.

## Delivered behavior and API boundary

- `GET /api/v1/module-management/catalog/ModuleSkill` reuses the existing authenticated catalog controller/application/service/adapter path and existing `Choice` id/name projection. `JpaModuleAuthoringAdapter` supplies the trusted actor's organization. Neo4j includes only named, identified MicroSkills in that organization whose status is `ACTIVE` and review status is `APPROVED`.
- The editor uses this separate choice list. Empty results explain that a Skill must be activated/approved and disable Skill selection and saving. A former selection no longer in the eligible list requires replacement. Existing server validation remains authoritative for later status changes, provision mode, knowledge level and outcomes.
- General `catalog/MicroSkill` browsing choices and Module filters are unchanged. Module list cards omit Module IDs, show taught Skill names, and use truthful missing-title/missing-Skill fallbacks. IDs remain available internally and in catalog details.
- Only existing fields are used: catalog Choice `id`/`name`, module `metadata.id`/`title`, and `teachings[].skillName`. No persistence fields, nullability, authorization rules or dependencies changed.

## Actual verification

| Acceptance | Result | Evidence |
|---|---|---|
| A1 — editor eligible list separate from broad browse choices; real organization/status/review exclusion matrix | Passed | 1 MVC/service authorization test + 1 Neo4j Testcontainers integration test; `assets/module-skill-choices-20261109/junit/` |
| A2 — empty eligible list explains next step and disables saving | Passed component and browser | 4 component tests in `frontend-component.log` |
| A3 — list hides IDs, shows Skill names and truthful missing-data labels; catalog details retain identity | Passed component and browser | `ModuleSkillChoices.test.tsx` |
| A4 — editing an ineligible former Skill requires replacement; stale/forged/cross-organization inputs still rejected by server | Passed | Component editing case and real graph validation after Skill deactivation |
| A5 — desktop/mobile layout, browse filtering, View module and real API/editor parity | Passed across final bounded run and desktop readiness rerun | `REQ-013-module-skill-choices.spec.ts` |
| Frontend typecheck/production build | Passed | `frontend-build.log` |
| Scoped lint | Passed with two warnings in existing effect code | `scoped-lint.log` |
| Backend package/runtime image | Passed | `backend-package.log`, `runtime-image.log` |
| Standard backend test lifecycle | Blocked at test compilation | Unrelated stale price/Save/Package, prerequisite DTO and QuestionBank port tests; `backend-full-test-compilation.log` |
| ArchUnit | 7 Passed, 2 Failed | Existing dependencies/signatures in unchanged AssessmentPolicyController, RuleAssessmentController, CertificateController and RequirementPathwayController; `backend-focused-and-architecture.log` |

The backend focused tests were compiled/run with a temporary POM preserving repository dependencies and production sources, selecting only the two new tests plus the existing ArchUnit class. Repository POM and old tests were not modified. Actual focused outcome: 2 behavior tests Passed; 9 architecture checks ran, 2 Failed. The combined Maven invocation therefore **Failed**, and the full backend suite is not claimed as passing. The initial Neo4j container startup timed out; the bounded rerun with a five-minute startup allowance passed all business assertions. Initial full Docker Maven build was cancelled after stalling; JDK 21 offline Maven packaging and a runtime-image update succeeded.

Docker exhausted memory during verification and stopped the dev Neo4j and separate assessment-test API. Both existing containers were restarted without configuration/volume changes; no unrelated environment was deliberately stopped. Final service health and browser results are recorded below when complete. No full-repository or production readiness claim is made.

## Manual checklist

- Open the workspace URL above and sign in as its existing Expert.
- On Module cards, check that Module IDs are absent and the taught Skill name is shown. Search/filter and View module should still work; details may show identity.
- Open Create module. Skill options must match the eligible API list. If empty, the explanatory message and disabled Save draft must be visible.
- Edit a Module whose original Skill is no longer eligible: choose an eligible replacement before saving. Server validation must still reject a Skill deactivated after loading the form.
- Repeat list/form checks at desktop and mobile widths. No catalog data needs to be edited merely for this checklist.

## Follow-up results and operational boundary

The first Playwright run passed both desktop (1280px) and mobile (390px) presentation journeys. Its real-data test failed because multiple Modules share a title and the locator assumed uniqueness; changing that test locator to `.first()` preserved the expected title check. A focused real-data rerun then passed against the actual API and editor (0 page errors). Screenshots were visually inspected: Skill names wrap on mobile and Module IDs are absent from cards.

Visual inspection found that the existing Available skills statistic still counted broad browsing choices despite its authoring-specific description. It now uses the eligible list for Experts; manager browsing keeps the broad count and a catalog description. The statistic has an accessible group name. The four component tests passed again, including distinct counts for broad-versus-eligible and empty choices. Final frontend production build passed; scoped lint has the same two existing effect warnings. A final browser rerun verifies the statistic too; its first desktop navigation timed out at 60 seconds while build activity was still present. This failure is retained in `playwright-final.log` separately from earlier passing runs.

The dev API and Neo4j recovered to healthy. The separate assessment-test API on port 18086/8096 could not be restored after its OOM termination: it had mounted the shared `backend/target/adapt-learn-graph.jar`, which packaging replaced with current source. Its database uses a different lineage ending in `V48__module_assessment_runtime.sql`, not the current workspace V48. A recovery attempt with a saved older JAR also failed schema validation (`baseline_adaptive_attempt.job_position_id` missing). That temporary replacement was removed and the exact original container/configuration restored under its original name, stopped. Its volumes/database were not upgraded or reset. Private runtime/config snapshots remain in ignored `local/module-skill-choices-recovery-20261109/`. The custom old runtime required by that separate environment remains unavailable; its recovery is a separate delivery blocker, not reported as Passed.

Because the repository-wide backend compilation/architecture gates fail in unchanged code and the separate test environment remains stopped, no full-repository completion is claimed and no feature README completion update is published. Working contract remains `/tmp/feature-implementation/module-eligible-skills.md` for resumption.

## Approved dev memory adjustment

Further checks established a runtime cause for the unstable final browser runs: unbounded dev Neo4j reached **2.56 GiB** of the Docker VM's **3.827 GiB**, and Docker OOM-killed the dev API again. The user explicitly approved local Neo4j memory limits. `compose.dev.yml` now sets initial heap **256m**, maximum heap **512m** and page cache **256m**; production Compose and all volumes/schema are unchanged. `docker compose config --quiet` passed, the dev Neo4j container was recreated from its existing volumes, and `SHOW SETTINGS` confirmed the three effective values (see `neo4j-memory-settings.txt`). A runtime sample after applying these limits showed Neo4j **637.9 MiB** and the starting API **370 MiB**. API then returned `UP`.

Both a system-Chrome rerun and a bundled Chrome for Testing rerun failed during the resource problem; they remain recorded separately. The latter included API connection refusal after OOM termination, not a passing UI assertion. After memory limits and API recovery, `playwright-memory-bounded.log` records the final bounded rerun. No browser success is inferred solely from a successful restart.


## Final scoped result

After the memory adjustment, the mobile and real API/editor parity cases passed in `playwright-memory-bounded.log`. The desktop case initially read the Available skills count before the rest of the catalog finished loading: module cards arrive before the Promise.all catalog state, and Create module was still disabled. The test now waits for Create module to be enabled before asserting the exact count. Its focused rerun **Passed** in `playwright-desktop-ready-final.log`. All three distinct final acceptance journeys therefore have passing receipts; the earlier mixed run remains Failed and is not relabeled. Final component result is **4 Passed**, focused backend behavior **2 Passed**, and final frontend build Passed. No new product code was changed to make the readiness assertion pass.

Final memory sample during desktop verification: dev Neo4j **700.3 MiB**, dev API **607.6 MiB** of a **3.827 GiB** VM. The dev API and graph were running after the scoped checks; final health receipt is in `final-runtime-health.txt`. Screenshot set includes desktop/mobile lists/editors/empty states and the actual workspace list/editor. Visual inspection confirmed readable wrapping, no Module IDs on cards, and truthful empty eligible choices. Current real workspace had no eligible authoring Skills; catalog records were not auto-approved to populate the dropdown.

Remaining gates are explicit: the unchanged repository-wide backend test compilation and two architecture checks still fail, and legacy assessment-test API 8096 remains stopped awaiting its custom runtime. Its original container, configuration and database are preserved. These are not passing checks or full-product completion. Source, tests, local runtime config and dedicated evidence for the requested slice are ready for review; no commit/push was made.
