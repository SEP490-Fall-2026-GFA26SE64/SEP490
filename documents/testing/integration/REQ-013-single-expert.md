# REQ-013 — one responsible Expert: integration evidence

Date: 2026-10-29. ModuleAuthoringIntegrationTest: **2 passed**, PostgreSQL17.6 + Neo4j5.26 Testcontainers. Together with application/architecture suites:18 backend tests passed, no failures/errors/skips in the successful run.

Assertions retain all13 LearningModule and8 TEACHES properties, content snapshots, stable IDs, audit/revisions, publication, pinning and archive coverage. New assertions use two Experts with occupation grants: peer can read but update/delete/submit return403; the responsible creator can revise and L&D can approve. Removing a peer's occupation grant does not hide same-organization history or grant writes. Imported Module.createdBy is now the selected Expert; original imported content.createdBy remains unknown where appropriate. Another organization's repository remains empty.

## Actual local handover

Source was read only: module-authoring-test Neo4j/PostgreSQL. Private snapshots saved under ignored local/dev-accounts, without credentials in tracked files. Source Neo4j was temporarily started for reading and returned to its prior stopped state.

- Copied1013 nodes/5142 relationships to the empty dedicated dev graph, then compared every label/property/endpoint/type against source. No owner property was added to Neo4j.
- Preserved23 existing PostgreSQL Module documents and17 content records; received246 unmanaged catalog Modules through the real authoring service. Initial handover count:269 Modules, all assigned to expert@example.test.
- All23 revision arrays and original history prefixes were compared exactly. Only explicit owner-assignment audit events/lock versions were added. Released revision, archived state, editor/reviewer identities and timestamps were retained.
- All4 original intake histories, including one pending assignment, are retained in the target history. The original pending-assignment events were restored idempotently with a HISTORY_RESTORED event. Unknown historical actors remain their actual IDs; no replacement reviewer is fabricated.
- First adoption attempt used an incorrect Role→Skill shortcut and refused an uninferred scope; its outer PostgreSQL transaction rolled back completely. Corrected to actual Occupation→TargetRole→Level→MicroSkill schema path. Successful handover is receipted; repeating it cannot overwrite later authoring.
- New catalog drafts were not auto-approved, and catalog properties were not rewritten by intake. Existing deletion/archive and coverage safeguards remain.

The isolated database uses main V1–V34, not the legacy database's conflicting Flyway lineage. No legacy schema upgrade, reset or destructive operation was performed. The packaged application excludes the operational test-source CLI classes. Later browser verification adds separately named test modules; these do not change the269-record handover receipt.
