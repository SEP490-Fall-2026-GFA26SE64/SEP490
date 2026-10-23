# REQ-033 — RQ2 system evidence

Ngày kiểm tra: 2026-10-21. Phạm vi: Sinh dataset đúng schema và xuất snapshot. **PASS** trên Compose với PostgreSQL thật và hai Neo4j riêng.

## Kịch bản đã chạy

```sh
PLAYWRIGHT_CHROME_PATH=/path/to/chrome npm run test:system:f02 -- research.rq2.spec.ts research.visual.spec.ts
```

2/2 tests PASS (2,8 phút). Kịch bản thật đăng nhập, xác nhận POST 202, chạy 3 quy mô, nhận 3.000 mẫu, tải PDF/CSV/raw JSON/frozen rules và cả ba dataset, kiểm tra snapshot rồi reload/đăng nhập lại và thấy kết quả còn nguyên. Mỗi quy mô có 334/333/333 mẫu cho 3/4/5 hops; returnedHops khớp kỳ vọng ở mọi mẫu. Tính lại Mean/P95 cho tổng và từng hop từ dữ liệu thô đều khớp. CSV có 3.000 dòng dữ liệu; Markdown khớp nguyên văn rulesMarkdown đã lưu; dataset có đúng tổng node/edge và source hash.

Fixture test kiểm tra layout, tải rule, mobile 375px, reduced motion và trạng thái FAILED/PDF disabled; số liệu fixture không dùng làm minh chứng nghiên cứu.

## Lượt đo xác minh

- Run: `6428ea14-0da3-42df-958d-f5e5fc0c2ca5`; trạng thái SUCCEEDED, seed 42, ontology 0.9.0, rules rq2-v1.
- UTC: 2026-10-20T22:57:54.524507135Z → 2026-10-20T22:59:46.114955964Z.
- Source SHA-256: `6bb30de3dea6afa5aa306246b74ae696c896338991949bb9f392fd79f51a9b02`.
- Neo4j 5.26.31 Community; limit 2 CPU / 2 GiB, heap 512 MiB / page cache 256 MiB; Docker local dùng chung. Warm cache, 30 warm-up bị loại, concurrency 1.

| Nodes | Edges | N | Mean (ms) | P95 (ms) |
| ---: | ---: | ---: | ---: | ---: |
| 1,000 | 5,597 | 1000 | 6.802877 | 14.073959 |
| 5,000 | 27,898 | 1000 | 3.401306 | 6.596250 |
| 10,000 | 55,835 | 1000 | 5.689476 | 16.492500 |

Đây là số đo xác minh chức năng trên máy local, không phải kết luận NFR hay kết quả nghiên cứu đã kiểm soát tải. Không suy diễn quan hệ tăng tuyến tính từ một lượt chạy; JIT/cache/tải máy làm số đo giữa quy mô khác nhau.

## Kiểm tra hiển thị và PDF

Đã xem ảnh desktop/mobile từ luồng thật: không tràn ngang toàn trang, bảng cuộn trong card. PDF thật gồm 2 trang, đã render và xem cả hai: bảng/metadata/counts/giới hạn đầy đủ, không cắt chữ. Bố cục báo cáo tiếng Anh. File tải và ảnh nằm trong `frontend/test-results/research.rq2-*/` (artifact tạm, không commit); dữ liệu gốc và bản rule vẫn lưu ở PostgreSQL, tải lại qua Admin Research.

## Lỗi phát hiện và đã sửa

1. HTTP Basic polling xóa cookie CSRF: giữ cookie qua polling và thêm regression bằng cookie/token thực; POST thiếu token vẫn bị từ chối.
2. Health-check shell sinh JVM tồn dư khi timeout, gây truy vấn vượt 10 giây. Overlay đổi sang HTTP probe nhẹ; xác nhận chỉ còn JVM máy chủ chính. Lượt `de626b2f-122d-4f26-b19d-f725077c7ed7` FAILED tại 1.341 mẫu được giữ nguyên, không dùng làm kết quả hoàn chỉnh.
3. Sau tái tạo Neo4j, API cần làm mới kết nối; lượt `3353bd39-9893-4acf-be42-d1800ef91124` FAILED trước đo được giữ. API được restart; Compose khai báo restart theo phụ thuộc cho các lần cập nhật tiếp theo.

## Phạm vi manual còn lại

Đã tương tác đăng nhập/đọc dữ liệu thật trên browser và xem ảnh/PDF. Các thao tác cố ý ngắt database/restart API giữa một lượt chạy chưa được lặp lại bằng tay trên Compose; failure/recovery/isolation đã được kiểm tra tại service và Testcontainers. Dùng [checklist 15 bước](REQ-034-manual-browser-check.md) cho các lần nghiệm thu tiếp theo. [Rules](../../research/RQ2/RULES.md); [API](../../research/RQ2/API.md).

## Portal-access revision — 2026-10-21

The user removed the separate Administrator access panel and requested RQ1 → RQ2 → RQ3. Latest targeted command:

```sh
RESEARCH_SMOKE=true PLAYWRIGHT_CHROME_PATH=/path/to/chrome npm run test:system:f02 -- research.access.spec.ts research.rq2.spec.ts research.visual.spec.ts
```

**3/3 PASS, 5.3 minutes.** The access test signs in through the existing main portal, opens Research without another form or Lock access button, verifies RQ order and reload persistence, then signs in as Employee, Expert and L&D Manager and checks no Research menu plus blocked direct navigation. Real API calls deny missing context (401) and other roles (403). Production-profile MockMvc also rejects role headers without an authenticated ADMIN principal.

Smoke run `67c46983-b488-402d-843b-cbe8ccea982d` SUCCEEDED with 1000 measured queries on sizes `[1000]`. `createdBy` persisted the portal identity `admin.elena@adaptlearn.internal`. PDF/CSV/raw JSON/dataset/frozen-rule downloads, independent Mean/P95 checks and reload all PASS. This focused revision does not rerun all three sizes; the earlier full-size evidence above remains historical evidence of the unchanged generator/measurement contract.

Frontend 35/35 PASS; backend security/architecture 7/7 PASS; frontend build and scoped lint PASS. Screenshots from real and fixture workflows were inspected: Research is immediately visible, the labels are in numeric order and the removed access controls are absent. API errors retain 403 without redispatch through the unrelated default security chain. Initial Neo4j connection timeout increased from 5s to 15s after a cold handshake timed out; measured query timeout stays 10s and warm-up/sample protocol is unchanged. The earlier failed run `64a63796-885f-4b08-af21-1826a95e6d7a` remains in history.

## Configurable measurement count — 2026-10-21

**PASS:** two Chrome browser tests (`research.rq2.spec.ts`, `research.visual.spec.ts`), with the real Compose backend/PostgreSQL/dedicated Neo4j run configured using `RESEARCH_SMOKE=true RESEARCH_ITERATIONS=37`. Run `14725b32-57d2-4a48-83e3-947f6ca86b24`, seed 42, rules `rq2-v2`, 1,000 nodes / 5,597 edges, status SUCCEEDED. Saved N=37; progress 37/37; samples at depth 3/4/5 are 13/12/12. Mean and nearest-rank P95 were independently recomputed from the raw samples. Invalid API values 2, 3.5, 100001 and null returned 400 before benchmark creation. Reload retained saved results, and history displayed both custom N=37 and older N=1,000 runs.

JSON, CSV (37 sample rows plus header), frozen rules and full dataset download matched the selected run. The exported two-page PDF was parsed, rendered and visually inspected on both pages; its protocol states `37 measured queries per size: 13 at 3 hops; 12 at 4; 12 at 5`, with 30 warm-ups excluded. Desktop and 375px mobile captures were visually inspected; the new input, split preview, selected protocol and history count are readable, tables scroll within their containers and no page-wide horizontal overflow occurs. Fixture visual/download/failed-state coverage also passed. No separate Research login appeared. These are feature smoke checks, not a controlled scientific latency experiment or validation of 100,000 actual samples.

Artifacts: `frontend/test-results/research.rq2-RQ2-real-end--72427-n-access-and-report-exports-system-chrome/` (`raw.json`, `samples.csv`, `rules.md`, `report.pdf`, `dataset-1000.json`, desktop/mobile PNGs). Detailed repeatable manual procedure: [REQ-034 manual checklist](REQ-034-manual-browser-check.md).

## V3 multi-seed/round Compose verification — 2026-10-21

**PASS:** two Chrome browser tests: `research.rq2.spec.ts` (real stack) and `research.visual.spec.ts` (labelled visual fixtures). Real run `2e901c5f-15b5-47cf-812f-c37c9c35cb3f`, rules rq2-v3, seeds[1,2], size1000, requested7 distinct pairs/hop, rounds2. Plan froze84 attempts; final status SUCCEEDED, completed84/84, four trial results, each21 successful samples, seven per depth, zero errors/timeouts. Two seed-qualified datasets were retained without overwrite; each workload has21 distinct pairs. One21-query warm-up pass ran per seed/size (42 total, not84); repeated Trial warmupQueries is provenance, not another warm-up per round.

Browser assertions independently recomputed Mean/Median/nearest-rank P95, verified unique pairs per round, identical pair sets across rounds, counts/degree structure, progress denominator, source hash/seed, complete dataset exports, CSV84 rows plus header, frozen Markdown equality and reload persistence. Invalid seed/pair/round/budget payloads returned400 before creation. PDF/JSON/CSV/rules/dataset exports succeeded. Desktop and375px mobile captures were visually inspected; no page-wide overflow, result tables scroll internally, all three configuration inputs and existing portal-only access remain usable. Historical N37/N1000 rows remain readable. A new catalog-default mapping was subsequently checked by seven frontend component tests; current catalog bounds/defaults drive the draft form. Polling is5seconds to reduce observer load.

These are functional smoke results. CPU contention was observed on the shared local machine, especially during seed1 measurements; these timings must not be treated as controlled scientific performance findings. Default five-seed/three-size/three-round scientific runs and the maximum1,000,000 attempts were not executed in this revision. Error/timeout/all-failed/short-pool/warm-up-failure branches are unit-tested; this real browser run had no query errors. Prior three-size fixed-N evidence remains historical, not certification of the full new matrix.

Artifacts: frontend/test-results/research.rq2-RQ2-real-end--72427-n-access-and-report-exports-system-chrome/ (raw.json, samples.csv, rules.md, report.pdf, dataset-1-1000.json, dataset-2-1000.json, research-desktop.png, research-mobile.png). Manual procedure: [v3 checklist](REQ-034-manual-browser-check.md).

Final report QA: rebuilt local backend, re-exported the same completed run without rerunning measurements, parsed all three pages and visually inspected rendered pages. Each trial stays together; the complete Cypher workload/RETURN stays on one page. Replaced the test artifact report.pdf with this final export. PDF contains the saved protocol, all four trials, Median/Mean/P95, zero disclosed errors, actual unique counts/degree, descriptive variation and limitations. Final Compose migration/API/database health checks passed. Interactive in-app-browser inspection was attempted separately but its automation timed out; real Chrome Playwright interactions and desktop/mobile visual review above are the completed UI evidence.
