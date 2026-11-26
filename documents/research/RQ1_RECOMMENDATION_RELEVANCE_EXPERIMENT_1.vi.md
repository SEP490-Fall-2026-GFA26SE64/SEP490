# Thí nghiệm 1: Độ phù hợp của gợi ý

> Bản dịch tiếng Việt để tham khảo. Bản chính là [RQ1_RECOMMENDATION_RELEVANCE_EXPERIMENT_1.md](RQ1_RECOMMENDATION_RELEVANCE_EXPERIMENT_1.md); nếu hai bản khác nhau thì theo bản tiếng Anh.

Protocol phiên bản 0.2, cập nhật 25/11/2026.

**Trạng thái:**
- **Đã chạy và tái tạo:** phép đánh giá "mức trùng với danh sách đồng thuận" trên 50 hồ sơ Application Developer giữ riêng, với catalog 72 học phần và danh sách ưu tiên đồng thuận ([RQ1_Golden_Set_50_Dong_Thuan.xlsx](RQ1_Golden_Set_50_Dong_Thuan.xlsx)).
- **Lần chạy lại:** `results/rq1/20261125-rerun/` dùng cùng engine với trang `/platform-admin/rq1-benchmark`.
- **Chưa chạy:** đánh giá có thang điểm trên toàn catalog (HR/Precision/Recall/nDCG theo nhãn 0/1/2), vì chưa có nhãn chuyên gia đầy đủ.

## Câu hỏi đã đăng ký

> How does the Recommendation Relevance (Hit Rate@5) of the Graph-Traversal algorithm compare to a baseline Content-Based Filtering approach for matching learning modules to skill gaps?
>
> (Dịch: Độ phù hợp gợi ý (Hit Rate@5) của thuật toán duyệt đồ thị so với phương pháp đối chứng Content-Based Filtering như thế nào khi ghép học phần với lỗ hổng kỹ năng?)

Nguồn: [trích yêu cầu nghiên cứu Version 3](sources/version-3/research-scope-extract.md). Câu chữ giữ nguyên. Protocol này vận hành hoá độ phù hợp của học phần ở bước gợi ý ban đầu, không đo hiệu quả học thực tế.

## Đối tượng nghiên cứu và đầu vào chung

**Bộ hồ sơ.** Một trường hợp duy nhất: Application Developer, cấp Junior/Middle/Senior.
- Tạo 500 hồ sơ giả lập khác nhau: 450 hồ sơ development và 50 hồ sơ giữ riêng để chuyên gia gắn nhãn.
- Chọn 5–10 hồ sơ pilot từ 450 hồ sơ development, không bao giờ lấy từ 50 hồ sơ cuối.
- Hai chuyên gia thật trở lên gắn nhãn độc lập cho hồ sơ pilot và hồ sơ cuối. Người phụ trách dự án báo cáo về khả năng tham gia của chuyên gia; gói này chưa thu thập nhãn hay phê duyệt nào của chuyên gia.

**Snapshot từng hồ sơ.** Chụp mỗi hồ sơ sau baseline và trước khi chuyên gia duyệt lộ trình. Ghi lại:
- Định danh tổ chức và hồ sơ giả lập.
- Vị trí và cấp đã chọn.
- Các yêu cầu chính xác theo kỹ năng–cấp độ kiến thức–phiên bản.
- Bằng chứng chính thức còn tương thích.
- Kết quả từng nhóm baseline.

**Nhu cầu học ban đầu.** Suy ra qua thành phần đang sở hữu nghiệp vụ này trong ứng dụng.
- Đạt baseline chỉ mang tính chẩn đoán, không phải thành tích chính thức.
- Không mở rộng chuỗi tiên quyết chưa được đánh giá, và không dùng lựa chọn của chuyên gia làm đầu vào cho mô hình.
- Phép đánh giá chính chỉ dùng hồ sơ có nhu cầu học bằng học phần. Các trường hợp không có lỗ hổng, thiếu học phần hoặc chỉ có chứng chỉ được giữ trong một báo cáo độ phủ/độ bền vững riêng.

**Catalog ứng viên chung.** Khóa một catalog ứng viên chung gồm mọi đặc tả học phần giả lập đủ điều kiện benchmark, cùng tổ chức, phiên bản nhất quán.
- Adapter ứng dụng sau này còn phải kiểm tra điều kiện phát hành và truy cập thực tế. Đủ điều kiện benchmark không có nghĩa là học phần đã được phát hành trong ứng dụng.
- Ở phép so sánh chính, không lọc trước tập ứng viên theo đúng lỗ hổng của hồ sơ.
- Phiên bản sửa đổi và phiên bản nội dung của học phần được cố định; nhiều bản sửa đổi không phải là gợi ý trùng lặp.
- Chức năng tra catalog hiện có lọc theo kỹ năng được yêu cầu, nên cần một adapter xuất dữ liệu cho nghiên cứu, không thể dùng nguyên làm tập ứng viên chung.

**Phân tầng và kiểm tra trùng lặp.**
- Phân tầng theo cấp, số lỗ hổng và lịch sử bằng chứng; khóa số lượng thực tế của từng tầng sau khi audit catalog.
- Phát hiện các vector yêu cầu-và-bằng-chứng trùng hoặc gần trùng trước khi chia tập.
- Không coi các catalog tổ chức được sao chép là những miền độc lập.

**Dữ liệu seed cũ (chỉ là bối cảnh).** Seed development quan sát được có 270 tài liệu, 237 cặp kỹ năng–cấp độ và 79 kỹ năng; 204 cặp có một học phần và 33 cặp có hai. Đây là số liệu quan sát trên seed, không phải số ứng viên cuối cùng, và không phải số liệu của Application Developer.

**Catalog dựng lại.** [Catalog](data/rq1/application-developer-v0.1/README.md) dựng lại có 20 kỹ năng và 72 đặc tả. Cần rà mức phù hợp của đặc tả trước khi khóa; bài học hoàn chỉnh nằm ngoài phạm vi.

## Thuật toán có thể tái lập (đề xuất)

Đây là các đề xuất thiết kế v0.1 để chạy pilot rồi khóa, không phải mô tả một mô hình Top 5 đã triển khai sẵn.

### G0: khớp đồ thị có cấu trúc

**Cách tính điểm.**
- Duyệt các yêu cầu của vị trí/cấp đã chọn và các ánh xạ "học phần dạy kỹ năng" đã xác minh.
- Ứng viên được 1 điểm nếu ràng buộc kỹ năng–cấp độ kiến thức–phiên bản của nó khớp đúng một yêu cầu ban đầu chưa đạt đã xác lập; ngược lại 0 điểm.

**Cách xếp hạng.**
- Xếp theo điểm giảm dần, sau đó theo hash có seed của (mã hồ sơ, mã học phần) tăng dần.
- Seed và định nghĩa hash phải giống nhau giữa các lần chạy, và dùng chung để phá hoà điểm cho CBF.
- Trả về 5 ứng viên khác nhau khi có ít nhất 5 ứng viên.
- Các ứng viên không khớp được điền thêm vẫn hiển thị và vẫn bị tính là không phù hợp; không tự tạo thêm học phần hợp lệ.
- Lưu lại lý do ánh xạ để truy vết được.

**Lý do giữ G0 đơn giản.** G0 cố ý đơn giản để cho thấy giá trị của khớp có cấu trúc, không tự đặt trọng số cho độ trung tâm, thời gian, giá hay mức thành thạo. G0 không tối ưu chương trình học và không chứng minh đóng góp của việc duyệt tiên quyết sâu. Bước sinh lộ trình ban đầu trong ứng dụng vẫn giữ mọi lựa chọn thay thế hợp lệ.

### C0: lọc dựa trên nội dung

**Mô hình.** Fit TF-IDF chỉ trên kho văn bản học phần đã khóa.
- Thiết lập đề xuất: văn bản tiếng Anh, chữ thường, unigram/bigram theo từ, chuẩn hoá L2, không có trọng số học từ nhãn.
- Văn bản học phần gồm tiêu đề, learning outcomes, mô tả tình huống và nhãn cấp độ kiến thức ghi rõ.

**Vector truy vấn và xếp hạng.**
- Mỗi vector lỗ hổng dựng từ tên/mô tả kỹ năng và cấp độ. Lấy trung bình các vector lỗ hổng với trọng số bằng nhau rồi chuẩn hoá.
- Xếp hạng theo độ tương đồng cosine, dùng cùng quy tắc phá hoà có seed.
- Ghi lại các trường hợp vector bằng 0, và dùng quy tắc phá hoà thay vì tự đặt điểm.
- Audit ngôn ngữ và độ đầy đủ của văn bản trước khi chọn tiền xử lý cuối. [T2](RELATED_WORK.md) mô tả thư viện nền.

**Tiền xử lý.**
- Loại mã máy, mã quan hệ nhúng và các đoạn lặp về seed/trạng thái bằng một quy tắc tiền xử lý duy nhất có ghi chép.
- Giữ tên kỹ năng thật và văn bản đặc tả có nghĩa: độ tương đồng trên tên tự nhiên tự nó không phải rò rỉ dữ liệu.
- Không dùng cạnh đồ thị, nhãn ẩn hay thứ hạng ưu tiên của chuyên gia trong C0.
- Không chọn cách tiền xử lý hay tham số xếp hạng dựa trên gold50.

### Đối chứng phụ

Áp cùng bộ lọc khớp chính xác cho cả G0 và C0, rồi so thứ tự của chúng trong tập ứng viên hợp lệ. Báo cáo riêng, kể cả các danh sách ngắn hơn 5. Cách này tách hiệu ứng của ánh xạ có cấu trúc khỏi hiệu ứng xếp hạng bên trong tập hợp lệ.

Có thể thêm một bảng xếp hạng ngẫu nhiên có seed, ghi rõ là phép kiểm tra hợp lý (sanity check). Không có phương pháp đối chứng neural nào khác được tuyên bố.

## Đánh giá của chuyên gia và kiểm soát rò rỉ

**Quy tắc chấm.** Dùng [EXPERT_ANNOTATION_GUIDE.md](EXPERT_ANNOTATION_GUIDE.md).
- Thang điểm: 0 không phù hợp, 1 bổ trợ, 2 phù hợp trực tiếp. Mức 2 xác định tập phù hợp.
- Tối đa 5 học phần ưu tiên được ghi riêng; cho phép các học phần tương đương chấp nhận được.
- Chuyên gia xem mô tả, outcomes và phạm vi học phần, không xem kết quả thuật toán hay bảng đáp án TEACHES điền sẵn.
- Giữ lại từng đánh giá độc lập và lịch sử phân xử.

**Cổng mở A1.** Dùng pilot để đo công sức gắn nhãn, rồi chọn chấm toàn catalog hoặc một chiến lược độ phủ có ghi chép trước khi đánh giá chính thức.
- Tập ứng viên xếp hạng phải luôn là toàn bộ catalog chung, kể cả khi gộp (pool) nhãn. Mục chưa được chấm không bao giờ bị coi là mức 0.
- Nếu dùng pool mù: phải gồm kết quả của mọi phương pháp được so sánh và một mẫu đối chứng có ghi chép; chấm mọi mục trong Top 5 trả về; công bố sai lệch do pooling; và không báo cáo Recall/nDCG toàn catalog khi chưa đủ nhãn.
- Với mỗi hồ sơ trong tập truy vấn có đáp án, phải xác nhận độc lập ít nhất một ứng viên phù hợp. Hồ sơ không có đáp án vàng được báo cáo riêng, không âm thầm loại sau khi đã thấy điểm.
- Protocol chấm sửa đổi phải được đánh phiên bản trước khi chấm lần chạy cuối.

**Khóa trước khi lộ nhãn.**
- Nhãn pilot có thể dùng để hoàn thiện hướng dẫn.
- Khóa thuật toán và rubric trước khi nhãn cuối được lộ cho người phát triển; ghi riêng thời điểm có nhãn chuyên gia và thời điểm khóa thuật toán.
- Nếu có thay đổi sau khi đã thấy dữ liệu test, đánh dấu kết quả là khám phá (exploratory) và dùng một bộ test mới cho mọi khẳng định xác nhận.

## Thước đo và phân tích

Gọi P(u) là tập Top 5 trả về và G(u) là mọi ứng viên mức 2 theo protocol độ phủ cuối cùng.

- **HR@5** = trung bình trên các hồ sơ hợp lệ của `1[P(u) giao G(u) khác rỗng]`.
- **Precision@5** = trung bình của `số mục mức 2 trong Top 5 / 5`, cho catalog chính có ít nhất 5 ứng viên; ô gợi ý bị thiếu tính là 0.
- **Recall@5** = trung bình của `số lần trúng / |G(u)|`, chỉ khi tập phù hợp đã được chấm đủ và khác rỗng.
- **nDCG@5 có thang điểm** dùng **gain tuyến tính** `grade/log2(rank+1)`, chia cho DCG lý tưởng tính trên cùng tập ứng viên đã chấm.
  - Mức 1 vẫn đóng góp vào gain dù không tính là phù hợp cho HR.
  - Khi IDCG=0 thì báo cáo là không áp dụng.
  - Không âm thầm thay bằng gain mũ, hay cách xử lý hoà trung bình của thư viện, cho bảng xếp hạng tất định.

**Ví dụ kiểm tra thước đo.** Đáp án A/B/C/D/E và dự đoán A/X/Y/Z/W cho 1 lần trúng, Precision 0.2 và Recall 0.2. Đây là ví dụ kiểm tra công thức, không phải kết quả nghiên cứu. HR có thể bão hoà ở catalog dễ, nên phải báo cáo thêm các thước đo bổ sung và số ứng viên, không chỉ chọn thước đo có lợi nhất.

**Phân tích so cặp.** Tính chênh lệch so cặp G0–C0 trên cùng hồ sơ.
- Phân tích đề xuất: 10.000 lần bootstrap lấy mẫu lại hồ sơ có seed, khoảng phân vị 95%, kèm số trận thắng/hoà/thua và kết quả mô tả theo cấp.
- Nếu các hồ sơ dùng chung một khuôn sinh, phải lấy mẫu lại theo cụm khuôn hoặc công bố sự phụ thuộc.
- 50 hồ sơ gold không phải 500 quan sát độ chính xác: một lần trúng làm HR thay đổi 2 điểm phần trăm.
- Thước đo phụ và đối chứng phụ là khám phá, trừ khi đã đăng ký trước.
- Báo cáo cả trường hợp không có hiệu ứng hoặc kết quả kém hơn, không đổi tiêu chí thành công.

## Hiện vật và cổng kiểm chứng

**Nơi lưu.** Lưu các phiên bản dữ liệu trong `data/rq1/<dataset-version>/` và các lần chạy trong `results/rq1/<run-id>/`. Thư mục lần chạy đầu tiên là `results/rq1/20261125-rerun/`. Quy tắc chung xem [DATA_AND_REPRODUCIBILITY.md](DATA_AND_REPRODUCIBILITY.md).

**Hiện vật bắt buộc:**
- JSONL catalog và hồ sơ, mã của từng tập chia.
- Kết quả rà catalog, manifest tiền xử lý.
- Nhãn độc lập và nhãn đã phân xử.
- Toàn bộ bảng xếp hạng hoặc điểm, thước đo theo từng hồ sơ.
- Phân tích so cặp và danh sách loại trừ.

**Điều kiện trước một lần chạy cuối:**
- Kiểm tra chính xác định danh, phiên bản và tenant.
- 500 hồ sơ khác nhau, chia 450/50; tập pilot và tập test tách biệt.
- Nhãn thật, không có metadata bịa.
- Kiểm tra thước đo bằng các ví dụ tính tay.
- Hành vi với trùng lặp, vector 0, hoà điểm và không có ứng viên.
- Tập ứng viên toàn catalog như nhau cho các phương pháp; không rò rỉ nhãn; chạy lại cho bảng xếp hạng giống hệt.
- Ánh xạ của nguồn pilot và của adapter thật phải khớp nhau.

Sẵn sàng cho bản cuối bị chặn bởi A1 chưa giải quyết, chưa xác thực đặc tả học phần hoặc thiếu nhãn. Một biểu đồ đẹp không thay thế được các điều kiện này.

## Phạm vi kết quả và mức trùng với danh sách đồng thuận (chạy lại 25/11/2026)

**Tham chiếu.** Với mỗi hồ sơ trong 50 hồ sơ giữ riêng ([RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx](RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx)), tham chiếu là phần giao theo đúng mã của hai danh sách ưu tiên của chuyên gia (EX-9 và EX-10) trong [RQ1_Golden_Set_50_Dong_Thuan.xlsx](RQ1_Golden_Set_50_Dong_Thuan.xlsx).
- Hai danh sách trùng hoàn toàn ở 23 hồ sơ và khác nhau ở 27.
- 12 hồ sơ có ghi phương án tương đương không được tính điểm cho các phương án đó.

**Chạy lại:** `node documents/research/tools/run_rq1_shortlist_agreement.mjs`. Script nạp engine của trang benchmark (`rq1BenchmarkEngine.ts`, `rq1Top5Reference.ts`), đọc cả hai workbook, rồi ghi:
- [report.json](results/rq1/20261125-rerun/report.json): Top 5 từng hồ sơ, số lần trùng và bootstrap so cặp.
- [run-manifest.json](results/rq1/20261125-rerun/run-manifest.json): SHA-256 của các workbook, fixture catalog và mã nguồn engine.

Bản tổng hợp của engine và phép tính lại của script khớp nhau.

| Phương pháp | Hồ sơ có ít nhất 1 lần trùng | Hit Rate@5 | Số trùng trung bình | Precision@5 theo danh sách | Recall theo danh sách |
|---|---:|---:|---:|---:|---:|
| G0: khớp đồ thị có cấu trúc | 48/50 | 96% | 2.30 | 0.460 | 0.836 |
| C0: TF–IDF theo nội dung | 41/50 | 82% | 1.28 | 0.256 | 0.548 |
| G0 − C0 (so cặp, CI bootstrap 95%, 10.000 lần) | +7 | +14 điểm % [+6, +24] | +1.02 [+0.72, +1.32] | — | +0.288 [+0.210, +0.369] |

- **Theo từng hồ sơ:** G0 trùng nhiều hơn ở 29 hồ sơ, bằng ở 21, ít hơn ở 0.
- **Theo cấp:**

  | Cấp | G0 Hit Rate@5 | C0 Hit Rate@5 |
  |---|---:|---:|
  | Junior | 17/17 | 14/17 |
  | Middle | 15/17 | 14/17 |
  | Senior | 16/16 | 13/16 |

- **Các trường hợp G0 trượt:** cả hai đều là hồ sơ Middle có 9 lỗ hổng (SYN-58C4FAE37081, SYN-58D3453003CF). Ở mỗi hồ sơ, cả 5 gợi ý của G0 đều là học phần đúng lỗ hổng, nhưng lựa chọn đồng thuận duy nhất nằm ngoài 5 vị trí. Có 24 hồ sơ có ít hơn 5 học phần đúng lỗ hổng, nên G0 điền các vị trí còn lại theo quy tắc phá hoà tất định.
- **Cách hiểu:** precision và recall ở đây chỉ tính theo danh sách đồng thuận. Chúng không phải Precision@5, Recall@5 hay nDCG@5 toàn catalog của protocol, vốn cần nhãn 0/1/2 đầy đủ (cổng mở A1).

**Giới hạn.** Các số liệu này vận hành hoá mức trùng với danh sách đồng thuận (`RESEARCH_MANUSCRIPT.md`, mục 4.1) và không ước lượng recall toàn catalog đối với các phương án chưa được chấm.
- Cùng một bộ định nghĩa vị trí vừa dựng các ràng buộc catalog mà G0 dùng để khớp, vừa tạo ra nhu cầu học mà chuyên gia nhìn thấy. Điều này có lợi cho G0.
- Mức phù hợp theo chuyên gia không phải hiệu quả học tập.
- Một vị trí duy nhất không đủ để suy rộng sang AI, IoT hay mọi nghề nghiệp.

Tài liệu tham khảo và định vị: [RELATED_WORK.md](RELATED_WORK.md).

## Cập nhật chuẩn bị catalog ngày 23/11/2026

Bản nháp Application Developer web full-stack đã kiểm tra cấu trúc nhưng chưa được chuyên gia duyệt và chưa khóa.
- Metadata học phần tách "khả dụng cho benchmark giả lập" khỏi trạng thái phát hành trong ứng dụng.
- Đã có 500 hồ sơ nháp, chưa có nhãn gold của người.
- Trường dùng cho CBF: title, description, learningOutcomes và knowledgeLevel, với quy tắc tiền xử lý hiện có. Loại mã, ràng buộc, metadata nguồn/duyệt và excludedScope khỏi đặc trưng CBF.
- Adapter Top 5 của G0 đã mô tả vẫn là đề xuất và cần đối chiếu với kết quả thật của engine.
- Không thêm mở rộng tiên quyết nào để làm phương pháp đồ thị trông mạnh hơn.

## Cập nhật chuẩn bị hồ sơ

[profiles-v0.1](data/rq1/profiles-v0.1/README.md) gồm 450 hồ sơ development và 50 hồ sơ giữ riêng, lấy mẫu với seed 20261123, cân bằng theo cấp vị trí và các tầng lỗ hổng/bằng chứng.
- Pilot10 chỉ lấy từ development.
- Người dùng đã cho phép tạo bản nháp trước khi chuyên gia khóa catalog; đầu vào được đánh phiên bản và cố định, chưa phải dữ liệu đã duyệt cuối.
- Các tập lỗ hổng cùng vị trí có Jaccard >=0.8 bị loại trên toàn bộ nhóm; điều này không đảm bảo độc lập về ngữ nghĩa.
- Cả 500 trường hợp có 1–9 nhu cầu học bằng học phần. Các trường hợp kiểm tra độ bền vững nằm ngoài nhóm truy vấn có đáp án này là việc cho sau.
- Hai mẫu phiếu chuyên gia trống liệt kê đủ 72 dòng ứng viên cho mỗi hồ sơ gold, không áp đặt độ phủ chấm cuối.
- Lúc đó chưa sinh bảng xếp hạng hay nhãn độ phù hợp nào.
- Tính tương đương đầy đủ với luồng tiếp nhận trong runtime vẫn chưa được xác minh.
