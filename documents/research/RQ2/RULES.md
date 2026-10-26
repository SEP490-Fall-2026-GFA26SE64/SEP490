# RQ2 — Quy tắc tạo dữ liệu và đo lường

Phiên bản thực thi: `rq2-v3`. Phạm vi đã thống nhất: chức năng Research trong màn hình Admin; triển khai RQ2 trước. RQ1 và RQ3 chưa triển khai. Đây là nghiên cứu tổng hợp, không phải đánh giá năng lực người học thật.

## Nguồn và khả năng tái lập

- Nguồn cấu trúc: `documents/neo4j_schema.md`, ontology v0.9.0.
- Nguồn bản ghi: `documents/dataset/import/ontology_seed.json`. Đọc và kiểm tra trước khi nhận lượt chạy; SHA-256 tính trên byte của file nguồn.
- Lưu sourceVersion, sourceHash, rulesVersion, seed, cấu hình, nội dung rule, toàn bộ graph đã sinh và workload theo từng lượt. File rule được đóng băng trong payload của lượt chạy; bản hiện tại và bản theo lượt có endpoint tải riêng.
- Seed là số nguyên không âm trong phạm vi số nguyên an toàn của JavaScript. Cùng nguồn, rule và seed tái tạo cùng graph và thứ tự workload. Thời gian đo không được kỳ vọng giống nhau giữa các lần chạy.
- JSON là dữ liệu chính; CSV lưu từng mẫu đo. Graph artifact dùng `nodes(label, properties)`, `edges(type, fromId, toId, properties)` và `workload(hops, startId, moduleId)`; không phải nguyên định dạng seed Excel/importer. Sử dụng adapter Research để nạp lại.

## Tạo sinh graph

| Rule | Cách áp dụng |
| --- | --- |
| Tổng node | Cho phép 1.000, 5.000, 10.000; chỉ tính 6 loại node ontology. Không sinh learner, mastery hoặc Course. |
| Giữ nguồn | Giữ nguyên toàn bộ node và relationship nguồn; từ chối nếu nguồn lớn hơn quy mô yêu cầu. |
| Mở rộng skill và nghề | Số bổ sung lấy phần nguyên của số nguồn nhân `(target/sourceNodes - 1)`. Mỗi bản sao giữ nội dung của bản ghi mẫu; ID/code tổng hợp được đánh dấu SYN. Code nghề tổng hợp không phải mã O*NET mới có thật. |
| Mở rộng role | Trộn thứ tự role nguồn theo seed; sao chép nguyên cụm role, các Level và Competency sở hữu; nối tới skill tổng hợp hoặc nguồn tương ứng; role giữ đúng nghề gốc hoặc bản sao tổng hợp của chính nghề đó. Dừng trước ngân sách module. |
| Module | Dự trữ tỷ lệ module theo nguồn rồi thêm module đến đúng tổng node. Sao chép mapping TEACHES của module nguồn sang các skill tương ứng. Bổ sung provider từ nguồn cho skill còn thiếu module. |
| Mật độ | Gần tỷ lệ nguồn, không cam kết tỷ lệ tuyệt đối; đóng gói role và bù coverage làm thay đổi số cạnh. Báo cáo đầy đủ số node/cạnh theo loại. Skill/module được chia sẻ; không nhân bản các graph độc lập hoàn toàn. |
| Prerequisite | Giữ DAG nguồn. Skill tổng hợp chỉ nối tới prerequisite nền tảng gốc tương ứng. Không tạo chuỗi prerequisite giả để ép đủ 5 hop; workload đo đường cấu trúc catalog. |
| Ownership | Mỗi TargetRole có một Occupation; mỗi Level có một role; mỗi Competency có một Level. Membership competency phải khớp REQUIRES_SKILL của Level sở hữu và có ít nhất hai skill. |
| Coverage | Mỗi module có ít nhất một skill, mỗi skill có ít nhất một module; mapping không trùng; tất cả đầu cạnh đúng loại và tồn tại. |
| Field | Kiểm tra đúng tập field chung và nghiệp vụ theo schema; field bắt buộc không trống, requiredScore/RIASEC trong [0,1], lifecycle hợp lệ. reviewedBy/reviewedAt được phép null khi chưa duyệt đúng theo schema. |
| Review | Giữ review nguồn, bản tổng hợp NEEDS_EXPERT_REVIEW; reviewedBy/reviewedAt null. Không tự tạo phê duyệt. |
| Nội dung | contentUri/contentType/contentVersion giữ từ template; mô phỏng cấu trúc, không chứng minh nội dung đáp ứng role/Level. Không truy xuất nội dung trong truy vấn đo. |

## Workload và ý nghĩa độ sâu

Truy vấn dùng shortestPath với tối đa 5 cạnh, chỉ cho phép HAS_ROLE, HAS_LEVEL, HAS_COMPETENCY, HAS_SKILL và TEACHES, duyệt hai hướng để đi từ skill về module. REQUIRES_SKILL bị loại khỏi truy vấn này vì nó tạo đường tắt. Đây là đường cấu trúc catalog, không phải thuật toán lập lộ trình học cá nhân hóa và không đo Knowledge Tracing.

| Độ sâu | Điểm đầu và đường đi dự kiến |
| --- | --- |
| 3 | Level → Competency → MicroSkill ← LearningModule |
| 4 | TargetRole → Level → Competency → MicroSkill ← LearningModule |
| 5 | Occupation → TargetRole → Level → Competency → MicroSkill ← LearningModule |

- Admin nhập số bộ dữ liệu mỗi quy mô: số nguyên1–10, mặc định5. Hệ thống tự gán seed1..N; mỗi seed sinh một graph và bộ truy vấn cho mỗi quy mô. API vẫn lưu/chấp nhận seed nguyên không âm khác nhau trong [0,9007199254740991] để bảo toàn khả năng tái lập và lịch sử; không đổi dữ liệu nguồn.
- `pairsPerHop`: số cặp đầu–cuối khác nhau yêu cầu cho mỗi độ sâu, 1–10.000; mặc định 500. Suy ra cặp hợp lệ từ graph, loại trùng theo (hops,startId,moduleId), trộn bằng seed rồi chọn tối đa số yêu cầu. Khi thiếu cặp, lưu số thực tế theo từng độ sâu; tuyệt đối không lặp để bù.
- `rounds`: số vòng đo toàn bộ bộ cặp, 1–10; mặc định 3. Cùng bộ cặp được dùng ở mọi vòng của cùng seed/quy mô. Trộn thứ tự mỗi vòng bằng `new Random(seed ^ (0x9E3779B97F4A7C15L * round))`, round bắt đầu từ 1. Khác seed có thể trùng một số cặp; không giả định các graph hoàn toàn độc lập.
- Trước khi đo, sinh và đóng băng mọi graph/workload vào PostgreSQL. Tính `totalQueries = rounds × sum(actual workload size across seed/size)`; giới hạn trên của form là `pairsPerHop × 3 × rounds × seeds × sizes`, tối đa 1.000.000. Tiến độ hiển thị giới hạn trên khi planning và tổng chính xác khi planReady=true.
- Mỗi seed/quy mô import một lần, đợi index rồi chạy toàn bộ workload một vòng warm-up; không lưu warm-up thành mẫu đo. Không warm-up lại giữa các vòng đo. Warm-up lỗi làm cả thí nghiệm FAILED.
- Với 500 cặp/hop, 3 vòng, 5 seed, 3 quy mô: tối đa 67.500 lượt đo và 22.500 warm-up; tổng thực tế có thể thấp hơn. Đây là cấu hình khởi đầu, không bảo đảm cỡ mẫu thống kê đủ cho mọi kết luận.

## Cách đo và xử lý lỗi

- Một worker, một truy vấn tuần tự; không phải kiểm thử nhiều người truy cập đồng thời. Giữ cache ấm, không xóa OS cache. Lưu môi trường, cấu hình tài nguyên và exact Cypher.
- Dùng System.nanoTime từ trước driver.run đến sau đọc/consume kết quả; mở session trước đồng hồ. Không gọi EXPLAIN/PROFILE trong mẫu đo. Generation/import tách riêng và chỉ thực hiện một lần mỗi seed/quy mô.
- Không retry; timeout query 10 giây ở Neo4j không phải giới hạn tuyệt đối cho wall-time phía client (lập lịch/driver/truyền nhận/đọc kết quả có thể làm thời gian client vượt mức này). Không suy timeout chỉ vì latency >10 giây. Một mẫu thành công phải trả đúng một đường có độ sâu mong đợi. Lỗi/timeout ở vòng đo được lưu với outcome ERROR/TIMEOUT, elapsed time, returnedHops=0 và thông báo an toàn; tiếp tục các truy vấn còn lại. Timeout được nhận diện từ exception/cause có tên hoặc thông báo chứa timeout/timed out; lỗi khác là ERROR, không suy diễn chúng là timeout.
- `attempted` đếm cả thành công và thất bại; `errors` gồm timeout, `timeouts` là tập con; failure rate = errors/attempted. completedQueries đếm số lượt đã thử, không phải số lượt thành công. Không thay lỗi thành latency=0.
- Mean, Median, P95, min/max chỉ tính trên SUCCESS. N là số mẫu thành công; luôn báo lỗi và mẫu số attempted bên cạnh. Không bỏ outlier. Khi không có mẫu thành công, count=0; UI/PDF hiển thị N/A thay vì latency 0. JSON giữ số 0 kỹ thuật cho các metric trống và medianMs=null; không diễn giải là thời gian 0.
- Median là giá trị giữa (số mẫu lẻ) hoặc trung bình hai giá trị giữa (số mẫu chẵn). P95 nearest-rank: vị trí ceil(0.95*n), đánh số từ 1.
- Lưu kết quả riêng cho từng seed/quy mô/vòng và từng độ sâu. Không trung bình các P95 để gọi là P95 tổng. Bảng dao động tổng hợp các Mean từng vòng theo quy mô: trung bình, min/max và sample SD (mẫu số k−1, N/A nếu k<2). Đây là thống kê mô tả, không phải khoảng tin cậy; các vòng của cùng graph không độc lập.
- Ghi số node/cạnh theo loại, số cặp thực tế mỗi độ sâu, warm-up thực tế, averageDegree=2*edges/nodes và maxDegree trên tổng bậc vào+ra của bảy loại cạnh, không chỉ cạnh được truy vấn. Đây không phải thí nghiệm kiểm soát mật độ cạnh.
- SUCCEEDED nghĩa là đã hoàn tất các lượt thử theo kế hoạch, không có nghĩa mọi query thành công hay đạt NFR. Import/planning/warm-up/dependency ngoài từng mẫu thất bại làm FAILED; giữ bằng chứng một phần. PDF chỉ cho SUCCEEDED và luôn công bố lỗi.
- Mốc 150 ms chỉ tham chiếu, không tự kết luận đạt/trượt NFR. RQ2 hiện đo structural shortestPath 3–5 hop trong điều kiện cache ấm; không chứng minh tốc độ mọi truy vấn, cold-cache, nhiều người dùng hay hiệu quả học tập.

## Lưu trữ, quyền và trạng thái

- PostgreSQL V27 + V28: research_run lưu protocol, trạng thái, cấu hình, raw samples; research_graph lưu graph/workload với khóa (run_id,node_count,seed). V28 lấy seed từ payload của snapshot cũ để bảo toàn artifact. Không sửa bảng evaluation cũ.
- Checkpoint mỗi 100 lượt thử và mỗi vòng/phase; giữ cả mẫu lỗi. Crash có thể mất tối đa 99 mẫu từ checkpoint; restart đánh dấu run chưa xong FAILED.
- Restart API đánh dấu lượt chưa hoàn tất FAILED. PostgreSQL advisory lock giữ độc quyền một Research worker; unique partial index chặn start trùng. Khi cấu hình nhiều instance, chỉ bật Research trên một API instance.
- Dedicated Neo4j: so sánh database ID với database vận hành; từ chối nếu giống nhau hoặc chứa node không phải ResearchNode. Chỉ xóa ResearchNode trong instance riêng giữa các quy mô. ResearchNode là nhãn kỹ thuật phục vụ index, không thêm property nghiệp vụ.
- Research dùng ngữ cảnh Admin đã đăng nhập ở portal, không có tài khoản/form đăng nhập Research riêng. UI hiển thị RQ1 → RQ2 → RQ3; chỉ RQ2 đang triển khai. Local profile dùng actor-header bridge hiện có, bắt buộc X-User-Id và X-User-Role: ADMIN. Ngoài local, header không cấp quyền; yêu cầu principal đã xác thực có ROLE_ADMIN. POST luôn bắt buộc CSRF token/cookie; UI tự lấy token trước khi tạo lượt chạy.
- Tải PDF, JSON, CSV, graph và rule đều yêu cầu quyền admin. Tất cả bản ghi lưu createdBy để truy nguyên người khởi chạy.
- Lịch sử UI hiển thị 50 lượt gần nhất; không tự xóa artifact cũ. Cần quản lý dung lượng PostgreSQL khi chạy nhiều lần.

Polling giữ cookie CSRF; mọi POST vẫn bắt buộc cookie và token hợp lệ. Reload trang giữ ngữ cảnh đăng nhập portal, không hỏi lại mật khẩu Research.

## Môi trường Compose

Thiết lập kết nối Neo4j có timeout 15 giây để tránh lỗi bắt tay khi instance local vừa khởi động; giữ timeout truy vấn đo 10 giây, không retry mẫu đo.

Health-check Neo4j dùng HTTP để tránh khởi tạo JVM phụ trong khi đo; worker kiểm tra database identity, index và số lượng import qua Bolt.

Dùng `compose.dev.yml` cùng `compose.research.yml`. Neo4j nghiên cứu: 5.26 Community, giới hạn 2 CPU/2 GiB RAM, heap 512 MiB, page cache 256 MiB; host vẫn dùng chung với API và các dịch vụ khác. Kết quả không phải phép đo phần cứng chuyên dụng. Báo cáo lưu phiên bản Neo4j thực tế và thông tin Java/OS/CPU/heap của backend; các thông tin backend không đại diện phần cứng Neo4j remote.

## Phạm vi chờ sau RQ2

RQ1: sinh 500 người theo Role–Level, điểm 0–1, phân tầng gap, readiness riêng, 50 hồ sơ giữ lại cho chuyên gia; chưa tạo dữ liệu hoặc gán nhãn trong chức năng này. RQ3: 100 người riêng, đánh giá theo skill, kết quả tiềm năng dùng chung, cập nhật mastery và static/adaptive; tạm hoãn theo yêu cầu. Các thông số đã thống nhất trong trao đổi sẽ được cụ thể hóa và kiểm chứng trước khi triển khai hai RQ này.

## Tương thích lịch sử

Lượt rq2-v1/v2 giữ nguyên seed/N/warmup/rule và dữ liệu cũ, không tính lại hoặc giả tạo Median/Trial. API legacy `{seed,sizes,iterations}` còn dùng được theo rq2-v2-compat (N 3..100000, mặc định1000, warm-up30, pool256/hop). Giao diện chỉ tạo protocol v3. Bản rule hiện tại mô tả rõ cả hai nhánh; mỗi run giữ bản đóng băng tại thời điểm tạo. Không trộn kết quả v2 và v3 thành một kết luận so sánh chung.

Bảng latency hiển thị một seed mỗi trang để gọn hơn; vẫn giữ đầy đủ quy mô/vòng/độ sâu của seed đó. Bảng dao động và các file xuất vẫn dùng mọi seed. Thay đổi hiển thị này không thay đổi protocol rq2-v3.
