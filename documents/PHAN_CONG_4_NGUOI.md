# Phân công feature/function cho 4 người

## Phân công hiện hành - 2026-10-14

Nguồn phạm vi: [System Overview](adapt_learn_graph_system_overview.md), [Product Overview](PRODUCT_OVERVIEW.md) và [danh mục feature](features/README.md). Đây là đề xuất phân công kỹ thuật cho 4 người, không phải 4 actor của sản phẩm, không xác nhận công việc đã hoàn thành hoặc ước lượng đã được duyệt.

| Người | Sở hữu chính | REQ hiện hành / hỗ trợ |
| --- | --- | --- |
| 1 | Danh tính, bảo mật, hồ sơ cá nhân, cấu hình kỹ thuật và audit | 022, 037, 038, 039, 040, 056, 057, 058 |
| 2 | Discipline, Expert assignment, role/configuration/publication; skill/prerequisite, module/course/question và L&D approval | 011, 012, 013, 014, 015, 016, 017, 018, 023, 024, 050, 051, 052, 053, 054 |
| 3 | Baseline/RIASEC, role guidance và Expert review, assessment/evidence, knowledge tracing, gap/recommendation/recalculation, L&D monitoring | 001, 002, 008, 009, 025, 026, 041, 042, 043, 046, 047, 048, 049, 059 |
| 4 | Trải nghiệm pathway/explanations/competency graph/content, Expert initial review/confirmation và individual skill learning | 004, 005, 006, 007, 010, 019, 020, 055 |

Mỗi REQ có một owner chính; giao diện và API được phối hợp qua contract, không nhân đôi thuật toán hoặc quyền truy cập. REQ-038/039 và metrics REQ-026 vẫn cần chốt policy; phân công không biến chúng thành quyết định đã xác nhận.

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