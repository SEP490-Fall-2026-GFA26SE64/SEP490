# RQ2 local setup

Set a local `RQ2_NEO4J_PASSWORD` in the environment or private Compose env file. From the repository root:

```sh
docker compose -f compose.dev.yml -f compose.rq2-dev.yml up --build -d
bash documents/research/tools/seed-rq2.sh
```

The three Neo4j services are internal to Compose. The seed creates a synthetic MicroSkill prerequisite graph for each scale. Every edge moves from one layer to the previous layer, and edges between neighboring groups connect the graph without increasing average degree as the graph grows. These graphs model the directed prerequisite workload and contain only MicroSkill nodes. They do not reproduce the application's ontology label mix.

Open the existing RQ2 page as Platform Admin. Compare runs at the same sample size and warm-up count. The backend rejects missing configuration, duplicate endpoints, incorrect node counts, and insufficient directed 3/4/5-hop coverage. It verifies the existing fixture pairs before supplementing from the seeded graph. The existing JSON format is retained. Breakdown fields have no per-phase measurements.

## Chạy riêng một quy mô

Trình chạy độc lập dùng cùng service đo với dự án. Chỉ cần Java/Maven trên máy và Docker chạy một Neo4j cục bộ. Dừng stack chính trước nếu thiếu RAM. Đặt `RQ2_NEO4J_PASSWORD` trong môi trường local, rồi chạy:

```sh
for scale in 1k 5k 10k; do
  bash documents/research/tools/run-rq2-standalone.sh "$scale" || break
done
```

Mỗi lượt nạp graph synthetic, kiểm tra kích thước và đường đi, warm-up 50 lần, đo 100 lần và ghi JSON vào `documents/research/results/`. Script dừng container của lượt đo khi thoát và giữ volume. Các cổng Bolt chỉ mở trên loopback. Ba quy mô phải được đo tuần tự trên cùng cấu hình để so sánh.
