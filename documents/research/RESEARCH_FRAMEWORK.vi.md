# Lộ trình học tập thích ứng dựa trên đồ thị tri thức để phát triển năng lực nhân sự

Khung nghiên cứu và kế hoạch đánh giá • Phiên bản 0.4 • 25/11/2026

> Bản dịch tiếng Việt để tham khảo. Bản chính là [RESEARCH_FRAMEWORK.md](RESEARCH_FRAMEWORK.md); nếu hai bản khác nhau thì theo bản tiếng Anh.
>
> Kết quả pilot nằm trong [bản thảo bài báo](RESEARCH_MANUSCRIPT.vi.md).

## Tóm tắt

Nghiên cứu này đánh giá một hệ thống học tập dựa trên đồ thị tri thức đã có sẵn, ở hai việc: chọn học phần lấp lỗ hổng năng lực, và điều chỉnh lộ trình khi bằng chứng đánh giá thay đổi.
- Trường hợp nghiên cứu là vị trí Application Developer ở ba cấp Junior, Middle và Senior.
- Hệ thống nối yêu cầu của vị trí, kỹ năng, nội dung học có phiên bản và bằng chứng đạt được thông qua các ánh xạ và quy tắc tường minh.

Phần đánh giá gồm ba thí nghiệm bổ sung cho nhau:
1. Độ phù hợp của gợi ý do chuyên gia chấm, so với lọc dựa trên nội dung.
2. Độ trễ truy vấn tiên quyết có hướng trên các đồ thị tách biệt 1.000, 5.000 và 10.000 nodes.
3. Lộ trình thích ứng so với lộ trình tĩnh trong mô phỏng, với cùng ngân sách hoạt động.

Đóng góp dự kiến là một phép đánh giá tái lập được cho cách tiếp cận đã triển khai và các giới hạn của nó. Nghiên cứu không tuyên bố trước một thuật toán học mới hay cải thiện kết quả của nhân viên thật.

Khung này định nghĩa thiết kế nghiên cứu.
- Phiên bản 0.3 (23/11/2026) được viết trước mọi thí nghiệm. Nó gồm một audit chẩn đoán service RQ2 hiện có; audit phát hiện nhãn quy mô và thời gian đã bị điều chỉnh, nên không thể chứng minh khả năng co giãn.
- Phiên bản 0.4 ghi nhận rằng cả ba thí nghiệm đã được chạy ở mức pilot; kết quả nằm trong RESEARCH_MANUSCRIPT.md.
- Các lần chạy cuối vẫn cần chuyên gia độc lập rà catalog, nhãn RQ1 và giả định mô phỏng RQ3.

## Vấn đề nghiên cứu và đóng góp dự kiến

Một hệ thống học tập cho nhân sự phải nối vị trí mục tiêu với bằng chứng hiện tại của người học, xác định nội dung phù hợp, và phản ứng với các lần thành công hay thất bại sau đó.
- Một gợi ý phù hợp, tự nó, không chứng minh khả năng thích ứng hiệu quả.
- Một truy vấn đồ thị nhanh, tự nó, không chứng minh giá trị giáo dục.

Vì vậy ba câu hỏi nghiên cứu xử lý các phần khác nhau của cùng một phép đánh giá hệ thống.

Đóng góp đề xuất là một mô tả minh bạch về cách các thành phần sau tương tác trong bản triển khai này: yêu cầu tường minh theo vị trí–cấp, ánh xạ học phần tương thích, bằng chứng chẩn đoán và thành tích chính thức.
- Các đầu ra trung tâm: dữ liệu tái lập được, nhận định của chuyên gia, workload truy vấn hợp lệ và vết học tập kiểm toán được.
- Phát hiện tích cực, trung tính hay bất lợi đều là kết quả hợp lệ.

<!-- pagebreak -->

## Nghiên cứu liên quan và định vị

**Phương pháp luận.** Design Science Research cung cấp một quy trình gồm định nghĩa vấn đề, phát triển hiện vật, trình diễn và đánh giá [R1]. Ở đây hiện vật đã tồn tại; việc kiểm tra và đánh giá đi trước mọi khẳng định về hiệu quả. Nghiên cứu không mặc định rằng xây được một nền tảng chạy được là đã trả lời các câu hỏi nghiên cứu.

**Gợi ý giáo dục dựa trên đồ thị tri thức** là hướng đã có nghiên cứu trước:
- Frej và cộng sự xem xét gợi ý MOOC theo đường đi từ góc nhìn người học [R2].
- Afreen và cộng sự nghiên cứu khả năng tổng quát hoá sang giáo dục của các bộ gợi ý giải thích được dựa trên đường đi [R3].
- KnowLP kết hợp cấu trúc tri thức với một cách gợi ý lộ trình có học máy và đánh giá bằng bộ mô phỏng [R4].

Các nghiên cứu này là động lực để so sánh, nhưng kết quả của chúng không thể chuyển sang trường hợp nhân sự này.

**Khác biệt với Knowledge Tracing.** Hệ thống đã triển khai dùng quy tắc tất định và cập nhật theo bằng chứng. Nó không ước lượng mức thành thạo ẩn bằng Bayesian Knowledge Tracing.
- Điều này quan trọng vì câu chữ đăng ký của RQ3 dùng cụm "Knowledge Tracing", trong khi cách mô hình hoá xác suất của Corbett và Anderson [R5] khác về khái niệm.
- Bài báo giữ câu hỏi đã đăng ký nhưng mô tả chính xác cơ chế thực tế.
- Mọi thay đổi chính thức về câu chữ đăng ký cần quyết định học thuật phù hợp.

**Phương pháp đánh giá cũng ảnh hưởng tới kết luận.**
- Các thước đo xếp hạng tính trên mẫu có thể làm thay đổi kết quả so sánh giữa các bộ gợi ý [R6], nên cả hai phương pháp phải xếp hạng trên một catalog chung.
- Độ biến động của benchmark đòi hỏi đo lặp lại và báo cáo rõ môi trường [R7].

Các nguyên tắc này định hướng protocol mà không đưa ra kết quả số kỳ vọng.

## Câu hỏi nghiên cứu đã đăng ký

RQ1: How does the Recommendation Relevance (Hit Rate@5) of the Graph-Traversal algorithm compare to a baseline Content-Based Filtering approach for matching learning modules to skill gaps?
(Dịch: Độ phù hợp gợi ý (Hit Rate@5) của thuật toán duyệt đồ thị so với phương pháp đối chứng Content-Based Filtering như thế nào khi ghép học phần với lỗ hổng kỹ năng?)

RQ2: What is the query latency of deep pathfinding operations in Neo4j (e.g., 3-hop to 5-hop depth) as the number of nodes/edges in the competency ontology scales from 1,000 to 10,000?
(Dịch: Độ trễ của các truy vấn tìm đường sâu trong Neo4j, ví dụ 3 tới 5 hops, là bao nhiêu khi số node/cạnh của ontology năng lực tăng từ 1.000 lên 10.000?)

RQ3: Does dynamic pathway recalculation (Knowledge Tracing) result in a mathematically shorter distance to the Target Role profile compared to static predefined pathways?
(Dịch: Việc tính lại lộ trình động (Knowledge Tracing) có cho ra khoảng cách tới hồ sơ vị trí mục tiêu ngắn hơn về mặt toán học so với lộ trình tĩnh định sẵn hay không?)

Các câu hỏi giữ nguyên câu chữ trong hồ sơ đăng ký dự án, Version 3, mục 3.3.
- RQ1 xử lý độ phù hợp.
- RQ2 xử lý chi phí của một thao tác đồ thị cụ thể.
- RQ3 xử lý tiến độ mô phỏng hướng tới việc đạt mục tiêu chính thức.

Các phát hiện cùng nhau mô tả hệ thống, chứ không xác lập một khẳng định vượt trội phổ quát nào.

<!-- pagebreak -->

## Thiết kế nghiên cứu và ranh giới triển khai

**Phương pháp.** Đây là phép đánh giá lấy hiện vật làm trung tâm, gồm ba thí nghiệm có kiểm soát.
- Hồ sơ giả lập cho phép phủ các cấp vị trí và trạng thái bằng chứng một cách tái lập được.
- Nhận định độc lập của chuyên gia là tham chiếu độ phù hợp cho RQ1.
- Các đồ thị được sinh tách biệt giúp kiểm soát quy mô cho RQ2.
- Một mô hình học viên ngẫu nhiên dùng chung hỗ trợ so sánh so cặp cho RQ3.

Các nguồn này trả lời những câu hỏi kỹ thuật có giới hạn và không thay thế được một nghiên cứu thực địa với nhân viên.

**Phạm vi trường hợp.** Nghiên cứu ban đầu bao gồm Application Developer ở ba cấp.
- Chuyên môn của người rà soát có thể gồm phát triển phần mềm, AI và IoT, nhưng nhóm đối tượng và catalog được đánh giá vẫn là trường hợp vị trí đã chọn.
- Version 3 loại trừ việc tạo nội dung giáo dục đầy đủ.
- Trước khi khóa benchmark, cần rà mô tả học phần giả lập, learning outcomes, ánh xạ kỹ năng và cấp độ, tiên quyết và tính tương thích phiên bản. Không cần bài học hoàn chỉnh.

**Catalog nghiên cứu dựng lại.**
- 20 định danh kỹ năng được giữ lại, 60 cặp kỹ năng–cấp độ kiến thức và 72 đặc tả học phần giả lập.
- Junior có 18 nhóm bắt buộc, Middle 37 và Senior 49.
- 31 cạnh tiên quyết có hướng và các outcomes do nhóm tự viết vẫn chờ chuyên gia rà soát. Kiểm tra cấu trúc không đồng nghĩa với phê duyệt của chuyên gia.
- Một bản nháp riêng có 500 hồ sơ giả lập, chia 450 development và 50 giữ riêng. Với 50 hồ sơ giữ riêng, hai chuyên gia đã nộp danh sách ưu tiên, và phần giao đúng mã của hai danh sách là tham chiếu RQ1 hiện tại; chưa có nhãn độ phù hợp 0/1/2 đầy đủ trên catalog.

**Giới hạn của RQ1.** Bộ lập lộ trình ban đầu hiện tại chọn các phương án đã ánh xạ hợp lệ và sắp thứ tự tất định.
- Nó không đưa ra bảng xếp hạng độ phù hợp có học máy, và không mở rộng mọi tiên quyết chưa được đánh giá.
- Vì vậy RQ1 đo một adapter đánh giá dựa trên ánh xạ tường minh, so với khớp văn bản.
- RQ1 không thể tách riêng hiệu ứng của cấu trúc tiên quyết tại snapshot ban đầu đó. Giới hạn này phải được nêu rõ trong bài báo cuối.

**Mâu thuẫn chính sách của RQ3 (đã giải quyết).** Engine động dùng bằng chứng đánh giá thực tế để xem lại nhu cầu tiên quyết.
- Phiên bản 0.3 ghi nhận một mâu thuẫn: mã có thể đánh dấu một bước tiên quyết là ASSESSED_SATISFIED từ bằng chứng đạt tương thích, trong khi tài liệu nghiệp vụ cũ mô tả việc bổ sung kéo dài cho tới khi học xong.
- Mâu thuẫn này đã được giải quyết: trong runtime hiện tại, việc học tiên quyết đã giao được giữ cho tới khi có bằng chứng chính thức, và các test bước chuyển runtime xác nhận điều đó.
- Một bước lộ trình đã giải quyết không bao giờ được tính là thành tích mục tiêu chính thức.

## Tách biệt dữ liệu và rà soát

**Dữ liệu RQ1.** RQ1 hiện có 500 hồ sơ giả lập nháp: 450 cho development và 50 giữ riêng cho đánh giá cuối.
- 10 hồ sơ development được chọn cho pilot gắn nhãn.
- Đầu vào gold50 đã có danh sách đồng thuận của hai chuyên gia nhưng chưa có nhãn có thang điểm đầy đủ, nên chưa phải là golden set đã xác minh.
- Rà catalog và hồ sơ vẫn là điều kiện tiên quyết cho đánh giá cuối.
- Ít nhất hai chuyên gia thật chấm độc lập trước khi phân xử.
- Không nhãn test cuối nào được dùng để chỉnh cách chấm, đặc trưng văn bản, quy tắc phá hoà hay việc sinh hồ sơ.

**Mục tiêu một tuần** gồm rà khung, rà catalog, chuẩn bị pilot và kiểm tra pilot. Đó không phải lời hứa rằng cả ba thí nghiệm cuối, việc gắn nhãn của chuyên gia và việc nộp bài báo sẽ xong trong tuần đó.

<!-- pagebreak -->

## Thí nghiệm 1: Độ phù hợp của gợi ý

**Snapshot và catalog.** Snapshot đánh giá được lấy sau bài đánh giá baseline và trước khi chuyên gia duyệt.
- Cả hai phương pháp xếp hạng cùng một catalog đủ điều kiện, khả dụng, tương thích phiên bản, trong cùng tổ chức.
- Thành tích chính thức hiện có và định nghĩa lỗ hổng đã thống nhất quyết định truy vấn.
- Chẩn đoán baseline và thành tích chính thức giữ ý nghĩa khác nhau.

**Hai adapter.**
- **G0 (đồ thị):** ưu tiên các ánh xạ khớp đúng yêu cầu kỹ năng–cấp độ chưa đạt. Vì bộ lập lộ trình hiện có không cung cấp điểm độ phù hợp, các trường hợp hoà dùng một hash định danh có seed cố định.
- **C0 (văn bản):** dùng độ tương đồng văn bản TF–IDF giữa mô tả lỗ hổng và văn bản đặc tả học phần đã rà. Định danh, nhãn duyệt và các đoạn văn bản lặp mẫu bị loại khỏi đặc trưng văn bản.

Cả hai adapter và mọi quy tắc phá hoà phải được cố định trước lần chạy trên tập giữ riêng.

**So sánh phụ.** Chỉ xếp hạng các ứng viên khớp chính xác cho cả hai phương pháp. Phép đối chứng này tách việc truy xuất trên toàn catalog khỏi việc sắp thứ tự giữa các ứng viên đã ánh xạ. Nó không thay thế phép đánh giá chính trên catalog chung, và không biến một danh sách ứng viên ngắn thành bằng chứng về chất lượng xếp hạng tốt.

**Cách chuyên gia chấm.**
- Chấm mức 0, 1 và 2 cho học phần không phù hợp, bổ trợ và phù hợp trực tiếp. Mức 2 xác định độ phù hợp nhị phân cho HR@5.
- Danh sách 5 ưu tiên và các phương án chấp nhận được ngang nhau được ghi riêng.
- Học phần chưa biết hoặc chưa được chấm không bao giờ bị đổi thành mức 0.
- Người rà soát không thấy tên phương pháp hay kết quả của phương pháp khi chấm độc lập.

**Thước đo.**
- **Điểm cuối chính:** HR@5 trung bình theo hồ sơ. Một lần trúng xảy ra khi ít nhất một trong 5 gợi ý đầu có mức 2.
- **Precision@5:** mẫu số là 5; trường hợp không đủ gợi ý được công bố.
- **Recall:** cần một tập tham chiếu dương đủ đầy đủ.
- **nDCG:** dùng gain tuyến tính và quy ước hoà cố định của protocol, và cần một bảng xếp hạng lý tưởng có cơ sở.
- Trường hợp không có mục dương hoặc chưa đầy đủ được xử lý theo một quy tắc rõ ràng, không bịa điểm.

**Công sức gắn nhãn.** Công sức gắn nhãn được đo trong pilot. Sau đó nhóm khóa phương án chấm toàn catalog, hoặc một thiết kế chấm hạn chế có ghi chép, trước đánh giá cuối.
- Với chấm hạn chế, mọi mục Top 5 được đánh giá đều phải được chấm, và bỏ các khẳng định recall hay nDCG không có cơ sở.
- Việc xếp hạng vẫn dùng toàn bộ catalog chung.

**Báo cáo.**
- Báo cáo chênh lệch so cặp theo từng hồ sơ, độ bất định và phân tích theo Junior/Middle/Senior.
- Đề xuất bootstrap 10.000 lần theo hồ sơ để ước lượng độ bất định; 50 hồ sơ giữ riêng là các đơn vị độc lập.
- Giữ bảng xếp hạng thô, nhãn độc lập, kết quả phân xử, danh sách loại trừ và hash cấu hình.
- Không báo cáo độ chính xác trên cả 500 hồ sơ sau khi đã dùng 450 hồ sơ để phát triển.

Chi tiết triển khai, công thức, trường hợp biên và yêu cầu bằng chứng nằm trong RQ1_RECOMMENDATION_RELEVANCE_EXPERIMENT_1.md và EXPERT_ANNOTATION_GUIDE.md.

<!-- pagebreak -->

## Thí nghiệm 2: Độ trễ truy vấn đồ thị có hướng

**Workload.** Workload đi theo các đường MicroSkill HAS_SKILL_PREREQUISITE có hướng, với khoảng cách ngắn nhất đã xác minh là ba, bốn hoặc năm hops. Đây là microbenchmark truy vấn. Nó không đo toàn bộ ứng dụng, không so sánh Neo4j với SQL, và không xác lập năng lực production.

**Đồ thị.** Tạo các snapshot ontology tách biệt, có phiên bản, với tổng số node thực tế là 1.000, 5.000 và 10.000.
- Ghi số lượng theo nhãn, số quan hệ, phân phối bậc và độ sâu tiên quyết, index và hash đồ thị.
- Báo cáo riêng số node MicroSkill.
- Khi tăng kích thước đồ thị phải giữ một workload liên thông có ý nghĩa; thêm các node rời rạc không liên quan không thể thay cho việc duyệt tiên quyết khó hơn.

**Fixture.** Mỗi quy mô và seed nhận 1.000 cặp điểm đầu/cuối duy nhất, phân bổ cân bằng giữa 3, 4 và 5 hops.
- Xác thực độc lập điểm đầu/cuối, hướng quan hệ và khoảng cách ngắn nhất so với đồ thị đã khóa.
- Phép tìm kiếm theo chiều rộng ngoại tuyến và truy vấn database phải khớp nhau.
- Phép tìm shortestPath có giới hạn bắt đầu từ một hop và kiểm tra khoảng cách tìm được; nếu chỉ tìm đường dài từ ba trở lên thì có thể che mất một đường thật ngắn hơn.

**Lặp và môi trường.**
- Thiết kế đề xuất: ba seed đồ thị, ba khối đo cho mỗi seed, 50 truy vấn khởi động mỗi khối, thứ tự truy vấn ngẫu nhiên và thứ tự quy mô cân bằng. Các giá trị này vẫn là đề xuất pilot.
- Ghi driver, database, Java, phần cứng, bộ nhớ, tình trạng sẵn sàng của index và chính sách cache.
- Đo cùng một ranh giới, từ lúc gửi request tới lúc đọc hết kết quả, bằng đồng hồ đơn điệu.

**Lưu và báo cáo.**
- Lưu mọi thời gian và kết quả.
- Báo cáo trung vị, trung bình, P95, số lỗi và độ biến động theo đồ thị và theo khối, kèm quy ước phân vị đã chọn.
- Kiểm tra số lượng và định danh đồ thị trước và sau khi chạy.
- Không được có độ lệch giả lập, mức sàn độ trễ hay bảng so sánh cố định nào trong kết quả đo.

## Bằng chứng chẩn đoán service hiện có

Lần chạy chẩn đoán ngày 22/11/2026 dùng một đồ thị cục bộ thật có 1.059 nodes và 4.795 quan hệ ở mọi quy mô được yêu cầu. Service báo 1.098, 5.000 và 10.000 nodes cho ba thiết lập và có áp điều chỉnh thời gian. Vì vậy các giá trị độ trễ nó trả về không thể trả lời câu hỏi quy mô của RQ2.

Trong 300 dòng fixture được kiểm tra, với điều kiện cũ (trộn nhiều loại quan hệ, không có hướng):
- 225 dòng không có đường.
- 14 dòng có đường ngắn hơn 3 hops.
- 61 dòng có đường 3–5 hops.

Mẫu này là bằng chứng chẩn đoán, không phải xác thực toàn bộ fixture hay workload có hướng mới. Một kết quả "không có đường" không phân biệt được điểm đầu/cuối bị thiếu với một cặp không tới được.

Từ sau audit, một trình chạy độc lập đã đo trên các đồ thị tách biệt thật 1.000, 5.000 và 10.000 nodes, với fixture 3/4/5 hops được Cypher xác thực. Phần còn phải sửa: xuất đủ mẫu đo thô (hiện giữ 30 thời gian), báo cáo theo độ sâu và nhiều seed đồ thị. Audit gọi trực tiếp các phương thức của service; nó không kiểm tra phân quyền HTTP hay hành vi UI. Protocol và bằng chứng được giữ trong RQ2_GRAPH_LATENCY_EXPERIMENT_2.md và evidence/rq2/20261122-current-service-audit/.

<!-- pagebreak -->

## Thí nghiệm 3: Hiệu quả lộ trình thích ứng

**So sánh.** So sánh 100 học viên mô phỏng dưới chính sách thích ứng và chính sách tĩnh, với cùng trạng thái ban đầu, cùng yêu cầu mục tiêu và cùng ngân sách hoạt động.
- Chính sách tĩnh khóa chương trình ban đầu nhưng cho phép làm lại.
- Chính sách thích ứng dùng chính sách tính lại theo bằng chứng đã khóa.
- Một chương trình tĩnh chứa toàn bộ tiên quyết là đối chứng độ nhạy, không phải một baseline thay thế không ghi chép.

**Điểm cuối chính** là khoảng cách còn lại tới thành tích mục tiêu chính thức tại một ngân sách chung.
- Khoảng cách là số yêu cầu mục tiêu chính thức chưa đạt chia cho số yêu cầu mục tiêu cố định. Khoảng cách thấp hơn nghĩa là đạt nhiều hơn trong mô phỏng.
- Công học tiên quyết bên ngoài tiêu tốn công sức nhưng không làm tăng mẫu số mục tiêu.
- Đạt chẩn đoán, bypass và các bước lộ trình đã giải quyết, tự chúng, không phải thành tích chính thức.

**Ngân sách.** Ngân sách đề xuất là 40 đơn vị hành động; học và đánh giá đều tốn một đơn vị, và lần làm trượt cũng tốn công sức.
- Các mốc trung gian, tỷ lệ chi phí và độ dài ngân sách khác được dùng để đánh giá độ nhạy.
- Các con số này phải được rà và khóa sau pilot.
- Khi một chính sách bị kẹt hoặc hết hành động khả dụng, giữ nguyên trạng thái của nó tại mốc chung, thay vì âm thầm loại học viên đó.

**Mô hình học viên dùng chung** phụ thuộc vào kiến thức ban đầu, lịch sử học và kiến thức tiên quyết.
- Việc học làm tăng một trạng thái kiến thức mô phỏng có chặn.
- Khả năng làm đúng bài phụ thuộc vào trạng thái đó, với các tham số đoán mò, sơ suất và tiên quyết dùng chung.
- Không chính sách nào được xác suất thành công cao hơn sẵn.
- Cùng các kết quả ở mức câu hỏi đi qua quy tắc chấm và bằng chứng thật; không chính sách nào nhìn được kết quả tương lai ẩn hay trạng thái tiềm ẩn mà ứng dụng không có.

**Kiểm tra độ nhạy và số ngẫu nhiên.** Protocol chi tiết đề xuất các khoảng tham số và một phép kiểm tra độ nhạy theo hiệu ứng tiên quyết, kể cả hiệu ứng bằng 0. Phép này kiểm tra xem lợi thế thích ứng có phần lớn do bộ mô phỏng áp đặt hay không. Các sự kiện ngẫu nhiên dùng chung được khóa theo học viên, lần lặp, kỹ năng và ngữ cảnh lần làm, chứ không chỉ lấy tuần tự từ một luồng ngẫu nhiên sau khi các chính sách đã rẽ nhánh.

**Lặp và phân tích.**
- Đề xuất 30 lần lặp ngẫu nhiên cho mỗi học viên. Các lần lặp định lượng nhiễu mô phỏng; chúng không tạo ra 3.000 học viên độc lập.
- Ước lượng hiệu ứng so cặp ở mức học viên, với độ bất định theo cụm.
- Kết quả phụ: so sánh công sức để đạt cùng một ngưỡng thành tích, giữ cả những người không đạt, và dùng cắt phải (right-censoring) rõ ràng thay vì chỉ lấy trung bình các trường hợp thành công.

**Trạng thái:** mâu thuẫn ASSESSED_SATISFIED đã được giải quyết, pilot chạy qua chính các bước chuyển của engine, và schema sự kiện được ghi kèm mỗi lần chạy. Trước lần chạy cuối, chuyên gia vẫn phải rà các giả định mô phỏng. Kết quả chỉ hỗ trợ các kết luận có điều kiện theo bộ mô phỏng này. Chúng không chứng minh nhân viên thật học nhanh hơn, hay tính hợp lệ của một mô hình Bayesian Knowledge Tracing.

RQ3_PATHWAY_EFFICIENCY_EXPERIMENT_3.md chứa các phương trình mô hình, yêu cầu về sự kiện và đặc tả phân tích.

<!-- pagebreak -->

## Tái lập và tính hợp lệ

**Manifest và dữ liệu thô.** Mỗi lần chạy cần một manifest gồm phiên bản protocol, phiên bản mã, môi trường thực tế, hash dữ liệu, seed, tham số, thời điểm bắt đầu và kết thúc, ranh giới đo và danh sách loại trừ.
- Các mẫu template phải để trống rõ ràng cho tới khi chạy thật.
- Số đo thô và vết sự kiện là bất biến; các bảng suy ra phải tái tạo được từ chúng.
- Lần chạy mới dùng thư mục mới thay vì ghi đè bằng chứng cũ.

**Rủi ro về cấu trúc khái niệm (construct)** chủ yếu gồm:
- Đánh đồng ánh xạ trực tiếp với suy luận trên đồ thị.
- Coi trạng thái chẩn đoán là thành tích chính thức.
- Trình bày hiệu quả trong mô phỏng như hiệu quả học tập của con người.

Thiết kế xử lý các rủi ro này bằng định nghĩa adapter tường minh, mẫu số mục tiêu chính thức cố định và các khẳng định có giới hạn. Bất đồng giữa chuyên gia, phương án thay thế thưa thớt và nhận định chưa đầy đủ vẫn là mối đe doạ với tính hợp lệ của độ phù hợp, và phải được báo cáo.

**Tính hợp lệ nội tại** phụ thuộc vào catalog ứng viên chung, nhãn giữ riêng, quy mô đồ thị đúng, điều kiện học viên so cặp và quy tắc ngẫu nhiên trung lập với chính sách.

**Tính hợp lệ bên ngoài** bị giới hạn bởi một nhóm vị trí, hồ sơ giả lập, cấu trúc đồ thị được sinh và một mô hình học viên chưa hiệu chỉnh. Cần một tổng quan tài liệu rộng hơn và đánh giá với con người sau này trước khi đưa ra khẳng định giáo dục rộng hơn.

## Lịch chuẩn bị và các cổng quyết định

- **Ngày 1:** rà vấn đề nghiên cứu, các RQ đã đăng ký, thuật ngữ và ranh giới bằng chứng với nhóm và giảng viên.
- **Ngày 2:** cùng chuyên gia kiểm tra catalog Application Developer và yêu cầu của vị trí; ghi các chỉnh sửa và năng lực của người rà soát.
- **Ngày 3:** gắn nhãn độc lập 5–10 hồ sơ development; đo công sức, giải quyết chỗ mơ hồ của rubric và xác định độ phủ chấm khả thi.
- **Ngày 4:** chuẩn bị bản sửa triển khai RQ2 và thiết kế đồ thị/fixture tách biệt; xác nhận yêu cầu kiểm tra số lượng thực tế và khoảng cách ngắn nhất.
- **Ngày 5:** giải quyết chính sách bằng chứng của RQ3, rà mô hình học viên và chuẩn bị các ca kiểm tra tương đương vết.
- **Ngày 6:** chỉ chạy các pilot khả dụng sau khi điều kiện triển khai của chúng đạt; giữ bằng chứng thô và liệt kê mọi kiểm tra bị chặn.
- **Ngày 7:** rà bằng chứng pilot, khóa các thiết lập có lý giải và chuẩn bị quyết định sẵn sàng cho lần chạy cuối. Nếu các cổng chưa xong, tiếp tục chuẩn bị thay vì tuyên bố các thí nghiệm cuối đã hoàn tất.

**Bảy cổng pilot** bao gồm: chất lượng catalog, độ tin cậy và công sức gắn nhãn, tách biệt dữ liệu, độ trung thực về quy mô đồ thị, tính toàn vẹn của workload, tương đương giữa bộ mô phỏng và chính sách, và phân tích tái lập được. PILOT_PLAN.md định nghĩa bằng chứng cho từng cổng. Tính tới 25/11/2026, việc rà catalog, độ phủ gắn nhãn đầy đủ và việc chuyên gia rà các thiết lập mô phỏng vẫn còn mở; câu hỏi chính sách của RQ3 đã được giải quyết.

## Đầu ra dự kiến của bài báo

Bài báo cuối nên báo cáo:
- **RQ1:** độ phù hợp so cặp và độ bất định.
- **RQ2:** phân phối độ trễ hợp lệ theo quy mô đồ thị thực tế.
- **RQ3:** đường cong khoảng cách so cặp cùng chi phí đạt mục tiêu có cắt phải.

Giải thích kết quả trung tính hoặc bất lợi cẩn thận như các cải thiện. Phần kết luận phải trả lời từng RQ trong ranh giới thí nghiệm của nó, và chỉ ra những phát hiện nào cùng nhau ủng hộ việc dùng hiện vật được đánh giá.

<!-- pagebreak -->

## Tài liệu tham khảo

[R1] Peffers, K., Tuunanen, T., Rothenberger, M. A., and Chatterjee, S. 2007. A Design Science Research Methodology for Information Systems Research. Journal of Management Information Systems 24(3), 45–77. https://doi.org/10.2753/MIS0742-1222240302

[R2] Frej, J., Shah, N., Knežević, M., Nazaretsky, T., and Käser, T. 2024. Finding Paths for Explainable MOOC Recommendation: A Learner Perspective. LAK 2024. https://doi.org/10.1145/3636555.3636898

[R3] Afreen, N., Balloccu, G., Boratto, L., Fenu, G., Malloci, F. M., Marras, M., and Martis, A. G. 2025. Can Path-Based Explainable Recommendation Methods based on Knowledge Graphs Generalize for Personalized Education? In Proceedings of the 33rd ACM Conference on User Modeling, Adaptation and Personalization (UMAP '25), 273–278. https://doi.org/10.1145/3699682.3728323

[R4] Cheng, X., Zhang, Z., Wang, J., Fang, L., He, C., Guan, Q., Pan, S., and Luo, W. 2025. GraphRAG-Induced Dual Knowledge Structure Graphs for Personalized Learning Path Recommendation. arXiv:2506.22303v2. Preprint. https://arxiv.org/abs/2506.22303

[R5] Corbett, A. T., and Anderson, J. R. 1994. Knowledge tracing: Modeling the acquisition of procedural knowledge. User Modeling and User-Adapted Interaction 4, 253–278. https://doi.org/10.1007/BF01099821

[R6] Krichene, W., and Rendle, S. 2020. On Sampled Metrics for Item Recommendation. In Proceedings of the 26th ACM SIGKDD International Conference on Knowledge Discovery & Data Mining (KDD '20), 1748–1757. https://doi.org/10.1145/3394486.3403226

[R7] Kalibera, T., and Jones, R. 2013. Rigorous Benchmarking in Reasonable Time. ISMM 2013, 63–74. https://doi.org/10.1145/2464157.2464160

Tổng quan tài liệu ban đầu và ghi chú truy cập được ghi trong RELATED_WORK.md. Metadata của R3 và R6 đã được đối chiếu với Crossref ngày 25/11/2026. Tổng quan này có trọng tâm, không có hệ thống, và không xác lập một khẳng định về tính mới đầy đủ.

## Hồ sơ nghiên cứu hỗ trợ

- Các câu hỏi đã đăng ký được giữ trong Version 3 do người dùng cung cấp, mục 3.3.
- Các đoạn liên quan về nghiên cứu và phạm vi nội dung, kèm hash nguồn, được giữ trong sources/version-3/research-scope-extract.md.
- Việc kiểm tra bản triển khai phân biệt ba phần: lập lộ trình ban đầu, tính lại do bằng chứng kích hoạt, và xử lý thành tích chính thức.
- Phiên bản mã lúc chuẩn bị khung là 2220fc2e48e69e685b3f714f24522f4c04e228a1; nó không thay thế cho một manifest mã nguồn thí nghiệm đã khóa.

Đi kèm khung này có ba file protocol, hướng dẫn gắn nhãn của chuyên gia, kế hoạch pilot, quy tắc dữ liệu và tái lập, các mẫu template và audit chẩn đoán. File tiếng Việt HUONG_DAN_THUC_HIEN_RESEARCH.md giải thích thứ tự đọc, các bước tiếp theo trong thực tế và nơi lưu trữ cho nhóm. Kết quả pilot được báo cáo trong RESEARCH_MANUSCRIPT.md; khung này không báo cáo kết quả thí nghiệm cuối.
