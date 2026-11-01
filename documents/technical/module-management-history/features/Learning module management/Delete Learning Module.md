> **Historical implementation record — retained during merge on 2026-10-29.** The current product contract is the [consolidated domain README](../Learning%20catalog/README.md). This record preserves the previously implemented local slice, user decisions and dated evidence; it does not override Version 2 or the authenticated workspace integration. V27/V28 below refer to the historical Module migration lineage; merged source uses V33/V34.

# Delete Learning Module

**Function ID:** REQ-013-F04
**Actor:** Expert trong discipline được phân công
**Status:** Implemented local workflow; verification tracked in dedicated REQ-013 evidence
**Feature:** [Learning Module Management](README.md)

## Current Scope Alignment

Áp dụng đầy đủ [field contract và quy tắc hiện tại](README.md#current-field-contract--ontology-v0110), [ARCHITECTURE](../../ARCHITECTURE.md) và [Neo4j schema](../../neo4j_schema.md). Đặc tả này không xác nhận API/giao diện runtime đã được nâng cấp.

## Description

Yêu cầu gỡ/ngừng sử dụng Module trong phạm vi được phép. Tên function không mặc định cho phép xóa vật lý.

**Input:** ID Module, actor/scope và yêu cầu gỡ; lý do hoặc Module thay thế chỉ bắt buộc khi chính sách đã được chốt.
**Outcome:** Archive/delete hoặc từ chối theo dependency và quyền đã thống nhất.

## Acceptance Baseline

1. Kiểm tra quyền và scope trước khi thay đổi; không xóa theo ID đơn thuần bỏ qua organization/discipline.
2. Nếu archive, dùng status ARCHIVED trong schema; giữ các field Module và metadata/mapping cần cho lịch sử. Không giả định cách chuyển status của TEACHES khi chưa chốt.
3. Không làm hỏng pathway, nội dung, assessment đang dùng hoặc historical pins; không cascade xóa câu hỏi/bằng chứng learner.
4. Kiểm tra coverage phía MicroSkill theo REQ-016 khi gỡ provider; không để skill mất coverage bắt buộc.
5. Không tự chuyển learner sang Module thay thế hoặc coi ngừng sử dụng là đã hoàn thành.

## Confirmed Decisions — 2026-10-28

- Chỉ xóa vật lý Module DRAFT chưa có tham chiếu; các trường hợp còn lại archive. Phải kiểm tra dependency và coverage skill trước khi gỡ.
- Module đã duyệt: Expert gửi yêu cầu archive, L&D phê duyệt; gửi yêu cầu không tự archive bản đang dùng.
- Hỗ trợ restore Module archived về DRAFT, phải duyệt lại trước khi sử dụng. Không tự kích hoạt lại bản duyệt cũ.
- Bảo toàn lịch sử learner, content và mapping cần để đọc bản đã pin; không cascade xóa evidence.

## Open Decisions

- Đã chốt: learner đã bắt đầu tiếp tục nội dung đã pin sau archive; chặn lượt bắt đầu mới. Workflow pin mới đã hỗ trợ; bridge mọi learning_activity/assessment legacy còn cần tích hợp.
- Có bắt buộc lý do archive, chọn provider thay thế và ai được yêu cầu restore?
- Quy tắc cập nhật trạng thái TEACHES và membership khi archive/restore.

### Imported module intake — 2026-10-28

[Explicit per-module intake](Receive%20Imported%20Module.md) adds a separate entry point: L&D assigns responsible Occupations; an assigned Expert receives the existing ID and bundled Markdown into a draft. `createdBy` remains null for unknown original authorship; assignment/acceptance identities and times are recorded separately. Only submitted drafts can be reviewed; first approval updates the existing graph identity. Imported drafts cannot be hard-deleted. Native creation retains generated ID/actual creator behavior. Source snapshots and edit/decision history remain separate.
