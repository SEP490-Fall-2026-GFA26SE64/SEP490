> **Current R4 behavior (2026-10-29):** new Module/content creation, reuse and Excel/ZIP import are based on skills and do not require an Occupation selection/grant. Historical occupation tags and the separate catalog intake workflow remain intact. L&D revision details show individually numbered Text/Video lesson cards. See the [current catalog refinement](../Learning%20catalog/README.md#r4-local-refinement--2026-10-29) and [tested UI/manual checklist](../../testing/system/REQ-013-learning-content-R4.md). Older dated rules below are retained for traceability.

> **Historical implementation record — retained during merge on 2026-10-29.** The current product contract is the [consolidated domain README](../Learning%20catalog/README.md). This record preserves the previously implemented local slice, user decisions and dated evidence; it does not override Version 2 or the authenticated workspace integration. V27/V28 below refer to the historical Module migration lineage; merged source uses V33/V34.

# View Learning Modules

**Function ID:** REQ-013-F02
**Actor:** Expert trong discipline được phân công
**Status:** Implemented local workflow; verification tracked in dedicated REQ-013 evidence
**Feature:** [Learning Module Management](README.md)

## Current Scope Alignment

Áp dụng đầy đủ [field contract và quy tắc hiện tại](README.md#current-field-contract--ontology-v0110), [ARCHITECTURE](../../ARCHITECTURE.md) và [Neo4j schema](../../neo4j_schema.md). Đặc tả này không xác nhận API/giao diện runtime đã được nâng cấp.

## Description

Xem danh sách và chi tiết Module được phép để quản lý, kiểm tra nội dung và mapping. Quyền Employee truy cập học thuộc REQ-007/055.

**Input:** Actor/organization/discipline đã xác thực và bộ lọc được phép.
**Outcome:** Danh sách/chi tiết trong đúng scope; áp dụng scope trước count và phân trang.

## Field Visibility

- Detail trả và trình bày đầy đủ 13 field Module trong contract; reviewedBy/reviewedAt chưa có được hiển thị là chưa review.
- Hiển thị từng skill được map cùng teachingFocus, difficultyLevel và 6 field metadata của TEACHES qua phần chi tiết thích hợp; không rút gọn thành một skill/difficulty toàn cục.
- Tên skill là dữ liệu join từ MicroSkill, không thêm property mới vào LearningModule.
- Không bắt buộc đưa toàn bộ metadata thành cột của bảng; danh sách cần ngắn gọn, detail cung cấp đủ thông tin.

## Acceptance Baseline

1. Không hiển thị Module ngoài scope hoặc nội dung chưa được phép preview.
2. Phân biệt lifecycle status và reviewStatus; không hiển thị ACTIVE như bằng chứng đã publication.
3. Có loading, empty state, lỗi mạng/retry và xử lý chuỗi dài; không fallback sang dữ liệu mock.
4. Quyền xem authoring không tự cấp quyền Employee học Module.

## Confirmed Decisions — 2026-10-28

- Expert xem mọi Module trong phạm vi được phân công, không giới hạn theo tác giả. Hướng dùng Occupation làm scope được ghi tại [quyết định chung](README.md#occupation-scope-and-revision-boundaries).
- Tìm theo tên/ID; lọc status, reviewStatus, moduleType và skill; áp dụng authorization trước tìm kiếm/count/phân trang.
- Có lịch sử chỉnh sửa để xem ai đã sửa, thời điểm và revision/thay đổi tương ứng; tách người sửa khỏi người duyệt.

## Implementation choices and remaining integration

- Implementation: danh sách card gồm title/ID, workflow status, thời lượng, giá, revision; sort createdAt giảm dần rồi ID, page size 10. Detail hiển thị đủ field, payload từng revision, người tạo, người sửa và lịch sử action; scope/filter trước count/paging.
- Visibility draft/archived; preview nội dung/assessment, lý do từ chối và thống kê sử dụng.

## Shared login correction — 2026-10-28

REQ-013 uses the existing main login session for Module, Content Studio, approval and learning requests. No additional Module login or Basic test accounts are used. The local bridge resolves active account ID, organization and persisted roles on the server; missing session returns 401 with a link back to the main login. Expert assignment choices come from active organization accounts. Creator/editor/reviewer IDs are account IDs. Main logout clears the shared cookie. No graph fields or entity schemas change; this does not convert the existing local demo login into production authentication or migrate historical test-account records.

## Neo4j catalog list — user-requested correction (2026-10-28)

REQ-013-F02 defaults to `/api/v1/module-management/module-list`. It reads existing LearningModule nodes and TEACHES relationships from Neo4j, preserves all 13 Module and 8 relationship properties as stored, and joins authorized PostgreSQL authoring documents by Module ID. Authorized drafts not yet projected to the graph are included once. Catalog values take precedence for an existing graph ID; authoring workflow/history remain separate. This is a read model, not a migration or fabricated initial revision.

The shared ontology catalog is browsable by authenticated Expert/L&D accounts, including Experts without an authoring grant. This explicit browse permission does not grant editing, approval, content-body access or learner admission. IDs owned by any authoring aggregate are excluded from the shared catalog unless the current actor can access that organization/scope. Legacy graph organizationId, if present, is checked for compatibility only; no such property is introduced into the current ontology.

Search (title/ID), lifecycle/review/type/skill filters and title-then-ID sorting apply to the merged authorized result before server-side paging (10 rows). Counts are scoped and duplicate graph/authoring IDs appear once. An unfiltered graph count can differ from the visible total because private authored IDs are excluded and authorized unprojected drafts are added.

Catalog-only details show the stored fields and mapping metadata, without invented creator/editor/revisions/history or fake approval. Missing historical values are explicitly shown as not recorded; duration/price are not replaced by mock defaults or durationMinutes. Existing edit/review actions remain available only through an authorized authoring document. External content is shown as its stored reference, not fetched by the backend.

The isolated running graph was read without modification: 98 LearningModule nodes, including legacy `MOD-DE-J-MODEL-01`, title `Junior Data modelling and storage - Module 1: Guided implementation`, contentVersion `1.2`; duration and price are absent on that node. The checked-in v0.11 catalog is not automatically imported over this older runtime graph. No schema, graph content or historical learner pins are changed.

## Runtime data upgraded to v0.11 — 2026-10-28

The user explicitly requested the latest schema/data import after the read-only list correction. This is now executed: all 246 shared catalog Modules have complete duration/price and TEACHES focus/difficulty; 13 separately authored graph Modules remain intact. Current Expert inspection shows 249 combined/scoped list rows, distinct from the raw graph's 259 Modules. `MOD-DE-J-MODEL-01` now shows the v11 title, 450 minutes, 480000 VND, contentVersion 1.3 and complete mapping metadata. Earlier missing-field notes are historical before import. No catalog-only edit history/reviewer is fabricated. [Upgrade receipt](../../dataset/NEO4J_V011_LOCAL_UPGRADE.md); [manual checklist](../../testing/system/REQ-013-016-v011-import.md).

### L&D module review navigation — REQ-053 (2026-10-28)

Content Approval stays at `/ld-manager/approvals`; Modules and Learning content resolve to `/ld-manager/modules` and `/ld-manager/learning-content`. All retain the L&D shell and Content Approval sidebar selection. Details/history open without switching actor. Submitted authoring revisions expose manager review actions; graph-only catalog entries remain read-only and are not automatically submitted. This routing correction changes no schema, storage responsibilities, seed data or API authorization.

### Imported module intake — 2026-10-28

[Explicit per-module intake](Receive%20Imported%20Module.md) adds a separate entry point: L&D assigns responsible Occupations; an assigned Expert receives the existing ID and bundled Markdown into a draft. `createdBy` remains null for unknown original authorship; assignment/acceptance identities and times are recorded separately. Only submitted drafts can be reviewed; first approval updates the existing graph identity. Imported drafts cannot be hard-deleted. Native creation retains generated ID/actual creator behavior. Source snapshots and edit/decision history remain separate.
