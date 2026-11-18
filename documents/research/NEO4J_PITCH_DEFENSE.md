# Tại sao bắt buộc dùng Neo4j trong dự án Adapt-Learn-Graph?
> **Tài liệu thuyết trình / Bảo vệ đồ án trước Hội đồng Capstone**  
> **Dự án:** *Knowledge Graph-Based Adaptive Learning and Competency Intelligence Platform (Adapt-Learn-Graph)*

---

## 1. Thông điệp mở đầu trực diện (Pitch Hook)

> *"Dự án của chúng em không chọn Neo4j theo trào lưu, mà Neo4j là **trái tim giải thuật** của nền tảng. Hệ thống áp dụng kiến trúc **Polyglot Persistence**: PostgreSQL quản lý giao dịch doanh nghiệp (ACID transactions), còn Neo4j đóng vai trò là **Knowledge Graph Engine** chuyên biệt để giải quyết bài toán cốt lõi mà cơ sở dữ liệu quan hệ (RDBMS) bộc lộ giới hạn nghiêm trọng."*

---

## 2. Ba lý do kỹ thuật tiên quyết bắt buộc dùng Neo4j

### Lý do 1: Duyệt Prerequisite DAG với Index-Free Adjacency
* **Bản chất bài toán:** Các kỹ năng (`MicroSkill`) không đứng độc lập mà phụ thuộc lẫn nhau theo mô hình **Directed Acyclic Graph (DAG)** thông qua relationship `HAS_SKILL_PREREQUISITE` với độ sâu bất định ($N$ cấp).
* **Ưu thế vượt trội của Neo4j:**
  * Cơ chế **Index-Free Adjacency**: Mỗi node lưu con trỏ bộ nhớ vật lý (pointer) trực tiếp đến các relationship và node lân cận. Tốc độ graph traversal là $O(k)$ theo kích thước subgraph cục bộ, **không suy giảm khi cơ sở dữ liệu phình to**.
  * Truy vấn đệ quy tìm **transitive prerequisites** trong Cypher chỉ mất **1 dòng lệnh trực quan**:
    ```cypher
    MATCH (s:MicroSkill {id: $skillId})-[:HAS_SKILL_PREREQUISITE*1..5]->(prereq:MicroSkill)
    RETURN prereq
    ```
* **So sánh với RDBMS & NoSQL:**
  * **RDBMS (PostgreSQL/MySQL):** Buộc phải dùng `WITH RECURSIVE` và self-join nhiều lần. Khi đồ thị sâu từ 3–5 cấp, xuất hiện hiện tượng **Join Explosion**, làm tăng đột biến chi phí bộ nhớ và latency tăng theo hàm mũ.
  * **Document DB (MongoDB):** Dữ liệu bị denormalization gây rủi ro data anomaly khi cập nhật prerequisites, hoặc phải dùng `$graphLookup` aggregation pipeline nặng nề, không tối ưu cho đồ thị phức tạp.

---

### Lý do 2: Multi-tier Competency Ontology & Relationships as First-Class Citizens
* **Bản chất bài toán:** Nền tảng ánh xạ cấu trúc tri thức chuẩn hóa (kế thừa từ O*NET, ESCO và SFIA 9) qua 7 tầng thực thể:
  $$\text{Department} \xrightarrow{\text{HAS\_JOB\_POSITION}} \text{JobPosition} \xrightarrow{\text{HAS\_ROLE}} \text{TargetRole} \xrightarrow{\text{HAS\_LEVEL}} \text{Level} \xrightarrow{\text{HAS\_COMPETENCY}} \text{Competency} \xrightarrow{\text{HAS\_SKILL}} \text{MicroSkill}$$
* **Ưu thế vượt trội của Neo4j:**
  * **Relationships as First-Class Citizens with Rich Properties:** Các cạnh mang logic nghiệp vụ sống còn:
    * `TEACHES`: Chứa thuộc tính `teachingFocus` (*PRIMARY*, *SUPPORTING*, *INCIDENTAL*) và độ khó module.
    * `REQUIRES_SKILL`: Chứa `requiredKnowledgeLevels` độc lập theo từng Level (Junior / Middle / Senior).
    * `HAS_SKILL_PREREQUISITE`: Chứa điều kiện tiên quyết theo cấp độ kiến thức.
  * Truy vấn kết hợp qua 5+ tầng từ Job Position đến Learning Module được biểu diễn tự nhiên bằng **Graph Pattern Matching**, loại bỏ hoàn toàn các **junction tables / bridge tables** nhân tạo với foreign keys phức tạp trong SQL.

---

### Lý do 3: Dynamic Adaptive Pathway Generation & Recalculation
* **Giải quyết bài toán cốt lõi của LMS truyền thống:**
  * Các hệ thống LMS thông thường chỉ cung cấp khóa học tĩnh, cứng nhắc (*one-size-fits-all*).
  * Trong **Adapt-Learn-Graph**, khi nhân viên hoàn thành **Baseline Assessment** và xuất hiện **Skill Gap**:
    1. Hệ thống định vị các `MicroSkill` còn thiếu đối với Role và Level mục tiêu.
    2. Tự động duyệt ngược **Prerequisite DAG** để bổ sung các kỹ năng tiên quyết chưa đạt (**Dependency Resolution**).
    3. Tìm kiếm tập hợp các `LearningModule` (hoặc `Certificate`) tối ưu nhất để phủ kín khoảng trống đó.
  * Thuật toán **Topological Sort** và **Pathfinding** trên đồ thị giúp sinh lộ trình học cá nhân hóa theo đúng thứ tự logic tri thức với thời gian phản hồi tức thì (real-time).

---

## 3. Kiến trúc Polyglot Persistence: Phân định ranh giới lưu trữ chuẩn Enterprise

Hệ thống kết hợp sức mạnh của cả hai loại cơ sở dữ liệu thay vì lạm dụng một công nghệ:

| Tiêu chí | PostgreSQL (RDBMS) | Neo4j (Graph DB) |
| :--- | :--- | :--- |
| **Dữ liệu sở hữu** | Accounts, RBAC/Permissions, payOS payments, subscriptions, assessment attempts, frozen exam papers, learner progress, Outbox pattern, Audit Log. | Catalog Job Position, Target Role, Competency hierarchy, MicroSkill, Prerequisite DAG, LearningModule & Certificate catalog. |
| **Đặc thù truy cập** | High write concurrency, **ACID transactions**, Multi-tenancy isolation, immutable audit trails. | Deep graph traversals, graph pattern matching, pathfinding algorithms, dynamic adaptive pathway generation. |
| **Lợi ích kiến trúc** | Đảm bảo an toàn tài chính và tuân thủ dữ liệu. | Đồ thị luôn **tinh gọn, read-optimized**, không bị nghẽn **write-lock** bởi dữ liệu học tập cá nhân. |

---

## 4. Tóm tắt 3 câu chốt bảo vệ trước Hội đồng

1. **Về mặt bài toán:** *"Dự án của chúng em mang tên **Knowledge Graph-Based Adaptive Learning** — tri thức và kỹ năng về bản chất là một mạng lưới quan hệ phức tạp, và Knowledge Graph là mô hình tự nhiên, chính xác nhất để đại diện cho tri thức đó."*
2. **Về mặt kỹ thuật:** *"Nếu dùng RDBMS truyền thống, việc truy vấn prerequisite nhiều cấp sẽ dẫn tới bẫy **Join Explosion** và suy giảm hiệu năng nghiêm trọng. Neo4j với cơ chế **Index-Free Adjacency** giải quyết triệt để vấn đề này với độ phức tạp $O(k)$."*
3. **Về mặt kiến trúc hệ thống:** *"Chúng em không lạm dụng Graph DB cho mọi thứ, mà áp dụng chuẩn kiến trúc **Polyglot Persistence**: PostgreSQL chịu trách nhiệm giao dịch và toàn vẹn dữ liệu doanh nghiệp (**ACID**), còn Neo4j đóng vai trò làm động cơ suy luận và điều hướng lộ trình học tập thích ứng (**Adaptive Pathway Engine**)."*

