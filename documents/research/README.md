# Nghiên cứu khoa học: Adapt-Learn-Graph Research Questions & Experiments
> **Dự án:** *Knowledge Graph-Based Adaptive Learning and Competency Intelligence Platform (Adapt-Learn-Graph)*  
> **Nguồn trích xuất:** Đề cương Capstone Project Register (*FA26SE267 Version 3, Mục 3.3*)

---

## 1. Bối cảnh & Vấn đề nghiên cứu (Research Problem)

Các hệ thống gợi ý học tập truyền thống (như *Collaborative Filtering*) mắc phải bài toán "khởi đầu lạnh" (**Cold Start**) và hoàn toàn thiếu hiểu biết về mặt ngữ nghĩa đối với các mối quan hệ phụ thuộc kỹ năng tiên quyết (**Prerequisite Dependencies**).

Ứng dụng **Knowledge Graph** (Biểu đồ tri thức) kết hợp với **Knowledge Tracing** giải quyết triệt để vấn đề này. Tuy nhiên, hiệu năng truy vấn và độ chính xác của giải thuật cần được kiểm chứng thực nghiệm (**Empirically Validated**) trong bối cảnh học tập thực tế.

---

## 2. Danh mục câu hỏi nghiên cứu (Research Questions - RQ)

| Mã RQ | Tên câu hỏi nghiên cứu | Thước đo chính (Metric) | Phương pháp kiểm chứng | Tài liệu chi tiết |
| :--- | :--- | :--- | :--- | :--- |
| **RQ1** | Độ chính xác gợi ý (Recommendation Relevance) của giải thuật duyệt đồ thị so với Content-Based Filtering truyền thống khi khớp mô-đun học tập với khoảng trống kỹ năng? | **Hit Rate@5** | **Experiment 1 (RQ1 - Accuracy):** So sánh với tập dữ liệu chuẩn (Golden Set) 50 hồ sơ chuyên gia gắn nhãn. | *(Sắp bổ sung)* |
| **RQ2** | Độ trễ truy vấn (Query Latency) của các thao tác tìm đường đi sâu trong Neo4j (độ sâu 3–5 hops) là bao nhiêu khi số lượng nodes/edges trong ontology mở rộng từ 1.000 lên 10.000? | **Mean Latency & P95 Latency (ms)** | **Experiment 2 (RQ2 - Graph Latency):** Chạy 1.000 lượt truy vấn tìm đường ngắn nhất trên 3 tập dữ liệu giả lập (1k, 5k, 10k nodes). | 👉 [RQ2_GRAPH_LATENCY_EXPERIMENT_2.md](RQ2_GRAPH_LATENCY_EXPERIMENT_2.md) |
| **RQ3** | Việc tái tính toán lộ trình động (Knowledge Tracing) có tạo ra khoảng cách ngắn hơn về mặt toán học đến hồ sơ Vai trò mục tiêu so với lộ trình tĩnh được xác định trước hay không? | **Total Remedial Modules / Distance to Target** | **Experiment 3 (RQ3 - Pathway Efficiency):** Mô phỏng 100 học viên trượt ngẫu nhiên các mô-đun để đo số lượng bài học bổ sung. | *(Sắp bổ sung)* |

---

## 3. Cấu trúc thư mục nghiên cứu

```
documents/research/
├── README.md                           # Tổng quan mục tiêu, bài toán & 3 câu hỏi nghiên cứu
├── RQ2_GRAPH_LATENCY_EXPERIMENT_2.md   # Hướng dẫn chi tiết thiết kế, giải thuật & kết quả Experiment 2 (RQ2)
├── NEO4J_PITCH_DEFENSE.md              # Kịch bản tóm tắt bảo vệ lý do chọn Neo4j trước Hội đồng
```

