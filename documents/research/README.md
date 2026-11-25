# Research workspace

Cập nhật 25/11/2026. Cả 3 câu hỏi nghiên cứu (**RQ1**, **RQ2**, **RQ3**) đã có đặc tả, dữ liệu, kết quả chạy lại được và bản thảo bài báo. Tất cả đều ở mức **pilot**, chờ chuyên gia rà soát ([RESEARCH_MANUSCRIPT.md](RESEARCH_MANUSCRIPT.md) / [RESEARCH_MANUSCRIPT.docx](RESEARCH_MANUSCRIPT.docx)). Bắt đầu bằng [hướng dẫn thực hiện bằng tiếng Việt](HUONG_DAN_THUC_HIEN_RESEARCH.md).

## Tài liệu chính

> **Bản dịch tiếng Việt** (tham khảo, bản tiếng Anh là bản chính): [bản thảo bài báo](RESEARCH_MANUSCRIPT.vi.md), [RQ1](RQ1_RECOMMENDATION_RELEVANCE_EXPERIMENT_1.vi.md), [RQ2](RQ2_GRAPH_LATENCY_EXPERIMENT_2.vi.md), [RQ3](RQ3_PATHWAY_EFFICIENCY_EXPERIMENT_3.vi.md), [khung nghiên cứu](RESEARCH_FRAMEWORK.vi.md), [nghiên cứu liên quan](RELATED_WORK.vi.md).

- [Bản thảo bài báo tổng hợp Word](RESEARCH_MANUSCRIPT.docx) và [nguồn Markdown](RESEARCH_MANUSCRIPT.md): có mục threats to validity, bảng đánh số, khả năng truy cập dữ liệu. File Word dựng bằng `tools/build_docx.py`, chỉ có trên máy, không có trong Git.
- [Khung nghiên cứu Word](Knowledge_Graph-Based_Adaptive_Learning_Pathways_for_Workforce_Competency_Development.docx) và [nguồn nội dung Markdown](RESEARCH_FRAMEWORK.md), phiên bản 0.4 cập nhật theo kết quả pilot.
- [Nghiên cứu liên quan và nguồn tham khảo](RELATED_WORK.md).
- [RQ1 — Recommendation relevance](RQ1_RECOMMENDATION_RELEVANCE_EXPERIMENT_1.md) và [hướng dẫn quy trình 2 file](RQ1_TWO_FILE_GUIDE.md).
- [RQ2 — Directed graph query latency](RQ2_GRAPH_LATENCY_EXPERIMENT_2.md) và [hướng dẫn chạy standalone](RQ2_LOCAL_SETUP.md).
- [RQ3 — Adaptive pathway efficiency](RQ3_PATHWAY_EFFICIENCY_EXPERIMENT_3.md).
- [Hướng dẫn gắn nhãn chuyên gia](EXPERT_ANNOTATION_GUIDE.md).
- [Kế hoạch pilot một tuần và điều kiện chuyển sang final](PILOT_PLAN.md).
- [Quy tắc dữ liệu và tái lập](DATA_AND_REPRODUCIBILITY.md), [mẫu ghi nhận](templates/README.md).
- [Cách giải thích lựa chọn Neo4j](NEO4J_PITCH_DEFENSE.md).

## Trạng thái bằng chứng & kết quả thực nghiệm (25/11/2026)

1. **RQ1 (Recommendation Agreement — 50 Golden Profiles × 72 Modules) — pilot**:
   - So sánh `G0` (Structured Graph Matching) và `C0` (Content-based TF-IDF) với [danh sách đồng thuận Top 5](RQ1_Golden_Set_50_Dong_Thuan.xlsx) trên [bộ baseline](RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx). Đã chạy lại ngày 25/11 bằng `tools/run_rq1_shortlist_agreement.mjs` và ra đúng kết quả cũ ([report](results/rq1/20261125-rerun/report.json), [evidence](evidence/rq1/20261125/README.md)).
   - `G0` đạt **Hit Rate@5 = 96% (48/50)**, trung bình trùng **2.30/5** module; `C0` đạt **82% (41/50)**, trung bình **1.28/5**. Chênh lệch so cặp: +14 điểm % [CI 95% +6, +24], +1.02 module [+0.72, +1.32]. G0 nhiều hơn ở 29 hồ sơ, bằng ở 21, ít hơn ở 0.
   - Chưa có nhãn 0/1/2 đầy đủ, nên chưa tính Recall/nDCG trên toàn catalog. Giao diện: `/platform-admin/rq1-benchmark`.

2. **RQ2 (Directed Prerequisite Query Latency — 1,000 / 5,000 / 10,000 Nodes) — pilot**:
   - Ba graph Neo4j Community `5.26.33` riêng biệt, 1.8 cạnh/node, 50 warm-up + 100 truy vấn đo 3–5 hops. Ngày 24/11 chạy 1 lần mỗi quy mô ([files](results/rq2/20261124-standalone/)); ngày 25/11 chạy 3 vòng đổi thứ tự ([summary](results/rq2/20261125-rerun/summary.json), [evidence](evidence/rq2/20261125-rerun/README.md)).
   - P50 theo vòng 25/11, dạng trung vị [min–max]:
     - 1k: **12.77** [11.10–16.25] ms
     - 5k: **17.79** [15.79–20.27] ms
     - 10k: **16.34** [15.39–16.54] ms

     P50 ngày 24/11: 9.24 / 6.01 / 12.13 ms.
   - Độ trễ không tăng theo kích thước. Dao động giữa các lần chạy lớn ngang chênh lệch giữa các quy mô.
   - Còn thiếu so với protocol: nhiều seed graph, 1.000 truy vấn mỗi khối, xuất đủ thời gian đo thô (hiện chỉ giữ 30 mẫu). Giao diện: `/platform-admin/graph-benchmark`.

3. **RQ3 (Adaptive Pathway Efficiency — 100 Profiles × 30 Seeded Replicates, Budget 40) — pilot, chưa final**:
   - Lần chạy r2 có runtime parity: `A0` gọi đúng transition runtime `RequirementPathwayRecalculationService.supplement`. Cả ba chính sách refresh qua `RequirementPathwayGenerationService.step` + `RequirementPathwayPlanningService.refreshedStep` và chấm điểm bằng `RuleAssessment.score` + `RuleAssessmentDecision.decide`. Lần chạy r1 trước đó tự cài lại logic bổ sung nên bị thay thế.
   - Kết quả ([results/rq3/20261125-r2-runtime-parity/report.json](results/rq3/20261125-r2-runtime-parity/report.json)):
     - $D(u, 40)$: `S0` **0.6128**, `A0` **0.5701**, `S1` **0.5565**. $\Delta D$ (S0 − A0) = **+0.0427**, 95% CI `[+0.0342, +0.0520]`; `A0` thấp hơn ở 72 hồ sơ, hòa 27, cao hơn 1.
     - `S1` thấp hơn `A0`: S1 − A0 = **−0.0136**, 95% CI `[−0.0177, −0.0098]`. Lợi thế của A0 chỉ là so với lộ trình tĩnh không mở rộng tiên quyết.
     - Đóng lỗ hổng ban đầu: 49.40% / 61.83% / 64.40% (S0 / A0 / S1). Không lượt nào đạt D = 0, vì yêu cầu được miễn qua baseline không bao giờ có bằng chứng chính thức.
     - Độ nhạy (η, λ, chi phí đánh giá 0.5/1/2, ngân sách 20/40/80, kiến thức ban đầu bằng nhau): ΔD (S0 − A0) dương ở cả 10 cấu hình, S1 luôn thấp hơn A0.
   - Còn mở: chuyên gia độc lập chưa rà simulator/rubric/quan hệ tiên quyết; manifest cohort vẫn `DRAFT_PILOT_INPUTS`.
   - Bằng chứng kiểm chứng: [evidence/rq3/20261125/README.md](evidence/rq3/20261125/README.md). Giao diện đối chiếu: `/platform-admin/rq3-benchmark`.

## Lưu trữ

[data](data/README.md) lưu snapshot/nhãn/fixture; [results](results/README.md) lưu từng lần chạy bất biến theo `results/<rq>/<run-id>/`; `evidence/<rq>/<ngày>/` lưu lệnh đã chạy, kết quả kiểm thử và giới hạn; [tools](tools/README.md) lưu công cụ dựng dữ liệu, runner và harness.

## Catalog & Bộ hồ sơ Benchmark

- [Application Developer web full-stack v0.1](data/rq1/application-developer-v0.1/README.md): 20 kỹ năng, 72 đặc tả module, 31 prerequisite.
- [profiles-v0.1](data/rq1/profiles-v0.1/README.md): 500 hồ sơ synthetic (450 development, 10 pilot, 50 gold50).
- [rq3/pilot-v0.1](data/rq3/pilot-v0.1/manifest.json): 100 hồ sơ (34 Junior, 33 Middle, 33 Senior) tách biệt với Gold50.
