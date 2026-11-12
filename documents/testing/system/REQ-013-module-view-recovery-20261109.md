# REQ-013 — Module view runtime recovery, 9 November 2026

Scope: local `http://localhost:8088/workspace/workspace-development/expert/modules`, FR-05.05 / REQ-013 catalog details. Runtime recovery only; no application source, test or migration files edited.

## Cause and recovery

The bind-mounted frontend used `module.outcomeCodes.join(...)`, but the old running backend JAR's `CatalogModuleResponse` did not contain `outcomeCodes`, `knowledgeLevel` or `skillVersion`. Rebuilding the backend exposed a second version mismatch: PostgreSQL was at V51, missing `platform.assessment_item_knowledge_mapping` required by current source. The local profile disables Flyway.

After explicit approval, PostgreSQL was backed up to ignored `local/module-view-recovery-20261109/pre-v52-v62.dump`; `pg_restore -l` successfully read the archive. The current source's 11 existing forward migrations V52–V62 were applied with Flyway using a temporary Compose environment override. All 62 migration checksums validated; Flyway reported all 11 pending migrations successfully applied. No reset or custom migration SQL was used. The API image was rebuilt and only the API container recreated; existing database/object-storage volumes were retained.

## Verification

| Check | Actual result |
|---|---|
| Backend Docker build | Passed; Maven package succeeded, tests skipped by existing Dockerfile |
| Flyway validation/application | Passed; 62 validated, 11 applied, schema V62 |
| API health after migration | Passed; `/actuator/health` returned `UP` |
| Real authenticated catalog API | Passed; local Expert, 246 total modules, each returned item had an `outcomeCodes` array |
| Playwright real browser view | Passed; signed in, opened the real workspace, clicked first View module, catalog dialog visible with expected title, 0 page errors |
| Screenshot | `assets/module-view-recovery-20261109/view-module.png` |
| Existing focused component test during diagnosis | Failed before module rendering: translation mock lacks `t` (`TypeError: t is not a function`); not changed or reported as passing |

Manual check: open the workspace URL above, sign in as the existing local Expert if required, click **View module** on a module card. Expected: catalog details dialog shows its title, metadata and mapped Skill; closing returns to the module list. This verifies catalog details, not lesson playback or full authoring/review acceptance. No production acceptance claimed.

Final configuration check: API was recreated from the standard `compose.yaml` without the temporary Flyway override; health returned `UP`. PostgreSQL query returned version `62` and `0` failed migrations. A browser rerun after this restart timed out waiting for the page `load` event (30 seconds); this is preserved as a failed navigation check, separate from the earlier passing real-browser journey. A bounded rerun waits for `domcontentloaded` and the actual View module control instead of all page resources.

Final bounded browser rerun: **Passed** on standard dev configuration. Real API reported 246 total modules and `outcomeCodes` arrays; View module displayed the expected catalog dialog and module title, with **0 page errors**. Screenshot above was refreshed from this final run. The earlier timeout and component-test failure remain recorded; no full-suite passing claim is made. No feature README change is needed because the existing functionality and business rules were unchanged.
