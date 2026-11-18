# REQ-013 / REQ-014 — Incoming main conflict resolution

Date: 2026-11-13. Branch: module-learning-manage-v2. Main and origin/main both resolved to 7f6f179d at inspection; all 32 stage-3 conflict snapshots matched main exactly. The workspace already contained an in-progress integration with no MERGE_HEAD/rebase/cherry-pick state; no second merge or commit was started.

Resolved 32 unmerged paths. Retained the feature branch's current Module/Question Bank authoring, shared preview, system-generated import identity and desktop table behavior. Took main snapshots for the nine unrelated department/user/role/profile/ontology/store files and the additive question-import historical evidence. Retained feature-specific evidence; removed pre-existing nested conflict markers from the Module authoring report without deleting its historical text. Existing nonconflicting staged main changes, including password-reset work, were preserved.

Updated the ModuleManagementWorkspace component test to enter View as learner and navigate Text/Video/Text instead of expecting lesson bodies inside the information tab. It still asserts creator identity, manager route isolation, content, video URL and review authority.

## Actual verification

- Unmerged index entries: **0**; no conflict markers in the 32 resolved working files.
- Frontend production build: **Passed**, existing bundle-size advisory remains.
- Scoped component suite: **84/84 Passed**, 12 files, 273.56s with one worker. Initial concurrent run had an outdated information-tab assertion and two timing failures; final serial run passed after updating the tab navigation assertion.
- Chrome Playwright: **13/13 Passed**, 2.0m, built frontend at http://127.0.0.1:5100 with isolated API fixtures. Module Review/saved preview, EN/VI directory layouts at 1280/1440/1800/390, Question Review/saved preview and failed confirmation retention covered. Output `/tmp/sep490-main-conflict-browser`; log `/tmp/sep490-main-conflict-browser.log`.
- Whitespace check for resolved paths: **Passed**. Whole staged diff check reports pre-existing whitespace in incoming password-reset and workflow-report files; those unrelated changes were preserved.
- Backend `bash mvnw -q -Dtest=SingleSkillImportTest test`: **Blocked at test compilation** by 15 unchanged test files using retired constructors/accessors (including price, prerequisite DTOs and assessment-policy service type). Those test files match branch HEAD. No selected backend test executed; no backend test pass is claimed. See `/tmp/sep490-main-conflict-backend.log`.

Resolution is staged, with no commit or push. Browser fixture coverage does not certify live backend health or production readiness. No database resets or runtime data imports were performed.
