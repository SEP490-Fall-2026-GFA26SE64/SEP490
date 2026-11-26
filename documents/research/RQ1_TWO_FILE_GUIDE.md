# RQ1: nộp hai file cùng hồ sơ và baseline

> Bước 2 nhận một trong hai loại file:
> - **Phiếu đồng thuận Top 5** [RQ1_Golden_Set_50_Dong_Thuan.xlsx](RQ1_Golden_Set_50_Dong_Thuan.xlsx) (sheet `Golden Set 50`): cho ra kết quả RQ1 hiện tại, 48/50 so với 41/50.
> - **Phiếu chấm đầy đủ 0/1/2:** dùng để tính Recall/nDCG khi đã có nhãn thật, theo hướng dẫn bên dưới.
>
> Chạy lại không cần giao diện bằng `node documents/research/tools/run_rq1_shortlist_agreement.mjs`.

Luồng này là công cụ benchmark offline trên catalog research. Nó không ghi kết quả vào hồ sơ người học thật, không gọi Neo4j để sinh pathway ứng dụng, và không thay thế quy trình đánh giá chuyên gia độc lập.

## Cách dùng

1. Nộp File 1 chứa 50 hồ sơ golden cùng kết quả baseline. Có thể dùng `RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx` hiện tại hoặc `data/rq1/profiles-v0.1/gold50-profiles.jsonl`.
2. Hệ thống xác định nhu cầu học và tạo G0/C0 từ cùng catalog. Bằng chứng phải đúng phiên bản; nhóm chưa có bằng chứng chính thức phải có baseline PASSED/FAILED. Hồ sơ thiếu, trùng, mâu thuẫn hoặc sai phiên bản bị từ chối, không tự suy đoán miễn học.
3. Chọn **Tải mẫu chuyên gia trống từ Bước 1**. File tải về là `RQ1_Expert_Evaluation_Blank.xlsx` và chứa đúng hồ sơ/baseline vừa nạp.
4. Chuyên gia đánh giá độc lập từng hồ sơ với toàn bộ 72 module trong sheet `Module_Reference`. Không dùng gợi ý G0/C0 hay mapping làm đáp án chuyên gia.
5. Điền mỗi Module ID vào đúng một cột `Grade 0 Module IDs`, `Grade 1 Module IDs` hoặc `Grade 2 Module IDs`, phân tách bằng dấu phẩy. Grade 0: không phù hợp; 1: bổ trợ; 2: phù hợp trực tiếp. Không liệt kê một module nghĩa là **chưa chấm**, không phải Grade 0.
6. Sau khi có đánh giá chuyên gia thật, điền `HUMAN_EXPERT` vào `Evaluation Source`. Trường này là khai báo của người nộp, **không xác thực danh tính hay chứng minh tính độc lập của chuyên gia**. Giữ bằng chứng reviewer/adjudication theo [hướng dẫn chuyên gia](EXPERT_ANNOTATION_GUIDE.md).
7. Nộp file đã điền ở Bước 2. Hệ thống kiểm tra cùng tập hồ sơ, cùng baseline và dấu nội dung catalog trước khi tính HR@5, Precision@5, Recall@5 và nDCG@5.

## Các sheet và trường cần giữ nguyên

- `Expert_Evaluations`: một dòng mỗi hồ sơ. `Profile JSON Snapshot` là hồ sơ và baseline có cấu trúc dùng để đối chiếu; giữ nguyên. `Role Level` và `Gap Count` là thông tin đọc nhanh, không thay thế snapshot.
- `Catalog Stamp`: dấu nội dung catalog đã dùng ở Bước 1, bao gồm phiên bản và nội dung catalog; giữ nguyên. Đây là kiểm tra tái lập, không phải chữ ký bảo mật.
- `Module_Reference`: nội dung module để chuyên gia đọc, không có gợi ý đáp án theo hồ sơ.
- `Instructions`: hướng dẫn điền. Các nhãn và xác nhận nguồn đều để trống khi tải mẫu; không tự tạo tên chuyên gia hoặc thời điểm chấm.

Nếu cần thay đổi baseline, sửa nguồn File 1, nộp lại Bước 1 và tạo lại mẫu chuyên gia. Bảng kết quả cũ bị xóa khi nộp file mới; file lỗi không giữ lại kết quả chấm cũ như thể đó là kết quả của file vừa nộp.

## Điều kiện tính điểm

Phiên bản này thực thi phương án **chấm đầy đủ catalog** của protocol. Mỗi module phải có đúng một nhãn 0/1/2 cho mỗi hồ sơ; thiếu hoặc thừa Module ID, nhãn mâu thuẫn, hồ sơ thiếu/thừa đều dừng tính điểm cho lượt nộp. Không xuất Recall/nDCG từ nhãn chưa đầy đủ, không âm thầm bỏ hồ sơ lỗi.

Hồ sơ không có Grade 2 nằm ngoài tập positive-query của phép so sánh chính. Hệ thống báo rõ Recall không áp dụng và yêu cầu báo cáo riêng; không tự gán Recall/nDCG bằng 0 hoặc tự loại hồ sơ để làm đẹp điểm. Giao diện hiện chưa cung cấp báo cáo robustness riêng này.

File `RQ1_Input_2_50_Golden_Expert_Evaluation.xlsx` cũ và cột module khớp trong file tổng quan **không được chấp nhận làm phiếu chuẩn mới**. File `RQ1_Input_2` được giữ trong thư mục này để test kiểm tra rằng hệ thống từ chối nó; đây không phải bằng chứng đã có chuyên gia chấm. Các bản sao trong `frontend/public/fixtures/rq1-samples/` (`RQ1_Input_2_...xlsx`, `gold50-expert-evaluation.jsonl`) đã bị xoá ngày 25/11/2026 vì không được dùng và dễ gây nhầm. Hãy tải mẫu mới từ Bước 1; không chuyển nhãn minh họa thành nhãn chuyên gia bằng cách đổi tên trường.

## JSON/JSONL tương đương

Mỗi record gồm `profileId`, `inputProfile` (hồ sơ/baseline đầy đủ như File 1), `catalogStamp`, `evaluationSource`, `grade0ModuleIds`, `grade1ModuleIds`, `grade2ModuleIds` và `reviewerNote` tùy chọn. Ba danh sách nhãn chứa Module ID; hợp của chúng phải đúng toàn bộ catalog và không giao nhau. Không còn nhận danh sách module ứng viên hoặc reviewer rows thiếu thông tin như một phiếu hoàn chỉnh.

## Giới hạn

Đây là sửa tính toàn vẹn đầu vào và chấm điểm, không phải xác nhận kết quả nghiên cứu. Việc khóa thuật toán, đánh giá độc lập, adjudication và phân tích thống kê vẫn theo [protocol RQ1](RQ1_RECOMMENDATION_RELEVANCE_EXPERIMENT_1.md). Các nhãn dùng trong unit/Playwright chỉ là test doubles, không được đưa vào kết quả bài báo.
