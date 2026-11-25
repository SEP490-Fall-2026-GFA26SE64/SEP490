# Lộ trình học tập thích ứng dựa trên đồ thị tri thức để phát triển năng lực nhân sự

Bản thảo · Nhóm dự án Adapt-Learn-Graph · SEP490 (FA26SE267) · 25/11/2026

Trạng thái: kết quả pilot. Giả định của bộ mô phỏng, catalog RQ1 và quan hệ tiên quyết chưa được chuyên gia độc lập rà soát.

> Bản dịch tiếng Việt để tham khảo. Bản chính là [RESEARCH_MANUSCRIPT.md](RESEARCH_MANUSCRIPT.md) (tiếng Anh); nếu hai bản khác nhau thì theo bản tiếng Anh. Số liệu giữ dấu chấm thập phân như bản gốc.

## Tóm tắt

Nền tảng đào tạo nhân sự cần chọn học phần lấp đúng khoảng trống so với vị trí mục tiêu, và cập nhật lộ trình khi có bằng chứng đánh giá mới.

Chúng tôi đánh giá một prototype đồ thị năng lực theo ba hướng:
- Mức trùng của gợi ý với lựa chọn chuyên gia.
- Độ trễ truy vấn đồ thị.
- So sánh có ghép cặp giữa lộ trình tĩnh và lộ trình thích ứng.

**Mức trùng gợi ý.** Trên 50 hồ sơ Application Developer giả lập và catalog 72 học phần, phương pháp khớp đồ thị có ít nhất một gợi ý trùng đúng mã với danh sách đồng thuận ở 48 hồ sơ (96%). Phương pháp đối chứng dựa trên nội dung TF–IDF đạt 41 hồ sơ (82%). Số module trùng trung bình trong 5 gợi ý đầu lần lượt là 2.30 và 1.28.

**Độ trễ truy vấn.** Truy vấn tiên quyết có hướng trên Neo4j chạy trên ba đồ thị giả lập riêng biệt 1.000, 5.000 và 10.000 nodes, mỗi quy mô 4 lần chạy. Độ trễ trung vị nằm trong khoảng 6–20 ms. Dao động giữa các lần chạy lớn ngang chênh lệch giữa các kích thước, và độ trễ không tăng đơn điệu theo kích thước.

**Lộ trình thích ứng.** Thí nghiệm dùng 100 học viên giả lập, 30 lần lặp có seed, ngân sách 40 đơn vị hoạt động. Tính lại lộ trình thích ứng theo bằng chứng (A0), chạy qua chính các bước chuyển trạng thái tính lại của ứng dụng, giảm khoảng cách mục tiêu còn lại từ 0.7067 xuống 0.5701. Lộ trình tĩnh cố định (S0) chỉ giảm xuống 0.6128.
- Mức cải thiện so cặp trung bình là 0.0427 (khoảng tin cậy bootstrap 95% [0.0342, 0.0520]).
- Tỷ lệ hoàn tất lộ trình tăng từ 49.40% lên 61.83%.
- Một lộ trình tĩnh mở rộng toàn bộ tiên quyết chưa đạt ngay từ đầu (S1) đạt 0.5565, thấp hơn A0.

Bằng chứng hỗ trợ các kết luận mang tính mô tả về mức trùng với danh sách đồng thuận, về workload truy vấn đã đo, và về việc bù tiên quyết dưới mô hình học viên đã giả định.

## 1 Giới thiệu

Nhân viên hướng tới cùng một vị trí có thể thiếu những năng lực khác nhau. Nếu catalog chỉ tổ chức theo tên khoá học thì khó nối khoảng trống đó với kỹ năng và cấp độ kiến thức mà một học phần dạy.

Adapt-Learn-Graph biểu diễn dưới dạng dữ liệu có cấu trúc: yêu cầu của vị trí, kỹ năng, cấp độ, quan hệ "học phần dạy kỹ năng" và quan hệ tiên quyết. Bài đánh giá baseline xác định nhu cầu học ban đầu. Các bài đánh giá sau cung cấp bằng chứng mới và có thể kích hoạt tính lại lộ trình.

Nghiên cứu tách thành ba câu hỏi:
- **RQ1:** gợi ý học phần ban đầu trùng với danh sách đồng thuận của chuyên gia ở mức nào.
- **RQ2:** độ trễ truy vấn đường đi tiên quyết có hướng thay đổi ra sao qua ba kích thước đồ thị.
- **RQ3:** với cùng ngân sách hoạt động, tính lại lộ trình theo bằng chứng có giảm khoảng cách tới vị trí mục tiêu nhiều hơn lộ trình tĩnh hay không.

Câu chữ đã đăng ký và định nghĩa vận hành nằm trong [khung nghiên cứu](RESEARCH_FRAMEWORK.md).

## 2 Nghiên cứu liên quan

- **Phương pháp luận.** Chúng tôi theo hướng design science, tách việc xây dựng hệ thống khỏi việc đánh giá (Peffers và cộng sự, 2007).
- **Gợi ý theo đường đi.** Gợi ý dựa trên đường đi có thể cho thấy các quan hệ đứng sau một gợi ý học tập (Frej và cộng sự, 2024). Đưa các bộ gợi ý giải thích được theo đường đi vào giáo dục cần đánh giá rộng hơn độ chính xác (Afreen và cộng sự, 2025).
- **Đối chứng văn bản.** Chúng tôi so khớp có cấu trúc với một phương pháp đối chứng dựa trên văn bản, để phân biệt "trùng với chuyên gia" với "giống nhau về nội dung". Nhận định độ phù hợp tính trên mẫu hoặc chỉ có một phần có thể làm thay đổi kết quả so sánh giữa các bộ gợi ý (Krichene và Rendle, 2020). Vì vậy cả hai phương pháp xếp hạng trên toàn catalog, và phép so sánh với danh sách đồng thuận hiện tại không suy ra recall trên toàn catalog.
- **Đo độ trễ.** Phân tích độ trễ phân biệt một lần đo đơn lẻ với một hiệu ứng lặp lại được qua nhiều lần chạy độc lập (Kalibera và Jones, 2013).
- **Knowledge tracing.** Ở RQ3, hệ thống được đánh giá tính lại lộ trình từ bằng chứng đánh giá. Bayesian knowledge tracing (Corbett và Anderson, 1994) là nghiên cứu liên quan và nằm ngoài phép so sánh đã triển khai.

## 3 Dữ liệu và phương pháp

### 3.1 Mức trùng của gợi ý

**Dữ liệu.**
- Catalog Application Developer có 20 kỹ năng và 72 đặc tả học phần giả lập, trải qua ba cấp Foundation, Intermediate và Advanced.
- Bộ hồ sơ giả lập gồm 450 hồ sơ development và 50 hồ sơ giữ riêng để đánh giá, thuộc ba cấp Junior, Middle và Senior.
- Mỗi hồ sơ ghi cấp vị trí mục tiêu, bằng chứng trước đó còn tương thích, và kết quả baseline đạt/trượt theo từng kỹ năng và cấp độ kiến thức.
- Đạt baseline có thể miễn một nhiệm vụ học ban đầu nhưng không tạo thành tích chính thức.

**Hai phương pháp.** Cả hai xếp hạng cùng 72 ứng viên và đều trả về 5 gợi ý.
- **G0** cho điểm khi học phần khớp đúng kỹ năng, cấp độ kiến thức và phiên bản còn thiếu, dựa trên quan hệ "học phần dạy kỹ năng".
- **C0** xếp hạng theo độ tương đồng cosine giữa biểu diễn TF–IDF của nhu cầu học và văn bản học phần.

**Tham chiếu.** Tham chiếu là phần giao theo đúng mã của hai danh sách ưu tiên đã nộp, trong [workbook đồng thuận](RQ1_Golden_Set_50_Dong_Thuan.xlsx).
- Hai danh sách trùng hoàn toàn ở 23 hồ sơ và khác nhau ở 27 hồ sơ. Với 27 hồ sơ đó, chỉ các lựa chọn chung được đưa vào tham chiếu.
- Các mã module thay thế được ghi riêng và không tính vào điểm.

**Thước đo.** Với mỗi hồ sơ, số lần trùng là số mã module có mặt cả trong Top 5 của phương pháp lẫn danh sách đồng thuận. Chúng tôi báo cáo:
- Tỷ lệ hồ sơ có ít nhất một lần trùng (Hit Rate@5 so với danh sách đồng thuận).
- Số lần trùng trung bình mỗi hồ sơ.
- Recall theo danh sách đồng thuận, tức số lần trùng chia cho độ dài danh sách.

Chênh lệch so cặp G0 − C0 dùng bootstrap phân vị 10.000 lần lấy mẫu lại theo hồ sơ. Module nằm ngoài tham chiếu được coi là chưa được chấm. Các thước đo này vận hành hoá "mức trùng với lựa chọn ưu tiên", không đo độ phù hợp trên toàn catalog.

### 3.2 Độ trễ truy vấn tiên quyết có hướng

- **Đồ thị.** Trình chạy RQ2 dùng Neo4j Community 5.26.33 trên ba đồ thị giả lập riêng biệt gồm các node MicroSkill. Cạnh tiên quyết đi từ kỹ năng phụ thuộc tới kỹ năng tiên quyết của nó. Mọi đồ thị đều có 1.8 quan hệ có hướng trên mỗi node.
- **Workload.** Trước khi đo, workload kiểm tra rằng các đường đi ngắn nhất có hướng hợp lệ dài 3, 4 và 5 hops.
- **Cách đo.** Mỗi quy mô dùng 50 truy vấn khởi động (warm-up) và 100 truy vấn đo. Bộ đếm giờ của Neo4j driver tính cả thời gian thực thi truy vấn lẫn đọc hết kết quả. Chúng tôi báo cáo P50, P95 và độ trễ trung bình (wall-clock) lấy từ các phản hồi đã lưu.
- **Số lần chạy.** Mỗi quy mô chạy một lần ngày 24/11 và thêm ba vòng ngày 25/11, đổi thứ tự quy mô mỗi vòng. Chúng tôi báo cáo trung vị và khoảng giá trị qua ba vòng đó.

### 3.3 Hiệu quả lộ trình thích ứng

**Thiết kế.** Thí nghiệm so sánh trên 100 hồ sơ Application Developer giả lập (34 Junior, 33 Middle, 33 Senior), tách biệt với bộ golden của RQ1, qua 30 lần lặp ngẫu nhiên có seed. Ba chính sách bắt đầu với cùng trạng thái học viên, cùng bằng chứng chính thức và cùng chuỗi số ngẫu nhiên ghép cặp:
- **S0 (tĩnh):** giữ cố định chương trình suy ra từ baseline, cho phép làm lại bài theo chính sách đánh giá chung.
- **A0 (thích ứng):** sau mỗi bài đánh giá kỹ năng, áp dụng chính bước chuyển "bổ sung" của ứng dụng (`RequirementPathwayRecalculationService.supplement`). Khi một nhóm tiên quyết chưa có thành tích chính thức bị trượt, A0 thêm (hoặc dùng lại) bước tiên quyết đó. Bước phụ thuộc bị chặn cho tới khi có bằng chứng chính thức cho tiên quyết.
- **S1 (tĩnh, dùng để kiểm tra độ nhạy):** mở rộng toàn bộ tiên quyết chưa đạt ngay từ đầu, theo thứ tự tô-pô.

**Quy tắc chung cho cả ba chính sách.**
- Làm mới kế hoạch qua cùng bước chuyển runtime cho từng bước.
- Chọn bước theo cùng một quy tắc: xoay vòng theo thứ tự hiện tại của kế hoạch.
- Adapter nghiên cứu cung cấp snapshot catalog và bằng chứng tách biệt, thay cho database và kho đồ thị.

**Chi phí và ngân sách.** Mỗi lượt học và mỗi lần làm bài tốn một đơn vị, kể cả khi trượt hay làm lại. Trước mỗi lần làm lại phải có một lượt ôn. Ngân sách là 40 đơn vị cho mỗi học viên và mỗi chính sách, với các mốc đo 0, 10, 20, 30 và 40.

**Thước đo chính.** Tại mỗi mốc, khoảng cách mục tiêu chính $D(u, b)$ là tỷ lệ yêu cầu mục tiêu (kỹ năng–cấp độ kiến thức–phiên bản) chưa có bằng chứng thành tích chính thức tương thích (`Rq3Distance`).
- Chúng tôi cũng theo dõi khoảng cách lỗ hổng bắt buộc ban đầu $D_{\text{gap}}(u, b)$, tính trên các nhu cầu học ban đầu chưa đạt của hồ sơ.
- Những thứ không được tính vào tập thành tích: tiên quyết nằm ngoài mục tiêu, việc miễn qua baseline, và các bước đã giải quyết nhưng không có bằng chứng chính thức.

**Phân tích.**
- Hiệu ứng chính là chênh lệch so cặp trung bình $\Delta D = D_{\text{S0}}(u, 40) - D_{\text{A0}}(u, 40)$ trên 100 học viên. Mỗi học viên lấy trung bình qua 30 lần lặp; khoảng tin cậy 95% dùng bootstrap phân vị 10.000 lần lấy mẫu lại.
- Khi học viên hoàn tất lộ trình sớm, phân tích giữ nguyên khoảng cách quan sát cuối cùng cho các mốc sau và ghi lại ngân sách thực tế đã dùng.
- Chi phí để đạt mục tiêu được cắt phải (right-censoring) tại mức ngân sách và tóm tắt bằng chi phí trung bình có giới hạn.
- Các lần chạy độ nhạy thay đổi η, λ, chi phí đánh giá (0.5/1/2), ngân sách (20/40/80), và thêm một đối chứng "kiến thức ban đầu bằng nhau".

[Protocol RQ3](RQ3_PATHWAY_EFFICIENCY_EXPERIMENT_3.md) mô tả chi tiết bộ mô phỏng và phân tích độ nhạy.

## 4 Kết quả

### 4.1 RQ1: mức trùng với lựa chọn đồng thuận

| Phương pháp | Hồ sơ có ít nhất 1 lần trùng | Hit Rate@5 | Số module trùng trung bình mỗi hồ sơ | Recall theo danh sách đồng thuận |
|---|---:|---:|---:|---:|
| G0: khớp đồ thị có cấu trúc | 48/50 | 96% | 2.30 / 5 | 0.836 |
| C0: TF–IDF theo nội dung | 41/50 | 82% | 1.28 / 5 | 0.548 |
| G0 trừ C0 (so cặp, CI bootstrap 95%) | 7 hồ sơ | +14 điểm % [+6, +24] | +1.02 [+0.72, +1.32] | +0.288 [+0.210, +0.369] |

Table: Bảng 1. RQ1: mức trùng của Top 5 G0 và C0 với danh sách đồng thuận (50 hồ sơ giữ riêng).

Trên nhóm hồ sơ này, G0 trùng với danh sách đồng thuận thường xuyên hơn và có mức trùng trung bình cao hơn.
- Xét từng hồ sơ: G0 trùng nhiều hơn ở 29 hồ sơ, bằng nhau ở 21, và không hồ sơ nào G0 kém hơn.
- Hai trường hợp G0 trượt đều là hồ sơ Middle có 9 lỗ hổng. Ở đó cả 5 gợi ý của G0 đều dạy một lỗ hổng, nhưng lựa chọn đồng thuận duy nhất lại nằm ngoài 5 vị trí.
- Các số liệu đã được tái tạo ngày 25/11/2026 từ hai workbook bằng engine benchmark ([report](results/rq1/20261125-rerun/report.json)).

Kết quả mang tính mô tả. Tham chiếu chỉ gồm các lựa chọn chung, nên một gợi ý không có trong đó vẫn có thể phù hợp. Kết quả này không chứng minh G0 vượt trội so với mọi gợi ý chấp nhận được, hay trên vị trí hoặc catalog khác.

### 4.2 RQ2: độ trễ trên ba đồ thị đã đo

| Nodes | Quan hệ tiên quyết | Lần chạy 24/11: P50 / P95 / Mean (ms) | 25/11, 3 vòng: P50 trung vị [khoảng] | P95 trung vị [khoảng] | Mean trung vị [khoảng] |
|---:|---:|---:|---:|---:|---:|
| 1.000 | 1.800 | 9.24 / 37.16 / 13.51 | 12.77 [11.10–16.25] | 45.29 [35.78–67.42] | 16.90 [16.67–24.06] |
| 5.000 | 9.000 | 6.01 / 17.25 / 7.65 | 17.79 [15.79–20.27] | 58.67 [56.84–76.24] | 24.83 [23.47–31.07] |
| 10.000 | 18.000 | 12.13 / 51.82 / 18.73 | 16.34 [15.39–16.54] | 53.11 [47.36–53.19] | 21.50 [21.00–23.13] |

Table: Bảng 2. RQ2: độ trễ truy vấn đường tiên quyết ngắn nhất có hướng 3–5 hops (50 truy vấn khởi động, 100 truy vấn đo mỗi lần chạy).

Mỗi lần chạy dùng 50 truy vấn khởi động và 100 truy vấn đo.
- Độ trễ nằm trong cùng một khoảng ở cả ba kích thước và không tăng đơn điệu.
- Dao động giữa các vòng ở cùng một kích thước tương đương chênh lệch giữa các kích thước.
- Mọi vòng ngày 25/11 đều chậm hơn các lần chạy ngày 24/11. Điều này cho thấy trạng thái máy ảnh hưởng tới giá trị tuyệt đối nhiều hơn kích thước đồ thị.

Kết quả chỉ áp dụng cho workload tiên quyết này, một seed đồ thị cho mỗi kích thước và bộ sinh đồ thị đã dùng. Đây không phải ước lượng độ phức tạp tiệm cận.

### 4.3 RQ3: kết quả lộ trình thích ứng

| Mốc ngân sách (đơn vị) | S0 tĩnh D(b) | A0 thích ứng D(b) | S1 mở rộng trước D(b) | ΔD so cặp (S0 − A0) | S0 lỗ hổng D_gap(b) | A0 lỗ hổng D_gap(b) | ΔD_gap so cặp (S0 − A0) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0.7067 | 0.7067 | 0.7067 | +0.0000 | 1.0000 | 1.0000 | +0.0000 |
| 10 | 0.6792 | 0.6748 | 0.6605 | +0.0044 | 0.7153 | 0.7244 | −0.0091 |
| 20 | 0.6541 | 0.6363 | 0.6186 | +0.0178 | 0.5109 | 0.4995 | +0.0114 |
| 30 | 0.6322 | 0.5995 | 0.5834 | +0.0327 | 0.3707 | 0.3134 | +0.0573 |
| 40 | 0.6128 | 0.5701 | 0.5565 | +0.0427 | 0.2616 | 0.1921 | +0.0695 |

Table: Bảng 3. RQ3: khoảng cách mục tiêu D(b) và khoảng cách lỗ hổng ban đầu D_gap(b) trung bình theo mốc ngân sách (100 hồ sơ × 30 lần lặp).

Tại ngân sách 40 đơn vị:
- **A0 so với S0:** A0 có khoảng cách mục tiêu còn lại thấp hơn S0 ở 72/100 hồ sơ, bằng ở 27, và hơi cao hơn ở 1 hồ sơ.
- **Mức giảm trung bình:** khoảng cách mục tiêu giảm $\Delta D(40) = +0.0427$ (CI bootstrap 95% $[+0.0342, +0.0520]$, $\text{SE} = 0.0046$). Khoảng cách lỗ hổng bắt buộc ban đầu giảm $\Delta D_{\text{gap}}(40) = +0.0695$ (CI 95% $[+0.0495, +0.0912]$).
- **S1 so với A0:** S1 thấp hơn A0, $D_{\text{S1}} - D_{\text{A0}} = -0.0136$ (CI 95% $[-0.0177, -0.0098]$).
- **Đóng lỗ hổng ban đầu:** trong 3.000 lượt (học viên × lần lặp), tỷ lệ đóng được lỗ hổng là 49.40% (S0), 61.83% (A0) và 64.40% (S1).
- **Chi phí:** chi phí trung bình có giới hạn để đóng lỗ hổng là 29.88, 28.17 và 27.59 đơn vị. Các lượt bị cắt (1.518, 1.145 và 1.068 lượt) được tính bằng B = 40.
- **Không lượt nào đạt D = 0,** vì các yêu cầu mục tiêu được miễn qua baseline không bao giờ nhận bằng chứng chính thức.
- **Bổ sung tiên quyết:** A0 bổ sung trung bình 1.26 yêu cầu tiên quyết mỗi lượt.

| Nhóm hồ sơ | Số hồ sơ | D(0) baseline | S0 D(40) cuối | A0 D(40) cuối | S1 D(40) cuối | ΔD so cặp (S0 − A0) | Hoàn tất S0 / A0 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Còn tiên quyết chưa đạt | 75 | 0.7699 | 0.6720 | 0.6151 | 0.5970 | +0.0569 | 34.09% / 50.67% |
| Đã đạt toàn bộ tiên quyết | 25 | 0.5169 | 0.4351 | 0.4351 | 0.4351 | +0.0000 | 95.33% / 95.33% |
| Cấp Junior | 34 | 0.7418 | 0.5969 | 0.5283 | 0.5059 | +0.0686 | 48.92% / 61.76% |
| Cấp Middle | 33 | 0.6863 | 0.6078 | 0.5779 | 0.5680 | +0.0299 | 52.93% / 64.34% |
| Cấp Senior | 33 | 0.6908 | 0.6341 | 0.6054 | 0.5972 | +0.0287 | 46.36% / 59.39% |

Table: Bảng 4. RQ3: khoảng cách cuối và tỷ lệ hoàn tất lộ trình theo nhóm hồ sơ.

**Lợi ích chỉ nằm ở nhóm còn thiếu tiên quyết.** Ở 25 hồ sơ đã có thành tích chính thức cho mọi yêu cầu tiên quyết từ baseline, S0, A0 và S1 cho kết quả giống hệt nhau ($\Delta D = 0.0000$). Lợi ích của A0 vì vậy chỉ nằm ở 75 hồ sơ còn tiên quyết chưa đạt ($\Delta D = +0.0569$).

**Diễn biến theo mốc.** Tại mốc 10, A0 có khoảng cách lỗ hổng bắt buộc cao hơn S0 ($0.7244$ so với $0.7153$), vì ngân sách ban đầu dồn vào các tiên quyết được bổ sung. Từ mốc 20 trở đi, A0 thấp hơn.

**Độ nhạy.**
- Qua mười cấu hình độ nhạy, ΔD(S0 − A0) luôn dương và khoảng tin cậy đều trên 0. Giá trị dao động từ +0.0177 (ngân sách 20) tới +0.0524 (ngân sách 80).
- S1 luôn thấp hơn A0 ở mọi cấu hình.
- Lợi ích vẫn còn khi bỏ liên kết tiên quyết ở mức câu hỏi (λ = 0, +0.0395). Điều này cho thấy lợi thế chủ yếu đến từ việc bộ chấm không công nhận thành tích khi nhóm tiên quyết còn trượt; S0 chỉ vượt qua điều kiện này nhờ may mắn.

[Hồ sơ kiểm chứng](evidence/rq3/20261125/README.md).

## 5 Thảo luận và giới hạn

**RQ1.** Bằng chứng gợi ý rằng khớp có cấu trúc theo kỹ năng và cấp độ tái tạo được nhiều lựa chọn ưu tiên chung hơn so với phương pháp đối chứng dựa trên văn bản, trên catalog giả lập hiện tại. Các giới hạn:
- Cùng một bộ định nghĩa vị trí vừa dựng catalog vừa tạo ra nhu cầu học hiển thị cho chuyên gia, điều này có thể có lợi cho phương pháp khớp đồ thị.
- Hồ sơ có nhiều yêu cầu chưa đạt buộc chuyên gia chọn ưu tiên một số nhu cầu hợp lệ trong giới hạn 5 học phần.
- Chỉ tính trùng đúng mã sẽ loại bỏ các học phần thay thế đạt mục tiêu tương đương.
- Tham chiếu ghi nhận mức đồng thuận giữa hai phiếu đã nộp, không ước lượng toàn bộ tập học phần phù hợp.

**RQ2.** Hệ thống chạy được workload 3–5 hops đã đặc tả trên ba kích thước đồ thị khác nhau. Ba vòng đổi thứ tự cho mỗi kích thước cho thấy dao động giữa các lần chạy cùng cỡ với chênh lệch giữa các kích thước. Để kết luận chắc hơn về ảnh hưởng của kích thước, cần thêm seed đồ thị, khối truy vấn lớn hơn và xuất đủ mẫu đo thô. Đồ thị giả lập chỉ có cạnh tiên quyết và node MicroSkill, nên số liệu không mô tả một ontology production hỗn hợp hay nhiều người dùng đồng thời.

**RQ3.** RQ3 phân biệt thành tích chính thức với việc miễn học qua baseline mang tính chẩn đoán.
- Đạt baseline chỉ miễn học ban đầu chứ không cấp bằng chứng chính thức. Vì vậy các yêu cầu mục tiêu được miễn nằm ngoài $E(u, b)$, trừ khi được học như một tiên quyết.
- Hệ quả là S1 đạt khoảng cách cuối thấp hơn A0 ($0.5565$ so với $0.5701$), vì S1 buộc học trước mọi tiên quyết chưa đạt. A0 tuân theo quy tắc của ứng dụng: chỉ bổ sung tiên quyết khi một lần trượt bài đánh giá cho thấy lỗ hổng.
- Mọi khác biệt quan sát được đều phụ thuộc vào mô hình học và đánh giá đã giả định, không chứng minh nhân viên thật học nhanh hơn.
- Giả định của bộ mô phỏng, rubric và quan hệ tiên quyết chưa được chuyên gia độc lập rà soát, nên kết quả RQ3 là pilot.

## 6 Các mối đe doạ tới tính hợp lệ

**Tính hợp lệ của cấu trúc khái niệm (construct).** RQ1 đo mức trùng đúng mã với phần giao của hai danh sách ưu tiên của chuyên gia, không phải độ phù hợp có thang điểm trên toàn catalog. Học phần thay thế tương đương không được tính, và recall theo danh sách bị giới hạn bởi danh sách tối đa 5 mục. RQ2 đo độ trễ phía driver cho một truy vấn cấu trúc, không phải việc lập lộ trình hay thời gian phản hồi đầu-cuối. RQ3 đo khoảng cách tới thành tích mục tiêu chính thức trong mô phỏng; nó không đo việc học của con người.

**Tính hợp lệ nội tại.** Ở RQ1, cùng một bộ định nghĩa vị trí vừa tạo ra ràng buộc catalog mà G0 dùng để khớp, vừa tạo ra nhu cầu học hiển thị cho chuyên gia, điều này có lợi cho G0. Ở RQ2, mỗi quy mô chỉ có một seed đồ thị và 100 truy vấn đo mỗi lần chạy. File kết quả chỉ giữ 30 thời gian đo thô, và trạng thái máy làm thay đổi giá trị tuyệt đối giữa các ngày. Ở RQ3, mọi chính sách dùng chung trạng thái học viên, luồng ngẫu nhiên, chi phí và các bước chấm điểm và tính lại của runtime. Mô hình học viên và tham số của nó là giả định; mười cấu hình độ nhạy và đối chứng kiến thức bằng nhau giới hạn, nhưng không loại bỏ, sự phụ thuộc này.

**Tính hợp lệ bên ngoài.** Mọi kết quả chỉ liên quan tới một nhóm vị trí (Application Developer), một catalog giả lập 72 học phần, hồ sơ giả lập, một đồ thị giả lập chỉ có quan hệ tiên quyết và một mô hình học viên chưa hiệu chỉnh. Chúng không chuyển được sang vị trí khác, nhân viên thật, ontology production hỗn hợp hay người dùng đồng thời.

**Tính hợp lệ của kết luận thống kê.** RQ1 dựa trên 50 hồ sơ, nên một hồ sơ làm Hit Rate@5 thay đổi 2 điểm phần trăm. Các lần lặp của RQ3 định lượng nhiễu mô phỏng; đơn vị độc lập của bootstrap là 100 hồ sơ, không phải 3.000 lượt chạy. RQ2 báo cáo khoảng giá trị qua ba vòng và không đưa ra khẳng định ý nghĩa thống kê nào.

## 7 Kết luận

- **RQ1:** G0 có mức trùng đúng mã cao hơn trên tham chiếu đồng thuận 50 hồ sơ.
- **RQ2:** độ trễ trung vị đo được khoảng 6–20 ms trên ba đồ thị tiên quyết Neo4j tách biệt, không tăng đơn điệu từ 1.000 tới 10.000 nodes.
- **RQ3:** với quy tắc đánh giá tiên quyết đã mô hình hoá và ngân sách 40 đơn vị, tính lại lộ trình theo bằng chứng (A0) giảm khoảng cách mục tiêu còn lại nhiều hơn chương trình tĩnh cố định (S0) ở các hồ sơ còn tiên quyết chưa đạt. Tuy nhiên A0 giảm ít hơn chương trình tĩnh mở rộng toàn bộ tiên quyết ngay từ đầu (S1).

Các phát hiện này mô tả prototype hiện tại dưới các đầu vào giả lập đã ghi nhận.

## Khả năng truy cập dữ liệu và mã nguồn

Catalog, hồ sơ, workbook đồng thuận, kết quả chạy, manifest kèm hash SHA-256 và các lệnh tái tạo mọi bảng đều nằm trong repository dự án, thư mục `documents/research/`. Các lệnh chạy lại được liệt kê trong `documents/research/tools/README.md`. Toàn bộ dữ liệu là giả lập; không dùng dữ liệu nhân viên nào.

## Tài liệu tham khảo

- Peffers, K., Tuunanen, T., Rothenberger, M. A., and Chatterjee, S. (2007). A Design Science Research Methodology for Information Systems Research. *Journal of Management Information Systems*, 24(3), 45–77. DOI 10.2753/MIS0742-1222240302.
- Frej, J., Shah, N., Knežević, M., Nazaretsky, T., and Käser, T. (2024). Finding Paths for Explainable MOOC Recommendation: A Learner Perspective. *LAK 2024*. DOI 10.1145/3636555.3636898.
- Afreen, N., Balloccu, G., Boratto, L., Fenu, G., Malloci, F. M., Marras, M., and Martis, A. G. (2025). Can Path-Based Explainable Recommendation Methods based on Knowledge Graphs Generalize for Personalized Education? *UMAP '25*, 273–278. DOI 10.1145/3699682.3728323.
- Corbett, A. T., and Anderson, J. R. (1994). Knowledge tracing: Modeling the acquisition of procedural knowledge. *User Modeling and User-Adapted Interaction*, 4, 253–278. DOI 10.1007/BF01099821.
- Krichene, W., and Rendle, S. (2020). On Sampled Metrics for Item Recommendation. *KDD 2020*, 1748–1757. DOI 10.1145/3394486.3403226.
- Kalibera, T., and Jones, R. (2013). Rigorous Benchmarking in Reasonable Time. *ISMM 2013*, 63–74. DOI 10.1145/2464157.2464160.

## Hiện vật tái lập

- **RQ1:** [workbook baseline](RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx), [workbook đồng thuận](RQ1_Golden_Set_50_Dong_Thuan.xlsx), [manifest hồ sơ](data/rq1/profiles-v0.1/manifest.json), [report chạy lại](results/rq1/20261125-rerun/report.json), [run manifest](results/rq1/20261125-rerun/run-manifest.json).
- **RQ2:** [các vòng 25/11 và bản tổng hợp](results/rq2/20261125-rerun/summary.json), [lần chạy 1k](results/rq2/20261124-standalone/rq2-standalone-20261124-172324-1k.json), [lần chạy 5k](results/rq2/20261124-standalone/rq2-standalone-20261124-172832-5k.json), [lần chạy 10k](results/rq2/20261124-standalone/rq2-standalone-20261124-173041-10k.json), [hướng dẫn chạy](RQ2_LOCAL_SETUP.md).
- **RQ3:** [manifest cohort pilot](data/rq3/pilot-v0.1/manifest.json), [kết quả r2 100 hồ sơ × 30 lần lặp](results/rq3/20261125-r2-runtime-parity/report.json), [log sự kiện](results/rq3/20261125-r2-runtime-parity/events.jsonl.gz), [run manifest](results/rq3/20261125-r2-runtime-parity/run-manifest.json), [hồ sơ kiểm chứng runtime và UI](evidence/rq3/20261125/README.md).
