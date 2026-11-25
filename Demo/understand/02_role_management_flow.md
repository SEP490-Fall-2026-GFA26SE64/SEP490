# Tài liệu Chuyên sâu: Luồng Quản trị Năng lực & Khởi tạo Vị trí Công việc (Target Role Lifecycle)
## Cẩm nang Chứng minh Quyền tác giả & Luồng Dữ liệu Toàn diện (Frontend ➔ Backend ➔ Neo4j Graph DB)

> **Mục tiêu:** 
> 1. Cung cấp bằng chứng kỹ thuật không thể chối cãi để chứng minh với Hội đồng giám khảo Capstone bạn là tác giả duy nhất của toàn bộ luồng này.
> 2. Giải thích chi tiết dòng chảy dữ liệu (End-to-End Data Flow), cấu trúc bảng/node đồ thị, và cơ chế bảo vệ dữ liệu ở từng chức năng quan trọng.

---

## MỤC LỤC
1. [CHIẾN LƯỢC CHỨNG MINH QUYỀN TÁC GIẢ VỚI HỘI ĐỒNG](#1-chiến-lược-chứng-minh-quyền-tác-giả-với-hội-đồng)
2. [BẢN ĐỒ KIẾN TRÚC MÃ NGUỒN (CODE MAP)](#2-bản-đồ-kiến-trúc-mã-nguồn-code-map)
3. [LUỒNG DỮ LIỆU CHI TIẾT (END-TO-END DATA FLOW) CỦA CÁC CHỨC NĂNG CỐT LÕI](#3-luồng-dữ-liệu-chi-tiết-end-to-end-data-flow-của-các-chức-năng-cốt-lõi)
   - [Chức năng 1: L&D Manager Phân quyền Expert & Quy định Thời gian học](#chức-năng-1-ld-manager-phân-quyền-expert--quy-định-thời-gian-học)
   - [Chức năng 2: Domain Expert Nạp Tri thức Ontology (Competency & Micro-skill)](#chức-năng-2-domain-expert-nạp-tri-thức-ontology-competency--micro-skill)
   - [Chức năng 3: Hiệu chỉnh Đồ thị Sống trên Explore Graph (Xử lý 3 sai sót thực tế)](#chức-năng-3-hiệu-chỉnh-đồ-thị-sống-trên-explore-graph-xử-lý-3-sai-sót-thực-tế)
   - [Chức năng 4: Cấu hình Cây Năng Lực theo Cấp bậc (Thủ công & Excel Bulk Import)](#chức-năng-4-cấu-hình-cây-năng-lực-theo-cấp-bậc-thủ-công--excel-bulk-import)
   - [Chức năng 5: Động cơ Thẩm định (Validation Engine) & L&D Manager Duyệt Xuất bản (Publish)](#chức-năng-5-động-cơ-thẩm-định-validation-engine--ld-manager-duyệt-xuất-bản-publish)
4. [BỘ CÂU HỎI "BẪY" VÀ ĐÁP ÁN PHẢN BIỆN CHUẨN DOANH NGHIỆP](#4-bộ-câu-hỏi-bẫy-và-đáp-án-phản-biện-chuẩn-doanh-nghiệp)

---

# 1. CHIẾN LƯỢC CHỨNG MINH QUYỀN TÁC GIẢ VỚI HỘI ĐỒNG

Khi Hội đồng chấm Capstone muốn kiểm tra quyền tác giả, họ sẽ đánh giá trên 4 phương diện sau:

### 1.1. Lịch sử Git Commits & Pull Requests (Proof of Work)
Toàn bộ mã nguồn của luồng này được commit trực tiếp bởi tài khoản của bạn:
- **Tác giả:** `shadowpro50 <khoinguyenanh205@gmail.com>`
- **Các commit quan trọng:**
  - `5958ed9d`: *feat(target-roles): enhance role configuration flow, add excel config import, and fix knowledge level normalization* (Xây dựng `RoleConfigExcelImportTab.tsx`, chuẩn hóa DTO, xử lý mapping Level).
  - `8097a03b`: *feat(target-roles): publication readiness, unassigned expert drafting, and WF02 test suite* (Xây dựng `RolePublicationReadinessView.tsx`, logic readiness).
  - `7c8abd54`: *test: add unit and system tests for target role management flow* (Viết bộ kiểm thử tự động).
  - `1e18a7b8`: *fix(ontology): simplify prerequisites without knowledge level and resolve target role catalog mapping*.
  - `326869b9` & `54bd58e5`: *fix: refine target role staging lifecycle, job position scoping, and knowledge selection*.

> **Tuyên bố tự tin trước Hội đồng:** *"Thầy cô có thể kiểm tra trực tiếp Git log và Git blame. Từng dòng xử lý parse file Excel, kiểm tra validation, và các câu truy vấn Cypher đồng bộ Level/Competency trong Neo4j đều do chính em viết và giải quyết các conflict kỹ thuật trong các PR."*

### 1.2. Quyết định Kiến trúc mà chỉ Người Trực Tiếp Làm Mới Biết
- **Tại sao không dùng Spring Data Neo4j (SDN) `@Relationship` tự động?**
  * *Trả lời:* SDN tự động mapping qua Annotation gặp vấn đề hiệu năng rất nghiêm trọng (**Cascading Fetch/Merge**). Khi đồ thị có cấu trúc lồng nhau (`TargetRole -> Level -> Competency -> MicroSkill`), SDN có xu hướng xóa và tạo lại toàn bộ subgraph, dễ làm mất mát dữ liệu và không thể cô lập đa khách hàng theo `organizationId`. Vì vậy, em tự tay viết các câu lệnh Cypher tối ưu bằng `Neo4jClient` kết hợp `UNWIND`, `MERGE` và `DETACH DELETE` trong `Neo4jTargetRoleRepository.java`.
- **Cơ chế Phân quyền Hai Chiều (Two-way Handshake):**
  * L&D Manager nắm quản trị vĩ mô (phân bổ ngân sách, gán quyền, ấn nút Publish).
  * Domain Expert là Technical Lead am hiểu công nghệ (thiết kế cây năng lực, chọn micro-skill).
  * Sự tách bạch này phản ánh chuẩn mực doanh nghiệp (Enterprise Governance).

---

# 2. BẢN ĐỒ KIẾN TRÚC MÃ NGUỒN (CODE MAP)

```
[ FRONTEND (React + Vite + TailwindCSS) ]
  ├── features/manager/target-roles/
  │     ├── TargetRolesPage.tsx                  <-- L&D Manager: Phân quyền Expert, đặt duration, duyệt Publish
  │     ├── roleRequirements.ts                 <-- Tiêu chí nghiệp vụ & validation rules
  │     ├── roleReadiness.ts                    <-- Tính toán độ sẵn sàng xuất bản
  │     └── components/RolePublicationReadinessView.tsx <-- UI hiển thị checklist kiểm duyệt
  ├── features/expert/target-roles/
  │     ├── ExpertAssignedRolesPage.tsx          <-- Expert: Nhận role, cấu hình thủ công từng Level
  │     └── components/RoleConfigExcelImportTab.tsx <-- Expert: Nạp hàng loạt cấu hình bằng file Excel
  └── features/manager/ontology/
        ├── CompetencyOntologyPage.tsx           <-- Nạp danh mục Competency & Micro-skill
        └── components/OntologyGraphPlayground.tsx <-- Explore Graph tương tác sống trên Canvas

[ BACKEND (Spring Boot Layered Architecture) ]
  ├── apis/
  │     ├── OrganizationTargetRoleController.java <-- REST Endpoints quản lý Role (POST, GET, PUT, DELETE)
  │     └── TargetRoleGraphController.java       <-- REST Endpoints thao tác quan hệ đồ thị
  ├── services/
  │     ├── OrganizationTargetRoleApplicationService.java <-- DTO serialization, validation mapping
  │     └── TargetRoleService.java              <-- Core Domain Use Cases
  └── repository/
        └── Neo4jTargetRoleRepository.java       <-- Tầng tương tác trực tiếp Neo4j qua Neo4jClient & Cypher
```

---

# 3. LUỒNG DỮ LIỆU CHI TIẾT (END-TO-END DATA FLOW) CỦA CÁC CHỨC NĂNG CỐT LÕI

```
[ Người dùng thao tác UI ]
           │
           ▼
[ 1. FRONTEND: State & API Client ]
   - Gom dữ liệu form / file Excel
   - Gọi axios/fetch kèm JWT Header:
     X-User-Role: LD_MANAGER hoặc DOMAIN_EXPERT
     X-User-Id: <UUID người dùng>
           │
           ▼
[ 2. CONTROLLER: OrganizationTargetRoleController.java ]
   - Xác thực vai trò: isAuthorizedManager() hoặc isDomainExpert()
   - Kiểm tra quyền sở hữu độc quyền: Expert chỉ được sửa role được gán cho mình
   - Bắt lỗi DTO validation (@Valid)
           │
           ▼
[ 3. APPLICATION SERVICE: OrganizationTargetRoleApplicationService.java ]
   - Chuẩn hóa mã Role Code (nếu rỗng tự sinh ROLE-<NAME>-<UUID>)
   - Serialize cấu hình JSON: skillTargetsJson, levelCompetenciesJson
   - Chuyển tiếp sang Command Use Case
           │
           ▼
[ 4. DOMAIN SERVICE: TargetRoleService.java ]
   - Kiểm tra trùng lặp mã code trong tổ chức (existsByOrganizationIdAndCodeAndVersion)
   - Kích hoạt Domain Model: TargetRole.createNew() hoặc existing.updateDetails()
           │
           ▼
[ 5. REPOSITORY LAYER: Neo4jTargetRoleRepository.java ]
   - Mở Transaction qua TransactionTemplate
   - Sinh các câu lệnh Cypher tương ứng
           │
           ▼
[ 6. GRAPH DATABASE: Neo4j Engine ]
   - Cập nhật Node TargetRole, Node Level, Node Competency
   - Thiết lập các cạnh: [:HAS_LEVEL], [:HAS_COMPETENCY], [:REQUIRES_SKILL]
           │
           ▼
[ 7. TRẢ KẾT QUẢ VỀ FRONTEND ]
   - HTTP 200 OK / 201 Created / 422 Unprocessable Entity
   - UI render Badge trạng thái mới (DRAFT ➔ IN_REVIEW ➔ ACTIVE)
```

---

### Chức năng 1: L&D Manager Phân quyền Expert & Quy định Thời gian học

1. **Frontend (`TargetRolesPage.tsx`):**
   - L&D Manager mở modal Edit Role. Chọn tài khoản Expert từ danh sách nhân sự nội bộ (`assignedExpertId`).
   - Điền thời gian đào tạo cho từng cấp bậc vào mảng `levelDurations`:
     `{ "Junior": "3 months", "Middle": "6 months", "Senior": "12 months" }`.
   - Bấm nút **"Send to Expert"** $\rightarrow$ Kích hoạt `updateRoleApi(...)`.
   - **Payload HTTP:**
     ```json
     PUT /api/v1/organizations/{organizationId}/roles/{roleId}
     Headers: { "X-User-Role": "LD_MANAGER", "X-User-Id": "manager-01" }
     Body: {
       "assignedExpertId": "expert-uuid-777",
       "levelDurations": { "Junior": "3 months", "Middle": "6 months", "Senior": "12 months" },
       "status": "DRAFT"
     }
     ```
2. **Backend Controller (`OrganizationTargetRoleController.java`):**
   - `@PutMapping("/{roleId}")`: Gọi `isAuthorizedManager(userRole)`. Cho phép đi tiếp.
3. **Application & Domain Service (`TargetRoleService.java`):**
   - Gọi `existing.updateDetails(...)`. Gán `assignedExpertId = "expert-uuid-777"` và cập nhật map `levelDurations`.
4. **Neo4j Persistence (`Neo4jTargetRoleRepository.java`):**
   - Thực thi hàm `syncRoleLevels(...)`:
     ```cypher
     UNWIND $levelItems AS item
     MATCH (r:TargetRole {id: $roleId}) WHERE r.organizationId = $organizationId
     MERGE (l:Level {id: item.id})
     ON MATCH SET 
         l.duration = item.duration,
         l.rank = item.rank,
         l.updatedAt = datetime($updatedAt)
     MERGE (r)-[hl:HAS_LEVEL]->(l)
     ```
   - Cập nhật trực tiếp thuộc tính `duration` vào Node `Level` tương ứng.

---

### Chức năng 2: Domain Expert Nạp Tri thức Ontology (Competency & Micro-skill)

1. **Nạp Competency:**
   - Mỗi Competency đại diện cho một cụm năng lực lớn (ví dụ: *Java Core*, *Spring Framework*).
   - Dữ liệu nạp gồm: `Code`, `Name`, `Description`, `DepartmentId`.
   - Neo4j lưu trữ dưới dạng Node `(:Competency {id, code, name, description, organizationId})`.
2. **Nạp Micro-skill:**
   - Mỗi Micro-skill là một mục tiêu học tập hạt nhân có thể đo lường được (ví dụ: *Stream API*, *Spring MVC*).
   - Khởi tạo quan hệ năng lực miền:
     ```cypher
     MATCH (c:Competency {code: $compCode}), (s:MicroSkill {code: $skillCode})
     MERGE (c)-[:HAS_SKILL]->(s)
     ```
3. **Khởi tạo Quan hệ Tiên quyết (Prerequisites) giữa các Micro-skills:**
   - Khi chuyên gia cấu hình kỹ năng A là điều kiện tiên quyết của kỹ năng B:
     ```cypher
     MATCH (s1:MicroSkill {id: $prereqSkillId}), (s2:MicroSkill {id: $targetSkillId})
     MERGE (s1)-[r:HAS_SKILL_PREREQUISITE]->(s2)
     ON CREATE SET r.status = 'ACTIVE', r.createdAt = datetime()
     ```
   - Quan hệ này tạo thành đồ thị tri thức có hướng (DAG), đóng vai trò nền tảng cho thuật toán sinh lộ trình học thích ứng (Adaptive Learning Path).

---

### Chức năng 3: Hiệu chỉnh Đồ thị Sống trên Explore Graph (Xử lý 3 sai sót thực tế)

Giao diện Canvas sống (`OntologyGraphPlayground.tsx`) cho phép chuyên gia sửa chữa trực quan các sai sót trong dữ liệu import mà không cần thao tác database thủ công:

| Tình huống thực tế | Thao tác trên giao diện Canvas | Luồng API & Câu lệnh Cypher trong Neo4j |
| :--- | :--- | :--- |
| **TH1: Đảo chiều quan hệ sai**<br>*(Đồ thị chỉ Streams trước OOP $\rightarrow$ Sai sư phạm)* | Click vào cạnh nối giữa 2 node, chọn **"Switch Direction"**. | 1. Xóa cạnh cũ: `MATCH (a)-[r:HAS_SKILL_PREREQUISITE]->(b) DELETE r`<br>2. Tạo cạnh mới ngược lại: `MERGE (b)-[:HAS_SKILL_PREREQUISITE]->(a)` |
| **TH2: Xóa quan hệ thừa**<br>*(Docker bị nối nhầm với Spring MVC)* | Click vào cạnh thừa, bấm **"Delete Relationship"**. | `MATCH (s1:MicroSkill {code: 'DOCKER'})-[r:HAS_SKILL_PREREQUISITE]->(s2:MicroSkill {code: 'SPRING_MVC'}) DELETE r` |
| **TH3: Bổ sung quan hệ thiếu**<br>*(Học Transaction bắt buộc phải nắm Concurrency)* | Kéo con trỏ từ Node Concurrency nối sang Node Transaction. | `MATCH (s1:MicroSkill {code: 'CONCURRENCY'}), (s2:MicroSkill {code: 'TRANSACTION'}) MERGE (s1)-[:HAS_SKILL_PREREQUISITE]->(s2)` |

> **Cơ chế Kiểm tra Chu trình (Pre-flight Cycle Detection):**  
> Trước khi lưu cạnh mới, backend chạy thuật toán duyệt đồ thị (DFS / Tarjan's Strongly Connected Components). Nếu việc tạo cạnh dẫn đến chu trình khép kín ($A \to B \to C \to A$), hệ thống lập tức chặn lại và cảnh báo lỗi trên UI: *"Không thể tạo quan hệ vì gây ra chu trình phụ thuộc vòng tròn"*.

---

### Chức năng 4: Cấu hình Cây Năng Lực theo Cấp bậc (Thủ công & Excel Bulk Import)

1. **Phương thức 1: Điều chỉnh Thủ công (`ExpertAssignedRolesPage.tsx`):**
   - Chuyên gia chuyển qua từng tab Level: **Junior**, **Middle**, **Senior**.
   - Tại mỗi cấp bậc, tích chọn các Competency và các Micro-skill cần thiết tương ứng với độ khó.
2. **Phương thức 2: Nạp hàng loạt bằng Excel (`RoleConfigExcelImportTab.tsx`):**
   - **Xử lý phía Client (Defensive Parsing):** Sử dụng thư viện `xlsx` để đọc file `.xlsx`.
   - **Đối soát dữ liệu 2 chiều (Reconciliation):** So sánh `Role Code`, `Level Name`, `Competency Code/Name` trong file với danh mục Ontology thực tế:
     - Dòng hợp lệ: Đánh dấu huy hiệu xanh **Valid** kèm ID đã khớp.
     - Dòng sai sót (ví dụ mã gõ sai chính tả): Đánh dấu cảnh báo vàng **Warning** ghi rõ lý do.
   - Khi chuyên gia bấm **"Apply Configuration"**, toàn bộ dữ liệu Excel được tổng hợp vào state của trang, tự động phân bổ vào 3 tab Junior, Middle, Senior để kiểm tra trực quan.
3. **Đẩy cấu hình vào Neo4j (`Neo4jTargetRoleRepository.java` - hàm `syncLevelCompetencies`):**
   ```cypher
   // 1. Xóa liên kết Competency cũ của Role
   MATCH (r:TargetRole {id: $roleId})-[:HAS_LEVEL]->(l:Level)-[rc:HAS_COMPETENCY]->(:Competency)
   WHERE r.organizationId = $organizationId
   DELETE rc

   // 2. Nối Competency mới vào từng Level tương ứng
   UNWIND $compIds AS cid
   MATCH (r:TargetRole {id: $roleId})-[:HAS_LEVEL]->(l:Level)
   WHERE r.organizationId = $organizationId AND toLower(l.name) = toLower($levelName)
   MATCH (c:Competency)
   WHERE (c.organizationId IS NULL OR c.organizationId = $organizationId)
     AND (c.id = cid OR c.code = cid)
   MERGE (l)-[rc:HAS_COMPETENCY]->(c)
   ON CREATE SET rc.status = 'ACTIVE', rc.createdAt = datetime($updatedAt)
   ```
4. **Nộp phê duyệt:** Chuyên gia bấm **"Submit to L&D Manager"**, trạng thái Target Role chuyển thành `IN_REVIEW`.

---

### Chức năng 5: Động cơ Thẩm định (Validation Engine) & L&D Manager Duyệt Xuất bản (Publish)

1. **Kiểm tra Readiness (`RolePublicationReadinessView.tsx` & `roleRequirements.ts`):**
   - Hệ thống quét đồ thị và đánh giá các điều kiện tiên quyết:
     - [x] Đã cấu hình đủ các cấp bậc bắt buộc (Junior, Middle, Senior).
     - [x] Mỗi cấp bậc đã được gán tối thiểu 1 Competency và các Micro-skills tương ứng.
     - [!] *Cảnh báo vàng (Non-blocking Warning):* Kỹ năng chưa đủ bài giảng (Modules) hoặc câu hỏi trắc nghiệm (Questions).
2. **Phê duyệt & Xuất bản (Publish Target Role):**
   - L&D Manager đăng nhập, kiểm tra báo cáo Validation.
   - Bấm nút **"Approve & Publish"** $\rightarrow$ Gửi PUT API cập nhật `status = "ACTIVE"`.
3. **Tính chất Bất biến (Immutability):**
   - Khi Role chuyển sang `ACTIVE`, khung năng lực của phiên bản này (`v1.0`) được đóng băng.
   - Nhân viên trong tổ chức có thể xem danh mục và bấm "Chọn làm mục tiêu học tập".
   - Mọi chỉnh sửa sau này sẽ tạo ra bản nháp mới (`Draft Fork` hoặc `v1.1`), đảm bảo không làm gián đoạn lộ trình của các nhân viên đang theo học phiên bản hiện tại.

---

# 4. BỘ CÂU HỎI "BẪY" VÀ ĐÁP ÁN PHẢN BIỆN CHUẨN DOANH NGHIỆP

### Câu 1: *"Tại sao phải chia 2 vai trò L&D Manager và Domain Expert mà không để một người làm từ đầu đến cuối?"*
* **Đáp án:** Trong doanh nghiệp, L&D nắm quản trị đào tạo, khung ngạch lương và ngân sách, nhưng không thể có chuyên môn sâu về kỹ thuật (ví dụ không biết Java Senior cần kỹ năng gì). Ngược lại, Technical Lead (Expert) nắm sâu chuyên môn nhưng không có quyền phê duyệt chính sách nhân sự. Cơ chế phân quyền hai chiều **(Two-way Handshake)** đảm bảo chuẩn mực quản trị doanh nghiệp (Enterprise Governance): *Đúng chuyên môn kỹ thuật - Khớp chiến lược nhân sự*.

### Câu 2: *"Tại sao đồ thị thiếu câu hỏi và bài giảng nhưng Expert vẫn bấm Submit được?"*
* **Đáp án:** Đây là nguyên tắc **Unblocked Enterprise Workflow**. Expert có nhiệm vụ định nghĩa kiến trúc chuẩn năng lực (Architecture Specification). Việc biên soạn bài học số hay soạn 200 câu hỏi trắc nghiệm là công việc của đội ngũ Giảng viên/Content Creators. Nếu bắt buộc đủ 100% tài nguyên mới cho Submit thì quy trình sẽ bị "Deadlock". Expert cần submit trước để L&D duyệt nhu cầu tuyển dụng hoặc mua khóa học. Chốt chặn an toàn nằm ở nút **Publish** của L&D Manager.

### Câu 3: *"File Excel cấu hình có thể bị sai lệch dữ liệu, hệ thống xử lý thế nào?"*
* **Đáp án:** Hệ thống áp dụng **Defensive Parsing**. Dữ liệu Excel không ghi thẳng vào database mà đưa vào bảng **Configuration Preview**. Tại đây, hệ thống đối soát 2 chiều (theo cả mã `Code` và tên `Name`). Dòng hợp lệ hiển thị huy hiệu xanh; dòng không tồn tại hiển thị cảnh báo vàng. Chuyên gia có thể rà soát lại trực quan trên 3 tab Junior, Middle, Senior trước khi quyết định Submit.
