# REQ-001 / REQ-002 / REQ-034 — merge reconciliation

Date: 2026-10-26. Scope: resolve the interrupted merge of main into the ontology 0.9/RQ2 branch. No new feature contract or ontology properties are introduced.

## Resolution

- Retained ontology 0.9.0 (833 nodes, 4638 relationships, 181 TEACHES mappings) and its matching source/SVG/PNG exports. Preserved the dated 0.8 runtime observations as historical evidence, not as proof that 0.9 is deployed.
- Preserved main's V1–V26 baseline architecture and role/profile contracts together with the RQ2 architecture and isolated research graph boundary.
- Combined local Research and baseline configuration. Research remains disabled by default.
- Combined employee header responsiveness, module reading mode, accessible sidebar toggle and the optional mobile overlay. Overlay positioning now follows the shared header-height variable.
- Resolved duplicate Flyway V8/V9 identities by renaming only Research SQL files to V27/V28. SQL bytes match the original branch. Updated the Research integration upgrade test to start at V27 before exercising V28 seed backfill.
- Corrected unsupported Testing Library role options in LoginPage tests and aligned Research pagination assertions with the merged shared Pagination labels.

## Database compatibility

Fresh databases and databases containing main's V1–V26 can discover one migration per version through V28. This is static verification, not a successful database migration run.

A database that already applied the Research branch's original V8/V9 is **not** automatically upgrade-compatible: those history versions collide with main's baseline V8/V9. Before startup, inspect and back up its migration history and research tables, then design and verify an explicit reconciliation preserving research artifacts and baseline records. This merge does not modify database history, run repair, reset volumes, or claim that historical databases were upgraded. The old V26 inventory excludes the two Research tables.

## Verification

- Git conflict-marker scan and unmerged-entry check: pass, all 11 originally conflicted files resolved.
- Migration inventory: pass, 28 unique versions; original Research SQL unchanged.
- Frontend production build (`npm run build`): pass; existing bundle-size advisory remains.
- Frontend targeted tests: 24 passed across LoginPage, ResearchPage, GlobalSearchbar and useLocalDemoSession.
- Backend ResearchDomainTest/ResearchServiceTest: 10 passed, zero failed/skipped; main and test sources compiled.
- Dataset tests (`python3 documents/dataset/import/test_dataset.py`): 10 passed.
- HexagonalArchitectureTest: 3 passed, zero failures/skips.
- Compose/Testcontainers/Playwright and interactive full-stack verification: blocked. Docker Compose status returned HTTP 500 from the local Docker daemon even with permitted socket access. No database/container state was changed. Database non-empty-field round trips and full browser acceptance are not verified by the unit/build results above.

## Manual checklist — pending

Prerequisites: healthy Compose stack, compatible migration history through V28, seeded tenant/catalog, working local demo session, Employee/L&D/Admin access. Enable Research and its separate Neo4j only for the Research scenario. Default web origin: http://127.0.0.1:8088.

| URL / actor | Steps | Expected result |
| --- | --- | --- |
| `/employee/target-roles` / Employee | At widths 390, 768 and 1280, switch EN/VI; open account menu; expand/collapse sidebar | Header controls remain reachable, no header overflow; toggle expanded state matches sidebar visibility |
| `/admin/research` / Admin | On a phone-sized viewport, open/close sidebar; load a completed multi-seed run; use Next/Prev; switch runs | Overlay starts below the header; result page switches complete seeds and resets for the selected run; meaningful persisted metrics appear |
| `/ld-manager/baseline-assessments` / L&D | Open the baseline workspace, then navigate away and return | Existing baseline navigation/settings still load; loading, empty and error states remain distinct |
| Existing Employee module URL containing `/modules/` | Open a permitted learning module, then return to target roles | Reading mode hides workspace sidebar and toggle; ordinary navigation restores them |
| `/admin/research` / non-Admin | Open the route directly | Existing Research access guard denies entry without changing the active role |

Run the existing header-responsive Playwright spec against Compose after recovery. Use the dedicated REQ-034 browser procedures for Research mutation/error and artifact checks. None of these manual rows is marked passed in this record.
