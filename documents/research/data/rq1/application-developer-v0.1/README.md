# Catalog benchmark Application Developer v0.1

Ngày 23/11/2026. **Đã xây dựng dữ liệu và kiểm tra cấu trúc; đang chờ chuyên gia kiểm duyệt.** Chưa khóa catalog, chưa tạo hồ sơ synthetic, chưa gắn nhãn relevance và chưa chạy RQ1. Catalog tách biệt với ứng dụng; không phải gói import vào database.

## Phạm vi và số lượng

- Một role Application Developer, chuyên biệt web full-stack; Junior / Middle / Senior.
- 20 kỹ năng tái sử dụng mã và định nghĩa từ seed, với phiên bản research riêng và outcome mới cụ thể theo từng nhóm kiến thức.
- 60 cặp skill–knowledge, 2 outcomes mỗi cặp; 72 đặc tả module tiếng Anh.
- 48 cặp có 1 module, 12 cặp có 2 module. Bốn kỹ năng có lựa chọn thay thế ở cả ba mức: API contracts, unit testing, asynchronous browser requests, transactions. Không coi số lượng module là tính mới hay bằng chứng hiệu quả.
- 58 hàng yêu cầu role–skill: Junior 18 kỹ năng/18 nhóm kiến thức, Middle 20/37, Senior 20/49. Một kỹ năng có thể yêu cầu nhiều nhóm kiến thức độc lập.
- 31 quan hệ prerequisite có hướng, nêu rõ nhóm kiến thức hai đầu và lý do. Đây là đề xuất thứ tự học cục bộ, chưa được chuyên gia công nhận.

72 là kích thước khởi đầu để bao phủ 20 kỹ năng ở ba mức và có một số lựa chọn thay thế; chưa phải kích thước được chứng minh tối ưu. Pilot chuyên gia sẽ quyết định có cần điều chỉnh độ đa dạng và công sức gắn nhãn. Không thay đổi catalog theo kết quả thắng/thua của thuật toán trên tập cuối.

## Đọc file nào

1. [COMPETENCY_MATRIX.md](COMPETENCY_MATRIX.md): ma trận ba cấp và outcomes cụ thể.
2. [MODULE_CARDS.md](MODULE_CARDS.md): 72 thẻ đặc tả để rà nội dung. Mã module là mã băm ổn định, không chứa mã skill/knowledge đáp án. Thứ tự hiện là thứ tự biên soạn, chưa phải giao diện chấm mù; khi gắn nhãn cần xáo trộn với seed và không đưa teaching-bindings cho người chấm.
3. [PREREQUISITES.md](PREREQUISITES.md): bảng 31 quan hệ tiên quyết và lý do.
4. [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md): điều kiện chuyên gia cần kiểm tra trước khi cố định bộ chuẩn.
5. [CHANGE_RATIONALE.md](CHANGE_RATIONALE.md): thay đổi so với catalog cũ và giới hạn tương thích.

| File máy đọc | Vai trò |
|---|---|
| role.json | Phạm vi và mô tả trách nhiệm ba cấp; ordinal research đi từ Junior 1 đến Senior 3, không sao chép rank ứng dụng |
| skills.json | Mã, định nghĩa, nhóm năng lực, outcomes, phạm vi loại trừ và nguồn |
| requirements.json | Các tập knowledge bắt buộc từng cấp; không suy ra achievement bằng quan hệ cao/thấp |
| modules.json | Đặc tả module: mô tả, outcomes, included/excluded scope và tình trạng giả lập |
| teaching-bindings.json | Ánh xạ module tới đúng skill/version/knowledge/outcomes; đầu vào cấu trúc của Graph, không phải nhãn relevance |
| prerequisites.json | Đồ thị tiên quyết có hướng dependent → prerequisite; không tự mở rộng nhu cầu ban đầu |
| sources.json | Nguồn requirement, danh mục cũ và nguồn tham khảo kỹ thuật; phạm vi sử dụng mỗi nguồn |
| legacy-requirements.json | Trích yêu cầu cũ để so sánh, không chứa danh tính người duyệt seed |
| change-log.json | Từng hàng được giữ, thay đổi hoặc bổ sung và lý do |
| review-items.json | Phiếu kiểm duyệt trống theo từng skill, requirement, prerequisite và module; không phải kết quả chuyên gia |
| manifest.json | Số lượng, phiên bản, nguồn/generator hash và checksum hiện vật |

## Cách sử dụng cho RQ1

Module là **dummy learning module có đặc tả**, không phải giáo trình hay khóa học thực tế. Không có video, bài giảng đầy đủ, thời lượng đo thực tế hoặc giá giả. Giá và thời lượng giữ null; không đưa chúng vào xếp hạng RQ1.

`benchmarkAvailability=CANDIDATE` mô tả khả năng dùng trong bộ benchmark sau khi thông qua review. Nó không có nghĩa đã được publish trong ứng dụng. `applicationPublicationState=null`; mọi `reviewedBy/reviewedAt=null`. Chỉ khi có quyết định chuyên gia thật mới tạo phiên bản được duyệt/khóa; không tự đổi metadata cho đẹp.

CBF chỉ dùng title, description, learningOutcomes và knowledgeLevel theo protocol; không dùng sourceIds, module IDs, binding, review metadata hay excludedScope như một mẹo tăng điểm. Graph dùng requirements và bindings. Hai bên dùng cùng tập ứng viên. Tất cả module đều hợp lệ về chủ đề của catalog; một module chỉ trở thành không phù hợp đối với nhu cầu của một hồ sơ cụ thể. Không gắn sẵn nhãn positive/negative trong catalog.

Khả năng chuyển từ nhóm lựa chọn của engine sang top 5 vẫn cần adapter và kiểm tra parity. Bộ này không chứng minh Graph mạnh hơn CBF, không chứng minh prerequisite traversal cải thiện initial ranking và không chứa golden labels. Một module có đủ hai outcomes mục tiêu là quy ước bộ này, không sửa quy tắc chung nhiều skill của Version 3.

## Dựng và kiểm tra

Từ repository root, dùng Python đã cấu hình trong môi trường:

```sh
python documents/research/tools/build_application_developer_catalog.py
python documents/research/tools/validate_application_developer_catalog.py
```

Builder chỉ ghi lại phiên bản draft hiện tại, không đụng database, không tạo profiles. Không chạy builder sau khi ghi review thật: tạo phiên bản mới trước khi thay đổi. Bản đóng băng được bảo vệ bằng manifest; những phiếu đánh giá thật nên lưu riêng theo hướng dẫn kiểm duyệt.
