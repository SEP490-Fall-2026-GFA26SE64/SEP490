# Research workspace

Cập nhật 25/11/2026. Toàn bộ 3 câu hỏi nghiên cứu (**RQ1**, **RQ2**, **RQ3**) đã có tài liệu đặc tả, dữ liệu đầu vào, kết quả chạy thực nghiệm và bản thảo bài báo tổng hợp (RQ3 ở mức pilot, chờ chuyên gia rà soát) ([RESEARCH_MANUSCRIPT.md](RESEARCH_MANUSCRIPT.md) / [RESEARCH_MANUSCRIPT.docx](RESEARCH_MANUSCRIPT.docx)). Bắt đầu bằng [hướng dẫn thực hiện bằng tiếng Việt](HUONG_DAN_THUC_HIEN_RESEARCH.md).

## Tài liệu chính

- [Bản thảo bài báo tổng hợp Word](RESEARCH_MANUSCRIPT.docx) và [nguồn Markdown](RESEARCH_MANUSCRIPT.md).
- [Khung nghiên cứu Word](Knowledge_Graph-Based_Adaptive_Learning_Pathways_for_Workforce_Competency_Development.docx) và [nguồn nội dung Markdown](RESEARCH_FRAMEWORK.md).
- [Nghiên cứu liên quan và nguồn tham khảo](RELATED_WORK.md).
- [RQ1 — Recommendation relevance](RQ1_RECOMMENDATION_RELEVANCE_EXPERIMENT_1.md) và [hướng dẫn quy trình 2 file](RQ1_TWO_FILE_GUIDE.md).
- [RQ2 — Directed graph query latency](RQ2_GRAPH_LATENCY_EXPERIMENT_2.md) và [hướng dẫn chạy standalone](RQ2_LOCAL_SETUP.md).
- [RQ3 — Adaptive pathway efficiency](RQ3_PATHWAY_EFFICIENCY_EXPERIMENT_3.md).
- [Hướng dẫn gắn nhãn chuyên gia](EXPERT_ANNOTATION_GUIDE.md).
- [Kế hoạch pilot một tuần và điều kiện chuyển sang final](PILOT_PLAN.md).
- [Quy tắc dữ liệu và tái lập](DATA_AND_REPRODUCIBILITY.md), [mẫu ghi nhận](templates/README.md).
- [Cách giải thích lựa chọn Neo4j](NEO4J_PITCH_DEFENSE.md).

## Trạng thái bằng chứng & kết quả thực nghiệm (25/11/2026)

1. **RQ1 (Recommendation Agreement — 50 Golden Profiles × 72 Modules)**:
   - So sánh `G0` (Structured Graph Matching) và `C0` (Content-based TF-IDF) trên [bộ đồng thuận](RQ1_Golden_Set_50_Dong_Thuan.xlsx) và [bộ baseline](RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx).
   - Kết quả: `G0` đạt **Hit Rate@5 = 96% (48/50 hồ sơ)**, trung bình trùng **2.30 / 5** module; `C0` đạt **Hit Rate@5 = 82% (41/50 hồ sơ)**, trung bình trùng **1.28 / 5** module (`+14 điểm phần trăm`, `+1.02 module/hồ sơ`).
   - Giao diện đối chiếu: `/platform-admin/rq1-benchmark`.

2. **RQ2 (Directed Prerequisite Query Latency — 1,000 / 5,000 / 10,000 Nodes)**:
   - Sau khi ghi nhận [audit bộ service cũ](evidence/rq2/20261122-current-service-audit/RESULTS.md) (giữ cố định 1.059 nodes), đã chạy thực nghiệm độc lập trên Neo4j Community `5.26.33` với 3 đồ thị tách biệt thật (`1,000`, `5,000`, `10,000` `MicroSkill` nodes; tỷ lệ `1.8` prerequisite edges/node; 50 warm-up + 100 measured queries 3–5 hops):
     - [1,000 nodes](results/rq2-standalone-20261124-172324-1k.json): **P50 = 9.24 ms**, **P95 = 37.16 ms**, **Mean = 13.51 ms**
     - [5,000 nodes](results/rq2-standalone-20261124-172832-5k.json): **P50 = 6.01 ms**, **P95 = 17.25 ms**, **Mean = 7.65 ms**
     - [10,000 nodes](results/rq2-standalone-20261124-173041-10k.json): **P50 = 12.13 ms**, **P95 = 51.82 ms**, **Mean = 18.73 ms**
   - Giao diện benchmark: `/platform-admin/graph-benchmark`.

3. **RQ3 (Adaptive Pathway Efficiency — 100 Profiles × 30 Seeded Replicates, Budget 40) — pilot, chưa final**:
   - Lần chạy r2 có runtime parity: `A0` gọi đúng transition runtime `RequirementPathwayRecalculationService.supplement`. Cả ba chính sách refresh qua `RequirementPathwayGenerationService.step` + `RequirementPathwayPlanningService.refreshedStep` và chấm điểm bằng `RuleAssessment.score` + `RuleAssessmentDecision.decide`. Lần chạy r1 trước đó tự cài lại logic bổ sung nên bị thay thế.
   - Kết quả ([results/rq3/20261125-r2-runtime-parity/report.json](results/rq3/20261125-r2-runtime-parity/report.json)):
     - $D(u, 40)$: `S0` **0.6128**, `A0` **0.5701**, `S1` **0.5565**. $\Delta D$ (S0 − A0) = **+0.0427**, 95% CI `[+0.0342, +0.0520]`; `A0` thấp hơn ở 72 hồ sơ, hòa 27, cao hơn 1.
     - `S1` thấp hơn `A0`: S1 − A0 = **−0.0136**, 95% CI `[−0.0177, −0.0098]`. Lợi thế của A0 chỉ là so với lộ trình tĩnh không mở rộng tiên quyết.
     - Đóng lỗ hổng ban đầu: 49.40% / 61.83% / 64.40% (S0 / A0 / S1). Không lượt nào đạt D = 0, vì yêu cầu được miễn qua baseline không bao giờ có bằng chứng chính thức.
     - Độ nhạy (η, λ, chi phí đánh giá 0.5/1/2, ngân sách 20/40/80, kiến thức ban đầu bằng nhau): ΔD (S0 − A0) dương ở cả 10 cấu hình, S1 luôn thấp hơn A0.
   - Còn mở: chuyên gia độc lập chưa rà simulator/rubric/quan hệ tiên quyết; manifest cohort vẫn `DRAFT_PILOT_INPUTS`; `RESEARCH_MANUSCRIPT.docx` chưa sinh lại.
   - Bằng chứng kiểm chứng: [evidence/rq3/20261125/README.md](evidence/rq3/20261125/README.md). Giao diện đối chiếu: `/platform-admin/rq3-benchmark`.

## Lưu trữ

[data](data/README.md) lưu snapshot/nhãn/fixture; [results](results/README.md) lưu từng lần chạy bất biến; `evidence` lưu kiểm tra và audit; `tools` lưu công cụ tài liệu và runner.

## Catalog & Bộ hồ sơ Benchmark

- [Application Developer web full-stack v0.1](data/rq1/application-developer-v0.1/README.md): 20 kỹ năng, 72 đặc tả module, 31 prerequisite.
- [profiles-v0.1](data/rq1/profiles-v0.1/README.md): 500 hồ sơ synthetic (450 development, 10 pilot, 50 gold50).
- [rq3/pilot-v0.1](data/rq3/pilot-v0.1/manifest.json): 100 hồ sơ (34 Junior, 33 Middle, 33 Senior) tách biệt với Gold50.
