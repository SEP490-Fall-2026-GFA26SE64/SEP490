# Kiểm duyệt catalog trước khi tạo bộ hồ sơ cuối

Đây là checklist trống, không phải chứng nhận chất lượng. Dùng ít nhất hai chuyên gia thật trong phạm vi chuyên môn phù hợp. Không yêu cầu viết giáo trình đầy đủ. Ghi nhận nếu chuyên gia đồng thời tham gia biên soạn để công khai nguy cơ thiên lệch.

## Các điều kiện cần kiểm tra

1. Phạm vi full-stack đủ cụ thể; nhóm kỹ năng không chồng lấn khó phân biệt.
2. Junior/Middle/Senior khác nhau hợp lý; kiểm tra việc Junior có nền tảng CI/release và Senior vẫn giữ kiến thức nền tảng tường minh.
3. Hai outcomes mỗi cặp skill–knowledge có thể hiểu và phân biệt được; không chỉ là thay động từ trên cùng một câu.
4. Mỗi module thể hiện rõ phạm vi bao gồm/loại trừ và mức kiến thức; không cần bài học thật.
5. Các lựa chọn thay thế khác bối cảnh nhưng đủ mục tiêu; không coi cùng binding là bằng chứng relevance cho mọi hồ sơ.
6. Mỗi prerequisite có lý do cần thiết trong ngữ cảnh, đúng hướng, đúng mức. Xem cả những nhóm hiện không có prerequisite; thiếu cạnh cũng có thể là thiếu sót.
7. Không đồng nhất role level với knowledge level, completion với achievement hoặc baseline pass với official evidence.
8. Văn bản dùng cho CBF có ý nghĩa và không chứa mã/nhãn đáp án; bản trình bày cho người chấm relevance phải ẩn binding và xáo thứ tự.

## Ghi nhận

review-items.json cung cấp danh sách đối tượng cần rà soát. Mỗi hàng có objectType/objectId, decision=null, reviewerId=null, reviewedAt=null và comment=null. Không điền thay chuyên gia. Lưu bản trả lời độc lập trong thư mục review riêng theo reviewer/version; giữ nguyên file template. Quyết định gồm ACCEPT, REVISE hoặc OUT_OF_EXPERTISE; mọi chỉnh sửa nội dung cần bản mới và kiểm tra lại.

Catalog review và nhãn relevance theo hồ sơ là hai công việc khác nhau. ACCEPT một module không tạo ra nhãn grade=2 cho bất kỳ hồ sơ nào. Chỉ chấm relevance sau khi đã có hồ sơ và nhu cầu cụ thể theo protocol.

## Trước bước tiếp theo

- Catalog đã được rà và các vấn đề bắt buộc đã xử lý.
- Kiểm tra cấu trúc chạy lại trên đúng phiên bản được duyệt.
- Chốt nhu cầu module-based và ý nghĩa đầu vào cho adapter hiện tại.
- Chọn quy trình pilot 5–10 hồ sơ; chưa tạo/chấm gold50 để điều chỉnh catalog.
- Chỉ khóa phiên bản cuối và tạo bộ 500 khi nhóm xác nhận sẵn sàng. Không coi sự tồn tại của 72 thẻ là expert approval.
