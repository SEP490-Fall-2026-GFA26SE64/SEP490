> **Current R4 behavior (2026-10-29):** new Module/content creation, reuse and Excel/ZIP import are based on skills and do not require an Occupation selection/grant. Historical occupation tags and the separate catalog intake workflow remain intact. L&D revision details show individually numbered Text/Video lesson cards. See the [current catalog refinement](../Learning%20catalog/README.md#r4-local-refinement--2026-10-29) and [tested UI/manual checklist](../../testing/system/REQ-013-learning-content-R4.md). Older dated rules below are retained for traceability.

> **Historical implementation record — retained during merge on 2026-10-29.** The current product contract is the [consolidated domain README](../Learning%20catalog/README.md). This record preserves the previously implemented local slice, user decisions and dated evidence; it does not override Version 2 or the authenticated workspace integration. V27/V28 below refer to the historical Module migration lineage; merged source uses V33/V34.

# Create Learning Module

**Function ID:** REQ-013-F01
**Actor:** Expert trong discipline được phân công
**Status:** Implemented local workflow; verification tracked in dedicated REQ-013 evidence
**Feature:** [Learning Module Management](README.md)

## Current Scope Alignment

Áp dụng đầy đủ [field contract và quy tắc hiện tại](README.md#current-field-contract--ontology-v0110), [ARCHITECTURE](../../ARCHITECTURE.md) và [Neo4j schema](../../neo4j_schema.md). Đặc tả này không xác nhận API/giao diện runtime đã được nâng cấp.

## Description

Tạo Module trong phạm vi Expert được phép và chuẩn bị nộp L&D duyệt. Không có giới hạn dummy hoặc mapping 1–1.

**Input:** Thông tin Module: `title`, `moduleType`, `contentUri`, `contentType`, `contentVersion`, `duration`, `price`; metadata `id`, `version`, `status`, `reviewStatus`, `reviewedBy`, `reviewedAt` được quản lý theo contract. Nếu tạo mapping trong cùng luồng, nhận tập MicroSkill tham chiếu và đầy đủ metadata TEACHES, `teachingFocus`, `difficultyLevel` theo REQ-016.

**Outcome:** Module và các mapping được lưu đầy đủ, trong đúng scope; không tự cấp quyền truy cập Employee chỉ vì đã tạo thành công.

## Acceptance Baseline

1. Validate toàn bộ field theo contract; không tự bù dữ liệu thiếu bằng contentUri rỗng, thời lượng/giá giả hoặc người duyệt giả.
2. Module hợp lệ có đúng một PRIMARY; mapping nhiều–nhiều không trùng và không mất metadata.
3. Không lưu nội dung bài học trực tiếp trong Neo4j; contentUri/contentType/contentVersion xác định nội dung tương ứng.
4. Không tự đánh dấu APPROVED hoặc publication khi chưa có thao tác duyệt được phép.

## Confirmed Decisions — 2026-10-28

- Hệ thống tự sinh ID; cho phép trùng title, phân biệt bằng ID.
- Chỉ lưu Module khi đầy đủ field bắt buộc và mapping có đúng một PRIMARY. Không hỗ trợ lưu draft thiếu content/mapping; review metadata chưa phát sinh được null đúng schema.
- Expert chọn nội dung từ Content Studio. Module, phiên bản nội dung và mapping được nộp chung cho L&D duyệt.
- Nội dung là Markdown với video HTTPS trực tiếp nhúng qua `[video](https://host/lesson.mp4)`; contentType của gói vẫn là text/markdown.
- Expert được L&D phân công theo Occupation; tạo Module/content chỉ trong các Occupation được cấp quyền. Membership PostgreSQL và quy tắc sửa chung được mô tả tại [quyết định chung](README.md#occupation-scope-and-revision-boundaries).

## Implementation choices and remaining integration

- Runtime local: title tối đa 240; Module ID `MOD-<UUID>`; lưu đầy đủ ở DRAFT/NEEDS_EXPERT_REVIEW; reviewer/time null trước review. Server ghi người tạo và thời điểm tạo từ identity đã xác thực.
- Identity/assignment production, media ngoài HTTPS trực tiếp và migration Module legacy cần integration riêng; xem README.

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
