# Kịch bản thuyết trình: Nghiên cứu Khoa học RQ2 & Graph Benchmark (3 Phút)
## Trọng tâm: Đo lường Khả năng Mở rộng (Scalability) của Đồ thị Tri thức Neo4j

---

## ⏱️ [00:00 – 00:30] (30 giây): ĐẶT VẤN ĐỀ & CÂU HỎI NGHIÊN CỨU RQ2

### 🎙️ Lời thoại trình bày:
> *"Kính thưa Hội đồng, một câu hỏi sống còn về mặt kỹ thuật của đề tài Adapt-Learn-Graph là: **Khi doanh nghiệp mở rộng quy mô từ 1.000 lên 10.000 kỹ năng, liệu thuật toán tìm đường và sinh lộ trình học thích ứng có bị nghẽn (bottleneck) hay không?**"*
>
> *"Để trả lời Câu hỏi Nghiên cứu số 2 (RQ2), chúng tôi đã xây dựng 1 trang trên tài khoản Platform Admin nhằm đo lường thực nghiệm trực tiếp để kiểm chứng độ trễ của các truy vấn tìm đường đi sâu từ **3 đến 5 bước nhảy (hops)** trên 3 mức quy mô đồ thị từ 1k, 5k đến 10k nodes."*

---

## ⏱️ [00:30 – 01:15] (45 giây): THIẾT KẾ THỰC NGHIỆM CHUẨN KHOA HỌC

### 🎙️ Lời thoại trình bày:
> *"Thực nghiệm của chúng tôi tuân thủ chặt chẽ 2 nguyên tắc đo đạc chuẩn khoa học:"*
>
> * **Thứ nhất: Tiền lấy mẫu kiểm thử (Offline Pre-sampling Fixtures):**  
>   *"Chúng em đã chuẩn bị 3 set đã xác định cặp node start và target để chắc chắn rằng nó luôn nhảy từ 3-5 hops."*
>
> * **Thứ hai: Cơ chế Warm-up Cache:**  
>   *"Hệ thống chạy 50 truy vấn khởi động trước khi đo, giúp loại trừ hoàn toàn độ trễ ảo của lần đầu đọc ổ đĩa."*

---

## ⏱️ [01:15 – 02:15] (60 giây): TRÌNH DIỄN ĐO TRỰC TIẾP & 4 BƯỚC THUẬT TOÁN

### 🎙️ Lời thoại trình bày:
> *"Tôi xin phép kích hoạt lượt đo trực tiếp. Như thầy cô thấy, hệ thống hoàn thành 50 lượt warm-up và bắt đầu đo đạc tuần tự 1.000 truy vấn."*
>
> *"Đặc biệt, thuật toán `shortestPath` trong Neo4j trải qua **4 bước tuần tự**:"*
> 1. *"**Bước 1: Index Lookup (0.2 ms - $O(\log N)$):** Neo4j dùng B-Tree Index trên RAM để tìm và lấy ngay địa chỉ của Start và Target."*
> 2. *"**Bước 2: Khởi tạo Queue & Bộ nhớ (0.1 ms - $O(1)$):** Chuẩn bị queue cho start và target để chứa các node đã đi qua."*
> 3. *"**Bước 3: Traversal hai chiều Index-Free Adjacency (chiếm 85-90% thời gian):** Bước quan trọng nhất! Ở đây Neo4j áp dụng nguyên lý **(Bidirectional BFS)**, và dùng **Index-Free Adjacency** để traverse từ 2 phía. Ngay khoảnh khắc chạm nhau ở node trung gian, **thuật toán dừng lại**."*
> 4. *"**Bước 4: Path Reconstruction (1 ms):** Nối hai nửa đường đi và trả kết quả."*

---

## ⏱️ [02:15 – 03:00] (45 giây): KẾT QUẢ THỰC NGHIỆM & NGUYÊN NHÂN 8.5 ms CHÊNH LỆCH

### 🎙️ Lời thoại trình bày:
> *"Kết quả thực nghiệm cho thấy một con số đầy ấn tượng:"*
>
> *"Khi dữ liệu của tổ chức phình to gấp **10 lần** (từ 1.000 lên 10.000 nodes):"*
> * *"Thời gian phản hồi trung bình chỉ tăng từ **8.4 ms lên 16.9 ms** - tức là độ trễ chỉ lệch vỏn vẹn **8.5 mili-giây** (tăng trưởng dưới tuyến tính Sub-linear 2.0x)."*
> * *"Chỉ số phân vị P95 cao nhất cũng chỉ **31.5 ms**, nằm sâu dưới ngưỡng thời gian thực 100 ms."*
>
> *"**Kết luận:** Kết quả này khẳng định kiến trúc đồ thị tri thức Neo4j của đề tài có năng lực mở rộng (Scalability) xuất sắc, sẵn sàng đáp ứng cho các doanh nghiệp quy mô hàng chục nghìn nhân sự. Tôi xin kết thúc phần trình bày."*

---

## 💡 Bảng tóm tắt nhanh để liếc nhìn khi thuyết trình

| Thời gian | Nội dung chính | Con số cần nhớ |
| :---: | :--- | :--- |
| **0:00 - 0:30** | Đặt vấn đề RQ2 & Mục tiêu | Độ sâu 3–5 hops; 3 quy mô 1k $\rightarrow$ 5k $\rightarrow$ 10k nodes |
| **0:30 - 1:15** | Phương pháp khoa học | Pre-sampled Fixtures; 50 warm-up runs |
| **1:15 - 2:15** | 4 bước chạy thuật toán | B-Tree (0.2ms) $\rightarrow$ Index-Free Adjacency ($O(1)$, chiếm 85-90%) |
| **2:15 - 3:00** | Kết quả thực nghiệm & Kết luận | Dữ liệu tăng 10x $\rightarrow$ Độ trễ chỉ tăng 2.0x (8.4ms $\rightarrow$ 16.9ms); P95 31.5ms |
