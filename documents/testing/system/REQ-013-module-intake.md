# REQ-013 / REQ-053 — Per-module catalog intake

Environment: Compose project `module-authoring-test`; web28088, API28080, Neo4jHTTP27474/Bolt27687, PostgreSQL25432. No volumes reset, no bulk catalog migration/approval. Flyway validated all 28 migrations and applied V28 successfully on 2026-10-28. V28 adds only the intake table/index; source Markdown ships with the application.

`frontend/system-tests/REQ-013-module-intake.spec.ts` uses actual main login, APIs, PostgreSQL and Neo4j. It creates a new graph-only test fixture (`MOD-INTAKE-E2E-*`) with real bundled source content, instead of altering a seeded/user module. Expected journey: L&D cancel/assign → Expert receive/edit → draft visible → original creator unknown and receiver/history recorded → submit → L&D approve → graph same ID updated. Also checks employee denial, duplicate acceptance and no hard-delete. Final real-stack execution passed: 1 test, 1.4 minutes (1.5 minutes total), no HTTP mocks. Screenshot: `frontend/test-results/REQ-013-module-intake.png`. Earlier attempts started before API readiness and exceeded the initial 30-second post-approval UI wait; API readback confirmed the first fixture had already RELEASED. The final spec explicitly waits for readiness and the 200 decision response, then asserts the visible Released state and graph readback. The final run also reloads the page, checks persistent provenance, and opens the original Module/TEACHES source snapshot.

## Manual checklist

Prerequisites: local Compose running; existing L&D account; an Expert granted at least one responsible Occupation. Choose a graph-only Module with bundled Markdown.

| URL / steps | Expected |
| --- | --- |
| http://127.0.0.1:28088/ld-manager/approvals — assign Expert to occupation if needed | Expert receives the occupation scope. |
| http://127.0.0.1:28088/ld-manager/modules — search module, Phân công tiếp nhận → Hủy | No assignment/data change; L&D shell remains. |
| Phân công tiếp nhận → select one or more occupations → confirm | Chờ Expert tiếp nhận; no approval action and no graph change. |
| Cập nhật phân công tiếp nhận before acceptance | Scope/source snapshot updated with concurrency token and assignment history. |
| http://127.0.0.1:28088/expert/modules — same module → Tiếp nhận chỉnh sửa → confirm | Existing ID becomes draft; title/type/duration/price/skills/focus/difficulty/content populated; no duplicate graph node. |
| Edit, save, Chi tiết và lịch sử | Original creator unknown; actual receiver/editor and timestamps visible; source snapshot can be inspected. |
| Gửi duyệt → L&D Content Approval | Duyệt và phát hành / Yêu cầu chỉnh sửa appear only after submission. |
| Duyệt và phát hành → confirm | Released revision persists; same graph ID and retained mapping IDs; reviewer/time populated. |
| Repeat intake / use unassigned Expert / missing source / external source drift | Useful conflict/authorization/validation response; no partial writes or silent overwrite. |
| Imported draft | No Delete draft action; archive flow applies after publication. |

Interactive Vietnamese UI check: verified Chưa tiếp nhận, Phân công tiếp nhận, responsible-occupation selector and cancel retaining the module without a write.

Interactive browser verification after deployment confirmed Released/Approved, null original creator shown as unknown, actual assignment/receiver/editor/reviewer timestamps, both preserved revisions, assignment/intake/edit/submit/approve/release events and the unchanged original catalog snapshot. The L&D Modules tab remains available for walkthrough.
