# REQ-033 — RQ2 unit evidence

Ngày kiểm tra: 2026-10-21. Phạm vi: Tạo sinh graph đúng 1.000/5.000/10.000 node, tính tái lập và đầy đủ schema.

## Kết quả

**PASS.** Lượt hồi quy toàn bộ backend: 152 tests / 33 suites, 0 failures, 0 errors, 0 skipped. Sau khi sửa CSRF phát hiện qua trình duyệt thật, đã chạy lại 11 tests liên quan (ResearchSecurityTest, ResearchServiceTest, ResearchDomainTest, HexagonalArchitectureTest), tất cả PASS. Bài mới kiểm tra cookie/token thực từ session được giữ sau polling và POST được chấp nhận; các yêu cầu thiếu CSRF vẫn bị từ chối. Lệnh:

```sh
JAVA_HOME=/path/to/jdk21 DOCKER_HOST=unix:///path/to/docker.sock mvn -f backend/pom.xml test '-Dtest=*Test'
```

ResearchDomainTest, ResearchServiceTest, ResearchSecurityTest và HexagonalArchitectureTest kiểm tra schema, seed, metadata, công thức nearest-rank P95, warm-up exclusion, 334/333/333 samples, lỗi giữa các quy mô, PDF guard, quyền và CSRF. Frontend ResearchPage.test.tsx kiểm tra đăng nhập lỗi, lựa chọn rỗng và không xuất PDF khi FAILED.

Frontend: `npm test -- --run` đạt 33/33 tests, 9 files. `npm run build` thành công. Lint các file Research không có lỗi; WorkspaceLayout có một warning set-state-in-effect đã tồn tại trong logic chuyển actor.

## Giới hạn và đối chiếu

Unit/fixture timings không phải kết quả nghiên cứu. Số đo trên Compose được ghi tại [system evidence](../system/REQ-033-rq2-research.md). Kiểm tra tương tác theo [manual checklist](../system/REQ-034-manual-browser-check.md). [Rules](../../research/RQ2/RULES.md) và [field/API contract](../../research/RQ2/API.md).

## Portal-access revision — 2026-10-21

The user removed the standalone Research login and requested RQ1 → RQ2 → RQ3 order. Targeted backend rerun: ResearchSecurityTest (2), LocalResearchSecurityTest (2), HexagonalArchitectureTest (3), all 7 PASS. Tests verify an existing ADMIN principal, non-admin rejection, ignored spoofed headers outside local, the explicit local portal bridge, cookie/token polling and CSRF mutation protection. Frontend full rerun: 35/35 tests, 9 files, PASS (`npm test -- --run --maxWorkers=1`); build and scoped lint PASS. New UI tests cover no access form/Lock access, numeric RQ order, portal-login redirect and wrong-role direct navigation without actor promotion.

## Configurable measurement count — 2026-10-21

RQ2 now accepts a saved `iterations` value per graph size, default 1,000, integer bounds 3–100,000. Rules version: `rq2-v2`. Targeted backend verification passed **17/17** tests: ResearchServiceTest (4), ResearchDomainTest (5), ResearchSecurityTest (3), LocalResearchSecurityTest (2), HexagonalArchitectureTest (3). Cases cover custom N=3/37/38/10,000, maximum accepted configuration, bounds/type rejection before side effects, the default-compatible API, exact round-robin depth counts, excluded warm-ups, and PDF protocol derived from the saved N. Frontend full suite passed **36/36** tests across 9 files; production build and scoped lint passed. UI tests cover entering N, preview totals/depth counts, validation, and submitting the chosen value. These tests verify measurement behavior; fixture timings are not research findings.

## Approved v3 study protocol — 2026-10-21

**PASS:** targeted backend/API/architecture suites: ResearchStudyTest7, ResearchServiceTest4 (legacy), ResearchDomainTest6, ResearchSecurityTest4, LocalResearchSecurityTest2, HexagonalArchitectureTest3 — **26 tests**, zero failures/errors. Study tests verify multiple seeds/sizes/rounds, exact actual plan/progress, no duplicate pairs within a round, identical pairs across rounds with reproducible shuffle, complete excluded warm-up, insufficient-pair denominator reduction, timeout/error retention without retry, all-failed groups and warm-up failure. Domain tests verify Median odd/even, nearest-rank P95, full ontology fields and v3 PDF disclosure. Security tests accept v3 and reject fractional/mixed configuration while preserving existing authorization/CSRF/legacy API behavior.

Frontend full rerun: **36/36**, nine files, production build/scoped lint PASS. Two unrelated target-role tests timed out in the first resource-constrained full run; the unchanged full suite passed on rerun. Research tests validate seed lists, distinct pairs, rounds, upper budget/preview, and new payload. These counts are functional coverage, not scientific latency evidence. Current contract: [API](../../research/RQ2/API.md), [rules](../../research/RQ2/RULES.md).

Final scoped verification: seven ResearchPage component tests PASS after mapping catalog defaults/bounds and using5-second polling; full-suite36/36 above predates the additional catalog-default test. Final production build/scoped lint PASS. ResearchStudyTest7 rerun PASS after diagnostic logging; ResearchDomainTest6 rerun PASS after keeping each PDF trial block together during pagination. Unchanged tests were not repeatedly broadened.
