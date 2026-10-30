# Phân công feature/function cho 4 người

> **Superseded allocation snapshot, 2026-10-21:** The assignments and function paths below describe older scope. Version 2 section 3.2(g) contains the confirmed S1-S4 technical ownership; use that [source](FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md) and the [current contracts](features/README.md). Repaired links do not reapprove these older allocations or estimates.

## Phân công hiện hành - 2026-10-14

Nguồn phạm vi lịch sử: System Overview (đã được thay thế); [Product Overview](PRODUCT_OVERVIEW.md) và [danh mục feature](features/README.md) hiện trỏ tới Version 2. Phân công bên dưới là đề xuất cũ cho 4 người, không xác nhận công việc đã hoàn thành hoặc ước lượng đã được duyệt.

| Người | Sở hữu chính | REQ hiện hành / hỗ trợ |
| --- | --- | --- |
| 1 | Danh tính, bảo mật, hồ sơ cá nhân, cấu hình kỹ thuật và audit | 022, 037, 038, 039, 040, 056, 057, 058 |
| 2 | Discipline, Expert assignment, role/configuration/publication; skill/prerequisite, module/course/question và L&D approval | 011, 012, 013, 014, 015, 016, 017, 018, 023, 024, 050, 051, 052, 053, 054 |
| 3 | Baseline/RIASEC, role guidance và Expert review, assessment/evidence, knowledge tracing, gap/recommendation/recalculation, L&D monitoring | 001, 002, 008, 009, 025, 026, 041, 042, 043, 046, 047, 048, 049, 059 |
| 4 | Trải nghiệm pathway/explanations/competency graph/content, Expert initial review/confirmation và individual skill learning | 004, 005, 006, 007, 010, 019, 020, 055 |

Mỗi REQ có một owner chính; giao diện và API được phối hợp qua contract, không nhân đôi thuật toán hoặc quyền truy cập. REQ-038/039 và metrics REQ-026 vẫn cần chốt policy; phân công không biến chúng thành quyết định đã xác nhận.

### Quy ước thực hiện

- Owner chịu trách nhiệm toàn bộ lát cắt của REQ: làm rõ function, contract, backend/domain/persistence, frontend, kiểm thử và tài liệu. Có thể nhờ người khác hỗ trợ nhưng không chuyển trách nhiệm hoặc tạo thêm owner ngầm.
- Actor là người sử dụng chức năng, không phải người lập trình. Một người có thể triển khai chức năng cho nhiều actor; không chia frontend/backend theo bốn actor.
- Trong bảng, `F01` của dòng `REQ-022` nghĩa là `REQ-022-F01`. ID và đường dẫn cũ được giữ để truy vết; tên `Delete` không mặc định cho phép xóa vật lý, tên `Dummy` không giới hạn nội dung hiện hành.
- Function mới REQ-047 đến REQ-059 nằm trong README của feature. Các ID là bản nháp phạm vi; chỉ triển khai sau khi thống nhất quyết định còn mở trong tài liệu nguồn.
- Dùng [Architecture](ARCHITECTURE.md) và [Neo4j schema](neo4j_schema.md) làm nguồn field/store. Phân công này không thêm schema, endpoint, enum, công thức hoặc ước lượng ngày-công.

### Người 1 - Danh tính, bảo mật và quản trị hệ thống

**Mục tiêu:** cung cấp nền tảng xác thực/phân quyền và các chức năng quản trị kỹ thuật; không sở hữu nội dung đánh giá hoặc thuật toán học tập.

| REQ / tài liệu | Actor / performer | Function phụ trách | Phạm vi và kết quả bàn giao |
| --- | --- | --- | --- |
| REQ-022 [Account management](features/Workspace%20administration/README.md#req-022) | System Administrator | F01 Create Account; F02 View Accounts; F03 Update Account; F04 Delete Account; F05 Assign Account Role | Tạo/xem/cập nhật tài khoản, trạng thái kích hoạt/ngừng kích hoạt, gán hoặc gỡ quyền theo policy đã duyệt. Không suy diễn Delete thành xóa lịch sử học tập. |
| REQ-037 [Access control](features/Workspace%20administration/README.md#req-037) | Hệ thống | F01 Authenticate User; F02 Enforce Permissions and Organization Isolation | Contract danh tính và quyền cho bốn actor; mặc định từ chối truy cập không hợp lệ. Giữ kiểm tra scope kỹ thuật hiện có nhưng không xây onboarding đa tổ chức. |
| REQ-038 [First-time password](features/README.md#removed-scope) | Employee; hệ thống | F01 Complete First-Time Password Setup | Luồng thiết lập mật khẩu lần đầu khi policy được chốt; kiểm tra trạng thái tài khoản và việc sử dụng lại yêu cầu. Chưa tự chọn cơ chế token/thời hạn. |
| REQ-039 [Email notifications](features/Notifications%20and%20audit/README.md#req-039) | Hệ thống | F01 Send Email Notification | Giao diện gửi thông báo cho các sự kiện được duyệt; các owner khác phát sự kiện, không tự viết mail service. Không có thông báo thanh toán. |
| REQ-040 [Sensitive data protection](features/Workspace%20administration/README.md#req-040) | Hệ thống | F01 Hash Passwords and Verification Secrets; F02 Protect Recoverable Sensitive Data | Bảo vệ mật khẩu, bí mật xác minh và dữ liệu nhạy cảm theo loại dữ liệu; không lộ secret trong API, log hoặc audit. |
| REQ-056 [Personal profile](features/Employee%20experience/README.md#req-056) | Employee | F01 View Personal Profile; F02 Update Personal Profile | Xem/cập nhật hồ sơ cá nhân và công việc của chính mình; field cho phép sửa phải được duyệt, không cho Employee tự đổi actor/quyền. |
| REQ-057 [System configuration](features/Workspace%20administration/README.md#req-057) | System Administrator | F01 View System Configuration; F02 Update System Configuration | Đọc/cập nhật cấu hình kỹ thuật dùng chung. Không đưa baseline scoring hoặc module assessment rules vào quyền quản trị kỹ thuật. |
| REQ-058 [System activity monitoring](features/Workspace%20administration/README.md#req-058) | System Administrator | F01 View Audit Records; F02 View Operational Activity | Truy vấn audit/hoạt động vận hành trong quyền được duyệt; che dữ liệu nhạy cảm. Các owner nghiệp vụ cung cấp sự kiện, Người 1 cung cấp khả năng ghi/đọc dùng chung. |

**Bàn giao chính:** contract danh tính, ma trận quyền và cách kiểm tra assignment cùng Người 2; cơ chế audit/thông báo dùng chung; luồng quản trị tài khoản, hồ sơ và cấu hình với kiểm thử truy cập sai actor/sai đối tượng.

### Người 2 - Danh mục, nội dung và quy trình L&D

**Mục tiêu:** quản lý vòng đời dữ liệu tri thức từ authoring của Expert đến publication/approval của L&D; cung cấp dữ liệu đọc có phiên bản cho đánh giá và pathway.

| REQ / tài liệu | Actor / performer | Function phụ trách | Phạm vi và kết quả bàn giao |
| --- | --- | --- | --- |
| REQ-011 [Assigned target roles](features/Role%20catalog/README.md#req-011) | Expert | F01 View Assigned Target Roles | Danh sách role được L&D giao và quyền truy cập cấu hình của Expert. Dùng chung contract đọc với REQ-023-F05, không tạo hai nguồn assignment. |
| REQ-012 [Micro-skill management](features/Learning%20catalog/README.md#req-012) | Expert | F01 Create Micro-Skill; F02 View Micro-Skills; F03 Update Micro-Skill; F04 Delete Micro-Skill | Quản lý skill trong discipline được giao, mô tả/proficiency theo schema duyệt; chốt deactivate và xử lý tham chiếu trước thao tác Delete. |
| REQ-013 [Learning module management](features/Learning%20catalog/README.md#req-013) | Expert | F01 Create Learning Module; F02 View Learning Modules; F03 Update Learning Module; F04 Delete Learning Module | Tạo/sửa/tổ chức module và chuẩn bị submission; bảo toàn nội dung/phiên bản đã dùng trong học tập. Trạng thái authoring không đồng nghĩa approved. |
| REQ-014 [Question management](features/Assessment%20workflows/README.md#req-014) | Expert | F01 Create Question; F02 View Questions; F03 Update Question; F04 Delete Question | Ngân hàng câu hỏi, nội dung/đáp án và phân loại difficulty theo contract. Cung cấp dữ liệu cho Người 3, không tự tính mastery hoặc quyết định pathway. |
| REQ-015 [Role requirements](features/Role%20catalog/README.md#req-015) | Expert | F01 Link Micro-Skill to Target Role; F02 Unlink Micro-Skill from Target Role; F03 Set Required Proficiency | Requirements cho role được giao, bao gồm competency/skill/proficiency và relative importance theo mô hình được duyệt. Phần importance cần làm rõ contract hiện có; L&D không sửa requirements. |
| REQ-016 [Module outcomes](features/Learning%20catalog/README.md#req-016) | Expert | F01 Define Module Outcome Skills; F02 Update Module Outcome Skills | Mapping module -> skill outcomes trong discipline được giao; snapshot/mapping hợp lệ để recommendation và tracing sử dụng. |
| REQ-017 [Question mapping](features/Assessment%20workflows/README.md#req-017) | Expert | F01 Link Question to Micro-Skill; F02 Unlink Question from Micro-Skill | Mapping question -> skill và phân loại liên quan; bảo toàn mapping dùng bởi assessment evidence. Difficulty phối hợp với REQ-014. |
| REQ-018 [Target-role graph editing](features/Learning%20catalog/README.md#req-018) | Expert | F01 View Target-Role Graph; F02 Edit Prerequisite Relationships | Đọc graph và thêm/sửa/gỡ prerequisite trong phạm vi được giao; kiểm tra tính hợp lệ graph theo policy. Không tự publish role hoặc sinh pathway. |
| REQ-023 [Target role management](features/Role%20catalog/README.md#req-023) | L&D Manager; Expert được giao | F01 Create Target Role; F02 View Organization Target Roles; F03 Update Target Role; F04 Delete Target Role; F05 Expert Assigned Target Roles | L&D quản lý thông tin/vòng đời role; Expert thấy role được giao và trạng thái cấu hình. F05 tái sử dụng REQ-011; không gộp tạo role với publication, không cho L&D sửa Expert requirements. |
| REQ-024 [Expert assignment](features/Role%20catalog/README.md#req-024) | L&D Manager | F01 Assign Target Role to Expert; F02 Reassign Target Role Expert | Giao/chuyển Expert phụ trách role, kiểm tra eligibility và lịch sử theo policy. Đây là role assignment, khác REQ-051. |
| REQ-050 [Discipline management](features/Departments%20and%20occupations/README.md#req-050) | L&D Manager | F01 Create Discipline; F02 View Disciplines; F03 Update Discipline; F04 Deactivate Discipline | Danh mục discipline và vòng đời; không tự đổi `JobDomain` thành Discipline. Quy tắc tham chiếu nội dung phải được thống nhất. |
| REQ-051 [Discipline Expert assignment](features/Departments%20and%20occupations/README.md#req-051) | L&D Manager | F01 View Discipline Expert Assignments; F02 Assign Expert to Discipline; F03 Remove Expert from Discipline | Phạm vi authoring theo discipline, thêm/gỡ Expert và lịch sử assignment; cung cấp kiểm tra quyền nội dung cho Người 1 và Người 3-4. |
| REQ-052 [Target role publication](features/Role%20catalog/README.md#req-052) | L&D Manager; Expert nộp cấu hình hoàn tất | F01 Review Target Role Configuration Status; F02 Publish Target Role; F03 Unpublish Target Role | Tách Expert completion khỏi quyết định L&D publish/unpublish. Bàn giao role khả dụng cho guidance/selection; tác động đến lựa chọn/pathway hiện hữu cần policy riêng. |
| REQ-053 [Learning offering approval](features/Learning%20catalog/README.md#req-053) | Expert; L&D Manager | F01 Submit Learning Offering for Approval; F02 Review Submitted Learning Offering; F03 Approve Learning Offering; F04 Return Learning Offering for Revision | Submission và L&D approval/return cho module/course/assessment; lưu quyết định/feedback và version theo thiết kế duyệt. Expert không tự approve nội dung mình soạn. |
| REQ-054 [Courses and learning content](features/Learning%20catalog/README.md#req-054) | Expert | F01 Add Course or Content; F02 View Courses and Content; F03 Update Course or Content; F04 Organize Module Content; F05 Remove Course or Content | Tổ chức course/content trong module và chuẩn bị phiên bản để duyệt. Bàn giao bản đọc approved cho Người 4; không coi `sourceUrl` hiện có là toàn bộ mô hình course. |

**Bàn giao chính:** contract assignment và đọc catalog; requirements/prerequisites/outcomes/question mappings có version; trạng thái role publication và offering approval. Người 2 sở hữu ngân hàng câu hỏi; cấu hình/chấm module assessment thuộc lát cắt Người 3 và actor Expert.

### Người 3 - Đánh giá, AI guidance và engine học tập

**Mục tiêu:** chuyển assessment evidence thành competency estimates, gaps và pathway đề xuất; cung cấp kết quả giải thích được cho Người 4 và dữ liệu monitoring cho L&D.

| REQ / tài liệu | Actor / performer | Function phụ trách | Phạm vi và kết quả bàn giao |
| --- | --- | --- | --- |
| REQ-001 [Target role selection](features/Role%20catalog/README.md#req-001) | Employee | F01 View Target Roles; F02 Choose Target Role | Xem/chọn hoặc xác nhận role theo publication và Expert-reviewed guidance; kiểm tra điều kiện ở backend, không chỉ ẩn nút trên UI. |
| REQ-002 [Baseline knowledge assessment](features/Assessment%20workflows/README.md#req-002) | Employee; L&D Manager cấu hình | F01 Complete Baseline Assessment; F02 Configure Baseline Assessment | L&D định nghĩa competency coverage/question selection/scoring; Employee hoàn thành và tạo evidence. Chốt phạm vi baseline trước chọn role, không kế thừa per-role policy cũ mặc định. |
| REQ-008 [Module assessment](features/Assessment%20workflows/README.md#req-008) | Employee; Expert cấu hình | F01 Complete Module Assessment | Luồng làm/chấm assessment và ghi evidence; phối hợp cấu hình rules của Expert với question bank Người 2 và approval REQ-053. Phần cấu hình cần chi tiết hóa contract, không tự gán ID mới; dùng lại cho independent learning. |
| REQ-009 [Assessment results](features/Employee%20experience/README.md#req-009) | Employee | F01 View Assessment Result; F02 View Assessment History | Kết quả/lịch sử baseline, RIASEC và module assessment theo quyền; phân biệt interest evidence với knowledge mastery. |
| REQ-025 [Employee progress](features/Development%20reporting/README.md#req-025) | L&D Manager | F01 View Employee Progress | Monitoring profiles/gaps/results/progress; dùng contract pathway/progress của Người 4, không viết lại logic completion hoặc recommendation. |
| REQ-026 [Learning statistics](features/Development%20reporting/README.md#req-026) | L&D Manager | F01 View Organizational Learning Statistics | Chỉ số phát triển của một tổ chức từ evidence/progress đã xác nhận. Định nghĩa metric và quyền xem còn mở; không triển khai thống kê platform/payment. |
| REQ-041 [Competency profiling and gap analysis](features/Adaptive%20engine/README.md#req-041) | Hệ thống | F01 Update Competency Profile; F02 Calculate Target-Role Gaps | Profile từ evidence và gaps so với requirements có version; tracing được gọi qua REQ-059, không tạo hai thuật toán mastery. |
| REQ-042 [Initial pathway generation](features/Adaptive%20engine/README.md#req-042) | Hệ thống | F01 Generate Initial Adaptive Pathway | Sinh đề xuất module/thứ tự/lý do từ gaps và graph; bàn giao để Expert review. Đề xuất chưa phải pathway được phép bắt đầu học. |
| REQ-043 [Pathway recalculation](features/Adaptive%20engine/README.md#req-043) | Hệ thống | F01 Evaluate Recalculation Need; F02 Recalculate Adaptive Pathway | Đánh giá nhu cầu mới từ assessment evidence và cập nhật phần pathway còn lại; không cố định failure-only hoặc tính lại mọi kết quả. Chốt cách giữ Expert overrides với Người 4. |
| REQ-046 [Consistent learning state](features/Adaptive%20engine/README.md#req-046) | Hệ thống | F01 Synchronize Learning State; F02 Recover Incomplete Learning Updates | Nhất quán evidence/profile/progress/pathway; xử lý lặp lại, lỗi giữa các bước và khôi phục theo contract duyệt, không tự giả định transaction xuyên hai store. |
| REQ-047 [RIASEC assessment](features/Assessment%20workflows/README.md#req-047) | Employee | F01 Complete RIASEC Assessment | Thu thập/chấm interest assessment theo bộ câu hỏi và scoring đã duyệt; không chuyển dữ liệu soft-skill cũ thành RIASEC hoặc mastery. |
| REQ-048 [Target role guidance](features/Role%20guidance/README.md#req-048) | Hệ thống; Employee | F01 Generate Target Role Guidance; F02 View Reviewed Target Role Guidance | AI dùng baseline/RIASEC để đề xuất role/comments; Employee chỉ xem kết quả đã qua review theo policy. Model/prompt/output/error handling phải được chốt. |
| REQ-049 [AI role guidance review](features/README.md#removed-scope) | Expert | F01 Review AI Target Role Guidance | Expert confirm/revise/reject guidance trong phạm vi review được giao; lưu kết quả review gắn đúng phiên bản evidence/guidance. Không dùng thao tác này để thay role Employee đã chọn. |
| REQ-059 [Knowledge tracing](features/Adaptive%20engine/README.md#req-059) | Hệ thống | F01 Update Estimated Skill Mastery | Một contract cập nhật mastery từ knowledge assessment evidence cho baseline/module/independent learning; model, tham số, replay/versioning còn phải duyệt. RIASEC không trực tiếp cập nhật mastery. |

**Bàn giao chính:** assessment evidence/results, reviewed guidance, estimates/gaps, pathway đề xuất/revisions/lý do và monitoring. Người 3 sở hữu engine; Người 4 gọi kết quả/command qua contract, không tính gap hoặc chọn module lần thứ hai.

### Người 4 - Trải nghiệm học tập và Expert pathway review

**Mục tiêu:** triển khai luồng đọc/học/duyệt pathway và independent skill learning từ dữ liệu catalog/engine; giữ nguyên ranh giới giữa thao tác học và thuật toán đề xuất.

| REQ / tài liệu | Actor / performer | Function phụ trách | Phạm vi và kết quả bàn giao |
| --- | --- | --- | --- |
| REQ-004 [Adaptive pathway](features/Employee%20experience/README.md#req-004) | Employee | F01 View Adaptive Pathway | Đọc pathway, module/thứ tự/trạng thái/progress; enforce gate Expert confirmation trước bắt đầu. Đọc dữ liệu engine Người 3, không tự tạo pathway. |
| REQ-005 [Recommendation explanation](features/Employee%20experience/README.md#req-005) | Employee | F01 View Recommendation Explanation | Hiển thị lý do do engine cung cấp và version tương ứng; không tự tạo câu giải thích thiếu căn cứ từ dữ liệu mock. |
| REQ-006 [Competency graph](features/Employee%20experience/README.md#req-006) | Employee | F01 View Competency Graph | Hiển thị competency estimates/gaps và quan hệ skill theo quyền; lấy profile từ Người 3 và graph từ Người 2, không cho Employee sửa graph. |
| REQ-007 [Learning modules and courses](features/Employee%20experience/README.md#req-007) | Employee | F01 View Learning Module | Truy cập module/course/content approved và theo dõi hoạt động qua contract duyệt; bỏ giới hạn dummy-only. Dùng chung bản đọc nội dung với independent learning. |
| REQ-010 [Recalculation visibility](features/Employee%20experience/README.md#req-010) | Employee | F01 View Pathway Revision | Hiển thị phiên bản, thay đổi và nguyên nhân từ engine; phân biệt pending/reviewed/confirmed theo mô hình được duyệt, không tự quyết định khi nào tính lại. |
| REQ-019 [Initial pathway review](features/Pathway%20review/README.md#req-019) | Expert | F01 Review Initial Adaptive Pathway | Review đề xuất đầu tiên và confirm trước Employee bắt đầu; kiểm tra quyền reviewer và đúng version. Chính sách review lại sau thay đổi còn mở. |
| REQ-020 [Pathway adjustment](features/Pathway%20review/README.md#req-020) | Expert | F01 Include Pathway Module; F02 Exclude Pathway Module | Ghi include/exclude trong review với lý do/giới hạn theo contract; gửi override cho Người 3 kiểm tra tính hợp lệ và đồng bộ, không tự sửa engine. |
| REQ-055 [Individual skill learning](features/Employee%20experience/README.md#req-055) | Employee; hệ thống | F01 Browse Available Micro-Skills; F02 Choose Individual Skill; F03 Access Mapped Learning Content; F04 Complete Independent Learning and Assessment | Chọn skill, truy cập module/course approved và ghi independent progress. Assessment đi qua REQ-008/009/059 của Người 3; không tạo engine thứ hai, không đổi role/pathway hiện hữu. |

**Bàn giao chính:** contract đọc pathway/progress/content và các command review/confirm/include/exclude; trải nghiệm Employee/Expert; independent learning context và sự kiện học tập. Phối hợp Người 3 xác định nơi lưu state/version để không có hai bản pathway mâu thuẫn.

### Kế hoạch tích hợp theo đầu ra

Đây là thứ tự phụ thuộc để chia việc, không phải cam kết ngày hoặc sprint mới. Các phần có thể làm song song khi contract và field được duyệt; không dùng frontend mock làm dữ liệu nghiệm thu.

| Mốc | Owner chính / phối hợp | Đầu ra kiểm chứng được trước khi tích hợp |
| --- | --- | --- |
| 1. Danh tính và scope | Người 1; Người 2 xác nhận assignment | Bốn actor, access contract, tài khoản thử và ma trận cho phép/từ chối; không tự map quyền từ actor code lịch sử. |
| 2. Catalog và nội dung khả dụng | Người 2; Người 1 kiểm tra quyền | Discipline/role assignments, requirements/mappings có version; role published và offerings approved phân biệt với draft/completed. |
| 3. Assessment và reviewed guidance | Người 3; Người 2 cung cấp questions/roles | Baseline do L&D cấu hình, module assessment do Expert cấu hình, RIASEC kết quả, guidance review và Employee role selection đi qua đúng gate. |
| 4. Pathway đầu tiên | Người 3 sinh đề xuất; Người 4 triển khai review/học | Gaps và đề xuất có lý do; Expert include/exclude/confirm; backend từ chối học trước confirmation. |
| 5. Học và thích nghi | Người 4 ghi hoạt động; Người 3 xử lý evidence/engine | Kết quả assessment cập nhật estimate/progress; reevaluation/revision có nguyên nhân; xử lý retry/lỗi không ghi trùng evidence hoặc mất overrides. |
| 6. Independent learning và monitoring | Người 4; Người 3; Người 2 cung cấp mappings | Học skill độc lập với nội dung approved; evidence được dùng lại đúng tracing contract; role/pathway không bị thay bởi thao tác chọn skill; L&D đọc được development progress. |

### Kiểm thử và điều kiện bàn giao

Mỗi owner tuân thủ [hướng dẫn kiểm thử](testing/README.md), [unit](testing/unit/README.md), [integration](testing/integration/README.md) và [system](testing/system/README.md). Không lấy số test PASSED lịch sử làm bằng chứng hoàn thành scope mới.

| Người | Kiểm thử trọng tâm |
| --- | --- |
| 1 | Xác thực, tài khoản vô hiệu hóa, sai actor/sai đối tượng, tự sửa quyền qua profile, secret không xuất hiện trong response/log/audit; notification/password setup theo policy được duyệt. |
| 2 | Assignment boundaries, L&D không sửa Expert requirements, Expert không tự publish/approve, draft/unpublished/unapproved không bị dùng sai; đầy đủ field và lịch sử/version mappings đã duyệt. |
| 3 | Baseline/RIASEC/guidance gates, tách interest khỏi mastery, scoring/tracing/gap theo model duyệt, evidence retry/recovery, recalculation theo nhu cầu mới và preservation policy; monitoring đúng quyền. |
| 4 | Chặn học trước Expert confirmation cả API/UI, review đúng quyền/version, include/exclude hợp lệ, giải thích khớp revision, content approved; independent learning không đổi role/pathway và gửi evidence qua contract chung. |

**Checklist bàn giao của từng REQ:**

1. Function specification và quyết định còn mở được thống nhất; actor/quyền, input/outcome và acceptance scenario rõ ràng.
2. Contract field/store/version/lỗi được owner liên quan duyệt theo architecture/schema; không thêm field chỉ vì mock UI đang có.
3. Domain/API/persistence/frontend sử dụng đầy đủ field đã duyệt; dữ liệu khởi tạo thuộc store phù hợp, không có frontend mock liên quan.
4. Unit/API/ArchUnit và các mức Integration/Testcontainers, System/Compose phù hợp được chạy; ghi kết quả thực tế vào evidence riêng theo REQ, không tạo nhãn PASSED khi chưa chạy.
5. Manual checklist có URL, tài khoản/quyền, dữ liệu prerequisite, bước thao tác và kết quả mong đợi. Với kiểm tra tài liệu này: mở Markdown Preview, đối chiếu 45 REQ với catalog, kiểm tra function/owner và các link; không cần chạy ứng dụng.
6. Cập nhật feature, evidence/manual procedure và architecture/schema nếu có thay đổi thiết kế được duyệt; contract bàn giao được owner phía nhận xác nhận.

### Quyết định cần chốt trước triển khai

| Nội dung | Người điều phối | Bên phối hợp / nơi ghi quyết định |
| --- | --- | --- |
| Actor-code mapping, account lifecycle, profile fields, password/email policy, cấu hình/audit được phép | Người 1 | Người 2-4; các feature REQ-022/037/038/039/040/056/057/058 và architecture khi cần. |
| Discipline identity/membership và assignment history; eligibility khi giao role | Người 2 | Người 1 kiểm tra quyền; REQ-024/050/051, architecture và Neo4j schema. |
| Completion/publication, course storage/version, approval và tác động khi withdraw nội dung/role đã dùng | Người 2 | Người 3-4 kiểm tra evidence/pathway/progress; REQ-013/023/052/053/054. |
| Baseline scope/scoring trước chọn role; module assessment rules; RIASEC scoring và AI guidance/review | Người 3 | Người 2 cung cấp catalog/questions; REQ-001/002/008/047/048/049. |
| Tracing model, replay, gap/recalculation thresholds, recovery và metrics | Người 3 | Người 2 mappings; Người 4 progress/overrides; REQ-026/041/043/046/059. |
| Initial review/confirmation, override preservation, review lại và independent progress/context | Người 4 | Người 3 engine/state; Người 2 approved content; REQ-004/019/020/055. |

Người điều phối tổng hợp quyết định kỹ thuật và cập nhật tài liệu, không thay actor có quyền phê duyệt nghiệp vụ. Chưa chốt các mục này thì chưa khóa contract hoặc ước lượng workload; số REQ/function không thể hiện độ khó tương đương giữa bốn người.

### Hợp đồng bàn giao hiện hành

1. Người 1 cung cấp danh tính/quyền của System Administrator, L&D Manager, Expert, Employee; phối hợp Người 2 kiểm tra discipline/role assignment và review access. Mã actor cũ không tự động được đổi quyền.
2. Người 2 cung cấp role đã được L&D publish, Expert requirements, prerequisite, approved module/course/assessment và mappings có version. Discipline assignment khác target-role assignment. L&D không chỉnh Expert requirements.
3. Người 3 sở hữu baseline configuration do L&D thao tác, baseline/RIASEC evidence, AI guidance/Expert review, role selection sau review, knowledge tracing và engine. Module assessment configuration do Expert thao tác; L&D duyệt offering.
4. Người 3 bàn giao pathway đề xuất và lý do cho Người 4; Người 4 cung cấp thao tác Expert review/include/exclude/confirm. Employee chỉ bắt đầu initial pathway sau confirmation. Independent skill learning không sửa target-role pathway; assessment evidence quay về owner tracing.
5. Người 2-4 thống nhất completion/publication/approval/review/evidence history trước tích hợp; mọi field runtime phải theo architecture/schema đã duyệt. Không lấy mock UI hoặc schema dataset preview làm migration tự động.

### Loại khỏi phân công hiện hành

REQ-003/021/044 được thay bởi 047/048/049. REQ-028 đến 032 và 045 là SaaS/billing ngoài phạm vi. REQ-033 đến 036 chỉ giữ nghiên cứu lịch sử, không phải product workspace cam kết. REQ-027 export chưa được xác nhận. Không tái sử dụng ID cũ cho capability mới.

Không giữ tổng 46 feature/84 function hoặc 200 ngày-công cũ như ước lượng hiện hành; cần ước lượng lại sau clarification. Thứ tự tích hợp: account/access -> discipline/assignment -> Expert role configuration -> L&D publication và learning approval -> baseline/RIASEC -> AI guidance/Expert review -> Employee role selection -> gap/pathway -> Expert confirmation -> learning/assessment/tracing/adaptation; individual skill learning là nhánh độc lập.

## Phân công lịch sử trước thay đổi phạm vi

<details>
<summary>Phân công SaaS cũ, chỉ giữ để truy vết</summary>

Các bảng, số lượng và hợp đồng bên dưới đã được thay thế bởi phân công hiện hành.

Nguồn: [Danh mục feature](features/README.md) và [Tổng quan sản phẩm](PRODUCT_OVERVIEW.md). Phân công theo **người sở hữu chính**; mỗi feature và function chỉ có một người chịu trách nhiệm triển khai và kiểm thử. Tên function giữ nguyên theo tên tài liệu trong `features/`. Đây là phân công công việc, không phải phân quyền của bốn vai trò người dùng trong sản phẩm.

| Người | Phạm vi sở hữu | Feature | Function |
| --- | --- | ---: | ---: |
| 1 | Danh tính, tổ chức, bảo mật và thanh toán | 11 | 21 |
| 2 | Danh mục vai trò và đồ thị tri thức | 10 | 28 |
| 3 | Đánh giá, knowledge tracing, gap analysis và recommendation engine | 15 | 21 |
| 4 | Giao diện lộ trình, duyệt lộ trình và benchmark | 10 | 14 |
| **Tổng** | | **46** | **84** |

## Người 1 - Nền tảng và thanh toán

Sở hữu xác thực, tenant/phân quyền, tài khoản, vòng đời subscription và tích hợp PayOS. Cung cấp `organizationId`, danh tính người dùng và quyền truy cập cho các nhóm còn lại; không sở hữu nội dung đánh giá hay đồ thị.

| REQ | Feature | Function phụ trách |
| --- | --- | --- |
| 022 | Account management | Create Account; View Accounts; Update Account; Delete Account; Assign Account Role |
| 028 | Subscription payment | View Subscription Offerings; Initiate Subscription Payment; View Payment and Subscription Status |
| 029 | Subscription cancellation | Cancel Subscription; View Cancellation Status |
| 030 | Payment statistics | View Platform Payment Statistics |
| 031 | Organization statistics | View Platform Organization Statistics |
| 032 | Subscription configuration | Configure Subscription Offerings |
| 037 | Access control | Authenticate User; Enforce Permissions and Organization Isolation |
| 038 | First-time password | Complete First-Time Password Setup |
| 039 | Email notifications | Send Email Notification |
| 040 | Sensitive data protection | Hash Passwords and Verification Secrets; Protect Recoverable Sensitive Data |
| 045 | Payment confirmation | Verify PayOS Payment; Apply Confirmed Subscription Payment |

## Người 2 - Vai trò và đồ thị tri thức

Sở hữu dữ liệu gốc về role, skill, module, question, các quan hệ và phạm vi role được giao cho expert. Cung cấp phiên bản/snapshot danh mục và các truy vấn theo `organizationId`/role để nhóm đánh giá và lộ trình sử dụng.

| REQ | Feature | Function phụ trách |
| --- | --- | --- |
| 011 | Assigned target roles | View Assigned Target Roles |
| 012 | Micro-skill management | Create Micro-Skill; View Micro-Skills; Update Micro-Skill; Delete Micro-Skill |
| 013 | Learning module management | Create Learning Module; View Learning Modules; Update Learning Module; Delete Learning Module |
| 014 | Question management | Create Question; View Questions; Update Question; Delete Question |
| 015 | Role requirements | Link Micro-Skill to Target Role; Unlink Micro-Skill from Target Role; Set Required Proficiency |
| 016 | Module outcomes | Define Module Outcome Skills; Update Module Outcome Skills |
| 017 | Question mapping | Link Question to Micro-Skill; Unlink Question from Micro-Skill |
| 018 | Target-role graph editing | View Target-Role Graph; Edit Prerequisite Relationships |
| 023 | Target role management | Create Target Role; View Organization Target Roles; Update Target Role; Delete Target Role |
| 024 | Expert assignment | Assign Target Role to Expert; Reassign Target Role Expert |

## Người 3 - Đánh giá và thuật toán học tập

Sở hữu lượt làm bài, kết quả, bằng chứng năng lực, báo cáo học tập theo tổ chức và toàn bộ chuỗi thuật toán: knowledge tracing (cập nhật ước lượng năng lực từ câu trả lời trong REQ-002/041), gap analysis (REQ-041), recommendation engine tạo lộ trình và quyết định tính lại (REQ-042/043). Sở hữu lý do đề xuất để người 4 hiển thị; dùng dữ liệu đồ thị của người 2 nhưng không sửa định nghĩa đồ thị. Cũng sở hữu cơ chế đồng bộ/phục hồi trạng thái học tập.

| REQ | Feature | Function phụ trách |
| --- | --- | --- |
| 001 | Target role selection | View Target Roles; Choose Target Role |
| 002 | Baseline knowledge assessment | Complete Baseline Assessment; Configure Baseline Assessment |
| 003 | Soft skill assessment | Complete Soft Skill Assessment |
| 006 | Competency graph | View Competency Graph |
| 008 | Module assessment | Complete Module Assessment |
| 009 | Assessment results | View Assessment Result; View Assessment History |
| 021 | AI soft-skill review | Review AI Soft-Skill Comments |
| 025 | Employee progress | View Employee Progress |
| 026 | Organizational statistics | View Organizational Learning Statistics |
| 027 | Report export | Export Organizational Report |
| 041 | Competency profiling and gap analysis | Update Competency Profile; Calculate Target-Role Gaps |
| 042 | Initial pathway generation | Generate Initial Adaptive Pathway |
| 043 | Conditional pathway recalculation | Evaluate Recalculation Need; Recalculate Adaptive Pathway |
| 044 | Soft-skill AI comments | Generate Soft-Skill AI Comments |
| 046 | Consistent learning state | Synchronize Learning State; Recover Incomplete Learning Updates |

## Người 4 - Trải nghiệm lộ trình và benchmark

Sở hữu giao diện lộ trình, phiên bản lộ trình, phần hiển thị lý do đề xuất và điều chỉnh của expert; sử dụng kết quả recommendation engine do người 3 cung cấp, không tự tính lại gap hay chọn module. Benchmark là một workspace riêng, sử dụng bộ dữ liệu synthetic và các thuật toán có phiên bản, không đọc/ghi hồ sơ nhân viên thật.

| REQ | Feature | Function phụ trách |
| --- | --- | --- |
| 004 | Adaptive pathway | View Adaptive Pathway |
| 005 | Recommendation explanation | View Recommendation Explanation |
| 007 | Dummy learning modules | View Learning Module |
| 010 | Recalculation visibility | View Pathway Revision |
| 019 | Initial pathway review | Review Initial Adaptive Pathway |
| 020 | Pathway adjustment | Include Pathway Module; Exclude Pathway Module |
| 033 | Benchmark dataset creation | Create RQ1 Dataset; Create RQ2 Dataset; Create RQ3 Dataset |
| 034 | Benchmark execution | Run Research Benchmark; View Benchmark Run Status |
| 035 | Benchmark results | View Benchmark Results |
| 036 | Benchmark comparison | Compare Benchmark Results |

## Hợp đồng bàn giao để giảm phụ thuộc

1. **Người 1 -> tất cả:** một contract chung cho danh tính, `organizationId`, actor/role và kiểm tra quyền. Người 2-4 gọi contract này thay vì tự triển khai phân quyền riêng. Email gửi qua một giao diện sự kiện; các nhóm khác chỉ phát sự kiện, không sở hữu logic gửi mail.
2. **Người 2 -> người 3:** ID ổn định và bản đọc có phiên bản cho role requirements, prerequisites, module outcomes, question-to-skill mappings. Người 3 sở hữu cấu hình và lượt baseline; người 2 sở hữu ngân hàng câu hỏi. Người 4 chỉ đọc thông tin danh mục cần thiết để hiển thị.
3. **Người 3 -> người 4:** một contract đọc kết quả recommendation gồm module được chọn, thứ tự, trạng thái, lý do đề xuất, phiên bản lộ trình và nguyên nhân tính lại (kèm employee, role, thời điểm). Người 3 xử lý assessment, knowledge tracing, gap và tính toán lộ trình; người 4 chỉ hiển thị, duyệt hoặc gửi yêu cầu điều chỉnh qua contract, không triển khai lại thuật toán. Người 3 xử lý đồng bộ trạng thái theo REQ-046.
4. **Người 4 -> người 3:** sự kiện/yêu cầu include hoặc exclude module của expert (REQ-020) và truy vấn tiến độ/revision của pathway để hiển thị trong REQ-025-027. Dữ liệu benchmark được tách khỏi dữ liệu vận hành; RQ1/RQ3 gọi cùng giao diện thuật toán của người 3 trên dữ liệu synthetic, không chia sẻ hồ sơ nhân viên.

Có thể làm song song sau khi thống nhất ID, schema/sự kiện và dữ liệu mẫu. Thứ tự tích hợp cần kiểm chứng: xác thực -> tạo role/skill/question/module -> chọn role và baseline -> gap -> lộ trình ban đầu -> module assessment -> đánh giá điều kiện tính lại. Sau luồng cốt lõi, tích hợp thanh toán, báo cáo và benchmark theo từng vertical slice.

**Lưu ý ước lượng:** số function không phản ánh độ khó. Người 3 gánh cả Bayesian baseline/knowledge tracing, gap analysis và thuật toán đề xuất/tính lại; người 4 gánh benchmark RQ1-RQ3 và quy trình duyệt lộ trình. Cần ước lượng độ phức tạp từng mảng, không cân tải chỉ theo số function. Các tài liệu hiện là bản nháp; những quy tắc còn để mở phải được thống nhất trước khi khóa contract và cam kết sprint.

</details>