> **Historical local implementation:** Current source requirements are in [Learning Catalog](../Learning%20catalog/README.md). Pre-merge V27/V28 references describe the old database; combined-source migrations are V33/V34. See [architecture](../../ARCHITECTURE.md#merge-migration-boundary--2026-10-29).

# Tiếp nhận module từ danh mục Neo4j

REQ-013-F01/F02 và REQ-053-F01–F04. User approved option A on 2026-10-28.

## Quy trình

1. L&D mở Modules, chọn **Phân công tiếp nhận**, chọn đúng một Expert đang hoạt động để chịu trách nhiệm tiếp nhận. Trường jobPositionIds còn trong DTO/history intake nhưng không thay thế owner; tạo/import Module mới không cần chọn Job Position.
2. Đúng Expert được phân công chọn **Tiếp nhận chỉnh sửa**, xác nhận. Module ID giữ nguyên; dữ liệu Module và TEACHES được sao chụp đầy đủ, nội dung Markdown lấy từ nguồn import đi kèm.
3. Bản nháp mở trong editor hiện có. Expert kiểm tra, sửa hoặc tạo phiên bản nội dung qua editor có các lesson Text/Video rồi gửi duyệt. Nội dung nguồn là tài liệu chờ chuyên gia hoàn thiện, không tự chứng nhận chất lượng.
4. L&D xem lịch sử và nội dung, trả lại với phản hồi hoặc duyệt phát hành. Chỉ phát hành mới thay đổi graph.

## Quy tắc

- Không giả mạo tác giả: `createdBy=null` cho module/content import; UI ghi chưa xác định người tạo gốc. `createdAt` là thời điểm tạo hồ sơ tiếp nhận trong hệ thống, không phải thời điểm sáng tác. Người phân công/tiếp nhận và thời gian được ghi riêng.
- Lưu source snapshot thực và endpoint Skill, knowledgeLevel/skillVersion/outcomeCodes nếu có; không khẳng định danh sách field cũ 13/8 là schema hiện tại. Giữ metadata review gốc; null có ý nghĩa unknown/unreviewed. Bản nháp đặt lifecycle/review lại và giữ ID/version gốc; bản nguồn không thay đổi.
- Module có một responsible Expert; peer Expert chỉ đọc. Chỉ assigned Expert được acceptIntake; không suy quyền chỉnh sửa từ same-Skill hoặc Job Position grant. Dữ liệu tag intake cũ giữ trong history.
- Chỉ một organization có thể tiếp nhận một ID toàn cục. Khóa identity và ràng buộc PK ngăn duplicate/concurrent claim. Không ghi đè hồ sơ tồn tại.
- L&D có thể cập nhật phân công chưa tiếp nhận, với optimistic token `expectedAssignedAt`; lưu các lần phân công trong history. Cập nhật cũng làm mới source snapshot khi catalog đổi.
- Thiếu nguồn nội dung, path không thuộc allowlist, package không hợp lệ hoặc graph đổi từ lúc phân công: chặn tiếp nhận, không ghi content/document một phần. Không tải URL bên ngoài hoặc đọc đường dẫn tùy ý.
- Tiếp nhận không tạo released revision, không đổi graph hoặc learner pins, không tự approve. Module import không được hard-delete; khi đã phát hành, dùng luồng yêu cầu/duyệt lưu trữ và kiểm tra độ phủ kỹ năng.
- Khi phát hành lần đầu, kiểm tra source chưa bị thay đổi; transaction Neo4j kiểm tra lại snapshot dưới node lock. Retry chấp nhận graph đã khớp chính xác projection để xử lý lỗi xác nhận chéo store. Drift không được tự ghi đè.
- UI tách Chưa tiếp nhận / Chờ Expert tiếp nhận / Bản nháp / Đã gửi duyệt / Đã phát hành; review metadata Chưa được duyệt không đồng nghĩa đã gửi L&D.

## API

`POST /api/v1/module-management/catalog-modules/{id}/assignment` — L&D, `{jobPositionIds, expectedAssignedAt, expertId}`; trả201.

`POST /api/v1/module-management/catalog-modules/{id}/accept` — đúng assigned Expert; trả201 Document.

CatalogItem có `intake` theo scope; Document có nullable `intake`. Các action/version token hiện hữu được giữ nguyên.
