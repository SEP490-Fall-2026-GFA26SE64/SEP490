# Local development demo

Current UI2026-10-28: the portal menu offers one Employee (server alias employee-a), plus Expert/L&D/admin. Employee B/C are retired from session admission and new provisioning; earlier fixture rows/history remain until you explicitly reset project dev volumes. Historical C links/receipts below describe the earlier multi-Employee fixture only. Use the Employee menu to replace any retired browser cookie. Level choices are visible radio options; the Active Role summary has a Review skill gap button opening the selected pair in a wide dialog. No reset occurs during this UI refinement.

Run from this repository root with Docker Engine/Compose available. With the local demo flag enabled, `/` opens L&D baseline management; otherwise the normal login landing is retained. Server persona/authorization rules still apply:

```sh
docker compose up --build -d
```

`compose.yaml` includes `compose.dev.yml`. Open **http://localhost:8088**. API health is http://localhost:18080/actuator/health. Ports can be changed using `.env.example`; do not commit actual secrets. Dev services bind to loopback. This stack explicitly enables local baseline/persona/Expert assignment/planning substitutes; production configuration does not enable them.

Startup runs migrations, imports exact catalog0.11 and the pinned135-item question bank, waits for graph indexes and gracefully seals Neo4j read-only before starting API/worker/web. Ordinary restarts retain blueprints, attempts, mastery, pathway revisions and approvals. A mismatching existing graph is refused rather than overwritten. Do not manually edit or unseal the catalog while API/worker are running.

Use the user menu to switch to L&D Manager, Employee or Expert. The Employee entry establishes the fixed employee-a session. A portal URL alone does not establish the server persona cookie. Use the same localhost origin throughout. The local fixture supports **Information Security Analysts (OCC-15-1212.00)**; choose **Information Security Officer** and Junior/Middle/Senior. Other catalog Roles are browsable but do not imply baseline compatibility.

1. L&D: baseline management → configure full-Occupation bounds → Save → Preview → Activate. The current fixture has15 skills/minimum45 questions; use actual capacity shown by the server. An older active Blueprint can be stale after catalog change; activate a new version through this flow without deleting history.
2. Employee: select that Role and Level, complete the real baseline, inspect My Mastery, then preview gaps and explicitly confirm the pair.
3. Expert: initial pathway review → inspect grouped Module alternatives/teaching notes → include/exclude → Validate → approve the exact valid revision.
4. Return to the same Employee → `/employee/pathway?view=role`. Role confirmation opens this explicit Role view even if an unrelated independent-skill view was previously selected. Approved cards show the exact sequence and notes. Learning entries stay unavailable pending their owner integration; this demo ends at pathway display.

Local availability accepts only ACTIVE Module/content versions from the exact pinned seed. Planning prerequisites compare original compatible baseline mastery to the actual edge threshold; lower/UNKNOWN adds prior learning needs. No internal gate or learning PASS is fabricated. Full policy and limits: [shared design18](documents/features/Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md). Manual steps/results/limits: [operator receipt](documents/testing/system/REQ-002-041-042-compose-manual.md).

Reset is optional. First inspect `docker compose ps -a` and the project's named volumes. Deleting verified project dev volumes loses all dev DB state, including accounts, Blueprint configuration, attempts, mastery and pathways; seeds are reconstructed on the next startup. Reset the `neo4j_catalog_v011_data` and `catalog_v011_bootstrap` pair together when deliberately rebuilding graph storage. Never delete unrelated volumes or make reset part of startup.

Current Expert UI uses the original queue/detail files: four queue metrics, inline search/status and seven-column table; detail context, horizontal Catalog rows and parallel Included/Excluded lists. Added page-title headers are removed from Expert and Employee Role pathway. The queue metrics cover the current page; Level/review version replace unavailable mock fields. Reorder, delete-history and preemptive Catalog exclusion controls remain disabled. Existing Include/Exclude/validation/confirmation APIs remain. Refresh the browser after source updates; no volume reset is needed for these layout changes.

Employee pathway `/employee/pathway?view=role` now restores the original Role/Module/skill diagram and timeline with actual approved data. Its count is frozen baseline target attainment, not learning completion; click Modules/skills for read-only details. Approval does not open unavailable content. Current own fixture has three Modules/three mandatory Role skills and0/3 targets met; original screenshot values are mock examples, not a demo expectation. Browser visual acceptance remains separate from API/build checks.

No executable-test pass or production readiness is claimed. C3 requires separate approval. Existing dependency audit/bundle notices are recorded in the manual receipt.

Git attributes deliberately check out v010/v011 release files with CRLF to preserve existing byte-pinned hashes on every OS; Linux bootstrap scripts use LF. Keep attributes enabled and do not reformat or silently repin seed files.

The dev web container runs `npm ci --no-audit --no-fund` before Vite on each start. This reconciles its retained node_modules volume with the checked-in lockfile after pull/rebuild. First startup needs package-registry access. If the HTML opens but Vite reports a missing import, inspect `docker compose logs web`; rebuilding the image alone does not refresh an old dependency volume. Recreate only web after changing its startup: `docker compose up --build -d --no-deps web`. No DB reset is needed.

Wait for npm ci and the Vite ready message before running build/lint in that same container. Main dev Compose enables polling (300ms) so Docker Desktop Windows bind-mounted edits invalidate Vite transforms; native/non-demo runs keep polling off unless explicitly enabled. Source changes can otherwise exist on disk while an older transformed module is still served.
