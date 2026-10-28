# Update Learning Module

**Function ID:** REQ-013-F03
**Actor:** Expert trong discipline được phân công
**Status:** Implemented local workflow; verification tracked in dedicated REQ-013 evidence
**Feature:** [Learning Module Management](README.md)

## Current Scope Alignment

Áp dụng đầy đủ [field contract và quy tắc hiện tại](README.md#current-field-contract--ontology-v0110), [ARCHITECTURE](../../ARCHITECTURE.md) và [Neo4j schema](../../neo4j_schema.md). Đặc tả này không xác nhận API/giao diện runtime đã được nâng cấp.

## Description

Cập nhật Module trong scope được phép; bảo toàn tham chiếu nội dung, mapping và lịch sử learner theo chính sách phiên bản được thống nhất.

**Input:** ID Module hiện có, thay đổi field nghiệp vụ trong contract và ngữ cảnh authorization; thông tin kiểm soát revision khi đã chốt thiết kế. Thay mapping phối hợp REQ-016.
**Outcome:** Thay đổi hợp lệ được lưu hoặc tạo revision theo chính sách được chốt; không làm mất bản lịch sử đang được tham chiếu.

## Acceptance Baseline

1. Giữ nguyên ID ổn định; không coi version catalog là bộ đếm revision hoặc tự tăng contentVersion khi chỉ sửa giá/title.
2. Validate title/moduleType/contentUri/contentType/contentVersion/duration/price theo contract; field không đổi phải được bảo toàn.
3. Khi đổi mapping, giữ metadata của mapping không đổi, validate đầy đủ mapping mới và đúng một PRIMARY; không xóa trắng TEACHES để tạo lại không có thuộc tính.
4. Không để Expert tự giả mạo review metadata hoặc tự duyệt thông qua request sửa.
5. Không sửa kết quả, rubric/catalog/content pins hoặc pathway history đã lưu; publication của revision cần chính sách rõ ràng.

## Confirmed Decisions — 2026-10-28

- Expert có grant ở ít nhất một Occupation sở hữu Module được sửa Module, bao gồm Module của Expert khác. Không được đổi membership qua request sửa.
- Chỉnh sửa phải được L&D duyệt trước khi phát hành. Với Module đã duyệt, tạo revision của gói Module/content/mapping; bản đang phát hành giữ nguyên cho tới khi revision mới được duyệt và phát hành.
- Learner đang học tiếp tục bản đã bắt đầu; lượt học mới dùng bản phát hành mới. Bảo toàn content, mapping và historical pins tương ứng.
- Có lịch sử ai sửa, khi nào, revision nào và thay đổi gì. Danh tính lấy từ actor đã xác thực; không cho client giả mạo và không dùng reviewedBy làm người sửa.
- PostgreSQL V27 giữ createdBy/createdAt của Module, editedBy/editedAt/payload của từng revision và lịch sử action. Không thêm revision/audit vào property graph.

## Implementation choices and remaining integration

- Implementation local cho sửa DRAFT/RETURNED/RELEASED; mỗi lần sửa tạo revision mới; không cho sửa SUBMITTED hoặc pending publication/archive. Content mới có reference bất biến riêng; contentVersion không dùng làm catalog version.
- Request sửa mang expectedVersion; stale trả 409, không ghi đè. UI giữ form và cho so sánh revision mới trước khi chọn giữ nội dung mình sửa hoặc tải lại form.
- Lý do sửa chưa bắt buộc; lịch sử lưu field thay đổi. Production identity và learner activity bridge còn cần tích hợp.

## Dataset notes and prior decisions

Các ghi chú sau không xác nhận runtime đã được migrate.

## Duration and paid-module estimate correction — 2026-10-27

REQ-013-F01/F03 and REQ-016-F01/F02: LearningModule.duration is expected total learner effort (reading, practice, integration, reflection), in positive integer minutes. LearningModule.price is the positive VND price for the complete module learning package, charged once per selected Module, not per skill. Seed estimates vary by mapped skill effort and task depth; they are not vendor quotes or runtime pricing rules. The 85 paid sample Modules span 150–915 minutes and 150,000–1,560,000 VND. See [method and assumptions](../../dataset/MODULE_EFFORT_PRICE.md). Cost comparisons must deduplicate Modules covering multiple gaps. Teaching focus/difficulty assignment to new content requires expert review. Runtime CRUD/publication/migration is not implemented by this dataset correction.

## Teaching focus and difficulty — 2026-10-28

The v0.11 review catalog replaces instructionLevel with **two independent required text properties on each TEACHES relationship**:

| Property | Allowed values | Meaning |
|---|---|---|
| teachingFocus | PRIMARY / SUPPORTING / INCIDENTAL | Main instructional objective, supporting practice, or provided context only. |
| difficultyLevel | LOW / MEDIUM / HIGH | Difficulty of the tasks for that particular skill in the Module. |

PRIMARY identifies the objective the package is designed to teach directly. SUPPORTING has an explicit supporting exercise; it does not automatically replace a PRIMARY treatment. INCIDENTAL is exposure/context, with no instructional objective or mastery credit and must not be treated as closing a skill gap. Display labels may be Primary/Supporting/Incidental; JSON and graph use the uppercase enums above.

Both properties belong to the exact Module–Skill pair, not globally to a Module or MicroSkill. A Module may contain PRIMARY + HIGH for one skill, SUPPORTING + MEDIUM for another and INCIDENTAL + LOW for a third. Changing teachingFocus does not determine difficulty. Difficulty is not calculated from a numeric gap, requiredScore, legacy coverage, or a selected role title. No scoring/ranking engine is implemented by this catalog change.

The current review package has **994 nodes and 5,121 relationships**, including **246 LearningModules and 664 TEACHES pairs**. It retains all 85 existing modules and 181 teaching pairs, and adds **161 locally authored focused practice packages**, each with a primary objective, a supporting exercise and incidental context. Every one of the 79 skills now has a PRIMARY option at LOW, MEDIUM and HIGH. This is a review-dataset completeness criterion, not a universal graph cardinality rule requiring every future catalog to have three providers.

| Teaching focus | Pairs |
|---|---:|
| PRIMARY | 246 |
| SUPPORTING | 257 |
| INCIDENTAL | 161 |

Difficulty counts across all roles: LOW 372, MEDIUM 178, HIGH 114. For example, MOD-FOCUS-CORE01-HIGH teaches MS-CORE01 as PRIMARY/HIGH, MS-CORE02 as SUPPORTING/MEDIUM and MS-CORE03 as INCIDENTAL/LOW. MOD-READ-CORE01 remains a PRIMARY/LOW option for MS-CORE01, while MOD-FOCUS-CORE01-MEDIUM provides PRIMARY/MEDIUM.

All 85 original module IDs and original duration/price estimates are retained. Exactly one leading skill is PRIMARY; remaining practice is SUPPORTING. Nine formerly co-primary packages now have clearer titles, revised content references and version 1.3, with narrowed supporting tasks rather than unchanged co-primary work. Original content files are preserved for historical pins. Existing task modes (guided, independent, complex review) inform the authoring choices, not learner scores. These decisions remain NEEDS_EXPERT_REVIEW.

The 161 new packages include distinct guided/independent/complex tasks, supporting work, contextual material, evidence checks and assessment boundaries. They are **lesson/lab scaffolds pending expert authoring, sandbox assets and approval**, not complete production courses or official O*NET/ESCO mappings. The supplied contextual skill is not a newly asserted prerequisite. Prices/durations are review estimates, not vendor quotes or measured learning gains.

Six node labels, seven relationship types and store ownership remain unchanged. Keep existing skill prerequisites; module completion does not establish mastery. A selected Module is counted once for duration/price even when it addresses several gaps. The original instructionLevel/coverage representations and v0.9 runtime seed remain historical; no current runtime graph, API or learner history is migrated.

## Independent role-Level requirements

Each TargetRole owns distinct Level nodes. Each Level has its own REQUIRES_SKILL set and requiredScore values; sets may overlap or differ and are not constrained to be nested. Module selection occurs through missing skills; no direct Level–Module edge is added.

Application Developer currently has 11 required skills at Junior, 14 at Middle and 14 at Senior. MS-CORE01 thresholds are 0.60 / 0.75 / 0.90. MS-FS08, MS-FS15 and MS-FS16 occur at Middle/Senior but not Junior in this role. Those requirements and all non-teaching relationships are preserved. A Senior target does not make every recommended module HIGH; readiness and compatible evidence still govern suitability.

[Current dataset, authoring limits and manual procedures](../../dataset/TEACHING_FOCUS_DIFFICULTY.md).

### Imported module intake — 2026-10-28

[Explicit per-module intake](Receive%20Imported%20Module.md) adds a separate entry point: L&D assigns responsible Occupations; an assigned Expert receives the existing ID and bundled Markdown into a draft. `createdBy` remains null for unknown original authorship; assignment/acceptance identities and times are recorded separately. Only submitted drafts can be reviewed; first approval updates the existing graph identity. Imported drafts cannot be hard-deleted. Native creation retains generated ID/actual creator behavior. Source snapshots and edit/decision history remain separate.
