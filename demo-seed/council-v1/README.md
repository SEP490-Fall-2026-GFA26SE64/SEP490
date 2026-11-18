# Council demo v1 — seed riêng để thử

**Đã tạo dữ liệu và công cụ nạp, không chỉ là plan.** Bộ này nằm ngoài `backend/src/main/resources/db/seed`, không có runner tự chạy trong ứng dụng, không được include trong Compose mặc định.

Trạng thái kiểm tra ngày 18/11/2026: JSON/hash hợp lệ; backend build và CLI Java compile đạt; **bộ chấm Java chạy đúng 10/10 lượt**, sáu test offline đạt; `docker compose config --quiet` hợp lệ. **Chưa nạp/chạy DB/API/browser trên bộ này** vì Docker Desktop Linux engine chưa hoạt động. Các lệnh bên dưới là quy trình chuẩn bị để bạn thử, chưa phải bằng chứng runtime đã pass.

## Dữ liệu có thật trong bộ này

| Thành phần | Nội dung |
| --- | --- |
| Department | Council Demo — Development |
| Job Position | Council Demo — Application Engineering, `OCC-DEMO-COUNCIL-V1` |
| Role chính | Application Developer — Council Demo, `ROLE-DEMO-COUNCIL-V1` |
| Level chính | Middle, `ROLE-DEMO-COUNCIL-V1-M`; duration 4 months |
| Role đổi mục tiêu sau hoàn thành | Application Developer — Next Target Demo, `ROLE-DEMO-NEXT-V1`, Middle; dùng lại exact A evidence |
| Skill | MS-DEMO-01..05, version 0.12.1, yêu cầu INTERMEDIATE |
| Graph | 18 node, 25 quan hệ; chỉ một cạnh prerequisite B → P |
| Module | A1/A2 là alternatives; B1; P1. Mỗi module một bài TEXT hoàn chỉnh, ước lượng 3 phút |
| Câu hỏi | 12 thường + 3 mandatory = 15 câu publish có provenance DEVELOPMENT_SEED |
| Certificate | CERT-DEMO-INPUT-V1 cho D; definition không phải credential/achievement của learner |
| Learner | council-01@demo.invalid đến council-10@demo.invalid để tập; council-11@demo.invalid dành riêng buổi diễn |
| L&D / Expert | manager@technova.com / expert@technova.com, trong **workspace demo riêng** |

Các Skill/câu hỏi/module là dữ liệu biểu diễn, không tuyên bố được kiểm định hay đã có human review. Không seed baseline responses/results, evidence, learning progress, pathway, bypass hoặc Expert approval. Nội dung source của câu hỏi được giữ trong file seed cho người chuẩn bị; API Employee vẫn dùng projection không chứa answer key.

| Skill | Nhánh | Đáp án đúng của mọi câu trong nhóm |
| --- | --- | --- |
| A / MS-DEMO-01 — Unit testing | MODULE_ONLY; MOD-DEMO-A1, MOD-DEMO-A2; không prerequisite | 2 |
| B / MS-DEMO-02 — Database transactions | MODULE_ONLY; MOD-DEMO-B1; prerequisite P/I | 2 |
| C / MS-DEMO-03 — Refactoring | MODULE_ONLY; **không module/certificate** để bypass thật | 2 |
| D / MS-DEMO-04 — Input validation certificate | CERTIFICATE_ONLY; không thi baseline | Không có câu hỏi |
| P / MS-DEMO-05 — SQL query fundamentals | MODULE_ONLY; MOD-DEMO-P1; không prerequisite tiếp | 1 |

P nằm trong Role và pass diagnostic ban đầu, nhưng chưa có official evidence. B assessment làm P fail sẽ tạo bước bổ sung thật. Đây là điểm để phân biệt diagnostic với achievement.

## 1. Chuẩn bị offline

Chạy từ thư mục gốc project bằng PowerShell; cần Java/Javac 21, Python 3 và Maven wrapper hiện có:

```powershell
python demo-seed/council-v1/seed.py validate
python demo-seed/council-v1/seed.py init
python demo-seed/council-v1/seed.py prepare
python demo-seed/council-v1/seed.py score
```

`init` đã được chạy trên máy hiện tại. Nó tạo cấu hình và tài khoản riêng trong **[local/council-demo-v1/ACCOUNTS.md](../../local/council-demo-v1/ACCOUNTS.md)** và `private.env`, đều bị Git ignore. Mật khẩu/key được giữ nguyên khi chạy lại. Không gửi các file này lên Git. L&D/Expert sử dụng default development credentials của bootstrap; password các Employee demo được tạo ngẫu nhiên trong sheet riêng.

`prepare` build backend với tests skipped, trích dependency/classes từ JAR vào thư mục `local/` bị ignore rồi compile `CouncilDemoSeed.java` **bên ngoài** source path ứng dụng. Nó không nạp DB. `score` dùng chính RuleAssessment.select/score và RuleAssessmentDecision của backend, không chỉ tính lại bằng Python. Build skip tests không được gọi là backend test-suite pass.

## 2. Khởi động môi trường demo tách biệt

Bật Docker Desktop Linux engine, rồi chạy:

```powershell
docker compose --env-file local/council-demo-v1/private.env -f demo-seed/council-v1/compose.yaml up --build -d
docker compose --env-file local/council-demo-v1/private.env -f demo-seed/council-v1/compose.yaml ps -a
Invoke-RestMethod http://127.0.0.1:29080/api/v1/system/status
```

Compose project là **sep490-council-demo**, dùng database **adapt_learn_graph_council_demo**, image backend `adapt-learn-graph-council:dev`, các volume riêng. Nó chạy schema migrations hiện tại và bootstrap workspace TechNova development bình thường; không gọi base catalog seed, se-seed hay knowledge/module seed của hệ thống chính. Vì vậy không vướng hash file catalog chính đang lệch. Neo4j demo dùng volume riêng và cho phép ghi; không mở khóa graph chính đã seal.

| Dịch vụ | Địa chỉ loopback |
| --- | --- |
| Giao diện | http://127.0.0.1:29088/login |
| API | http://127.0.0.1:29080 |
| PostgreSQL | 127.0.0.1:29432 |
| Neo4j Browser / Bolt | http://127.0.0.1:29747 / bolt://127.0.0.1:29687 |
| MinIO | Nội bộ Compose, không public port |

Đợi `migrate` exit 0 và API sẵn sàng trước khi nạp. `web` có thể cần thêm thời gian cài dependencies. Ứng dụng chỉ được xem là chạy được sau khi bạn quan sát startup và health thực tế. Registry/network, MinIO image và tài nguyên máy vẫn là điều kiện cần. Không có lệnh xóa volume hay restore DB trong bộ công cụ.

## 3. Nạp fixture vào DB demo

```powershell
python demo-seed/council-v1/seed.py check
$env:COUNCIL_SEED_ALLOWED='true'
python demo-seed/council-v1/seed.py apply
python demo-seed/council-v1/seed.py verify
```

`seed.py` tự đọc `local/council-demo-v1/private.env`; biến môi trường bạn đã đặt có ưu tiên cao hơn. `check` chỉ đọc schema/ownership/drift; `apply` mới ghi. Importer chỉ chấp nhận DB có đúng tên **adapt_learn_graph_council_demo** trên 127.0.0.1; không chấp nhận DB chính `adapt_learn_graph` hay remote DB. Không đổi tên DB để dùng importer này cho production.

Nạp question bank tái sử dụng `JpaQuestionBankStore`, giữ nguyên protected item/mapping contract của backend. Module có cả PG document/content và graph projection/TEACHES. Account/member/profile/learner-state dùng repository hiện có. Seed publication có provenance development, không chế tạo reviewedBy của người thật hay kết quả học của learner.

Chạy lại không reset history/password/progress hoặc ghi đè document/catalog bị thay đổi; receipt gắn exact fixture hash. PostgreSQL và Neo4j không có distributed transaction: nếu lỗi giữa hai store, có thể có dữ liệu từng phần. Lệnh trả lỗi; hãy kiểm tra rồi chạy lại cùng exact release để hoàn tất, không coi log partial là thành công, không xóa DB để né drift.

`verify` xác minh cấu trúc được seed, membership và exact published item mapping. Nó không phải full-pathway acceptance, không bảo đảm entitlement/subscription còn hiệu lực và không tự sửa readiness/policy. Những việc này được kiểm tra qua bước cấu hình/diễn tiếp theo.

## 4. Cấu hình sẵn Skill Assessment

Sau `apply`, bật API và chạy:

```powershell
python demo-seed/council-v1/seed.py configure
```

Lệnh đăng nhập **Expert thật của môi trường demo**, dùng CSRF/session bình thường, khám phá exact scope key từ API rồi tạo/save/activate ba policy A/I, B/I, P/I. Không dùng SQL để chèn activation, không bypass Role assignment. Nếu có draft hoặc active policy khác recipe, lệnh dừng và giữ nguyên để bạn xem, không ghi đè.

Mặc định **để baseline chưa cấu hình** cho bạn demo L&D thao tác thật. Trong L&D `/ld-manager/baseline-assessments`, chọn Role demo/Middle, INTERMEDIATE: **3 câu/nhóm, cần đúng 2; 10 phút, maxAttempts 3, retake wait 0**, rồi hoàn tất/kích hoạt. Tổng baseline 12 câu.

Nếu chỉ muốn thử luồng Employee ngay, có thể cấu hình luôn baseline bằng:

```powershell
python demo-seed/council-v1/seed.py configure --include-baseline
```

Các recipe cụ thể nằm trong `fixture.json` mục `policies`: Skill Assessment 3 câu/nhóm, cần đúng 2, 5 phút, maxAttempts3, wait0. A/B/P MAIN mandatoryCount1; PREREQUISITE P trong B quota0, **allWrongVeto=false** để giữ MAIN pass khi bổ sung P. Muốn diễn veto thì dùng lượt/learner dự phòng với policy đã cấu hình trước khi mở attempt; không đổi một đề đang làm.

## 5. Phiếu diễn và kết quả cần kiểm tra

| Bước | Thao tác | Kỳ vọng |
| --- | --- | --- |
| Baseline | Employee sạch chọn Role demo/Middle; `1 → Enter` ×12, xác nhận Submit | A/B/C0/3, P3/3; bốn gap A/B/C/D |
| Request | Gửi yêu cầu; thử chọn Role/Level khác khi pending | Bị khóa từ request, không mất target/history |
| Expert alternatives | A1/A2: exclude cả hai → Check; thử bypass A | Invalid, không approve; không bypass vì catalog còn provision |
| Repair/review | Include A1; exclude A2; sắp A/B/C/D; bypass C có reason; Check và approve exact revision | C được bypass vì thiếu provider thật; A/B/D còn bắt buộc |
| A | Học A1 tới cuối + confirm completion; assessment `2 → Enter` ×3 | A có official evidence sau assessment |
| B | Học B1; assessment `2 → Enter` ×6 | MAIN B3/3, prerequisite P0/3; thêm P và dependency, giữ MAIN pass |
| P | Học P1; assessment `1 → Enter` ×3 | P official; outcome/recalculation giải dependency B |
| D | Nộp bằng chứng link HTTPS (mẫu demo do bạn chọn) hoặc PDF/image; Expert mở/approve có lý do | Pending chưa đạt; approval tạo evidence và cập nhật pathway |
| Kết thúc | Chờ worker/refresh; chọn Next Target Demo | 4 fulfilled + C bypass, hết công việc chặn; cho đổi target; giữ lịch sử và carry C song song |

Các câu trả lời phải được server xác nhận trước khi chuyển câu. Câu cuối vẫn có bước xác nhận nộp. Thứ tự câu/UUID/timestamps có thể khác, nhưng pattern số đúng không đổi vì mọi item trong cùng nhóm dùng cùng vị trí key. Không sửa scoring hay để seed ép kết quả theo account.

Kết thúc chính: **5 bước**, A/B/P/D có evidence, C bypass → official coverage/progression theo FULFILLED **80%**, nhưng target được release theo rule bypass. Không trình bày bypass như đã đạt Skill. Đổi learner tập cho lượt tiếp theo; không dùng tài khoản đã có evidence rồi đòi baseline vẫn y như lần đầu. Giữ council-11 chưa dùng cho ngày diễn.

## 6. RIASEC tùy chọn trên cùng môi trường

Job Position demo đã có đủ sáu raw interest scores R20/I36/A26/S16/E18/C30. Mặc định inference tắt để phần baseline/pathway không phụ thuộc tải model. Nếu muốn thử RIASEC, dùng service profile riêng:

```powershell
docker compose --env-file local/council-demo-v1/private.env -f demo-seed/council-v1/compose.yaml --profile riasec up -d riasec-ollama
docker compose --env-file local/council-demo-v1/private.env -f demo-seed/council-v1/compose.yaml exec riasec-ollama ollama pull qwen3:4b-instruct-2507-q4_K_M
$env:COUNCIL_RIASEC_ENABLED='true'
docker compose --env-file local/council-demo-v1/private.env -f demo-seed/council-v1/compose.yaml up -d --no-deps api
```

Ollama/model ở volume demo riêng, không public port. Cần đủ RAM/CPU và đo latency tại máy chạy. Dùng `/employee/overview?tab=riasec`; quy trình 54/60 câu và bảng điểm ở [plan](../../DEMO-SEED-PLAN.md#8-riasec-demo-ngắn-trên-luồng-hiện-tại). Raw scores cố định được; không bảo đảm AI text/rank/latency giống 10/10. Nhánh này chưa chạy thực tế ở môi trường demo mới.

## 7. Giới hạn đã biết và bước đưa vào bộ chính

- Chưa quan sát DB bootstrap/import/replay/restart, login/entitlement, API policy activation, learning/certificate/outcome hay browser end-to-end của bộ này. Docker hiện không kết nối được; người test cần đi hết checklist trên và ghi nhận lỗi thực tế.
- Không giả lập payOS/SMTP giao dịch thật. Compose dùng workspace development bootstrap có subscription fixture hiện hữu của source. Học bằng TEXT không cần video internet; certificate bằng file vẫn cần MinIO hoạt động.
- Dùng `stop`/`up` với đúng file Compose để giữ dữ liệu. Không dùng `down -v`. Không nối Compose này vào cấu hình mặc định trong bước thử.
- Sau khi bạn test và duyệt kịch bản, mới bàn chuyển manifests/runner phù hợp vào seed chính, xử lý release/hash/compatibility của catalog chính. Việc tạo thư mục này không tự phê duyệt migration/cutover đó.

Kiểm tra offline lại:

```powershell
python -m unittest discover -s demo-seed/council-v1 -p test_seed.py -v
python demo-seed/council-v1/seed.py score
docker compose --env-file local/council-demo-v1/private.env -f demo-seed/council-v1/compose.yaml config --quiet
```

Muốn chỉnh nội dung trước khi dùng DB, sửa `build_fixture.py`, chạy lại nó để tạo JSON/hash, rồi validate/score. Một khi đã nạp và có lịch sử, không sửa ngầm release v1; tạo version mới hoặc xử lý migration được review.
