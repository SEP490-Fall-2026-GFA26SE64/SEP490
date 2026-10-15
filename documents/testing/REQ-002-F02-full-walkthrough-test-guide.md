# REQ-002-F02 — walkthrough từ Docker, giao diện, tài liệu, code đến test

Đọc và thực hiện file này từ trên xuống. Mỗi step nối cùng một hành vi theo thứ tự `thao tác nhìn thấy -> tài liệu mô tả -> đường chạy code -> test chứng minh`. Các số dòng được chốt theo source ngày 2026-10-15; nếu source đổi dòng, tìm theo tên class/method ghi ngay cạnh đường dẫn.

Phạm vi đã hoàn thành ở đây là L&D cấu hình một baseline blueprint cho một Occupation, lưu/revise version, generate assessment draft, review đúng content hash và publish. Employee làm bài, lưu response, scoring, evidence/mastery, RIASEC và production Identity/Catalog không thuộc flow đã hoàn thành.

## Step 1 — dựng một stack Docker riêng có đúng dữ liệu để xem REQ-002

Mở PowerShell tại `D:\Study\capstone_project\project\SEP490`. Dùng project name riêng để không chạm volume `adapt-learn-graph-dev` đang có:

```powershell
docker compose -p req002-walkthrough -f compose.dev.yml down -v --remove-orphans
docker compose -p req002-walkthrough -f compose.dev.yml up --build -d postgres neo4j migrate
docker compose -p req002-walkthrough -f compose.dev.yml ps -a
```

Chỉ tiếp tục khi `postgres` và `neo4j` healthy, còn `migrate` đã `Exited (0)`. Lượt migrate này áp Flyway V1–V13, tạo question bank development gồm 100 câu cho 10 skill và tạo hai role legacy dùng cho walkthrough.

Adapter REQ-002 đọc ontology theo `Occupation -> HAS_ROLE -> TargetRole -> HAS_LEVEL -> Level -> REQUIRES_SKILL -> MicroSkill`, trong khi seeder development chung vẫn tạo quan hệ role-skill legacy. Chạy bridge dưới đây trong volume riêng để hai role development xuất hiện dưới một Occupation mà không sửa source hoặc volume chính:

```powershell
$cypher = @'
MATCH (java:TargetRole {code: 'JAVA_BACKEND_P3'}),
      (platform:TargetRole {code: 'PLATFORM_ENGINEER_P4'})
MERGE (occupation:Occupation {id: '10000000-0000-0000-0000-000000000001'})
SET occupation.name = 'Software Engineering', occupation.code = 'SOFTWARE_ENGINEERING',
    occupation.version = 'walkthrough-v1', occupation.status = 'ACTIVE'
MERGE (occupation)-[javaMembership:HAS_ROLE]->(java)
SET javaMembership.status = 'ACTIVE'
MERGE (occupation)-[platformMembership:HAS_ROLE]->(platform)
SET platformMembership.status = 'ACTIVE'
MERGE (javaLevel:Level {id: '30000000-0000-0000-0000-000000000001'})
SET javaLevel.name = 'Java Backend P3', javaLevel.version = 'walkthrough-v1', javaLevel.status = 'ACTIVE'
MERGE (platformLevel:Level {id: '30000000-0000-0000-0000-000000000002'})
SET platformLevel.name = 'Platform P4', platformLevel.version = 'walkthrough-v1', platformLevel.status = 'ACTIVE'
MERGE (java)-[javaHasLevel:HAS_LEVEL]->(javaLevel)
SET javaHasLevel.status = 'ACTIVE'
MERGE (platform)-[platformHasLevel:HAS_LEVEL]->(platformLevel)
SET platformHasLevel.status = 'ACTIVE'
WITH java, platform, javaLevel, platformLevel
MATCH (java)-[:REQUIRES_SKILL]->(javaSkill:MicroSkill)
MERGE (javaLevel)-[javaRequirement:REQUIRES_SKILL]->(javaSkill)
SET javaRequirement.status = 'ACTIVE'
WITH platform, platformLevel
MATCH (platform)-[:REQUIRES_SKILL]->(platformSkill:MicroSkill)
MERGE (platformLevel)-[platformRequirement:REQUIRES_SKILL]->(platformSkill)
SET platformRequirement.status = 'ACTIVE'
RETURN count(DISTINCT platformSkill) AS platformSkillCount
'@

docker compose -p req002-walkthrough -f compose.dev.yml exec neo4j `
  cypher-shell -u neo4j -p local-only-neo4j $cypher
```

Tạo override runtime tạm để chỉ API của walkthrough bật adapter Occupation:

```powershell
@'
services:
  api:
    environment:
      BASELINE_OCCUPATION_CATALOG_ENABLED: "true"
'@ | Set-Content -Encoding utf8 .req002-compose.override.yml

docker compose -p req002-walkthrough `
  -f compose.dev.yml `
  -f .req002-compose.override.yml `
  up --build -d --no-deps api

docker compose -p req002-walkthrough `
  -f compose.dev.yml `
  -f .req002-compose.override.yml `
  up --build -d --no-deps web

docker compose -p req002-walkthrough `
  -f compose.dev.yml `
  -f .req002-compose.override.yml `
  ps -a
```

Phần tài liệu tương ứng là [ARCHITECTURE.md](../ARCHITECTURE.md), dòng 30–46 cho topology và ownership store, dòng 64–76 cho V8–V13 và authoring persistence. Code khởi động đi theo:

```text
compose.dev.yml
  -> backend/src/main/resources/application-local.yml
  -> platform/infrastructure/DatabaseInitialization
  -> catalog/infrastructure/DevelopmentCatalogSeeder
  -> assessment/infrastructure/DevelopmentQuestionBankImporter
  -> db/migration/V8 ... V13
  -> assessment/infrastructure/LocalBaselineBlueprintConfiguration
```

Test chỉ migration/schema của step này:

```powershell
cd backend
.\mvnw.cmd "-Dtest=DatabaseSchemaTest,BaselineAssessmentPostgresIntegrationTest#migratesThroughV13AndSecondMigrationRunIsNoOp,GraphSchemaTest" test
cd ..
```

Kết quả đã ghi nhận: PostgreSQL V1–V13 clean/rerun, V13 identity và Neo4j schema đều pass. Evidence nằm ở [integration guide](integration/REQ-002-F02-baseline-authoring.md), dòng 3–40.

## Step 2 — mở web và thấy danh sách Occupation

Mở:

```text
http://127.0.0.1:8088/ld-manager/assessment-bank
```

Bạn phải thấy heading `Baseline assessment blueprint` và Occupation `Software Engineering`. Đây là điểm bắt đầu nghiệp vụ: L&D chọn một Occupation trước khi cấu hình role.

Tài liệu mô tả mục tiêu này tại [Configure Baseline Assessment](../features/Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md), dòng 5–18; runtime local opt-in tại dòng 67–73.

Đường chạy code khi trang lấy danh sách Occupation:

```text
frontend/src/app/App.tsx:83-88
  -> BaselineBlueprintPage.tsx:73-86 loadOccupationSummaries
  -> baselineBlueprintApi.ts:120-126 listOccupations
  -> GET /api/v1/ld/baseline-blueprint-catalog/occupations
  -> BaselineOccupationCatalogController.java:19-33 list
  -> BaselineOccupationCatalogUseCase.java
  -> BaselineOccupationCatalogService.java:18-38 listAvailableOccupations
  -> BaselineOccupationCatalogPort.java:10 findAvailableOccupations
  -> Neo4jBaselineOccupationCatalogAdapter.java:21-29,54-65
  -> Neo4j
  -> response quay ngược về Page và render select Occupation
```

Trong chuỗi này, controller là đầu HTTP đi vào; `UseCase` là cổng vào application; service xử lý actor/rule; `CatalogPort` là cổng đi ra; Neo4j adapter là implementation hạ tầng. Các flow sau giữ cùng cách đọc này.

Test đúng hành vi list Occupation:

```powershell
cd backend
.\mvnw.cmd "-Dtest=Neo4jBaselineOccupationCatalogAdapterIntegrationTest#listsActiveOccupationsAndCountsOnlyActiveMemberships" test
cd ..\frontend
npm.cmd test -- src/features/manager/baseline-blueprints/baselineBlueprintApi.test.ts -t "lists and resolves Occupations"
cd ..
```

## Step 3 — chọn Occupation và thấy toàn bộ role/skill

Sau khi `Software Engineering` được chọn, trang phải hiển thị cả:

- `Java Backend Developer P3`;
- `Platform Engineer P4`;
- các skill nằm trong accordion của từng role;
- không có checkbox include/exclude role.

Tài liệu quy định input phải chứa all-and-only role/skill tại [Configure Baseline Assessment](../features/Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md), dòng 21–32 và rules dòng 44–52. Kiến trúc traversal Neo4j và skill union nằm ở [ARCHITECTURE.md](../ARCHITECTURE.md), dòng 68–74.

Đường chạy detail và latest saved blueprint:

```text
BaselineBlueprintPage.tsx:88-108
  -> Promise.all
     -> baselineBlueprintApi.ts:128-133 getOccupation
        -> GET /api/v1/ld/baseline-blueprint-catalog/occupations/{occupationId}
        -> BaselineOccupationCatalogController.java:35-38 detail
        -> BaselineOccupationCatalogService.java:42-58 getAvailableOccupation
        -> BaselineOccupationCatalogPort.java:12
        -> Neo4jBaselineOccupationCatalogAdapter.java:31-44,67-104
     -> baselineBlueprintApi.ts:135-140 getLatestBlueprintByOccupation
        -> GET /api/v1/ld/baseline-blueprints/occupations/{occupationId}
        -> BaselineBlueprintController.java:84-87
        -> BaselineBlueprintUseCase
        -> BaselineBlueprintService.java:101-106
        -> BaselineBlueprintStore
        -> JdbcBaselineBlueprintStore.java:43-51
  -> BaselineBlueprintPage.tsx:97-101 set Occupation, name, roles, saved blueprint
  -> BaselineRoleConfiguration.tsx:22-110 render role/skill/count/weight controls
```

Nếu chưa có blueprint, GET latest trả `404`; page giữ catalog detail và dựng form mới. Nếu catalog endpoint gặp `404`, `503` hoặc network error trong DEV, `BaselineBlueprintPage.tsx:386-417` mới dùng `developmentBaselineCatalog.ts`; production không dùng fallback này.

Test đúng role membership, multi-Level union và UI không có checkbox:

```powershell
cd backend
.\mvnw.cmd "-Dtest=Neo4jBaselineOccupationCatalogAdapterIntegrationTest#resolvesAllRolesAndDeduplicatesSkillUnionAcrossLevels" test
cd ..\frontend
npm.cmd test -- src/features/manager/baseline-blueprints/BaselineBlueprintPage.test.tsx -t "shows every Occupation role"
cd ..
```

## Step 4 — cấu hình một role tham gia và để role còn lại bằng 0

Mở `Java Core` của role Java, nhập `1` cho Easy, Medium và Hard. Giữ toàn bộ count của Platform Engineer bằng `0`. Với Java role, đặt weight của ba difficulty đang dùng sao cho tổng bằng `1`; ví dụ `0.3`, `0.4`, `0.3`. Platform role tổng `0` vẫn hiện trên trang với trạng thái không tham gia.

Hành vi nhìn thấy này được mô tả tại [Configure Baseline Assessment](../features/Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md), dòng 5–18, output dòng 34–42, rules dòng 44–52 và zero-role branch dòng 58–63.

Đường chạy trước khi gửi request:

```text
BaselineRoleConfiguration.tsx:31-104
  -> BaselineBlueprintPage.tsx:118-133 updateCount/updateWeight
  -> BaselineBlueprintPage.tsx:136-150 validate UI
     -> phải có ít nhất một role non-zero
     -> used difficulty weights của mỗi role tham gia phải tổng 1
     -> difficulty có 0 câu phải có weight 0
  -> BaselineBlueprintPage.tsx:374-383 toDraft
     -> enabled được suy ra từ roleTotal > 0
     -> zero role vẫn nằm trong payload
```

Backend không tin `enabled` từ client để quyết định membership. `BaselineBlueprintDraftValidator.java:34-44` resolve lại Occupation, dòng 50–87 bắt buộc exact roles/skills và tự suy ra participation từ count, dòng 90–111 kiểm tra weight.

Test đúng zero-role/all-zero/weight/member policy:

```powershell
cd backend
.\mvnw.cmd "-Dtest=OccupationBaselineBlueprintPolicyTest#requiresAllRolesRetainsZeroRoleAndNormalizesSnapshots,BaselineBlueprintServiceTest#rejectsAllZeroOccupationBeforeCoverageLookup" test
cd ..
```

## Step 5 — bấm Save blueprint và hiểu validation, coverage, idempotency, V13

Bấm `Save blueprint`. Lần đầu phải nhận HTTP `201`, badge `Catalog and coverage validated`, blueprint version `1`; Platform role vẫn có `totalQuestionCount = 0`.

API:

```text
POST /api/v1/ld/baseline-blueprints
Idempotency-Key: <UUID do frontend giữ cho lần save này>
```

Tài liệu cho save/version/coverage/idempotency nằm ở [Configure Baseline Assessment](../features/Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md), dòng 34–52 và failure branches dòng 54–65. Persistence nằm ở [ARCHITECTURE.md](../ARCHITECTURE.md), dòng 64–72: V9 version tables, V10 retry-safe write, V13 logical identity và one-blueprint-per-Occupation.

Đường chạy code:

```text
BaselineBlueprintPage.tsx:136-171 handleSave
  -> baselineBlueprintApi.ts:142-156 createBlueprint/reviseBlueprint
  -> BaselineBlueprintController.java:62-76
  -> BaselineBlueprintUseCase.java
  -> BaselineBlueprintService.java:46-92
     -> ActorPort: trusted active L&D context
     -> BaselineBlueprintDraftValidator.java:34-111
        -> BaselineBlueprintValidationPort.findAvailableOccupation
        -> BaselineBlueprintValidationAdapter.java:52-68
        -> BaselineOccupationCatalogPort
        -> Neo4jBaselineOccupationCatalogAdapter
        -> BaselineBlueprintCoverageValidator.java:27+
        -> PostgreSQL latest PUBLISHED item coverage
     -> BaselineBlueprintStore.findLatestByOccupation/findByRequest/insert
     -> JdbcBaselineBlueprintStore.java:43-51,83-96,98+
     -> PostgreSQL baseline_blueprint + immutable version/role/skill rows
     -> V13__occupation_blueprint_identity.sql:1-88 enforces logical identity
  -> BaselineBlueprintController maps normalized response
  -> BaselineBlueprintPage stores saved version and enables Generate
```

Coverage cộng demand theo `microSkill + difficulty` của mọi role non-zero. Role zero vẫn phải đúng membership nhưng không tạo demand. Thiếu coverage trả `422` kèm required/available/missing và không lưu partial version.

Test riêng cho save/API/coverage/identity:

```powershell
cd backend
.\mvnw.cmd "-Dtest=BaselineBlueprintControllerTest#createReturnsNormalizedVersionAndAcceptsLocalCsrfFreeRequest,BaselineBlueprintControllerTest#shortageFailureMapsTo422WithActionableBuckets,OccupationBaselineBlueprintPolicyTest#aggregatesSharedSkillDemandWithRoleContributions,BaselineAssessmentPostgresIntegrationTest#databaseAndServiceRejectSecondLogicalBlueprintForOccupation" test
cd ..
```

## Step 6 — reload rồi revise để thấy một identity có nhiều immutable version

Reload trình duyệt. Page gọi GET latest theo Occupation và phải dựng lại đúng blueprint version `1`, gồm Platform role tổng `0`. Sửa một count hoặc tên rồi Save lần nữa; frontend chuyển sang:

```text
PUT /api/v1/ld/baseline-blueprints/{blueprintId}
body.expectedLatestVersion = 1
Idempotency-Key: <new save operation key>
```

Response phải giữ cùng `blueprintId` và tăng `version` thành `2`. Version `1` không bị update/delete. Nếu tab cũ gửi expected version sai, service trả version conflict.

Đường chạy:

```text
BaselineBlueprintPage.tsx:92-101 reload latest
  -> baselineBlueprintApi.ts:135-140
  -> BaselineBlueprintController.java:84-87
  -> BaselineBlueprintService.java:101-106
  -> JdbcBaselineBlueprintStore.findLatestByOccupation

BaselineBlueprintPage.tsx:157 revise branch
  -> baselineBlueprintApi.ts:146-156
  -> BaselineBlueprintController.java:70-76
  -> BaselineBlueprintService.java:65-92
     -> compare expectedLatestVersion
     -> forbid changing Occupation
     -> insert successor; never update old version
```

Test đúng replay, stale conflict và immutable successor:

```powershell
cd backend
.\mvnw.cmd "-Dtest=BaselineBlueprintServiceTest#replaysSameActorKeyAndRejectsDifferentContent,BaselineBlueprintServiceTest#reviseRequiresLatestVersionAndCreatesImmutableSuccessor,OccupationBaselineBlueprintPolicyTest#enforcesOneIdentityAndPreventsOccupationChangeOnRevise" test
cd ..
```

## Step 7 — bấm Generate assessment và kiểm tra exact manifest

Bấm `Generate assessment`. Với Java Core `1 Easy + 1 Medium + 1 Hard`, UI phải hiện `Assessment draft v1`, `Items: 3`. Tất cả item thuộc Java role; Platform zero role không sinh item.

API:

```text
POST /api/v1/ld/baseline-blueprints/{blueprintId}/versions/{blueprintVersion}/assessment-drafts
Idempotency-Key: <UUID do frontend giữ cho lần generate này>
```

Tài liệu generation nằm ở [Configure Baseline Assessment](../features/Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md), dòng 34–51; kiến trúc manifest/no-repeat/no-answer-key tại [ARCHITECTURE.md](../ARCHITECTURE.md), dòng 72–76.

Đường chạy:

```text
BaselineBlueprintPage.tsx:175-193 handleGenerate
  -> baselineBlueprintApi.ts:158-167 generateAssessment
  -> BaselineBlueprintController.java:94-105
  -> BaselineAssessmentDraftUseCase.java:7-13
  -> BaselineAssessmentDraftService.java:57-96
     -> BaselineBlueprintStore.findVersion
     -> filter RoleConfig.participates (zero role bị loại)
     -> BaselineAssessmentDraftStore.findPublishedCandidates
     -> JdbcBaselineAssessmentDraftStore.java:30-62
     -> BaselineAssessmentGenerator.java:30+
        -> exact count theo role/skill/difficulty
        -> aggregate/global no-repeat item version
        -> score contribution + deterministic content hash
     -> BaselineAssessmentDraftStore.insertNextVersion
     -> JdbcBaselineAssessmentDraftStore.java:129+
     -> assessment_version + assessment_item
  -> controller response chỉ có prompt/response schema, không có protected_key
  -> AssessmentReview UI render manifest
```

Generation key gửi lại với cùng blueprint/version phải trả cùng assessment version/hash; key mới tạo successor. Nếu coverage thay đổi giữa save và generate, generation fail mà không để manifest dở dang.

Test đúng zero-role, unique item, exact manifest và không lộ key:

```powershell
cd backend
.\mvnw.cmd "-Dtest=BaselineAssessmentGeneratorOccupationTest,BaselineAssessmentDraftServiceTest#generatesExactManifestWithDifficultyWeightsAndPinnedMetadata,BaselineBlueprintControllerTest#generatedAssessmentResponseNeverContainsProtectedAnswerMaterial" test
cd ..\frontend
npm.cmd test -- src/features/manager/baseline-blueprints/baselineBlueprintApi.test.ts -t "parses generated manifest"
cd ..
```

## Step 8 — bấm Review this hash và hiểu vì sao manifest bị khóa

Trước review, badge là `DRAFT`. Bấm `Review this hash`; API nhận chính hash đang hiển thị. Thành công thì badge thành `REVIEWED`, `reviewedContentHash` bằng `contentHash`, và database không cho sửa header/manifest đã review.

```text
PUT /api/v1/ld/baseline-blueprints/assessment-drafts/{assessmentVersionId}/review
body = { "contentHash": "<current hash>" }
```

Tài liệu rule tại [Configure Baseline Assessment](../features/Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md), dòng 50–51 và 65; kiến trúc V12 tại [ARCHITECTURE.md](../ARCHITECTURE.md), dòng 76.

Đường chạy:

```text
BaselineBlueprintPage.tsx:196-207 handleReview
  -> baselineBlueprintApi.ts:169-170,190-198
  -> BaselineBlueprintController.java:108-113
  -> BaselineAssessmentDraftUseCase.review
  -> BaselineAssessmentDraftService.java:111-132
     -> load current draft
     -> require current hash
     -> BaselineAssessmentDraftStore.review
     -> JdbcBaselineAssessmentDraftStore.java:181-206
     -> reload and verify reviewed hash
  -> UI badge REVIEWED; Publish được enable
```

Test riêng review/hash/freeze:

```powershell
cd backend
.\mvnw.cmd "-Dtest=BaselineAssessmentDraftServiceTest#requiresExactHashReviewBeforePublishingAndKeepsRetriesIdempotent,BaselineAssessmentPostgresIntegrationTest#reviewAndPublishPersistExactHashAndDatabaseFreezesHeaderAndManifest" test
cd ..
```

## Step 9 — bấm Publish và hiểu trạng thái cuối của authoring

Bấm `Publish`. API chỉ publish khi hash gửi lên vẫn là hash đã review. Thành công thì badge là `PUBLISHED`, hai nút Review/Publish bị disable và version đã publish immutable.

```text
PUT /api/v1/ld/baseline-blueprints/assessment-drafts/{assessmentVersionId}/publish
body = { "contentHash": "<reviewed hash>" }
```

Đường chạy:

```text
BaselineBlueprintPage.tsx:210-220 handlePublish
  -> baselineBlueprintApi.ts:173-174,190-198
  -> BaselineBlueprintController.java:115-120
  -> BaselineAssessmentDraftUseCase.publish
  -> BaselineAssessmentDraftService.java:135-162
     -> require current hash == reviewedContentHash
     -> BaselineAssessmentDraftStore.publish
     -> JdbcBaselineAssessmentDraftStore.java:208+
     -> PostgreSQL publication guards freeze header + assessment_item
  -> UI badge PUBLISHED và khóa action
```

Test API client riêng cho hai endpoint review/publish:

```powershell
cd frontend
npm.cmd test -- src/features/manager/baseline-blueprints/baselineBlueprintApi.test.ts -t "reviews and publishes the exact content hash"
cd ..
```

## Step 10 — chạy một test đi xuyên toàn bộ giao diện vừa thao tác

Playwright case là bản tự động hóa thay thế toàn bộ thao tác ở Step 2–9 và giả định database chưa có blueprint. Vì bạn vừa tạo/publish blueprint bằng tay, không chạy case này ngay trên state đó. Nếu muốn thực thi lại, cleanup theo Step 12, lặp lại Step 1 trên volume sạch nhưng chưa thao tác web, rồi chạy:

```powershell
cd frontend
npm.cmd exec -- playwright test system-tests/REQ-002-F02-baseline-authoring.spec.ts --config=playwright.system.config.ts
cd ..
```

File test tại `frontend/system-tests/REQ-002-F02-baseline-authoring.spec.ts:21+` đi theo đúng thứ tự bạn vừa làm: mở route, thấy hai role, không có checkbox, Java Core `1/1/1`, Platform zero, save/reload, generate 3 item, replay generation key, kiểm tra không lộ protected/answer key, review hash, publish và reload published state.

Evidence tương ứng là [system guide](system/REQ-002-F02-baseline-authoring.md), dòng 3–29. Kết quả đã ghi nhận ngày 2026-10-15: `1 passed` trong 7.8 giây.

## Step 11 — chạy từng tầng hoặc toàn bộ regression khi cần xác nhận lại

Backend unit/application/API đúng REQ-002:

```powershell
cd backend
.\mvnw.cmd "-Dtest=BaselineBlueprintServiceTest,OccupationBaselineBlueprintPolicyTest,BaselineAssessmentDraftServiceTest,BaselineAssessmentGeneratorOccupationTest,BaselineBlueprintControllerTest,BaselineBlueprintProductionBoundaryTest" test
cd ..
```

Backend integration PostgreSQL + Neo4j + schema:

```powershell
cd backend
.\mvnw.cmd "-Dtest=BaselineAssessmentPostgresIntegrationTest,Neo4jBaselineOccupationCatalogAdapterIntegrationTest,GraphSchemaTest" test
cd ..
```

Frontend scoped rồi full:

```powershell
cd frontend
npm.cmd test -- src/features/manager/baseline-blueprints/baselineBlueprintApi.test.ts src/features/manager/baseline-blueprints/BaselineBlueprintPage.test.tsx
npm.cmd test
cd ..
```

Full backend regression:

```powershell
cd backend
.\mvnw.cmd test
cd ..
```

Kết quả canonical hiện tại tại [master evidence](REQ-002-F02-baseline-authoring.md), dòng 44–52: backend scoped `24/24`, PostgreSQL `4/4`, Neo4j adapter `3/3`, GraphSchema `1/1`, full backend `174/174`, frontend scoped `9/9`, full frontend `39/39`, Playwright `1/1`.

## Step 12 — kết thúc walkthrough, cleanup và chốt phần đã hiểu

Xóa đúng stack/volume riêng của guide và override tạm:

```powershell
docker compose -p req002-walkthrough `
  -f compose.dev.yml `
  -f .req002-compose.override.yml `
  down -v --remove-orphans

Remove-Item -LiteralPath .req002-compose.override.yml
```

Sau step này, chuỗi hoàn chỉnh bạn vừa theo dõi là:

```text
Docker/Flyway V1-V13 + dev question bank
  -> Neo4j Occupation/roles/Levels/skills
  -> L&D route lấy list/detail Occupation
  -> UI luôn giữ đủ role; role zero vẫn hiện
  -> POST/PUT blueprint
  -> trusted actor + exact catalog membership + aggregate coverage
  -> PostgreSQL logical identity + immutable versions
  -> exact, globally unique assessment manifest
  -> review exact content hash
  -> publish immutable assessment definition
```

Đây là phần đã làm của REQ-002-F02. Chưa được suy ra từ walkthrough này: production tenant visibility/publication snapshot của Catalog, production Identity authorization, Employee start/resume/response/submit/result, scoring/evidence/mastery và RIASEC. Các boundary còn mở được liệt kê tại [master evidence](REQ-002-F02-baseline-authoring.md), dòng 64–70; vì vậy trạng thái đúng là local/demo authoring đã executable-tested, chưa phải toàn bộ REQ-002 production-ready.
