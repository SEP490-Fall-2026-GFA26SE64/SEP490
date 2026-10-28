# Tiếp nhận module từ danh mục Neo4j

REQ-013-F01/F02 và REQ-053-F01–F04. User approved option A on 2026-10-28.

## Quy trình

1. L&D mở Modules, chọn **Phân công tiếp nhận**, chọn một hoặc nhiều Occupation. Phân công Expert → Occupation tại Content Approval vẫn là điều kiện quyền.
2. Expert có quyền ở ít nhất một occupation phụ trách chọn **Tiếp nhận chỉnh sửa**, xác nhận. Module ID giữ nguyên; dữ liệu Module và TEACHES được sao chụp đầy đủ, nội dung Markdown lấy từ nguồn import đi kèm.
3. Bản nháp mở trong editor hiện có. Expert kiểm tra, sửa hoặc tạo phiên bản nội dung qua Content Studio rồi gửi duyệt. Nội dung nguồn là tài liệu chờ chuyên gia hoàn thiện, không tự chứng nhận chất lượng.
4. L&D xem lịch sử và nội dung, trả lại với phản hồi hoặc duyệt phát hành. Chỉ phát hành mới thay đổi graph.

## Quy tắc

- Không giả mạo tác giả: `createdBy=null` cho module/content import; UI ghi chưa xác định người tạo gốc. `createdAt` là thời điểm tạo hồ sơ tiếp nhận trong hệ thống, không phải thời điểm sáng tác. Người phân công/tiếp nhận và thời gian được ghi riêng.
- Lưu toàn bộ 13 property Module, 8 property TEACHES và endpoint skill trong source snapshot, kể cả metadata review gốc; null có ý nghĩa unknown/unreviewed. Bản nháp đặt lifecycle/review lại và giữ ID/version gốc; bản nguồn không thay đổi.
- Một module có nhiều occupation; có grant ở bất kỳ occupation nào cho phép tiếp nhận/chỉnh sửa; không suy ra quyền từ skill. Membership được cố định sau tiếp nhận.
- Chỉ một organization có thể tiếp nhận một ID toàn cục. Khóa identity và ràng buộc PK ngăn duplicate/concurrent claim. Không ghi đè hồ sơ tồn tại.
- L&D có thể cập nhật phân công chưa tiếp nhận, với optimistic token `expectedAssignedAt`; lưu các lần phân công trong history. Cập nhật cũng làm mới source snapshot khi catalog đổi.
- Thiếu nguồn nội dung, path không thuộc allowlist, package không hợp lệ hoặc graph đổi từ lúc phân công: chặn tiếp nhận, không ghi content/document một phần. Không tải URL bên ngoài hoặc đọc đường dẫn tùy ý.
- Tiếp nhận không tạo released revision, không đổi graph hoặc learner pins, không tự approve. Module import không được hard-delete; khi đã phát hành, dùng luồng yêu cầu/duyệt lưu trữ và kiểm tra độ phủ kỹ năng.
- Khi phát hành lần đầu, kiểm tra source chưa bị thay đổi; transaction Neo4j kiểm tra lại snapshot dưới node lock. Retry chấp nhận graph đã khớp chính xác projection để xử lý lỗi xác nhận chéo store. Drift không được tự ghi đè.
- UI tách Chưa tiếp nhận / Chờ Expert tiếp nhận / Bản nháp / Đã gửi duyệt / Đã phát hành; review metadata Chưa được duyệt không đồng nghĩa đã gửi L&D.

## API

`POST /api/v1/module-management/catalog-modules/{id}/assignment` — L&D, `{occupationIds, expectedAssignedAt?}`; trả201.

`POST /api/v1/module-management/catalog-modules/{id}/accept` — Expert có scope; trả201 Document.

CatalogItem có `intake` theo scope; Document có nullable `intake`. Các action/version token hiện hữu được giữ nguyên.
