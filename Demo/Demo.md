# Kịch bản demo: Onboarding → Users → Target Role

Tài liệu này chứa dữ liệu để **copy/paste** khi demo và các file Excel đã điền sẵn trong cùng thư mục:

| File | Dùng ở bước | Nội dung |
| --- | --- | --- |
| [01_Org_Structure_SaoMai.xlsx](./01_Org_Structure_SaoMai.xlsx) | 1. Onboarding (Your business → Import structure) | 4 department, 5 job position, 5 target role, 14 level |
| [02_Users_SaoMai.xlsx](./02_Users_SaoMai.xlsx) | 2. Admin import users | 1 L&D Manager, 3 Domain Expert, 7 Employee |
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

User import sẽ nhận **email kích hoạt thật** qua SMTP. Địa chỉ `@example.com` trong file không nhận được thư. Trước khi demo, mở `02_Users_SaoMai.xlsx`, sheet **Users**, cột **Email** và thay `demo.inbox` bằng hộp thư Gmail của bạn (Gmail plus-addressing, mọi thư về cùng một inbox):

```text
demo.inbox+ld@example.com         →  yourname+ld@gmail.com
demo.inbox+expert.be@example.com  →  yourname+expert.be@gmail.com
```

Tối thiểu cần đổi email của **Phạm Thu Hà (L&D)** và **Lê Quốc Bảo (Expert)** vì hai người này phải đăng nhập trong kịch bản. Gửi lời mời chạy tuần tự (~10–15 giây/người), 11 người mất khoảng 2–3 phút.

---

## 1. Onboarding – wizard 7 bước

Mở `http://localhost:8088/register`.

### Bước 1 – Your business

| Field | Giá trị |
| --- | --- |
| Business name | `Sao Mai Software JSC` |
| Country | `Vietnam` |
| Industry | `Software & artificial intelligence` |
| Workspace address | `saomai` |

Bấm **Import structure** → chọn `01_Org_Structure_SaoMai.xlsx` → kiểm tra preview (Department: 4) → **Apply structure** → tiếp tục.

### Bước 2 – Administrator

| Field | Giá trị |
| --- | --- |
| Full name | `Trần Minh Quân` |
| Login email | `demo.inbox+admin@example.com` (đổi thành Gmail của bạn nếu bật xác thực email) |
| Phone number | `0901234567` |
| Password | `SaoMai@Demo2026` |
| Confirm Password | `SaoMai@Demo2026` |

Tick ô đồng ý điều khoản → **Create account**.

### Bước 3 – Verify email, Bước 4 – Account security

Ở stack dev hai bước này được bypass (tự chuyển tiếp). Nếu bật, nhập mã OTP gửi về Login email và quét QR MFA bằng ứng dụng Authenticator.

### Bước 5 – Choose a plan

**Continue to subscription plans** → **Select Starter** (20 Employee seats, 1 tháng) → trong hộp thoại *Confirm purchase terms* bấm **Create payment order**.

### Bước 6 – Payment

Dev: hiện **Development payment bypass**, đơn tự xác nhận. payOS thật: quét QR, chuyển đúng số tiền/nội dung, trang tự cập nhật.

### Bước 7 – Your workspace

Bấm **Enter workspace** → vào `http://localhost:8088/workspace/saomai/admin/subscription`.

---

## 2. Admin import users (3 role)

Admin `Trần Minh Quân` → **User Accounts** (`/workspace/saomai/admin/users`) → **Import Excel** → chọn `02_Users_SaoMai.xlsx` → preview báo **11 valid** → **Import 11 valid user(s)** → chờ kết quả `11 invitation(s) sent. 0 row(s) not imported.` → **Done**.

| Full name | Email | Role | Department | Job position |
| --- | --- | --- | --- | --- |
| Phạm Thu Hà | `demo.inbox+ld@example.com` | L&D Manager | HR | – (làm trưởng phòng HR) |
| Lê Quốc Bảo | `demo.inbox+expert.be@example.com` | Domain Expert | ENG | Backend Engineer |
| Võ Thanh Tâm | `demo.inbox+expert.qa@example.com` | Domain Expert | QA | QA Engineer |
| Đặng Minh Khoa | `demo.inbox+expert.data@example.com` | Domain Expert | DATA | Data Engineer |
| Nguyễn Hoàng Nam | `demo.inbox+nam@example.com` | Employee | ENG | Backend Engineer |
| Trần Thị Mai Anh | `demo.inbox+maianh@example.com` | Employee | ENG | Backend Engineer |
| Bùi Đức Huy | `demo.inbox+huy@example.com` | Employee | ENG | Frontend Engineer |
| Hoàng Gia Linh | `demo.inbox+linh@example.com` | Employee | ENG | Frontend Engineer |
| Ngô Thị Thanh Hương | `demo.inbox+huong@example.com` | Employee | QA | QA Engineer |
| Đỗ Văn Phúc | `demo.inbox+phuc@example.com` | Employee | DATA | Data Engineer |
| Lý Ngọc Trâm | `demo.inbox+tram@example.com` | Employee | HR | Learning & Development Specialist |

Mỗi người mở email → link `/activate` → đặt mật khẩu. Mật khẩu gợi ý cho mọi tài khoản demo (≥ 12 ký tự):

```text
SaoMai@Demo2026
```

Thêm user lẻ bằng tay (tuỳ chọn) qua **Create User**:

| Field | Giá trị |
| --- | --- |
| Full name | `Phan Anh Tuấn` |
| Email | `demo.inbox+tuan@example.com` |
| Role | Employee |
| Department | `ENG - Software Engineering` |
| Job position | `BE-ENG - Backend Engineer` |
| Target role / Level | `JAVA-BE - Java Backend Developer` / `Junior` |

---

## 3. L&D Manager giao Expert maintain role

Đăng nhập `Phạm Thu Hà` → **Roles** (`/workspace/saomai/ld-manager/roles`) → role **JAVA-BE – Java Backend Developer** → **Edit Role & Assigned Expert**:

| Field | Giá trị |
| --- | --- |
| Assigned Expert | `Lê Quốc Bảo` |

→ **Save & Send to Expert**. (Tuỳ chọn: QA-AUTO → `Võ Thanh Tâm`, DATA-PIPE → `Đặng Minh Khoa`.)

---

## 4. Expert import competency

Đăng nhập `Lê Quốc Bảo` → **Ontology** (`/workspace/saomai/expert/ontology`) → tab **Competencies** → **Import Excel** → chọn `03_Competencies_JavaBackend.xlsx` → xác nhận import.

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

**Roles** (`/workspace/saomai/expert/roles`) → role **JAVA-BE** → chọn từng level → **Add Competency** cho level → trong khối **Add Micro-skill Target** chọn **From Competency**, **Micro-skill**, tick **Required levels** → bấm assign. Mọi level phải có competency + micro-skill trước khi **Submit to L&D Manager** (có thể **Save Draft** giữa chừng).

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

`Sao Mai Software JSC` là công ty giả lập, mô phỏng cấu trúc phổ biến của các công ty phần mềm/outsourcing tại Việt Nam: khối Engineering (Backend/Frontend), QA độc lập, Data & Analytics và khối People & Learning (HR + L&D).

| Dữ liệu demo | Tham chiếu bên ngoài |
| --- | --- |
| Backend Engineer (BE-ENG) | O*NET 15-1252.00 Software Developers |
| Frontend Engineer (FE-ENG) | O*NET 15-1254.00 Web Developers |
| QA Engineer (QA-ENG) | O*NET 15-1253.00 Software Quality Assurance Analysts and Testers |
| Data Engineer (DATA-ENG) | O*NET 15-1243.01 Data Warehousing Specialists |
| L&D Specialist (LD-SPEC) | O*NET 13-1151.00 Training and Development Specialists |
| Level Junior / Middle / Senior | Cách gọi cấp bậc trong ITviec IT Salary & Job Market Report 2025-2026; tương ứng SFIA 9 level 2 / 3 / 4 |
| Competency & micro-skill Java Backend | roadmap.sh Java và Spring Boot roadmap |

Nguồn: <https://www.onetonline.org/>, <https://sfia-online.org/en/sfia-9>, <https://itviec.com/blog/it-salary-report/>, <https://roadmap.sh/java>, <https://roadmap.sh/spring-boot>.

---

## Lặp lại demo

Mở lại `/reset` → toàn bộ Sao Mai (workspace `saomai`, admin và 11 user, competency/micro-skill/graph, file upload) bị xoá → chạy lại từ bước 1 với **cùng** workspace address và email.


---

## 8. Phần demo tiếp theo: từ ngân hàng câu hỏi đến hoàn thành lộ trình

Phần này làm tiếp sau bước 7. Các bước ở trên được giữ nguyên. Dùng bộ file trong thư mục `Demo` của bản source đang deploy, không dùng lại đường dẫn local 30088/30080 đã xóa.

### 8.1. File cần dùng

| File | Cách dùng |
| --- | --- |
| [05_Question_Bank_Java_Backend.xlsx](./05_Question_Bank_Java_Backend.xlsx) | Expert import ngân hàng 190 câu Java Backend |
| [06_Learning_Modules_Java_Backend_Demo.zip](./06_Learning_Modules_Java_Backend_Demo.zip) | Expert import 5 module, tổng 10 bài đọc |

Upload nguyên file ZIP. Không giải nén để upload từng bài. Không cần gói `02-after-bypass.zip` cho phần demo chính này.

**RIASEC trong file 01:** tab **Job positions** đã có thêm sáu cột `RIASEC R`, `RIASEC I`, `RIASEC A`, `RIASEC S`, `RIASEC E`, `RIASEC C`. R = Realistic, I = Investigative, A = Artistic, S = Social, E = Enterprising, C = Conventional. Mỗi ô là số nguyên từ 0 đến 40. Nhập đủ sáu ô của một vị trí, hoặc để trống cả sáu. File cũ không có các cột này vẫn import được.

| Job position | R | I | A | S | E | C |
| --- | --- | --- | --- | --- | --- | --- |
| Backend Engineer | 18 | 38 | 12 | 10 | 16 | 28 |
| Frontend Engineer | 14 | 30 | 32 | 16 | 18 | 22 |
| QA Engineer | 20 | 34 | 10 | 14 | 12 | 36 |
| Data Engineer | 16 | 40 | 12 | 10 | 14 | 32 |
| Learning & Development Specialist | 8 | 22 | 20 | 40 | 32 | 26 |

Đây là **điểm mẫu tự đặt cho demo**, không phải điểm nghiên cứu nghề nghiệp. Chúng mô tả Job position để so với kết quả sở thích của Employee. Chúng không thay điểm bài RIASEC của Employee. Cấu trúc và điểm được lưu khi onboarding tạo workspace sau thanh toán; import preview chưa ghi chúng vào catalog của workspace. Với workspace đã tạo từ file cũ, cập nhật điểm ở màn hình quản lý Job position. Không đăng ký lại hoặc reset chỉ để đổi điểm.

### 8.2. Expert chuẩn bị đúng các skill và mức

Đăng nhập **Lê Quốc Bảo**. Trước khi gửi role sang L&D, kiểm tra:

1. Trong cấu hình skill, **MS-DOCKER / Foundation** dùng **Certificate**. Các nhóm có câu hỏi trong file 05 dùng **Module**. Một cặp skill/mức chỉ dùng một loại.
2. Với **Middle**, đổi yêu cầu **MS-SQL-INDEX** từ Foundation ở bảng bước 7 thành **Intermediate** để diễn phần học bổ sung. Các yêu cầu khác giữ theo bảng.
3. Trong Explore Graph, thêm tiên quyết **MS-SQL-INDEX / Foundation cần MS-SQL-QUERY / Intermediate**. Giữ cạnh **MS-SQL-INDEX / Intermediate cần MS-SQL-QUERY / Intermediate** đã có. Không vẽ cạnh tự nối hai mức của SQL Indexing.
4. Lưu cấu hình skill và role theo màn hình hiện tại. Nếu đã gửi role, mở sửa theo quy trình rồi gửi lại để L&D duyệt phiên bản mới.

Các lựa chọn này giúp phần SQL Indexing/Intermediate có cả mức Foundation của chính skill và SQL Querying/Intermediate là skill tiên quyết khác.

### 8.3. Expert import question bank

1. Vào **Question Bank → Import Excel**.
2. Chọn `05_Question_Bank_Java_Backend.xlsx`.
3. Xem preview: dự kiến **190 câu**, không có lỗi. Nếu có lỗi, sửa theo dòng được báo trước khi xác nhận.
4. Xác nhận import **một lần**. Gửi duyệt nếu đang ở Draft.
5. Đăng nhập **Phạm Thu Hà (L&D)**, mở hàng đợi câu hỏi, kiểm tra rồi **Approve/Publish** theo thao tác được cung cấp. Bank phải ở **Published** mới dùng để ra đề.

Bank có 38 nhóm skill/mức. Mỗi nhóm có **4 câu thường và 1 câu mandatory**. Docker/Foundation dùng chứng chỉ nên không nằm trong bank. Nếu import đã thành công nhưng gửi duyệt bị lỗi, gửi lại các bản Draft đã tạo; không import lại toàn bộ file.

### 8.4. Expert import module và tạo certificate

1. Quay lại tài khoản **Lê Quốc Bảo → Modules → Import**.
2. Chọn `06_Learning_Modules_Java_Backend_Demo.zip`.
3. Xem preview **5 module, 10 lesson**, không lỗi. Mỗi module có hai bài đọc mẫu.
4. Chọn **Confirm & submit for review**. Nếu chỉ chọn **Confirm import**, mở các Draft vừa tạo rồi gửi duyệt.

| Module | Skill / mức | Dùng để diễn |
| --- | --- | --- |
| Java Collections Intermediate Guided Practice | MS-JAVA-COLL / Intermediate | Học và thi đạt |
| Java Collections Intermediate Scenario Workshop | MS-JAVA-COLL / Intermediate | Phương án thay thế để Expert include/exclude |
| SQL Indexing Intermediate Guided Practice | MS-SQL-INDEX / Intermediate | Thi sai nền tảng để sinh phần bổ sung |
| SQL Indexing Foundation Guided Practice | MS-SQL-INDEX / Foundation | Học bổ sung mức thấp hơn |
| SQL Querying Intermediate Guided Practice | MS-SQL-QUERY / Intermediate | Học bổ sung skill tiên quyết |

5. Đăng nhập **Phạm Thu Hà → quản lý module**, đọc nội dung, duyệt và publish năm module. Draft hoặc Submitted chưa phải nội dung học đã xuất bản.
6. Quay lại **Lê Quốc Bảo → Certificates → Certificate catalog → Add**:

| Field | Nhập |
| --- | --- |
| Skill | Containerizing Services with Docker / MS-DOCKER |
| Knowledge level | Foundation |
| Name | Docker Foundation — Demo Certificate |
| Mô tả và năng lực được chứng nhận | Nắm khái niệm image, container và Dockerfile. Biết build image, chạy container và giải thích cách đóng gói một dịch vụ Java đơn giản. |
| Reference URL | Link HTTPS tới tài liệu hoặc mẫu chứng chỉ bạn đã chuẩn bị |

7. Bấm **Continue**, đọc lại ở bước **Confirm**, rồi lưu. Tạo certificate này chưa công nhận Employee đã đạt. Chuẩn bị riêng PDF/ảnh/link bằng chứng để Employee nộp sau.

### 8.5. Expert cấu hình Skill Assessment

Mở cấu hình Skill Assessment cho bốn nhóm chính: **Java Collections/Intermediate**, **SQL Indexing/Intermediate**, **SQL Indexing/Foundation**, **SQL Querying/Intermediate**.

Với mỗi nhóm chính, mở bản nháp và điền theo các nhóm màn hình liệt kê:

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

### 8.6. L&D kích hoạt baseline và xuất bản role

1. Đăng nhập **Phạm Thu Hà → Baseline Assessments**.
2. Chọn **Java Backend Developer**, mở cấu hình baseline của role.
3. Đặt **3 câu/nhóm**, cần đúng **2**, thời gian **20 phút**, **3 lượt**, chờ làm lại **0 phút**. Cấu hình áp dụng các mức được màn hình liệt kê.
4. Hoàn tất và **Activate**. Nếu thiếu bank, kiểm tra câu hỏi đã Published và đúng skill/mức.
5. Vào **Roles**, mở role **JAVA-BE** đã được Expert gửi. Kiểm tra yêu cầu của Middle, duyệt và chuyển **Active/Publish** theo màn hình. Nếu còn báo thiếu cấu hình, xử lý mục được báo rồi xác nhận lại.

Với cấu hình Middle nêu trên, dự kiến có **14 nhóm được thi**, tổng **42 câu baseline**. Docker/Foundation là yêu cầu chứng chỉ riêng, không nằm trong mẫu số 14.

### 8.7. Employee làm RIASEC

1. Đăng nhập **Nguyễn Hoàng Nam → Overview → RIASEC**.
2. Trả lời đủ **60 hoạt động** theo mức độ yêu thích, rồi xác nhận nộp. Đây là sở thích, không có đậu/rớt.
3. Xem sáu điểm và trạng thái gợi ý Job position. Nếu AI còn xử lý, chuyển sang phần role trong lúc chờ. Không nộp bài mới chỉ vì gợi ý chưa có ngay.
4. Khi có gợi ý, xem Job position và lý do. Có thể quay lại danh sách kết quả để mở kết quả vừa làm.

Muốn có gợi ý, Job position cần đủ sáu điểm, tính năng RIASEC được bật và dịch vụ mô hình hoạt động. Không cam kết AI trả cùng lời giải thích hoặc cùng thời gian mỗi lần. RIASEC không tự cộng điểm skill hoặc hoàn thành lộ trình.

### 8.8. Employee chọn role, làm baseline và yêu cầu pathway

1. Vào **Upskilling → Roles → Java Backend Developer → Middle**, xác nhận chọn.
2. Mở baseline và bắt đầu. Với **đúng bank demo này**, chọn **A** cho mọi câu để tạo ba nhóm chưa đạt: Java Collections/Intermediate (đáp án B), SQL Indexing/Intermediate (đáp án C), API Security/Foundation (đáp án B). Đây là cách tạo tình huống demo, không phải hướng dẫn làm bài thật.
3. Xác nhận nộp. Dự kiến kết quả **Baseline: đạt 11/14 · 3 nhóm chưa đạt**. Nếu khác, xem chi tiết từng nhóm và cấu hình; không sửa kết quả đã lưu cho khớp kịch bản.
4. Docker/Foundation hiện riêng là **Yêu cầu chứng chỉ · không đánh giá trong baseline**. Như vậy còn ba gap học và một yêu cầu chứng chỉ.
5. Bấm **Request pathway**, xác nhận một lần, chờ xử lý. Nếu đã có yêu cầu thì mở yêu cầu hiện tại, không gửi thêm.

### 8.9. Expert duyệt pathway

1. Đăng nhập **Lê Quốc Bảo → Pathway review**, mở yêu cầu của **Nguyễn Hoàng Nam**.
2. Chọn node Java Collections/Intermediate. Exclude cả hai module rồi **Check**. Node phải báo lỗi không còn module được chọn; chưa được Approve.
3. Include lại **Guided Practice**. Có thể giữ exclude **Scenario Workshop** để minh họa hai module thay thế. Việc exclude hết không làm skill đủ điều kiện bypass nếu catalog vẫn có module phù hợp.
4. Với API Security/Foundation, nếu thực sự chưa có module/chứng chỉ phù hợp, chọn **Bypass**, ghi: **Chưa có nội dung phù hợp; bổ sung khi có nội dung mới.**
5. Kiểm tra lại, **Save** thay đổi, rồi **Approve** phiên bản hợp lệ. Nếu Check báo lỗi khác, chọn node đó và sửa theo thông báo trước khi duyệt.

Bypass giữ lại gap và lịch sử duyệt, chưa công nhận đạt skill. Sau khi duyệt, Employee mở lại pathway để thấy trạng thái mới.

### 8.10. Employee học Java Collections và thi đạt

1. Mở **Adaptive Pathway → Java Collections/Intermediate → Guided Practice**.
2. Học đủ hai bài, hoàn thành nội dung, rồi mở Skill Assessment.
3. Với bank demo: nhóm Java Collections/Intermediate chọn **B**; nhóm Foundation nếu có chọn **A**. Đọc đúng tên nhóm, không chọn B cho cả bài.
4. Nộp, đợi kết quả và quay lại pathway. Khi đủ điều kiện, yêu cầu được đánh dấu hoàn thành.

### 8.11. Demo recalculate: MAIN đạt nhưng còn thiếu nền tảng

1. Mở **SQL Indexing/Intermediate**, học hết hai bài rồi làm Skill Assessment.
2. Với bank demo: nhóm **Intermediate MAIN chọn C**. Nhóm **SQL Indexing/Foundation** và **SQL Querying/Intermediate chọn B** để cố ý sai nền tảng.
3. Nộp và đợi pathway cập nhật. Xem điểm MAIN riêng với trạng thái yêu cầu tổng. MAIN đạt chưa có nghĩa là yêu cầu đã hoàn thành.
4. Quan sát hai phần học bổ sung: **SQL Querying/Intermediate** và **SQL Indexing/Foundation**. MAIN bị khóa chờ hoàn thành phần cần thiết; bấm node để xem cụ thể cần học gì.
5. Học **SQL Querying/Intermediate** trước, hoàn thành nội dung và thi đạt. Với bank demo, nhóm này chọn **A**; các nhóm khác nếu có đọc đúng nhãn và đối chiếu bank.
6. Sau đó học **SQL Indexing/Foundation**, hoàn thành nội dung và thi đạt. Hai nhóm Foundation và SQL Querying/Intermediate dùng đáp án **A** trong bank demo.
7. Khi có đủ kết quả đạt cho các phần bổ sung, quay lại **SQL Indexing/Intermediate** và **thi lại MAIN**. Nội dung đã học được giữ. Điểm MAIN cũ không tự được công nhận sau khi học bổ sung.
8. Lượt mới: MAIN Intermediate chọn **C**, Foundation và SQL Querying/Intermediate chọn **A**. Nộp và xem pathway cập nhật.

Nếu hết lượt hoặc chưa đến giờ thi lại, xử lý theo thông báo và policy; không reset dữ liệu để bỏ khóa. Nếu phát sinh thêm nhóm ngoài bảng, kiểm tra đúng cấu hình đang được áp dụng.

### 8.12. Employee nộp certificate, Expert duyệt và hoàn thành pathway

1. Employee mở **Docker/Foundation**, đọc mô tả năng lực và tài liệu tham khảo.
2. Chọn nộp **link HTTPS** hoặc **PDF/ảnh** bằng chứng đã chuẩn bị, rồi xác nhận.
3. Bài nộp ở **Pending** thì yêu cầu vẫn chưa hoàn thành. Không bấm nộp lại chỉ vì danh sách chưa tải xong.
4. Đăng nhập **Lê Quốc Bảo → Certificates → Evidence review**, mở bài nộp của Nguyễn Hoàng Nam, xem bằng chứng và ghi lý do khi duyệt.
5. Nếu từ chối, Employee đọc lý do, sửa hồ sơ rồi nộp lại theo màn hình. Nếu duyệt đạt, Employee mở lại pathway để xem kết quả cập nhật.
6. Khi các yêu cầu bắt buộc đã hoàn thành hoặc có quyết định bypass hợp lệ, pathway hoàn thành và được giữ trong lịch sử. Việc bypass vẫn không trở thành năng lực đã đạt.
7. Kiểm tra nút chọn/đổi role đã mở theo trạng thái hiện tại. Có thể chọn mục tiêu tiếp theo; không xóa pathway cũ để bắt đầu lại.

### 8.13. Tình huống thêm nội dung sau bypass (tùy chọn)

Phần demo chính không cần ZIP thứ hai. Nếu muốn diễn thêm, Expert có thể tự tạo module **API Security/Foundation** với bài học hợp lệ rồi gửi L&D duyệt và publish, hoặc tạo nguồn phù hợp theo cấu hình skill đang dùng.

Employee xem thông báo để biết **skill, mức và nội dung vừa thêm**. Nội dung xuất hiện dưới nhãn **Học bổ sung** ở cuối graph/timeline hiện có. Không có graph Role thứ hai, không mở lại hoàn thành của pathway cũ và không khóa đổi role. Nếu chưa có target/pathway mới, vẫn mở được nội dung từ phần gap cũ và liên kết Skill. Các điều kiện tiên quyết vẫn áp dụng; certificate vẫn nộp qua luồng pathway được duyệt hiện có.

Mở dropdown chuông để xem thông báo: chỉ mục thực sự hiện ra được đánh dấu đọc; cuộn để xem các mục còn lại. Nếu lưu trạng thái đọc lỗi, dùng **Retry**.

### 8.14. Trước khi diễn trên bản deploy

- Dùng URL của bản dev/deploy đang chạy thay cho localhost trong các bước cũ. Chỉ dùng `/reset` khi chủ môi trường xác nhận được phép xóa dữ liệu; không dùng nó cho luồng học lại thông thường.
- Sau khi merge nhánh fix vào main, chờ workflow build/deploy hoàn tất rồi tải lại trang. Push nhánh fix chưa làm server đổi bản.
- Source hiện có profile `workspace-baseline`, pathway worker, RIASEC và các cờ frontend tương ứng trong cấu hình dev/deploy. Máy deploy cần đủ biến môi trường, SMTP/storage, kết nối dữ liệu và mô hình RIASEC; cú pháp Compose hợp lệ chưa chứng minh các dịch vụ đã chạy trên server.
- Các file 05/06 đã được người dùng xác nhận import được ở local trước đó. Sáu cột RIASEC mới đã được nối trong source và kiểm tra build; việc onboarding/lưu/đọc lại trên server sau deploy vẫn cần được kiểm tra trực tiếp.
