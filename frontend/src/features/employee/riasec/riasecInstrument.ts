export const manifest = {
  "instrumentId": "onet-short-form-pdf-adaptation",
  "version": "alg-riasec-60-en-vi-v1",
  "translationRevision": "project-vi-r1-2026-11-15-unreviewed",
  "scoringVersion": "onet-short-form-0-4-sum-v1",
  "source": {
    "url": "https://www.onetcenter.org/dl_tools/ipsf/Interest_Profiler.pdf",
    "sourceVersion": "O*NET Interest Profiler Short Form PDF (v1)",
    "retrievedOn": "2026-11-15",
    "sha256": "843c7d9959de58dc177435e7e3af4dbc99a9f48f98d6b4fdcc2aee762a63e721",
    "mapping": "Application IDs, not official item numbers. In each R/I/A/S/E/C section on page 1: left column top-to-bottom (01-05), then right (06-10). English line wraps joined with spaces; wording unchanged."
  },
  "scoringSource": "https://www.onetcenter.org/dl_files/IP_Manual.pdf — Manual v1.0, March 2021, chapter 3: five-response 0–4 sums, ten activities per interest, raw scores 0–40. This adaptation combines those responses with PDF activities. Scores are not percentiles or competence measures.",
  "license": {
    "url": "https://www.onetcenter.org/license_toolsdev.html",
    "warrantyUrl": "https://www.onetcenter.org/license_toolsdev.html",
    "attribution": "Sponsored by the U.S. Department of Labor, Employment & Training Administration. Developed by the National Center for O*NET Development (v1).",
    "modificationNotice": "This application includes information from the O*NET Career Exploration Tools by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the O*NET Tools Developer License. O*NET® is a trademark of USDOL/ETA. Adapt-Learn-Graph has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.",
    "modifications": {
      "en": "PDF activities combined with five 0–4 responses, application IDs, raw sums 0–40 and project Vietnamese translation. Unvalidated adaptation; translation has not been independently reviewed or psychometrically validated. License §3(b) validation remains unresolved; no public release clearance. This notice does not satisfy validation.",
      "vi": "Kết hợp các hoạt động trong PDF với năm mức trả lời 0–4, mã câu của ứng dụng, tổng điểm thô 0–40 và bản dịch tiếng Việt của dự án. Bản thích ứng chưa được kiểm định; bản dịch chưa được rà soát độc lập hoặc kiểm định tâm trắc. Yêu cầu kiểm định theo §3(b) chưa được giải quyết; chưa đủ điều kiện phát hành công khai. Thông báo này không thay thế việc kiểm định."
    },
    "validationStatus": "UNVALIDATED_ADAPTATION",
    "releaseCleared": false
  },
  "dimensionOrder": [
    "R",
    "I",
    "A",
    "S",
    "E",
    "C"
  ],
  "instructions": {
    "en": "How much would you like to do each activity? Think about your interests, rather than your current ability, required education or training, or pay. Choose one response for every activity. Unsure is an explicit answer; unanswered activities are not scored. Scores reflect interests, not percentiles or skill. Equal highest scores are tied; letter order does not break ties.",
    "vi": "Bạn muốn thực hiện mỗi hoạt động ở mức độ nào? Hãy nghĩ về sở thích, thay vì năng lực hiện tại, yêu cầu học tập hoặc đào tạo, hay thu nhập. Chọn một mức trả lời cho từng hoạt động. Chưa chắc là câu trả lời chủ động; câu chưa trả lời không được tính điểm. Điểm phản ánh sở thích, không phải phân vị hay kỹ năng. Các nhóm cùng điểm cao nhất được xem là đồng hạng; thứ tự chữ cái không phân định đồng hạng."
  },
  "responses": [
    {
      "code": 0,
      "label": {
        "en": "Strongly dislike",
        "vi": "Rất không thích"
      }
    },
    {
      "code": 1,
      "label": {
        "en": "Dislike",
        "vi": "Không thích"
      }
    },
    {
      "code": 2,
      "label": {
        "en": "Unsure",
        "vi": "Chưa chắc"
      }
    },
    {
      "code": 3,
      "label": {
        "en": "Like",
        "vi": "Thích"
      }
    },
    {
      "code": 4,
      "label": {
        "en": "Strongly like",
        "vi": "Rất thích"
      }
    }
  ],
  "items": [
    {
      "id": "R01",
      "dimension": "R",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 1,
      "text": {
        "en": "Build kitchen cabinets",
        "vi": "Đóng tủ bếp"
      }
    },
    {
      "id": "R02",
      "dimension": "R",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 2,
      "text": {
        "en": "Lay brick or tile",
        "vi": "Xây gạch hoặc lát gạch"
      }
    },
    {
      "id": "R03",
      "dimension": "R",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 3,
      "text": {
        "en": "Repair household appliances",
        "vi": "Sửa chữa thiết bị gia dụng"
      }
    },
    {
      "id": "R04",
      "dimension": "R",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 4,
      "text": {
        "en": "Raise fish in a fish hatchery",
        "vi": "Nuôi cá tại cơ sở ươm giống cá"
      }
    },
    {
      "id": "R05",
      "dimension": "R",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 5,
      "text": {
        "en": "Assemble electronic parts",
        "vi": "Lắp ráp linh kiện điện tử"
      }
    },
    {
      "id": "R06",
      "dimension": "R",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 1,
      "text": {
        "en": "Drive a truck to deliver packages to offices and homes",
        "vi": "Lái xe tải giao bưu kiện đến văn phòng và nhà ở"
      }
    },
    {
      "id": "R07",
      "dimension": "R",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 2,
      "text": {
        "en": "Test the quality of parts before shipment",
        "vi": "Kiểm tra chất lượng các bộ phận trước khi xuất hàng"
      }
    },
    {
      "id": "R08",
      "dimension": "R",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 3,
      "text": {
        "en": "Repair and install locks",
        "vi": "Sửa chữa và lắp đặt khóa"
      }
    },
    {
      "id": "R09",
      "dimension": "R",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 4,
      "text": {
        "en": "Set up and operate machines to make products",
        "vi": "Thiết lập và vận hành máy móc để sản xuất sản phẩm"
      }
    },
    {
      "id": "R10",
      "dimension": "R",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 5,
      "text": {
        "en": "Put out forest fires",
        "vi": "Dập tắt cháy rừng"
      }
    },
    {
      "id": "I01",
      "dimension": "I",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 1,
      "text": {
        "en": "Develop a new medicine",
        "vi": "Phát triển một loại thuốc mới"
      }
    },
    {
      "id": "I02",
      "dimension": "I",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 2,
      "text": {
        "en": "Study ways to reduce water pollution",
        "vi": "Nghiên cứu các cách giảm ô nhiễm nước"
      }
    },
    {
      "id": "I03",
      "dimension": "I",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 3,
      "text": {
        "en": "Conduct chemical experiments",
        "vi": "Thực hiện thí nghiệm hóa học"
      }
    },
    {
      "id": "I04",
      "dimension": "I",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 4,
      "text": {
        "en": "Study the movement of planets",
        "vi": "Nghiên cứu chuyển động của các hành tinh"
      }
    },
    {
      "id": "I05",
      "dimension": "I",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 5,
      "text": {
        "en": "Examine blood samples using a microscope",
        "vi": "Kiểm tra mẫu máu bằng kính hiển vi"
      }
    },
    {
      "id": "I06",
      "dimension": "I",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 1,
      "text": {
        "en": "Investigate the cause of a fire",
        "vi": "Điều tra nguyên nhân một vụ cháy"
      }
    },
    {
      "id": "I07",
      "dimension": "I",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 2,
      "text": {
        "en": "Develop a way to better predict the weather",
        "vi": "Phát triển phương pháp dự báo thời tiết chính xác hơn"
      }
    },
    {
      "id": "I08",
      "dimension": "I",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 3,
      "text": {
        "en": "Work in a biology lab",
        "vi": "Làm việc trong phòng thí nghiệm sinh học"
      }
    },
    {
      "id": "I09",
      "dimension": "I",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 4,
      "text": {
        "en": "Invent a replacement for sugar",
        "vi": "Phát minh chất thay thế đường"
      }
    },
    {
      "id": "I10",
      "dimension": "I",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 5,
      "text": {
        "en": "Do laboratory tests to identify diseases",
        "vi": "Thực hiện xét nghiệm để xác định bệnh"
      }
    },
    {
      "id": "A01",
      "dimension": "A",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 1,
      "text": {
        "en": "Write books or plays",
        "vi": "Viết sách hoặc kịch"
      }
    },
    {
      "id": "A02",
      "dimension": "A",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 2,
      "text": {
        "en": "Play a musical instrument",
        "vi": "Chơi một loại nhạc cụ"
      }
    },
    {
      "id": "A03",
      "dimension": "A",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 3,
      "text": {
        "en": "Compose or arrange music",
        "vi": "Sáng tác hoặc phối nhạc"
      }
    },
    {
      "id": "A04",
      "dimension": "A",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 4,
      "text": {
        "en": "Draw pictures",
        "vi": "Vẽ tranh"
      }
    },
    {
      "id": "A05",
      "dimension": "A",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 5,
      "text": {
        "en": "Create special effects for movies",
        "vi": "Tạo hiệu ứng đặc biệt cho phim"
      }
    },
    {
      "id": "A06",
      "dimension": "A",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 1,
      "text": {
        "en": "Paint sets for plays",
        "vi": "Vẽ phông cảnh cho các vở kịch"
      }
    },
    {
      "id": "A07",
      "dimension": "A",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 2,
      "text": {
        "en": "Write scripts for movies or television shows",
        "vi": "Viết kịch bản phim hoặc chương trình truyền hình"
      }
    },
    {
      "id": "A08",
      "dimension": "A",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 3,
      "text": {
        "en": "Perform jazz or tap dance",
        "vi": "Biểu diễn múa jazz hoặc nhảy thiết hài"
      }
    },
    {
      "id": "A09",
      "dimension": "A",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 4,
      "text": {
        "en": "Sing in a band",
        "vi": "Hát trong một ban nhạc"
      }
    },
    {
      "id": "A10",
      "dimension": "A",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 5,
      "text": {
        "en": "Edit movies",
        "vi": "Dựng phim"
      }
    },
    {
      "id": "S01",
      "dimension": "S",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 1,
      "text": {
        "en": "Teach an individual an exercise routine",
        "vi": "Hướng dẫn một người thực hiện bài tập thể dục"
      }
    },
    {
      "id": "S02",
      "dimension": "S",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 2,
      "text": {
        "en": "Help people with personal or emotional problems",
        "vi": "Giúp đỡ những người gặp vấn đề cá nhân hoặc cảm xúc"
      }
    },
    {
      "id": "S03",
      "dimension": "S",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 3,
      "text": {
        "en": "Give career guidance to people",
        "vi": "Tư vấn định hướng nghề nghiệp cho mọi người"
      }
    },
    {
      "id": "S04",
      "dimension": "S",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 4,
      "text": {
        "en": "Perform rehabilitation therapy",
        "vi": "Thực hiện trị liệu phục hồi chức năng"
      }
    },
    {
      "id": "S05",
      "dimension": "S",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 5,
      "text": {
        "en": "Do volunteer work at a non-profit organization",
        "vi": "Làm tình nguyện tại một tổ chức phi lợi nhuận"
      }
    },
    {
      "id": "S06",
      "dimension": "S",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 1,
      "text": {
        "en": "Teach children how to play sports",
        "vi": "Dạy trẻ em cách chơi thể thao"
      }
    },
    {
      "id": "S07",
      "dimension": "S",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 2,
      "text": {
        "en": "Teach sign language to people who are deaf or hard of hearing",
        "vi": "Dạy ngôn ngữ ký hiệu cho người điếc hoặc khiếm thính"
      }
    },
    {
      "id": "S08",
      "dimension": "S",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 3,
      "text": {
        "en": "Help conduct a group therapy session",
        "vi": "Hỗ trợ thực hiện một buổi trị liệu nhóm"
      }
    },
    {
      "id": "S09",
      "dimension": "S",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 4,
      "text": {
        "en": "Take care of children at a day-care center",
        "vi": "Chăm sóc trẻ em tại cơ sở giữ trẻ ban ngày"
      }
    },
    {
      "id": "S10",
      "dimension": "S",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 5,
      "text": {
        "en": "Teach a high-school class",
        "vi": "Dạy một lớp trung học phổ thông"
      }
    },
    {
      "id": "E01",
      "dimension": "E",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 1,
      "text": {
        "en": "Buy and sell stocks and bonds",
        "vi": "Mua bán cổ phiếu và trái phiếu"
      }
    },
    {
      "id": "E02",
      "dimension": "E",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 2,
      "text": {
        "en": "Manage a retail store",
        "vi": "Quản lý một cửa hàng bán lẻ"
      }
    },
    {
      "id": "E03",
      "dimension": "E",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 3,
      "text": {
        "en": "Operate a beauty salon or barber shop",
        "vi": "Điều hành một cơ sở làm đẹp hoặc tiệm cắt tóc"
      }
    },
    {
      "id": "E04",
      "dimension": "E",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 4,
      "text": {
        "en": "Manage a department within a large company",
        "vi": "Quản lý một phòng ban trong công ty lớn"
      }
    },
    {
      "id": "E05",
      "dimension": "E",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 5,
      "text": {
        "en": "Start your own business",
        "vi": "Tự khởi nghiệp kinh doanh"
      }
    },
    {
      "id": "E06",
      "dimension": "E",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 1,
      "text": {
        "en": "Negotiate business contracts",
        "vi": "Đàm phán hợp đồng kinh doanh"
      }
    },
    {
      "id": "E07",
      "dimension": "E",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 2,
      "text": {
        "en": "Represent a client in a lawsuit",
        "vi": "Đại diện cho khách hàng trong một vụ kiện"
      }
    },
    {
      "id": "E08",
      "dimension": "E",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 3,
      "text": {
        "en": "Market a new line of clothing",
        "vi": "Tiếp thị một dòng sản phẩm quần áo mới"
      }
    },
    {
      "id": "E09",
      "dimension": "E",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 4,
      "text": {
        "en": "Sell merchandise at a department store",
        "vi": "Bán hàng tại một cửa hàng bách hóa"
      }
    },
    {
      "id": "E10",
      "dimension": "E",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 5,
      "text": {
        "en": "Manage a clothing store",
        "vi": "Quản lý một cửa hàng quần áo"
      }
    },
    {
      "id": "C01",
      "dimension": "C",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 1,
      "text": {
        "en": "Develop a spreadsheet using computer software",
        "vi": "Tạo bảng tính bằng phần mềm máy tính"
      }
    },
    {
      "id": "C02",
      "dimension": "C",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 2,
      "text": {
        "en": "Proofread records or forms",
        "vi": "Soát lỗi hồ sơ hoặc biểu mẫu"
      }
    },
    {
      "id": "C03",
      "dimension": "C",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 3,
      "text": {
        "en": "Install software across computers on a large network",
        "vi": "Cài đặt phần mềm trên các máy tính trong một mạng lớn"
      }
    },
    {
      "id": "C04",
      "dimension": "C",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 4,
      "text": {
        "en": "Operate a calculator",
        "vi": "Sử dụng máy tính cầm tay"
      }
    },
    {
      "id": "C05",
      "dimension": "C",
      "sourcePage": 1,
      "sourceColumn": "left",
      "sourceRow": 5,
      "text": {
        "en": "Keep shipping and receiving records",
        "vi": "Ghi chép hồ sơ giao và nhận hàng"
      }
    },
    {
      "id": "C06",
      "dimension": "C",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 1,
      "text": {
        "en": "Calculate the wages of employees",
        "vi": "Tính tiền lương cho nhân viên"
      }
    },
    {
      "id": "C07",
      "dimension": "C",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 2,
      "text": {
        "en": "Inventory supplies using a hand-held computer",
        "vi": "Kiểm kê vật tư bằng máy tính cầm tay"
      }
    },
    {
      "id": "C08",
      "dimension": "C",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 3,
      "text": {
        "en": "Record rent payments",
        "vi": "Ghi chép các khoản thanh toán tiền thuê"
      }
    },
    {
      "id": "C09",
      "dimension": "C",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 4,
      "text": {
        "en": "Keep inventory records",
        "vi": "Ghi chép hồ sơ hàng tồn kho"
      }
    },
    {
      "id": "C10",
      "dimension": "C",
      "sourcePage": 1,
      "sourceColumn": "right",
      "sourceRow": 5,
      "text": {
        "en": "Stamp, sort, and distribute mail for an organization",
        "vi": "Đóng dấu, phân loại và phân phát thư cho một tổ chức"
      }
    }
  ]
}
