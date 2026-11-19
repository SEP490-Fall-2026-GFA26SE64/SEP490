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
| 1 | Chọn cạnh → **Switch Direction** | `MS-JAVA-OOP` Intermediate ← `MS-JAVA-STREAM` Foundation | Sai chiều: Streams cần OOP trước, không phải ngược lại |
| 2 | Chọn cạnh → **Delete Relationship** | `MS-DOCKER` Foundation ← `MS-SPRING-WEB` Intermediate | Docker không phụ thuộc Spring MVC |
| 3 | Kéo nối 2 node → **Set Exact Prerequisite** → **Confirm Prerequisite** | `MS-SPRING-TX` **Advanced** ← `MS-JAVA-CONC` **Intermediate** | Isolation/locking nâng cao cần hiểu concurrency |

Ô nhập của thao tác 3:

| Field | Giá trị |
| --- | --- |
| Dependent knowledge level | `Advanced` (của MS-SPRING-TX) |
| Prerequisite knowledge level | `Intermediate` (của MS-JAVA-CONC) |

13 prerequisite đúng còn lại trong file (để tham khảo khi giải thích graph):

```text
MS-JAVA-STREAM Intermediate ← MS-JAVA-COLL Foundation
MS-JAVA-CONC   Intermediate ← MS-JAVA-OOP Intermediate
MS-SPRING-DI   Foundation   ← MS-JAVA-OOP Foundation
MS-SPRING-WEB  Intermediate ← MS-SPRING-DI Foundation
MS-SPRING-WEB  Intermediate ← MS-REST-DESIGN Foundation
MS-SPRING-DATA Intermediate ← MS-SPRING-DI Foundation
MS-SPRING-DATA Intermediate ← MS-SQL-QUERY Foundation
MS-SPRING-TX   Intermediate ← MS-SPRING-DATA Foundation
MS-SQL-INDEX   Intermediate ← MS-SQL-QUERY Intermediate
MS-DB-MIGRATE  Foundation   ← MS-SQL-QUERY Foundation
MS-API-SEC     Intermediate ← MS-SPRING-WEB Intermediate
MS-JUNIT       Intermediate ← MS-SPRING-DI Foundation
MS-OBSERV      Intermediate ← MS-DOCKER Foundation
```

## 7. Expert cấu hình micro-skill cho target role

**Roles** (`/workspace/brightpath/expert/roles`) → role **JAVA-BE** → chọn từng level → **Add Competency** cho level → trong khối **Add Micro-skill Target** chọn **From Competency**, **Micro-skill**, tick **Required levels** → bấm assign. Mọi level phải có competency + micro-skill trước khi **Submit to L&D Manager** (có thể **Save Draft** giữa chừng).

Bảng cấu hình (F = Foundation, I = Intermediate, A = Advanced; mức ghi là mức yêu cầu cao nhất):

| Competency | Micro-skill | Junior (1) | Middle (2) | Senior (3) |
| --- | --- | --- | --- | --- |
| COMP-JAVA-CORE | MS-JAVA-OOP | I | I | A |
| COMP-JAVA-CORE | MS-JAVA-COLL | I | I | – |
| COMP-JAVA-CORE | MS-JAVA-STREAM | F | I | A |
| COMP-JAVA-CORE | MS-JAVA-CONC | – | F | A |
| COMP-SPRING | MS-SPRING-DI | F | I | – |
| COMP-SPRING | MS-SPRING-WEB | F | I | A |
| COMP-SPRING | MS-SPRING-DATA | – | I | A |
| COMP-SPRING | MS-SPRING-TX | – | F | A |
| COMP-DATA | MS-SQL-QUERY | I | I | – |
| COMP-DATA | MS-SQL-INDEX | – | F | A |
| COMP-DATA | MS-DB-MIGRATE | – | F | I |
| COMP-API | MS-REST-DESIGN | – | I | A |
| COMP-API | MS-API-SEC | – | F | A |
| COMP-QUALITY-OPS | MS-JUNIT | F | I | I |
| COMP-QUALITY-OPS | MS-DOCKER | – | F | I |
| COMP-QUALITY-OPS | MS-OBSERV | – | – | I |

Competency theo level: Junior = JAVA-CORE, SPRING, DATA, QUALITY-OPS; Middle và Senior = cả 5 competency.

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

## 8. Phần demo tiếp theo: từ import câu hỏi đến hoàn thành pathway

Làm tiếp sau bước 7 ở trên. Phần này gồm 7 bước, dùng cùng một kịch bản: giữ nguyên loại trong file 04: **Docker/Foundation và Intermediate là Module; Advanced là Certificate**. Không cần sửa loại skill sau import.

### Trước khi import câu hỏi

Đăng nhập **David Thompson**. Giữ nguyên loại Module/Certificate của tất cả skill từ file 04; không mở Edit để đổi Docker/Foundation.

Để diễn tình huống recalculate bên dưới, hoàn tất cấu hình role và graph trước khi import nội dung:

1. Trong **Roles → JAVA-BE → Middle**, đặt yêu cầu **MS-SQL-INDEX = Intermediate** thay cho Foundation trong bảng bước 7, rồi lưu. Đây là yêu cầu của role, không phải đổi loại skill trong file 04.
2. Trong **Explore Graph**, thêm **MS-SQL-INDEX/Foundation cần MS-SQL-QUERY/Intermediate**. Giữ cạnh SQL Indexing/Intermediate cần SQL Querying/Intermediate đã có; không tạo cạnh tự nối hai mức của SQL Indexing.
3. Hoàn tất các thay đổi prerequisite ở bước 6 phía trên, lưu cấu hình role và gửi cho L&D theo màn hình.

Sau khi import bank, không lưu chỉnh skill chỉ để mở ô baseline: version mới có thể làm câu hỏi theo version cũ không còn hợp lệ. Với luồng mới từ đầu, cứ dùng loại đã import từ 04 và bank 05 đi kèm.

| File | Nội dung |
| --- | --- |
| [05_Question_Bank_Java_Backend.xlsx](./05_Question_Bank_Java_Backend.xlsx) | 195 câu / 39 nhóm skill–mức, gồm Docker/Foundation và Intermediate |
| [06_Learning_Modules_Java_Backend_Demo.zip](./06_Learning_Modules_Java_Backend_Demo.zip) | 6 module / 12 bài đọc; upload nguyên ZIP |

Không cần ZIP bổ sung `02-after-bypass.zip`. Pathway Middle dùng Docker/Foundation theo Module. Certificate Docker/Advanced là nội dung riêng, không phải điều kiện hoàn thành Middle.

### Bước 1. Expert import câu hỏi

1. Vào **Question Bank → Import Excel**, chọn `05_Question_Bank_Java_Backend.xlsx`.
2. Kiểm tra preview: **195 câu / 39 nhóm skill–mức**, mỗi nhóm **4 câu thường + 1 mandatory**. Docker có cả **Foundation và Intermediate**, đúng hai mức Module trong file 04.
3. Nếu không có lỗi, xác nhận import **một lần**, rồi gửi các Draft đi duyệt theo màn hình.
4. Nếu đã import thành công nhưng gửi duyệt lỗi, mở các Draft đã tạo và gửi lại; không import lại cả file để tránh trùng câu hỏi.

Import nguyên file 05; không xóa năm câu Docker/Foundation. Bank bao phủ đủ 39 nhóm Module của file 04; các mức Certificate không có câu hỏi.

### Bước 2. Expert import module và tạo certificate

1. Vào **Modules → Import**, chọn nguyên file `06_Learning_Modules_Java_Backend_Demo.zip`; không giải nén để upload riêng từng bài.
2. Kiểm tra preview **6 module, 12 lesson**, không lỗi.
3. Chọn **Confirm & submit for review**. Nếu chọn **Confirm import**, mở các Draft vừa tạo rồi gửi duyệt.

| Module | Skill / mức | Dùng để diễn |
| --- | --- | --- |
| Java Collections Intermediate Guided Practice | MS-JAVA-COLL / Intermediate | Học và thi đạt |
| Java Collections Intermediate Scenario Workshop | MS-JAVA-COLL / Intermediate | Phương án thay thế để Expert include/exclude |
| SQL Indexing Intermediate Guided Practice | MS-SQL-INDEX / Intermediate | Thi sai nền tảng để sinh phần bổ sung |
| SQL Indexing Foundation Guided Practice | MS-SQL-INDEX / Foundation | Học bổ sung mức thấp hơn |
| SQL Querying Intermediate Guided Practice | MS-SQL-QUERY / Intermediate | Học bổ sung skill tiên quyết |
| Docker Foundation Guided Practice | MS-DOCKER / Foundation | Học và đánh giá Docker nếu baseline chưa đạt |

#### Tạo certificate Docker/Advanced (tùy chọn)

Mở **Certificates → Certificate catalog → Add**, chọn và nhập:

| Field | Giá trị |
| --- | --- |
| Skill | Containerizing Services with Docker / MS-DOCKER |
| Knowledge level | Advanced |
| Name | Docker Advanced — Demo Certificate |
| Mô tả và năng lực được chứng nhận | Thiết kế image nhiều giai đoạn, giảm kích thước image, cấu hình Docker Compose và giải thích lựa chọn cấu hình container cho dịch vụ Java. |
| Reference URL | Link HTTPS tới tài liệu hoặc mẫu chứng chỉ đã chuẩn bị |

Bấm **Continue → Confirm** rồi lưu. Tạo certificate trong catalog chưa công nhận Employee đã đạt.

Docker/Foundation không xuất hiện trong Add Certificate là đúng, vì mức này dùng Module. Chỉ chọn Docker/Advanced vốn đã là Certificate trong file 04. Việc tạo catalog này không thêm yêu cầu chứng chỉ vào role Middle; không có bước nộp Docker/Foundation certificate trong luồng này.

### Bước 3. L&D duyệt và publish nội dung

**Người làm:** Sarah Mitchell.

1. Mở hàng đợi câu hỏi, kiểm tra các câu vừa gửi ở bước 1, rồi **Approve/Publish** theo màn hình.
2. Mở quản lý module, xem nội dung của sáu module, rồi duyệt và **Publish**.
3. Kiểm tra câu hỏi và module đã ở **Published**. Draft hoặc Submitted chưa dùng được để ra đề hoặc học.

**Kết quả:** bank và sáu module đã xuất bản. Nếu tạo catalog Docker/Advanced ở bước 2, đó là phần minh họa riêng; luồng Middle không yêu cầu Employee nộp chứng chỉ này.

### Bước 4. Expert kích hoạt Skill Assessment

Đăng nhập **David Thompson**. Mở cấu hình cho năm nhóm chính: **Java Collections/Intermediate**, **SQL Indexing/Intermediate**, **SQL Indexing/Foundation**, **SQL Querying/Intermediate**, **Docker/Foundation**.

Với mỗi nhóm chính, nhập theo các nhóm mà màn hình liệt kê:

| Thông số | Giá trị demo |
| --- | --- |
| Tổng câu mỗi nhóm | 3 |
| Số câu cần đúng mỗi nhóm | 2 |
| Mandatory của MAIN | 1 |
| Mandatory của nhóm tiên quyết | 0 |
| Thời gian | 10 phút |
| Số lượt | 3 |
| Chờ làm lại | 0 phút |
| Checkbox sai toàn bộ tiên quyết thì phải thi lại MAIN | Bỏ chọn cho tình huống sinh phần học bổ sung |

Bấm **Save & activate**. Nếu lưu được nhưng kích hoạt lỗi, mở bản nháp đã lưu để kích hoạt lại.

Với SQL Indexing/Intermediate, kiểm tra có các nhóm **MAIN Intermediate**, **SQL Indexing/Foundation** và **SQL Querying/Intermediate**. Nếu thiếu, kiểm tra cấu hình mức và tiên quyết trước khi cho Employee thi. Với các MAIN khác, giữ đúng các nhóm do hệ thống liệt kê.

Quota mandatory bằng 0 dùng được khi đủ câu thường. Ví dụ tổng 5, bank 4 thường + 1 mandatory thì quota phải ít nhất 1; hoặc giảm tổng xuống 4. Checkbox chỉ chặn riêng trường hợp tiên quyết đúng **0 câu**. Dù bỏ checkbox, tiên quyết chưa đạt vẫn có thể làm yêu cầu học chưa hoàn thành.

### Bước 5. L&D kích hoạt baseline và publish role

1. Đăng nhập **Sarah Mitchell → Baseline Assessments → Java Backend Developer**.
2. Trong **Questions**, nhập cho từng mức được liệt kê:

| Ô nhập | Giá trị |
| --- | --- |
| Questions per Skill | 3 |
| Correct to pass | 2 |

3. Trong **Time & retakes**, đặt thời gian **20 phút**, số lượt **3**, chờ thi lại **0 phút**.
4. Sang **Review**, kiểm tra rồi **Activate**.

“Limiting Skills” là các skill có ít câu hỏi hợp lệ nhất, không phải số skill được thêm. Nếu ô bị khóa ở 0, kiểm tra bank đã Published và khớp đúng skill, mức, version. Docker/Foundation và Intermediate đều cần câu hỏi Published theo đúng version; năm câu Foundation mới đã có trong file 05. Không đổi loại skill qua lại để mở ô nhập.

#### L&D duyệt và publish JAVA-BE

1. Mở **Roles → JAVA-BE** do David gửi.
2. Kiểm tra Middle có SQL Indexing/Intermediate và Docker/Foundation.
3. Duyệt, chuyển **Active/Publish** theo màn hình. Nếu thiếu cấu hình, xử lý thông báo trước khi xác nhận lại.

Với Middle theo bảng và chỉ chọn mức yêu cầu đã nêu, dự kiến baseline có **15 nhóm Module × 3 câu = 45 câu**, bao gồm Docker/Foundation. Đối chiếu phạm vi thực tế trước khi thi, không tự sửa dữ liệu kết quả để khớp con số dự kiến.

### Bước 6. Employee làm RIASEC, baseline và yêu cầu pathway

**Người làm:** James Wilson.

#### 6.1. Làm RIASEC

1. Mở **Overview → RIASEC**, trả lời đủ **60 hoạt động** theo mức độ yêu thích, rồi nộp.
2. Xem sáu điểm và trạng thái gợi ý Job position. Nếu AI đang xử lý, tiếp tục phần role trong lúc chờ; không nộp bài mới chỉ vì chưa có gợi ý ngay.
3. Khi có kết quả, xem vị trí và lý do gợi ý. RIASEC không tự cộng điểm skill hay hoàn thành pathway.

Job position cần đủ sáu điểm tham chiếu; tính năng và dịch vụ mô hình phải hoạt động. Thời gian và lời giải thích AI có thể khác nhau giữa các lần.

#### 6.2. Chọn mục tiêu Middle và làm baseline

1. Vào **Upskilling → Roles → Java Backend Developer → Middle**, xác nhận chọn mục tiêu.
2. Mở baseline. Với đúng bank demo này, chọn **A cho mọi câu** để tạo ba gap: Java Collections/Intermediate (đáp án B), SQL Indexing/Intermediate (C), API Security/Foundation (B).
3. Nộp và xem chi tiết. Dự kiến **12/15 nhóm đạt, 3 nhóm chưa đạt**. Nếu khác, kiểm tra nhóm được thi và cấu hình thực tế.
4. Docker/Foundation nằm trong bài baseline và dùng đáp án **A**. Theo cách chọn trên, nhóm này đạt; còn ba gap học, không có yêu cầu chứng chỉ Docker/Foundation.
5. Nếu muốn diễn thêm phần học Docker, riêng các câu Docker/Foundation chọn **B** để cố ý sai. Khi đó dự kiến **11/15 nhóm đạt, 4 nhóm chưa đạt**; module Docker ở bước 2 sẽ dùng cho gap thứ tư.

Các đáp án trên chỉ dùng tạo tình huống demo, không phải hướng dẫn làm bài thật.

#### 6.3. Yêu cầu pathway

Bấm **Request pathway**, xác nhận một lần và chờ. Nếu đã có yêu cầu, mở yêu cầu hiện tại thay vì gửi thêm.

### Bước 7. Duyệt pathway, học và hoàn thành

#### 7.1. Expert duyệt pathway

1. Đăng nhập **David Thompson → Pathway review**, mở yêu cầu của **James Wilson**.
2. Chọn node Java Collections/Intermediate. Exclude cả hai module rồi **Check**. Node phải báo lỗi không còn module được chọn; chưa được Approve.
3. Include lại **Guided Practice**. Có thể giữ exclude **Scenario Workshop** để minh họa hai module thay thế. Việc exclude hết không làm skill đủ điều kiện bypass nếu catalog vẫn có module phù hợp.
4. Với API Security/Foundation, nếu thực sự chưa có module/chứng chỉ phù hợp, chọn **Bypass**, ghi: **Chưa có nội dung phù hợp; bổ sung khi có nội dung mới.**
5. Kiểm tra lại, **Save** thay đổi, rồi **Approve** phiên bản hợp lệ. Nếu Check báo lỗi khác, chọn node đó và sửa theo thông báo trước khi duyệt.

Bypass giữ lại gap và lịch sử duyệt, chưa công nhận đạt skill. Sau khi duyệt, Employee mở lại pathway để thấy trạng thái mới.

#### 7.2. Employee học Java Collections và thi đạt

1. Mở **Adaptive Pathway → Java Collections/Intermediate → Guided Practice**.
2. Học đủ hai bài, hoàn thành nội dung, rồi mở Skill Assessment.
3. Với bank demo: nhóm Java Collections/Intermediate chọn **B**; nhóm Foundation nếu có chọn **A**. Đọc đúng tên nhóm, không chọn B cho cả bài.
4. Nộp, đợi kết quả và quay lại pathway. Khi đủ điều kiện, yêu cầu được đánh dấu hoàn thành.

#### 7.3. Demo recalculate: MAIN đạt nhưng còn thiếu nền tảng

1. Mở **SQL Indexing/Intermediate**, học hết hai bài rồi làm Skill Assessment.
2. Với bank demo: nhóm **Intermediate MAIN chọn C**. Nhóm **SQL Indexing/Foundation** và **SQL Querying/Intermediate chọn B** để cố ý sai nền tảng.
3. Nộp và đợi pathway cập nhật. Xem điểm MAIN riêng với trạng thái yêu cầu tổng. MAIN đạt chưa có nghĩa là yêu cầu đã hoàn thành.
4. Quan sát hai phần học bổ sung: **SQL Querying/Intermediate** và **SQL Indexing/Foundation**. MAIN bị khóa chờ hoàn thành phần cần thiết; bấm node để xem cụ thể cần học gì.
5. Học **SQL Querying/Intermediate** trước, hoàn thành nội dung và thi đạt. Với bank demo, nhóm này chọn **A**; các nhóm khác nếu có đọc đúng nhãn và đối chiếu bank.
6. Sau đó học **SQL Indexing/Foundation**, hoàn thành nội dung và thi đạt. Hai nhóm Foundation và SQL Querying/Intermediate dùng đáp án **A** trong bank demo.
7. Khi có đủ kết quả đạt cho các phần bổ sung, quay lại **SQL Indexing/Intermediate** và **thi lại MAIN**. Nội dung đã học được giữ. Điểm MAIN cũ không tự được công nhận sau khi học bổ sung.
8. Lượt mới: MAIN Intermediate chọn **C**, Foundation và SQL Querying/Intermediate chọn **A**. Nộp và xem pathway cập nhật.

Nếu hết lượt hoặc chưa đến giờ thi lại, xử lý theo thông báo và policy; không reset dữ liệu để bỏ khóa. Nếu phát sinh thêm nhóm ngoài bảng, kiểm tra đúng cấu hình đang được áp dụng.

#### 7.4. Học Docker nếu chưa đạt và hoàn thành pathway

1. Nếu đã cố ý làm sai Docker/Foundation ở bước 6, Expert kiểm tra module **Docker Foundation Guided Practice** được chọn khi duyệt pathway. Employee mở module, học đủ hai bài rồi làm Skill Assessment.
2. Với bank này, câu Docker/Foundation chọn **A**. Nếu có thêm nhóm do policy liệt kê, đọc đúng tên và dùng đáp án theo bank; không chọn A tùy tiện cho nhóm khác.
3. Nếu Docker đã đạt ở baseline thì bỏ qua phần học này. Không nộp chứng chỉ để thay thế kết quả Module của Docker/Foundation.
4. Khi các yêu cầu bắt buộc hoàn thành hoặc có quyết định bypass hợp lệ, xem trạng thái pathway và lịch sử. Bypass vẫn không trở thành năng lực đã đạt.
5. Kiểm tra quyền chọn mục tiêu tiếp theo theo trạng thái hiện tại; giữ lại pathway cũ.

Docker/Advanced Certificate chỉ được nộp và duyệt trong một pathway thực sự yêu cầu đúng skill/mức này. Role Middle ở kịch bản hiện tại không có yêu cầu đó, nên phần này không hướng dẫn nộp chứng chỉ Advanced để hoàn thành Middle.

#### 7.5. Tình huống thêm nội dung sau bypass (tùy chọn)

Phần demo chính không cần ZIP thứ hai. Nếu muốn diễn thêm, Expert có thể tự tạo module **API Security/Foundation** với bài học hợp lệ rồi gửi L&D duyệt và publish, hoặc tạo nguồn phù hợp theo cấu hình skill đang dùng.

Employee xem thông báo để biết **skill, mức và nội dung vừa thêm**. Nội dung xuất hiện dưới nhãn **Học bổ sung** ở cuối graph/timeline hiện có. Không có graph Role thứ hai, không mở lại hoàn thành của pathway cũ và không khóa đổi role. Nếu chưa có target/pathway mới, vẫn mở được nội dung từ phần gap cũ và liên kết Skill. Các điều kiện tiên quyết vẫn áp dụng; certificate vẫn nộp qua luồng pathway được duyệt hiện có.

Mở dropdown chuông để xem thông báo: chỉ mục thực sự hiện ra được đánh dấu đọc; cuộn để xem các mục còn lại. Nếu lưu trạng thái đọc lỗi, dùng **Retry**.

### Tham khảo: RIASEC trong file 01

tab **Job positions** đã có thêm sáu cột `RIASEC R`, `RIASEC I`, `RIASEC A`, `RIASEC S`, `RIASEC E`, `RIASEC C`. R = Realistic, I = Investigative, A = Artistic, S = Social, E = Enterprising, C = Conventional. Mỗi ô là số nguyên từ 0 đến 40. Nhập đủ sáu ô của một vị trí, hoặc để trống cả sáu. File cũ không có các cột này vẫn import được.

| Job position | R | I | A | S | E | C |
| --- | --- | --- | --- | --- | --- | --- |
| Backend Engineer | 18 | 38 | 12 | 10 | 16 | 28 |
| Frontend Engineer | 14 | 30 | 32 | 16 | 18 | 22 |
| QA Engineer | 20 | 34 | 10 | 14 | 12 | 36 |
| Data Engineer | 16 | 40 | 12 | 10 | 14 | 32 |
| Learning & Development Specialist | 8 | 22 | 20 | 40 | 32 | 26 |

Đây là **điểm mẫu tự đặt cho demo**, không phải điểm nghiên cứu nghề nghiệp. Chúng mô tả Job position để so với kết quả sở thích của Employee. Chúng không thay điểm bài RIASEC của Employee. Cấu trúc và điểm được lưu khi onboarding tạo workspace sau thanh toán; import preview chưa ghi chúng vào catalog của workspace. Với workspace đã tạo từ file cũ, cập nhật điểm ở màn hình quản lý Job position. Không đăng ký lại hoặc reset chỉ để đổi điểm.

### Lưu ý khi dùng trên deploy

- Chỉnh file local không cập nhật bank trên server. Tài liệu này dành cho luồng nhập mới theo thứ tự trên. Nếu deploy đã có 190 câu, chỉ bổ sung năm câu Docker/Foundation còn thiếu sau khi đối chiếu dữ liệu; không nhập trùng toàn bank.
- Nếu đã sửa skill sau khi import bank, cần đối chiếu version và nội dung hiện có trước khi bổ sung; không sửa Excel hoặc đổi loại qua lại để che lỗi version.
- Sau khi merge và workflow deploy hoàn tất, tải lại trang. Push nhánh fix chưa làm server đổi bản.
- SMTP, storage, kết nối dữ liệu, worker và mô hình RIASEC phụ thuộc môi trường. Kiểm tra file tĩnh không chứng minh toàn bộ luồng đang chạy trên deploy.
