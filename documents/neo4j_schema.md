# Schema Neo4j — Ontology v0.9.0

Đây là khung ontology mới cho nền tảng phục vụ một organization. Tên node, relationship và field giữ bằng tiếng Anh để khớp với dữ liệu; phần giải thích dùng tiếng Việt. Tài liệu này mô tả đúng property được xuất sang Neo4j từ dataset v0.9.0. Trạng thái triển khai backend và database được ghi trong [ARCHITECTURE.md](ARCHITECTURE.md).

Catalog uses current string Role/Occupation IDs and separate Levels. PostgreSQL owns learner selection/profile/evidence/attempt/pathway state. [Role-first contract](features/Target%20role%20selection/Role%20Selection%20and%20Occupation%20Baseline.md) defines consumers; [read-only verification](testing/system/REQ-001-002-final-synchronization-review.md) records observed metadata separately from this field contract.

![Sơ đồ ontology0.9.0](diagrams/neo4j.svg)

[PlantUML](diagrams/neo4j.puml) · [Nguồn dataset](dataset/ONTOLOGY.md) · [Import guide](dataset/NEO4J_IMPORT_GUIDE.md)

## 1. Cấu trúc tổng quát

**Ranh giới baseline đã chốt22/10/2026:** baseline mới đánh giá hợp MicroSkill của tất cả Role đang hoạt động trong Occupation, khử trùng theo ID; không tạo bài/pool riêng theo Role. Catalog adapter phải trả membership/version được phép qua port và phát hiện drift; quy tắc publication authoritative còn phụ thuộc chủ Catalog. PostgreSQL giữ Blueprint, snapshot đã pin, attempt, deadline, kết quả, mastery và lifecycle projection; không thêm learner/Retiring/pathway state vào Neo4j. Đây là đồng bộ contract, không sửa node/relationship/property hay import dữ liệu. Xem [thiết kế dữ liệu baseline](features/Baseline%20knowledge%20assessment/Adaptive%20Baseline%20Data%20Architecture.md).

Schema gồm **6 loại node và 7 loại relationship**. Course được loại khỏi schema; LearningModule là đơn vị nội dung được chọn vào pathway. Dataset Excel, JSON và bộ import đã đồng bộ sang v0.9.0.

The ontology diagram above shows the complete relationship set; its PlantUML source is linked beside the image.

| Relationship | Hướng | Ý nghĩa |
|---|---|---|
| `HAS_ROLE` | Occupation → TargetRole | Một nghề có nhiều chức danh; mỗi TargetRole thuộc đúng một Occupation. |
| `HAS_LEVEL` | TargetRole → Level | Một role có nhiều cấp độ; mỗi Level thuộc đúng một role. Dataset hiện có Junior, Middle, Senior cho mỗi role. |
| `HAS_COMPETENCY` | Level → Competency | Mỗi Level sở hữu các năng lực riêng; mỗi Competency thuộc đúng một Level. |
| `HAS_SKILL` | Competency → MicroSkill | Năng lực được cấu thành từ các skill. Mỗi Competency hiện có ít nhất hai skill; một skill có thể thuộc nhiều năng lực. |
| `REQUIRES_SKILL` | Level → MicroSkill | Xác định skill và yêu cầu đánh giá để đạt Level. Ngưỡng điểm nằm trên quan hệ này. |
| `TEACHES` | LearningModule → MicroSkill | Quan hệ nhiều–nhiều: một Module dạy một hoặc nhiều MicroSkill; một MicroSkill có thể được dạy bởi nhiều Module. Dataset hiện yêu cầu mỗi skill có ít nhất một Module. |
| `HAS_SKILL_PREREQUISITE` | MicroSkill → MicroSkill | A → B nghĩa là phải xác nhận readiness của skill B trước khi học skill A. |

Bộ skill của các Level được xác định riêng, có thể giao nhau. MicroSkill dùng chung định nghĩa; yêu cầu thực hiện và ngưỡng điểm có thể khác theo từng Level.

## 2. Các field chung của mọi node và relationship

Các field dưới đây được lưu trực tiếp thành property trên graph. Các bảng node ở phần sau liệt kê field nghiệp vụ bổ sung.

| Field | Kiểu | Ý nghĩa và cách dùng |
|---|---|---|
| `id` | String | ID ổn định của bản ghi. Dùng để nối và truy vấn; không dùng tên hiển thị làm khóa. Import kiểm tra ID không trùng trong từng tập bản ghi node/relationship. |
| `version` | String | Phiên bản catalog. Phiên bản hiện tại là `0.9.0`. Giúp xác định bộ định nghĩa mà dữ liệu thuộc về; không đồng nghĩa với phiên bản rubric hay nội dung học. |
| `status` | Enum/String | Trạng thái vòng đời: `DRAFT`, `ACTIVE`, `ARCHIVED`. Dataset hiện dùng `ACTIVE` cho các node và relationship. |
| `reviewStatus` | Enum/String | Trạng thái chuyên gia duyệt: `NEEDS_EXPERT_REVIEW`, `APPROVED`, `REJECTED`. Dataset hiện đang chờ duyệt. |
| `reviewedBy` | String hoặc null | Danh tính người thực sự phê duyệt/rà soát. Không tự điền người duyệt khi dữ liệu chưa được duyệt. |
| `reviewedAt` | Chuỗi datetime ISO 8601 hoặc null | Thời điểm duyệt, có múi giờ; ví dụ `2026-10-14T10:00:00+07:00`. Khi dùng kiểu thời gian Neo4j trong tương lai cần thống nhất với bộ import; seed hiện dùng chuỗi. |

Điều kiện xuất bản: `status = ACTIVE`, `reviewStatus = APPROVED`, có `reviewedBy` và `reviewedAt` hợp lệ. `ACTIVE` không tự chứng minh đã được chuyên gia duyệt.

Neo4j không lưu property có giá trị null; bộ import bỏ các field null khỏi node/relationship. `version` là metadata của snapshot hiện tại, không tạo thêm node phiên bản. Việc dùng lại cùng ID cho nhiều snapshot trong một graph cần một thiết kế lịch sử riêng; bộ import hiện chỉ nhận graph trống hoặc đúng snapshot đã có.

## 3. Giải thích field trong từng node

### 3.1. Occupation — Nghề nghiệp

Occupation là nghề theo O*NET, ví dụ `Software Developers`, mã `15-1252.00`. Nó là điểm neo để truy nguyên các reported job title và hồ sơ sở thích nghề nghiệp.

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| `code` | String | Mã O*NET-SOC của nghề; ví dụ `15-1252.00`. Giữ nguyên mã nguồn để đối chiếu. |
| `name` | String | Tên nghề từ O*NET; ví dụ `Software Developers`. |
| `jobZone` | Integer | Nhóm mức chuẩn bị nghề nghiệp theo O*NET, phản ánh yêu cầu tổng quát về đào tạo, kinh nghiệm và giáo dục. Không dùng để suy ra Junior/Middle/Senior. |
| `interestRealistic` | Float [0,1] | R — sở thích hoạt động thực tế, kỹ thuật, thiết bị hoặc xây dựng/sửa chữa. |
| `interestInvestigative` | Float [0,1] | I — sở thích nghiên cứu, phân tích và tìm hiểu vấn đề. |
| `interestArtistic` | Float [0,1] | A — sở thích sáng tạo và biểu đạt nghệ thuật. |
| `interestSocial` | Float [0,1] | S — sở thích hỗ trợ, hướng dẫn và giúp đỡ người khác. |
| `interestEnterprising` | Float [0,1] | E — sở thích lãnh đạo, thuyết phục, quản lý hoặc hoạt động kinh doanh. |
| `interestConventional` | Float [0,1] | C — sở thích làm việc với dữ liệu, quy trình, quy tắc và tổ chức thông tin. |

Sáu điểm là **hồ sơ sở thích của nghề**, lấy từ O*NET 31.0, không phải kết quả RIASEC của một learner. Thang OI nguồn là 1–7; quy đổi bằng `(điểm gốc − 1) / 6`, lưu sáu chữ số thập phân. Ví dụ Investigative của Software Developers: `6.05 → 0.841667`. Không thay điểm thiếu bằng 0; không dùng RIASEC làm ngưỡng đạt skill.

Kết quả RIASEC của learner phải lưu riêng theo learner, công cụ/phiên bản và phương pháp tính điểm. Khi so sánh với nghề phải có quy tắc chuẩn hóa phù hợp với công cụ đó.

### 3.2. TargetRole — Chức danh mục tiêu

TargetRole biểu diễn chức danh người học hướng tới trong một Occupation, ví dụ `Application Developer`.

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| `code` | String | Mã role ổn định và duy nhất trong catalog. Các role cùng tên thuộc hai Occupation có mã riêng. |
| `name` | String | Tên chức danh, hiện lấy từ “Sample of reported job titles” của O*NET. |
| `scope` | String | Phạm vi công việc của role: làm gì, phụ trách phần nào. Đây là mô tả do nhóm tổng hợp theo nguồn và cần chuyên gia xác nhận. |

`occupationId` xuất hiện trong Excel/JSON để nối dữ liệu. Sau import, quan hệ `Occupation → HAS_ROLE → TargetRole` biểu diễn ownership; `occupationId` không được lưu trên node.

### 3.3. Level — Cấp độ của role

Level mô tả kỳ vọng năng lực và mức tự chủ trong một TargetRole cụ thể. Junior của role này là một node khác Junior của role khác.

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| `code` | String | Mã cấp độ: `J`, `M`, `S`. Duy nhất trong phạm vi role sở hữu. |
| `name` | String | Tên hiển thị: `Junior`, `Middle`, `Senior`. |
| `rank` | Integer | Thứ bậc: Junior = 1, Middle = 2, Senior = 3. Dùng để sắp xếp; không phải điểm đánh giá. |
| `context` | String | Ngữ cảnh thực hiện công việc và mức hỗ trợ/tự chủ được phép ở cấp độ này. Giúp assessor hiểu kỳ vọng khi chấm. |
| `attainmentRule` | Enum/String | Hiện là `ALL_MANDATORY_SKILLS`: chỉ đạt Level khi tất cả skill bắt buộc của Level đều đạt. |

Skill thuộc Level và ngưỡng điểm được xác định qua `REQUIRES_SKILL`. Level không lưu điểm trung bình để bù cho một skill bắt buộc bị trượt. `targetRoleId` chỉ dùng nối Excel/JSON; sau import ownership nằm trên `HAS_LEVEL`.

Junior/Middle/Senior là các tier của nhóm, tham khảo SFIA và UK; không phải phép ánh xạ chính thức một-một sang cấp SFIA hoặc ngạch công việc UK.

### 3.4. Competency — Năng lực thuộc Level

Competency nhóm những MicroSkill cùng tạo nên một năng lực của Level. Mỗi Competency thuộc đúng một Level và được suy ra từ kết quả skill của learner.

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| `name` | String | Tên năng lực để trình bày cho người học và người quản lý. |
| `description` | String | Giải thích phạm vi và ý nghĩa của nhóm skill. |
| `attainmentRule` | Enum/String | Hiện là `ALL_MEMBER_SKILLS_AT_OWNING_LEVEL`: đạt tất cả skill thành viên theo yêu cầu của Level sở hữu thì đạt Competency. |

Competency không có điểm, ngưỡng điểm hoặc bài đánh giá độc lập. Mỗi skill trong `HAS_SKILL` phải có `REQUIRES_SKILL` tương ứng ở Level sở hữu. `levelId` chỉ dùng nối Excel/JSON; ownership trên graph là `HAS_COMPETENCY`.

Kết quả suy ra cho một learner:

- Đủ tất cả kết quả `PASS` hợp lệ → `ACHIEVED`.
- Có skill đã xác định trượt → `NOT_YET_ACHIEVED`.
- Chưa có đủ kết quả tương thích và chưa có skill trượt → `NOT_ASSESSED`.
- Thiếu hoặc chưa duyệt định nghĩa bắt buộc → `CATALOG_NOT_READY`.

Các kết quả này được lưu trong dữ liệu learner, không gắn thành trạng thái chung của node Competency.

### 3.5. MicroSkill — Kỹ năng cụ thể

MicroSkill là định nghĩa một kỹ năng có thể quan sát hoặc kiểm chứng, dùng lại giữa nhiều role và Level; mỗi skill có thể được dạy bởi nhiều Module.

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| `name` | String | Tên skill; ví dụ `Manage source changes with version control`. |
| `definition` | String | Giải thích hành vi/phạm vi của skill, giúp phân biệt với skill khác. Đây là định nghĩa chung, không phải nhiệm vụ riêng của mọi Level. |

Node không lưu `actualScore` hoặc `requiredScore`. `requiredScore` nằm trên `REQUIRES_SKILL` để đánh giá đạt Level và trên `HAS_SKILL_PREREQUISITE` để kiểm tra sẵn sàng học; `actualScore` thuộc kết quả đánh giá của từng learner. Như vậy một skill có thể yêu cầu mức thực hiện khác nhau ở Junior và Senior.

### 3.6. LearningModule — Đơn vị nội dung học

LearningModule chứa tham chiếu nội dung bài học/thực hành. Module dạy skill qua `TEACHES` và được chọn trực tiếp vào pathway dựa trên skill gap.

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| `title` | String | Tên Module hiển thị trong lộ trình học. |
| `moduleType` | Enum/String | Loại nội dung. `LESSON_AND_PRACTICE`: bài học kèm thực hành; `RESOURCE_GUIDED_PRACTICE`: hướng dẫn đọc nguồn và thực hành mẫu. |
| `contentUri` | String | Đường dẫn hoặc định danh nội dung thực tế. Seed hiện dùng đường dẫn tương đối tính từ thư mục chứa JSON seed, ví dụ `content/modules/MOD-READ-CORE02.md`. |
| `contentType` | String | Định dạng nội dung; hiện là `text/markdown`, giúp ứng dụng chọn cách đọc/hiển thị. |
| `contentVersion` | String | Phiên bản của nội dung được tham chiếu, ví dụ `1.2`. Cần khớp bản nội dung đã được duyệt và triển khai. |

`contentVersion` khác `version`: field chung `version` chỉ phiên bản catalog, còn `contentVersion` chỉ bản bài học. Nội dung bài học lưu ngoài Neo4j; database lưu tham chiếu. Thứ tự học nằm trong pathway của learner, dựa trên skill gap và prerequisite; không đặt thứ tự toàn cục trên Module.

## 4. Field riêng trên các relationship

Mọi relationship cũng có bộ field chung ở mục 2. Các field `type`, `fromId`, `toId` trong JSON chỉ phục vụ xác định loại và hai đầu cạnh khi import, không trở thành property dư trên cạnh.

### 4.1. REQUIRES_SKILL

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| `requiredScore` | Float [0,1] | Ngưỡng điểm để skill đạt trong Level này. Dataset hiện đề xuất 0.60–0.95, chờ hiệu chuẩn. |
| `isMandatory` | Boolean | Skill có bắt buộc để đạt Level hay không. Tất cả 1.891 requirement hiện là true và đang chờ chuyên gia rà. |

### 4.2. HAS_SKILL_PREREQUISITE

A → B nghĩa là xác nhận skill nền tảng B trước khi học skill A. Đây là điều kiện sẵn sàng học, không tự thêm B vào tập skill bắt buộc để đạt Level.

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| `requiredScore` | Float [0,1] | Ngưỡng điểm readiness; cả 11 cạnh hiện đề xuất `0.75`, chờ chuyên gia duyệt. |

Quan hệ này chỉ có `requiredScore` và metadata chung; mô tả readiness và tham chiếu bài đánh giá được quản lý ngoài Neo4j. Backend cần mapping assessment rõ ràng cho cặp skill phụ thuộc–skill nền tảng trước khi xác nhận readiness. Kết quả phải khớp learner, skill nền tảng, quan hệ tiên quyết và phiên bản task/rubric/catalog. Readiness `PASS` đáp ứng điều kiện; `FAIL` hoặc `NOT_ASSESSED` chưa đáp ứng. Không tự dùng kết quả đánh giá skill theo Level thay cho readiness vì rubric và nhiệm vụ khác nhau.

Các quan hệ `HAS_ROLE`, `HAS_LEVEL`, `HAS_COMPETENCY`, `HAS_SKILL`, `TEACHES` chỉ có metadata chung.

## 5. Dữ liệu đánh giá nằm ngoài Neo4j

Neo4j lưu định nghĩa catalog và ngưỡng `requiredScore`. Các dữ liệu sau thuộc phần assessment/tài liệu nghiệp vụ, không phải property của schema này:

- Mục tiêu thực hành, nhiệm vụ, bằng chứng cần nộp và hướng dẫn chấm.
- Rubric, tiêu chí, trọng số, phiên bản và mapping bài đánh giá với Level–Skill hoặc cặp skill tiên quyết.
- `actualScore`, kết quả đánh giá, tiến độ và lịch sử học của từng learner.

Quy tắc đã thống nhất: `actualScore = Σ(weight_i × rating_i / 4)`; thiếu bằng chứng ở tiêu chí bắt buộc thì `NOT_ASSESSED`, điểm là null. Backend assessment phải xác định rõ bài đánh giá và phiên bản tiêu chí trước khi so sánh với ngưỡng trong graph. Ngưỡng điểm không tự xác định được bài kiểm tra.

Xem [quy tắc assessment và minh chứng](dataset/ONTOLOGY.md#assessment-calculation-and-readiness-contract). Các đề xuất rubric cũ được giữ làm tài liệu tham khảo, không phải cấu hình runtime đã được duyệt.

## 6. Ranh giới field Excel/JSON và property Neo4j

| Field nối dữ liệu | Relationship tương ứng | Sau import |
|---|---|---|
| `TargetRoles.occupationId` | Occupation → HAS_ROLE → TargetRole | Bỏ field khỏi node; dùng cạnh để truy vấn nghề sở hữu. |
| `Levels.targetRoleId` | TargetRole → HAS_LEVEL → Level | Bỏ field khỏi node; dùng cạnh để truy vấn role sở hữu. |
| `Competencies.levelId` | Level → HAS_COMPETENCY → Competency | Bỏ field khỏi node; dùng cạnh để truy vấn Level sở hữu. |

Importer từ chối liên kết thiếu/sai thay vì tự suy đoán. Sau import, quan hệ graph là nguồn chính thức cho truy vấn cấu trúc. Sáu field RIASEC là property nghiệp vụ thực sự trên Occupation.

## 7. Các quy tắc nhất quán và recommendation

- Mỗi TargetRole thuộc đúng một Occupation; mỗi Level thuộc một role; mỗi Competency thuộc một Level.
- Role cùng tên trong các Occupation khác nhau có ID/code riêng. Không đặt ràng buộc tên role duy nhất toàn hệ thống.
- Mỗi Competency hiện có ít nhất hai skill; mọi skill thành viên có requirement tại Level sở hữu. Tập skill bắt buộc để đạt Level phải có ít nhất một phần tử.
- Đồ thị skill prerequisite phải không có chu trình, cạnh tự trỏ hoặc sai loại node. Mở rộng cả prerequisite gián tiếp.
- Sắp xếp Module theo skill prerequisite và trạng thái readiness của learner. Không chuyển tự động prerequisite Course cũ thành prerequisite skill.
- Tìm Module qua `Level → REQUIRES_SKILL → MicroSkill ← TEACHES ← LearningModule`, rồi kiểm tra nội dung phù hợp role/Level, publication và prerequisite. Không có cạnh trực tiếp từ Level tới Module.
- Thiếu nội dung phù hợp cho một gap → `PATHWAY_UNRESOLVED`. Một cạnh `TEACHES` hoặc tài liệu tham khảo không tự chứng minh nội dung đủ sâu hay đã được duyệt.
- Competency được suy ra từ skill; Level đạt khi đủ các skill bắt buộc. Module completion không tự thay thế kết quả đánh giá skill.

### Ràng buộc TEACHES N–N và nội dung theo cấp độ

- Mỗi Module trong catalog hiện có ít nhất một cạnh `TEACHES` tới MicroSkill; mỗi MicroSkill có ít nhất một Module dạy. Không giới hạn mỗi phía ở một cạnh. Mỗi cặp Module–Skill chỉ có một mapping trong snapshot.
- Bộ kiểm tra import và thao tác ghi catalog phải kiểm tra cả hai phía, kể cả node không có cạnh. Constraint duy nhất trên ID không tự đảm bảo cardinality này. Importer v0.9 đã kiểm tra cả hai phía; API ghi catalog trong tương lai cũng phải thực thi ràng buộc này.
- Một Module dùng chung cho các Level yêu cầu cùng skill. Nội dung có thể chia thành phần nền tảng, thực hành và nâng cao trong cùng Module; nhiệm vụ và bằng chứng đánh giá được định nghĩa trong cấu hình assessment ngoài graph, gắn với skill và ngữ cảnh Level tương ứng.
- Hoàn thành Module không đồng nghĩa đạt skill ở mọi Level. Nếu nội dung chưa đáp ứng ngữ cảnh/độ sâu của Level, trả về `PATHWAY_UNRESOLVED`, không suy ra đủ năng lực chỉ vì tồn tại cạnh `TEACHES`.
- Với mỗi skill gap, xét các Module thay thế theo nội dung, độ sâu, readiness và phê duyệt; không mặc định học tất cả Module dạy cùng skill. Một Module bù nhiều gap chỉ xuất hiện một lần trong cùng kế hoạch học, với danh sách skill cần học rõ ràng.
- Đánh giá riêng từng skill có bằng chứng; hoàn thành Module không tự PASS mọi skill được gắn TEACHES.
- Readiness áp dụng trước hoạt động học skill phụ thuộc. Nếu Module dạy cả nền tảng và skill phụ thuộc, phải có thứ tự nội dung phù hợp và xác nhận readiness giữa các phần; nếu không khả thi thì chọn Module nền tảng khác hoặc báo lộ trình chưa giải quyết được.
- Bỏ Course đồng thời bỏ `HAS_COURSE`, `HAS_MODULE`, `HAS_COURSE_PREREQUISITE` và `sequence` thuộc Course. Không chuyển bằng chứng hoàn thành Course cũ thành bằng chứng đạt skill.

## 8. Nguồn dữ liệu và trạng thái hiện tại

O*NET cung cấp Occupation, sample job titles và điểm sở thích nghề nghiệp. ESCO hỗ trợ đối chiếu định nghĩa skill; SFIA và UK hỗ trợ phạm vi công việc và mức tự chủ. Các grouping, tier, task, prerequisite và ngưỡng điểm là đề xuất của nhóm cần chuyên gia xác nhận.

[JSON seed](dataset/import/ontology_seed.json) và [Excel review](dataset/ontology_dataset.xlsx) có **833 node, 4.638 relationship**: 5 Occupation, 48 TargetRole, 144 Level, 472 Competency, 79 MicroSkill, 85 LearningModule. Có 11 prerequisite skill; không còn Course. Schema, dataset và import đã đồng bộ v0.9. Backend legacy API và database đang chạy chưa được chuyển dữ liệu; xem ranh giới runtime trong [ARCHITECTURE.md](ARCHITECTURE.md). Learner assessment trong quá khứ giữ ngữ cảnh catalog và rubric gốc.

File nguồn, URI đối chiếu và minh chứng được giữ trong [ONTOLOGY.md](dataset/ONTOLOGY.md) và thư mục `dataset/sources/`, không đưa thành các property `sourceConceptUri`, `sourceLocator`, `sourceVerification` trên graph.

## 9. Tóm tắt property để triển khai

Mọi node và relationship đều có metadata chung: `id`, `version`, `status`, `reviewStatus`, `reviewedBy`, `reviewedAt`. Giá trị null không được lưu thành property Neo4j.

| Node | Property nghiệp vụ ngoài metadata |
|---|---|
| Occupation | code, name, jobZone, interestRealistic, interestInvestigative, interestArtistic, interestSocial, interestEnterprising, interestConventional |
| TargetRole | code, name, scope |
| Level | code, name, rank, context, attainmentRule |
| Competency | name, description, attainmentRule |
| MicroSkill | name, definition |
| LearningModule | title, moduleType, contentUri, contentType, contentVersion |

| Relationship | Property nghiệp vụ ngoài metadata | Số bản ghi |
|---|---|---:|
| HAS_ROLE | Không có | 48 |
| HAS_LEVEL | Không có | 144 |
| HAS_COMPETENCY | Không có | 472 |
| HAS_SKILL | Không có | 1.891 |
| REQUIRES_SKILL | requiredScore, isMandatory | 1.891 |
| TEACHES | Không có | 181 |
| HAS_SKILL_PREREQUISITE | requiredScore | 11 |

Mỗi TargetRole được xử lý riêng theo Level và bộ requirement. Các role có cùng skill có thể tạo ra lộ trình giống nhau; không có cơ chế gom role bằng mã profile.

Các field đã bỏ khỏi graph: `canonicalProfileKey`, `learningOutcome`, `expectedOutcome`, `rubricId`, `rubricVersion`, `readinessOutcome`, `readinessAssessmentId`, `readinessAssessmentVersion`. Không có node Course, quan hệ Course hoặc cạnh trực tiếp Level–LearningModule trong schema này.


## 10. RQ2 research workspace isolation

Admin Research dùng schema v0.9.0 này để kiểm tra và mở rộng dữ liệu tổng hợp ở Neo4j instance riêng. Sáu loại node, bảy loại cạnh và toàn bộ property nghiệp vụ giữ theo các bảng trên. Nhãn kỹ thuật `ResearchNode` cùng constraint duy nhất trên `id` chỉ xuất hiện trong instance benchmark; không thêm field runId/sourceId vào ontology. Metadata nguồn, seed, workload và sample timing lưu ở PostgreSQL research_run/research_graph, ngoài graph nghiệp vụ.

Các node/edge sinh thêm có ID tổng hợp và NEEDS_EXPERT_REVIEW; không tự điền reviewedBy/reviewedAt. contentUri giữ từ template và không chứng minh độ sâu nội dung. Xem [rule tạo sinh và đo lường](research/RQ2/RULES.md), [field contract](research/RQ2/API.md). Không thay đổi dataset nguồn hoặc dữ liệu vận hành khi chạy benchmark. 3–5 hop trong RQ2 là đường cấu trúc từ Level/TargetRole/Occupation qua Competency, MicroSkill tới LearningModule, không phải chuỗi prerequisite hay lộ trình người học.

Research kế thừa quyền Admin của portal; thay đổi bỏ đăng nhập riêng và sắp thứ tự RQ1 → RQ2 → RQ3 không thêm hoặc sửa node/property/relationship trong schema.

RQ2 cho phép cấu hình số lượt đo qua iterations trong PostgreSQL; N không phải property của ontology và không thay đổi node/cạnh hay workload pool của Neo4j.

RQ2 v3 mở rộng workload theo số cặp khác nhau yêu cầu, seed và vòng đo; PostgreSQL V9 lưu snapshot theo (run,size,seed). Trial/Median/outcome/degree là metadata nghiên cứu, không thêm property vào ontology. Neo4j riêng chỉ giữ graph của seed/quy mô đang đo; import và warm-up một lần trước các vòng. Toàn bộ field và bất biến ontology bên trên vẫn được kiểm tra; dữ liệu nguồn/vận hành không đổi. Xem API/RULES cho trường mới và tương thích lượt cũ.

Phân trang bảng latency theo seed chỉ thay đổi cách hiển thị ở frontend; không đổi schema Neo4j, snapshot, workload hoặc phép đo.

RQ2 UI nhận số lượng bộ dữ liệu mỗi quy mô, tự chuyển N thành seed1..N trước khi tạo dữ liệu; thay đổi này không thêm/sửa node, quan hệ hoặc property ontology. Snapshot vẫn lưu riêng theo seed trong PostgreSQL.
