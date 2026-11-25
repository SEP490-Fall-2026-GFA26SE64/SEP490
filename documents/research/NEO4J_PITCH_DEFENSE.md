# Giải thích lựa chọn Neo4j trong nghiên cứu

## Lập luận có thể sử dụng

Hệ thống biểu diễn quan hệ Role–Level, skill, prerequisite và learning module một cách tường minh. Neo4j hỗ trợ mô hình và truy vấn đường đi phù hợp với cấu trúc này. Đây là lý do lựa chọn thiết kế; hiệu quả thực tế phải được kiểm chứng theo workload cụ thể.

RQ2 đo độ trễ tìm shortest path prerequisite có hướng, khoảng cách thật 3–5 hops, trên graph research riêng có 1k/5k/10k nodes thật. Báo cáo phải kèm edge counts, topology, môi trường và phân phối số đo. Xem [protocol hiện hành](RQ2_GRAPH_LATENCY_EXPERIMENT_2.md).

## Bằng chứng hiện tại và giới hạn

[Audit ngày 22/11/2026](evidence/rq2/20261122-current-service-audit/RESULTS.md) cho thấy bộ đo cũ dùng cùng graph 1.059 nodes ở ba lựa chọn và điều chỉnh số đo. Vì vậy chưa có bằng chứng scalability hợp lệ từ bộ này. 5k/10k trên giao diện không xác nhận database tương ứng đã tồn tại.

Nghiên cứu chưa có đối chứng SQL, nên không kết luận Neo4j nhanh hơn SQL hoặc mọi truy vấn quan hệ có chi phí tăng theo hàm mũ. Microbenchmark không chứng minh năng lực production, throughput toàn hệ thống hay hiệu quả học tập. Không sử dụng các con số bảng cố định làm kết quả thực nghiệm.

Bản trước được lưu nguyên vẹn trong [archive](archive/pre-framework-20261122/NEO4J_PITCH_DEFENSE.original.md) để truy vết; các lập luận chưa được chứng minh trong bản đó không còn là kết luận hiện hành.
