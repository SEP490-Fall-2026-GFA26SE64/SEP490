# Nghiên cứu liên quan và bản đồ bằng chứng

> Bản dịch tiếng Việt để tham khảo. Bản chính là [RELATED_WORK.md](RELATED_WORK.md); nếu hai bản khác nhau thì theo bản tiếng Anh. Tên bài báo và thư mục tài liệu giữ nguyên tiếng Anh.

Cập nhật 22/11/2026. Đây là tổng quan tài liệu ban đầu có trọng tâm, phục vụ thiết kế nghiên cứu. Nó không phải tổng quan có hệ thống, cũng không phải khẳng định đầy đủ về tính mới.

Nghiên cứu đánh giá một hệ thống đã có sẵn, dựa trên quy tắc và bằng chứng, trong bối cảnh Application Developer. Nghiên cứu:
- Không giới thiệu một mô hình knowledge tracing có huấn luyện.
- Không tuyên bố rằng đồ thị tri thức là điều mới trong gợi ý giáo dục.

## Quy trình tìm kiếm và tiêu chí chọn

**Từ khoá tìm kiếm ban đầu:**
- `knowledge graph learning path recommendation prerequisite`
- `path-based educational recommendation generalization`
- `knowledge tracing procedural knowledge`
- `sampled recommendation metrics`
- `rigorous benchmarking`

Ngoài ra có tìm riêng về phương pháp luận Design Science Research. Các nguồn được kiểm tra ngày 22/11/2026.

**Tiêu chí chọn và loại:**
- Chọn nghiên cứu gốc có hồ sơ tác giả/nhà xuất bản truy vết được, và liên quan trực tiếp tới phương pháp, cách đánh giá hoặc giới hạn của nghiên cứu này.
- Coi preprint là preprint.
- Dùng tài liệu chính thức của thư viện/database để hiểu ngữ nghĩa triển khai, không coi đó là bằng chứng về hiệu quả giáo dục.
- Loại các khẳng định mang tính quảng cáo và các so sánh không có cơ sở giữa Neo4j và database quan hệ.
- Không chuyển bất kỳ lợi thế số liệu nào từ bài báo khác sang dự án này.

**Mức độ đọc.** Phần dưới đây phân biệt mức sàng lọc theo tóm tắt với các phần toàn văn đã được đọc. Trước khi nộp bài cần:
- Mở rộng việc lần theo trích dẫn.
- Ghi lại quyết định sàng lọc.
- So sánh thêm các công trình gần đây.

Một khẳng định về tính mới đủ để công bố cần tổng quan rộng hơn như vậy.

## Ma trận bằng chứng

| ID | Nguồn và mức độ đã đọc | Nguồn xác lập điều gì | Hệ quả cho nghiên cứu này |
|---|---|---|---|
| R1 | Peffers và cộng sự, 2007; PDF bài gốc, các đoạn về phương pháp luận | Quy trình design science nối các bước: xác định vấn đề, mục tiêu, xây dựng hiện vật, trình diễn, đánh giá và truyền đạt | Dùng để tổ chức việc đánh giá hiện vật; bản thân nó không xác nhận nền tảng này |
| R2 | Frej và cộng sự, LAK 2024; toàn văn bản preprint của tác giả, phần phương pháp và nghiên cứu | Gợi ý giáo dục theo đường đi trên đồ thị tri thức đã được đánh giá với dữ liệu giáo dục và một nghiên cứu hướng tới người học | Gợi ý giáo dục dựa trên đồ thị tri thức là hướng đã có; phép đánh giá giả lập của chúng ta không được mô tả như một nghiên cứu người dùng |
| R3 | Afreen và cộng sự, UMAP 2025; trích đoạn tìm kiếm của nhà xuất bản và bài tổng quan của đồng tác giả, chưa truy cập đủ toàn văn | Đưa bộ gợi ý suy luận theo đường đi vào giáo dục cần đánh giá trên các khía cạnh tiện ích, ngoài tiện ích và giải thích | Cải thiện độ phù hợp hẹp hơn nhiều so với vượt trội giáo dục nói chung; cần trích xuất toàn văn trước khi so sánh chi tiết về phương pháp |
| R4 | Cheng và cộng sự, 2025, preprint KnowLP v2; tổng quan phương pháp và mục 5.8 | Kết hợp cấu trúc tiên quyết và cấu trúc tương đồng với một phương pháp gợi ý có học máy; có đánh giá bằng bộ mô phỏng | Quy tắc bằng chứng tất định của chúng ta khác cách tiếp cận có học máy này; giả định mô phỏng phải được công bố, không được đánh đồng với kết quả học thật |
| R5 | Corbett và Anderson, 1994; tóm tắt của nhà xuất bản và hồ sơ thư mục | Knowledge tracing ước lượng xác suất kiến thức thay đổi trong lúc người học luyện kỹ năng lập trình | Không gọi rule engine hiện tại là Bayesian Knowledge Tracing; giữ nguyên câu chữ RQ3 đã đăng ký và công bố ranh giới triển khai |
| R6 | Krichene và Rendle, KDD 2020; trang nghiên cứu của tác giả và bản tóm tắt mở rộng gốc | Thước đo xếp hạng tính trên mẫu có thể đảo kết quả so sánh tương đối giữa các bộ gợi ý | Giữ catalog xếp hạng chung; quyết định độ phủ chấm trước đánh giá cuối và không bao giờ coi mục chưa chấm là không phù hợp |
| R7 | Kalibera và Jones, ISMM 2013; hồ sơ công bố của tác giả và tóm tắt | Đánh giá hiệu năng phải tính tới độ biến động và các mức lặp thí nghiệm | Ghi môi trường, lặp các khối đo và báo cáo độ biến động; cùng seed không đảm bảo thời gian giống nhau |

## Định vị nghiên cứu có thể bảo vệ

**Đóng góp đề xuất** là một phép đánh giá hệ thống có giới hạn. Các thành phần sau được đánh giá cùng nhau trong một trường hợp phát triển nhân sự:
- Yêu cầu tường minh theo vị trí–cấp.
- Ánh xạ học phần tương thích phiên bản.
- Sự phân biệt giữa bằng chứng chẩn đoán và bằng chứng chính thức.
- Việc điều chỉnh lộ trình do bằng chứng kích hoạt.

Ba thí nghiệm đánh giá độ phù hợp của gợi ý, chi phí truy vấn tiên quyết có hướng, và việc thích ứng trong mô phỏng với cùng ngân sách hoạt động.

**Giới hạn của khẳng định.** Đây là đóng góp đề xuất, không phải khẳng định rằng chưa có công trình nào trước đây kết hợp đồ thị và thích ứng. Câu hỏi cụ thể là bản triển khai này có hữu ích hay không, dưới catalog, quy tắc bằng chứng, dữ liệu và giả định mô phỏng đã nêu.
- **RQ1:** phép so sánh chính đo ánh xạ có cấu trúc so với khớp văn bản. Nó không thể tách riêng lợi ích của cấu trúc tiên quyết tại một snapshot ban đầu vốn không mở rộng các tiên quyết chưa được đánh giá.
- **RQ2:** là microbenchmark truy vấn đồ thị, không phải phép so sánh thông lượng đầu-cuối hay Neo4j với SQL.

## Thư mục tài liệu

**R1.** Ken Peffers, Tuure Tuunanen, Marcus A. Rothenberger, and Samir Chatterjee. 2007. *A Design Science Research Methodology for Information Systems Research*. Journal of Management Information Systems 24(3), 45–77. [DOI](https://doi.org/10.2753/MIS0742-1222240302). [PDF bài gốc](https://zhang.ist.psu.edu/teaching/504/readings/Peffers.pdf). Năm trích dẫn của nhà xuất bản là 2007; số tạp chí là Winter 2007–08.

**R2.** Jibril Frej, Neel Shah, Marta Knežević, Tanya Nazaretsky, and Tanja Käser. 2024. *Finding Paths for Explainable MOOC Recommendation: A Learner Perspective*. LAK '24. [DOI](https://doi.org/10.1145/3636555.3636898). [Preprint của tác giả, nộp năm 2023](https://arxiv.org/abs/2312.10082). [Toàn văn](https://arxiv.org/html/2312.10082v1).

**R3.** Neda Afreen, Giacomo Balloccu, Ludovico Boratto, Gianni Fenu, Francesca Maridina Malloci, Mirko Marras, and Andrea Giovanni Martis. 2025. *Can Path-Based Explainable Recommendation Methods based on Knowledge Graphs Generalize for Personalized Education?* Trong Proceedings of the 33rd ACM Conference on User Modeling, Adaptation and Personalization (UMAP '25), 273–278. ACM, New York, NY, USA. [DOI](https://doi.org/10.1145/3699682.3728323). [Bài tổng quan của đồng tác giả](https://www.ludovicoboratto.com/can-path-based-explainable-recommendation-methods-based-on-knowledge-graphs-generalize-for-personalized-education/). Thứ tự tác giả và số trang đã đối chiếu với hồ sơ Crossref ngày 25/11/2026; việc trích xuất chi tiết về thí nghiệm từ toàn văn vẫn chưa làm.

**R4.** Xinghe Cheng, Zihan Zhang, Jiapu Wang, Liangda Fang, Chaobo He, Quanlong Guan, Shirui Pan, and Weiqi Luo. 2025. *GraphRAG-Induced Dual Knowledge Structure Graphs for Personalized Learning Path Recommendation*. arXiv preprint 2506.22303, v2. [Hồ sơ](https://arxiv.org/abs/2506.22303). [Toàn văn](https://arxiv.org/html/2506.22303v2). Không suy ra hội nghị/tạp chí có bình duyệt nào từ hồ sơ này.

**R5.** Albert T. Corbett and John R. Anderson. 1994. *Knowledge tracing: Modeling the acquisition of procedural knowledge*. User Modeling and User-Adapted Interaction 4, 253–278. [Hồ sơ nhà xuất bản](https://doi.org/10.1007/BF01099821).

**R6.** Walid Krichene and Steffen Rendle. 2020. *On Sampled Metrics for Item Recommendation*. Trong Proceedings of KDD '20, 1748–1757. [DOI](https://doi.org/10.1145/3394486.3403226). [Hồ sơ nghiên cứu của tác giả](https://research.google/pubs/on-sampled-metrics-for-item-recommendation/). [Bản tóm tắt mở rộng năm 2021 của tác giả](https://www.ijcai.org/proceedings/2021/0651.pdf).

**R7.** Tomas Kalibera and Richard Jones. 2013. *Rigorous Benchmarking in Reasonable Time*. ISMM '13, 63–74. [DOI](https://doi.org/10.1145/2464157.2464160). [Hồ sơ công bố của tác giả](https://www.cs.kent.ac.uk/people/staff/rej/pubs.html).

**T1.** Neo4j. *Cypher 5 Manual: shortest-path functions*. [Tài liệu](https://neo4j.com/docs/cypher-manual/5/patterns/reference/shortest-paths/). Cố định đúng phiên bản database đã cài và ghi lại query plan; cận dưới độ dài đường đi của hàm nên là 0 hoặc 1.

**T2.** scikit-learn. *TfidfVectorizer*. [Tài liệu](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html). Cố định phiên bản thư viện dùng trong thí nghiệm, thay vì dựa vào URL `stable` luôn thay đổi.

**T3.** scikit-learn. *ndcg_score*. [Tài liệu](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.ndcg_score.html). Protocol phải cố định quy ước gain và xử lý hoà; kết quả của thư viện được đối chiếu với các ví dụ tính tay.
