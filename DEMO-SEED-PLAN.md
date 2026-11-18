# Đề xuất seed và kịch bản demo hội đồng kín

**Cập nhật triển khai bộ thử riêng:** đã tạo [demo-seed/council-v1](demo-seed/council-v1/README.md) gồm dữ liệu thật, CLI nạp riêng và Compose/DB/cổng riêng. Chưa đưa vào seed mặc định, chưa nạp DB hay chạy end-to-end vì Docker chưa hoạt động. Các chi tiết đã hiện thực và lệnh thử nằm ở README của bộ seed; phần dưới giữ cơ sở phân tích ban đầu.

Ngày rà soát: **18/11/2026**. Source gốc: **`49e39607`**. Trạng thái seed/pathway: **đề xuất để triển khai**, chưa thay seed hay DB. Phần bàn phím baseline/Skill Assessment đã cập nhật sau đó theo yêu cầu; xem bằng chứng ở mục 11.

## 1. Phương án nên chọn

Giữ catalog hiện tại để trình bày quy mô; **thêm một Role demo riêng và các Skill demo riêng** để điều khiển chính xác kết quả. Không dùng nguyên Application Developer/Middle cho phần diễn trực tiếp vì quá nhiều nhóm kiến thức. Không sửa đáp án của các câu đã publish hay biến seed thành kết quả học tập có sẵn.

Kịch bản chính: **L&D cấu hình → Employee chọn Role/Level → baseline 12 câu → 4 gap → yêu cầu pathway → Expert include/exclude/kiểm tra lỗi/bypass/approve → học A và pass → học B, MAIN pass nhưng phát hiện prerequisite P → học P và pass → nộp certificate D → Expert approve certificate → pathway được kết thúc và chọn Role khác**.

Điểm cần phân biệt ngay:

- **4 gap ban đầu**, sau đánh giá B có **thêm 1 prerequisite**, thành **5 bước bắt buộc trong lịch sử pathway**. Đây là phần thích ứng đáng trình bày nhất.
- Kết thúc có bypass: **4 bước FULFILLED + 1 bước BYPASSED**. Được đổi mục tiêu khi hết công việc bắt buộc còn chặn; bypass không tạo official achievement.
- Nếu muốn đúng **4 Skill tổng cộng sau thích ứng và hoàn thành 100% bằng chứng**, dùng nhánh rút gọn ở mục 9: ba gap ban đầu A/B/D, thêm P; đưa bypass sang tài khoản phụ.
- RIASEC chỉ hướng dẫn sở thích/Job Position; không thay thế baseline, không chứng minh năng lực, không tự chọn Role/Level.

## 2. Đã dò được gì ở seed hiện tại?

Các số dưới đây được tính từ JSON đang có trong repository, **không phải truy vấn DB đang chạy**.

| Hạng mục | Kết quả |
| --- | --- |
| Job Position / Role / member Level | 5 / 48 / 144 |
| Competency / MicroSkill / LearningModule | 472 / 79 / 270 |
| Tổng node trong file catalog | 1.018 |
| Quan hệ catalog | 4.758; gồm 1.891 REQUIRES_SKILL, 270 TEACHES, 42 HAS_SKILL_PREREQUISITE |
| Câu thường theo knowledge level | 711 = 79 Skill × 3 knowledge level × 3 câu |
| Câu mandatory bổ sung | 4: FS04/INTERMEDIATE có 2; FS05/FOUNDATION có 1; FS06/INTERMEDIATE có 1 |
| Cặp Skill–knowledge có module trong file base | Đủ 237/237 cặp; không có sẵn cặp thiếu module để demo bypass thật |
| Module alternatives | 33 cặp có 2 module; các cặp còn lại có 1 |
| Certificate development bổ sung | FS12/INTERMEDIATE và FS08/ADVANCED, Skill version 0.12.1 |
| Learning content release | 270 document và 270 content trong development-complete-release.json |

Certificate được bộ seed module áp dụng **sau release module**, chuyển provision của đúng cặp sang CERTIFICATE_ONLY. Vì thế thấy module trong JSON base không có nghĩa module đó vẫn là lựa chọn hợp lệ của nhánh certificate ở runtime.

### Role có sẵn để so sánh

| Role | Skill mục tiêu | Yêu cầu Skill–knowledge | Nhóm baseline sau certificate fixture | Số câu nếu 3 câu/nhóm |
| --- | ---: | ---: | ---: | ---: |
| Application Developer / Junior | 11 | 11 | 11 | 33 |
| Application Developer / Middle | 14 | 21 | 20 | 60 |
| Application Developer / Senior | 14 | 28 | 26 | 78 |
| Software Engineer / Middle | 14 | 21 | 20 | 60 |

Đây là phép tính cho người học chưa có official evidence và certificate fixture đã được áp dụng đúng. Nếu thiếu fixture hoặc đã có bằng chứng tương thích, số nhóm runtime sẽ khác.

Application Developer: `ROLE-F72E5464F9B3`; Middle: `LV-F72E5464F9B3-M`. Junior không chạm hai cặp certificate hiện có; Senior có cả hai certificate nhưng quá nhiều nhóm.

### Các điểm thực tế ảnh hưởng demo

| Hành vi | Kết luận từ source hiện tại |
| --- | --- |
| Baseline theo Role–Level | Có; không còn lấy union toàn Job Position như DEV-DEMO.md cũ |
| Baseline và Skill Assessment | Dùng cùng cơ chế đề/chấm, policy riêng; baseline chỉ là diagnostic |
| Random câu | Có SecureRandom và shuffle; không được giả định câu/vị trí câu cố định |
| Đáp án hiện có | 711 câu thường có đáp án đúng rải ở vị trí 1/2/3/4: 177/179/177/178; spam một lựa chọn không bảo đảm mẫu gap mong muốn |
| Phím `1 → Enter` ở baseline/Skill Assessment | Đã bổ sung cho cả hai purpose; số chọn đáp án, Enter lưu rồi chuyển câu; câu cuối mở xác nhận |
| Phím `1–5 → Enter` ở RIASEC | Đã có trong RiasecAttemptPanel; phím 1 tương ứng điểm 0, phím 5 tương ứng điểm 4 |
| Include/exclude | Có; giữ requirement, chỉ thay alternatives; module đã bắt đầu không được exclude |
| Exclude hết | Có thể lưu draft không hợp lệ; không thể approve khi thiếu lựa chọn |
| Bypass | Chỉ khi catalog hiện tại thật sự không có module phù hợp và không có certificate phù hợp |
| Prerequisite | Assessment kiểm tra closure đã cấu hình; pathway chỉ thêm dependency sau thất bại thực tế, không thêm giả từ baseline |
| Certificate | Nộp pending chưa đạt; Expert đúng assignment approve mới tạo evidence |
| Khóa Role/Level | Có ở server từ lúc nhận request, gồm chờ generate/review; release theo completion/bypass hợp lệ |
| Trạng thái chạy thực tế | Chưa xác minh; Docker Linux engine không kết nối được khi rà soát |

**Không dùng lịch sử test hay tài liệu cũ làm bằng chứng rằng toàn bộ kịch bản trên đã chạy thành công ở bản hiện tại.**

## 3. Việc phải xử lý trước khi thêm seed demo

### 3.1 Catalog source đang không khớp bộ hash chấp nhận

Compose mount `documents/dataset/import/ontology_seed-skill-level.json` vào `/seed/ontology_seed.json`.

- SHA-256 bytes hiện tại: `93e45cdeb2c945df30a3e4249be90565dc9c4727dbc0b93c0ce1baef84b007c4`.
- Nếu chuẩn hóa LF: `475dd1d66241f55e427fe98d6ff478afa593593bff8c10cde825e0852eb14d38`.
- Cả hai không nằm trong 12 hash constants của `LocalCatalogBootstrap` đã kiểm tra.
- Constructor kiểm tra hash trước khi bootstrap; `LocalDemoSeedConfiguration` gọi constructor trước khối catch xử lý graph drift. Do đó đường seed này sẽ ném `Latest catalog source drift` với file hiện tại, dù catch phía sau có bỏ qua một số lỗi graph drift.

Đây là **blocker xác định qua đối chiếu file và source**, chưa phải log của lần chạy mới. Cần rà diff release, phần interest profile và manifest liên quan, rồi đưa một release chính xác vào quy trình kiểm tra tương thích. Không sửa mỗi hash một cách mù quáng, không bỏ kiểm tra drift, không xóa volume để né lỗi. Đồng thời kiểm tra startup validator có chấp nhận các node/edge demo bổ sung sau restart hay không.

### 3.2 Chọn đúng bộ tài khoản/workspace

Source có cả các tài khoản lịch sử `*@workspace.dev.invalid` và bootstrap TechNova với `manager@technova.com`, `expert@technova.com`, `employee@technova.com`. Knowledge/module/certificate fixtures hiện dùng org **`e0000000-0000-0000-0000-000000000001`**. Không trộn actor/org của hai bộ chỉ vì email hoặc tên gần giống nhau.

Trước triển khai: xác minh org, active membership, entitlement/seat, Role assignment của Expert, member Level, không có active attempt/pathway cũ trên tài khoản diễn chính. Không in credential thật vào receipt. Chuẩn bị ba browser profile độc lập cho L&D/Expert/Employee.

## 4. Thiết kế fixture demo đề xuất

Thêm Role **Application Developer — Council Demo**, một member Level **Middle**, duration hợp lệ, trong Job Position Software Developers của workspace đã chọn. Các ID sau là **ID đề xuất, chưa tồn tại**.

Tạo các Skill demo riêng, mô phỏng nội dung Skill gốc nhưng có identity/version riêng; không ghi đè Skill/bank/provision dùng chung. Tất cả yêu cầu ở **INTERMEDIATE**, version ví dụ `demo-council-v1`. Cần kiểm tra giới hạn/định dạng version ở owner trước khi dùng ID này.

| Ký hiệu / Skill ID đề xuất | Năng lực minh họa | Tham chiếu seed gốc | Provision và học liệu | Baseline chọn toàn đáp án 1 |
| --- | --- | --- | --- | --- |
| A / MS-DEMO-01 | Unit testing | MS-FS07/INTERMEDIATE | MODULE_ONLY; 2 alternatives A1/A2 | Fail → gap A |
| B / MS-DEMO-02 | Database transactions | MS-FS14/INTERMEDIATE | MODULE_ONLY; 1 module B1; prerequisite P | Fail → gap B |
| C / MS-DEMO-03 | Refactoring | MS-FS15/INTERMEDIATE | MODULE_ONLY; **0 module, 0 certificate** | Fail → gap C; cho phép bypass thật |
| D / MS-DEMO-04 | Input validation | MS-FS12/INTERMEDIATE | CERTIFICATE_ONLY; 1 definition riêng | Không thi baseline; yêu cầu certificate |
| P / MS-DEMO-05 | SQL/query languages | MS-FS04/INTERMEDIATE | MODULE_ONLY; 1 module P1; không có prerequisite tiếp | Pass diagnostic; chưa có official evidence |

Role có **5 Skill mục tiêu, 5 yêu cầu kiến thức**, nhưng sau baseline chỉ có **4 gap A/B/C/D**. P được đưa vào Role để cho thấy rõ: pass baseline không có nghĩa đã đạt chính thức. Sau khi assessment B phát hiện P thiếu, P trở lại pathway dưới dạng bước bổ sung có nguồn gốc.

Chỉ tạo một cạnh prerequisite **B/INTERMEDIATE → P/INTERMEDIATE**; P không có cạnh tiếp, không clone nguyên closure gốc. Như vậy B assessment có đúng hai nhóm, tránh vô tình sinh chuỗi nhiều prerequisite.

Học liệu cần **4 module release thực**: A1, A2, B1, P1; mỗi module 1 bài TEXT ngắn có nội dung nghề nghiệp và ví dụ cụ thể. Reader vẫn cần reached-end và xác nhận hoàn thành. Duration hiển thị là ước lượng, không cấu hình chờ nhiều giờ mới cho hoàn thành. Không dùng video ngoài mạng trong phần chính. Module phải có PG document/content và Neo4j projection/TEACHES thống nhất, không chỉ thêm graph node.

Expert được assign Role demo; vì P thuộc Role nên cùng Expert có quyền cấu hình policy P theo scope Role-derived. Definition D phải thuộc đúng tenant/Skill/version/knowledge, có reference URL hợp lệ. Employee nộp bằng chứng demo được ghi nhãn rõ; seed không cấp credential hay achievement cho Employee.

Thêm một Role đích thứ hai, ví dụ **Application Developer — Next Target**, có một requirement A cùng Skill/version/knowledge để sau khi kết thúc demo có thể chọn và minh họa reuse official evidence. Chọn khác Role, không vướng quy tắc phải chọn Level cao hơn của cùng Role đang được Admin assign. Bypass C được carry theo nguồn cũ thành PARALLEL_SUPPLEMENT, không chặn công việc của mục tiêu mới.

## 5. Đáp án cố định và số câu chính xác

### Ngân hàng câu hỏi demo

Mỗi nhóm A/B/C/P có **3 câu thường**. Thêm **1 câu mandatory cho A, B, P**: tổng **12 câu thường + 3 mandatory = 15 câu**. D không cần bank vì certificate-only.

- Mọi câu thuộc A/B/C: đáp án đúng ở **lựa chọn thứ 2**.
- Mọi câu thuộc P: đáp án đúng ở **lựa chọn thứ 1**.
- Tất cả biến thể trong cùng exact Skill–knowledge–version giữ quy ước đó, gồm cả mandatory.
- Nội dung câu vẫn có ý nghĩa; đây là bộ câu biểu diễn, không tuyên bố là bank đánh giá sản xuất.

Đây là cách dùng **chấm thật nhưng dữ liệu có kiểm soát**: random chọn câu và shuffle thứ tự câu không làm đổi số đúng. Không cần sửa SecureRandom, thêm API lộ answer key hay hardcode kết quả theo account. Thứ tự options hiện lấy từ bank; khi triển khai phải kiểm tra importer và UI giữ đúng thứ tự này. Nếu sau này có shuffle options, quy ước vị trí phải được thiết kế lại.

### Policy cần cấu hình

| Scope | Nhóm | Câu/nhóm | Cần đúng | Mandatory quota | All-wrong veto | Thao tác và kết quả |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Baseline Role demo/Middle, L&D | A/B/C/P | 3 | 2 | Không áp điều kiện mandatory | false | Chọn 1 tất cả: A/B/C = 0/3; P = 3/3 |
| Skill Assessment A/I, Expert | MAIN A | 3 | 2 | 1 | false | Chọn 2 tất cả: A = 3/3, đạt cả mandatory |
| Skill Assessment B/I, Expert | MAIN B | 3 | 2 | 1 | false | Chọn 2 tất cả: B = 3/3 |
| Cùng policy B/I | PREREQUISITE P | 3 | 2 | 0 | **false** | Cùng chọn 2: P = 0/3 → WAITING_SUPPLEMENT, không bắt full retake |
| Skill Assessment P/I, Expert | MAIN P | 3 | 2 | 1 | false | Chọn 1 tất cả: P = 3/3 → evidence P → giải quyết dependency B |

Baseline editor áp tham số chung theo knowledge level; bảng này dùng thống nhất **3 câu, cần đúng 2**, không yêu cầu threshold tùy tiện theo từng Skill. Baseline có thể bốc câu được gắn mandatory trong pool nhưng không bắt buộc đúng mandatory; vì toàn bộ câu của cùng nhóm có cùng vị trí đáp án đúng, kết quả vẫn cố định.

Thông số đề xuất: baseline 10 phút; Skill Assessment 5 phút/bài; retake wait 0 cho demo; maxAttempts 3. Mỗi bài vẫn do server quản deadline, lưu câu trả lời và submit có xác nhận. Chính sách này phục vụ buổi diễn, không suy ra là ngưỡng đào tạo chính thức.

**Tổng phần chính:** baseline 12 + A 3 + B 6 + P 3 = **24 câu**, 3 lần học module, 1 certificate submission, 1 lần Expert duyệt certificate. Module A2 chỉ cần trình bày alternative, không bắt học thêm.

### Phiếu thao tác người diễn

| Bài | Đáp án bấm lặp | Kết quả cần thấy |
| --- | --- | --- |
| Baseline | `1 → Enter` × 12 | 4 gap A/B/C/D; P pass diagnostic |
| A assessment | `2 → Enter` × 3 | A đạt chính thức |
| B assessment | `2 → Enter` × 6 | MAIN pass, P fail; sinh bước/dependency P |
| P assessment | `1 → Enter` × 3 | P đạt chính thức; B được xử lý tiếp với MAIN pass đã giữ |

**Phím tắt bảng trên đã bổ sung cho baseline/Skill Assessment** và kiểm tra bằng component tests/Chrome. Click lựa chọn rồi Next vẫn dùng được. Enter ở câu cuối không tự nộp bài; vẫn mở và xác nhận Submit. Seed và các kết quả kỳ vọng trong bảng vẫn là đề xuất, chưa áp vào DB.

Yêu cầu UI nếu bổ sung: số 1–4 chọn option đang hiển thị; Enter lưu câu đang chọn, chờ server xác nhận rồi mới qua câu; chống double-submit/giữ phím; lỗi mạng giữ nguyên câu; không nuốt phím trong input/dialog; không nhảy qua câu cuối hoặc tự confirm. Dùng lại changeQuestion/run/command lifecycle hiện có, shared UI và design tokens của dự án.

### “10 lần như 10” nghĩa là gì?

Kết quả **nghiệp vụ** giống nhau trên 10 learner sạch cùng fixture/policy/catalog. UUID, timestamp, revision và thứ tự câu không bắt buộc giống nhau. Không liên tục chọn lại Role hoặc tạo attempt mới trên một tài khoản đã có evidence rồi đòi đầu vào vẫn như cũ.

Chuẩn bị 10 tài khoản rehearsal tách biệt, ví dụ `council-01@demo.invalid` … `council-10@demo.invalid`, cùng membership/entitlement/placement hợp lệ và không có history. Thêm 1 tài khoản sạch dành riêng ngày bảo vệ, chưa dùng tập. Mật khẩu thiết lập qua cấu hình local, không ghi vào receipt. Cùng Role/policy được dùng chung; L&D chỉ cần cấu hình một lần cho cả nhóm.

Mỗi lần seed lại phải **idempotent**: giữ history và accepted decisions, không reset điểm, progress, receipt hay active attempt. Nếu dùng snapshot để tập thì chỉ phục hồi một môi trường demo tách biệt theo thao tác đã duyệt, không tự xóa DB hiện tại. Dễ nhất vẫn là đổi learner rehearsal.

## 6. Kịch bản trình bày chính, khoảng 18–22 phút

| Chặng | Diễn trực tiếp | Điều hội đồng cần thấy |
| --- | --- | --- |
| 1. L&D, 2 phút | Mở Role demo/Middle; xem 5 requirement; cấu hình baseline 3 câu/nhóm, cần đúng 2; Save/Preview/Activate | Quản trị cấu hình có validation, không phải form CRUD đơn thuần |
| 2. Employee, 2 phút | Chọn đúng Role/Level; làm baseline 12 câu theo đáp án 1; mở kết quả và gap | Diagnostic P pass; A/B/C fail; D đi bằng certificate; 4 gap có lý do |
| 3. Employee, 30 giây | Gửi yêu cầu tạo pathway; thử đổi Role khi đang generate/chờ review | Request bền vững, khóa cả Role và Level từ lúc nhận yêu cầu |
| 4. Expert, 3 phút | Xem căn cứ, alternatives A1/A2; exclude A2; exclude luôn A1; Check; Include A1 phục hồi; chốt chỉ A1 | Exclude hết không xóa Skill; draft invalid, không approve và không được bypass vì catalog còn học liệu |
| 5. Expert, 1 phút | Sắp thứ tự A → B → C → D trước khi bước bị cố định; bypass C với lý do cụ thể; Validate/Approve revision hiện hành | C thật sự không có module/certificate; có audit reason, BYPASSED nhưng không achievement; timing bắt đầu từ approval |
| 6. Employee, 2 phút | Mở A1; học TEXT tới cuối; xác nhận completion; assessment 3 câu chọn 2 | Content completion và Skill achievement là hai mốc khác nhau; chỉ sau assessment mới có official evidence A |
| 7. Employee, 2 phút | Học B1; làm 6 câu chọn 2; xem MAIN B pass/P fail; quay lại pathway | Thực sự sinh P trước B trên graph; giữ MAIN pass; A không bị mất progress |
| 8. Employee, 2 phút | Học P1; assessment 3 câu chọn 1; chờ outcome/recalculation; refresh nếu cần | P evidence giải dependency; B đạt khi các điều kiện đủ; không thi lại B ở nhánh thường này |
| 9. Employee/Expert, 2 phút | Nộp link HTTPS bằng chứng D; hiện pending; Expert mở đúng submission, approve có lý do | Upload/nộp không tự đạt; đúng Expert review mới tạo certificate evidence |
| 10. Employee, 1 phút | Chờ event/refresh; xem kết thúc và lịch sử; chọn Next Target | 4 fulfilled + 1 bypass; hết khóa; history còn; A evidence có thể reuse; C còn nghĩa vụ bổ sung |
| 11. RIASEC, 1–2 phút | Luồng ngắn ở mục 8, dùng draft/result đã chuẩn bị thật | 6 điểm sở thích, AI Job Position, giải thích, Explore; không tự chọn mục tiêu |

RIASEC có thể cho chạy AI ngay sau chặng baseline trong **tab Employee riêng** rồi tiếp tục phần Expert/learning; cuối buổi quay lại xem kết quả để giấu thời gian chờ bằng công việc thật. Không để RIASEC làm đổi learning target đang khóa. Nếu muốn L&D luôn mở màn, không đưa RIASEC lên trước chặng 1.

Các mốc chuyển chặng dựa vào state server, không dùng sleep cố định. Dùng browser profile riêng để giữ ba phiên; không giả đổi quyền bằng URL/localStorage. Giữ tiếng Việt hoặc tiếng Anh nhất quán theo bản đã tập.

## 7. Exception và bypass phải diễn đúng

### Exclude hết khác với thiếu học liệu thật

**A:** catalog có A1/A2. Exclude cả hai → `NEEDS_EXPERT_ACTION`; Check cho blocking issues như `PROVISION_REQUIRES_EXPERT_ACTION`/`MODULE_OPTIONS_CHANGED`; approve bị từ chối. Yêu cầu bypass A cũng phải bị từ chối (`REQUIREMENT_BYPASS_NOT_ALLOWED`). Include lại ít nhất A1 → Check valid. Nên dùng Check/preview trước để lỗi này xuất hiện có chủ đích và sửa ngay trong 30–45 giây.

**C:** catalog trả được exact Skill/version/provision nhưng không có option hoặc certificate hợp lệ → bypass được, lưu reason/actor/assignment/revision. Catalog lỗi hoặc không truy xuất được không phải bằng chứng thiếu provision và không được biến thành bypass.

Sau bypass C, khi A/B/D còn chưa xong, Employee **vẫn không đổi Role/Level được**. Sau khi A/B/P/D đã đạt, chỉ C bypass còn lại thì được đổi mục tiêu theo rule hiện tại. Không hứa “chỉ mở khi 100% Skill achieved”: rule đó khác implementation/confirmed policy đang có.

### Các nhánh ngắn nên có sẵn, không kéo dài phần chính

| Nhánh | Chuẩn bị và kỳ vọng |
| --- | --- |
| Sai revision/hash khi Expert approve | Dùng bản chi tiết cũ ở tab phụ; bị conflict, reload rồi duyệt bản mới; không approve sai draft |
| Certificate reject → resubmit | Tài khoản phụ; reject có lý do, retained history, nộp bản thay thế; chỉ approval mới đạt |
| MAIN fail | A assessment chọn 1 → fail; chưa achievement; retake theo policy; không phải chỉ xem 100% pass |
| Mandatory fail | Một đề A chọn đúng câu thường nhưng sai mandatory → fail dù đủ tổng 2/3; cần theo item hiển thị, không dùng spam toàn bài |
| All-wrong veto | Ở rehearsal nhánh riêng, policy B có veto P=true trước khi mở attempt; B MAIN pass/P0 → full retake; không dùng policy này cho nhánh thích ứng chính |
| Bypass có học liệu về sau | Sau khi đã chọn Next Target, release C1 đúng scope; refresh/outcome đưa C vào phần bổ sung song song, không chặn target mới |
| Logout/refresh/resume | Một lần refresh giữa bài/đang học cho thấy saved attempt/progress; quay lại đúng learner |
| Sai Expert/tenant | Một lần truy cập của Expert không assign bị deny; không cần biểu diễn cả ma trận quyền trên sân khấu |

Không vừa sửa policy đang dùng rồi kỳ vọng frozen attempt đổi kết quả. Mỗi nhánh phải có learner/attempt/policy snapshot xác định. Các nhánh ngoại lệ dài nên nằm trong bộ dự phòng để trả lời câu hỏi, không đều phải diễn ở phần chính.

## 8. RIASEC: demo ngắn trên luồng hiện tại

Theo lựa chọn của người dùng: **chuẩn bị kịch bản thao tác**, không chỉnh code để rút ngắn RIASEC.

Route hiện tại: **`/employee/overview?tab=riasec`**. `/employee/riasec` redirect về đây. Explore từ recommendation đi **`/employee/upskilling?tab=roles&jobPositionId=...`**; Employee vẫn tự chọn Role/Level theo khóa mục tiêu hiện có.

### Mẫu câu trả lời có điểm tính được trước

Dùng đúng 60 câu hiện có, không cắt thành 6 câu và không dùng chart prototype. Mẫu sau cho raw scores trùng profile Software Developers trong seed: **R20 / I36 / A26 / S16 / E18 / C30**.

| Câu theo ID instrument | Phím chọn, rồi Enter từng câu | Điểm cộng |
| --- | --- | ---: |
| R01–R10 | 3 | 10 × 2 = 20 |
| I01–I06; I07–I10 | 5; 4 | 6 × 4 + 4 × 3 = 36 |
| A01–A06; A07–A10 | 4; 3 | 6 × 3 + 4 × 2 = 26 |
| S01–S06; S07–S10 | 3; 2 | 6 × 2 + 4 × 1 = 16 |
| E01–E08; E09–E10 | 3; 2 | 8 × 2 + 2 × 1 = 18 |
| C01–C10 | 4 | 10 × 3 = 30 |

Phím 1/2/3/4/5 cho điểm 0/1/2/3/4. Có sáu dimension, mỗi dimension 10 câu; cộng đúng 60 câu. Ở câu cuối mở Review và xác nhận nộp. Không spam toàn phím 1 vì sẽ ra 6 điểm 0, không có câu chuyện sở thích rõ để giải thích.

### Cách diễn trong 60–90 giây

1. Trước buổi: đăng nhập tài khoản diễn, làm và autosave thật **54/60 câu**, dừng trước C05, chưa submit. Chuẩn bị thêm một **result đã submit thành công thật** trên tài khoản dự phòng.
2. Trên sân khấu: mở Resume, chỉ ra draft lưu theo account, làm 6 câu C05–C10 bằng phím 4 → Enter; Review đủ 60 rồi submit.
3. Chỉ điểm **scores xuất hiện độc lập** khi AI còn QUEUED/PROCESSING. Nếu cần chờ AI, tiếp tục phần pathway, quay lại cuối buổi.
4. Mở recommendation thực tế: tối đa 3 Job Position, hai dimension so sánh và explanation đã lưu. Explain text hiện tạo bằng tiếng Anh dù UI EN/VI.
5. Explore một suggestion thật nếu phù hợp; nếu AI không gợi ý Software Developers, vào Role catalog chọn thủ công khi đã hết target lock. **Không hứa AI chắc chắn xếp Software Developers hạng 1 dù điểm trùng profile**: AI chọn/rank, không có công thức cosine/fallback cố định.
6. Nếu AI chưa xong trong thời lượng: thể hiện queued state, mở result lịch sử thành công đã chuẩn bị và nói rõ đó là lần chạy trước. Không trình bày result lịch sử như response của submit vừa làm.

Chỉ **raw scores** được bảo đảm lặp lại theo mẫu này; câu chữ, thứ hạng và thời gian AI chưa có bảo đảm 10/10. Worker hiện poll 2 giây, queue deadline 20 phút, processing deadline 8 phút, HTTP timeout 7 phút; đây không phải latency mục tiêu của demo. Warm model bằng một lượt chạy thật trước buổi và đo thời gian trên chính máy trình chiếu. Đừng regenerate thành công mỗi lần đổi tab: success là snapshot đã lưu, retry chỉ dành cho current FAILED.

Preflight riêng: `RIASEC_ENABLED=true`, migration V72 qua đúng Flyway history, Ollama/model đã có sẵn, network private hoạt động, Job Position có đủ sáu integer 0–40 và đúng org. Compose hiện đã bật RIASEC; không cần thêm inference service khác. Không chạy full reseed chỉ để bật RIASEC trên DB đã có.

## 9. Nếu muốn kết thúc 100% và chỉ có 4 Skill tổng

Phương án phụ: **A/B/D là ba gap ban đầu**, P pass diagnostic rồi được thêm sau assessment B. Loại C khỏi Role demo chính; giữ A/B/P/D = bốn Skill mục tiêu, cuối cùng cả bốn có evidence. Baseline lúc này A/B/P = **9 câu**, tổng assessment = **21 câu**. Dùng tài khoản/pathway phụ riêng để diễn bypass thật và release sau bypass.

Ưu điểm: cái kết 100% achievement/progression dễ giải thích. Đổi lại bypass tách khỏi câu chuyện chính. Nếu ưu tiên cho thấy nhiều điểm nổi bật bằng một Employee xuyên suốt, chọn phương án chính; phải nói rõ 80% FULFILLED và 20% bypass không phải lỗi completion.

Với phương án chính, sau baseline P pass nhưng chưa official: readiness chính thức vẫn 0/5. Cuối buổi A/B/P/D official và C bypass: target readiness/mastery 4/5 = **80%**, pathway progression theo FULFILLED 4/5 = **80%** dù đã release target. Baseline-pass chỉ giảm nhu cầu học ban đầu, không cộng vào official coverage. Đây là tỷ lệ coverage, không phải điểm proficiency.

## 10. Phạm vi triển khai đề xuất và tiêu chí nghiệm thu

Đây là thiết kế để review; các tên file mới bên dưới là dự kiến, **chưa tạo runner/manifests hay áp vào hệ thống**.

| Phần việc | Thay đổi nhỏ nhất cần làm |
| --- | --- |
| Chuẩn hóa release hiện tại | Đối chiếu catalog/hash/manifest và validator startup; sửa đường release chính xác, giữ kiểm tra drift; rà các giới hạn catalog/query sau khi thêm requirement |
| Fixture council riêng | Một release additive có namespace/version/receipt và opt-in local; 2 Role, 2 member Level, 5 Skill, 1 prerequisite edge, 4 module/content release, 1 certificate definition, 15 item versions + mappings |
| Actors | Reuse L&D/Expert đúng org; thêm 10 learner rehearsal + 1 learner diễn sạch, assign/entitle hợp lệ; xác minh seat capacity |
| Policy | L&D diễn cấu hình baseline; Expert chuẩn bị trước 3 scope A/B/P và validate capacity; không seed responses/approved pathway/achievement |
| Bàn phím assessment | Đã bổ sung handler ở BaselineAttemptPanel, giữ lifecycle server; RIASEC dùng handler hiện có |
| Demo setup | Checklist/preflight chỉ đọc báo exact counts, hash, assignment, policy readiness, module/text/private assets, worker, RIASEC; không “sửa hộ” DB trong preflight |

Ví dụ tổ chức sau khi duyệt: `backend/src/main/resources/db/seed/council-demo-v1/` chứa catalog, modules, bank, certificate, accounts manifests; runner trong `backend/.../config/` reuse repositories/authoring/import owner; launcher local riêng và tài liệu thao tác ở thư mục gốc. Chọn tên cụ thể sau khi kiểm tra extension points, không tạo cơ chế publish song song hay insert thẳng learner outcomes.

Thứ tự thực hiện: **(1)** xử lý tương thích release/hash; **(2)** fixture additive và quyền/owner; **(3)** policy/keyboard; **(4)** diễn end-to-end; **(5)** rehearsal và freeze release. Không sửa production profile hay thêm migration chỉ vì fixture nếu schema hiện tại đã chứa đủ dữ liệu.

Tiêu chí trước khi gọi là sẵn sàng demo:

- [ ] Existing startup/restart và seed rerun không drift, không mất dữ liệu, không nhân đôi release.
- [ ] 10 learner sạch: baseline12 → 4 gap; A pass; B MAIN pass/P fail; thêm đúng 1 P và 1 dependency; P pass làm B đạt; D pending→approved; kết thúc còn đúng C bypass.
- [ ] Chạy thực tế cả API và Playwright trên UI chính, kiểm tra keyboard khi busy/lỗi mạng/câu cuối; không chỉ mô phỏng score.
- [ ] A exclude hết: invalid + không approve/bypass; Include sửa được; started module không exclude được.
- [ ] C bypass chỉ khi catalog đọc thành công và không có suitable provision; actual Expert/reason/history retained; không achievement C.
- [ ] Khóa đổi cả Role/Level khi pending review, đang học, đang chờ P/certificate; mở sau khi chỉ còn bypass và không active attempt; direct API cũng tuân thủ.
- [ ] MAIN pass được giữ ở nhánh thường; bật veto ở nhánh riêng thì full retake đúng; không vô tình dùng veto cho demo chính.
- [ ] Completion và lựa chọn target mới không xóa lịch sử; bypass C carry song song, A official evidence tương thích được reuse.
- [ ] Certificate pending không hoàn tất; reject/resubmit/approve đúng scope; outcome worker cập nhật pathway; file download được reauthorize nếu demo PDF/image.
- [ ] KPI final 80% với bypass hoặc 100% ở phương án phụ khớp dữ liệu thật; actual completion/timing event có thể kiểm tra.
- [ ] RIASEC 54 câu draft → 60 câu → scores20/36/26/16/18/30; result/snapshot/history/Explore thực; đo latency và có result dự phòng nói rõ nguồn.
- [ ] Không thay bank/policy/release sau buổi tập chốt; lưu commit, manifest hash, learner diễn, role/level IDs và kết quả preflight trong receipt không có secret.

**Ưu tiên thời lượng:** diễn rule/configuration, diagnostic khác evidence, Expert coverage validation, thích ứng prerequisite, certificate approval và target lock/unlock. CRUD catalog/department/module chỉ lướt 30–60 giây để làm nền. Notifications, first-approval deadline và history là ba điểm cộng ngắn nếu thời gian cho phép. Không nên thêm nhiều case fail vào một lần diễn chính khiến mạch học bị đứt.

## 11. Bằng chứng nguồn và giới hạn lần rà soát

Cập nhật bàn phím sau phân tích: [10 component tests và 5 Chrome journeys đạt](documents/testing/system/assessment-keyboard-20261118.md). Đã build frontend và kiểm tra trạng thái assessment liên quan. Seed/pathway và các kết quả kỳ vọng vẫn chưa áp vào DB; giới hạn lần rà soát seed bên dưới giữ nguyên phạm vi.

Các nguồn chính đã đọc:

- [Catalog đang mount](documents/dataset/import/ontology_seed-skill-level.json), [module release](documents/dataset/module-knowledge/development-complete-release.json), [knowledge bank](backend/src/main/resources/db/seed/knowledge-question-bank.json), [mandatory release](backend/src/main/resources/db/seed/app-dev-mandatory-questions-v1.json), [certificate definitions](backend/src/main/resources/db/seed/application-developer-certificates.json).
- [Flow hiện tại](documents/technical/Organization%20Rule%20Assessment%20and%20Pathway.md), [Role guidance](documents/features/Role%20guidance/README.md), [product overview](documents/PRODUCT_OVERVIEW.md).
- [RuleAssessment](backend/src/main/java/com/adaptlearngraph/entities/domain/RuleAssessment.java), [attempt service](backend/src/main/java/com/adaptlearngraph/services/RuleAssessmentAttemptService.java), [context/prerequisite closure](backend/src/main/java/com/adaptlearngraph/repository/CurrentRoleKnowledgeCatalog.java), [baseline uniform rules](backend/src/main/java/com/adaptlearngraph/services/BaselinePolicyEditor.java).
- [Expert review/bypass](backend/src/main/java/com/adaptlearngraph/services/RequirementPathwayReviewService.java), [validation](backend/src/main/java/com/adaptlearngraph/services/RequirementPathwayValidationService.java), [recalculation](backend/src/main/java/com/adaptlearngraph/services/RequirementPathwayRecalculationService.java), [certificate approval](backend/src/main/java/com/adaptlearngraph/services/CertificateReviewService.java).
- [Target write lock](backend/src/main/java/com/adaptlearngraph/repository/CurrentRoleSelectionStore.java), [bound query](backend/src/main/java/com/adaptlearngraph/repository/EmployeeRoleSelectionJpaRepository.java), [completion event](backend/src/main/java/com/adaptlearngraph/repository/RequirementPathwayRevisions.java).
- [Baseline UI](frontend/src/features/employee/baseline-assessment/BaselineAttemptPanel.tsx), [RIASEC keyboard](frontend/src/features/employee/riasec/RiasecAttemptPanel.tsx), [instrument](frontend/src/features/employee/riasec/riasecInstrument.ts), [runtime RIASEC](docker/riasec/README.md).
- [Compose](compose.dev.yml), [catalog hash guard](backend/src/main/java/com/adaptlearngraph/config/LocalCatalogBootstrap.java), [TechNova account bootstrap](backend/src/main/java/com/adaptlearngraph/config/DevelopmentWorkspaceAccountBootstrap.java).

Đã dùng Python đọc JSON để đếm cấu trúc/quan hệ, liệt kê requirements/modules/answer positions, đối chiếu SHA-256 và tính bảng điểm dự kiến/RIASEC. Phép tính điểm cho fixture đề xuất không phải thực thi Java scorer hay test integration. `docker compose ps -a --format json` không kết nối được Docker Desktop Linux engine; không start service, chạy migration, reseed, restore hay thay DB. Chưa chạy backend/frontend/Playwright test cho đề xuất. File này là kết quả phân tích và kịch bản chuẩn bị, không phải báo cáo hoàn thành triển khai.
