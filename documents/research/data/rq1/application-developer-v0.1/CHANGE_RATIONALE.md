# Lý do thay đổi và nguồn

## Đối chiếu với seed hiện tại

Giữ 14 định danh kỹ năng đang thuộc Application Developer và bổ sung 6 kỹ năng có sẵn ở danh mục toàn hệ thống: CORE04 (release), FS01 (interaction), FS02 (accessibility), FS09 (responsive), FS10 (HTML), FS11 (asynchronous requests). Không phát minh mã skill trùng với hệ thống; phiên bản research khác phiên bản seed. Phần bổ sung làm rõ phạm vi full-stack người dùng đã chọn. Đây là lựa chọn nghiên cứu cục bộ chờ review, không tuyên bố khung nghề chính thức.

Các outcomes cũ dạng “Explain/Apply/Evaluate [skill name]” được thay bằng hành vi có đối tượng và ranh giới cụ thể. Mỗi nhóm kiến thức có hai outcomes. Junior cần 18 kỹ năng nền tảng; code review và refactoring là yêu cầu độc lập từ Middle. Middle cần ứng dụng độc lập; Senior thêm đánh giá trade-off ở 12 kỹ năng, giữ mức đủ dùng ở phần còn lại. Các nhóm kiến thức F/I/A được yêu cầu tường minh, không tự công nhận nhóm thấp hơn khi đạt nhóm cao hơn. [change-log.json](change-log.json) lưu từng khác biệt; [legacy-requirements.json](legacy-requirements.json) giữ yêu cầu gốc.

Module mới dùng namespace RQM và ID băm ổn định; không sửa hoặc tái sử dụng nhầm module/revision đang có lịch sử. Đặc tả mới không kế thừa trạng thái APPROVED, người duyệt, thời gian hoặc các giá/thời lượng seed. Một module nhắm một cặp skill–knowledge để giữ độ rõ cho benchmark đầu tiên; khả năng nhiều skill của hệ thống không bị thay đổi. Chưa có adapter chứng minh tương thích API/import, nên không dùng JSON này làm seed sản phẩm.

31 prerequisite được biên soạn riêng, có lý do và nhóm kiến thức hai đầu. Không chép các quan hệ cũ không có mức kiến thức vào bộ mới một cách ngầm định. Quan hệ thứ tự học không phải quan hệ nghề nghiệp chính thức, không tự thêm prerequisite vào nhu cầu sau baseline và không chứng minh đó là nguyên nhân tạo ra hiệu quả học tập.

## Nguồn và giới hạn

Các nguồn đã xem ngày 23/11/2026:

- [Version 3 trích đoạn](../../../sources/version-3/research-scope-extract.md): cho phép benchmark synthetic, loại trừ giáo trình chi tiết; quy định knowledge-level/outcome và baseline.
- [UK Government software developer](https://understand-digital-data-roles-skills.service.gov.uk/role/software-developer/): tham khảo phạm vi vai trò và tiến triển trách nhiệm. Các cấp và tập yêu cầu của bộ này là đề xuất riêng, không phải bản sao hoặc tương đương được chứng nhận.
- [MDN Curriculum](https://developer.mozilla.org/en-US/curriculum/): tham khảo các chủ đề frontend. Nguồn tập trung nền tảng; mức Intermediate/Advanced ở đây là thiết kế cục bộ cần kiểm duyệt.
- [OWASP ASVS](https://asvs.owasp.org/): tham khảo phạm vi kiểm soát bảo mật; không tuyên bố đạt ASVS hoặc ánh xạ toàn bộ chuẩn.
- [PostgreSQL transaction tutorial](https://www.postgresql.org/docs/current/tutorial-transactions.html): đối chiếu khái niệm transaction. Không buộc người học dùng PostgreSQL.
- [GitHub Actions concepts](https://docs.github.com/en/actions/get-started/understand-github-actions): đối chiếu khái niệm CI. Không buộc benchmark dùng một nền tảng CI cụ thể.

Các trang web có thể thay đổi; sources.json ghi URL và phạm vi đã dùng. Bộ này không sao chép bài học từ nguồn ngoài. Trước khi phát hành dữ liệu nghiên cứu cuối, bổ sung ngày/version hoặc bản lưu được phép theo quy định tái lập của nhóm. Mức độ hợp lý của outcomes, mức kiến thức và prerequisite phải được đánh giá độc lập; danh sách nguồn không thay cho kiểm duyệt.

## Giới hạn thực nghiệm

48/60 cặp chỉ có một lựa chọn, nên không diễn giải kết quả thành chất lượng xếp hạng nhiều lựa chọn trên mọi kỹ năng. 12 cặp có hai lựa chọn nhằm thử tính tương đương theo mục tiêu trong bối cảnh khác, không có nhãn gold mặc định. HR@5 có thể bão hòa; cần xem Precision@5 và mức phủ nhãn theo protocol. Không thiết kế module gây nhiễu bằng văn bản vô nghĩa hoặc nhét mã skill vào mô tả CBF.

Outcomes của module hiện dùng cùng diễn đạt với outcomes kỹ năng để giữ traceability. Điều này có thể làm nhiệm vụ text matching dễ hơn nếu query cũng chứa nguyên câu outcome. Pilot cần báo cáo mức trùng văn bản và input query thực tế; không diễn giải benchmark thành khả năng hiểu ngữ nghĩa tổng quát, không chỉnh văn bản dựa trên kết quả gold50.
