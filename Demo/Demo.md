# Kịch bản demo: Onboarding → Users → Target Role

Tài liệu này chứa dữ liệu để **copy/paste** khi demo và các file Excel đã điền sẵn trong cùng thư mục:

| File | Dùng ở bước | Nội dung |
| --- | --- | --- |
| [01_Org_Structure_Brightpath.xlsx](./01_Org_Structure_Brightpath.xlsx) | 1. Onboarding (Your business → Import structure) | 4 department, 9 job position, 16 target role (4 role/phòng ban), 47 level |
| [02_Users_Brightpath.xlsx](./02_Users_Brightpath.xlsx) | 2. Admin import users | 1 L&D Manager, 1 Domain Expert, 1 Employee (có Current role + Level) |
| [03_Competencies_JavaBackend.xlsx](./03_Competencies_JavaBackend.xlsx) | 4. Expert import competency | 5 competency cho role Java Backend & liên quan |
| [04_MicroSkills_JavaBackend.xlsx](./04_MicroSkills_JavaBackend.xlsx) | 5. Expert import micro-skill | 16 micro-skill, 17 liên kết competency, 15 prerequisite |
| [04a_RoleConfig_ReactFrontend.xlsx](./04a_RoleConfig_ReactFrontend.xlsx) | 7. Expert import config React Frontend | Cấu hình nhanh 3 level qua tab Excel cho role `REACT-FE` |
| [04b_RoleConfig_NodeBackend.xlsx](./04b_RoleConfig_NodeBackend.xlsx) | 7. Expert import config Node.js Backend | Cấu hình nhanh 3 level qua tab Excel cho role `NODE-BE` |

Luồng: **Reset → Onboarding 7 bước → Import users → L&D giao Expert cho 3 roles → Expert import competency & micro-skill → Expert sửa quan hệ graph → Expert cấu hình 1 role thủ công + 2 roles import Excel → Expert submit cả 3 roles → L&D Manager duyệt và Publish cả 3 roles.**

---

## 0. Chuẩn bị

### 0.1. Reset dữ liệu demo

Mở trang sau trước mỗi lần demo. Trang tự xoá mọi organization/tài khoản/registration do demo tạo ra (Postgres, Neo4j, MinIO) và chỉ giữ dữ liệu seed (TechNova, tài khoản platform):

```text
http://localhost:8088/reset
```

> Đổi host/port cho đúng stack đang chạy (ví dụ `http://127.0.0.1:8099/reset`). Kết quả hiển thị số organization/tài khoản/registration đã xoá. Bấm **Reset again** để chạy lại, **Start onboarding** để vào thẳng wizard.
> ⚠️ Không mở `/reset` trên môi trường có dữ liệu thật – trang không yêu cầu đăng nhập.

### 0.2. Thanh toán

- Stack dev có `PAYOS_ENABLED=false` → bước Payment hiện **Development payment bypass**, không mất tiền.
- Nếu `.env` bật payOS thật (`PAYOS_ENABLED=true`), gói Starter là **4.900 VND** qua QR payOS. Muốn demo không tốn tiền thì khởi động API với `PAYOS_ENABLED=false`.

### 0.3. Email kích hoạt (quan trọng)

User import sẽ gửi **email kích hoạt thật** qua SMTP tới 3 hộp thư Gmail có sẵn trong `02_Users_Brightpath.xlsx` (sheet **Users**, cột **Email**):

```text
minhhoang10372@gmail.com  →  Sarah Mitchell (L&D Manager)
kzvn10372@gmail.com       →  David Thompson (Domain Expert)
proteccmee@gmail.com      →  James Wilson (Employee)
```

Cần truy cập được 3 hộp thư này để kích hoạt tài khoản. Gửi lời mời chạy tuần tự (~10–15 giây/người), 3 người mất dưới 1 phút.

---

## 1. Onboarding – wizard 7 bước

Mở `http://localhost:8088/register`.

### Bước 1 – Your business

| Field | Giá trị |
| --- | --- |
| Business name | `Brightpath Technologies Inc.` |
| Country | `United States` |
| Industry | `Software & artificial intelligence` |
| Workspace address | `brightpath` |

Bấm **Import structure** → chọn `01_Org_Structure_Brightpath.xlsx` → kiểm tra preview (Department: 4) → **Apply structure** → tiếp tục.

### Bước 2 – Administrator

| Field | Giá trị |
| --- | --- |
| Full name | `Michael Carter` |
| Login email | `hoangsusp@gmail.com` |
| Phone number | `+1 415 555 0123` |
| Password | `Brightpath@Demo2026` |
| Confirm Password | `Brightpath@Demo2026` |

Tick ô đồng ý điều khoản → **Create account**.

### Bước 3 – Verify email, Bước 4 – Account security

Ở stack dev hai bước này được bypass (tự chuyển tiếp). Nếu bật, nhập mã OTP gửi về Login email và quét QR MFA bằng ứng dụng Authenticator.

### Bước 5 – Choose a plan

**Continue to subscription plans** → **Select Starter** (20 Employee seats, 1 tháng) → trong hộp thoại *Confirm purchase terms* bấm **Create payment order**.

### Bước 6 – Payment

Dev: hiện **Development payment bypass**, đơn tự xác nhận. payOS thật: quét QR, chuyển đúng số tiền/nội dung, trang tự cập nhật.

### Bước 7 – Your workspace

Bấm **Enter workspace** → vào `http://localhost:8088/workspace/brightpath/admin/subscription`.

---

## 2. Admin import users (3 role)

Admin `Michael Carter` → **User Accounts** (`/workspace/brightpath/admin/users`) → **Import Excel** → chọn `02_Users_Brightpath.xlsx` → preview báo **3 valid** → **Import 3 valid user(s)** → chờ kết quả `3 invitation(s) sent. 0 row(s) not imported.` → **Done**.

| Full name | Email | Role | Department | Job position | Current role / Level |
| --- | --- | --- | --- | --- | --- |
| Sarah Mitchell | `minhhoang10372@gmail.com` | L&D Manager | HR | – (làm trưởng phòng HR) | – |
| David Thompson | `kzvn10372@gmail.com` | Domain Expert | ENG | Backend Engineer | – |
| James Wilson | `proteccmee@gmail.com` | Employee | ENG | Backend Engineer | `JAVA-BE - Java Backend Developer` / `Junior` |

Role import từ file 01 ở bước onboarding đã ở trạng thái **staged** nên gán được làm Current role ngay khi import user.

Mỗi người mở email → link `/activate` → đặt mật khẩu. Mật khẩu gợi ý cho mọi tài khoản demo (≥ 12 ký tự):

```text
Brightpath@Demo2026
```

Thêm user lẻ bằng tay (tuỳ chọn) qua **Create User**:

| Field | Giá trị |
| --- | --- |
| Full name | `Emily Clark` |
| Email | `demo.inbox+emily@example.com` |
| Role | Employee |
| Department | `ENG - Software Engineering` |
| Job position | `BE-ENG - Backend Engineer` |
| Current role / Level | `JAVA-BE - Java Backend Developer` / `Junior` |

---

## 3. L&D Manager giao Expert maintain 3 roles

Đăng nhập `Sarah Mitchell` → **Roles** (`/workspace/brightpath/ld-manager/roles`):

1. Role **JAVA-BE – Java Backend Developer** → **Edit Role & Assigned Expert**:
   - Assigned Expert: `David Thompson` → **Save & Send to Expert**.
2. Role **REACT-FE – React Frontend Developer** → **Edit Role & Assigned Expert**:
   - Assigned Expert: `David Thompson` → **Save & Send to Expert**.
3. Role **NODE-BE – Node.js Backend Developer** → **Edit Role & Assigned Expert**:
   - Assigned Expert: `David Thompson` → **Save & Send to Expert**.

*(Sau bước này, David Thompson có 3 target roles trong danh sách cần cấu hình cây năng lực).*

---

## 4. Expert import competency

Đăng nhập `David Thompson` → **Ontology** (`/workspace/brightpath/expert/ontology`) → tab **Competencies** → **Import Excel** → chọn `03_Competencies_JavaBackend.xlsx` → xác nhận import.

| Code | Name |
| --- | --- |
| `COMP-JAVA-CORE` | Java Core & Object-Oriented Programming |
| `COMP-SPRING` | Spring Boot Service Development |
| `COMP-DATA` | Relational Data & Persistence |
| `COMP-API` | REST API Design & Security |
| `COMP-QUALITY-OPS` | Testing, Delivery & Observability |

Tạo tay thêm 1 competency (tuỳ chọn) bằng **Add Competency**:

```text
Code:        COMP-MSG
Name:        Messaging & Event-Driven Integration
Description: Integrates services asynchronously with Kafka/RabbitMQ: topics, consumer groups, retries and idempotent consumers.
```

## 5. Expert import micro-skill

Cùng trang, tab **Micro-skills** → **Import Excel** → chọn `04_MicroSkills_JavaBackend.xlsx`. File phải import **sau** file competency để các liên kết `Competency_Skills` tìm được competency.

| Competency | Micro-skill |
| --- | --- |
| COMP-JAVA-CORE | `MS-JAVA-OOP`, `MS-JAVA-COLL`, `MS-JAVA-STREAM`, `MS-JAVA-CONC` |
| COMP-SPRING | `MS-SPRING-DI`, `MS-SPRING-WEB`, `MS-SPRING-DATA`, `MS-SPRING-TX` |
| COMP-DATA | `MS-SQL-QUERY`, `MS-SQL-INDEX`, `MS-DB-MIGRATE`, `MS-SPRING-DATA` |
| COMP-API | `MS-REST-DESIGN`, `MS-API-SEC` |
| COMP-QUALITY-OPS | `MS-JUNIT`, `MS-DOCKER`, `MS-OBSERV` |

`MS-JAVA-COLL`, `MS-DB-MIGRATE`, `MS-JUNIT` đều có Advanced và dùng Certificate theo file04 hiện tại. `MS-SPRING-DATA` dùng chung cho 2 competency (minh hoạ skill thuộc nhiều competency).

Tạo tay thêm 1 micro-skill (tuỳ chọn):

```text
Code:        MS-KAFKA
Name:        Apache Kafka Producers & Consumers
Description: Topics, partitions, consumer groups, offset management, retries and dead-letter topics with Spring for Apache Kafka.
Competency:  COMP-MSG
```

## 6. Expert điều chỉnh relationship trong Explore Graph

Trang ontology → **Explore Graph**. File 04 cố ý chứa **2 cạnh sai** để demo việc sửa graph:

| # | Thao tác | Cạnh (Dependent ← Prerequisite) | Lý do |
| --- | --- | --- | --- |
| 1 | Chọn cạnh → **Switch Direction** | `MS-JAVA-OOP` ← `MS-JAVA-STREAM` | Sai chiều: Streams cần OOP trước, không phải ngược lại |
| 2 | Chọn cạnh → **Delete Relationship** | `MS-DOCKER` ← `MS-SPRING-WEB` | Docker không phụ thuộc Spring MVC |
| 3 | Bật **Connect Nodes** (hoặc kéo nối 2 node) | `MS-SPRING-TX` ← `MS-JAVA-CONC` | Tạo trực tiếp cạnh prerequisite giữa 2 micro-skill (không cần chọn knowledge level): Isolation/locking nâng cao cần hiểu concurrency |

13 prerequisite đúng còn lại trong file (để tham khảo khi giải thích graph):

```text
MS-JAVA-STREAM ← MS-JAVA-COLL
MS-JAVA-CONC   ← MS-JAVA-OOP
MS-SPRING-DI   ← MS-JAVA-OOP
MS-SPRING-WEB  ← MS-SPRING-DI
MS-SPRING-WEB  ← MS-REST-DESIGN
MS-SPRING-DATA ← MS-SPRING-DI
MS-SPRING-DATA ← MS-SQL-QUERY
MS-SPRING-TX   ← MS-SPRING-DATA
MS-SQL-INDEX   ← MS-SQL-QUERY
MS-DB-MIGRATE  ← MS-SQL-QUERY
MS-API-SEC     ← MS-SPRING-WEB
MS-JUNIT       ← MS-SPRING-DI
MS-OBSERV      ← MS-DOCKER
```

## 7. Expert cấu hình cây năng lực và L&D Manager công bố 3 target roles

Luồng demo triển khai cấu hình cho 3 roles thuộc khối Engineering:
- **`JAVA-BE – Java Backend Developer`**: Cấu hình thủ công từng level (minh hoạ trải nghiệm tác nghiệp chi tiết của Domain Expert).
- **`REACT-FE – React Frontend Developer`**: Cấu hình siêu tốc qua tab **Import from Excel** (minh hoạ tính năng import cấu hình role hàng loạt không cần nhập tay).
- **`NODE-BE – Node.js Backend Developer`**: Cấu hình siêu tốc qua tab **Import from Excel**.
- **L&D Manager duyệt và Publish**: Cả 3 roles đều được submit và công bố thành công.

---

### Bước 7.1 – Cấu hình thủ công role JAVA-BE

Mở **Roles** (`/workspace/brightpath/expert/roles`) → role **JAVA-BE – Java Backend Developer** → bấm **Configure Micro-skills** (biểu tượng cây bút).

> **Giao diện mới trong Edit Role Modal:**
> Phía trên thanh chọn level có 3 tab chuyển đổi nhanh:
> 1. **Manual Configuration:** Cấu hình thủ công trực quan qua giao diện.
> 2. **Publication Readiness & Validation:** Kiểm tra trực tiếp các tiêu chí xuất bản (ma trận module, ngân hàng câu hỏi, prerequisite).
> 3. **Import from Excel:** Tải file cấu hình mẫu hoặc import cấu hình từ bảng tính Excel.

Cấu hình cây năng lực chuẩn logic cấp bậc:
- **Junior:** 1 Competency (1 micro-skill).
- **Middle:** 2 Competencies (1 competency có 2 micro-skills, 1 competency có 1 micro-skill → tổng 3 micro-skills).
- **Senior:** 2 Competencies (mỗi competency có đúng 2 micro-skills → tổng 4 micro-skills).

1. **Gán Competency cho từng Role Level**:
   - Ở thanh chọn **Role Levels**, bấm **All Levels (3)** (hoặc tick **Multi-level edit** để chọn cả `Junior`, `Middle`, `Senior`).
   - Trong ô **Select Competency**, chọn **`COMP-JAVA-CORE`** → bấm **Add Competency**.
   - Chọn riêng **`Middle`** → thêm **`COMP-DATA`** → bấm **Add Competency**. *(Middle có đúng 2 Competencies: `COMP-JAVA-CORE` và `COMP-DATA`).*
   - Chọn riêng **`Senior`** → thêm **`COMP-SPRING`** → bấm **Add Competency**. *(Senior có đúng 2 Competencies: `COMP-JAVA-CORE` và `COMP-SPRING`).*

2. **Cấu hình Micro-skill Target cho từng level**:
   Chọn từng level (`Junior`, `Middle`, `Senior`), trong khối **Add Micro-skill Target** chọn **From Competency** → chọn **Micro-skill** → tick **Required levels** (`F` = Foundation, `I` = Intermediate, `A` = Advanced) → bấm **Assign Skill**:

| Competency | Micro-skill | Junior (1) | Middle (2) | Senior (3) | Logic cấp bậc & vai trò demo |
| --- | --- | :---: | :---: | :---: | --- |
| **`COMP-JAVA-CORE`** | `MS-JAVA-OOP` | **F** | – | – | **Junior (1 skill duy nhất):** Nền tảng lập trình hướng đối tượng |
| | `MS-JAVA-COLL` | – | **I** | – | **Middle (skill 1 của Core):** Cấu trúc dữ liệu & collections (học module & thi ở Phần 8) |
| | `MS-JAVA-STREAM` | – | **I** | **A** | **Cùng skill nâng mức:** Middle cần mức Intermediate; Senior nâng lên mức Advanced |
| | `MS-JAVA-CONC` | – | – | **A** | **Senior (skill 2 của Core):** Xử lý đa luồng & lập trình đồng thời chuyên sâu |
| **`COMP-DATA`** | `MS-SQL-INDEX` | – | **I** | – | **Middle (1 skill duy nhất của Data):** Đánh chỉ mục & tối ưu query |
| **`COMP-SPRING`** | `MS-SPRING-DATA` | – | – | **A** | **Senior (skill 1 của Spring):** Tối ưu truy xuất dữ liệu & ORM nâng cao |
| | `MS-SPRING-TX` | – | – | **A** | **Senior (skill 2 của Spring):** Quản trị transaction phân tán & isolation |

> **Kiểm tra chuẩn xác số lượng:**
>
> - **Junior (1 Competency, 1 Micro-skill):**
>   - `COMP-JAVA-CORE` : 1 skill ( `MS-JAVA-OOP` [F]).
> - **Middle (2 Competencies, 3 Micro-skills):**
>   - `COMP-JAVA-CORE` : 2 skills ( `MS-JAVA-COLL` [I], `MS-JAVA-STREAM` [I]).
>   - `COMP-DATA` : 1 skill ( `MS-SQL-INDEX` [I]).
> - **Senior (2 Competencies, 4 Micro-skills):**
>   - `COMP-JAVA-CORE` : 2 skills ( `MS-JAVA-STREAM` [A], `MS-JAVA-CONC` [A]).
>   - `COMP-SPRING` : 2 skills ( `MS-SPRING-DATA` [A], `MS-SPRING-TX` [A]).
>

### Bước 7.2 – Kiểm tra Validation trong Modal và Submit JAVA-BE

1. Ở góc trái thanh footer modal, bấm vào nút **Validation required: X issues to resolve** (hoặc tab **Publication Readiness & Validation** ở trên).
   - Hệ thống chuyển ngay sang tab kiểm tra chi tiết tính sẵn sàng của role mà **không cần đóng modal**.
2. Domain Expert vẫn có thể bấm **Submit to L&D Manager** mà không bị khoá chặn bởi validation.
3. Bấm **Submit to L&D Manager** → xác nhận gửi cấu hình `JAVA-BE`.

---

### Bước 7.3 – Cấu hình nhanh role REACT-FE qua file Excel

1. Tại danh sách **Roles** (`/workspace/brightpath/expert/roles`), chọn role **REACT-FE – React Frontend Developer** → bấm biểu tượng **Configure Micro-skills**.
2. Trong modal, bấm vào tab **Import from Excel** (cạnh tab Validation).
3. Kéo thả hoặc duyệt chọn file **`04a_RoleConfig_ReactFrontend.xlsx`**.
4. Xem bảng **Configuration Preview**: kiểm tra các dòng của 3 cấp bậc `Junior`, `Middle`, `Senior` đều báo trạng thái **Valid** với icon tích xanh.
5. Bấm **Apply Configuration**: hệ thống tự động gán toàn bộ competencies và micro-skills vào role và chuyển về tab **Manual Configuration** để kiểm tra lại trực quan.
6. Bấm **Submit to L&D Manager** → xác nhận gửi.

---

### Bước 7.4 – Cấu hình nhanh role NODE-BE qua file Excel

1. Chọn role **NODE-BE – Node.js Backend Developer** → bấm biểu tượng **Configure Micro-skills**.
2. Chọn tab **Import from Excel**.
3. Tải lên file **`04b_RoleConfig_NodeBackend.xlsx`**.
4. Kiểm tra preview 9 dòng cấu hình đầy đủ cho 3 level (Junior, Middle, Senior).
5. Bấm **Apply Configuration** → giao diện tự chuyển về tab Manual.
6. Bấm **Submit to L&D Manager** → xác nhận gửi.

---

### Bước 7.5 – L&D Manager duyệt và Publish cả 3 Target Roles

1. Đăng xuất `David Thompson` và đăng nhập lại bằng `Sarah Mitchell` (L&D Manager).
2. Vào **Roles** (`/workspace/brightpath/ld-manager/roles`).
3. Cả 3 roles `JAVA-BE`, `REACT-FE`, `NODE-BE` đều đang ở trạng thái **SUBMITTED** (hoặc Staged for Review).
4. Mở từng role để xem chi tiết:
   - Bấm **View Details** trên `JAVA-BE`: kiểm tra tab **Architecture Specifications** và **Publication Readiness & Validation** → bấm **Publish Target Role** (hoặc Approve & Publish).
   - Bấm **View Details** trên `REACT-FE` → bấm **Publish Target Role**.
   - Bấm **View Details** trên `NODE-BE` → bấm **Publish Target Role**.
5. Cả 3 roles chuyển sang trạng thái **PUBLISHED / ACTIVE** sẵn sàng cho nhân viên đăng ký lộ trình học tập!

---

## 8. Import Module, Certificate và L&D duyệt

### 8.1. Expert import Module

1. Đăng nhập **David Thompson (Domain Expert)** trên `http://localhost:8099`.
2. Vào **Modules → Import modules**.
3. Chọn [05_Learning_Modules_Java_Backend_Demo.zip](./05_Learning_Modules_Java_Backend_Demo.zip), tải nguyên file ZIP.
4. Kiểm tra danh sách **40 module / 80 bài đọc**.
5. Review nội dung → xác nhận import → gửi các module cho L&D duyệt.

### 8.2. Expert import Certificate

1. Dùng tài khoản **David Thompson** → **Certificates → Certificate catalog → Import certificates**.
2. Chọn [06_Certificates_Java_Backend.xlsx](./06_Certificates_Java_Backend.xlsx).
3. **Check & resolve** → kiểm tra **8 certificate mới** → tiếp tục **Review & submit**.
4. Tick ô xác nhận đã review → **Confirm & Submit**.
5. Giữ các certificate ở trạng thái chờ duyệt; chưa chuyển sang L&D.

### 8.3. Expert import Certificate và xử lý conflict

1. Dùng tài khoản **David Thompson** → **Certificates → Certificate catalog → Import certificates**.
2. Chọn [06a_Certificate_Conflict_OOP.xlsx](./06a_Certificate_Conflict_OOP.xlsx).
3. **Check & resolve** → tìm dòng **Java OOP & SOLID Principles** có trạng thái **Conflict**.
4. So sánh hai bản → chọn **Use imported and submit for review** để dùng **OOP Revision B**.
5. Giữ **Collections Advanced** ở trạng thái được đưa vào lượt import.
6. Tiếp tục **Review & submit** → kiểm tra **2 certificate** → tick ô xác nhận → **Confirm & Submit**.

### 8.4. L&D duyệt Module

1. Đăng xuất David → đăng nhập **Sarah Mitchell (L&D Manager)**.
2. Vào **Modules → Batch approve**.
3. Kiểm tra danh sách module; mở chi tiết khi cần.
4. Xác nhận duyệt hàng loạt → kiểm tra **40 module** chuyển sang **Published**.

### 8.5. L&D duyệt Certificate

1. Dùng tài khoản **Sarah Mitchell** → **Certificates → Batch review**.
2. Kiểm tra danh sách certificate đang chờ duyệt.
3. Mở **View details** của OOP → kiểm tra nội dung **Revision B** → đóng chi tiết.
4. Tick ô xác nhận đã review ở cuối danh sách → **Approve all listed**.
5. Tải lại danh sách → chờ **9 certificate hiện hành** chuyển sang **Published**.

## 9. Import Question Bank và L&D duyệt

### 9.1. Expert import câu hỏi

1. Đăng xuất Sarah → đăng nhập **David Thompson (Domain Expert)**.
2. Vào **Assessment Bank → Import questions**.
3. Chọn [07_Question_Bank_Java_Backend.xlsx](./07_Question_Bank_Java_Backend.xlsx).
4. Kiểm tra **288 câu / 48 nhóm Skill–mức kiến thức**.
5. Review → xác nhận import → gửi các câu hỏi cho L&D duyệt.

### 9.2. L&D duyệt câu hỏi

1. Đăng xuất David → đăng nhập **Sarah Mitchell (L&D Manager)**.
2. Vào **Assessment Bank → Batch review**.
3. Kiểm tra các câu hỏi vừa gửi → xác nhận duyệt hàng loạt.
4. Tải lại danh sách → kiểm tra đủ **288 câu Published**.

## 10. Cấu hình Baseline

1. Dùng tài khoản **Sarah Mitchell (L&D Manager)**.
2. Vào **Baseline Config → Configurations** → giữ bộ lọc **Ready to configure**.
3. Tại **Java Backend Developer**, bấm biểu tượng bút để cấu hình.
4. Bước **Questions**: kiểm tra các giá trị điền sẵn; chỉnh số câu và số đúng để đạt trong giới hạn hiển thị → **Continue**.
5. Bước **Time & retakes**: kiểm tra thời gian, số lượt và thời gian chờ; chỉnh nếu cần → **Continue**.
6. Bước **Review**: kiểm tra lại → **Save & Activate**.
7. Vào tab **Active** → kiểm tra cấu hình của **Java Backend Developer**.
8. Quay lại **Configurations** → thực hiện lại bước 3–7 cho **Node.js Backend Developer**.
9. Quay lại **Configurations** → thực hiện lại bước 3–7 cho **React Frontend Developer**.

## 11. Cấu hình Skill Assessment

1. Đăng xuất Sarah → đăng nhập **David Thompson (Domain Expert)**.
2. Vào **Skill Assessment → Configurations → Create configuration**.
3. Bước **Questions**: kiểm tra tên cấu hình và số câu, số đúng để đạt, quota mandatory của từng mức; chỉnh trong giới hạn hiển thị → **Continue**.
4. Bước **Time & retakes**: đặt **Seconds per question = 60**; kiểm tra số lượt và thời gian chờ → **Continue**.
5. Bước **Review**: kiểm tra lại → **Save & activate** → xác nhận kích hoạt.
6. Vào tab **Active** → kiểm tra cấu hình đã kích hoạt.

## 12. Employee chọn Role, làm Baseline và gửi duyệt Pathway

1. Đăng nhập **James Wilson (Employee)** → **Upskilling**.
2. Chọn **Java Backend Developer → Senior** → bắt đầu **Baseline**.
3. Bấm **Auto fill answer** → tự bấm nộp bài → xác nhận.
4. Xem kết quả Baseline: thiếu **Java Streams & Lambdas — Advanced** và **Transaction Management — Advanced**.
5. Mở kết quả/hồ sơ năng lực để xem các mức đã đạt và hai Skill còn thiếu.
6. Gửi yêu cầu tạo Pathway cho Expert → kiểm tra toast gửi thành công.

## 13. Expert kiểm tra và duyệt Pathway

1. Đăng nhập **David Thompson (Domain Expert)** → mở thông báo yêu cầu → **Pathway Review**.
2. Mở Pathway của **James Wilson — Java Backend Developer / Senior**.
3. Giữ thứ tự **Java Streams & Lambdas — Advanced** trước, **Transaction Management — Advanced** sau.
4. Tại Transaction, exclude **Transaction Advanced Scenario Workshop** và **Transaction Advanced Guided Practice**.
5. Xem modal tự kiểm tra: **Transaction Management / Advanced** chưa có module được include.
6. Bấm **I understand** để đóng → bấm **Check** để xem lại lỗi.
7. Bấm tên Skill trong modal → kiểm tra graph chọn đúng Skill và danh sách bên phải chỉ lọc **Advanced**.
8. Include lại **Transaction Advanced Guided Practice**; giữ **Java Streams Advanced Guided Practice**. Pathway còn **2 Skill / 2 module**.
9. Chờ tự lưu xong → **Check** → kiểm tra không còn lỗi.
10. Bấm **Approve** → xem tóm tắt → xác nhận duyệt → kiểm tra toast thành công.

## 14. Employee học, bổ sung mức thiếu và hoàn thành Pathway

### 14.1. Hoàn thành Skill thứ nhất

1. Đăng nhập **James Wilson (Employee)** → mở thông báo Pathway đã duyệt → **Adaptive Pathway**.
2. Mở **Java Streams Advanced Guided Practice** → học và hoàn thành các bài đọc.
3. Làm **Skill Assessment** của Streams → **Auto fill answer** → tự nộp bài.
4. Kiểm tra **Java Streams & Lambdas — Advanced** đạt và Skill thứ nhất hoàn thành.

### 14.2. Transaction lần đầu và các yêu cầu phát sinh

1. Mở **Transaction Advanced Guided Practice** → học và hoàn thành các bài đọc.
2. Làm **Skill Assessment** của Transaction lần đầu → **Auto fill answer** → tự nộp bài.
3. Xem kết quả: **Foundation đạt; Intermediate và Advanced chưa đạt**.
4. Quay lại Pathway → xem yêu cầu **Transaction Management — Intermediate** và prerequisite **Spring Data JPA & Hibernate — Advanced** phát sinh.
5. Kiểm tra Transaction Advanced đang **Locked** do chưa hoàn thành các yêu cầu bổ sung. Prerequisite JPA dùng **certificate**, không phải module học.

### 14.3. Nộp Certificate và Expert duyệt

1. Dùng **James Wilson** → mở yêu cầu **Spring Data JPA & Hibernate — Advanced** → **Submit certificate**.
2. Tải bằng chứng hợp lệ hoặc nhập HTTPS link → gửi → kiểm tra trạng thái **Pending review**.
3. Đăng nhập **David Thompson** → mở thông báo quan trọng → **Certificates → Evidence review**.
4. Mở bằng chứng của James → kiểm tra certificate, Skill và mức kiến thức.
5. Để trống lý do khi duyệt → **Approve evidence** → kiểm tra toast thành công.

### 14.4. Học mức Intermediate, làm lại Transaction và kiểm tra hoàn thành

1. Đăng nhập **James Wilson** → mở thông báo duyệt certificate → **Adaptive Pathway**.
2. Mở module **Transaction Intermediate Guided Practice** → học và hoàn thành các bài đọc.
3. Làm **Skill Assessment — Transaction Intermediate** → **Auto fill answer** → tự nộp bài → kiểm tra đạt.
4. Kiểm tra prerequisite đã đạt, Transaction Advanced được mở khóa.
5. Mở lại **Transaction Advanced** → bắt đầu lượt **Skill Assessment mới** (chờ hết thời gian giữa lượt nếu có).
6. Bấm **Auto fill answer** → tự nộp bài → kiểm tra đạt Advanced.
7. Kiểm tra Pathway **Completed**, các Skill đã đạt và thông báo hoàn thành.
8. Mở hộp thư Employee **proteccmee@gmail.com** → kiểm tra email Pathway hoàn thành theo mẫu hệ thống; kiểm tra Spam nếu chưa thấy.

## 15. Employee kiểm tra Overview và làm RIASEC

1. Dùng **James Wilson (Employee)** → **Overview**.
2. Kiểm tra hồ sơ năng lực, Skill/mức kiến thức đã đạt và trạng thái Pathway.
3. Chuyển tab **RIASEC** → **Start assessment** → xác nhận bắt đầu lượt mới nếu được hỏi.
4. Kiểm tra bài làm mở ở **trang riêng** → bấm **Auto fill answer**.
5. Mở **Review your answers** → kiểm tra đủ **60/60 answered** → **Complete assessment** → xác nhận nộp.
6. Kiểm tra tự quay về tab **RIASEC** → chờ AI xử lý kết quả.
7. Xem điểm sở thích và gợi ý Job Position khi AI hoàn tất; nếu AI báo lỗi, kiểm tra cấu hình/kết nối rồi dùng **Retry AI suggestions**.
