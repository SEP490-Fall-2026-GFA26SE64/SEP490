# Hướng dẫn thực hiện research

Cập nhật 25/11/2026. Đây là điểm bắt đầu cho cả nhóm. Cả ba RQ đã chạy ở mức pilot và có thể chạy lại; bước tiếp theo là chuyên gia rà soát rồi mới khóa thiết kế và chạy chính thức. Bản Word và protocol bằng tiếng Anh; hướng dẫn này giải thích cách làm bằng tiếng Việt.

## 1 Đọc theo thứ tự

1. [README](README.md): trạng thái hiện tại và bản đồ tài liệu.
2. [Bản Word](Knowledge_Graph-Based_Adaptive_Learning_Pathways_for_Workforce_Competency_Development.docx) hoặc [nguồn Markdown của bản thảo](RESEARCH_FRAMEWORK.md): vấn đề, đóng góp, phương pháp, ba RQ và giới hạn.
3. [Nghiên cứu liên quan](RELATED_WORK.md): nguồn học thuật, mức độ đã đọc và điểm cần bổ sung trước công bố.
4. Protocol [RQ1](RQ1_RECOMMENDATION_RELEVANCE_EXPERIMENT_1.md), [RQ2](RQ2_GRAPH_LATENCY_EXPERIMENT_2.md), [RQ3](RQ3_PATHWAY_EFFICIENCY_EXPERIMENT_3.md); kết quả tổng hợp trong [bản thảo bài báo](RESEARCH_MANUSCRIPT.md). Có bản dịch tiếng Việt: [bản thảo](RESEARCH_MANUSCRIPT.vi.md), [RQ1](RQ1_RECOMMENDATION_RELEVANCE_EXPERIMENT_1.vi.md), [RQ2](RQ2_GRAPH_LATENCY_EXPERIMENT_2.vi.md), [RQ3](RQ3_PATHWAY_EFFICIENCY_EXPERIMENT_3.vi.md), [khung nghiên cứu](RESEARCH_FRAMEWORK.vi.md), [nghiên cứu liên quan](RELATED_WORK.vi.md).
5. [Hướng dẫn chuyên gia](EXPERT_ANNOTATION_GUIDE.md), [kế hoạch pilot](PILOT_PLAN.md) và [quy định dữ liệu](DATA_AND_REPRODUCIBILITY.md).

## 2 Những gì đã chốt

- Nghiên cứu thiết kế và đánh giá một phương pháp/hệ thống, phục vụ Capstone và hướng tới bản thảo công bố; chưa khẳng định thuật toán mới.
- Vấn đề: chọn nội dung phù hợp với khoảng trống năng lực và điều chỉnh lộ trình theo bằng chứng mới.
- Trường hợp nghiên cứu: Application Developer, Junior/Middle/Senior. Không suy rộng kết quả sang AI/IoT chỉ vì chuyên gia có kiến thức ở các lĩnh vực đó.
- Dùng engine quy tắc/bằng chứng hiện tại, không tự gọi là BKT hoặc bộ tối ưu toàn cục. Giữ nguyên câu chữ RQ đã đăng ký và giải thích giới hạn trong methodology.
- RQ1: 500 hồ sơ synthetic, chia 450 development và 50 kiểm thử; lấy 5–10 hồ sơ pilot từ 450. Hai chuyên gia thật đánh giá độc lập, nhãn 0/1/2; đo công sức pilot trước khi chốt phạm vi gắn nhãn chính thức.
- RQ2: tạo graph synthetic riêng 1k/5k/10k thật, đo đường prerequisite có hướng giữa các skill, shortest distance 3–5 hops. Không đổi/xóa graph ứng dụng.
- RQ3: 100 học viên mô phỏng, cùng mô hình học và ngân sách hoạt động cho static/adaptive; đo khoảng cách đến hồ sơ năng lực chính thức. Mô hình xác suất phụ thuộc kiến thức và quá trình học, không ưu ái adaptive.

## 3 Tình trạng hiện tại (25/11/2026)

| Phần | Đã có | Chưa có |
|---|---|---|
| Khung nghiên cứu | Khung, protocol RQ1–RQ3, bản thảo bài báo | Tổng quan tài liệu đầy đủ cho công bố, duyệt cuối của giảng viên |
| RQ1 | Catalog 20 skill / 72 module, 500 hồ sơ (450/50), phiếu đồng thuận Top 5 của hai chuyên gia, kết quả G0 vs C0 chạy lại được ([evidence](evidence/rq1/20261125/README.md)) | Chuyên gia duyệt catalog; nhãn 0/1/2 đầy đủ cho toàn catalog để tính Recall/nDCG |
| RQ2 | Ba graph Neo4j riêng 1k/5k/10k, cặp 3/4/5 hops được kiểm bằng Cypher, đo lặp nhiều vòng ([evidence](evidence/rq2/20261125-rerun/README.md)) | Nhiều seed graph, 1.000 truy vấn/khối, xuất đủ toàn bộ thời gian đo thô |
| RQ3 | Mô phỏng 100 hồ sơ × 30 lần lặp dùng đúng transition runtime, log sự kiện, độ nhạy 10 cấu hình ([evidence](evidence/rq3/20261125/README.md)) | Chuyên gia rà simulator/rubric; khóa manifest cohort |

Tất cả kết quả hiện là **pilot**: chưa có chuyên gia độc lập duyệt dữ liệu và giả định, nên chưa gọi là final.

## 4 Làm gì trước

**Bước 1:** đưa khung nghiên cứu cho giảng viên, tập trung vào đóng góp, ba RQ và giới hạn Knowledge Tracing. Không đổi câu chữ RQ đã đăng ký khi chưa có quyết định phù hợp.

**Bước 2:** cùng chuyên gia rà catalog Application Developer: yêu cầu từng Level, prerequisite, đặc tả module, learning outcomes và khả năng đánh giá độ phù hợp; không cần bài học đầy đủ theo Version 3. Ghi lỗi dữ liệu thật; không lấy metadata APPROVED trong seed thay cho đánh giá chuyên môn.

**Bước 3:** làm 5–10 hồ sơ pilot, đo thời gian gắn nhãn và bất đồng. Sau đó chốt đánh giá toàn catalog hay phương án nhãn hạn chế có kiểm soát. Module chưa chấm không phải module sai. Không dùng 50 hồ sơ cuối để chỉnh thuật toán.

**Bước 4 (RQ2, còn lại):** xuất đủ toàn bộ thời gian đo thô thay vì 30 mẫu gần nhất, thêm nhiều seed graph và khối 1.000 truy vấn nếu giảng viên yêu cầu thiết kế đầy đủ.

**Bước 5 (RQ3, còn lại):** chính sách ASSESSED_SATISFIED và runtime parity đã giải quyết bằng test. Còn chuyên gia rà giả định mô phỏng và các mức thử độ nhạy.

**Bước 6:** chạy pilot, ghi raw results, tính lại metric và kiểm tra các điều kiện P1–P7 trong [kế hoạch](PILOT_PLAN.md). Mới chuyển sang final khi những điều kiện liên quan đã đạt.

## 5 Lưu mọi thứ ở đâu

| Nội dung | Nơi lưu |
|---|---|
| Catalog, 500 hồ sơ, split và mẫu nhãn RQ1 | `data/rq1/` |
| Cohort 100 hồ sơ RQ3 | `data/rq3/pilot-v0.1/` |
| Kết quả từng lần chạy (raw, manifest, hash) | `results/rq1/`, `results/rq2/`, `results/rq3/`; mục lục ở [results/README.md](results/README.md) |
| Hồ sơ kiểm chứng (lệnh đã chạy, kết quả test, giới hạn) | `evidence/<rq>/<ngày>/` |
| Công cụ dựng dữ liệu, runner và harness | [tools/README.md](tools/README.md) |
| Mẫu manifest và annotation chưa điền | [templates](templates/README.md) |
| Bản thảo bài báo tổng hợp kết quả RQ1, RQ2, RQ3 | [RESEARCH_MANUSCRIPT.md](RESEARCH_MANUSCRIPT.md) / RESEARCH_MANUSCRIPT.docx |

Không ghi đè lần chạy cũ. Không lưu mật khẩu, thông tin nhân viên hoặc danh tính chuyên gia chưa được phép công bố. Application code vẫn sửa ở backend/frontend đúng kiến trúc; bản research lưu tham chiếu commit/hash, không nhân bản hệ thống vào thư mục này.

## 6 Phân biệt ba loại kết quả

- **Diagnostic audit:** kiểm tra bộ hiện tại có đo đúng không. Audit RQ2 ngày 22/11 thuộc loại này; đã phát hiện lỗi, không phải kết quả scalability.
- **Pilot:** thử quy trình/dữ liệu/tham số; được dùng để sửa thiết kế trước khi khóa.
- **Final experiment:** chạy đúng protocol đã khóa, dữ liệu độc lập, lưu đủ bằng chứng; có thể cho kết quả Graph/Adaptive tốt hơn, bằng hoặc kém hơn.

Không đổi tên pilot thành final sau khi đã chỉnh tham số từ kết quả. Không tạo trước con số HR/P95/Distance hoặc viết kết luận thắng khi chưa đo. RQ2 không chứng minh Neo4j hơn SQL vì không có đối chứng SQL; RQ3 không chứng minh nhân viên thật học nhanh hơn vì chưa có nghiên cứu thực địa.

## 7 Bước tiếp theo

1. Review bản thảo và ba protocol với giảng viên.
2. Chuyên gia rà catalog, phiếu nhãn RQ1 và giả định mô phỏng RQ3; ghi kết quả rà soát thật, không tự điền danh tính hay thời điểm.
3. Sau khi duyệt, khóa dữ liệu (đổi `DRAFT_PILOT_INPUTS`), chạy lại bằng các lệnh trong [tools/README.md](tools/README.md) và lưu thành lần chạy final mới, không ghi đè pilot.

## 8 Cập nhật bản Word

Nguồn nội dung của hai file Word là [RESEARCH_MANUSCRIPT.md](RESEARCH_MANUSCRIPT.md) và [RESEARCH_FRAMEWORK.md](RESEARCH_FRAMEWORK.md). Sau khi sửa Markdown, dựng lại Word bằng `python3 documents/research/tools/build_docx.py` (cần pandoc). Nếu sửa trực tiếp trong Word thì phải chép thay đổi ngược về Markdown, nếu không lần dựng sau sẽ ghi đè. File `.docx` bị `.gitignore` bỏ qua nên không có trong Git.

## Dữ liệu hiện tại

- [Catalog Application Developer v0.1](data/rq1/application-developer-v0.1/README.md): 20 kỹ năng, 72 module, 31 quan hệ tiên quyết. Đã qua kiểm tra cấu trúc, chưa qua chuyên gia.
- [profiles-v0.1](data/rq1/profiles-v0.1/README.md): 450 development (gồm pilot10) và 50 gold. Validator chạy lại ngày 25/11 đều PASSED.
- [Cohort RQ3](data/rq3/pilot-v0.1/manifest.json): 100 hồ sơ lấy từ development. Dựng lại với seed 20261125 cho kết quả trùng từng byte.
