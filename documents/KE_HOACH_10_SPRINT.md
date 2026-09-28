# Kế hoạch 10 sprint (4 người)

Nguồn phân công: [Phân công 4 người](PHAN_CONG_4_NGUOI.md); mục tiêu sản phẩm: [Product overview](PRODUCT_OVERVIEW.md). Bắt đầu **28/09/2026**, mỗi sprint là **thứ Hai - Chủ nhật**, 5 ngày làm việc/người (20 ngày-công/sprint). Sprint 10 kết thúc **06/12/2026**. Mỗi mục `tên (n)` là ước lượng **n ngày-công**, bao gồm lập trình, unit test và kiểm thử tích hợp cơ bản; không phải số ngày lịch. REQ-F là function, REQ là feature. Ưu tiên P0: graph editing, baseline -> gap -> initial pathway -> failed-question-driven recalculation; P1: bảo mật, duyệt, thanh toán và vận hành; P2: benchmark, thống kê, xuất báo cáo và CRUD bổ sung.

**Giới hạn:** 84 function chưa được chốt đặc tả (theo `features/README.md` tại thời điểm lập kế hoạch). Đây là ước lượng tham khảo, không phải cam kết giao hàng. Không thể làm cho các function thật sự độc lập: baseline cần question/skill/role; pathway cần gap và module; recalculation cần module assessment; PayOS confirmation cần giao dịch. Công việc cùng sprint được làm **theo thứ tự ghi trong ô**, với bàn giao sau từng mục; công việc giao diện/benchmark được phát triển với contract và dữ liệu synthetic, chỉ nghiệm thu tích hợp sau khi producer sẵn sàng. Nếu gate chưa đạt, chuyển function phụ thuộc sang sprint sau, không tính là hoàn thành bằng mock.

| Sprint | Ngày | Mốc giao hàng ưu tiên |
| --- | --- | --- |
| 1 | 28/09 - 04/10 | Xác thực, role/skill gốc, soft-skill evidence, dataset synthetic |
| 2 | 05/10 - 11/10 | Tenant/permission, expert assignment, question bank, khởi tạo đồng bộ |
| 3 | 12/10 - 18/10 | Requirement và question mapping, baseline configuration, pathway UI theo contract |
| 4 | 19/10 - 25/10 | Module/prerequisite, lựa chọn role, bắt đầu baseline, expert review theo mock |
| 5 | 26/10 - 01/11 | Module outcomes, baseline có kết quả, duyệt/override theo mock |
| 6 | 02/11 - 08/11 | Gap/profiling, chỉnh sửa graph và bank, billing offer, revision UI theo mock |
| 7 | 09/11 - 15/11 | Initial pathway end-to-end, khởi tạo PayOS, run benchmark RQ2 |
| 8 | 16/11 - 22/11 | Module assessment và điều kiện tính lại, PayOS callback, pathway UI tích hợp |
| 9 | 23/11 - 29/11 | Recalculation và employee progress, subscription active, benchmark RQ1/RQ3 |
| 10 | 30/11 - 06/12 | Báo cáo, cancellation/statistics, regression và demo toàn luồng |

## Người 1 - Danh tính và thanh toán

| Sprint | Function (ngày-công) | Tổng |
| --- | --- | ---: |
| 1 | REQ-040 Hash Passwords and Verification Secrets (2); REQ-037 Authenticate User (3) | 5 |
| 2 | REQ-037 Enforce Permissions and Organization Isolation (3); REQ-022 Create Account (2) | 5 |
| 3 | REQ-022 View Accounts (1); Update Account (1); Assign Account Role (1.5); REQ-038 Complete First-Time Password Setup (1.5) | 5 |
| 4 | REQ-022 Delete Account (1.5); REQ-040 Protect Recoverable Sensitive Data (2); REQ-039 Send Email Notification (1.5) | 5 |
| 5 | REQ-032 Configure Subscription Offerings (3); REQ-028 View Subscription Offerings (2) | 5 |
| 6 | REQ-028 Initiate Subscription Payment (4); REQ-031 View Platform Organization Statistics (1) | 5 |
| 7 | REQ-045 Verify PayOS Payment (3); PayOS sandbox/webhook contract tests (2) | 5 |
| 8 | REQ-045 Apply Confirmed Subscription Payment (3); REQ-028 View Payment and Subscription Status (2) | 5 |
| 9 | REQ-029 Cancel Subscription (2); View Cancellation Status (1); REQ-030 View Platform Payment Statistics (2) | 5 |
| 10 | Regression: tenant, password, payment idempotency, cancellation (5) | 5 |

## Người 2 - Role và đồ thị

| Sprint | Function (ngày-công) | Tổng |
| --- | --- | ---: |
| 1 | REQ-023 Create Target Role (2); View Organization Target Roles (1); REQ-012 Create Micro-Skill (2) | 5 |
| 2 | REQ-024 Assign Target Role to Expert (2); REQ-011 View Assigned Target Roles (1); REQ-014 Create Question (2) | 5 |
| 3 | REQ-015 Link Micro-Skill to Target Role (1.5); Set Required Proficiency (1); REQ-017 Link Question to Micro-Skill (1.5); REQ-012 View Micro-Skills (1) | 5 |
| 4 | REQ-018 Edit Prerequisite Relationships (2); REQ-013 Create Learning Module (2); REQ-014 View Questions (1) | 5 |
| 5 | REQ-016 Define Module Outcome Skills (2); REQ-018 View Target-Role Graph (1.5); REQ-013 View Learning Modules (1); snapshot/coverage contract tests (0.5) | 5 |
| 6 | REQ-012 Update Micro-Skill (1); REQ-014 Update Question (1); REQ-013 Update Learning Module (1); REQ-016 Update Module Outcome Skills (2) | 5 |
| 7 | REQ-015 Unlink Micro-Skill from Target Role (1); REQ-017 Unlink Question from Micro-Skill (1); REQ-024 Reassign Target Role Expert (1); REQ-023 Update Target Role (1); regression role-readiness (1) | 5 |
| 8 | Historical-reference/tenant regression for graph edits (3); baseline snapshot integration with Người 3 (2) | 5 |
| 9 | Delete/soft-archive policy and fixture migration (2); graph + module assessment integration (3) | 5 |
| 10 | REQ-014 Delete Question (1); REQ-013 Delete Learning Module (1); REQ-012 Delete Micro-Skill (1); REQ-023 Delete Target Role (2) | 5 |

## Người 3 - Đánh giá và recommendation

| Sprint | Function (ngày-công) | Tổng |
| --- | --- | ---: |
| 1 | REQ-001 View Target Roles (1.5); Choose Target Role (1.5); REQ-002 Configure Baseline Assessment (2/3) | 5 |
| 2 | REQ-002 Configure Baseline Assessment (1/3); Complete Baseline Assessment (4/5) | 5 |
| 3 | REQ-002 Complete Baseline Assessment (1/5); REQ-009 View Assessment Result (1); View Assessment History (2); REQ-046 Synchronize Learning State (1/2) | 5 |
| 4 | REQ-046 Synchronize Learning State (1/2); REQ-041 Update Competency Profile (2); Calculate Target-Role Gaps (2) | 5 |
| 5 | REQ-006 View Competency Graph (1); REQ-042 Generate Initial Adaptive Pathway (4/5) | 5 |
| 6 | REQ-042 Generate Initial Adaptive Pathway (1/5); REQ-008 Complete Module Assessment (3); REQ-043 Evaluate Recalculation Need (1/2) | 5 |
| 7 | REQ-043 Evaluate Recalculation Need (1/2); Recalculate Adaptive Pathway (3); REQ-046 Recover Incomplete Learning Updates (1/2) | 5 |
| 8 | REQ-046 Recover Incomplete Learning Updates (1/2); REQ-025 View Employee Progress (2); REQ-003 Complete Soft Skill Assessment (2/3) | 5 |
| 9 | REQ-003 Complete Soft Skill Assessment (1/3); REQ-044 Generate Soft-Skill AI Comments (2); REQ-021 Review AI Soft-Skill Comments (2) | 5 |
| 10 | REQ-026 View Organizational Learning Statistics (2); REQ-027 Export Organizational Report (2); cross-store failure regression (1) | 5 |

## Người 4 - Pathway UI và benchmark

| Sprint | Function (ngày-công) | Tổng |
| --- | --- | ---: |
| 1 | REQ-033 Create RQ2 Dataset (3); synthetic data/contract fixtures (2) | 5 |
| 2 | REQ-033 Create RQ1 Dataset (2); Create RQ3 Dataset (2); benchmark data isolation tests (1) | 5 |
| 3 | REQ-004 View Adaptive Pathway (3, contract/mock); REQ-005 View Recommendation Explanation (2, contract/mock) | 5 |
| 4 | REQ-007 View Learning Module (2, mock); REQ-019 Review Initial Adaptive Pathway (3, mock) | 5 |
| 5 | REQ-020 Include Pathway Module (2, mock); Exclude Pathway Module (2, mock); expert-event contract tests (1) | 5 |
| 6 | REQ-010 View Pathway Revision (2, mock); REQ-034 Run Research Benchmark (3, RQ2 synthetic driver) | 5 |
| 7 | REQ-034 View Benchmark Run Status (2); REQ-035 View Benchmark Results (3, RQ2) | 5 |
| 8 | REQ-036 Compare Benchmark Results (3); integrate pathway/review read contract from Nguoi 3 (2) | 5 |
| 9 | Integrate expert override/revision and rerun RQ1/RQ3 against versioned engine (5) | 5 |
| 10 | Regression/demo pathway + benchmark, including no employee data in benchmark (5) | 5 |

## Gate và rủi ro

1. **Trước sprint 1:** chốt ID, `organizationId`, quyền, schema/contract version, mock fixtures và các quyết định còn mở ảnh hưởng baseline/PayOS. Sprint 1-2 chỉ dùng stub cho nhóm tiêu thụ; nghiệm thu quyền thật sau gate sprint 2.
2. **Cuối sprint 3:** Người 2 bàn giao role requirements và question mapping có version; sprint 4 chốt prerequisite và kiểm tra coverage câu hỏi trước khi cho baseline production. Configure Baseline Assessment sprint 3 là phần implementation với fixture, chưa được tính là đã nghiệm thu production.
3. **Cuối sprint 5/7/9:** lần lượt demo baseline + evidence; gap + initial pathway có lý do; và failed question -> giữ hoặc tính lại pathway (có version và idempotency). UI mock của Người 4 không tính là hoàn thành cho đến khi kiểm thử trên contract thật ở sprint 8-9.
4. **Thanh toán:** Verify PayOS (sprint 7) phải được kiểm thử trước Apply Confirmed Payment (sprint 8); redirect không kích hoạt subscription. Benchmark RQ1/RQ3 chỉ được xem là hoàn tất sau khi chạy trên engine versioned với dữ liệu synthetic (sprint 9).
5. **Sức chứa:** 4 x 5 x 10 = 200 ngày-công; các bảng dự kiến dùng hết 200, gần như **không có dự phòng**. Bayesian baseline, cross-store consistency, PayOS và RQ1/RQ3 có thể cần hơn ước lượng. Nếu trễ, giữ P0 và gate an toàn; đẩy P2 (thống kê, report, benchmark comparison, destructive CRUD) ra ngoài mốc 10 sprint thay vì bỏ qua test hay cho phép function phụ thuộc chạy trên dữ liệu giả.
