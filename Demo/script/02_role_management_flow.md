# Kịch bản thuyết trình Demo: Từ Bước 3 đến Bước 7
## Khung Quản trị Năng lực: Phân quyền Expert → Quản trị Tri thức Ontology → Cấu hình & Xuất bản Target Roles

> **Mục tiêu tài liệu:** Cung cấp hướng dẫn chi tiết từng bước cho người thuyết trình trước Hội đồng chấm Capstone, bao gồm:
> - **Thao tác giao diện** (Click gì, màn hình nào, tài khoản nào).
> - **Lời thoại thuyết trình (Nói gì)** (Tập trung ngôn từ chuyên nghiệp, tự tin, chuẩn B2B enterprise).
> - **Lý do & Ý nghĩa sư phạm / kỹ thuật (Tại sao)** (Giải thích vì sao hệ thống làm như vậy để gây ấn tượng mạnh với giám khảo).

---

## Bảng phân vai tài khoản trong phần Demo này

| Tài khoản | Tên hiển thị | Vai trò hệ thống | Trách nhiệm chính trong luồng |
| :--- | :--- | :--- | :--- |
| `minhhoang10372@gmail.com` | **Sarah Mitchell** | L&D Manager | Giao quyền bảo trì role, kiểm định chất lượng, phê duyệt xuất bản (Publish) |
| `kzvn10372@gmail.com` | **David Thompson** | Domain Expert | Nạp ontology, chuẩn hoá đồ thị tri thức, cấu hình chi tiết cây năng lực |
| Mật khẩu chung | `Brightpath@Demo2026` | - | Áp dụng cho mọi tài khoản demo trên workspace `brightpath` |

---

## PHẦN 1. Bước 3: L&D Manager phân quyền bảo trì Target Roles cho Domain Expert

### 1. Thao tác thực hiện trên màn hình
- **Đăng nhập:** `Sarah Mitchell` (L&D Manager).
- **Điều hướng:** Truy cập **Roles** (`/workspace/brightpath/ld-manager/roles`).
- **Thực hiện phân quyền cho 3 roles thuộc bộ phận Software Engineering:**
  1. Role **`JAVA-BE – Java Backend Developer`** → Bấm **Edit Role & Assigned Expert** → Chọn Assigned Expert: `David Thompson` → Bấm **Save & Send to Expert**.
  2. Role **`REACT-FE – React Frontend Developer`** → Bấm **Edit Role & Assigned Expert** → Chọn Assigned Expert: `David Thompson` → Bấm **Save & Send to Expert**.
  3. Role **`NODE-BE – Node.js Backend Developer`** → Bấm **Edit Role & Assigned Expert** → Chọn Assigned Expert: `David Thompson` → Bấm **Save & Send to Expert**.

### 2. Lời thoại thuyết trình (Nói gì với Hội đồng)
- *"Kính thưa Hội đồng, sau khi tổ chức đã hoàn thành việc thiết lập cơ cấu tổ chức và tài khoản nhân sự, bước đầu tiên trong quản trị năng lực là phân định trách nhiệm rõ ràng."*
- *"Ở vai trò L&D Manager Sarah Mitchell, tôi quản lý danh mục các vị trí công việc chiến lược của công ty. Tuy nhiên, L&D Manager không thể tự mình am hiểu sâu sắc từng kỹ năng chuyên sâu của lập trình viên Java, React hay Node.js."*
- *"Vì vậy, hệ thống cung cấp quy trình uỷ quyền chuyên môn: Sarah sẽ giao quyền bảo trì khung năng lực (Maintain Role) của 3 vị trí chủ chốt trong khối Kỹ thuật phần mềm cho Domain Expert David Thompson."*
- *"Khi bấm 'Save & Send to Expert', trạng thái của vai trò chuyển sang Staged for Expert, và David Thompson sẽ ngay lập tức nhận được quyền tác nghiệp xây dựng cây năng lực cho 3 vị trí này."*

### 3. Lý do & Ý nghĩa thiết kế (Tại sao hệ thống làm như vậy)
- **Nguyên lý phân tách trách nhiệm (Separation of Concerns):** Phân chia rõ ràng giữa nhà quản trị đào tạo vĩ mô (L&D Manager - quản lý mục tiêu, ngân sách, xuất bản) và chuyên gia nghiệp vụ chuyên sâu (Domain Expert - nắm vững kỹ thuật, cấu trúc kỹ năng).
- **Quy trình uỷ quyền hai chiều (Two-way Handshake) chuẩn Enterprise:** Tránh việc một cá nhân tự ý đưa ra chuẩn năng lực mà không qua thẩm định. L&D Manager giao việc $\rightarrow$ Expert thiết kế $\rightarrow$ L&D Manager kiểm duyệt lần cuối trước khi ban hành.

---

## PHẦN 2. Bước 4: Domain Expert nạp danh mục Năng lực miền (Domain Competencies)

### 1. Thao tác thực hiện trên màn hình
- **Đổi tài khoản:** Đăng xuất Sarah Mitchell $\rightarrow$ Đăng nhập `David Thompson` (Domain Expert).
- **Điều hướng:** Vào mục **Ontology** (`/workspace/brightpath/expert/ontology`) → Chọn tab **Competencies**.
- **Thao tác Import:**
  - Bấm nút **Import Excel** ở góc trên bên phải.
  - Kéo thả hoặc duyệt chọn file: `Demo/03_Competencies_JavaBackend.xlsx`.
  - Màn hình hiển thị bảng **Preview** với 5 nhóm năng lực cốt lõi:
    - `COMP-JAVA-CORE`: Java Core & Object-Oriented Programming
    - `COMP-SPRING`: Spring Boot Service Development
    - `COMP-DATA`: Relational Data & Persistence
    - `COMP-API`: REST API Design & Security
    - `COMP-QUALITY-OPS`: Testing, Delivery & Observability
  - Bấm **Import Competencies** → Nhận thông báo thành công `5 competencies imported`.

### 2. Lời thoại thuyết trình (Nói gì với Hội đồng)
- *"Bây giờ, tôi đăng nhập dưới vai trò Chuyên gia chuyên môn David Thompson để bắt đầu số hoá tri thức kỹ thuật của tổ chức."*
- *"Trong mô hình quản trị năng lực của dự án, Năng lực (Competency) đại diện cho các cụm năng lực miền nghiệp vụ lớn, tương thích với các khung chuẩn quốc tế như O\*NET và SFIA cấp độ 3-4."*
- *"Thay vì bắt chuyên gia phải nhập liệu thủ công hàng trăm trường thông tin, hệ thống hỗ trợ chuẩn hoá và nạp hàng loạt thông qua tệp mẫu Excel có định dạng kiểm soát nghiêm ngặt."*
- *"Như Hội đồng có thể quan sát, chỉ sau 1 cú nhấp chuột, 5 nhóm năng lực nền tảng từ lập trình hướng đối tượng, kiến trúc Spring Boot, cơ sở dữ liệu đến bảo mật API và kiểm thử tự động đã được đưa vào Knowledge Graph của tổ chức."*

### 3. Lý do & Ý nghĩa thiết kế (Tại sao hệ thống làm như vậy)
- **Chuẩn hoá cấu trúc tri thức theo cấp bậc:** Competency đóng vai trò là "chiếc ô" bao bọc các kỹ năng vi mô liên quan, giúp đồ thị tri thức có tính mô-đun hoá cao và dễ quản trị.
- **Tối ưu năng suất cho B2B:** Doanh nghiệp thường đã có sẵn từ điển năng lực nội bộ dạng bảng tính; việc hỗ trợ template Excel giúp giảm 90% thời gian triển khai ban đầu (Time-to-Value).

---

## PHẦN 3. Bước 5: Domain Expert nạp Kỹ năng vi mô & Bổ sung kỹ năng tức thời

### 1. Thao tác thực hiện trên màn hình
- **Điều hướng:** Vẫn ở trang **Ontology**, chuyển sang tab **Micro-skills**.
- **Thao tác Import:**
  - Bấm **Import Excel** → Chọn file `Demo/04_MicroSkills_JavaBackend.xlsx`.
  - Màn hình preview xác nhận: 16 micro-skills, 17 liên kết thuộc về các Competency đã nạp ở bước 4, và 15 mối quan hệ ràng buộc tiên quyết (`HAS_SKILL_PREREQUISITE`).
  - Bấm **Import Micro-skills** → Hệ thống nạp thành công toàn bộ vào đồ thị.
- **Thao tác bổ sung nhanh (Tuỳ chọn để chứng minh tính linh hoạt):**
  - Bấm nút **+ Create Micro-skill** trên giao diện:
    - Code: `MS-KAFKA`
    - Name: `Apache Kafka Producers & Consumers`
    - Description: `Topics, partitions, consumer groups, offset management and idempotency.`
    - Gán Competency: `COMP-API` (hoặc `COMP-QUALITY-OPS`).
  - Bấm **Save** → Micro-skill mới lập tức xuất hiện trong danh mục.

### 2. Lời thoại thuyết trình (Nói gì với Hội đồng)
- *"Sau khi đã có khung năng lực tổng thể, bước tiếp theo là xác định các Kỹ năng vi mô (Micro-skills) - hạt nhân cốt lõi của việc đào tạo thích ứng."*
- *"Tôi tiếp tục nạp tệp số 04. Điểm đặc biệt của hệ thống là tệp này không chỉ chứa tên kỹ năng, mà còn định nghĩa sẵn: phương thức kiểm định (Verification Mode qua Bài học Module hoặc Chứng chỉ Certificate) cho từng cấp độ tri thức Foundation, Intermediate, Advanced, cùng mạng lưới quan hệ tiên quyết giữa các kỹ năng."*
- *"Đồng thời, hệ thống không bị đóng cứng vào file Excel: chuyên gia hoàn toàn có thể tự tạo bổ sung ngay một kỹ năng mới như Apache Kafka trực tiếp trên giao diện khi doanh nghiệp phát sinh công nghệ mới."*

### 3. Lý do & Ý nghĩa thiết kế (Tại sao hệ thống làm như vậy)
- **Độ mịn của tri thức (Granularity):** Micro-skill là đơn vị đo lường học tập nhỏ nhất, có thể quan sát và đánh giá chính xác (Measurable Learning Objective). Điều này cho phép thuật toán Adaptive Learning chẩn đoán đúng "lỗ hổng tri thức" thay vì bắt nhân viên học lại toàn bộ một môn học lớn.
- **Ràng buộc phụ thuộc có thứ tự:** Cột `Prerequisites` nạp vào bước này chính là tiền đề để xây dựng Đồ thị có hướng (Directed Acyclic Graph - DAG) trong Neo4j.

---

## PHẦN 4. Bước 6: Chuyên gia trực quan hoá & Tinh chỉnh quan hệ trên Explore Graph

### 1. Thao tác thực hiện trên màn hình
- **Điều hướng:** Vẫn ở Ontology, chuyển sang tab **Explore Graph**.
- **Quan sát tổng quan:** Đồ thị trực quan hiển thị toàn bộ mạng lưới Competency và Micro-skills liên kết với nhau bằng các con trỏ quan hệ động.
- **Thực hiện 3 thao tác tinh chỉnh (Minh hoạ Đồ thị Tri thức Sống):**
  1. **Đảo ngược quan hệ sai:** Chọn cạnh giữa `MS-JAVA-OOP` và `MS-JAVA-STREAM` $\rightarrow$ Bấm nút **Switch Direction** trên thanh công cụ đồ thị.
  2. **Xoá quan hệ bất hợp lý:** Chọn cạnh nối từ `MS-DOCKER` tới `MS-SPRING-WEB` $\rightarrow$ Bấm **Delete Relationship**.
  3. **Tạo quan hệ tiên quyết mới:** Bật chế độ **Connect Nodes** (hoặc kéo thả con trỏ chuột) từ node `MS-JAVA-CONC` (Lập trình đồng thời) nối sang `MS-SPRING-TX` (Quản trị Transaction).

### 2. Lời thoại thuyết trình (Nói gì với Hội đồng)
- *"Kính thưa Hội đồng, đây là một trong những điểm độc đáo nhất của Adapt-Learn-Graph: Màn hình Đồ thị Tri thức Sống (Living Knowledge Graph) được render tương tác."*
- *"Trong thực tế, khi nạp file từ nhiều phòng ban, dữ liệu có thể tồn tại những sai sót về logic sư phạm. Giao diện trực quan này cho phép chuyên gia phát hiện và sửa chữa ngay tại chỗ:"*
  - *"Ví dụ 1: Ban đầu đồ thị đang thể hiện 'Học Streams trước rồi mới học Hướng đối tượng' - điều này hoàn toàn sai logic. Tôi bấm 'Switch Direction' để đảo đúng chiều: Phải vững OOP trước khi học Streams."*
  - *"Ví dụ 2: Docker và Spring MVC bị nối nhầm quan hệ phụ thuộc. Tôi bấm 'Delete Relationship' để giải phóng ràng buộc thừa này."*
  - *"Ví dụ 3: Muốn xử lý Transaction phân tán nâng cao trong Spring, lập trình viên bắt buộc phải nắm vững Concurrency. Tôi bật 'Connect Nodes' và kéo nối trực tiếp 2 node này."*
- *"Mọi thao tác chỉnh sửa đồ thị trên màn hình đều gửi truy vấn Cypher cập nhật trực tiếp vào cơ sở dữ liệu Neo4j theo thời gian thực."*

### 3. Lý do & Ý nghĩa thiết kế (Tại sao hệ thống làm như vậy)
- **Phát hiện chu trình lỗi (Deadlock / Cycle Detection):** Trực quan hoá đồ thị giúp chuyên gia phát hiện ngay các vòng lặp phụ thuộc vô lý ($A \rightarrow B \rightarrow C \rightarrow A$) mà các bảng Excel truyền thống rất khó nhìn ra.
- **Trải nghiệm tương tác cấp chuyên gia (No-Code Graph Authoring):** Chuyên gia miền nghiệp vụ không cần biết ngôn ngữ Cypher vẫn có thể thao tác đồ thị đồ sộ bằng chuột mượt mà.

---

## PHẦN 5. Bước 7: Cấu hình Cây Năng Lực cho 3 Target Roles (Thủ công + Siêu tốc qua Excel)

### 1. Thao tác thực hiện trên màn hình

#### A. Cấu hình thủ công vai trò trọng tâm `JAVA-BE`
1. Vào **Roles** (`/workspace/brightpath/expert/roles`) → Chọn **JAVA-BE – Java Backend Developer** → Bấm **Configure Micro-skills** (biểu tượng cây bút).
2. **Quan sát Modal:** Giới thiệu thanh 3 tabs mới ở đầu modal:
   - `Manual Configuration`
   - `Publication Readiness & Validation`
   - `Import from Excel`
3. **Cấu hình chuẩn cấp bậc (Kiểm tra chuẩn xác số lượng):**
   - **Junior (1 Competency, 1 Micro-skill):**
     - `COMP-JAVA-CORE` : 1 skill ( `MS-JAVA-OOP` [F]).
   - **Middle (2 Competencies, 3 Micro-skills):**
     - `COMP-JAVA-CORE` : 2 skills ( `MS-JAVA-COLL` [I], `MS-JAVA-STREAM` [I]).
     - `COMP-DATA` : 1 skill ( `MS-SQL-INDEX` [I]).
   - **Senior (2 Competencies, 4 Micro-skills):**
     - `COMP-JAVA-CORE` : 2 skills ( `MS-JAVA-STREAM` [A], `MS-JAVA-CONC` [A]).
     - `COMP-SPRING` : 2 skills ( `MS-SPRING-DATA` [A], `MS-SPRING-TX` [A]).

   *(Lưu ý: Nếu demo tiếp Phần 8 với đủ 4 tình huống bao gồm Expert Bypass và Certificate, ở level Middle gán thêm `MS-API-SEC` [F] và `MS-DOCKER` [F]).*
4. **Kiểm tra Validation & Submit:**
   - Ở chân modal, bấm vào nút **Validation required: X issues to resolve** $\rightarrow$ Modal tự động chuyển sang tab **Publication Readiness & Validation** để hiển thị bảng ma trận kiểm tra (chưa đủ bài giảng/câu hỏi ngân hàng).
   - Bấm **Submit to L&D Manager** $\rightarrow$ Hệ thống vẫn cho phép gửi thành công mà không bị chặn, kèm thông báo gửi phê duyệt.

#### B. Cấu hình siêu tốc vai trò `REACT-FE` qua Excel
1. Chọn role **REACT-FE – React Frontend Developer** → Bấm **Configure Micro-skills**.
2. Bấm vào tab **Import from Excel**.
3. Tải lên tệp: `Demo/04a_RoleConfig_ReactFrontend.xlsx`.
4. Xem bảng **Configuration Preview**: 7 dòng cấu hình cho cả 3 cấp bậc Junior, Middle, Senior đều hiển thị icon tích xanh **Valid** (đã khớp mã với Ontology).
5. Bấm **Apply Configuration** $\rightarrow$ Giao diện tự động chuyển về tab **Manual Configuration** để chuyên gia rà soát lại $\rightarrow$ Bấm **Submit to L&D Manager**.

#### C. Cấu hình siêu tốc vai trò `NODE-BE` qua Excel
1. Chọn role **NODE-BE – Node.js Backend Developer** → Bấm **Configure Micro-skills**.
2. Chuyển sang tab **Import from Excel** → Tải lên tệp `Demo/04b_RoleConfig_NodeBackend.xlsx`.
3. Kiểm tra preview 9 dòng cấu hình đầy đủ $\rightarrow$ Bấm **Apply Configuration** $\rightarrow$ Bấm **Submit to L&D Manager**.

### 2. Lời thoại thuyết trình (Nói gì với Hội đồng)
- *"Sau khi Ontology đã hoàn chỉnh, Domain Expert bước vào nhiệm vụ quan trọng nhất: Xây dựng Cây năng lực tiêu chuẩn cho từng vị trí nghề nghiệp."*
- *"Chúng tôi hỗ trợ cả 2 phương thức tác nghiệp linh hoạt:"*
  - *"Với vai trò cốt lõi như Java Backend Developer, chuyên gia có thể cấu hình thủ công từng bậc Junior, Middle, Senior để định hình chính xác từng kỹ năng và mức độ tri thức yêu cầu."*
  - *"Đặc biệt, trong phiên bản nâng cấp này, chúng tôi đã tích hợp tab 'Publication Readiness & Validation' trực tiếp vào modal chỉnh sửa. Bấm vào nút cảnh báo ở footer, chuyên gia xem được ngay các tiêu chí cần chuẩn bị về bài học và ngân hàng câu hỏi mà không cần đóng mở nhiều màn hình phức tạp."*
  - *"Hơn thế nữa, chuyên gia không bị khóa quyền nộp bài: họ có thể Submit bản thiết kế sang L&D Manager bất cứ lúc nào, đúng với nguyên tắc phân quyền linh hoạt trong doanh nghiệp."*
  - *"Đối với các vai trò mở rộng như React Frontend Developer và Node.js Backend Developer, chúng tôi cung cấp tab 'Import from Excel'. Chỉ cần chọn file cấu hình mẫu, hệ thống sẽ đối soát tự động với Ontology, preview trực quan và áp dụng trọn vẹn 3 cấp bậc chỉ trong 3 giây. Sau đó tự động quay về màn hình kiểm tra để chuyên gia xác nhận trước khi bấm Submit."*

### 3. Lý do & Ý nghĩa thiết kế (Tại sao hệ thống làm như vậy)
- **Tối ưu trải nghiệm người dùng (UX Pro Max):** Việc đưa màn hình Validation vào trong modal và gắn nút điều hướng nhanh giúp loại bỏ hoàn toàn các thao tác thừa (phải tắt modal $\rightarrow$ ra ngoài mở View Details $\rightarrow$ xem xong lại quay lại Edit).
- **Tránh bế tắc quy trình (Unblocked Workflow):** Trong thực tế, việc chuẩn bị ngân hàng câu hỏi và giáo trình có thể do một nhóm khác phụ trách. Nếu ép buộc Expert phải có đủ 100% câu hỏi mới được lưu/nộp khung năng lực thì dự án sẽ bị đình trệ. Quyền quyết định xuất bản chính thức thuộc về L&D Manager ở bước sau.
- **Khả năng mở rộng quy mô (Enterprise Scalability):** Doanh nghiệp có hàng trăm vị trí công việc; cơ chế cấu hình qua Excel là giải pháp sống còn để số hoá hàng loạt các Target Roles mà không tốn hàng tuần nhập liệu.

---

## PHẦN 6. Bước 7.5: L&D Manager thẩm định & Xuất bản (Publish) 3 Target Roles

### 1. Thao tác thực hiện trên màn hình
- **Đổi tài khoản:** Đăng xuất David Thompson $\rightarrow$ Đăng nhập lại `Sarah Mitchell` (L&D Manager).
- **Điều hướng:** Vào **Roles** (`/workspace/brightpath/ld-manager/roles`).
- **Quan sát trạng thái:** Cả 3 roles `JAVA-BE`, `REACT-FE`, `NODE-BE` đều đang ở trạng thái **SUBMITTED** (hoặc Staged for Review).
- **Thực hiện phê duyệt & xuất bản:**
  1. Mở role **`JAVA-BE`** → Bấm **View Details** → Xem tab **Architecture Specifications** và **Publication Readiness & Validation** → Bấm **Publish Target Role** (hoặc Approve & Publish).
  2. Mở role **`REACT-FE`** → Bấm **View Details** → Bấm **Publish Target Role**.
  3. Mở role **`NODE-BE`** → Bấm **View Details** → Bấm **Publish Target Role**.
- **Kết quả:** Cả 3 vai trò chuyển sang trạng thái huy hiệu xanh **PUBLISHED / ACTIVE**.

### 2. Lời thoại thuyết trình (Nói gì với Hội đồng)
- *"Bây giờ, Sarah Mitchell quay trở lại hệ thống để hoàn tất chu trình quản trị."*
- *"Tại màn hình Target Roles của L&D Manager, 3 vị trí do chuyên gia gửi lên đã xuất hiện ở hàng đợi thẩm định. Sarah có thể mở View Details để đối chiếu sự thay đổi giữa các phiên bản (Diff View) và kiểm tra ma trận sẵn sàng xuất bản."*
- *"Sau khi thẩm định và phê duyệt, Sarah bấm 'Publish Target Role' cho cả 3 vị trí. Ngay lập tức, 3 vai trò nghề nghiệp này chính thức có hiệu lực trên toàn bộ tổ chức Brightpath, cho phép nhân viên có thể lựa chọn làm mục tiêu phát triển và hệ thống có thể tạo ra các lộ trình học tập cá nhân hoá thích ứng."*

### 3. Lý do & Ý nghĩa thiết kế (Tại sao hệ thống làm như vậy)
- **Khép kín vòng đời quản trị (Closed-loop Governance):** Tạo nên một dòng chảy dữ liệu hoàn chỉnh từ Tổ chức $\rightarrow$ Phân quyền $\rightarrow$ Khung năng lực $\rightarrow$ Thiết kế chi tiết $\rightarrow$ Xuất bản chính thức.
- **Cổng kiểm soát chất lượng (Quality Gate):** L&D Manager đóng vai trò chốt chặn cuối cùng, bảo đảm mọi chức danh công bố ra doanh nghiệp đều đã qua kiểm duyệt về cả mặt nghiệp vụ chuyên môn lẫn mục tiêu chiến lược của công ty.

---

## Tóm tắt 3 thông điệp "ghi điểm" cho phần thuyết trình này:
1. **Phân quyền chuẩn Enterprise:** Tách bạch ranh giới giữa Quản lý L&D (chiến lược & phê duyệt) và Chuyên gia (chuyên môn & cấu trúc kỹ năng).
2. **Đồ thị tri thức sống động:** Không phải dữ liệu chết trong bảng tính, mà là mạng lưới tri thức liên thông tương tác trực quan trên nền tảng Neo4j.
3. **Hiệu suất tác nghiệp vượt trội:** Kết hợp linh hoạt giữa cấu hình chuyên sâu thủ công và nạp hàng loạt bằng Excel, loại bỏ hoàn toàn các rào cản và thao tác thừa trong quy trình.
