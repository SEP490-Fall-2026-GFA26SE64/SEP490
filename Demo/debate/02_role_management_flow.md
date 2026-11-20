# Bộ câu hỏi phản biện & Hướng dẫn trả lời sắc bén: Luồng Quản trị Năng lực & Xuất bản Target Roles (Bước 3 đến Bước 7)

> **Tài liệu tham chiếu:** [02_role_management_flow.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/Demo/script/02_role_management_flow.md)  
> **Mục tiêu:** Trang bị cho sinh viên bộ câu hỏi "bẫy" và câu hỏi chuyên sâu mà Hội đồng chấm Capstone (đặc biệt là các thầy cô phụ trách môn Quản trị dự án, Kiến trúc phần mềm và Công nghệ giáo dục) thường đặt ra, kèm câu trả lời mẫu đạt điểm xuất sắc.

---

## NHÓM 1: CÂU HỎI VỀ PHÂN QUYỀN & MÔ HÌNH VẬN HÀNH DOANH NGHIỆP (BƯỚC 3)

### Câu 1: *"Tại sao hệ thống phải tách thành 2 vai trò L&D Manager và Domain Expert? Sao không để L&D Manager tự tạo và xuất bản role luôn cho nhanh, hoặc để Expert tự làm từ đầu đến cuối?"*
* **Ý đồ của Giám khảo:** Kiểm tra xem sinh viên có hiểu nghiệp vụ B2B thực tế không, hay chỉ đang vẽ thêm tính năng cho phức tạp.
* **Cách trả lời đạt điểm tối đa:**
  1. **Về mặt năng lực chuyên môn:** Trong doanh nghiệp quy mô vừa và lớn, bộ phận L&D (Learning & Development) chỉ nắm phương pháp luận đào tạo, ngân sách và chiến lược nhân sự vĩ mô. Họ không thể có đủ kiến thức kỹ thuật sâu sắc để biết một kỹ sư Java Senior cần bao nhiêu kỹ năng về Virtual Threads hay Spring Data JPA. Người duy nhất có chuyên môn đó là **Lead Engineer hoặc Technical Architect (Domain Expert)**.
  2. **Về mặt kiểm soát chất lượng (Quality Gate):** Nếu để Domain Expert tự xuất bản role, sẽ dễ dẫn đến tình trạng các phòng ban tự đặt ra tiêu chuẩn cục bộ, không ăn khớp với khung lương, tiêu chí đánh giá hiệu quả (KPIs) hay lộ trình thăng tiến chung của công ty.
  3. **Kết luận:** Cơ chế phân quyền hai chiều **(Two-way Handshake)**: *L&D Manager uỷ quyền $\rightarrow$ Expert thiết kế khung kỹ thuật $\rightarrow$ L&D Manager thẩm định và xuất bản* là chuẩn mực quản trị doanh nghiệp (Enterprise Governance), đảm bảo vừa đúng chuyên môn kỹ thuật, vừa đúng chiến lược kinh doanh.

---

### Câu 2: *"Nếu một vị trí có nhiều Domain Expert cùng cấu hình hoặc một Expert đổi ý muốn sửa lại khung năng lực đã xuất bản thì hệ thống xử lý như thế nào? Có cơ chế Versioning không?"*
* **Ý đồ của Giám khảo:** Đánh giá tính toàn vẹn dữ liệu (Data Integrity) và quản lý phiên bản (Version Control).
* **Cách trả lời đạt điểm tối đa:**
  1. **Quyền sở hữu độc quyền (Exclusive Assignment):** Tại một thời điểm, một Target Role chỉ được gán cho duy nhất 1 Domain Expert chịu trách nhiệm chính (Assigned Expert). Tránh tình trạng "nhiều người cùng sửa một bản nháp" gây ghi đè dữ liệu.
  2. **Cơ chế Versioning bất biến (Immutable Published Versions):** Khi một Target Role đã được L&D Manager bấm **Publish** (ví dụ bản `v1.0`), phiên bản đó trở thành **Bất biến (Immutable)**. Mọi nhân viên đang theo học lộ trình của `v1.0` sẽ không bị ảnh hưởng.
  3. **Quy trình cập nhật phiên bản mới (`v1.1` hoặc `v2.0`):** Nếu cần sửa đổi, hệ thống sẽ tạo ra một bản nháp phân nhánh (Draft Fork). Màn hình có sẵn tính năng **Target Role Version Diff** để so sánh trực quan xem phiên bản mới thêm/bớt kỹ năng nào so với bản cũ. Khi L&D Manager duyệt bản mới, nhân viên sẽ nhận được thông báo gợi ý nâng cấp lộ trình học.

---

## NHÓM 2: CÂU HỎI VỀ BẢN CHẤT ONTOLOGY & CẤU TRÚC TRI THỨC (BƯỚC 4 & 5)

### Câu 3: *"Tại sao phải chia thành 2 khái niệm 'Competency' và 'Micro-skill'? Tại sao không dùng trực tiếp Micro-skill cho đơn giản?"*
* **Ý đồ của Giám khảo:** Kiểm tra tư duy kiến trúc phân tầng tri thức sư phạm.
* **Cách trả lời đạt điểm tối đa:**
  1. **Khác biệt về độ mịn (Granularity):**
     * **Competency (Năng lực miền):** Là năng lực tổng hợp cấp cao, đại diện cho khả năng giải quyết một mảng công việc hoàn chỉnh (ví dụ: *Lập trình giao diện REST API & Bảo mật*). Doanh nghiệp dùng Competency để gắn với ngạch lương, tiêu chuẩn chức danh theo SFIA hoặc O*NET.
     * **Micro-skill (Kỹ năng vi mô):** Là đơn vị tri thức hạt nhân, có thể quan sát, đo lường và kiểm định được (Measurable Learning Objective - ví dụ: *Cấu hình JWT Filter trong Spring Security*).
  2. **Ý nghĩa với thuật toán Adaptive Learning:** Nếu chỉ dùng Competency, hệ thống chỉ biết nhân viên "yếu mảng API" và bắt họ học lại toàn bộ khoá học 40 giờ. Nhờ có tầng Micro-skill, thuật toán đồ thị phát hiện chính xác nhân viên chỉ hổng đúng 1 kỹ năng nhỏ (JWT), từ đó chỉ định bài học ngắn 15 phút, tiết kiệm 90% thời gian đào tạo cho doanh nghiệp.

---

### Câu 4: *"Dữ liệu Competency và Micro-skill trong file demo lấy từ đâu? Có căn cứ khoa học nào không hay nhóm tự bịa ra?"*
* **Ý đồ của Giám khảo:** Kiểm tra độ tin cậy và tính thực tế của dữ liệu dự án.
* **Cách trả lời đạt điểm tối đa:**
  * Dữ liệu hoàn toàn **không phải số liệu ngẫu nhiên**, mà được chuẩn hoá từ 3 nguồn uy tín quốc tế:
    1. **O\*NET Online (U.S. Department of Labor):** Tham chiếu mã nghề nghiệp `15-1252.00 (Software Developers)` và `15-1254.00 (Web Developers)`.
    2. **SFIA 9 (Skills Framework for the Information Age):** Áp dụng thang đo năng lực phần mềm quốc tế cấp độ 2 (Junior), 3 (Middle), 4 (Senior).
    3. **Roadmap.sh (Industry Standard Developer Roadmaps):** Tham chiếu trực tiếp cây kỹ năng thực tế của Java Backend và React Developer đang được hàng triệu kỹ sư phần mềm trên thế giới sử dụng.
  * Toàn bộ nguồn tham chiếu này đã được ghi chú minh bạch tại mục "Cơ sở thực tế của dữ liệu" trong tài liệu [Demo.md](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/Demo/Demo.md).

---

### Câu 5: *"Tại sao ở Bước 5, cùng một Micro-skill lại có cấp độ yêu cầu Module, có cấp độ lại yêu cầu Certificate? Tại sao không cho thi câu hỏi trắc nghiệm hết cho tiện?"*
* **Ý đồ của Giám khảo:** Kiểm tra sự am hiểu về phương pháp đánh giá năng lực thực tế.
* **Cách trả lời đạt điểm tối đa:**
  1. **Thang đo nhận thức Bloom (Bloom's Taxonomy):**
     * Ở cấp độ **Foundation / Intermediate:** Kiến thức dừng ở mức *Nhận biết & Ứng dụng*, hoàn toàn có thể kiểm tra hiệu quả bằng bài đọc, bài thực hành và câu hỏi trắc nghiệm chuẩn hoá (Module / Assessment Bank).
     * Ở cấp độ **Advanced:** Kiến thức đòi hỏi năng lực *Phân tích chuyên sâu, Tối ưu hoá & Xử lý sự cố phức tạp* (ví dụ: Tối ưu đa luồng Concurrency, thiết kế kiến trúc phân tán). Trắc nghiệm khách quan không thể đo lường trọn vẹn năng lực này.
  2. **Thực tiễn doanh nghiệp:** Doanh nghiệp yêu cầu ở mức Senior/Advanced, kỹ sư phải có chứng chỉ uy tín (AWS Certified Solutions Architect, Oracle Java Professional) hoặc phải nộp sản phẩm thực tế (Capstone project / Code portfolio) để chuyên gia thẩm định trực tiếp. Hệ thống hỗ trợ song song cả 2 hình thức để phản ánh đúng thực tế tuyển dụng.

---

## NHÓM 3: CÂU HỎI VỀ ĐỒ THỊ TRI THỨC TRÊN NEO4J & TƯƠNG TÁC GRAPH (BƯỚC 6)

### Câu 6: *"Tại sao phải dùng Graph Database Neo4j mà không dùng PostgreSQL với bảng `prerequisites(skill_id, prereq_id)`? SQL vẫn SELECT đệ quy CTE được mà?"*
* **Ý đồ của Giám khảo:** Đây là **câu hỏi kinh điển và quan trọng nhất** của đề tài. Giám khảo muốn kiểm tra xem nhóm dùng Neo4j vì "bắt trend" hay vì yêu cầu bài toán thực sự.
* **Cách trả lời đạt điểm tối đa:**
  1. **Bản chất của phép JOIN đệ quy trong RDBMS:**
     * Trong PostgreSQL, quan hệ đệ quy $N$-hop đòi hỏi lệnh `WITH RECURSIVE` hoặc lồng nhiều phép `JOIN`. Mỗi lần JOIN, cơ sở dữ liệu quan hệ phải quét qua bảng chỉ mục B-Tree ($O(\log N)$) và bùng nổ không gian tích Descartes giữa các tập dữ liệu trung gian. Khi đồ thị sâu 4–5 hops, hiệu năng SQL suy giảm nghiêm trọng.
  2. **Cơ chế Index-Free Adjacency của Neo4j:**
     * Trong Neo4j, các quan hệ được lưu trữ trực tiếp dưới dạng **con trỏ bộ nhớ vật lý hai chiều (Physical Memory Pointers)** gắn liền trên từng node. Khi duyệt từ `Node A` sang các node tiên quyết `Node B, C`, thuật toán chỉ cần "lần theo con trỏ" (Pointer chasing) với chi phí $O(1)$ cho mỗi bước nhảy, hoàn toàn không tốn công tra cứu lại bảng Index.
  3. **Hiệu năng thực tế được chứng minh qua RQ2:**
     * Thực nghiệm khoa học của nhóm đã chứng minh: Khi ontology tăng từ 1.000 lên 10.000 nodes, độ trễ truy vấn sâu 3–5 hops của Neo4j chỉ tăng từ **8.4 ms lên 16.9 ms** (chỉ lệch 8.5 ms, tăng trưởng dưới tuyến tính Sub-linear), chứng minh tính khả thi vượt trội mà RDBMS không thể đạt được.

---

### Câu 7: *"Ở Bước 6, chuyên gia có thể kéo nối quan hệ tự do trên màn hình Explore Graph. Nếu họ vô tình tạo ra chu trình vòng tròn ($A \rightarrow B \rightarrow C \rightarrow A$) thì hệ thống xử lý thế nào? Thuật toán sinh lộ trình có bị lặp vô tận (Infinite Loop) không?"*
* **Ý đồ của Giám khảo:** Kiểm tra tính toàn vẹn của Đồ thị có hướng không chu trình (DAG - Directed Acyclic Graph).
* **Cách trả lời đạt điểm tối đa:**
  1. **Kiểm tra tức thời trước khi lưu (Pre-flight Cycle Detection):** Khi chuyên gia kéo nối 2 node trên giao diện, frontend và backend API sẽ kích hoạt thuật toán kiểm tra chu trình (DFS / Tarjan's Strongly Connected Components). Nếu việc tạo cạnh mới dẫn đến một chu trình khép kín, hệ thống sẽ chặn hành động, hiển thị thông báo lỗi màu đỏ giải thích rõ: *"Không thể tạo quan hệ vì sẽ gây ra chu trình phụ thuộc giữa các kỹ năng A, B, C"*.
  2. **Bảo vệ ở tầng thuật toán đồ thị:** Bản thân thuật toán tìm đường trong Neo4j (`shortestPath` và BFS hai chiều) luôn duy trì cấu trúc tập trạng thái `Visited Set`. Một node khi đã được ghé thăm trong nhánh duyệt hiện tại sẽ không bao giờ được đưa lại vào hàng đợi, do đó 100% không bao giờ xảy ra lỗi tràn bộ nhớ hoặc lặp vô tận.

---

## NHÓM 4: CÂU HỎI VỀ CẤU HÌNH TARGET ROLE & BỘ TIÊU CHÍ VALIDATION (BƯỚC 7)

### Câu 8: *"Tại sao trong modal Edit Role, dù chưa có đủ câu hỏi hoặc bài giảng nhưng hệ thống vẫn cho phép Expert bấm 'Submit to L&D Manager'? Như vậy có bị coi là lỏng lẻo và cho phép dữ liệu rác không?"*
* **Ý đồ của Giám khảo:** Kiểm tra xem sinh viên thiết kế logic nghiệp vụ theo lối "máy móc của lập trình viên" hay theo "dòng chảy công việc thực tế (Enterprise Workflow)".
* **Cách trả lời đạt điểm tối đa:**
  1. **Tính chất công việc thực tế của Chuyên gia:** Domain Expert có nhiệm vụ định nghĩa *Cấu trúc chuẩn năng lực* (Architecture Specification). Việc sản xuất bài giảng số (Learning Modules) và soạn 240 câu hỏi trắc nghiệm (Assessment Bank) thường do đội ngũ Content Creators, Giảng viên nội bộ hoặc nhóm khác đảm nhận.
  2. **Tránh bế tắc quy trình (Unblocking Principle):** Nếu hệ thống ép buộc phải có đủ 100% bài học và câu hỏi thì Expert mới được nộp khung năng lực, dự án sẽ bị tắc nghẽn (Deadlock). Expert cần nộp trước để L&D Manager nắm được nhu cầu kỹ năng, từ đó phê duyệt kế hoạch mua bài giảng hoặc huy động giảng viên soạn câu hỏi.
  3. **Chốt chặn an toàn nằm ở bước Publish:** Nút **Submit** của Expert không làm role có hiệu lực ngay. Cảnh báo Validation hiển thị minh bạch để Expert biết tình trạng sẵn sàng. Quyền kích hoạt chính thức thuộc về L&D Manager ở nút **Publish Target Role** - nơi hệ thống bắt buộc kiểm tra các điều kiện tối thiểu trước khi nhân viên có thể đăng ký học.

---

### Câu 9: *"Tính năng Import Role từ Excel hoạt động như thế nào nếu trong file Excel có chứa mã Competency hoặc Micro-skill bị viết sai, không tồn tại trong Ontology?"*
* **Ý đồ của Giám khảo:** Kiểm tra khả năng xử lý ngoại lệ (Edge Case Handling) và tính an toàn dữ liệu.
* **Cách trả lời đạt điểm tối đa:**
  1. **Cơ chế phân tích cú pháp an toàn (Defensive Parsing):** Hệ thống không nạp thẳng file vào database mà đưa qua bước trung gian là **Bảng xem trước (Configuration Preview)**.
  2. **Đối soát hai chiều (Two-way Reconciliation):** Từng dòng Excel được so khớp theo cả `Code` (mã định danh) và `Name` (tên hiển thị) với danh mục Ontology thực tế:
     * Dòng hợp lệ: Hiển thị huy hiệu xanh **Valid** kèm ID đã được ánh xạ.
     * Dòng sai mã: Hiển thị cảnh báo vàng **Warning** ghi rõ: *"Competency 'COMP-XYZ' không tồn tại trong ontology"*.
  3. **Không ghi đè mù quáng:** Chuyên gia chỉ có thể bấm **Apply Configuration** sau khi đã xem xét kỹ các cảnh báo. Khi áp dụng, hệ thống tự động đưa về tab **Manual Configuration** để chuyên gia rà soát lại trực quan 3 cấp bậc Junior, Middle, Senior trước khi quyết định Submit.

---

## TỔNG KẾT: 3 TỪ KHOÁ CHIẾN LƯỢC ĐỂ TỰ TIN ĐẠT ĐIỂM CAO

1. **"Separation of Concerns" (Phân định trách nhiệm):** L&D Manager nắm quản trị & xuất bản; Expert nắm kỹ thuật & cấu trúc năng lực.
2. **"Living Knowledge Graph" (Đồ thị tri thức sống):** Không phải dữ liệu chết trong bảng phẳng, mà là mạng lưới tri thức liên thông với con trỏ vật lý $O(1)$ trên Neo4j.
3. **"Unblocked Enterprise Workflow" (Dòng chảy linh hoạt):** Cung cấp công cụ cảnh báo thông minh, hỗ trợ nạp hàng loạt bằng Excel, không bắt người dùng làm những thao tác thừa thãi hay khoá chặn quy trình vô lý.
