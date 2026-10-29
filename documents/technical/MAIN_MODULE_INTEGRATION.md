# Main / learning-module-manage integration — 2026-10-29

Source: main6889516 (initial pathway PR12), destination82a05f3. User-authorized integration resolves54 unmerged paths (23 modify/modify,18 add/add,13 modify/delete) without a commit/push. Existing staged automatic merge changes are retained. This remains the user's pending squash integration; code resolution does not change Git ancestry until a commit is created.

| Area | Resolution |
| --- | --- |
| Initial generation/review | Keep main planner, request/worker/store, API, exact review and original generated UI. |
| Module/learning content | Retain branch ownership, imports, ordered real lessons, private assets, pins, resume and completion. Add fail-closed generated admission bridge instead of copying generated drafts into manual assignments. |
| Pathway UI | Original owners accept generated `pathway` and manual `assigned` props. Default generated route plus explicit assigned mode; safe return context. No fabricated mastery or diagnostic unlock. |
| Identity/session | Keep main identity refresh/cache cancellation fixes and branch concurrent-only CSRF coalescing. Preserve demo sign-out/aliases only behind the existing explicit demo flag; real dev login is unchanged. |
| Backend/config | main baseline/development resource support retained; legacy persona extensions merged, not used as real authentication. Upload-settings navigation, Module/L&D highlighting and actual notification access retained. |
| Migrations | Existing canonical1–38 and workspace1–35 checksums unchanged; additive39–41 for canonical pathway,36–41 for workspace content. Explicit location per database lineage, clean artifact build. |
| Documents | main consolidated feature organization retained. Module-specific delivered sections preserved. Ten modified old feature files retired by main are archived under technical/module-management-history; three retired technical files are retained under technical/incoming-pathway-history. These are source history, not duplicate active feature contracts. |

[Testing and manual steps](../testing/system/REQ-013-main-pathway-integration.md). Actual generation needs valid owner inputs/configuration; the R4 manual demonstration is not presented as an algorithm result. No catalog import/reset, data/volume wipe, reseed or automatic content approval. Dev storage was backed up and migrated additively; no source migration from canonical HEAD was changed. Final verification status belongs to the linked evidence.
