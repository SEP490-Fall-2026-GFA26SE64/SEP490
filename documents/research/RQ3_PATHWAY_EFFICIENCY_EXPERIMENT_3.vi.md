# Thí nghiệm 3: Điều chỉnh lộ trình theo bằng chứng

> Bản dịch tiếng Việt để tham khảo. Bản chính là [RQ3_PATHWAY_EFFICIENCY_EXPERIMENT_3.md](RQ3_PATHWAY_EFFICIENCY_EXPERIMENT_3.md); nếu hai bản khác nhau thì theo bản tiếng Anh.

Protocol phiên bản 0.3, 25/11/2026.

**Trạng thái: đã chạy pilot với runtime parity.**
- **Lần chạy:** `20261125-r2-runtime-parity`, 100 hồ sơ × 30 lần lặp có seed, ngân sách 40, các mốc 0/10/20/30/40.
- **Chưa phải bản cuối:** bộ mô phỏng, rubric và quan hệ tiên quyết vẫn chờ chuyên gia độc lập rà soát; manifest cohort vẫn ở trạng thái `DRAFT_PILOT_INPUTS`.
- **Tham số:** các tham số số bên dưới là thiết lập mô phỏng giả lập đã khóa, không phải ước lượng việc học thật của con người đã được hiệu chỉnh.
- **Lần chạy cũ:** lần chạy `rq3-pilot100-20261125` (r1) đã bị thay thế, vì chính sách A0 của nó tự cài lại logic bổ sung bên trong runner. Lần chạy đó chỉ được giữ làm lịch sử.

## Câu hỏi đã đăng ký và thuật ngữ

> Does dynamic pathway recalculation (Knowledge Tracing) result in a mathematically shorter distance to the Target Role profile compared to static predefined pathways?
>
> (Dịch: Việc tính lại lộ trình động (Knowledge Tracing) có cho ra khoảng cách tới hồ sơ vị trí mục tiêu ngắn hơn về mặt toán học so với lộ trình tĩnh định sẵn hay không?)

Câu chữ đăng ký trong [Version 2](../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md) được giữ nguyên.
- Hệ thống được đánh giá là engine tính lại lộ trình hiện có, dựa trên quy tắc và bằng chứng, không phải mô hình BKT xác suất.
- Cụm "Knowledge Tracing" trong câu hỏi không có nghĩa là Bayesian knowledge tracing đã được triển khai. Cần giải thích ranh giới này với giảng viên; kết luận chỉ áp dụng cho việc tính lại theo bằng chứng.
- [Corbett và Anderson](RELATED_WORK.md) chỉ là tham chiếu thuật ngữ, không phải mô hình được triển khai ở đây.

## Đối tượng và mục tiêu cố định

**Học viên mô phỏng.** Mô phỏng 100 học viên Application Developer ở cấp Junior/Middle/Senior, với yêu cầu mục tiêu và quan hệ tiên quyết đã rà.
- Phân bổ đề xuất theo cấp là 34/33/33, khóa sau khi rà độ phủ catalog.
- Khai báo độc lập cách sinh trạng thái kiến thức/bằng chứng ban đầu; không chỉnh học viên để chính sách thích ứng luôn thắng.
- Dùng mã giả lập và dữ liệu tương thích phiên bản; không dùng hồ sơ nhân viên thật.

**Tập mục tiêu và khoảng cách.** Với học viên u, khóa tập mục tiêu T(u) gồm các yêu cầu kỹ năng–cấp độ kiến thức–phiên bản cụ thể. Tiên quyết bên ngoài có thể xuất hiện trong lộ trình nhưng không vào mẫu số mục tiêu này. Gọi E(u,b) là tập thành tích chính thức tại ngân sách hoạt động b. Khoảng cách chính:

`D(u,b) = |T(u) trừ E(u,b)| / |T(u)|`.

**Quy tắc.**
- T(u) phải khác rỗng.
- Những thứ không được vào E: đạt baseline, bypass, ASSESSED_SATISFIED, và chỉ hoàn thành nội dung.
- Hoàn tất/giải phóng lộ trình và D=0 là hai kết quả khác nhau.
- Hồ sơ được miễn qua baseline có thể hoàn tất lộ trình trong khi D vẫn dương. Giữ chúng thành một tầng riêng, không ép engine cấp bằng chứng hay buộc học các yêu cầu đã được miễn.
- Phép kiểm tra độ nhạy chính: một tầng mà nhu cầu bắt buộc ban đầu phủ hết mọi yêu cầu mục tiêu chưa đạt. Giữ kết quả tầng này riêng, và không chọn lọc loại bỏ các trường hợp miễn baseline bất lợi.

## Các chính sách được so sánh

**S0: chính sách tĩnh chính.**
- Khóa cùng tập yêu cầu ban đầu suy ra từ baseline, cùng tập lựa chọn và thứ tự hiển thị như được cung cấp cho chính sách thích ứng.
- Chọn học phần ban đầu bằng một quy tắc tất định dùng chung.
- Giữ chương trình cố định, cho phép làm lại theo cùng chính sách đánh giá/truy cập.
- Đưa kết quả vào cùng bộ đánh giá thành tích, nhưng không thêm yêu cầu mới hay đổi thứ tự chương trình dựa trên phản hồi.
- Nếu tiên quyết chưa đạt khiến không hoàn tất được, giữ nguyên thất bại và việc không hoàn tất. Không nới điều kiện để S0 qua.

**A0: chính sách thích ứng.**
- Dùng các thành phần hiện có phụ trách sinh, lập và tính lại lộ trình để phản ứng với bằng chứng đánh giá đã chấp nhận, loại trùng khi bổ sung, và cập nhật quan hệ phụ thuộc.
- Giữ lịch sử và bằng chứng chính thức.
- Adapter chỉ dùng cho nghiên cứu được phép cung cấp snapshot tách biệt, nhưng phải tái tạo đúng các bước chuyển trạng thái runtime. Một bản cài lại riêng bằng Python có lợi cho A0 không phải là engine được đánh giá.

**S1: chính sách tĩnh để kiểm tra độ nhạy.**
- Tính trước nhu cầu mục tiêu cộng mọi tiên quyết tương thích chưa có thành tích chính thức, sắp thứ tự một lần rồi khóa.
- Dùng cùng bộ đánh giá bằng chứng và cùng điều kiện làm lại.
- So với quy tắc của ứng dụng (không mở rộng tiên quyết chưa được đánh giá ngay từ đầu), S1 cố ý khác. Đây không phải thay đổi chính sách production.
- Báo cáo riêng để kiểm tra xem lợi ích có chỉ đến từ một S0 quá chặt hay không.

**Giữ cố định cho mọi chính sách:**
- Trạng thái học viên ban đầu, phiên bản catalog/chính sách, lựa chọn duyệt ban đầu.
- Quy tắc phá hoà khi chọn học phần, cách chấm nhóm câu hỏi, điều kiện bắt buộc/veto.
- Tiêu chí hoàn thành/bằng chứng, cách xử lý làm lại/chờ.

**Khác:**
- Ghi thiết lập duyệt mô phỏng là giả lập; không bao giờ bịa phê duyệt của chuyên gia.
- Loại thay đổi cách cung cấp, chứng chỉ và bypass khỏi thí nghiệm chính (chỉ dùng học phần); nếu cần thì đánh giá chúng trong các trường hợp độ bền vững riêng.

## Ngân sách hoạt động và mô hình học viên chung

**Đơn vị chi phí.** Dùng đơn vị hoạt động chuẩn hoá, không dùng giờ. Mọi lượt học và lần làm bài đều tốn chi phí, kể cả lần trượt và lần làm lại toàn bộ.
- Pilot đề xuất: lượt học tốn 1, bài đánh giá đầy đủ tốn 1, tổng ngân sách 40; các mốc phụ 10/20/30.
- Độ nhạy: chi phí đánh giá 0.5/1/2 và ngân sách 20/40/80. Không có lượt học miễn phí.
- Trước các lần chạy cuối, chọn và khóa chi phí/ngân sách dựa trên tính khả thi và rà soát của chuyên gia, không dựa trên chính sách nào thắng.
- Một bài học đã hoàn thành và còn được giữ không bị tính phí lại, trừ khi có một lượt ôn thật sự.
- Thời gian chờ làm lại dùng chung một đồng hồ ảo; báo cáo thời gian chờ riêng và không âm thầm bỏ qua quy tắc truy cập.

**Bộ mô phỏng minh bạch đề xuất** (cần rà trước khi triển khai):
- **Trạng thái ẩn.** Trạng thái ẩn của học viên z(u,r) nằm trong [0,1] với mỗi yêu cầu r. Chỉ bộ mô phỏng thấy z; bộ gợi ý chỉ thấy kết quả/bằng chứng quan sát được.
- **Cập nhật khi học.** Với một học phần dạy r, một lượt học cập nhật `z' = z + eta × (1-z)`. Các giá trị eta đề xuất 0.1/0.2/0.3 là thiết lập độ nhạy, không phải tốc độ đo được. Lượt ôn có thể dùng cùng công thức cập nhật có chặn nếu chính sách đã khóa cho phép.
- **Xác suất trả lời đúng.** Gọi q là trung bình kiến thức ẩn trên các yêu cầu tiên quyết đã khai báo của nhóm đó; q=1 khi không có tiên quyết. Xác suất trả lời đúng một câu là `clip(g + (1-g-s) × z × ((1-lambda)+lambda×q), 0.01, 0.99)`.
  - Pilot đề xuất g=0.2, s=0.1, lambda=0.5.
  - Thêm các đối chứng lambda=0/0.5/1, học chậm/nhanh hơn và kiến thức ban đầu bằng nhau.
  - Các giá trị là giả định và không được chọn dựa trên chính sách nào có lợi ở kết quả cuối.
- **Chấm điểm.** Lấy mẫu kết quả ở mức từng câu hỏi, rồi để quy tắc chấm thật quyết định nhóm MAIN/tiên quyết đạt hay không, điều kiện bắt buộc và veto.
  - Không đồng nhất một lần rút xác suất với thành tích chính thức, và không bỏ qua điều kiện hoàn thành học phần.
  - Khóa cách xử lý câu sai/bỏ trống và quan hệ tiên quyết dùng cho mỗi nhóm.
- **Số ngẫu nhiên.** Khóa các lần rút ngẫu nhiên theo seed, học viên, yêu cầu, học phần, số lần làm, câu hỏi và loại sự kiện.
  - Tách luồng ngẫu nhiên cho học, câu hỏi và lựa chọn chính sách.
  - Các cơ hội tương ứng giữa các chính sách dùng chung giá trị ngẫu nhiên; chuỗi hành động khác nhau không được chỉ làm lệch một luồng ngẫu nhiên toàn cục.
  - Xác suất khác nhau có thể cho kết quả khác nhau dưới cùng một lần rút.

Bộ mô phỏng này là mô hình học tập cho nghiên cứu, không phải một hệ thống knowledge tracing mới cho production. Giả định của nó có thể có lợi cho một số chính sách, nên cần các phép thử độ nhạy, S1 và các đối chứng "kiến thức bằng nhau / không tiên quyết" để làm lộ sự phụ thuộc đó. Phương pháp thất bại ngẫu nhiên chính được giữ, nhưng xác suất thất bại thay đổi theo lịch sử học thay vì cố định độc lập với việc học.

## Cổng chính sách runtime

> Ghi chú của người dịch: cổng này đã được giải quyết trong lần chạy r2 (xem bảng "Mức sẵn sàng" bên dưới). Đoạn sau dịch nguyên văn mô tả gốc.

**Mâu thuẫn cần giải quyết.**
- Mã nguồn `RequirementPathwayPlanningService.refresh` hiện có thể đánh dấu một bước bổ sung là ASSESSED_SATISFIED sau lịch sử đánh giá tương thích, và `RequirementPathway.Step.resolved()` coi nó là đã giải quyết dù không có bằng chứng chính thức.
- Trong khi đó, một số mô tả nghiệp vụ hiện có nói rằng một lần đánh giá đạt về sau không thể xoá yêu cầu học thật đã có trước đó.
- Mâu thuẫn này phải được đối chiếu với quyết định nghiệp vụ đã duyệt và vết chạy runtime **trước khi khóa snapshot engine**. Không chọn cách hiểu cho A0 lợi thế lớn nhất.
- Dù chọn chính sách nào, ASSESSED_SATISFIED không phải thành tích chính thức trong D.

**Các nhánh phải truy vết trước khi mô phỏng:**
- Trượt nhóm chính.
- Trượt tiên quyết khi chưa có bằng chứng chính thức.
- Trượt tiên quyết đã có bằng chứng chính thức (NEED_REVIEW).
- Trượt do điều kiện bắt buộc/veto.
- Làm lại toàn bộ.
- Sự kiện lặp lại.
- Loại trùng tiên quyết dùng chung.
- Đánh giá lại tương thích.
- Đạt tất cả.
- Không có học phần cung cấp.
- Hoàn tất khi được miễn baseline.

Dùng lại fixture WF05 và các thành phần sở hữu service hiện tại. Thiếu kiểm chứng một nhánh là điểm chặn, không phải cho phép âm thầm làm xấp xỉ.

## Kết quả đo và phân tích

**Hiệu ứng chính.** Hiệu ứng so cặp chính tại ngân sách đã khóa B là `DeltaD = trung bình(D_tĩnh(u,B) - D_thích ứng(u,B))`; giá trị dương có lợi cho chính sách thích ứng.
- Báo cáo khoảng cách baseline và cả hai khoảng cách cuối, không chỉ hiệu số. Ghi quỹ đạo tại các mốc.
- Nếu không thể hành động gì trước B, giữ nguyên trạng thái cuối, ghi lý do dừng và ngân sách thực tế đã dùng. Không tiêu những hành động không có thật, và không xoá học viên.

**Kết quả phụ:**
- Tỷ lệ D=0; tỷ lệ giải phóng lộ trình (báo cáo riêng).
- Chi phí để đạt mục tiêu tương đương.
- Số yêu cầu bù và mã học phần được giao khác nhau.
- Số lượt học thực tế; số lần làm bài/làm lại.
- Các trường hợp trượt/bị chặn/không hoàn tất.

Không tính mọi lựa chọn thay thế lẫn nhau là khối lượng bắt buộc. Số yêu cầu được thêm và số học phần được giao là hai con số riêng, nhất là với chương trình tiên quyết mở rộng trước của S1.

**Chi phí và cắt phải.** Bản tóm tắt chi phí đạt mục tiêu phải gồm số trường hợp không hoàn tất và cắt phải (right-censoring) tại B. Trung bình chỉ trên những học viên thành công có thể bị chọn lọc, và không được trình bày như hiệu quả tổng thể. Báo cáo chi phí so cặp trên các cặp đầy đủ mang tính mô tả, kèm tỷ lệ đạt trên toàn nhóm.

**Lặp và khoảng tin cậy.**
- Đề xuất 30 lần lặp ngẫu nhiên trên cùng 100 học viên. Lấy trung bình hiệu ứng theo từng học viên qua các lần lặp, rồi bootstrap theo học viên để có khoảng tin cậy so cặp.
- Giữ kết quả theo từng seed để thấy tính ngẫu nhiên, và công bố sự phụ thuộc vào hồ sơ giả lập.
- Không gọi 100 × 30 là các học viên độc lập.
- Số lần lặp cuối, các tham số và mốc chính được khóa trước khi chạy test.

## Hiện vật và mức sẵn sàng

**Nơi lưu.** Đầu vào đã rà nằm trong `data/rq3/<version>/`, các lần chạy trong `results/rq3/<run-id>/`.

**Mỗi sự kiện phải lưu:**
- Học viên/chính sách/seed, hành động, chi phí.
- Trạng thái mô phỏng ẩn, ghi trong một hiện vật riêng chỉ dành cho bên đánh giá.
- Kết quả quan sát được, thay đổi bằng chứng chính xác, phiên bản lộ trình.
- D trước/sau, lý do bị chặn và ngân sách còn lại.

Giữ phiên bản mô hình/cấu hình và hash mã nguồn engine. Đầu vào mà chính sách nhìn thấy phải không chứa trạng thái ẩn.

**Điều kiện sẵn sàng cuối:** rà bộ mô phỏng/rubric, giải quyết mâu thuẫn chính sách, runtime parity, vết trạng thái tất định với seed cố định, tính chi phí ngang nhau, không rò rỉ trạng thái ẩn, không tính bằng chứng hai lần, và một quy tắc cắt phải rõ ràng. Mức sẵn sàng theo danh sách này (lần chạy r2):

| Yêu cầu | Trạng thái |
|---|---|
| Giải quyết mâu thuẫn chính sách | Xong. Runtime không bao giờ tạo ASSESSED_SATISFIED trong luồng này; việc học tiên quyết đã giao được giữ cho tới khi có bằng chứng chính thức ([Rq3RuntimeTransitionTest](../../backend/src/test/java/com/adaptlearngraph/research/Rq3RuntimeTransitionTest.java)). |
| Runtime parity | Xong. A0 gọi `RequirementPathwayRecalculationService.supplement`. Mọi chính sách làm mới qua `RequirementPathwayGenerationService.step` + `RequirementPathwayPlanningService.refreshedStep`, chính các bước chuyển tĩnh mà job lưu trữ dùng. Snapshot tách biệt chỉ thay thế kho JPA/đồ thị. |
| Vết trạng thái tất định | Xong. Chạy lại với seed cố định cho kết quả giống nhau; `events.jsonl.gz` ghi mọi hành động. |
| Tính chi phí ngang nhau | Xong. Đã kiểm thử với chi phí đánh giá 0.5/1/2. |
| Không rò rỉ trạng thái ẩn | Xong. Trạng thái ẩn chỉ ghi vào `hidden-state.jsonl.gz`; có test khẳng định sự kiện của chính sách không chứa khóa ẩn nào. |
| Không tính bằng chứng hai lần | Xong. Đã kiểm thử trên log sự kiện. |
| Quy tắc cắt phải rõ ràng | Xong. Cắt phải tại B với chi phí trung bình có giới hạn. |
| Chuyên gia rà bộ mô phỏng/rubric | **Còn mở.** Chưa có rà soát của người nào; không bịa ra. |
| Khóa manifest cohort | **Còn mở.** `data/rq3/pilot-v0.1/manifest.json` giữ `DRAFT_PILOT_INPUTS` cho tới khi được rà. |

## Kết quả thực nghiệm, lần chạy r2 với runtime parity (25/11/2026)

**Cấu hình chạy.** Chạy bằng `com.adaptlearngraph.research.Rq3SimulationRunner`:
- `baseSeed = 20261125`, 30 lần lặp.
- 100 hồ sơ: 34 Junior, 33 Middle, 33 Senior.
- Ngân sách 40; `eta = 0.20`, `guess = 0.20`, `slip = 0.10`, `lambda = 0.50`; chi phí học và đánh giá đều bằng 1.

**Quy tắc chung.** Cả ba chính sách dùng cùng một quy tắc chọn: xoay vòng theo thứ tự hiện tại của kế hoạch, bỏ qua các bước đã giải quyết, bước không có học phần cung cấp và bước còn phụ thuộc chưa giải quyết. Mỗi lần làm lại phải có một lượt ôn trước.

| Mốc (đơn vị) | S0 D(b) | A0 D(b) | S1 D(b) | ΔD so cặp (S0 − A0) | S0 D_gap(b) | A0 D_gap(b) | ΔD_gap so cặp (S0 − A0) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0.7067 | 0.7067 | 0.7067 | +0.0000 | 1.0000 | 1.0000 | +0.0000 |
| 10 | 0.6792 | 0.6748 | 0.6605 | +0.0044 | 0.7153 | 0.7244 | −0.0091 |
| 20 | 0.6541 | 0.6363 | 0.6186 | +0.0178 | 0.5109 | 0.4995 | +0.0114 |
| 30 | 0.6322 | 0.5995 | 0.5834 | +0.0327 | 0.3707 | 0.3134 | +0.0573 |
| 40 | 0.6128 | 0.5701 | 0.5565 | +0.0427 | 0.2616 | 0.1921 | +0.0695 |

- **Hiệu ứng so cặp chính ΔD(40) = D_S0(40) − D_A0(40):** `+0.0427` (CI 95% bootstrap phân vị so cặp với 10.000 lần lấy mẫu lại: `[+0.0342, +0.0520]`, `SE = 0.0046`). A0 có khoảng cách thấp hơn ở 72 hồ sơ, bằng ở 27 và cao hơn ở 1.
- **Đối chứng độ nhạy S1:** S1 thấp hơn A0. ΔD(40) = D_S1 − D_A0 = `−0.0136` (CI 95% `[−0.0177, −0.0098]`). Vì vậy, lợi ích so với S0 không chứng minh rằng phản ứng theo bằng chứng tốt hơn một chương trình mở rộng mọi tiên quyết chưa đạt ngay từ đầu.
- **Lỗ hổng ban đầu ΔD_gap(40):** `+0.0695` (CI 95% `[+0.0495, +0.0912]`).
- **Đối chứng theo mức tiếp xúc tiên quyết:**
  - Ở 25 hồ sơ có mọi tiên quyết đã khai báo đều chính thức từ baseline, S0, A0 và S1 giống hệt nhau (ΔD = 0, tỷ lệ hoàn tất 95.33%).
  - Ở 75 hồ sơ còn thiếu tiên quyết, ΔD = `+0.0569` (`0.6720` so với `0.6151`); tỷ lệ hoàn tất 34.09% / 50.67% / 54.09% (S0 / A0 / S1).

**Kết quả phụ** (3.000 lượt học viên × lần lặp cho mỗi chính sách; chi phí cắt phải tại B = 40):

| Chính sách | D = 0 | Đóng lỗ hổng | Đóng / bị cắt | Chi phí TB có giới hạn để đóng lỗ hổng | Chi phí TB, chỉ nhóm đạt | Học / đánh giá / làm lại | Lần trượt | Yêu cầu bù | Học phần được giao | Sự kiện review |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| S0 | 0.0% | 49.40% | 1482 / 1518 | 29.88 | 19.52 | 14.94 / 14.94 / 10.62 | 12.18 | 0.00 | 4.32 | 1.21 |
| A0 | 0.0% | 61.83% | 1855 / 1145 | 28.17 | 20.86 | 14.08 / 14.08 / 8.52 | 10.07 | 1.26 | 5.57 | 2.71 |
| S1 | 0.0% | 64.40% | 1932 / 1068 | 27.59 | 20.72 | 13.79 / 13.79 / 8.38 | 9.39 | 0.00 | 5.41 | 3.74 |

- **Không lượt nào đạt D = 0.** Các yêu cầu mục tiêu được miễn qua baseline không bao giờ nhận bằng chứng chính thức, dù dùng chính sách nào.
- **Chi phí so cặp trên các cặp đầy đủ** (chỉ tính các cặp mà cả hai chính sách đều đóng được lỗ hổng) mang tính mô tả:
  - S0 so với A0: 1.444/3.000 cặp, 19.06 so với 18.09 đơn vị.
  - S1 so với A0: 1.840 cặp, 19.96 so với 20.73 đơn vị.
- **Lý do dừng:** mọi lượt dừng do `PATHWAY_RELEASED` hoặc `BUDGET_EXHAUSTED`; không lượt nào bị chặn vì thiếu học phần cung cấp.

**Độ nhạy** (cùng 100 hồ sơ × 30 lần lặp; D đo tại ngân sách B của từng dòng):

| Thiết lập | η | λ | Chi phí đánh giá | B | Kiến thức bằng nhau | S0 D(B) | A0 D(B) | S1 D(B) | ΔD S0 − A0 [CI 95%] | ΔD S1 − A0 |
|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|
| Chính | 0.20 | 0.50 | 1 | 40 | không | 0.6128 | 0.5701 | 0.5565 | +0.0427 [+0.0342, +0.0520] | −0.0136 |
| Học chậm hơn | 0.10 | 0.50 | 1 | 40 | không | 0.6297 | 0.5912 | 0.5786 | +0.0385 [+0.0309, +0.0466] | −0.0126 |
| Học nhanh hơn | 0.30 | 0.50 | 1 | 40 | không | 0.6001 | 0.5544 | 0.5415 | +0.0456 [+0.0364, +0.0558] | −0.0129 |
| Không liên kết ở mức câu hỏi | 0.20 | 0.00 | 1 | 40 | không | 0.6024 | 0.5629 | 0.5497 | +0.0395 [+0.0316, +0.0481] | −0.0131 |
| Liên kết hoàn toàn ở mức câu hỏi | 0.20 | 1.00 | 1 | 40 | không | 0.6225 | 0.5776 | 0.5645 | +0.0448 [+0.0359, +0.0544] | −0.0131 |
| Đánh giá rẻ hơn | 0.20 | 0.50 | 0.5 | 40 | không | 0.5939 | 0.5442 | 0.5346 | +0.0497 [+0.0397, +0.0607] | −0.0096 |
| Đánh giá đắt hơn | 0.20 | 0.50 | 2 | 40 | không | 0.6408 | 0.6136 | 0.5962 | +0.0272 [+0.0213, +0.0335] | −0.0174 |
| Ngân sách ngắn | 0.20 | 0.50 | 1 | 20 | không | 0.6541 | 0.6363 | 0.6186 | +0.0177 [+0.0133, +0.0225] | −0.0177 |
| Ngân sách dài | 0.20 | 0.50 | 1 | 80 | không | 0.5730 | 0.5206 | 0.5168 | +0.0524 [+0.0408, +0.0653] | −0.0038 |
| Kiến thức ban đầu bằng nhau | 0.20 | 0.50 | 1 | 40 | có | 0.6178 | 0.5712 | 0.5584 | +0.0466 [+0.0370, +0.0570] | −0.0128 |

**Nhận xét.**
- Chiều A0 tốt hơn S0 đúng ở mọi dòng; S1 luôn thấp hơn A0 ở mọi dòng.
- Với λ = 0, lợi ích vẫn còn. Do đó lợi thế của A0 không phụ thuộc vào liên kết ở mức câu hỏi.
- Lợi thế chủ yếu đến từ bộ đánh giá runtime: nó không công nhận thành tích khi một nhóm tiên quyết còn trượt. S0 không bao giờ học tiên quyết, nên chỉ vượt qua các nhóm đó nhờ may mắn.

**Hiện vật:**
- [report](results/rq3/20261125-r2-runtime-parity/report.json).
- [Log sự kiện](results/rq3/20261125-r2-runtime-parity/events.jsonl.gz) mà chính sách nhìn thấy (265.904 sự kiện).
- [Trạng thái ẩn](results/rq3/20261125-r2-runtime-parity/hidden-state.jsonl.gz), chỉ dành cho bên đánh giá.
- [Run manifest kèm SHA-256 của engine và đầu vào](results/rq3/20261125-r2-runtime-parity/run-manifest.json).
- [Hồ sơ kiểm chứng](evidence/rq3/20261125/README.md).

## Giới hạn diễn giải

Một giá trị D mô phỏng thấp hơn chỉ ủng hộ việc thích ứng dưới mô hình và catalog đã khai báo. Nó không chứng minh:
- Năng suất của nhân sự.
- Lợi ích giáo dục thật.
- Độ chính xác dự đoán của BKT.
- Một lộ trình tối ưu toàn cục.
- Số giờ tiết kiệm được.

Hiệu ứng bằng 0 hoặc âm vẫn là kết quả cần báo cáo. Mục tiêu một tuần chỉ bao gồm chuẩn bị và pilot, không đảm bảo một kết quả cuối có lợi.
