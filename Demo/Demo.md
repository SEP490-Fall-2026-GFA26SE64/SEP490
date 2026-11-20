# Kịch bản demo: Onboarding → Users → Target Role

Tài liệu này chứa dữ liệu để **copy/paste** khi demo và các file Excel đã điền sẵn trong cùng thư mục:

| File | Dùng ở bước | Nội dung |
| --- | --- | --- |
| [01_Org_Structure_Brightpath.xlsx](./01_Org_Structure_Brightpath.xlsx) | 1. Onboarding (Your business → Import structure) | 4 department, 5 job position, 5 target role, 14 level |
| [02_Users_Brightpath.xlsx](./02_Users_Brightpath.xlsx) | 2. Admin import users | 1 L&D Manager, 1 Domain Expert, 1 Employee (có Current role + Level) |
| [03_Competencies_JavaBackend.xlsx](./03_Competencies_JavaBackend.xlsx) | 4. Expert import competency | 5 competency cho role Java Backend |
| [04_MicroSkills_JavaBackend.xlsx](./04_MicroSkills_JavaBackend.xlsx) | 5. Expert import micro-skill | 16 micro-skill, 17 liên kết competency, 15 prerequisite |

Luồng: **Reset → Onboarding 7 bước → Import users → L&D giao Expert cho role → Expert import competency → Expert import micro-skill → Expert sửa relationship trong Explore Graph → Expert cấu hình micro-skill cho target role.**

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

## 3. L&D Manager giao Expert maintain role

Đăng nhập `Sarah Mitchell` → **Roles** (`/workspace/brightpath/ld-manager/roles`) → role **JAVA-BE – Java Backend Developer** → **Edit Role & Assigned Expert**:

| Field | Giá trị |
| --- | --- |
| Assigned Expert | `David Thompson` |

→ **Save & Send to Expert**.

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

`MS-JAVA-COLL`, `MS-DB-MIGRATE`, `MS-JUNIT` không có mức Advanced. `MS-SPRING-DATA` dùng chung cho 2 competency (minh hoạ skill thuộc nhiều competency).

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

## 7. Expert cấu hình micro-skill cho target role

Mở **Roles** (`/workspace/brightpath/expert/roles`) → role **JAVA-BE – Java Backend Developer** → bấm **Configure Micro-skills** (biểu tượng cây bút).

Cấu hình cây năng lực tinh gọn và chuẩn logic cấp bậc theo yêu cầu:
- **Junior:** 1 Competency (1 micro-skill).
- **Middle:** 2 Competencies (1 competency có 2 micro-skills, 1 competency có 1 micro-skill → tổng 3 micro-skills).
- **Senior:** 2 Competencies (mỗi competency có đúng 2 micro-skills → tổng 4 micro-skills).

### Bước 7.1 – Gán Competency cho từng Role Level

1. **Gán Competency cốt lõi cho cả 3 levels**:
   - Ở thanh chọn **Role Levels**, bấm **All Levels (3)** (hoặc tick **Multi-level edit** để chọn cả `Junior`, `Middle`, `Senior`).
   - Trong ô **Select Competency**, chọn **`COMP-JAVA-CORE`** → bấm **Add Competency**.
2. **Gán Competency đặc thù cho Middle và Senior**:
   - Chọn riêng **`Middle`** → thêm **`COMP-DATA`** → bấm **Add Competency**. *(Middle có đúng 2 Competencies: `COMP-JAVA-CORE` và `COMP-DATA`).*
   - Chọn riêng **`Senior`** → thêm **`COMP-SPRING`** → bấm **Add Competency**. *(Senior có đúng 2 Competencies: `COMP-JAVA-CORE` và `COMP-SPRING`).*

*(Sau bước này: Junior có đúng 1 Competency, Middle có đúng 2 Competencies, Senior có đúng 2 Competencies).*

### Bước 7.2 – Cấu hình Micro-skill Target cho từng level

Chọn từng level (`Junior`, `Middle`, `Senior`), trong khối **Add Micro-skill Target** chọn **From Competency** → chọn **Micro-skill** → tick **Required levels** (`F` = Foundation, `I` = Intermediate, `A` = Advanced) → bấm **Assign Skill**:

| Competency | Micro-skill | Junior (1) | Middle (2) | Senior (3) | Logic cấp bậc & vai trò demo |
| --- | --- | :---: | :---: | :---: | --- |
| **`COMP-JAVA-CORE`** | `MS-JAVA-OOP` | **F** | – | – | **Junior (1 skill duy nhất):** Nền tảng lập trình hướng đối tượng |
| | `MS-JAVA-COLL` | – | **I** | – | **Middle (skill 1 của Core):** Cấu trúc dữ liệu & collections (học module & thi ở Phần 8) |
| | `MS-JAVA-STREAM` | – | **I** | **A** | **Cùng skill nâng mức:** Middle cần mức Intermediate; Senior nâng lên mức Advanced (Functional streams & reactive) |
| | `MS-JAVA-CONC` | – | – | **A** | **Senior (skill 2 của Core):** Xử lý đa luồng & lập trình đồng thời chuyên sâu |
| **`COMP-DATA`** | `MS-SQL-INDEX` | – | **I** | – | **Middle (1 skill duy nhất của Data):** Đánh chỉ mục & tối ưu query (thi sai nền tảng sinh học bổ sung ở Phần 8) |
| **`COMP-SPRING`** | `MS-SPRING-DATA` | – | – | **A** | **Senior (skill 1 của Spring):** Tối ưu truy xuất dữ liệu & ORM nâng cao |
| | `MS-SPRING-TX` | – | – | **A** | **Senior (skill 2 của Spring):** Quản trị transaction phân tán & isolation |

> **Kiểm tra chuẩn xác số lượng:**
> - **Junior (1 Competency, 1 Micro-skill):**
>   - `COMP-JAVA-CORE`: 1 skill (`MS-JAVA-OOP` [F]).
> - **Middle (2 Competencies, 3 Micro-skills):**
>   - `COMP-JAVA-CORE`: 2 skills (`MS-JAVA-COLL` [I], `MS-JAVA-STREAM` [I]).
>   - `COMP-DATA`: 1 skill (`MS-SQL-INDEX` [I]).
> - **Senior (2 Competencies, 4 Micro-skills):**
>   - `COMP-JAVA-CORE`: 2 skills (`MS-JAVA-STREAM` [A], `MS-JAVA-CONC` [A]).
>   - `COMP-SPRING`: 2 skills (`MS-SPRING-DATA` [A], `MS-SPRING-TX` [A]).
>
> *(Lưu ý: Nếu demo tiếp Phần 8 với đủ 4 tình huống bao gồm Expert Bypass và Certificate, ở level Middle gán thêm `MS-API-SEC` [F] và `MS-DOCKER` [F]).*

### Bước 7.3 – Gửi cấu hình cho L&D Manager

Khi cả 3 level đã hoàn tất cấu hình, bấm **Submit to L&D Manager** (hoặc **Save Draft** nếu muốn lưu nháp giữa chừng). Hệ thống gửi thẳng sang L&D Manager mà không bắt buộc kiểm tra hay cảnh báo thiếu prerequisite.

---

## Cơ sở thực tế của dữ liệu

`Brightpath Technologies Inc.` là công ty giả lập, mô phỏng cấu trúc phổ biến của một công ty phần mềm quy mô vừa tại Mỹ: khối Engineering (Backend/Frontend), QA độc lập, Data & Analytics và khối People & Learning (HR + L&D).

| Dữ liệu demo | Tham chiếu bên ngoài |
| --- | --- |
| Backend Engineer (BE-ENG) | O*NET 15-1252.00 Software Developers |
| Frontend Engineer (FE-ENG) | O*NET 15-1254.00 Web Developers |
| QA Engineer (QA-ENG) | O*NET 15-1253.00 Software Quality Assurance Analysts and Testers |
| Data Engineer (DATA-ENG) | O*NET 15-1243.01 Data Warehousing Specialists |
| L&D Specialist (LD-SPEC) | O*NET 13-1151.00 Training and Development Specialists |
| Level Junior / Middle / Senior | Thang cấp bậc kỹ sư phổ biến; tương ứng SFIA 9 level 2 / 3 / 4 |
| Competency & micro-skill Java Backend | roadmap.sh Java và Spring Boot roadmap |

Nguồn: <https://www.onetonline.org/>, <https://sfia-online.org/en/sfia-9>, <https://roadmap.sh/java>, <https://roadmap.sh/spring-boot>.

---

## Lặp lại demo

Mở lại `/reset` → toàn bộ Brightpath (workspace `brightpath`, admin và 3 user, competency/micro-skill/graph, file upload) bị xoá → chạy lại từ bước 1 với **cùng** workspace address và email.


---

## 8. Demo Senior trên runtime Brightpath riêng

Áp dụng cho `http://localhost:8099`. Checkpoint bàn giao ở **cuối mục 3**: Brightpath và bốn tài khoản đã kích hoạt; Sarah đã Save & Send JAVA-BE cho David. Đăng nhập David, làm tiếp **mục 4–7**, rồi phần này. Chưa import 03–06 ở checkpoint.

Prefix được giữ nguyên theo yêu cầu. Trên runtime8099, `/reset` khôi phục cuối mục3; không chạy lại onboarding hoặc mở email. Chọn level theo tên **Senior**, không theo nhãn thứ tự trong mục7: file01 đặt Senior rank1, Junior rank3.

| Field | Giá trị |
| --- | --- |
| Web | `http://localhost:8099` |
| Workspace | `brightpath` |
| Michael Carter / Administrator | `hoangsusp@gmail.com` |
| Sarah Mitchell / L&D Manager | `minhhoang10372@gmail.com` |
| David Thompson / Domain Expert | `kzvn10372@gmail.com` |
| James Wilson / Employee | `proteccmee@gmail.com` |
| Mật khẩu fixture demo đã chốt cho cả bốn tài khoản | `Brightpath@Demo2026` |
| Current Role của James ở checkpoint | `JAVA-BE - Java Backend Developer` / `Junior` |
| Target Role phần8 | `JAVA-BE - Java Backend Developer` / `Senior` |

Đây là thông tin đăng nhập fixture demo trong bàn giao đã duyệt, không phải secret hạ tầng.

### 8.1. Đích học và graph

Không gán thêm API Security/Docker trong nhánh mở rộng mục7. Giữ bốn Skill Senior:

| Field | Giá trị |
| --- | --- |
| Java Streams & Lambdas | `MS-JAVA-STREAM` / `Advanced` / `Module` |
| Java Concurrency & CompletableFuture | `MS-JAVA-CONC` / `Advanced` / `Certificate` |
| Spring Data JPA & Hibernate | `MS-SPRING-DATA` / `Advanced` / `Certificate` |
| Transaction Management | `MS-SPRING-TX` / `Advanced` / `Module` |

Graph sau mục6: Streams phụ thuộc Collections và OOP; Transaction phụ thuộc Spring Data và Concurrency; qua Spring Data có Spring DI và SQL Querying; qua DI/Concurrency có OOP. Prerequisite khác Skill luôn là Advanced, OOP qua nhiều nhánh chỉ có một nhóm. Không có cạnh ontology tự nối F/I/A.

Mỗi Skill luôn có cả ba mức. Ghi chú cũ “không có Advanced” ở mục5 chỉ mô tả thiếu provision; Collections, DB Migration, JUnit vẫn có Advanced trong bank mới. Baseline/nhóm phụ đạt cho biết no-gap, **không tạo achievement**. Không bắt nộp certificate khi nhóm tương thích đã cho thấy no-gap.

### 8.2. Chốt provision và certificate trước bank

David mở **Micro-skills → Java Collections & Generics (MS-JAVA-COLL) → Edit**. Giữ Foundation/Intermediate `Module`, đặt riêng Advanced thành `Certificate`, lưu. File04 không thay đổi. Không đổi mode qua lại để né bank.

Mở **Certificates → Certificate catalog → Add**, chọn Skill/mức, nhập rồi **Continue → Confirm** cho hai definition:

| Field | Giá trị |
| --- | --- |
| Skill thứ nhất | `Java Collections & Generics` / `MS-JAVA-COLL` |
| Knowledge level | `Advanced` |
| Name | `Brightpath Collections Advanced Demo Evidence` |
| Description | `Demo fixture: explain collection invariants, generic variance, immutable snapshots and safe concurrent map updates. This is not a real credential.` |
| Reference URL | `https://example.com/brightpath-demo/collections-advanced` |
| Skill thứ hai | `Java OOP & SOLID Principles` / `MS-JAVA-OOP` |
| Knowledge level | `Advanced` |
| Name | `Brightpath OOP Advanced Demo Evidence` |
| Description | `Demo fixture: explain substitutability, dependency inversion, composition and domain invariants. This is not a real credential.` |
| Reference URL | `https://example.com/brightpath-demo/oop-advanced` |

OOP/Advanced đã là Certificate trong04; giữ mode. Collections/Advanced đang trống được provision thêm cho nhánh gap. Reference URL là định danh HTTPS của fixture, không phải dịch vụ cấp chứng chỉ. Bằng chứng upload là [Brightpath_Demo_Evidence.pdf](./Brightpath_Demo_Evidence.pdf), ghi rõ **DEMO ONLY**. Dùng file đó trong hai submission ở8.11–8.12.

Chốt mọi Skill/provision/version tại đây trước05/06 và policy. Không lưu lại Skill trong lúc thi. Tạo definition chưa tạo evidence cho James.

### 8.3. David import05 và06

| Field | Giá trị |
| --- | --- |
| Assessment Bank → Import questions | [05_Question_Bank_Java_Backend.xlsx](./05_Question_Bank_Java_Backend.xlsx) |
| Preview05 | `240 questions` / `48 Skill-level groups` |
| Mỗi nhóm | `4 ordinary` + `1 mandatory` |
| Modules → Import | [06_Learning_Modules_Java_Backend_Demo.zip](./06_Learning_Modules_Java_Backend_Demo.zip) |
| Preview06 | `8 modules` / `16 reading lessons` |

05 bao phủ16 Skill ×3 mức, gồm Module, Certificate và chưa provision. Giữ schema cột, import toàn bộ workbook, Confirm một lần rồi Submit Draft cho L&D.

Upload nguyên ZIP06, không upload riêng DOCX. Chọn **Confirm & submit for review** nếu có; nếu đã Confirm import thì mở Draft vừa tạo và Submit. Nếu Submit lỗi sau import thành công: đọc lỗi, sửa Draft nếu cần rồi Submit lại **Draft đó**, không import trùng file.

| Field | Giá trị |
| --- | --- |
| Transaction Advanced phương án1 | `Transaction Advanced Guided Practice` |
| Transaction Advanced phương án2 | `Transaction Advanced Scenario Workshop` |
| Transaction Foundation | `Transaction Foundation Guided Practice` |
| Transaction Intermediate | `Transaction Intermediate Guided Practice` |
| Streams Advanced | `Java Streams Advanced Guided Practice` |
| Spring DI Advanced | `Spring DI Advanced Guided Practice` |
| Spring DI Foundation | `Spring DI Foundation Guided Practice` |
| Spring DI Intermediate | `Spring DI Intermediate Guided Practice` |

Mỗi module có hai bài đọc Concepts/Guided Activity. Không thêm Module cho mức Certificate.

### 8.4. Sarah review và publish

Sarah mở **Assessment Bank → Batch review**, đọc từng nội dung, xác nhận đã xem đúng version rồi Approve/Publish. Cần đủ240 câu Published, không chỉ Submitted. Trong Modules, xem nội dung cả8 module, duyệt và publish. Draft, Submitted, retired hoặc sai Skill version không dùng được.

Certificate definition ở8.2 là catalog; learner submission ở8.11 còn phải được David duyệt qua pathway.

### 8.5. David cấu hình hàng loạt Skill Assessment

Mở **Skill Assessment configuration → Bulk configuration**. Chọn ba Skill và cả ba mức MAIN Foundation/Intermediate/Advanced:

| Field | Giá trị |
| --- | --- |
| Skill1 | `Java Streams & Lambdas` |
| Skill2 | `Transaction Management` |
| Skill3 | `Spring IoC & Dependency Injection` |
| MAIN total / correct / mandatory | `3` / `2` / `1` |
| MAIN foundations total / correct / mandatory | `3` / `2` / `1` |
| Prerequisite Advanced total / correct / mandatory | `3` / `2` / `1` |
| All-wrong veto của prerequisite khác Skill | `checked` |
| Minutes per question | `1` |
| Maximum attempts | `10` |
| Retake wait (minutes) | `0` |
| Explicitly replace existing policies | `unchecked` |

**Preview policies**:9 scope riêng. Dự kiến Transaction/Advanced8 nhóm/24 câu/24 phút, DI/Advanced4 nhóm/12 câu/12 phút, Streams/Advanced5 nhóm/15 câu/15 phút; đối chiếu preview thực tế. Mỗi scope giữ policy/version/history riêng.

Đọc capacity ordinary/mandatory từng nhóm. **Edit exception** sửa từng dòng nếu cần. Lỗi quota phải được sửa/bổ sung bank; **Open Assessment Bank** dẫn tới bank. Không gửi request câu hỏi ở Skill Assessment.

**Save & activate**, đọc kết quả mỗi scope. `ACTIVE` là thành công; `FAILED` có nguyên nhân. **Retry same command** gửi đúng lệnh khi lỗi mạng/partial failure, tránh version trùng. Nếu chủ động sửa cấu hình, Preview lại. Scope có draft/active được bỏ qua mặc định; tick replace chỉ khi muốn thay. Template được lưu để dùng cho Skill thêm sau nhưng phải preview/validate lại.

### 8.6. Sarah baseline và Requests

Mở **Baseline Assessment configuration → Java Backend Developer**. Đây là policy chung theo Role; đề phụ thuộc Role Level James chọn. Trước Activate, mở **Request more questions from the Role Expert**:

| Field | Giá trị |
| --- | --- |
| Skill / level | `Transaction Management` / `Foundation` |
| Required Published total | `6` |
| Mandatory quota | `1` |

05 có4 ordinary+1 mandatory; nhu cầu này thiếu1 ordinary. **Send question request**. Backend lấy recipient từ Expert maintain JAVA-BE là David, không chọn người ngoài tenant. Gửi lại cùng nhu cầu cập nhật cùng request.

David mở **Assessment Bank → Requests**, chọn đúng JAVA-BE/Transaction/Foundation → **Create question for request**. Skill/mức đã điền sẵn. Nhập:

| Field | Giá trị |
| --- | --- |
| Question prompt | `How should a credit operation handle a retried request with the same business idempotency key?` |
| Option A | `Apply a new credit for every retry.` |
| Option B | `Return the retained result of the original accepted operation.` |
| Option C | `Skip ownership validation when the request is retried.` |
| Option D | `Change the account balance outside the transaction.` |
| Correct answer | `B` |
| Mandatory | `unchecked` |
| Explanation | `A retry with the same business idempotency key reuses the original accepted operation instead of crediting the account twice.` |

Save/Submit đi qua Sarah review/publish hiện có. Submitted chưa hoàn tất request. Sarah đọc đúng version, xác nhận review rồi publish; David **Requests → Refresh**: đủ5 ordinary+1 mandatory, `COMPLETED`. Bank lúc này241 câu; workbook05 vẫn240. Câu thêm đáp ánB giữ ma trận toànA ổn định.

Nếu Role chưa có Expert/Expert mất quyền maintain: Sarah sửa người maintain trong Role rồi gửi lại. Nếu Skill đổi version, gửi nhu cầu version mới và publish đúng version; không dùng câu cũ vượt capacity. Request hoàn tất không tự activate baseline.

Sarah tải lại capacity, nhập:

| Field | Giá trị |
| --- | --- |
| Foundation questions / correct | `3` / `2` |
| Intermediate questions / correct | `3` / `2` |
| Advanced questions / correct | `3` / `2` |
| Minutes per question | `1` |
| Maximum attempts | `10` |
| Retake wait (minutes) | `0` |

Baseline không dùng mandatory gate/veto. Nếu nhập số câu vượt bank: UI giới hạn, backend không lưu/activate vượt capacity. Giảm về giá trị hợp lệ trong bảng hoặc request, chờ Published rồi tải lại. **Save draft** thành công trước **Activate**.

Sau khi baseline và9 Skill policies ACTIVE, Sarah mở Role JAVA-BE do David Submit ở mục7, đọc cấu hình Senior rồi **Approve/Publish**. Nếu lỗi điều kiện publish, đọc và hoàn tất điều kiện đó; không đổi yêu cầu Senior để né lỗi. James chỉ chọn target khi policy và Role sẵn sàng.

### 8.7. James Senior và baseline toànA

Đăng nhập James. Kịch bản này không dùng RIASEC; không tạo điểm/gợi ý giả.

| Field | Giá trị |
| --- | --- |
| Job position | `Backend Engineer` |
| Role | `Java Backend Developer` / `JAVA-BE` |
| Role Level | `Senior` |
| Baseline answers | `A` cho mọi câu |

James sạch ở checkpoint:12 nhóm (4 Skill đích×F/I/A),36 câu,36 phút. Baseline không mở rộng prerequisite khác Skill. Mức thấp có history tương thích thì không thi lại dù history trượt; vì vậy không reset có thể ra ít câu hơn.

| Field | Giá trị |
| --- | --- |
| Gap toànA dự kiến | `Streams/Advanced`, `Transaction/Foundation`, `Transaction/Intermediate`, `Transaction/Advanced` |
| No-gap dự kiến | `Streams/Foundation`, `Streams/Intermediate`, cả ba mức `Concurrency`, cả ba mức `Spring Data` |
| Official achievement từ baseline | `Không có` |

Đối chiếu kết quả lưu thực tế trước khi giải thích. ConcurrencyA/Spring DataA no-gap không bị bắt nộp certificate chỉ để tạo evidence.

### 8.8. Pathway review include/exclude và Check

James **Request pathway**. David mở Pathway review đúng James/JAVA-BE/Senior. Ban đầu có bốn gap ở8.7; baseline chưa phát hiện cross-Skill prerequisite và MAIN lần đầu chưa bị khóa sớm.

Trong Transaction/Advanced, Exclude cả `Transaction Advanced Guided Practice` và `Transaction Advanced Scenario Workshop` rồi **Check**. Dự kiến lỗi không còn provider/lựa chọn hợp lệ, vì đã loại hết alternatives. Không Approve/bypass để né lỗi. Include lại `Transaction Advanced Guided Practice`, có thể giữ Workshop excluded. Check lại hết lỗi đó, **Save → Approve** khi toàn plan hợp lệ. Recalculate giữ lựa chọn provider.

### 8.9. MAIN Transaction lần đầu và recalculate

James mở Transaction/Advanced trước, chọn `Transaction Advanced Guided Practice`, hoàn tất hai lesson rồi mở Skill Assessment:

| Field | Giá trị |
| --- | --- |
| MAIN Transaction/Advanced lần1 | `B` cho mọi câu nhóm MAIN |
| Các nhóm còn lại lần1 | `A` |

MAIN đạt, nhưng TransactionF/I, Spring DI/Advanced và OOP/Advanced trượt. Veto chỉ xảy ra với prerequisite bật veto có0 đúng; tắt veto vẫn không tự hoàn tất gap. Chưa công nhận MAIN hoàn thành chỉ vì MAIN đạt.

Chờ processing/recalculate:

```text
OOP/Advanced và Spring DI/Advanced
  → Transaction/Foundation
  → Transaction/Intermediate
  → Transaction/Advanced thi lượt mới
```

Foundation khóa module/assessment/certificate theo dependency; Intermediate đợi Foundation. MAIN Transaction giữ module progress/quyền xem lại, chỉ khóa assessment/retake. Không ép học lại MAIN.

### 8.10. Spring DI trở thành MAIN

Mở `Spring DI Advanced Guided Practice`, hoàn tất hai lesson và thi lần đầu:

| Field | Giá trị |
| --- | --- |
| MAIN DI/Advanced | `B` |
| DI/Foundation, Intermediate | `A` |
| OOP/Advanced chưa có evidence | `A` |

DI có4 nhóm/12 câu. MAIN đạt nhưng F/I trượt nên chưa hoàn tất. Recalculate thêm OOP→DI/F→DI/I→DI/A thi lại. Học xong nền tảng không replay điểm MAIN cũ để trao achievement.

### 8.11. Certificate OOP và hoàn tất DI → Transaction

James mở OOP/Advanced trong pathway đã duyệt → **Submit certificate**:

| Field | Giá trị |
| --- | --- |
| Evidence file | [Brightpath_Demo_Evidence.pdf](./Brightpath_Demo_Evidence.pdf) |
| Note nếu có | `Brightpath demo fixture for James Wilson. Not a real credential.` |

Upload, đọc preview, Submit. David **Certificates → Review submissions**, mở đúng James/OOP Advanced/`Brightpath OOP Advanced Demo Evidence`, xem attachment rồi Approve. Lúc này mới ghi certificate evidence. James tải lại pathway.

Lần lượt hoàn tất hai lesson của mỗi module, thi mới, chờ processing:

| Field | Giá trị |
| --- | --- |
| DI/Foundation | `Spring DI Foundation Guided Practice`; MAIN `B`, OOP/A `B` |
| DI/Intermediate | `Spring DI Intermediate Guided Practice`; mọi nhóm `B` |
| DI/Advanced retake | Giữ module completed; mọi nhóm `B` |
| Transaction/Foundation | `Transaction Foundation Guided Practice`; Transaction/DI/OOP `B`, nhóm khác `A` |
| Transaction/Intermediate | `Transaction Intermediate Guided Practice`; Transaction/DI/OOP `B`, nhóm khác `A` |
| Transaction/Advanced retake | Giữ module completed; Transaction/DI/OOP `B`, nhóm khác `A` |

Không sửa answer key khi demo. Nhóm phụ no-gap không tự nhận achievement; MAIN phải có lượt mới hợp lệ sau dependency. Lịch sử lần đầu giữ nguyên.

### 8.12. Streams và Collections certificate

James hoàn tất hai lesson của `Java Streams Advanced Guided Practice`, mở bài5 nhóm/15 câu:

| Field | Giá trị |
| --- | --- |
| Streams/Advanced MAIN lần1 | `B` |
| Streams/Foundation, Intermediate | `A` |
| OOP/Advanced đã có evidence | `B` |
| Collections/Advanced lần1 | `A` |

MAIN đạt nhưng CollectionsA gap, chưa hoàn tất. Recalculate đưa Collections/Advanced Certificate vào pathway, giữ Advanced, không fallback Intermediate.

James nộp [Brightpath_Demo_Evidence.pdf](./Brightpath_Demo_Evidence.pdf) cho đúng CollectionsA. David đọc và Approve theo definition `Brightpath Collections Advanced Demo Evidence`. James tải lại rồi thi **lượt Streams MAIN mới**: StreamsA/CollectionsA/OOPA chọnB, StreamsF/I chọnA. Không học lại module.

### 8.13. Hoàn tất và reset

Chờ xử lý kết quả cuối; xem pathway, history các lượt mới, certificate submission/decision/evidence. Baseline/no-gap vẫn riêng với official achievement. Khi mọi yêu cầu bắt buộc được giải quyết, pathway có thể hoàn tất và James chọn mục tiêu tiếp theo theo điều kiện hệ thống. Không suy ra mọi Skill profile đã có achievement vì baseline đạt.

Không demo bypass trong kịch bản chính. Bypass không tạo evidence; provision xuất hiện ở pathway còn hoạt động phải được xử lý theo progress. Completed/archived không tự mở lại chỉ vì có nội dung mới.

| Field | Giá trị |
| --- | --- |
| Reset riêng | `http://localhost:8099/reset` |
| Checkpoint | `BRIGHTPATH_END_SECTION_3` |
| Sau reset | Đăng nhập David, tiếp tục `mục4` |
| Chưa có sau reset | `03–06`, certificate bổ sung, policies, attempts, pathway, progress/evidence của James |

Chỉ coi reset hoàn tất khi PostgreSQL, graph, private storage restore thành công. Nếu báo chưa hoàn tất, **Try again** để phục hồi, không tiếp tục trên trạng thái dở dang. Reset đăng xuất phiên cũ. Dev8088 không thuộc reset8099.

Các kết quả trên là hướng dẫn theo cấu hình dữ liệu. Build không chứng minh hành vi runtime; xem giới hạn kiểm chứng trong bàn giao lần chạy hiện tại.
