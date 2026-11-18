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
