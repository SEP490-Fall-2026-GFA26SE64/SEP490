# PHIẾU TỰ ĐÁNH GIÁ

**Subject code:** SEP490 | **Group:** GFA26SE64 | **Topic:** FA26SE267

*(Tên file: 26FA_GFA26SE64_FA26SE267.docx)*

## 1. Tên khóa luận tốt nghiệp

**Tiếng Việt / Vietnamese:** Nền tảng học tập thích ứng và phát triển năng lực cá nhân dựa trên biểu đồ tri thức

**Tiếng Anh / English:** Knowledge Graph-Based Adaptive Learning and Competency Intelligence Platform

## 2. Họ tên thành viên

1. Đặng Minh Hoàng (Leader) – SE193626
2. Nguyễn Anh Khôi – SE192491
3. Nguyễn Trần Việt An – SE184889
4. Trần An Quốc – SE182280

## 3. Nhận xét khóa luận

### 3.1. Nội dung khóa luận

**Giới thiệu tổng quát:** Adapt-Learn-Graph là ứng dụng web theo mô hình thuê bao (multi-tenant SaaS) phục vụ Đào tạo và Phát triển (L&D) trong doanh nghiệp, demo ban đầu trên năng lực Kỹ sư phần mềm (Java Backend). Hệ thống kết nối ba câu hỏi: vị trí mục tiêu yêu cầu gì, nhân viên hiện chứng minh được gì, và nhân viên nên học gì tiếp theo. Hệ thống có 6 tác nhân người dùng (Guest, Platform Administrator, Organization Administrator, L&D Manager, Expert, Employee) và tác nhân System.

**Mục tiêu:**

- Xây dựng ontology năng lực theo từng tổ chức trên Neo4j (Department, Job Position có hồ sơ RIASEC, Target Role, Level, Competency, MicroSkill với quan hệ tiên quyết có hướng, Learning Module, Certificate).
- Đánh giá đầu vào theo Role–Level, phân tích khoảng trống kỹ năng và sinh lộ trình học khởi tạo được Expert phê duyệt.
- Tái tính toán lộ trình dựa trên bằng chứng đánh giá mới (adaptive learning).
- Quản lý ngân hàng câu hỏi và mô-đun học tập với vòng đời duyệt, phát hành, lưu trữ.
- Đánh giá sở thích nghề nghiệp RIASEC và gợi ý Job Position bằng Local AI.
- Đăng ký tổ chức, thanh toán thuê bao (payOS) và cấp phát workspace.

**Cơ sở lý luận và nghiên cứu:** Biểu đồ tri thức (Knowledge Graph), Knowledge Tracing, quan hệ kỹ năng tiên quyết, mô hình RIASEC (Holland), so sánh với các hệ thống hiện có (Degreed, Docebo). Đề tài có ba câu hỏi nghiên cứu:

- RQ1: Hit Rate@5 của thuật toán duyệt đồ thị so với Content-Based Filtering (500 người dùng giả lập, 50 hồ sơ chuyên gia gắn nhãn).
- RQ2: Độ trễ truy vấn tìm đường 3–5 hop trên Neo4j khi ontology tăng từ 1.000 đến 10.000 nodes.
- RQ3: Lộ trình thích ứng so với lộ trình tĩnh (mô phỏng 100 học viên).

**Số liệu và phân tích:** Đề tài sử dụng dữ liệu giả lập kết hợp dữ liệu mẫu theo miền Kỹ sư phần mềm (cơ cấu tổ chức, người dùng, competency, micro-skill, ngân hàng câu hỏi, mô-đun học tập) để kiểm chứng hệ thống. Các câu hỏi nghiên cứu được đánh giá bằng thực nghiệm có thể tái lập: đo độ chính xác gợi ý bằng Hit Rate@5 so với tập chuẩn do chuyên gia gắn nhãn, đo độ trễ truy vấn đồ thị (Mean, P95) trên các ontology có quy mô tăng dần, và so sánh số mô-đun bổ sung giữa lộ trình thích ứng với lộ trình tĩnh thông qua mô phỏng học viên. Kết quả được phân tích để đánh giá hiệu quả và giới hạn của cách tiếp cận dựa trên biểu đồ tri thức.

**Tính ứng dụng:** Giúp doanh nghiệp cá nhân hóa đào tạo theo khoảng trống năng lực thực tế, tránh học lại nội dung đã biết, đảm bảo thứ tự học theo kỹ năng tiên quyết và cung cấp cho L&D Manager bức tranh phát triển năng lực tổng hợp. Công nghệ sử dụng: React + TypeScript, Spring Boot, PostgreSQL, Neo4j, MinIO, Ollama (Local AI), Docker và Nginx.

### 3.2. Hình thức khóa luận

**Bố cục:** Bài trình bày gồm các phần:

- Context: bối cảnh đào tạo và phát triển năng lực nhân sự trong doanh nghiệp.
- Problem: các vấn đề của đào tạo theo lộ trình cố định, chưa gắn với năng lực thực tế và yêu cầu vị trí mục tiêu.
- Solution: nền tảng học tập thích ứng dựa trên biểu đồ tri thức năng lực.
- Actors: Guest, Platform Administrator, Organization Administrator, L&D Manager, Expert, Employee và System.
- Features: các nhóm chức năng chính của hệ thống.
- Công nghệ: React + TypeScript, Spring Boot, PostgreSQL, Neo4j, MinIO, Ollama (Local AI), Docker và Nginx.
- Main flow: các luồng nghiệp vụ chính gồm Organization Onboarding; Target Role & Competency Ontology Management; Question Bank Management; Learning Module Management; Assessment and Adaptive Learning Pathway.

**Phương pháp trình bày:** Trình bày bằng slide truyền thống kết hợp demo live các chức năng của từng main flow trên hệ thống.

**Ngôn ngữ:** Thuyết trình bằng tiếng Việt. Các báo cáo sử dụng hoàn toàn tiếng Anh.

**Trích dẫn:** Có trích dẫn nguồn (footnote) tới tài liệu đăng ký đề tài, website chính thức của các hệ thống tham khảo (Degreed, Docebo), báo cáo của ILO và các tệp mã nguồn, minh chứng kiểm thử trong repository.

### 3.3. Thái độ của sinh viên trong quá trình làm khóa luận

**Cả nhóm:** Làm việc nghiêm túc, chủ động, tuân thủ lịch họp với giảng viên hướng dẫn (cô Hoàng Thu Hà) và kế hoạch sprint. Mã nguồn được quản lý tập trung trên GitHub. Mỗi thành viên sở hữu một workflow chính, tự viết test case và kịch bản demo cho phần mình phụ trách. Nhóm chủ động tự rà soát SRS/SDD (BM02) để phát hiện và khắc phục sai lệch.

**Cơ sở xác định mức đóng góp:** Mức đóng góp được tính theo hai phần có trọng số bằng nhau (50% – 50%):

- Feature đã hoàn thành: số chức năng trong BM04 Review 2 Commitment mà thành viên phụ trách và đã merge vào nhánh main, cộng thêm thí nghiệm nghiên cứu đã hoàn thành (RQ2). Tổng cộng 25 hạng mục.
- Tài liệu: số dòng tài liệu do thành viên viết trong thư mục documents và Review 2 (báo cáo, đặc tả feature, tài liệu kỹ thuật, tài liệu kiểm thử, sơ đồ Mermaid/PlantUML/DBML), thống kê từ lịch sử Git; không tính dữ liệu, file sinh tự động và file nhị phân.

| Thành viên | Feature hoàn thành | Tỷ lệ feature | Dòng tài liệu | Tỷ lệ tài liệu | Mức đóng góp |
| --- | --- | --- | --- | --- | --- |
| Đặng Minh Hoàng | 8 | 32% | 33.936 | 53% | 43% |
| Nguyễn Anh Khôi | 5 | 20% | 6.375 | 10% | 15% |
| Nguyễn Trần Việt An | 6 | 24% | 8.790 | 14% | 19% |
| Trần An Quốc | 6 | 24% | 14.404 | 23% | 23% |

**1. Đặng Minh Hoàng – SE193626 (Leader) – mức đóng góp 43%**

Feature đã hoàn thành (Organization Onboarding):

- Register an organization: đăng ký tổ chức và tài khoản quản trị, xác thực email, thiết lập MFA và recovery codes, tiếp tục đăng ký dở dang, lưu lựa chọn starter catalog.
- Select a subscription: so sánh các gói thuê bao theo giá, tiền tệ, thời hạn và số seat Employee; chọn phiên bản gói hợp lệ, không cho client tự đặt điều khoản thương mại.
- Pay for a subscription: tạo phiên thanh toán payOS từ điều khoản gói tin cậy, phân biệt thanh toán đủ / đang chờ / thiếu / thất bại, chống tạo giao dịch trùng khi thử lại.
- Track onboarding and access the workspace: hiển thị trạng thái đăng ký, thanh toán và chuẩn bị workspace; chỉ cho vào workspace khi đã thanh toán, chuẩn bị xong và xác thực chủ sở hữu hợp lệ.
- Provision organization workspaces: tạo tổ chức, workspace, tài khoản quản trị đầu tiên và kỳ thuê bao một cách nguyên tử; sao chép starter catalog trước khi sẵn sàng; ghi nhận lỗi và cho phép thử lại.
- Manage Platform Organizations, Subscriptions & Monitoring: quản lý tổ chức và trạng thái workspace, cấu hình gói thuê bao, theo dõi hoạt động, thanh toán và nhật ký của nền tảng.
- Manage Organization Users, Departments & Subscriptions: quản lý người dùng (kể cả import hàng loạt), phòng ban, vai trò, cài đặt workspace, giới hạn seat và gia hạn thuê bao.
- Monitor employee development: L&D Manager xem hồ sơ năng lực, khoảng trống kỹ năng, kết quả đánh giá, tiến độ học tập của nhân viên; lọc theo phòng ban và Job Position.

Công việc khác:

- Quản lý dự án: khởi tạo repository, lập kế hoạch sprint, phân công chức năng cho 4 thành viên, tích hợp các nhánh vào main.
- Setup cấu trúc hệ thống: thiết kế kiến trúc tổng thể; tái cấu trúc backend theo kiến trúc phân lớp (apis – services – repository – entities); chuyển tầng lưu trữ sang Spring Data JPA và Spring Data Neo4j; chuẩn hóa controller dùng DTO.
- Multi-tenant: phục vụ tổ chức theo đường dẫn /workspace/{slug} với cô lập dữ liệu giữa các tổ chức; cấu hình bật/tắt PayOS, email và MFA theo môi trường.
- Deployment: quy trình triển khai on-premises bằng Docker và Nginx, cấu hình SMTP và PayOS qua firewall, tự động seed tài khoản quản trị nền tảng.
- Schema DB: lược đồ PostgreSQL, DBML và Neo4j schema.
- Demo: kịch bản demo, file Excel import mẫu (cơ cấu tổ chức, người dùng, competency, micro-skill), trang reset dữ liệu demo.
- Tài liệu: Report 2 – Project Management Plan, Report 3 – SRS, Report 4 – SDD (phần chính), Report 5 – Test Report, BM04 Review 2 Commitment; Product Overview, Architecture, danh mục feature; sơ đồ Mermaid; tài liệu kiểm thử unit, integration và system.

**2. Nguyễn Anh Khôi – SE192491 – mức đóng góp 15%**

Feature đã hoàn thành (Target Role & Competency Ontology Management):

- Competencies Management: tạo Competency với mã duy nhất, duyệt cây ontology, cập nhật tiêu đề và mô tả, xóa Competency và gỡ các quan hệ trên Neo4j.
- Micro-skills Management & Prerequisites: định nghĩa Micro-skill thuộc Competency, tìm kiếm và lọc, thiết lập quan hệ tiên quyết có hướng, chặn xóa Micro-skill đang được sử dụng.
- Target Roles Management & Versioning: tạo bản nháp Target Role theo Job Position, phân công Expert, cấu hình Level và thời lượng học, cấu hình mức kiến thức kỹ năng theo Level, gửi duyệt và xử lý phản hồi, phát hành Role, tạo phiên bản kế tiếp mà không ảnh hưởng Role đang hoạt động.
- Ontology Knowledge Graph Playground: trực quan hóa, tìm kiếm và điều hướng (zoom, pan, fit) các node và quan hệ giữa Job Position, Target Role, Competency, Micro-skill; mở rộng node lân cận và liên kết quan hệ tiên quyết.
- Neo4j query latency: đo độ trễ truy vấn tìm đường 3–5 hop trên ontology giả lập 1k, 5k và 10k nodes, 1.000 truy vấn mỗi mức, báo cáo Mean và P95.

Công việc khác:

- Setup cấu trúc frontend: tái cấu trúc và thiết kế lại hệ thống frontend, bổ sung giao diện cho các actor mới, hoàn thiện UI/UX cổng Employee.
- Quản lý Department trên Neo4j: thêm, lọc, xóa phòng ban; bộ lọc Competency.
- Deployment: sửa lỗi triển khai (SMTP không làm dừng hệ thống, dữ liệu Job Position khi deploy).
- Schema DB: cập nhật Neo4j schema và sơ đồ liên quan.
- Kiểm thử: 22 test case cho luồng quản lý Target Role và Ontology, unit test và system test cho luồng quản lý Target Role.
- Tài liệu: hướng dẫn và chỉ mục kiểm thử luồng Target Role, tài liệu nghiên cứu RQ2, cập nhật Report 1–4 phần Target Role và Ontology.

**3. Nguyễn Trần Việt An – SE184889 – mức đóng góp 19%**

Feature đã hoàn thành (Question Bank Management và Learning Module Management):

- Author, search and import questions: Expert soạn, tìm kiếm câu hỏi; câu hỏi gửi duyệt phải có Skill, nội dung, 4 đáp án, 1 đáp án đúng và độ khó; import Excel/JSON có xem trước và từ chối lô không hợp lệ.
- Review, version and assign responsibility: L&D Manager duyệt đúng phiên bản đã gửi, trả lại hoặc rút kèm lý do; câu hỏi đã phát hành không thể sửa, chỉ tạo một bản nháp kế tiếp.
- Security, history and availability: Expert khác chỉ được xem; L&D Manager phân công và chuyển giao trách nhiệm; ngừng và kích hoạt lại câu hỏi; chặn truy cập chéo giữa các tổ chức.
- Author and import Modules/content: tạo và sửa mô-đun gắn đúng một Skill, sắp xếp bài học Text/Video; lưu bản nháp chưa hoàn chỉnh; import Excel/ZIP có xem trước và xác nhận nguyên tử.
- Review submission and enforce permissions: gửi duyệt đúng phiên bản mô-đun, chỉnh sửa khi bị trả lại; Expert khác chỉ được xem; lưu lịch sử người thực hiện và thời gian.
- Intake, release and archive lifecycle: L&D Manager xem toàn bộ bài học, trả lại kèm phản hồi hoặc phê duyệt; phát hành và lưu trữ có thể thử lại khi lỗi; khôi phục cần duyệt lại.

Công việc khác:

- Schema DB: thiết kế và cập nhật Neo4j schema, ontology; cập nhật migration cơ sở dữ liệu.
- Dữ liệu: xây dựng bộ dữ liệu cho RQ1, RQ2 và RQ3; file Excel dữ liệu demo (cơ cấu tổ chức, người dùng).
- Chức năng bổ sung: Individual Skill; UI/UX cho câu hỏi và mô-đun, trang landing; bỏ thông báo câu hỏi và tinh chỉnh bộ lọc mô-đun/đánh giá.
- Kiểm thử: tài liệu kiểm thử system, integration và unit cho ngân hàng câu hỏi và mô-đun học tập.
- Tài liệu: Architecture, đặc tả feature Learning Module Management, lịch sử kỹ thuật quản lý mô-đun, cập nhật Report 1–4, BM01, BM02.

**4. Trần An Quốc – SE182280 – mức đóng góp 23%**

Feature đã hoàn thành (Assessment and Adaptive Learning Pathway):

- Baseline assessment: L&D Manager cấu hình chính sách đánh giá theo Role–Level; Employee bắt đầu, tiếp tục, nộp bài hoặc hết hạn; lưu đề thi cố định, kết quả theo nhóm và lịch sử.
- Choose or change Role: Employee chọn Target Role đã phát hành và Level thực tế; chặn đổi Role khi còn bài đánh giá hoặc công việc bắt buộc; giữ lại bằng chứng và lịch sử trước đó.
- Generate and approve pathway: so sánh kết quả với yêu cầu Role, sinh lộ trình gồm các lựa chọn mô-đun hoặc chứng chỉ; Expert được phân công phê duyệt, sau đó Employee xem lộ trình.
- Learn, recalculate and complete: Employee học và làm bài đánh giá kỹ năng; tái tính toán lộ trình từ bằng chứng được chấp nhận, giữ lại phần đã hoàn thành, kết thúc khi đáp ứng mọi yêu cầu bắt buộc.
- Configure Skill provision and assessment: Expert gắn mỗi phạm vi kiến thức Skill với các mô-đun hoặc chứng chỉ, cấu hình nhóm câu hỏi chính và tiên quyết; kiểm tra quyền sở hữu, độ phủ và ngân hàng câu hỏi.
- RIASEC Assessment & Local AI Job Position Recommendation: chấm và lưu kết quả RIASEC; dùng Local AI so sánh với các Job Position và giải thích mức phù hợp; không tự gán Target Role.

Công việc khác:

- Kế hoạch: lập kế hoạch sprint cho phần việc của mình.
- Schema DB: lược đồ PostgreSQL cho assessment, baseline và pathway.
- Thiết kế: Activity diagram và State machine diagram cho luồng đánh giá và sinh lộ trình.
- Hoàn thiện giao diện: đồng bộ UI đánh giá và lộ trình với chính sách Role dùng chung, sửa lỗi UI, luồng duyệt chứng chỉ và luồng học tập demo.
- Kiểm thử: tài liệu kiểm thử system cho luồng đánh giá và lộ trình.
- Tài liệu: tài liệu kỹ thuật Baseline, Initial Pathway, Organization Rule Assessment and Pathway; đặc tả feature Baseline Knowledge Assessment và Target Role Selection; cập nhật Report 2–4, BM01, BM02.
## 4. Đánh giá

### 4.1. Mức độ đạt được so với mục tiêu

So với đề cương đăng ký (FA26SE267), nhóm đã hoàn thành phần lớn phạm vi chức năng cốt lõi ở mức mã nguồn:

- Onboarding tổ chức, thanh toán thuê bao và cấp phát workspace đa tổ chức.
- Ontology năng lực trên Neo4j (Competency, MicroSkill, quan hệ tiên quyết, Target Role, Level).
- Ngân hàng câu hỏi và mô-đun học tập với vòng đời duyệt, phát hành, lưu trữ.
- Đánh giá đầu vào theo Role–Level với đề thi cố định, chấm điểm theo nhóm, sinh lộ trình khởi tạo, Expert phê duyệt và tái tính toán tiên quyết theo bằng chứng chính thức.
- Đánh giá RIASEC (60 hoạt động song ngữ Anh – Việt, 6 điểm thang 0–40) và gợi ý tối đa 3 Job Position bằng Local AI (Ollama).

Về nghiên cứu: RQ2 đã hoàn thành thí nghiệm và có kết quả đo; RQ1 và RQ3 đã có thiết kế thí nghiệm, đang hoàn thiện số liệu. Tài liệu Report 1 đến Report 5 và các biểu mẫu Review 2 đã hoàn thành.

Nhóm tự đánh giá mức độ đạt khoảng 75–80% so với đề cương; phần còn lại tập trung hoàn thiện cho Defense 1.1.

### 4.2. Hạn chế của khóa luận

1. Hệ thống là bản proof-of-concept cho bộ máy gợi ý lộ trình học dựa trên biểu đồ tri thức, không phải một Learning Management System (LMS) đầy đủ tính năng nhằm thay thế ngay các nền tảng thương mại.
2. Việc đánh giá được thực hiện trên bộ dữ liệu kỹ năng giả lập được tuyển chọn và các mô-đun học tập mẫu (dummy), nhằm chứng minh tính đúng đắn của thuật toán và độ trễ khi duyệt biểu đồ tri thức; chưa đánh giá trên dữ liệu doanh nghiệp thực tế.
3. Ontology năng lực được giới hạn trong miền Kỹ sư phần mềm (Software Engineering).
4. Không xây dựng nội dung học tập thực tế: không quay video, không đóng gói SCORM, không biên soạn giáo trình chi tiết. Hệ thống chỉ lưu trữ tài liệu học mẫu (PDF, văn bản, bài giảng mẫu) trên MinIO để minh họa luồng học tập đa tổ chức.
5. Ngoài phạm vi đề tài: Generative AI dùng để tạo nội dung, hạ tầng video streaming, tuân thủ chuẩn LMS SCORM.
6. Ngoài phạm vi đề tài: ứng dụng di động native, tích hợp HR/payroll, mua khóa học bên ngoài, cấp chứng chỉ tự động, quy trình hoàn tiền/hủy thuê bao và xuất báo cáo.