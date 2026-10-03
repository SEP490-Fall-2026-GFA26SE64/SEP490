# Organization, tài khoản demo và generator RQ1

## 1. Danh tính demo đồng bộ với workbook

Organization: **ALG_DEMO — AdaptLearnGraph Demo Organization**.
UUID: `00000000-0000-0000-0000-000000000001`.
Unit: Demo Engineering, UUID `00000000-0000-0000-0000-000000000010`.

| Identifier | Role | Account UUID |
| --- | --- | --- |
| org-admin@alg-demo.example | ORGANIZATION_ADMINISTRATOR | 00000000-0000-0000-0000-000000000002 |
| expert@alg-demo.example | DOMAIN_EXPERT | 00000000-0000-0000-0000-000000000003 |
| employee@alg-demo.example | EMPLOYEE | 00000000-0000-0000-0000-000000000001 |

Cả ba thuộc cùng organization và unit. Employee có `learner_state` và khớp
`catalog.local-actor.account-id` trong `application-local.yml` mặc định.
36 target role của `neo4j_dataset_schema_diagram_aligned.xlsx` đều dùng UUID
organization này. ID organization/account có thể giống nhau vì thuộc hai loại
thực thể khác nhau. Không sinh organization riêng cho mỗi role.

Seed tạo organization có thật trong PostgreSQL, dùng ID đã cố định trong workbook.
Không cần đổi UUID hoặc tạo lại Excel mỗi lần chạy. Script kiểm tra sự khớp nhau
trước khi ghi; nếu ID/code/email đã thuộc thực thể khác, transaction sẽ dừng.

## 2. Chạy

Yêu cầu Python 3.10+, Docker Compose và migration PostgreSQL V1–V6 đã hoàn thành.
Không cần pip. Chạy từ root repo:

```bash
docker compose -f compose.dev.yml up --build -d
python3 documents/dataset/setup_demo_data.py --identity-only
```

Lệnh Python trên tạo organization, unit, ba account, account roles và learner
state. Tất cả nằm trong một PostgreSQL transaction; chạy lại không tạo trùng,
không reset mật khẩu hoặc sửa account hiện có. Advisory lock tuần tự hóa các
lần chạy seed này. Script không tự nâng quyền tài khoản đang có role khác.

Với Neo4j catalog hợp lệ, một lệnh để seed identities rồi import graph:

```bash
python3 documents/dataset/setup_demo_data.py
```

Script chỉ dùng PostgreSQL/Neo4j của `compose.dev.yml`, đọc port và credentials
từ Compose, không in password. Preflight graph chạy trước khi seed; nếu graph
có node legacy thiếu id/code, dùng `--identity-only` để seed danh tính trước.
Nếu bước graph lỗi sau khi PostgreSQL đã commit, identities vẫn còn; sửa lỗi
rồi chạy lại. Không có transaction chung xuyên PostgreSQL và Neo4j.

Kiểm tra không kết nối database:

```bash
python3 documents/dataset/setup_demo_data.py --dry-run
```

Nếu Docker local báo lỗi API v1.53, có thể chạy lệnh với
`DOCKER_API_VERSION=1.51` theo cấu hình Docker của máy này.

## 3. Giới hạn chức năng hiện tại

- Backend chưa có login/password encoder hoạt động: `SecurityConfiguration`
  chặn các endpoint chưa triển khai; API local xem target role dùng configured
  actor. Seed không biến các account thành tài khoản đăng nhập được.
- `password_hash` của account mới là sentinel khóa `!LOCAL_FIXTURE_NO_LOGIN!`,
  không phải mật khẩu plaintext hoặc hash hợp lệ để đăng nhập. Khi làm auth,
  dùng first-time setup/reset password để tạo hash theo encoder được chọn.
- Domain Expert đã có application role; schema hiện chưa có bảng phân công
  expert–target role. Seed không giả lập rằng chức năng phân công đã hoàn tất.
- Chưa seed subscription, câu hỏi, baseline configuration, catalog release hay
  target selection; các phần này cần contract riêng trước khi chạy trọn luồng học.

Ngày 02/10/2026, đã seed và chạy lại thành công trên PostgreSQL local. Neo4j
local có một TargetRole demo dùng `entity_id` và hai LearningModule demo dùng
`catalog_ref_id`, thiếu `id/code` theo schema hiện tại; chúng được giữ nguyên.
Importer từ chối nạp graph này và báo lỗi rõ ràng. Cần chuyển đổi các fixture
đó theo contract phù hợp hoặc dùng database demo sạch trước khi import graph.

## 4. Đánh giá generate_users_v7_rq1.py của bạn

File gốc trong Downloads được giữ nguyên. Chạy thử với workbook hiện tại tạo
được 500 hồ sơ, theo SE/DATA/AI = 200/150/150. Logic có thể tái sử dụng cho phần
**synthetic learner profiles của RQ1**; không phải script tạo account đăng nhập.

Các điểm cần sửa:

1. `list(required - unknown)` phụ thuộc thứ tự set của Python. Thử hai process
   cùng seed 42 đã cho profiles khác nhau. Random seed chưa đủ để tái lập.
2. Đọc cột theo vị trí và suy domain qua danh sách family hardcode; thiếu kiểm
   tra catalog hiện tại/status/organization.
3. Số unknown cố định 14–19 chỉ phù hợp catalog 66 skill.
4. Skill được chọn làm cross-domain strength có thể đồng thời thuộc unknown,
   nên các nhánh random không bảo đảm strength đó được quan sát.
5. `assert` bị bỏ khi chạy Python `-O`; tên output vẫn ghi v6; metadata tỷ lệ
   40/40/20 là trọng số lấy mẫu, không bảo đảm số lượng chính xác.
6. Chưa có checksum catalog hoặc bộ nhãn 50 profile × 5 module từ expert.

Đã tạo bản điều chỉnh `generate_rq1_profiles.py` (V8), đọc workbook bằng parser
stdlib hiện có, sort trước random, dùng domain từ HAS_ROLE, kiểm tra explicit,
ghi checksum catalog và đánh dấu `SYNTHETIC_BENCHMARK_ONLY`/`NOT_ANNOTATED`.
Giữ tỷ lệ SE/DATA/AI 40/30/30 của bản gốc; đây là cấu hình nghiên cứu đề xuất,
cần xác nhận lại nếu phạm vi đề tài chỉ Software Engineering.

```bash
python3 documents/dataset/generate_rq1_profiles.py
```

Output mặc định: `local/benchmarks/rq1/rq1_profiles_v8.json` (được Git ignore).
Không ghi vào PostgreSQL/Neo4j. `sourceOrganizationIds` chỉ là nguồn catalog;
500 profiles không được biến thành nhân viên của ALG_DEMO. `null` giữ nghĩa
chưa có evidence, không chuyển thành 0. Hồ sơ là synthetic, không phải mastery
đã đo qua assessment thật. Email dùng domain dành cho dữ liệu ví dụ.

```bash
python3 documents/dataset/generate_rq1_profiles.py 500 --seed 42 --output /tmp/rq1.json
python3 -m unittest discover -s documents/dataset -p 'test_*.py' -v
```

RQ1 vẫn cần expert chọn/đánh giá độc lập 5 module phù hợp cho mỗi profile trong
50 profile mẫu. Không được dùng output thuật toán recommendation làm ground
truth rồi dùng chính nó để đánh giá thuật toán.

Đã xác minh: 20 test thành công; kiểm tra 10 seed × 500 profiles, kiểm tra hai
process với PYTHONHASHSEED khác nhau và Python `-O` cho output giống nhau.
Seed identities chạy hai lần trên PostgreSQL local giữ nguyên ba account.
