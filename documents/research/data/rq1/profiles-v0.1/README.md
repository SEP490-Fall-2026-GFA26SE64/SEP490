# Bộ 500 hồ sơ synthetic cho RQ1

Ngày 23/11/2026. **Đã tạo 500 hồ sơ draft: 450 development và 50 dành cho golden set. Nhóm 50 chưa có nhãn chuyên gia, chưa phải golden set đã kiểm chứng.** Người dùng cho phép chuẩn bị hồ sơ trên catalog draft; việc này không thay cho duyệt catalog hoặc khóa thiết kế trước thực nghiệm cuối.

## Phân chia

| Tập | Junior | Middle | Senior | Tổng |
|---|---:|---:|---:|---:|
| Development | 150 | 150 | 150 | 450 |
| Gold50 chờ gắn nhãn | 17 | 17 | 16 | 50 |

10 hồ sơ pilot nằm trong development450, không phải cộng thêm. Không có tên thật, email hay thông tin nhân sự. Mỗi hồ sơ mô tả một trạng thái người học giả lập ngay sau baseline, trước Expert review.

## Đọc và sử dụng file

- [PROFILE_INDEX.md](PROFILE_INDEX.md): bảng tra đủ 500 hồ sơ, cấp, số nhu cầu và nhóm bằng chứng.
- profiles.jsonl: toàn bộ 500 hồ sơ; mỗi dòng là một JSON độc lập.
- development450.jsonl: dữ liệu dùng phát triển; không dùng kết quả trên tập này làm đánh giá cuối.
- gold50-profiles.jsonl: 50 đầu vào đánh giá cuối, chưa có đáp án.
- [GOLD50_REVIEW_CARDS.md](GOLD50_REVIEW_CARDS.md): bản dễ đọc cho chuyên gia xem nhu cầu và bằng chứng giả lập.
- [PILOT10_REVIEW_CARDS.md](PILOT10_REVIEW_CARDS.md): 10 trường hợp pilot từ development.
- splits.json: danh sách ID cố định của ba nhóm.
- distribution.json: phân bố cấp, số nhu cầu và lịch sử bằng chứng.
- catalog-snapshot/: bản sao dữ liệu catalog dùng để tạo hồ sơ, có version/hash; không phụ thuộc việc catalog gốc thay đổi về sau.
- annotation/reviewer-A.template.jsonl và reviewer-B.template.jsonl: hai bộ phiếu trống độc lập, mỗi bộ 50 × 72 = 3.600 hàng. A/B là vị trí người chấm, chưa gán danh tính. Có đủ hàng để hỗ trợ chấm toàn catalog; đây không phải quyết định bắt buộc chấm hết trước khi pilot xác định công sức.
- annotation/adjudication.template.jsonl: 50 phiếu thống nhất đáp án còn trống; acceptedModuleIds và preferredTop5 là null, không phải danh sách rỗng nghĩa là không có module phù hợp.
- manifest.json: seed, cấu hình, nguồn, checksum và giới hạn nghiên cứu.

## Quy tắc tạo nhu cầu

Mọi yêu cầu dùng đúng skill/version/knowledge của catalog. Thành tích giả lập tương thích loại yêu cầu đó khỏi nhu cầu học ban đầu. Baseline pass cũng miễn học ban đầu nhưng không tạo achievement. Baseline fail khi chưa có thành tích tạo nhu cầu học. Các nhóm đã có thành tích không được gán thêm kết quả baseline mâu thuẫn. Không suy ra kiến thức thấp từ kiến thức cao và không tự mở rộng prerequisite chưa đánh giá.

Chỉ mô hình hóa các nhóm mục tiêu đã chọn, không có supplementary history. Đây là mô hình dữ liệu offline đã đối chiếu quy tắc nguồn, chưa chạy adapter để chứng minh parity với toàn bộ service thật. Evidence IDs bắt đầu SYN là giả lập, không phải khóa dữ liệu đã tồn tại trong ứng dụng. RoleLevelId RQL-AD-* là mã research, không dùng để import API.

## Thiết kế phân bố

Ba nhóm số nhu cầu: LOW 1–2, MEDIUM 3–5, HIGH 6–9. Mỗi nhóm có 150 development; gold có 18/17/15 tương ứng. Ba kiểu lịch sử: chỉ baseline; khoảng 35% nhóm ngoài nhu cầu có thành tích giả lập; khoảng 70% có thành tích. Phần còn lại ngoài nhu cầu là baseline pass. Tỷ lệ này là giả định tạo dữ liệu, không phải số liệu người học thật.

Seed 20261123. Hồ sơ được tạo theo cùng quy tắc cho cả hai tập, với thứ tự slot xáo trộn trước khi lấy mẫu. Không dựa vào kết quả thuật toán để chọn tập cuối. Không có hai hồ sơ cùng role level trùng tập nhu cầu; các tập nhu cầu có Jaccard từ 0.8 trở lên bị loại khi tạo. Bộ lọc chỉ kiểm tra tương đồng cấu trúc, không chứng minh độc lập ngữ nghĩa. Chia tập này đánh giá trong cùng phân bố synthetic, không chứng minh khả năng khái quát ra nhân viên thật.

Tất cả 500 hồ sơ có nhu cầu module-based dương. Không dùng tập này để khẳng định đã kiểm tra no-gap, certificate-only, thiếu module hoặc bằng chứng không tương thích; các ca robustness cần bộ riêng sau này. Có module được ánh xạ tới mọi nhu cầu không đồng nghĩa chuyên gia chắc chắn cho grade 2.

## Chuyển nhóm 50 thành golden set thật

1. Rà catalog và tính hợp lý của hồ sơ. Nếu sửa nội dung hoặc requirements, tạo phiên bản dữ liệu mới và giữ phiên bản này để truy vết.
2. Dùng pilot10 để thử rubric và đo công sức. Chốt phạm vi gắn nhãn và thuật toán trước khi lộ nhãn gold50 cho người phát triển.
3. Hai chuyên gia thật chấm độc lập. Không hiển thị teaching-bindings hoặc xếp hạng thuật toán. Phiếu chỉ có module IDs; dùng thẻ module tương ứng từ snapshot. Thứ tự phiếu đã xáo trộn theo từng hồ sơ; không dùng thứ tự biên soạn của module cards làm thứ hạng.
4. Giữ phiếu độc lập; ghi nhận bất đồng và quyết định thống nhất bằng danh tính/thời gian thật. Không coi module chưa chấm là grade 0, và không giới hạn relevance vào đúng năm module nếu còn lựa chọn tương đương.
5. Chỉ ghi goldStatus=VERIFIED trong phiên bản tiếp theo khi đủ bằng chứng và kiểm tra; không tự sửa template thành nhãn giả.

## Kiểm tra và tái lập

Dùng tools/validate_rq1_profiles.py từ thư mục research để kiểm tra số lượng, phiên bản, suy ra nhu cầu, chia tập, nhãn trống và checksum. Builder tools/build_rq1_profiles.py từ chối ghi đè thư mục đã tồn tại; dùng --output với thư mục mới khi tái lập. Không chỉnh file dữ liệu tại chỗ vì sẽ làm sai checksum. Các phiếu chuyên gia đã điền phải lưu riêng, giữ nguyên template.
