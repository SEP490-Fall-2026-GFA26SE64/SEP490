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

Áp dụng cho `http://localhost:8099`. Checkpoint reset hiện ở **cuối bước 8.7**: giữ cấu hình và bài baseline toàn A thực tế của James, chưa có pathway. Sau reset, đăng nhập James và bắt đầu **8.8 – Request pathway**; David tiếp tục review. Không chạy lại mục4–8.7. Các bước setup dưới đây được giữ để tham khảo khi dựng từ đầu.

Prefix được giữ nguyên theo yêu cầu. Trên runtime8099, `/reset` khôi phục cuối bước8.7; không chạy lại onboarding hoặc mở email. Chọn level theo tên **Senior**, không theo nhãn thứ tự trong mục7: file01 đặt Senior rank1, Junior rank3.

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

Graph sau mục6: Streams phụ thuộc Collections và OOP; Transaction phụ thuộc Spring Data; qua Spring Data có Spring DI và SQL Querying; qua Spring DI có OOP. Java Concurrency phụ thuộc Transaction và OOP, không phải Transaction phụ thuộc Concurrency. Prerequisite khác Skill luôn là Advanced, OOP qua nhiều nhánh chỉ có một nhóm. Không có cạnh ontology tự nối F/I/A.

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

### 8.5. David cấu hình chung Skill Assessment

Mở **Skill Assessment configuration**. Danh sách hiển thị cấu hình chung, gồm các tab **Configurations / Active / Archived**; không còn mỗi dòng là một Skill. Các cấu hình theo Skill đã có vẫn áp dụng cho tới khi kích hoạt cấu hình chung.

Bấm **Create configuration** (hoặc biểu tượng sửa), thực hiện ba bước:

1. **Questions**: tự bao gồm tất cả Skill hiện tại và Skill thêm sau. Nhập theo **Foundation / Intermediate / Advanced / Prerequisite**, không cần chọn Skill. Giới hạn mỗi mức lấy số câu Published ít nhất nhưng lớn hơn0; Skill chưa có câu được bỏ qua khi tính giới hạn. Với workbook05 hiện tại, mặc định và giới hạn là **5 câu** mỗi nhóm. Đặt correct/mandatory trong giới hạn hiển thị; mặc định correct3/mandatory1. Prerequisite bật all-wrong veto.
2. **Time & retakes**: minutes per question `1`, maximum attempts `10`, retake wait (minutes) `0`.
3. **Review**: đọc lại số câu và thời gian, chọn **Save draft** hoặc **Save & activate**, xác nhận áp dụng cho toàn bộ Skill trong workspace.

Khi thêm Skill hoặc Published questions, giới hạn tự tính lại từ các nhóm có câu. Bài mới giới hạn số câu/ngưỡng đúng/quota theo bank hiện tại; nhóm prerequisite bắt buộc chưa có câu vẫn chặn mở bài. Không sửa các lượt đã tạo hoặc lịch sử cũ. Nếu có người khác sửa cùng lúc, tải lại cấu hình đã lưu trước khi lưu tiếp; lỗi mạng dùng **Retry same command**.

**Checkpoint8.7 đang giữ các policy cũ3/2/1** và bài baseline thật của James để tiếp tục8.8. Không cần chạy lại8.5 sau reset. Nếu muốn thử cấu hình chung mới, kích hoạt5 câu như trên; số nhóm và lựa chọn A/B ở8.9–8.12 giữ nguyên, tổng câu đổi: Transaction/Advanced35, DI/Advanced20, Streams/Advanced25. Reset sẽ quay về checkpoint8.7 với policy cũ.

Nếu kích hoạt cấu hình chung mới, bài mới dùng5 câu/ngưỡng đúng3/mandatory1;1 phút/câu,10 lượt,0 phút chờ. Các lượt đã tạo vẫn giữ số câu và policy cũ. Số nhóm thực tế phụ thuộc prerequisite hiện tại trong catalog; đọc đề đã tạo để đối chiếu. Sau reset8.7, policy cũ3/2/1 áp dụng cho tới khi kích hoạt cấu hình chung; không dựa vào số câu của một lượt trước để suy ra policy lượt mới.

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

Sau khi baseline và cấu hình Skill Assessment đã ACTIVE, Sarah mở Role JAVA-BE do David Submit ở mục7, đọc cấu hình Senior rồi **Approve/Publish**. Nếu lỗi điều kiện publish, đọc và hoàn tất điều kiện đó; không đổi yêu cầu Senior để né lỗi. James chỉ chọn target khi policy và Role sẵn sàng.

### 8.7. James Senior và baseline toànA

Đăng nhập James. Kịch bản này không dùng RIASEC; không tạo điểm/gợi ý giả.

| Field | Giá trị |
| --- | --- |
| Job position | `Backend Engineer` |
| Role | `Java Backend Developer` / `JAVA-BE` |
| Role Level | `Senior` |
| Baseline answers | `A` cho mọi câu |

Nếu dựng từ đầu theo bảng8.6:12 nhóm (4 Skill đích×F/I/A),36 câu,36 phút. Checkpoint8.7 hiện giữ bài thật bạn đã nộp:12 nhóm/60 câu, toànA, theo policy5 câu/nhóm và1 đúng để đạt. Không phải thi lại sau reset. Baseline không mở rộng prerequisite khác Skill. Mức thấp có history tương thích thì không thi lại dù history trượt; vì vậy không reset có thể ra ít câu hơn.

| Field | Giá trị |
| --- | --- |
| Gap toànA dự kiến | `Streams/Advanced`, `Transaction/Foundation`, `Transaction/Intermediate`, `Transaction/Advanced` |
| No-gap dự kiến | `Streams/Foundation`, `Streams/Intermediate`, cả ba mức `Concurrency`, cả ba mức `Spring Data` |
| Official achievement từ baseline | `Không có` |

Đối chiếu kết quả lưu thực tế trước khi giải thích. ConcurrencyA/Spring DataA no-gap không bị bắt nộp certificate chỉ để tạo evidence.

### 8.8. James gửi yêu cầu; David duyệt pathway

**Bắt đầu ở đây sau reset.** Không làm lại baseline. Nếu đang tiếp tục pathway đã duyệt hiện tại, bỏ qua8.8 và đọc **8.9.R** trước.

#### 8.8.1 — James: Request pathway

1. Đăng nhập **James**: `proteccmee@gmail.com`.
2. Mở **Adaptive Pathway** của **Java Backend Developer — Senior**; nếu chưa có lộ trình, mở kết quả baseline ở **Upskilling → Roles**.
3. Bấm **Request pathway** một lần. Chờ tạo xong.
4. Kiểm tra trạng thái **Awaiting expert review**. Chưa học/thi khi chưa được duyệt.

**Kết quả từ checkpoint:** cần học Java Streams & Lambdas — Advanced và Transaction Management — Foundation, Intermediate, Advanced. Baseline no-gap của Spring Data JPA & Hibernate và Java Concurrency & CompletableFuture không phải chứng chỉ chính thức.

#### 8.8.2 — David: chọn đúng module rồi duyệt

1. Đăng nhập **David**: `kzvn10372@gmail.com`.
2. Mở **Pathway Review → James Wilson → Java Backend Developer / Senior**.
3. Trong graph, giữ các lựa chọn sau:

| Skill — mức kiến thức | Module giữ trong graph |
| --- | --- |
| Java Streams & Lambdas — Advanced | `Java Streams Advanced Guided Practice` |
| Transaction Management — Foundation | `Transaction Foundation Guided Practice` |
| Transaction Management — Intermediate | `Transaction Intermediate Guided Practice` |
| Transaction Management — Advanced | `Transaction Advanced Guided Practice` |

4. Transaction Advanced có thể có thêm `Transaction Advanced Scenario Workshop`. Bấm **Exclude** ở module này để đường demo chỉ dùng Guided Practice. Không xóa node Skill.
5. Bấm **Check logic**. Nếu hợp lệ, bấm **Save changes** nếu có thay đổi.
6. Bấm **Approve → Confirm**. James tải lại Adaptive Pathway và thấy **Approved**.

**Nếu muốn minh họa Check:** chỉ làm trước khi duyệt. Exclude hết module của một Skill, bấm Check để xem lỗi, sau đó Include lại đúng module trong bảng, Check, Save, Approve.

### 8.9. James: Transaction Management — Advanced, lượt đầu

#### 8.9.1 — Học đúng module

1. Đăng nhập **James**.
2. Mở node **Transaction Management — Advanced**.
3. Chọn `Transaction Advanced Guided Practice` → **Start learning/Continue learning**.
4. Mở và hoàn tất **cả hai bài đọc**: Concepts và Guided Activity. Kiểm tra module **Content completed**.
5. Bấm **Start Skill Assessment** trong đúng module này.

**Không mở Java Streams ở bước này.** Đầu trang kết quả giờ có tên Skill đang đánh giá để phân biệt các bài cùng Role Senior.

#### 8.9.2 — Chọn từng nhóm theo bảng này

Đọc **tên Skill và mức kiến thức** trên nhóm câu hỏi. Mỗi dòng dưới đây áp dụng cho **tất cả câu** của nhóm đó, kể cả câu mandatory. Không chọn theo số thứ tự câu hoặc vị trí nhóm.

| Nhóm xuất hiện trong đề Transaction Advanced | Chọn mọi câu | Kết quả chủ đích |
| --- | --- | --- |
| **Transaction Management — Advanced** | **B** | Nhóm chính đạt |
| Transaction Management — Foundation | **A** | Tạo nhu cầu học Foundation |
| Transaction Management — Intermediate | **A** | Tạo nhu cầu học Intermediate |
| Spring IoC & Dependency Injection — Advanced | **A** | Tạo nhu cầu học Spring DI |
| Java OOP & SOLID Principles — Advanced | **A** | Tạo nhu cầu chứng chỉ OOP |
| **Spring Data JPA & Hibernate — Advanced** | **A** | **Đạt; không tạo gap JPA** |
| **SQL Querying & Joins — Advanced** | **A** | **Đạt; không tạo gap SQL** |

**Chỉ nhóm Transaction Management — Advanced chọn B ở lượt này.** Đặc biệt: Spring Data JPA & Hibernate — Advanced chọn **A toàn bộ**, không chọn B lẫn vào.

Checkpoint dùng3 câu/nhóm, ngưỡng2; cấu hình chung mới dùng5 câu/nhóm, ngưỡng3. Với graph checkpoint hiện tại, đề có7 nhóm:21 hoặc35 câu. Ngẫu nhiên chọn câu không thay kết quả của bảng vì cả5 câu trong mỗi nhóm dùng cùng đáp án.

#### 8.9.3 — Nộp và xem kết quả

1. Kiểm tra lại nhóm **Transaction Management — Advanced: toàn B**.
2. Kiểm tra lại nhóm **Spring Data JPA & Hibernate — Advanced: toàn A**.
3. Bấm **Submit → Confirm**.
4. Mở **Score details**:
   - Transaction Management — Advanced: **3/3 hoặc5/5**, đạt.
   - Spring Data JPA & Hibernate — Advanced và SQL Querying & Joins — Advanced: **đạt**.
   - Transaction Foundation/Intermediate, Spring DI Advanced và OOP Advanced: chưa đạt theo chủ đích.
5. Bấm **Back to pathway**, chờ xử lý rồi **Refresh**.

**Chưa hoàn thành Transaction là đúng ở đây.** Bài chính đã đạt nhưng cần hoàn thành phần bổ sung. Không tiếp tục bấm Retake Transaction lúc nó đang khóa.

#### 8.9.4 — Đọc việc cần làm tiếp

| Yêu cầu đang thiếu | Đi đâu tiếp |
| --- | --- |
| Java OOP & SOLID Principles — Advanced | Nộp chứng chỉ ở8.11.1 |
| Spring IoC & Dependency Injection — Advanced | Làm lượt đầu ở8.10 để xác định mức nền tảng còn thiếu |
| Transaction Management — Foundation | Đợi OOP/Spring DI đủ điều kiện, làm8.11.3 |
| Transaction Management — Intermediate | Đợi Transaction Foundation hoàn thành |
| Transaction Management — Advanced | Giữ tiến độ module, thi lượt mới sau các bước trên |

**Next:** sang8.10. Dòng “Complete Skill / Level…” đã được bỏ khỏi node graph; bảng này ghi đầy đủ việc cần làm. Biểu tượng khóa và trạng thái yêu cầu vẫn còn.

### 8.9.R. Tiếp tục từ trạng thái đang kẹt hiện tại

Không cần reset để làm lại. Lịch sử đã nộp được giữ nguyên.

#### 8.9.R.1 — Xác định vì sao kết quả khác hướng dẫn cũ

Ba lượt Skill Assessment mới nhất trong runtime đã được đối chiếu với bank:

| Lượt đã lưu | Điều đã xảy ra | Cách tiếp tục |
| --- | --- | --- |
| Java Streams & Lambdas — Advanced, lượt đầu15 câu | Nhóm chính3/3, OOP2/3, Collections0/3. Điểm đủ ở một nhóm chưa có nghĩa toàn bộ điều kiện đều đạt, nhất là mandatory | Collections certificate đã hoàn thành trong tiến trình hiện tại; giữ evidence đó |
| Java Streams & Lambdas — Advanced, lượt sau15 câu | Chọn A ở nhóm chính Advanced nên0/3; Streams Foundation/Intermediate chọn A nên đạt | Hoàn tất OOP, rồi thi lượt Streams mới theo8.12.3; bỏ qua8.12.2 nếu Collections đã Fulfilled |
| Transaction Management — Advanced,21 câu | Nhóm chính chọn A nên0/3; JPA Advanced và SQL Advanced3/3; Spring DI Advanced, OOP Advanced và Transaction Foundation/Intermediate0/3 | **Không cần JPA certificate ở trạng thái này**. Làm Spring DI ở8.10, OOP ở8.11.1, rồi8.11.2–8.11.3 |
| Baseline,60 câu | Toàn A tạo đúng4 gap ở checkpoint | Giữ kết quả; không làm lại baseline |

**Đề mới có thể thay câu, số câu hoặc policy; điểm luôn tính theo lựa chọn của lượt đó.** Không dùng bảng đáp án lượt đầu của Transaction cho bài Streams, Spring DI hoặc lượt retake.

Một lượt Transaction ở lần chạy trước từng có JPA Advanced1/3 do chọn lẫn A/B và tạo node Expert review. Chỉ dùng8.9.R.2 nếu trạng thái đó lại xuất hiện. Không tạo thêm JPA definition hoặc nộp certificate khi JPA đã đạt/no-gap và không có node cần xử lý.

#### 8.9.R.2 — David cung cấp chứng chỉ JPA bị thiếu

Chỉ làm khi pathway hiện **Spring Data JPA & Hibernate — Advanced / Expert review / Options:0**.

1. David mở **Certificates → Certificate catalog → Add certificate**.
2. Ở **Skill & level**, lọc **Advanced**, tìm **Spring Data JPA & Hibernate**, chọn đúng Skill này.
3. Continue, nhập:

| Trường | Giá trị |
| --- | --- |
| Certificate name | `Brightpath JPA Advanced Demo Evidence` |
| Description | `Demo fixture: explain persistence context, entity identity, fetching strategies and transaction boundaries. This is not a real credential.` |
| Reference URL | `https://example.com/brightpath-demo/jpa-advanced` |

4. **Continue → Review → Add certificate**. Nếu đã có đúng definition, giữ lại, không tạo thêm.
5. David mở lại **Pathway Review → James → đúng pathway đang học**.
6. Bấm **Refresh provision**. Nút này được phép dùng khi pathway đã Approved nhưng còn yêu cầu Expert action.
7. Kiểm tra JPA Advanced có certificate vừa tạo. Nếu trạng thái chuyển về chờ duyệt, **Check logic → Approve → Confirm**; nếu vẫn Approved, không duyệt trùng.
8. James tải lại pathway. Mở JPA Advanced → certificate → **Submit certificate**, chọn [Brightpath_Demo_Evidence.pdf](./Brightpath_Demo_Evidence.pdf), đọc preview và Submit.
9. David mở **Certificates → Evidence review → Pending review**, xem đúng **James / Spring Data JPA & Hibernate / Advanced**, tải file xem rồi nhập lý do và **Approve → Confirm**.
10. James Refresh. JPA phải có evidence/được đáp ứng trước khi thử Transaction retake.

Definition là fixture demo; chỉ sau bước duyệt minh chứng mới tạo evidence. Không đổi provision, bỏ prerequisite hay sửa điểm cũ để gỡ khóa.

#### 8.9.R.3 — Tiếp tục phần còn lại

1. Nếu chưa có lượt **Spring DI Advanced**: làm8.10.
2. Hoàn tất OOP certificate ở8.11.1.
3. Hoàn tất Spring DI Foundation → Intermediate → Advanced ở8.11.2.
4. Hoàn tất Transaction Foundation → Intermediate → Advanced retake ở8.11.3.
5. Nếu đã có lượt Streams thất bại như bảng: **không lặp lại8.12.1**; kiểm tra Collections đã Fulfilled thì bỏ qua8.12.2 và thi8.12.3 sau OOP. Nếu Collections chưa hoàn tất, làm8.12.2 trước.

### 8.10. James: Spring IoC & Dependency Injection — Advanced, lượt đầu

#### 8.10.1 — Học và mở bài

1. James mở **Spring IoC & Dependency Injection — Advanced** trong pathway.
2. Chọn `Spring DI Advanced Guided Practice`.
3. Hoàn tất cả hai bài đọc.
4. Mở **Start Skill Assessment**.

#### 8.10.2 — Chọn và nộp

| Nhóm trong đề Spring DI Advanced, lượt đầu | Chọn mọi câu |
| --- | --- |
| **Spring IoC & Dependency Injection — Advanced** | **B** |
| Spring IoC & Dependency Injection — Foundation | **A** |
| Spring IoC & Dependency Injection — Intermediate | **A** |
| Java OOP & SOLID Principles — Advanced | **A** |

1. Bấm Submit và xác nhận.
2. Score details: nhóm Spring DI Advanced đạt, Foundation/Intermediate chưa đạt.
3. Back to pathway → chờ xử lý → Refresh.
4. Phải thấy các bước Spring DI Foundation/Intermediate bổ sung. Advanced giữ module completed, assessment chờ phần nền tảng.

Nếu các mức nền tảng đã bị phát hiện thiếu từ lượt trước, không mở lại lượt đầu; sang8.11.1 rồi8.11.2.

### 8.11. OOP certificate, Spring DI và Transaction

#### 8.11.1 — James nộp OOP; David duyệt

1. James mở **Java OOP & SOLID Principles — Advanced**.
2. Chọn certificate `Brightpath OOP Advanced Demo Evidence` → **Submit certificate**.
3. Chọn file [Brightpath_Demo_Evidence.pdf](./Brightpath_Demo_Evidence.pdf).
4. Đọc preview. Nếu có Note, nhập `Brightpath demo fixture for James Wilson. Not a real credential.`.
5. Submit. Trạng thái **Pending review** chưa phải hoàn thành.
6. David mở **Certificates → Evidence review → Pending review**.
7. Mở đúng **James Wilson / Java OOP & SOLID Principles / Advanced**. Tải và xem file.
8. Nhập lý do `Approved the Brightpath demo fixture for this exact OOP Advanced requirement.`.
9. Bấm **Approve → Confirm**.
10. James Refresh pathway. OOP phải được đáp ứng trước khi làm phần tiếp theo.

#### 8.11.2 — James hoàn tất Spring DI theo thứ tự

**Mỗi dòng:** mở đúng module → hoàn tất hai bài đọc nếu chưa completed → Start/Retake Skill Assessment → chọn theo bảng → Submit → Back to pathway → đợi xử lý → Refresh. Chỉ qua dòng tiếp khi dòng trước đã hoàn thành.

| Thứ tự | Skill — mức cần mở | Module | Chọn trong toàn bộ đề |
| --- | --- | --- | --- |
| 1 | Spring IoC & Dependency Injection — Foundation | `Spring DI Foundation Guided Practice` | Spring DI Foundation: **B**; Java OOP & SOLID Principles Advanced: **B** |
| 2 | Spring IoC & Dependency Injection — Intermediate | `Spring DI Intermediate Guided Practice` | Spring DI Intermediate: **B**; Spring DI Foundation: **B**; Java OOP & SOLID Principles Advanced: **B** |
| 3 | Spring IoC & Dependency Injection — Advanced | `Spring DI Advanced Guided Practice` đã completed | Spring DI Advanced, Foundation, Intermediate và Java OOP & SOLID Principles Advanced: **B toàn bộ** |

Advanced phải có **lượt thi mới**. Điểm Advanced đã đạt ở8.10 không tự được dùng lại để hoàn tất sau khi học nền tảng.

#### 8.11.3 — James hoàn tất Transaction theo thứ tự

Chờ OOP và các mức Spring DI hoàn thành. Nếu đang phục hồi từ8.9.R, JPA certificate cũng phải được duyệt.

| Thứ tự | Skill — mức cần mở | Module |
| --- | --- | --- |
| 1 | Transaction Management — Foundation | `Transaction Foundation Guided Practice` |
| 2 | Transaction Management — Intermediate | `Transaction Intermediate Guided Practice` |
| 3 | Transaction Management — Advanced | `Transaction Advanced Guided Practice` đã completed |

**Áp dụng cho cả ba lượt ở bảng trên**, chỉ chọn những nhóm thực sự xuất hiện trong đề:

| Tên Skill — mức trong đề | Chọn mọi câu |
| --- | --- |
| Transaction Management — Foundation | **B** |
| Transaction Management — Intermediate | **B** |
| Transaction Management — Advanced | **B** |
| Spring IoC & Dependency Injection — Advanced | **B** |
| Java OOP & SOLID Principles — Advanced | **B** |
| **Spring Data JPA & Hibernate — Advanced** | **A** |
| **SQL Querying & Joins — Advanced** | **A** |

1. Làm Foundation, Submit → Refresh, kiểm tra đáp ứng.
2. Làm Intermediate, Submit → Refresh, kiểm tra đáp ứng.
3. Mở Advanced đã completed → **Retake Skill Assessment**, không học lại module.
4. Sau Submit, tất cả nhóm phải đạt. Chờ xử lý để Transaction Advanced hoàn thành.
5. Nếu bị khóa, xem phần Details/Locked và đối chiếu bảng trên; không dùng Retake để bỏ qua yêu cầu chưa hoàn tất.

### 8.12. Java Streams & Lambdas và Collections certificate

#### 8.12.1 — Lượt Streams đầu, chỉ khi chưa từng thi

1. James mở **Java Streams & Lambdas — Advanced** → `Java Streams Advanced Guided Practice`.
2. Hoàn tất hai bài đọc → Start Skill Assessment.
3. Chọn theo bảng:

| Nhóm trong đề Streams Advanced, lượt đầu | Chọn mọi câu |
| --- | --- |
| **Java Streams & Lambdas — Advanced** | **B** |
| Java Streams & Lambdas — Foundation | **A** |
| Java Streams & Lambdas — Intermediate | **A** |
| Java OOP & SOLID Principles — Advanced | **B** |
| Java Collections & Generics — Advanced | **A** |

4. Submit → Back to pathway → Refresh.
5. Streams Advanced đạt, Streams Foundation/Intermediate đạt. Collections Advanced chưa đạt nên cần certificate. Chưa hoàn thành Streams là đúng ở bước này.

**Nếu đã có lượt Streams thất bại, bỏ bước này.** Nếu Collections chưa hoàn thành, làm8.12.2. Nếu Collections đã Fulfilled như runtime đang tiếp tục, giữ evidence đó và đi thẳng8.12.3 sau khi OOP được đáp ứng.

#### 8.12.2 — James nộp Collections; David duyệt

1. James mở **Java Collections & Generics — Advanced**.
2. Chọn `Brightpath Collections Advanced Demo Evidence` → Submit certificate.
3. Chọn [Brightpath_Demo_Evidence.pdf](./Brightpath_Demo_Evidence.pdf) → đọc preview → Submit.
4. David mở Certificates → Evidence review, chọn đúng James/Collections/Advanced.
5. Tải file xem, nhập lý do `Approved the Brightpath demo fixture for this exact Collections Advanced requirement.`.
6. **Approve → Confirm**. James Refresh và kiểm tra Collections đã được đáp ứng.

#### 8.12.3 — Streams Advanced, lượt mới để hoàn tất

1. James mở lại `Java Streams Advanced Guided Practice`, giữ tiến độ completed.
2. Bấm **Retake Skill Assessment**.
3. Chọn theo bảng sau; **khác lượt đầu ở dòng Collections**:

| Nhóm trong đề Streams Advanced, retake | Chọn mọi câu |
| --- | --- |
| Java Streams & Lambdas — Advanced | **B** |
| Java Streams & Lambdas — Foundation | **A** |
| Java Streams & Lambdas — Intermediate | **A** |
| Java OOP & SOLID Principles — Advanced | **B** |
| Java Collections & Generics — Advanced | **B** |

4. Submit → Score details: mọi nhóm đạt → Back to pathway → Refresh.
5. Chờ xử lý để Streams Advanced hoàn thành. Không suy ra hoàn thành chỉ từ dòng MAIN đạt.

### 8.13. Đối chiếu cuối và reset

#### 8.13.1 — Kiểm tra hoàn thành

1. James Refresh pathway.
2. Kiểm tra các yêu cầu chính/bổ sung bắt buộc đã được đáp ứng; không còn module/chứng chỉ chờ xử lý.
3. Xem History: điểm lượt cũ giữ nguyên, lượt mới có thời gian và kết quả riêng.
4. Các chứng chỉ phải có submission **Approved**, không chỉ có definition trong catalog.
5. Pathway hoàn thành thì hệ thống cho giải phóng target theo điều kiện thực tế. Baseline no-gap vẫn tách khỏi achievement chính thức.

Không demo bypass trong đường đi này. Không đổi answer key, provision hay prerequisite giữa chừng.

#### 8.13.2 — Nếu muốn quay về điểm bắt đầu

1. Mở `http://localhost:8099/reset`.
2. Xác nhận reset runtime riêng.
3. Chỉ tiếp tục khi trạng thái hoàn tất; nếu lỗi, **Try again**.
4. Đăng nhập James và bắt đầu lại **8.8.1**.

| Reset giữ gì | Trạng thái |
| --- | --- |
| Checkpoint | `BRIGHTPATH_END_STEP_8_7` |
| Catalog/bank/module | 240 câu Published,8 module Released,2 certificate definitions OOP/Collections |
| Policy | Các policy checkpoint3/2/1; kích hoạt cấu hình chung sau checkpoint không được giữ |
| James | Target Senior và baseline thật60 câu/12 nhóm/4 gap |
| Được xóa khi reset | Pathway, Skill attempts, module progress, learner submissions/evidence phát sinh sau checkpoint |
| JPA definition phục hồi ở8.9.R | Phát sinh sau checkpoint; nếu cần lại thì tạo theo8.9.R.2 |
| Dev8088 | Không thuộc reset8099 |

### 8.14. Bảng tra đáp án gốc, không viết tắt Skill/mức

Bảng này là **đáp án đúng** của workbook05, không phải lựa chọn cố tình làm trượt ở lượt đầu8.9/8.10/8.12.

| Skill | Foundation | Intermediate | Advanced |
| --- | --- | --- | --- |
| Java OOP & SOLID Principles | A | A | **B** |
| Java Collections & Generics | A | A | **B** |
| Java Streams & Lambdas | A | A | **B** |
| Java Concurrency & CompletableFuture | A | A | A |
| Spring IoC & Dependency Injection | **B** | **B** | **B** |
| Spring MVC REST Controllers | A | A | A |
| Spring Data JPA & Hibernate | A | A | A |
| Transaction Management | **B** | **B** | **B** |
| SQL Querying & Joins | A | A | A |
| Indexing & Query Optimization | A | A | A |
| Schema Migration with Flyway | A | A | A |
| RESTful API Design | A | A | A |
| Spring Security, OAuth2 & JWT | A | A | A |
| Unit Testing with JUnit 5 & Mockito | A | A | A |
| Containerizing Services with Docker | A | A | A |
| Logging & Observability | A | A | A |

**Khi kết quả khác kỳ vọng:** ghi đúng tên bài, Skill/mức, mở Score details từng nhóm và so với bảng của **đúng lượt** đang làm. Mandatory phải đúng kể cả tổng điểm đủ. Không dùng “chọn A/B cho các nhóm còn lại” để suy đoán. Build chỉ xác nhận code biên dịch; giới hạn kiểm chứng runtime được ghi trong bàn giao.
