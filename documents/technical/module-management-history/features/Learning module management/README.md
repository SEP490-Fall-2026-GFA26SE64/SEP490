> **Current R4 behavior (2026-10-29):** new Module/content creation, reuse and Excel/ZIP import are based on skills and do not require an Occupation selection/grant. Historical occupation tags and the separate catalog intake workflow remain intact. L&D revision details show individually numbered Text/Video lesson cards. See the [current catalog refinement](../Learning%20catalog/README.md#r4-local-refinement--2026-10-29) and [tested UI/manual checklist](../../testing/system/REQ-013-learning-content-R4.md). Older dated rules below are retained for traceability.

> **Current Learning Content runtime (2026-10-29):** ordered Text/Video, private uploads, Excel/ZIP import, full revision preview and persisted learner progress are described in the [current catalog delivery record](../Learning%20catalog/README.md#learning-content-local-delivery--2026-10-29). See [verification limits and manual checklist](../../testing/system/REQ-013-learning-content.md), including the Vimeo provider blocker. The dated historical details below remain for traceability.

> **Historical implementation record — retained during merge on 2026-10-29.** The current product contract is the [consolidated domain README](../Learning%20catalog/README.md). This record preserves the previously implemented local slice, user decisions and dated evidence; it does not override Version 2 or the authenticated workspace integration. V27/V28 below refer to the historical Module migration lineage; merged source uses V33/V34.

# Learning Module Management

## Current Scope Alignment

**Requirement:** REQ-013
**Actor:** Expert trong discipline được phân công; L&D phê duyệt offering theo phạm vi được thống nhất.
**Status:** Đã triển khai workflow local theo schema v0.11.0; kết quả kiểm thử ghi riêng theo REQ-013. Production identity và migration dữ liệu legacy chưa được triển khai.

**Nguồn chính:** [ARCHITECTURE](../../ARCHITECTURE.md), [Neo4j schema](../../neo4j_schema.md), [System Overview](../../adapt_learn_graph_system_overview.md). Khi mô tả dataset cũ khác inventory dưới đây, dùng schema hiện tại. Không thay đổi schema để khớp field mock của giao diện.

Expert tạo, xem, sửa và yêu cầu gỡ/ngừng sử dụng Module trong phạm vi được phép. Nội dung không bị giới hạn ở dummy. Module là đơn vị học; không có Course entity. Nội dung bài học thuộc [REQ-054](../Courses%20and%20learning%20content/README.md); mapping kỹ năng thuộc [REQ-016](../Module%20outcomes/README.md). Quy trình nộp/duyệt thuộc [Learning offering approval](../Learning%20offering%20approval/README.md).

## Current field contract — Ontology v0.11.0

### LearningModule node

Bảng này là inventory đầy đủ: 6 field metadata chung và 7 field nghiệp vụ. Không đồng nghĩa tất cả đều do Expert nhập tay.

| Field | Kiểu / giá trị | Quy tắc |
|---|---|---|
| `id` | String | Hệ thống tự sinh ID ổn định, không rỗng, duy nhất trong tập LearningModule; không dùng title làm khóa. |
| `version` | String | Phiên bản catalog; snapshot review hiện tại là `0.11.0`. Không phải phiên bản bài học hay số revision mỗi lần sửa. |
| `status` | `DRAFT`, `ACTIVE`, `ARCHIVED` | Trạng thái vòng đời; trạng thái khởi tạo và quyền chuyển trạng thái cần chốt. |
| `reviewStatus` | `NEEDS_EXPERT_REVIEW`, `APPROVED`, `REJECTED` | Trạng thái review theo schema, không tự suy ra toàn bộ workflow L&D. |
| `reviewedBy` | String hoặc null | Danh tính người thực sự review; để null khi chưa review, không gán người duyệt giả. |
| `reviewedAt` | ISO 8601 datetime có múi giờ hoặc null | Thời điểm review thực tế; chưa review thì null. Neo4j không lưu property null. |
| `title` | String | Tên hiển thị, không rỗng; cho phép trùng tên, phân biệt bằng ID. Giới hạn độ dài cần chốt. |
| `moduleType` | `LESSON_AND_PRACTICE`, `RESOURCE_GUIDED_PRACTICE` | Loại gói học theo schema hiện tại. |
| `contentUri` | String | Tham chiếu nội dung thực tế lưu ngoài Neo4j, không rỗng; hosting và kiểm tra truy cập cần chốt. |
| `contentType` | String | MIME type của nội dung; dataset hiện dùng `text/markdown`. Hỗ trợ JSON/video/upload trong runtime chưa được chốt. |
| `contentVersion` | String | Phiên bản của nội dung được tham chiếu, không rỗng; tách biệt `version` catalog. |
| `duration` | Integer > 0 | Tổng thời lượng học dự kiến, tính bằng phút; gồm đọc, thực hành, tích hợp và phản tư. |
| `price` | Float > 0 | Giá toàn bộ gói Module bằng VND; tính một lần cho Module, không theo số skill. Schema hiện tại chưa cho phép Module miễn phí. |

### TEACHES relationship

`LearningModule → MicroSkill` là nhiều–nhiều. Mỗi mapping trỏ tới một MicroSkill tồn tại, duy nhất theo cặp Module–Skill; ID endpoint là tham chiếu của command/API, không phải property mới trên node.

| Field | Kiểu / giá trị | Quy tắc |
|---|---|---|
| `id` | String | ID ổn định riêng của relationship; không bỏ khi lưu lại mapping. |
| `version` | String | Phiên bản catalog của relationship. |
| `status` | `DRAFT`, `ACTIVE`, `ARCHIVED` | Metadata vòng đời của relationship. |
| `reviewStatus` | `NEEDS_EXPERT_REVIEW`, `APPROVED`, `REJECTED` | Metadata review của relationship. |
| `reviewedBy` | String hoặc null | Người review thực tế; chưa review thì null. |
| `reviewedAt` | ISO 8601 datetime có múi giờ hoặc null | Thời điểm review thực tế; chưa review thì null. |
| `teachingFocus` | `PRIMARY`, `SUPPORTING`, `INCIDENTAL` | Vai trò giảng dạy của skill trong Module cụ thể. |
| `difficultyLevel` | `LOW`, `MEDIUM`, `HIGH` | Độ khó nhiệm vụ của skill trong Module cụ thể, độc lập với teachingFocus. |

### Confirmed rules and boundaries

- Mỗi Module có **đúng một** mapping PRIMARY. SUPPORTING và INCIDENTAL là tùy chọn. Một skill có thể là PRIMARY ở nhiều Module.
- Không cho cặp mapping trùng, endpoint thiếu/sai hoặc thay mapping khiến Module không còn PRIMARY. Kiểm tra coverage phía skill theo REQ-016 khi publish/thay thế/gỡ Module.
- INCIDENTAL không đóng skill gap; hoàn thành Module không chứng minh learner đã đạt mọi skill liên quan.
- Không có cạnh trực tiếp Level–Module. Module được tìm qua skill gap; không gán một difficulty toàn cục cho Module hoặc suy difficulty từ tên Level.
- Điều kiện publication theo schema: `status=ACTIVE`, `reviewStatus=APPROVED`, `reviewedBy` và `reviewedAt` hợp lệ. Đây là điều kiện catalog cần có; quyền L&D và quy trình release/version vẫn cần thiết kế, không coi ACTIVE là đã được duyệt.
- Không thêm `code`, `description`, `occupationId`, `targetRoleId`, `levelId`, `teachesSkillId`, `durationMinutes`, `instructionLevel`, `coverage`, `outcomeCoverage`, `expectedOutcome` hoặc rubric/readiness reference thành property LearningModule theo UI cũ. Scope organization/discipline vẫn bắt buộc tại biên authorization; cách lưu membership cần thiết kế riêng.
- Nội dung, câu hỏi, rubric, learner progress và lịch sử assessment không lưu thành property Module/TEACHES. Không ghi đè hoặc repin lịch sử khi đổi catalog/nội dung.
- Không tự nâng runtime lên v0.11.0 chỉ bằng sửa tài liệu hoặc gán version. API legacy cần mapping/migration rõ ràng; không xóa rồi tạo lại TEACHES làm mất metadata.

## Functions

- [REQ-013-F01 — Create Learning Module](Create%20Learning%20Module.md)
- [REQ-013-F02 — View Learning Modules](View%20Learning%20Modules.md)
- [REQ-013-F03 — Update Learning Module](Update%20Learning%20Module.md)
- [REQ-013-F04 — Delete Learning Module](Delete%20Learning%20Module.md)

## User decisions — 2026-10-28

| Choice | Confirmed requirement |
|---|---|
| 1A / 2A | Hệ thống sinh ID; cho phép trùng tên Module. |
| 3A | Chỉ lưu khi đủ field bắt buộc và đúng một PRIMARY; không lưu draft thiếu nội dung hoặc mapping. Metadata review chưa phát sinh vẫn null đúng schema. |
| 4A / 6A | Chọn nội dung từ Content Studio; nộp Module, phiên bản nội dung và mapping skill chung một gói cho L&D duyệt. |
| 5B, follow-up 2A | Bài Markdown có video nhúng qua đường dẫn HTTPS trực tiếp, cú pháp `[video](https://host/lesson.mp4)` trên một dòng riêng. Không hỗ trợ iframe/HTML tùy ý hoặc tự chuyển link YouTube thành file video. |
| 7A / 8B | Expert xem và sửa mọi Module trong phạm vi được phân công, không chỉ Module mình tạo. Mọi chỉnh sửa phải qua duyệt trước khi phát hành; có thể xem ai đã sửa. |
| 9A | Tìm theo tên/ID; lọc status, reviewStatus, moduleType và skill. |
| 10A / 11A | Sửa Module đã duyệt tạo revision chờ L&D duyệt lại. Learner đang học giữ bản đã bắt đầu; lượt học mới dùng revision mới sau khi được duyệt và phát hành. |
| 12A / 13A | Chỉ xóa vật lý draft chưa có tham chiếu. Các trường hợp khác archive; Module đã duyệt cần Expert yêu cầu và L&D phê duyệt archive. |
| 14A | Hỗ trợ khôi phục về draft, duyệt lại trước khi sử dụng. |

### Occupation scope and revision boundaries

Người dùng chốt Occupation làm phạm vi phân công trong feature này. L&D phân công Expert trực tiếp theo Occupation; membership Module được lưu riêng trong PostgreSQL, không suy từ skill overlap hoặc assignment TargetRole cũ. Expert có grant ở ít nhất một Occupation sở hữu Module được xem/sửa Module dùng chung. Khi tạo content/Module hoặc thêm scope, Expert phải có grant ở mọi Occupation được khai báo để tránh tự mở rộng phạm vi. Membership Module không được thay đổi qua API chỉnh sửa thông thường. Quyết định này không tự thay mọi discipline contract của REQ-050/051; không thêm occupationId hoặc cạnh mới lên graph.

Revision giữ gói Module/content/mapping mà learner đã bắt đầu. Người tạo Module và thời điểm tạo được giữ nguyên trên aggregate; mỗi revision ghi người sửa, thời điểm, payload và các field thay đổi. Lịch sử action ghi người gửi/duyệt/return/archive/restore. Người sửa khác người duyệt; không dùng reviewedBy/reviewedAt thay audit. Archive chặn lượt học mới, learner đã pin tiếp tục bản cũ. Restore về draft và duyệt lại; không coi version catalog là revision.

## Implementation boundary

Workflow mới dùng `/api/v1/module-management`; `/expert/modules`, `/expert/learning-content`, `/ld-manager/approvals` đã nối API. PostgreSQL migration V27 lưu aggregate revision/audit, content bất biến, grants/history và learner pins; Neo4j chỉ nhận gói phát hành. PUBLISH_PENDING/ARCHIVE_PENDING là durable retry state; L&D dùng Retry khi projection lỗi. Quyền local được xác thực HTTP Basic ở backend; production chưa có identity adapter tương ứng và không mở các route này.

Không tự import hoặc nâng các Module legacy/review dataset sang workflow mới; chỉ Module tạo trong workflow mới có revision/history đầy đủ. API ghi Module legacy trả HTTP 410 để ngăn bypass duyệt hoặc mất metadata. Learner pin API chứng minh bảo toàn phiên bản cho workflow này; chưa tích hợp grant từ pathway đã Expert-confirmed hoặc thay thế mọi learning_activity legacy.

## Open decisions — cần thống nhất trước implementation

[Implementation design](Implementation%20design.md) ghi phương án persistence, revision, authorization, Content Studio/approval integration và các quyết định còn cần chốt trước khi sửa code.

1. Production identity/Occupation assignment owner integration; migration có kiểm chứng từ catalog legacy và bridge pathway/learning_activity cũ.
2. Mở rộng media ngoài HTTPS video trực tiếp, validation nguồn/quyền truy cập bên ngoài. Renderer hiển thị link nguồn khi file không phát được; backend không fetch URL bên ngoài.
3. Đã chọn giới hạn title 240, ID UUID do server sinh, page size 10, sort theo thời điểm tạo giảm dần; draft đầy đủ → submitted → return/release, khóa sửa khi submitted. Có revision token và giao diện so sánh khi xung đột. Đây là chi tiết implementation cho các lựa chọn đã chốt.
4. Lý do archive bắt buộc, provider replacement tự động và thống kê sử dụng mở rộng chưa thuộc implementation hiện tại. Archive bị chặn khi mất provider PRIMARY được duyệt cuối cùng của skill.

## Dataset notes and prior decisions

Các ghi chú dưới đây mô tả dataset/quyết định trước đây, không phải bằng chứng runtime đã triển khai.

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

## Shared login correction — 2026-10-28

REQ-013 uses the existing main login session for Module, Content Studio, approval and learning requests. No additional Module login or Basic test accounts are used. The local bridge resolves active account ID, organization and persisted roles on the server; missing session returns 401 with a link back to the main login. Expert assignment choices come from active organization accounts. Creator/editor/reviewer IDs are account IDs. Main logout clears the shared cookie. No graph fields or entity schemas change; this does not convert the existing local demo login into production authentication or migrate historical test-account records.

## Neo4j catalog list — user-requested correction (2026-10-28)

The default Module list now includes existing Neo4j catalog modules, with server-side search/filter/paging and complete read-only details. Authorized PostgreSQL drafts/history are joined by ID; no catalog-only revision/creator is invented. Shared catalog browsing does not grant authoring rights. [Detailed contract and runtime limits](View%20Learning%20Modules.md#neo4j-catalog-list--user-requested-correction-2026-10-28).

## Current runtime catalog

The user's requested v0.11 import is executed. The shared catalog has 246 Modules with complete price/duration and 664 complete TEACHES pairs; 13 previously authored Modules remain preserved. Current list/detail reads these new values while keeping original authoring histories and historical learner/item pins. [Import receipt and recovery](../../dataset/NEO4J_V011_LOCAL_UPGRADE.md); [manual checklist](../../testing/system/REQ-013-016-v011-import.md).

### Per-module catalog intake — 2026-10-28

Option A is now the implementation scope: explicit L&D Occupation assignment → assigned Expert acceptance → draft/edit/submit → L&D decision → existing graph publication. See [intake contract](../Learning%20module%20management/Receive%20Imported%20Module.md). Earlier statements that imported entries remain permanently read-only are superseded by this explicit intake route; listing alone never creates history.

## Current single-Expert responsibility

The current [Learning Catalog contract](../Learning%20catalog/README.md#module-responsibility-and-peer-visibility) supersedes historical shared-occupation editing rules: one creator/responsible Expert manages each Module; peer Experts can view content and history within the organization, and L&D retains review decisions. Existing development modules are handed to expert@example.test with an audit trail; earlier revisions/reviewers are preserved.
