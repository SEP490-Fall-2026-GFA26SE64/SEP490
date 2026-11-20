# Kịch bản thuyết trình: Nghiên cứu Khoa học RQ2 & Graph Benchmark (3 Phút)
## Trọng tâm: Đo lường Khả năng Mở rộng (Scalability) của Đồ thị Tri thức Neo4j

> **Thời lượng:** ~3 phút (Tốc độ nói vừa phải, dứt khoát, chuyên nghiệp).  
> **Tài khoản:** `platform.admin@adaptlearngraph.com` | **Mật khẩu:** `Platform-Admin-490!` (hoặc `Brightpath@Demo2026`).  
> **Màn hình:** `/workspace/brightpath/platform/graph-benchmark` (Platform Admin).

---

## ⏱️ [00:00 – 00:30] (30 giây): ĐẶT VẤN ĐỀ & CÂU HỎI NGHIÊN CỨU RQ2

### 🖱️ Thao tác màn hình:
- Đang đứng tại trang **Graph Latency & Scalability Benchmark**.
- Để chuột ở khu vực tổng quan các chỉ số KPI.

### 🎙️ Lời thoại trình bày:
> *"Kính thưa Hội đồng, một câu hỏi sống còn về mặt kỹ thuật của đề tài Adapt-Learn-Graph là: **Khi doanh nghiệp mở rộng quy mô từ 1.000 lên 10.000 kỹ năng, liệu thuật toán tìm đường và sinh lộ trình học thích ứng có bị nghẽn (bottleneck) hay không?**"*
>
> *"Để trả lời Câu hỏi Nghiên cứu số 2 (RQ2), chúng tôi đã xây dựng phân hệ đo lường thực nghiệm trực tiếp trên Platform Admin để kiểm chứng độ trễ của các truy vấn tìm đường đi sâu từ **3 đến 5 bước nhảy (hops)** trên 3 mức quy mô đồ thị từ 1k, 5k đến 10k nodes."*

---

## ⏱️ [00:30 – 01:15] (45 giây): THIẾT KẾ THỰC NGHIỆM CHUẨN KHOA HỌC

### 🖱️ Thao tác màn hình:
- Chuyển nhanh sang tab **Benchmark Setup (Cấu hình Benchmark)**.
- Chỉ vào danh sách quy mô đồ thị: `1k nodes` (~5.1k edges), `5k nodes` (~25.8k edges), `10k nodes` (~52.4k edges).
- Lướt nhanh qua bảng **Fixture Preview Table** (các cặp Start $\rightarrow$ Target đã chứng thực $3..5$ hops).

### 🎙️ Lời thoại trình bày:
> *"Thực nghiệm của chúng tôi tuân thủ chặt chẽ 2 nguyên tắc đo đạc chuẩn khoa học:"*
>
> * **Thứ nhất: Tiền lấy mẫu kiểm thử (Offline Pre-sampling Fixtures):**  
>   *"Chúng tôi **không bốc ngẫu nhiên node trong lúc bấm giờ** để tránh đồ thị bị ngắt quãng hoặc gây nhiễu phép đo. Danh sách 1.000 cặp node đã được lọc trước bằng Cypher `length(p) IN [3..5]` và đóng băng cố định, đảm bảo tính tái lập 100% (Reproducibility)."*
>
> * **Thứ hai: Cơ chế Warm-up Cache:**  
>   *"Hệ thống chạy 50 truy vấn khởi động trước khi đo, giúp máy ảo Java tối ưu JIT Compilation và nạp dữ liệu vào Page Cache trên RAM, loại trừ hoàn toàn độ trễ ảo của lần đầu đọc ổ đĩa."*

---

## ⏱️ [01:15 – 02:15] (60 giây): TRÌNH DIỄN ĐO TRỰC TIẾP & 4 BƯỚC THUẬT TOÁN

### 🖱️ Thao tác màn hình:
- Chuyển về tab **Giám sát (Live Monitor)**.
- Bấm nút **Run Benchmark** (quy mô 1k nodes) $\rightarrow$ Thấy thanh Warm-up (cam) chạy rồi sang Execution (xanh), Sparkline vẽ biểu đồ độ trễ.
- Chỉ vào card **4 bước phân rã thời gian chạy (Step-by-Step Runtime Breakdown)**.

### 🎙️ Lời thoại trình bày:
> *"Tôi xin phép kích hoạt lượt đo trực tiếp. Như thầy cô thấy, hệ thống hoàn thành 50 lượt warm-up và bắt đầu đo đạc tuần tự 1.000 truy vấn."*
>
> *"Đặc biệt, thuật toán `shortestPath` trong Neo4j trải qua **4 bước tuần tự**:"*
> 1. *"**Bước 1: Index Lookup (0.2 ms - $O(\log N)$):** Neo4j không quét cả cây, mà tra cứu B-Tree Index trên RAM để lấy ngay địa chỉ bộ nhớ của Start và Target."*
> 2. *"**Bước 2: Khởi tạo Queue & Bộ nhớ (0.1 ms - $O(1)$):** Chuẩn bị hàng đợi duyệt trong RAM."*
> 3. *"**Bước 3: Traversal hai chiều Index-Free Adjacency (chiếm 85-90% thời gian):** Bước quan trọng nhất! Ở đây Neo4j **hoàn toàn không dùng Index nữa**. Nó áp dụng nguyên lý **'đào hầm 2 đầu' (Bidirectional BFS)**, lần theo các con trỏ bộ nhớ vật lý $O(1)$ từ 2 phía. Ngay khoảnh khắc chạm nhau ở node trung gian, **thuật toán dừng lại ngay lập tức** mà không duyệt thừa các nhánh khác."*
> 4. *"**Bước 4: Path Reconstruction (1 ms):** Nối hai nửa đường đi và trả kết quả."*

---

## ⏱️ [02:15 – 03:00] (45 giây): KẾT QUẢ THỰC NGHIỆM & NGUYÊN NHÂN 8.5 ms CHÊNH LỆCH

### 🖱️ Thao tác màn hình:
- Chọn sang mức **10k nodes** $\rightarrow$ Bấm **Run Benchmark** để kích hoạt bảng phân tích so sánh Delta.
- Chỉ vào các chỉ số: **1k (8.4 ms) $\rightarrow$ 10k (16.9 ms)**, **P95: 31.5 ms**.

### 🎙️ Lời thoại trình bày:
> *"Kết quả thực nghiệm cho thấy một con số đầy ấn tượng:"*
>
> *"Khi dữ liệu của tổ chức phình to gấp **10 lần** (từ 1.000 lên 10.000 nodes):"*
> * *"Thời gian phản hồi trung bình chỉ tăng từ **8.4 ms lên 16.9 ms** - tức là độ trễ chỉ lệch vỏn vẹn **8.5 mili-giây** (tăng trưởng dưới tuyến tính Sub-linear 2.0x)."*
> * *"Chỉ số phân vị P95 cao nhất cũng chỉ **31.5 ms**, nằm sâu dưới ngưỡng thời gian thực 100 ms."*
>
> *"**Vậy 8.5 ms chênh lệch này đến từ đâu?**"*
> 1. *"**65% (~5.5 ms)** đến từ **Hệ số phân nhánh (Branching Factor)**: Đồ thị 10k có liên kết dày hơn nên phải thử nhiều ngã rẽ cục bộ hơn trước khi chạm nhau (chứ không phải do quét toàn database)."*
> 2. *"**25% (~2.1 ms)** do áp lực tráo đổi trang nhớ trên RAM (Page Cache Miss)."*
> 3. *"**10% (~0.9 ms)** do độ sâu cây B-Tree Index tăng thêm vài phép so sánh."*
>
> *"**Kết luận:** Kết quả này khẳng định kiến trúc đồ thị tri thức Neo4j của đề tài có năng lực mở rộng (Scalability) xuất sắc, sẵn sàng đáp ứng cho các doanh nghiệp quy mô hàng chục nghìn nhân sự. Tôi xin kết thúc phần trình bày."*

---

## 💡 Bảng tóm tắt nhanh để liếc nhìn khi thuyết trình

| Thời gian | Nội dung chính | Thao tác | Con số cần nhớ |
| :---: | :--- | :--- | :--- |
| **0:00 - 0:30** | Đặt vấn đề RQ2 | Đứng ở Monitor | Độ sâu 3–5 hops; 1k $\rightarrow$ 10k nodes |
| **0:30 - 1:15** | Phương pháp khoa học | Sang tab Setup | Pre-sampled Fixtures; 50 warm-up runs |
| **1:15 - 2:15** | Demo 4 bước chạy | Run 1k nodes | B-Tree (0.2ms) $\rightarrow$ Index-Free Adjacency (85-90%) |
| **2:15 - 3:00** | Kết quả & 8.5ms chênh lệch | Run 10k nodes | Tăng 10x $\rightarrow$ chỉ tăng 2.0x (8.4ms $\rightarrow$ 16.9ms); P95 31.5ms |
