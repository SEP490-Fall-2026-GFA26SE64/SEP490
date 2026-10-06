# Nạp dataset Excel vào Neo4j

Để tạo fixture benchmark RQ3 (100 learner scenarios, paired module failures,
curriculum tĩnh và fallback cố định), xem [RQ3 scenarios v1](outputs/rq3_v1/README.md)
và [quyết định dataset RQ3](../features/Benchmark%20dataset%20creation/Create%20RQ3%20Dataset.md).

Để tạo organization + admin/expert/employee trước, xem
[Demo identities và đánh giá generator RQ1](DEMO_IDENTITY_AND_RQ1.md).
Chạy `python3 documents/dataset/setup_demo_data.py --identity-only` để seed
PostgreSQL và kiểm tra UUID khớp workbook; bỏ flag để nạp cả graph hợp lệ.

Script này chỉ nạp catalog vào **Neo4j 5.26 Community**. Không tạo account,
organization, câu hỏi, assessment, mastery hay pathway trong PostgreSQL.

## 1. File dùng để import

- Bản gốc: `documents/dataset/neo4j_dataset_schema_diagram_aligned.xlsx`.
- Bản đã sửa: `documents/dataset/outputs/neo4j_import_20261002/neo4j_dataset_schema_diagram_aligned.xlsx`.
- Script: `documents/dataset/import_neo4j_dataset.py`.

Script mặc định đọc file Excel ngay trong `documents/dataset/`. File này và bản output đã được cập nhật cùng nội dung.

### Kết quả đối chiếu

Đối chiếu với `documents/neo4j_schema.md`,
`backend/src/main/resources/db/neo4j/V1__catalog_constraints.cypher` và
`Neo4jTargetRoleCatalogAdapter`/`Neo4jTargetRoleMapper` hiện tại:

| Nội dung | Kết quả |
| --- | --- |
| 5 loại node và 7 loại relationship | Phù hợp |
| ID/code trong từng label và cặp source/type/target | Không trùng |
| Endpoint của các relationship | Đều tồn tại |
| Mastery, coverage, status, timestamp, URL syntax | Hợp lệ |
| Một active domain/role và một active macro/skill | Phù hợp |
| Prerequisite self-loop/cycle | Không có |
| Role ACTIVE có requirement; module ACTIVE có outcome | Phù hợp |
| `TargetRole.organizationId` | Bản gốc thiếu; đã thêm cột J |
| `TargetRole.seniority` | Bản gốc thiếu; đã thêm cột K và điền grade |
| `responsibilities` | Đã thêm cột L; tùy chọn, được phép bỏ trống |

`seniority` được lấy **một lần khi sửa workbook** từ grade đã ghi trong code
(`P1`–`P5`, `M3`–`M4`) và đối chiếu `track`. Script import đọc cột explicit,
không suy luận seniority từ code ở runtime.

`organizationId` đã điền UUID tenant development graph seed:
`00000000-0000-0000-0000-000000000001`. Cột `responsibilities` tùy chọn đã
thêm và để trống vì dataset chưa có nguồn mô tả trách nhiệm. Không tự tạo
organization trong PostgreSQL. Nếu dùng tenant khác, sửa UUID của các role
trong Excel; `--organization-id` phải khớp giá trị đã điền.

Dataset có **158 node và 1.422 relationship**:

| Sheet | Số bản ghi |
| --- | ---: |
| Job Domains | 3 |
| Target Roles | 36 |
| Macro Competencies | 3 |
| MicroSkills | 66 |
| Learning Modules | 50 |
| HAS_ROLE | 36 |
| REQUIRES_MACRO | 108 |
| HAS_SKILL | 66 |
| REQUIRES_SKILL | 806 |
| PREREQUISITE_OF | 61 |
| TEACHES | 331 |
| HAS_ENTRY_REQUIREMENT | 14 |

URL được kiểm tra cú pháp HTTP(S), chưa kiểm tra website còn hoạt động. Giá và
thời lượng khóa học được giữ theo nguồn Excel, chưa xác nhận độc lập. Độ phù hợp
của mapping skill/module cần expert review riêng, không thể chứng minh bằng
schema validation.

## 2. Chuẩn bị database

Yêu cầu Python **3.10 trở lên**. Script chỉ dùng standard library, không cần
pip, APOC hoặc copy Excel vào thư mục import của container.

Chạy từ thư mục gốc repository, với Docker Desktop đang hoạt động:

```bash
docker compose -f compose.dev.yml up --build -d
docker compose -f compose.dev.yml ps
```

Sau khi Docker khởi động, chỉ cần chạy một lần:

```bash
python3 documents/dataset/import_neo4j_dataset.py
```

Script tự đọc cấu hình từ `docker compose -f compose.dev.yml config --format json`
(tính cả `.env` và biến môi trường), lấy HTTP port/user/password mà không in
password. Không cần nhập password hay `--apply`. Có thể chạy từ thư mục khác
bằng đường dẫn tuyệt đối tới script.

Script chờ Neo4j sẵn sàng tối đa 180 giây (`--wait-seconds` để thay đổi), tạo
10 uniqueness constraints bằng migration V1 của dự án nếu chưa có, sau đó
validate và import trong một transaction dữ liệu. Constraints được commit
riêng trước khi import; không chạy migration PostgreSQL hay migration catalog
khác. Chạy lại lệnh sẽ không tạo bản ghi trùng.

## 3. Chọn organizationId

Nếu chỉ thử riêng graph, bạn tự chọn UUID cho tenant thử nghiệm và truyền vào
script. Để dữ liệu dùng được qua ứng dụng, chọn UUID của organization tương ứng
đang tồn tại trong PostgreSQL. Có thể kiểm tra bằng:

```bash
docker compose -f compose.dev.yml exec postgres psql -U adapt_learn_graph -d adapt_learn_graph -c 'SELECT organization_id FROM platform.organization;'
```

UUID `00000000-0000-0000-0000-000000000001` trong ví dụ dưới đây là tenant mẫu
đang dùng trong development graph seed. Thay bằng UUID bạn cần. **Dùng seed identity để bảo đảm UUID mẫu tồn tại trong PostgreSQL**.

## 4. Kiểm tra workbook, chưa kết nối database

```bash
python3 documents/dataset/import_neo4j_dataset.py --dry-run
```

Nếu đã điền organizationId cho mọi role trong workbook, bỏ tham số đó. Nếu vừa
truyền tham số vừa có giá trị trong Excel, hai giá trị phải giống nhau.

Đọc workbook khác bằng `--file path/to/file.xlsx`. Script yêu cầu header ở dòng
4, đúng sheet/column và các giá trị literal. Formula trong bảng import bị từ
chối để tránh nạp cached value cũ. Các dòng chỉ có định dạng nhưng không có dữ
liệu được bỏ qua. `responsibilities`, nếu thêm vào sheet Target Roles, phải là
chuỗi JSON array, ví dụ `["Build APIs", "Review designs"]`.

## 5. Kiểm tra với database, chưa ghi dữ liệu

```bash
python3 documents/dataset/import_neo4j_dataset.py --check-database
```

Script tự lấy cấu hình Docker Compose. Khi kết nối database khác, cung cấp
`--url`/`NEO4J_HTTP_URL` và `NEO4J_PASSWORD`; có thể thêm `--user` hoặc
`NEO4J_USER`, `NEO4J_DATABASE`. Nếu cả URL và password đã cung cấp, script
không cần gọi Docker Compose. Không commit password vào code/workbook.

Lệnh kiểm tra graph hiện có và graph hợp nhất dự kiến, kể cả trường hợp cạnh
mới kết hợp với cạnh cũ tạo cycle hoặc một skill có hai macro. Nếu thành công,
transaction được rollback mà không ghi dữ liệu.

## 6. Nạp dữ liệu

Chạy khi không có importer hoặc thao tác catalog khác ghi đồng thời. Community
không có đủ constraint để bảo vệ cardinality/cycle trước mọi writer đồng thời.

```bash
python3 documents/dataset/import_neo4j_dataset.py
```

Hành vi:

- **Add-only**: MERGE node theo `(label, code)`, relationship theo
  `(source, type, target)`.
- Node/relationship đã tồn tại giữ nguyên ID, thuộc tính và timestamp.
  ID trong Excel chỉ dùng khi tạo node mới. Vì vậy node seed trùng code vẫn
  giữ ID cũ và tham chiếu lịch sử của ứng dụng.
- Nếu ID incoming đã thuộc code khác, script dừng. Nếu role trùng code thuộc
  organization khác, script dừng. Constraint hiện tại unique code theo label,
  chưa hỗ trợ hai tenant có cùng role code.
- Cạnh đã tồn tại nhưng khác status/mastery/coverage cũng làm script dừng;
  script không âm thầm cập nhật catalog đang dùng.
- Timestamp chuyển sang Neo4j `datetime`, số mastery lưu dạng float, optional
  blank được bỏ qua. Không tạo property `relationshipType` hay endpoint code
  trên relationship.
- Nạp và kiểm tra toàn bộ graph trong **một transaction**, lỗi trước commit
  rollback toàn bộ. Script không xóa node, không `DETACH DELETE`, không thay
  graph cũ bằng dataset.
- Chạy lại cùng dataset sẽ tái sử dụng bản ghi đã nạp. Log thống kê bản ghi
  reused. Đổi nội dung node trong Excel không cập nhật node cũ trong chế độ
  add-only; cập nhật catalog là thao tác riêng.
- Nếu mất kết nối đúng lúc commit, trạng thái commit có thể chưa rõ. Kiểm tra
  database trước khi chạy lại. Không tự retry thao tác ghi/commit; chỉ retry kết nối trong lúc chờ khởi động.

## 7. Kiểm tra sau import trong Neo4j Browser

Mở `http://127.0.0.1:7474` rồi chạy:

```cypher
MATCH (n)
WHERE any(label IN labels(n) WHERE label IN
  ['JobDomain', 'TargetRole', 'MacroCompetency', 'MicroSkill', 'LearningModule'])
RETURN labels(n) AS labels, count(*) AS total;
```

```cypher
MATCH ()-[r]->()
WHERE type(r) IN ['HAS_ROLE', 'REQUIRES_MACRO', 'HAS_SKILL', 'REQUIRES_SKILL',
  'PREREQUISITE_OF', 'TEACHES', 'HAS_ENTRY_REQUIREMENT']
RETURN type(r) AS relationship, count(*) AS total;
```

```cypher
MATCH (r:TargetRole)
WHERE r.organizationId = '00000000-0000-0000-0000-000000000001'
RETURN r.code, r.track, r.seniority, r.organizationId
ORDER BY r.code;
```

```cypher
MATCH p=(r:TargetRole {code: 'JAVA_BACKEND_DEVELOPER_P3'})
  -[:REQUIRES_SKILL]->(s:MicroSkill)<-[:TEACHES]-(m:LearningModule)
RETURN p LIMIT 30;
```

Trên database rỗng có constraint, import tạo 158 node và 1.422 relationship.
Database có development seed hoặc catalog khác sẽ có tổng lớn hơn. Không tính
`SchemaMigration` vào 5 loại node catalog.

Graph import **chưa làm role baseline-ready**: ứng dụng còn cần baseline
configuration, question bank/mapping và coverage hợp lệ trong PostgreSQL.
Script không publish catalog release, đồng bộ `catalog_reference` hay ghi
learning state. Dataset vẫn chứa các domain DATA/AI theo bản gốc; schema chấp
nhận chúng, nhưng nhóm cần xác nhận phạm vi nội dung sản phẩm trước khi dùng.

## 8. Chạy regression test

```bash
python3 -m unittest discover -s documents/dataset -p 'test_import_neo4j_dataset.py' -v
```

Các case bao gồm missing organization, grade/track mismatch, endpoint thiếu,
duplicate edge, cycle, mastery ngoài khoảng, thiếu currency, hai macro/skill,
xung đột tenant và bảo toàn ID khi chạy lại.

Đã xác minh ngày 02/10/2026: 15 test đều qua. Trên container Neo4j
5.26 Community riêng với 10 uniqueness constraints của dự án, import lần đầu
tạo 158 node và 1.422 quan hệ; lần thứ hai giữ nguyên số lượng, tái sử dụng
toàn bộ bản ghi. Rollback cũng đã được kiểm tra. Container thử nghiệm đã được
dọn; chưa import vào database của dự án.

Chế độ chạy mặc định mới cũng đã được kiểm tra trên database thử nghiệm rỗng:
tự tạo constraints, import thành công, chạy lại tái sử dụng toàn bộ 1.580
bản ghi node/relationship. Cấu hình port và credentials lấy từ Docker Compose
đã được kiểm tra riêng, không hiển thị password.

## 9. Giao thức và tài liệu tham chiếu

Importer dùng transactional HTTP API của Neo4j 5.26 (`/db/neo4j/tx`) để có
explicit commit/rollback. API này đã deprecated trong 5.26, vẫn phù hợp bản
self-hosted trong Compose của dự án; không dùng cho Aura. Khi nâng Neo4j hoặc
chuyển Aura, cần chuyển importer sang Bolt driver hoặc Query API trước.

- [Neo4j HTTP transactions](https://neo4j.com/docs/http-api/current/transactions/)
- [Neo4j HTTP endpoints](https://neo4j.com/docs/http-api/current/endpoints/)
- [Schema dự án](../neo4j_schema.md)
