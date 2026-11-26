# Thí nghiệm 2: Độ trễ truy vấn tiên quyết có hướng

> Bản dịch tiếng Việt để tham khảo. Bản chính là [RQ2_GRAPH_LATENCY_EXPERIMENT_2.md](RQ2_GRAPH_LATENCY_EXPERIMENT_2.md); nếu hai bản khác nhau thì theo bản tiếng Anh.

Protocol phiên bản 0.2, cập nhật 25/11/2026.

**Trạng thái: pilot.**
- **Đã có:** đo độc lập trên ba đồ thị tách biệt thật (1.000 / 5.000 / 10.000 node MicroSkill), Neo4j Community 5.26.33. Mỗi quy mô chạy một lần ngày 24/11 và ba vòng đổi thứ tự ngày 25/11.
- **Chưa làm:** thiết kế nhiều seed với 1.000 truy vấn, và xuất đầy đủ mẫu đo thô.

## Câu hỏi đã đăng ký

> What is the query latency of deep pathfinding operations in Neo4j (e.g., 3-hop to 5-hop depth) as the number of nodes/edges in the competency ontology scales from 1,000 to 10,000?
>
> (Dịch: Độ trễ của các truy vấn tìm đường sâu trong Neo4j, ví dụ 3 tới 5 hops, là bao nhiêu khi số node/cạnh của ontology năng lực tăng từ 1.000 lên 10.000?)

Câu chữ giữ nguyên từ [Version 2, mục 3.3](../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md).

**Workload chính:** đường đi ngắn nhất có hướng giữa các node MicroSkill qua quan hệ `HAS_SKILL_PREREQUISITE`.

**Phạm vi:**
- Đường tiên quyết ngắn nhất là một benchmark truy vấn cấu trúc. Nó không phải bộ lập lộ trình của production, và không chứng minh tính khả thi ngữ nghĩa ở mọi cấp độ kiến thức.
- Thí nghiệm không khẳng định gì về Neo4j so với SQL, hay về tải đồng thời trên production.

Bảng 8.40/12.60/16.90 ms và các tỷ lệ nguyên nhân trong bản nháp trước là số giả lập điền tạm. Không được dùng lại như kết quả đo.

## Bằng chứng chẩn đoán thực tế

[Audit ngày 22/11](evidence/rq2/20261122-current-service-audit/RESULTS.md) gọi trực tiếp service hiện có trên Neo4j 5.26.32 cục bộ, dùng Java 24.0.1.
- Đây là lần chạy chẩn đoán với truy vấn cũ trộn nhiều loại quan hệ, không phải chạy theo protocol có hướng đã sửa.
- Số lượng trong database là 1.059 nodes và 4.795 quan hệ, giống nhau trước và sau khi chạy.

| Quy mô chọn | Số node thật của đồ thị | Số node service báo | Mean phản hồi (ms) | P95 phản hồi (ms) |
|---|---:|---:|---:|---:|
| 1k | 1.059 | 1.098 | 12.88 | 21.01 |
| 5k | 1.059 | 5.000 | 26.64 | 60.26 |
| 10k | 1.059 | 10.000 | 30.05 | 64.26 |

Mỗi phản hồi dùng 100 truy vấn đo và 50 truy vấn khởi động trên bộ 1. Các giá trị này đã bị cộng độ lệch nhân tạo theo quy mô và có mức sàn thời gian, nên **không phải phép đo co giãn hợp lệ**.
- Trong 100 cặp đầu của mỗi bộ (300 cặp tổng cộng): 225 cặp không có đường, 14 đường ngắn hơn 3 hops, và chỉ 61 kết quả 3–5 hops hợp lệ.
- Một kết quả "không có đường" không cho biết điểm đầu/cuối bị thiếu hay chỉ là không tới được.
- Các phát hiện này không mô tả bộ dữ liệu chưa kiểm tra của thành viên khác, hay mọi dòng fixture.

**Những gì đã có trong bộ đo cũ:** UI/API, Neo4j driver, bộ đếm giờ và phép tính tổng hợp.

**Những gì sai:**
- Số lượng theo quy mô và giá trị bảng được viết cứng.
- Truy vấn cũ chấp nhận quan hệ hỗn hợp không có hướng, và vẫn tính các cặp không có đường.
- Phần phân rã theo giai đoạn dùng tỷ lệ cố định.
- File xuất chỉ giữ 30 thời gian đo và 10 đường mẫu.
- Test trình duyệt hiện có không kiểm tra độ chính xác của phép đo.

Test NFR-P02 riêng dùng 4 truy vấn catalog với 3 lần khởi động và 10 lần đo; đó không phải thí nghiệm RQ2 này.

## Thiết kế dữ liệu

**Kích thước.** Sinh các đồ thị giả lập tách biệt thật, có tổng số node ontology là **1.000, 5.000 và 10.000**.
- Đếm mọi nhãn ontology đã khai báo; báo cáo riêng số node MicroSkill để thấy rõ không gian tìm kiếm của truy vấn đường đi.
- Không gọi một đồ thị là "10k" chỉ vì file hay request mang nhãn đó.
- Số quan hệ được sinh ra và đo thực tế, không cố định theo các giá trị lịch sử 5.100/25.800/52.400.

**Cấu trúc.**
- Dùng lại schema node/quan hệ của dự án. Giữ quyền sở hữu, mã ổn định và hướng tiên quyết có nghĩa.
- Dựng cấu trúc tiên quyết không chu trình, đủ độ sâu.
- Giữ tỷ lệ nhãn, bậc tiên quyết trung bình và phân phối bậc tương đương giữa các quy mô. Tăng kích thước mà không âm thầm tăng mật độ.
- Quy mô lớn không được chỉ là một thành phần được truy vấn giống hệt cộng với phần đệm rời rạc; điểm đầu/cuối của truy vấn phải phủ khắp đồ thị đã sinh.
- Nghiên cứu độ nhạy theo mật độ là tuỳ chọn và không được trộn vào hiệu ứng kích thước.

**Tham số sinh đề xuất (chờ khóa sau pilot):**
- Seeds 17/29/43, tức ba thể hiện đồ thị độc lập cho mỗi quy mô.
- DAG tiên quyết phân tầng, ít nhất 6 tầng, bậc tiên quyết đi ra có giới hạn.
- Tỷ lệ nhãn cuối, độ rộng tầng, xác suất sinh cạnh, thuộc tính cặp kiến thức và gắn học phần được ghi vào generator manifest sau khi xác thực.
- Bắt buộc kiểm tra chu trình, cạnh trùng, cạnh tự trỏ và ràng buộc cùng tổ chức.
- Không suy ra rằng một đồ thị giả lập 10k là đúng về chuyên môn. RQ2 kiểm tra quy mô cấu trúc, còn RQ1/RQ3 dùng catalog vị trí đã rà soát.

**Môi trường.**
- Dùng container/volume nghiên cứu riêng, hoặc lần lượt dựng các đồ thị nghiên cứu tạm thời tách biệt kèm manifest rõ ràng.
- Đồ thị của ứng dụng thường ngày không bao giờ bị xoá hay thay thế.
- Tuân thủ giới hạn của bản Community.
- Trình khởi chạy phải xác định rõ instance và snapshot nghiên cứu trước mọi thao tác thiết lập.

## Dựng và xác thực fixture

**Số cặp.** Với mỗi đồ thị đã khóa, dựng 1.000 cặp nguồn/đích có hướng có **khoảng cách ngắn nhất** (theo đúng bộ lọc quan hệ được đo) là 3, 4 hoặc 5.
- Phân bổ đề xuất: 334/333/333 theo độ sâu, giống nhau ở mọi quy mô.
- Cần đủ cặp duy nhất. Nếu không đủ, sửa bộ sinh trước khi khóa thay vì lặp lại cặp mà không ghi chép.
- Ghi riêng mọi workload lặp cặp đã được phê duyệt.

**Xác thực.**
- Tính khoảng cách ngoài vòng đo, độc lập bằng BFS trên danh sách kề, rồi đối chiếu với Neo4j.
- Dùng seed tất định và thứ tự mã chuẩn hoá. `LIMIT 1000` trên thứ tự dòng không xác định không phải mẫu tái lập được.
- Trên snapshot đã khóa, kiểm tra tính duy nhất của điểm đầu/cuối, nhãn, tổ chức, trạng thái cạnh và khả năng tới được thực tế.
- Mỗi dòng fixture lưu số hops kỳ vọng và hash snapshot. Xác thực lại khi nạp; không khớp thì huỷ lần đo.

**Mẫu Cypher 5 đề xuất** (cần xác thực trên đúng phiên bản đã cài):

```cypher
MATCH (s:MicroSkill {organizationId: $org, id: $startId}),
      (t:MicroSkill {organizationId: $org, id: $targetId})
MATCH p = shortestPath((s)-[:HAS_SKILL_PREREQUISITE*1..5]->(t))
RETURN length(p) AS hops
```

**Lưu ý về truy vấn.**
- Mọi cạnh tiên quyết trong snapshot tách biệt phải thoả ràng buộc ACTIVE/sở hữu đã khai báo, hoặc cả BFS lẫn Cypher phải áp cùng bộ lọc thuộc tính.
- Giữ và báo cáo thuộc tính cấp độ kiến thức, dù workload đường đi chính không đánh giá điều kiện cấp độ của học viên.
- `*1..5` cho phép truy vấn tìm ra đường ngắn hơn 1–2 hops; bộ xác thực fixture loại các cặp như vậy. Không dùng cận dưới bằng 3 để khẳng định không tồn tại đường ngắn hơn. Xem [tài liệu hàm Neo4j](https://neo4j.com/docs/cypher-manual/5/patterns/reference/shortest-paths/).
- Tạo cùng index/ràng buộc cho điểm đầu/cuối ở mỗi đồ thị.
- Ghi đầu ra `EXPLAIN`/`PROFILE` ngoài mẫu đo độ trễ. Không khẳng định thuật toán vật lý, loại index hay chi phí từng giai đoạn khi không có bằng chứng.
- Chỉ trả về số hops là cố ý, để payload nhỏ và cố định. Nếu sau này đánh giá việc tuần tự hoá toàn bộ đường đi thì đó là một workload riêng, đặt tên riêng.

## Kế hoạch chạy và thống kê

1. Kiểm tra hash dữ liệu và fixture, số node tổng và theo nhãn, số cạnh, index, phiên bản, giới hạn bộ nhớ và CPU. Từ chối mọi sai lệch về quy mô.
2. Ghi lại máy chủ, hệ điều hành, JDK, driver, phiên bản/digest image Neo4j, kênh truyền, chế độ nguồn, tải nền và giới hạn container. Dùng cùng thiết lập cho mọi quy mô và không có lưu lượng dịch vụ không liên quan.
3. Chạy 50 truy vấn khởi động không đo từ workload đã khóa. Kiểm tra độ ổn định bằng pilot; chỉ tăng số lần khởi động qua thay đổi protocol có đánh phiên bản trước khi so sánh cuối. Gắn nhãn kết quả là warm-cache; không khẳng định gì về cold-cache.
4. Chạy 1.000 truy vấn có đo, một client, tuần tự. Nạp hết fixture trước khi đo. Đo bằng thời gian đơn điệu theo nano giây, từ lúc gửi truy vấn tới lúc đọc hết kết quả. Thời gian này gồm chi phí driver/truyền/kết quả, không phải thuần thời gian thực thi trên server, cũng không gồm HTTP hay vẽ UI.
5. Lưu **mọi thời gian thô**, số kết quả trả về, số hops thực tế, số hops kỳ vọng và trạng thái. Không cộng độ lệch, không đặt sàn, không thêm nhiễu ngẫu nhiên, không bịa số hops dự phòng. Timeout, không có đường hay không khớp vẫn được ghi là thất bại; không âm thầm thay bằng mẫu thành công.
6. Thiết kế lặp đề xuất: ba seed đồ thị cho mỗi quy mô, ba khối đo cho mỗi thể hiện, thứ tự quy mô cân bằng, và ghi seed thứ tự truy vấn. Mỗi khối giữ workload 1.000 truy vấn đã đăng ký. Các lần lặp dùng để định lượng độ dao động, không phải bộ dữ liệu thực tế độc lập mới. Số lần lặp cuối được khóa sau pilot.
7. Tính Mean, P95 (nearest rank), trung vị, min, max, độ lệch chuẩn và số lỗi theo từng khối và từng độ sâu. Giữ báo cáo các lần chạy lỗi riêng. Không chấp nhận một "lần chạy RQ2 thành công" trừ khi cả 1.000 cặp đã xác thực đều trả đúng số hops kỳ vọng. Không cắt bỏ các quan sát thành công nhưng chậm.
8. Báo cáo độ dao động giữa các khối và giữa các đồ thị. Khoảng tin cậy phân cấp theo đồ thị/khối chỉ mang tính khám phá khi chỉ có ba seed; không coi mọi truy vấn là các lần lặp độc lập theo quy mô đồ thị. Giữ biểu đồ phân phối và bản ghi thô. Độ trễ sẽ khác nhau giữa các lần chạy lại; tái lập nghĩa là phương pháp truy vết và so sánh được, không phải số mili giây giống hệt.

**Ngưỡng và kết luận.**
- Nghiên cứu này không có SLA 100 ms chung nào được phê duyệt. Không lấy huy hiệu trên UI làm ngưỡng thành công.
- Nếu giảng viên yêu cầu ngưỡng cuối, phải lý giải ngưỡng đó trước khi xem kết quả cuối.
- Báo cáo tỷ lệ 10k/1k kèm độ bất định.
- Ba kích thước không đủ để chứng minh một lớp độ phức tạp tiệm cận tổng quát.

## Danh sách việc tối thiểu cần làm

| Hạng mục | Dùng lại | Việc sửa và kiểm chứng cần thiết |
|---|---|---|
| Chạy theo quy mô | Trang, request và service hiện có | Gắn mỗi quy mô với dữ liệu thật tách biệt đã xác thực; kiểm tra số lượng đo được và định danh snapshot |
| Truy vấn và fixture | Driver và bộ đọc fixture | Truy vấn tiên quyết có hướng, cặp tất định đã xác minh, lỗi nghiêm ngặt; test cho node thiếu, đường tắt 2 hops và sai snapshot |
| Đo thời gian | nanoTime cộng đọc hết kết quả | Bỏ độ lệch/sàn, giữ mọi mẫu thô; kiểm tra phép tổng hợp bằng vector thời gian tính tay |
| Hiển thị/xuất | UI hiện có và tải JSON | Sinh so sánh từ các lần chạy đã ghi; bỏ hoặc gắn nhãn lại các phân rã giai đoạn/nguyên nhân không có cơ sở; tách hoạt ảnh khỏi số đo thật |
| Sẵn sàng và tham số | Tổng quan/request hiện có | Không bịa trạng thái sẵn sàng hay số lượng khi mất kết nối; xác thực phạm vi, số hops, số lần chạy và instance nghiên cứu |
| Bằng chứng | Mẫu kiểm thử hiện có | Tích hợp Neo4j thật, đếm đủ số mẫu thô xuất ra, kiểm tra manifest khi chạy lại; Playwright cho mọi thay đổi UI |

Đây là kế hoạch sửa đề xuất, không phải phê duyệt triển khai hay khẳng định đã sửa xong. Một bản sửa code/dữ liệu/test cụ thể phải được rà trước khi chạy. Phạm vi đã thống nhất không cần thêm benchmark truy vấn ứng dụng nào khác.

## Lưu trữ và cổng phát hành

**Nơi lưu.**
- Graph manifest và fixture: `data/rq2/<generator-version>/<scale>/<seed>/`.
- Mọi thời gian thô, văn bản truy vấn, môi trường và bản tổng hợp: `results/rq2/<run-id>/`.
- File và script nạp dữ liệu thuộc `research` khi được triển khai. Bản sửa ứng dụng vẫn nằm ở backend/frontend như hiện tại và được tham chiếu từ run manifest.

**Pilot và bản cuối.** Pilot có thể dùng 100 truy vấn đo cho mỗi quy mô để kiểm tra quy trình, nhưng không thay thế được protocol nhiều seed với 1.000 truy vấn.

Trạng thái hiện tại: **pilot. Các lần chạy 100 truy vấn trên ba quy mô, lặp ba vòng (25/11/2026)**.

## Kết quả đo độc lập trên ba quy mô (24/11/2026)

Chạy bằng [tools/Rq2Standalone.java](tools/Rq2Standalone.java) theo [RQ2_LOCAL_SETUP.md](RQ2_LOCAL_SETUP.md), trên các container Neo4j Community `5.26.33` tách biệt:
- `1.8` cạnh `HAS_SKILL_PREREQUISITE` có hướng cho mỗi node `MicroSkill`.
- 50 truy vấn khởi động và 100 truy vấn đường ngắn nhất 3–5 hops có đo, cho mỗi quy mô.

| Nodes | Quan hệ tiên quyết | Số truy vấn đo | P50 (ms) | P95 (ms) | Mean (ms) | File kết quả |
|---:|---:|---:|---:|---:|---:|---|
| 1.000 | 1.800 | 100 | 9.24 | 37.16 | 13.51 | [results/rq2/20261124-standalone/rq2-standalone-20261124-172324-1k.json](results/rq2/20261124-standalone/rq2-standalone-20261124-172324-1k.json) |
| 5.000 | 9.000 | 100 | 6.01 | 17.25 | 7.65 | [results/rq2/20261124-standalone/rq2-standalone-20261124-172832-5k.json](results/rq2/20261124-standalone/rq2-standalone-20261124-172832-5k.json) |
| 10.000 | 18.000 | 100 | 12.13 | 51.82 | 18.73 | [results/rq2/20261124-standalone/rq2-standalone-20261124-173041-10k.json](results/rq2/20261124-standalone/rq2-standalone-20261124-173041-10k.json) |

## Các vòng lặp (25/11/2026)

**Cách chạy.**
- Ba vòng cho mỗi quy mô, đổi thứ tự mỗi vòng: 1k→5k→10k, 5k→10k→1k, 10k→1k→5k.
- Cùng trình chạy, cùng image `neo4j@sha256:c5fd91e4…`, đồ thị được nạp mới.
- Một lần chạy 1k bị trùng thời điểm với test trình duyệt trên cùng máy; lần đó đã được chạy lại và loại khỏi bảng tổng hợp.

Chi tiết trong [evidence](evidence/rq2/20261125-rerun/README.md); file từng lần chạy và [summary.json](results/rq2/20261125-rerun/summary.json) nằm trong `results/rq2/20261125-rerun/`.

| Nodes | Cạnh | Số lần chạy | P50 trung vị [min–max] ms | P95 trung vị [min–max] ms | Mean trung vị [min–max] ms |
|---:|---:|---:|---:|---:|---:|
| 1.000 | 1.800 | 3 | 12.77 [11.10–16.25] | 45.29 [35.78–67.42] | 16.90 [16.67–24.06] |
| 5.000 | 9.000 | 3 | 17.79 [15.79–20.27] | 58.67 [56.84–76.24] | 24.83 [23.47–31.07] |
| 10.000 | 18.000 | 3 | 16.34 [15.39–16.54] | 53.11 [47.36–53.19] | 21.50 [21.00–23.13] |

**Nhận xét.**
- Dao động giữa các vòng ở cùng một quy mô lớn ngang chênh lệch giữa các quy mô.
- Độ trễ không tăng đơn điệu từ 1k lên 10k.
- Mọi lần chạy ngày 25/11 đều chậm hơn các lần chạy đơn ngày 24/11, nên trạng thái máy quan trọng hơn kích thước đồ thị trong khoảng này.

**Còn thiếu so với protocol:**
- Mỗi quy mô chỉ có một seed đồ thị.
- 100 thay vì 1.000 truy vấn đo.
- Mỗi file xuất chỉ giữ 30 thời gian đo thô.
- Chưa phân rã theo độ sâu.
