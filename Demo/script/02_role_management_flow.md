# Kịch bản Lời thoại Thuyết trình Demo: Luồng Quản lý và Khởi tạo Vị trí Công việc

---

## 📑 MỤC LỤC & CHỈ MỤC THEO DÕI

- [PHẦN 1. L&D Manager phân quyền Expert, quy định thời gian học & Bàn giao (Send to Expert)](#phần-1-ld-manager-phân-quyền-expert-quy-định-thời-gian-học--bàn-giao-send-to-expert)
- [PHẦN 2. Domain Expert khởi tạo & Nạp tri thức Ontology (Competency & Micro-skills)](#phần-2-domain-expert-khởi-tạo--nạp-tri-thức-ontology-competency--micro-skills)
- [PHẦN 3. Domain Expert hiệu chỉnh Đồ thị Tri thức Sống trên Explore Graph (Xử lý 3 sai sót thực tế)](#phần-3-domain-expert-hiệu-chỉnh-đồ-thị-tri-thức-sống-trên-explore-graph-xử-lý-3-sai-sót-thực-tế)
- [PHẦN 4. Domain Expert cấu hình Cây Năng Lực cho từng Level (Thủ công vs. Excel) & Kiểm tra Validation](#phần-4-domain-expert-cấu-hình-cây-năng-lực-cho-từng-level-thủ-công-vs-excel--kiểm-tra-validation)
- [PHẦN 5. L&D Manager thẩm định Validation và Phê duyệt (Approve & Publish) 3 Target Roles](#phần-5-ld-manager-thẩm-định-validation-và-phê-duyệt-approve--publish-3-target-roles)

---

## PHẦN 1. L&D Manager phân quyền Expert, quy định thời gian học & Bàn giao (Send to Expert)

### 🎙️ Lời thoại thuyết trình:

> *"Tiếp theo sẽ là luồng quản lý và khởi tạo vị trí công việc cho tổ chức.*
>
> *Đầu tiên, em sẽ login vào tài khoản L&D Manager và assign Expert vào role để Expert có thể gán các nội dung học và các kỹ năng cần thiết để đạt được role đó. Sau khi assign xong, họ có thể send cho Expert. Bên cạnh đó, L&D Manager còn có thể quy định thời gian học của từng level trong role đó."*

---

## PHẦN 2. Domain Expert khởi tạo & Nạp tri thức Ontology (Competency & Micro-skills)

### 🎙️ Lời thoại thuyết trình:

> *"Tiếp theo, em sẽ login vào tài khoản Expert. Vì tổ chức chưa có competency và micro-skill nên em sẽ bắt đầu import nó vào.*
>
> *Trước tiên là competency: khi create sẽ cần code, name, description. Giờ em sẽ import competency vào.*
>
> *Tiếp theo là create micro-skill: cần code, name, description, và phương thức kiểm định của từng knowledge level và relationship giữa competency và micro-skill. Còn tạo prerequisites giữa micro-skill với nhau, thì chỉ cần chọn 2 micro-skill.*
>
> *Sau đây, em sẽ import các micro-skill và relationships của chúng vào."*

---

## PHẦN 3. Domain Expert hiệu chỉnh Đồ thị Tri thức Sống trên Explore Graph (Xử lý 3 sai sót thực tế)

### 🎙️ Lời thoại thuyết trình:

> *"Trong thực tế, khi import dữ liệu, dữ liệu có thể tồn tại những sai sót. Giao diện này cho phép Expert sửa chữa ngay tại chỗ.*
>
> *- **Trường hợp 1:** Đồ thị đang thể hiện 'Học Streams trước rồi mới học OOP' - điều này là không đúng. Em sẽ bấm 'Switch Direction' để đảo đúng chiều.*
>
> *- **Trường hợp 2:** Docker và Spring MVC bị nối nhầm quan hệ phụ thuộc. Em sẽ bấm 'Delete Relationship' để xóa ràng buộc thừa này.*
>
> *- **Trường hợp 3:** Muốn xử lý Transaction trong Spring, lập trình viên bắt buộc phải nắm vững Concurrency. Em sẽ chọn transaction và connect nó với Concurrency.*
>
> *Mọi thao tác chỉnh sửa đồ thị trên màn hình đều cập nhật trực tiếp vào cơ sở dữ liệu Neo4j."*

---

## PHẦN 4. Domain Expert cấu hình Cây Năng Lực cho từng Level (Thủ công vs. Excel) & Kiểm tra Validation

### 🎙️ Lời thoại thuyết trình:

> *"Sau khi Ontology đã hoàn chỉnh, Domain Expert bước vào nhiệm vụ quan trọng nhất: Xây dựng bộ competency và micro-skill cần của từng level cho role. Nền tảng của chúng em cung cấp 2 phương thức đó là điều chỉnh thủ công và import từ excel.*
>
> *Với role Java Backend Developer em sẽ gán thủ công... Sau khi điều chỉnh xong, họ có thể check lại validation trước khi gửi cho L&D kiểm duyệt. Có thể thấy là mọi level đã có competency và micro-skill, và các skill còn thiếu module và question bank. Và họ có thể bổ sung sau nên em sẽ submit trước cho L&D duyệt.*
>
> *Còn 2 role kia em sẽ tiến hành config bằng excel và gửi cho L&D duyệt."*

---

## PHẦN 5. L&D Manager thẩm định Validation và Phê duyệt (Approve & Publish) 3 Target Roles

### 🎙️ Lời thoại thuyết trình:

> *"Bây giờ em sẽ login vào tài khoản L&D, check validation và duyệt cho 3 role."*
