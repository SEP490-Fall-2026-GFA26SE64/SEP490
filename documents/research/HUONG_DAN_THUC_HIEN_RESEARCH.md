# Hướng dẫn thực hiện research

Cập nhật 23/11/2026. Đây là điểm bắt đầu cho cả nhóm. Mục tiêu là hoàn thiện khung nghiên cứu và pilot trong một tuần, sau đó mới khóa thiết kế và chạy chính thức. Bản Word và protocol bằng tiếng Anh; hướng dẫn này giải thích cách làm bằng tiếng Việt.

## 1 Đọc theo thứ tự

1. [README](README.md): trạng thái hiện tại và bản đồ tài liệu.
2. [Bản Word](Knowledge_Graph-Based_Adaptive_Learning_Pathways_for_Workforce_Competency_Development.docx) hoặc [nguồn Markdown của bản thảo](RESEARCH_FRAMEWORK.md): vấn đề, đóng góp, phương pháp, ba RQ và giới hạn.
3. [Nghiên cứu liên quan](RELATED_WORK.md): nguồn học thuật, mức độ đã đọc và điểm cần bổ sung trước công bố.
4. Protocol [RQ1](RQ1_RECOMMENDATION_RELEVANCE_EXPERIMENT_1.md), [RQ2](RQ2_GRAPH_LATENCY_EXPERIMENT_2.md), [RQ3](RQ3_PATHWAY_EFFICIENCY_EXPERIMENT_3.md).
5. [Hướng dẫn chuyên gia](EXPERT_ANNOTATION_GUIDE.md), [kế hoạch pilot](PILOT_PLAN.md) và [quy định dữ liệu](DATA_AND_REPRODUCIBILITY.md).

## 2 Những gì đã chốt

- Nghiên cứu thiết kế và đánh giá một phương pháp/hệ thống, phục vụ Capstone và hướng tới bản thảo công bố; chưa khẳng định thuật toán mới.
- Vấn đề: chọn nội dung phù hợp với khoảng trống năng lực và điều chỉnh lộ trình theo bằng chứng mới.
- Trường hợp nghiên cứu: Application Developer, Junior/Middle/Senior. Không suy rộng kết quả sang AI/IoT chỉ vì chuyên gia có kiến thức ở các lĩnh vực đó.
- Dùng engine quy tắc/bằng chứng hiện tại, không tự gọi là BKT hoặc bộ tối ưu toàn cục. Giữ nguyên câu chữ RQ đã đăng ký và giải thích giới hạn trong methodology.
- RQ1: 500 hồ sơ synthetic, chia 450 development và 50 kiểm thử; lấy 5–10 hồ sơ pilot từ 450. Hai chuyên gia thật đánh giá độc lập, nhãn 0/1/2; đo công sức pilot trước khi chốt phạm vi gắn nhãn chính thức.
- RQ2: tạo graph synthetic riêng 1k/5k/10k thật, đo đường prerequisite có hướng giữa các skill, shortest distance 3–5 hops. Không đổi/xóa graph ứng dụng.
- RQ3: 100 học viên mô phỏng, cùng mô hình học và ngân sách hoạt động cho static/adaptive; đo khoảng cách đến hồ sơ năng lực chính thức. Mô hình xác suất phụ thuộc kiến thức và quá trình học, không ưu ái adaptive.

## 3 Tình trạng hiện tại

| Phần | Đã có | Chưa có |
|---|---|---|
| Khung nghiên cứu | Khung và protocol RQ1 v0.2; các protocol còn lại giữ thiết kế hiện hành | Tổng quan tài liệu đầy đủ cho công bố, duyệt cuối của giảng viên |
| RQ1 | Thiết kế, rubric, catalog draft và bộ 500 hồ sơ đã chia 450/50 | Chuyên gia duyệt catalog/hồ sơ, nhãn thật, adapter và kết quả chính thức |
| RQ2 | UI/API/bộ đo cũ; audit chạy thật đã lưu | Sửa bộ đo, ba graph research thật, fixture đã xác minh, kết quả đúng protocol |
| RQ3 | Thiết kế so sánh và mô hình mô phỏng đề xuất | Giải quyết khác biệt policy, simulator, trace parity và kết quả |

Đã xây catalog và 500 hồ sơ benchmark riêng; chưa sửa code ứng dụng hay chạy thực nghiệm gợi ý. Các kết quả RQ2 cũ bị trộn số đo và giả định nên không được dùng để khẳng định scalability.

## 4 Làm gì trước

**Bước 1:** đưa khung nghiên cứu cho giảng viên, tập trung vào đóng góp, ba RQ và giới hạn Knowledge Tracing. Không đổi câu chữ RQ đã đăng ký khi chưa có quyết định phù hợp.

**Bước 2:** cùng chuyên gia rà catalog Application Developer: yêu cầu từng Level, prerequisite, đặc tả module, learning outcomes và khả năng đánh giá độ phù hợp; không cần bài học đầy đủ theo Version 3. Ghi lỗi dữ liệu thật; không lấy metadata APPROVED trong seed thay cho đánh giá chuyên môn.

**Bước 3:** làm 5–10 hồ sơ pilot, đo thời gian gắn nhãn và bất đồng. Sau đó chốt đánh giá toàn catalog hay phương án nhãn hạn chế có kiểm soát. Module chưa chấm không phải module sai. Không dùng 50 hồ sơ cuối để chỉnh thuật toán.

**Bước 4:** chuẩn bị bản triển khai sửa RQ2 theo backlog đã nêu, tận dụng UI/API hiện có. Trước khi chạy cần có graph research riêng, kiểm tra số node thật và shortest distance thật. Các số 5k/10k trong request không phải bằng chứng graph đã lớn tương ứng.

**Bước 5:** đối chiếu trạng thái ASSESSED_SATISFIED giữa code và nghiệp vụ; thống nhất trước khi khóa engine RQ3. Bước được giải quyết không đồng nghĩa đã có achievement chính thức. Chuyên gia rà giả định mô phỏng và các mức thử độ nhạy.

**Bước 6:** chạy pilot, ghi raw results, tính lại metric và kiểm tra các điều kiện P1–P7 trong [kế hoạch](PILOT_PLAN.md). Mới chuyển sang final khi những điều kiện liên quan đã đạt.

## 5 Lưu mọi thứ ở đâu

Tất cả tài liệu và hiện vật research nằm trong thư mục này. Thư mục dữ liệu đã có catalog benchmark draft; thư mục kết quả chưa có thực nghiệm chính thức. Đã có 500 hồ sơ; chưa có nhãn chuyên gia.

| Nội dung | Nơi lưu khi có dữ liệu thật |
|---|---|
| Catalog, profiles, split, nhãn độc lập và nhãn thống nhất RQ1 | `data/rq1/<version>/` |
| Graph manifest và fixture từng quy mô/seed | `data/rq2/<version>/<scale>/<seed>/` |
| Hồ sơ, policy và cấu hình learner model RQ3 | `data/rq3/<version>/` |
| Raw output, manifest, metric và báo cáo mỗi lần chạy | `results/<rq>/<run-id>/` |
| Kết quả kiểm tra bộ RQ2 hiện tại | [evidence/rq2/20261122-current-service-audit](evidence/rq2/20261122-current-service-audit/RESULTS.md) |
| Mẫu manifest và annotation chưa điền | [templates](templates/README.md) |
| Bản thảo bài báo tổng hợp kết quả RQ1, RQ2, RQ3 | [RESEARCH_MANUSCRIPT.md](RESEARCH_MANUSCRIPT.md) / [RESEARCH_MANUSCRIPT.docx](RESEARCH_MANUSCRIPT.docx) |

Không ghi đè lần chạy cũ. Không lưu mật khẩu, thông tin nhân viên hoặc danh tính chuyên gia chưa được phép công bố. Application code vẫn sửa ở backend/frontend đúng kiến trúc; bản research lưu tham chiếu commit/hash, không nhân bản hệ thống vào thư mục này.

## 6 Phân biệt ba loại kết quả

- **Diagnostic audit:** kiểm tra bộ hiện tại có đo đúng không. Audit RQ2 ngày22/11 thuộc loại này; đã phát hiện lỗi, không phải kết quả scalability.
- **Pilot:** thử quy trình/dữ liệu/tham số; được dùng để sửa thiết kế trước khi khóa.
- **Final experiment:** chạy đúng protocol đã khóa, dữ liệu độc lập, lưu đủ bằng chứng; có thể cho kết quả Graph/Adaptive tốt hơn, bằng hoặc kém hơn.

Không đổi tên pilot thành final sau khi đã chỉnh tham số từ kết quả. Không tạo trước con số HR/P95/Distance hoặc viết kết luận thắng khi chưa đo. RQ2 không chứng minh Neo4j hơn SQL vì không có đối chứng SQL; RQ3 không chứng minh nhân viên thật học nhanh hơn vì chưa có nghiên cứu thực địa.

## 7 Mốc hoàn thành và bước tiếp theo

Đầu ra tuần chuẩn bị: khung + protocol + catalog/pilot review + bằng chứng pilot và danh sách blocker. Mốc này khác với hoàn tất ba RQ. Các tham số số trong protocol v0.1 là **đề xuất**, phải khóa sau pilot, không phải quyết định thực nghiệm đã xác nhận.

Việc tiếp theo nên thực hiện là review tài liệu với nhóm/giảng viên, rà catalog với chuyên gia và lập bản triển khai cụ thể cho sửa RQ2. Không cần mở rộng RQ2 sang benchmark mới trước khi sửa đúng phép đo đã đăng ký.

## 8 Cập nhật bản Word

[RESEARCH_FRAMEWORK.md](RESEARCH_FRAMEWORK.md) là nguồn nội dung để đồng bộ bản Word. Nếu sửa trực tiếp Word, phải đối chiếu lại nguồn trước lần dựng tiếp theo để tránh mất sửa đổi. Công cụ dựng tài liệu ở [tools/build_research_doc.py](tools/build_research_doc.py); nó không chạy benchmark. Kiểm tra lại trang Word sau mọi thay đổi bố cục. File `.docx` và `.log` đang bị quy tắc Git gốc bỏ qua; file Word vẫn tồn tại tại đây. Việc đưa Word vào commit cần xử lý riêng khi nhóm chủ động commit, không tự thay `.gitignore` hoặc commit trong tác vụ này.

## Catalog hiện tại

Bắt đầu rà soát từ [bộ Application Developer v0.1](data/rq1/application-developer-v0.1/README.md): 20 kỹ năng, 72 module giả lập có đặc tả, 31 quan hệ tiên quyết. Bản này đã qua kiểm tra cấu trúc, chưa qua chuyên gia và chưa khóa. Đọc ma trận năng lực, thẻ module rồi checklist review. Bộ hồ sơ đã được tạo dưới dạng draft theo yêu cầu mới, không đồng nghĩa catalog đã được duyệt.

## Bộ hồ sơ đã tạo

Mở [hướng dẫn profiles-v0.1](data/rq1/profiles-v0.1/README.md). Dùng 450 development và pilot10 để kiểm tra quy trình; giữ 50 gold inputs cho đánh giá cuối. Phiếu hai chuyên gia và phiếu thống nhất còn trống. Chưa có thuật toán nào được chạy để chọn hồ sơ hoặc tạo đáp án.
