# REQ-034 — RQ2 integration evidence

Ngày kiểm tra: 2026-10-21. Phạm vi: Quyền Research Admin, CSRF, chạy nền, tiến độ và tính đúng phép đo.

## Kết quả

**PASS.** Lượt hồi quy toàn bộ backend: 152 tests / 33 suites, 0 failures, 0 errors, 0 skipped. Sau khi sửa CSRF phát hiện qua trình duyệt thật, đã chạy lại 11 tests liên quan (ResearchSecurityTest, ResearchServiceTest, ResearchDomainTest, HexagonalArchitectureTest), tất cả PASS. Bài mới kiểm tra cookie/token thực từ session được giữ sau polling và POST được chấp nhận; các yêu cầu thiếu CSRF vẫn bị từ chối. Lệnh:

```sh
JAVA_HOME=/path/to/jdk21 DOCKER_HOST=unix:///path/to/docker.sock mvn -f backend/pom.xml test '-Dtest=*Test'
```

ResearchIntegrationTest chạy PostgreSQL 17.6 và hai Neo4j 5.26 Community thực bằng Testcontainers: đối chiếu mọi property không-null của toàn bộ node/edge ở cả ba quy mô, traversal 3/4/5 hops, primary sentinel không đổi, từ chối trùng database và foreign node. PostgreSQL chạy migration V1–V8, round-trip Run/Graph, lưu rule snapshot, chặn chạy trùng, phục hồi lượt gián đoạn và danh sách tóm tắt. Null reviewedBy/reviewedAt được giữ đúng nghĩa chưa duyệt, Neo4j không lưu property null.

Frontend: `npm test -- --run` đạt 33/33 tests, 9 files. `npm run build` thành công. Lint các file Research không có lỗi; WorkspaceLayout có một warning set-state-in-effect đã tồn tại trong logic chuyển actor.

## Giới hạn và đối chiếu

Unit/fixture timings không phải kết quả nghiên cứu. Số đo trên Compose được ghi tại [system evidence](../system/REQ-034-rq2-research.md). Kiểm tra tương tác theo [manual checklist](../system/REQ-034-manual-browser-check.md). [Rules](../../research/RQ2/RULES.md) và [field/API contract](../../research/RQ2/API.md).

## Portal-access revision — 2026-10-21

Persistence/schema/generator fields are unchanged; the Testcontainers field-completeness evidence above remains applicable. The changed boundary is covered by MockMvc with both local and non-local profiles (existing ADMIN principal versus local actor headers, wrong roles, CSRF cookie round-trip). Compose/browser revalidation and portal createdBy persistence are tracked in the system evidence. No standalone Research authentication provider or credential configuration remains.

## Configurable measurement count — 2026-10-21

**PASS:** `ResearchIntegrationTest#postgresRetainsFrozenArtifactsRejectsOverlapAndRecoversInterruptedRun` against PostgreSQL Testcontainers. A `rq2-v2` run with N=37 is persisted and returned unchanged by both get and history; the existing N=1,000 run remains unchanged. Frozen rules and complete generated graph snapshots still round-trip, overlapping runs remain rejected and interrupted runs are recovered. This setting uses the existing `research_run` JSONB field; no ontology or database migration is needed. The Neo4j query/import implementation is unchanged; custom-N execution with actual Neo4j is covered in the linked system evidence.

## V3 seed-qualified snapshots / V9 — 2026-10-21

**PASS:** PostgreSQL Testcontainers `ResearchIntegrationTest#postgresRetainsFrozenArtifactsRejectsOverlapAndRecoversInterruptedRun`. Starts at V8 with a legacy graph/run (new Run fields removed from payload), applies V9, asserts preserved snapshot and derived historical denominator. Saves two graphs at the same size under seeds1 and2 without overwrite, round-trips protocol/totalQueries/planReady, complete graph records, Trial/Structure/Median and both success/timeout samples. History strips raw samples while retaining all trial metrics/configuration. Legacy N37/N1000, frozen rules, overlap rejection and interrupted-run recovery remain covered. Neo4j schema/query unchanged; actual multi-seed imports and measurements covered by system evidence. No claim of a full rerun of the pre-existing three-size Neo4j Testcontainers test for this revision.

## Dataset count input — 2026-10-23

No new store/domain/API field or migration. Frontend countN expands to the existing validated seeds[1..N] request, preserving protocol.seeds as persisted source of truth. Previous seed-qualified snapshot integration coverage remains applicable; no new Testcontainers run. Browser request capture verifies the existing request shape but is not claimed as a real database/benchmark execution.
