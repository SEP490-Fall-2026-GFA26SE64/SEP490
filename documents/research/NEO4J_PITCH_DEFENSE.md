# Giải thích lựa chọn Neo4j trong nghiên cứu

## Lập luận có thể sử dụng

Hệ thống biểu diễn quan hệ Role–Level, skill, prerequisite và learning module một cách tường minh. Neo4j hỗ trợ mô hình và truy vấn đường đi phù hợp với cấu trúc này. Đây là lý do lựa chọn thiết kế; hiệu quả thực tế phải được kiểm chứng theo workload cụ thể.

RQ2 đo độ trễ tìm shortest path prerequisite có hướng, khoảng cách thật 3–5 hops, trên graph research riêng có 1k/5k/10k nodes thật. Báo cáo phải kèm edge counts, topology, môi trường và phân phối số đo. Xem [protocol hiện hành](RQ2_GRAPH_LATENCY_EXPERIMENT_2.md).

## Bằng chứng hiện tại và giới hạn

[Audit ngày 22/11/2026](evidence/rq2/20261122-current-service-audit/RESULTS.md) cho thấy bộ đo cũ dùng cùng một graph 1.059 nodes cho cả ba lựa chọn và có điều chỉnh số đo, nên kết quả từ bộ đó không dùng được. Bộ đo đã được sửa: chạy trên ba graph Neo4j riêng có đúng 1.000 / 5.000 / 10.000 nodes, đo nhiều vòng. Số liệu và độ dao động nằm trong [protocol RQ2](RQ2_GRAPH_LATENCY_EXPERIMENT_2.md) và [evidence](evidence/rq2/20261125-rerun/README.md).

Khi bảo vệ, chỉ nên nói: trên workload này, độ trễ trung vị (P50) nằm khoảng 6–20 ms ở cả 1k, 5k và 10k nodes, và không tăng theo kích thước graph trong phạm vi đã đo. Dao động giữa các lần chạy lớn ngang chênh lệch giữa các quy mô. Không nên kết luận về độ phức tạp tiệm cận, vì ba kích thước và một seed graph là chưa đủ.

Nghiên cứu chưa có đối chứng SQL, nên không kết luận Neo4j nhanh hơn SQL, cũng không kết luận mọi truy vấn quan hệ có chi phí tăng theo hàm mũ. Microbenchmark không chứng minh năng lực production, throughput toàn hệ thống hay hiệu quả học tập.
