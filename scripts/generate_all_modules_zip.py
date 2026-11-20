#!/usr/bin/env python3
"""
Generates a complete ZIP package for importing all modules from dataset
into Adapt-Learn-Graph system via the ZIP module import feature.
Conforms strictly to ModuleImportTemplate.java and ExcelLearningImport.java contracts.
"""

import os
import sys
import json
import io
import zipfile
import html
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

VIETNAMESE_INSTRUCTIONS = """HƯỚNG DẪN IMPORT MODULE VÀ BÀI HỌC
1. Giải nén mẫu. Giữ module.xlsx ở thư mục gốc, Word trong lesson/ và MP4 trong video/.
2. Modules: mỗi dòng là một module. Mã liên kết module (M1, M2) chỉ dùng trong gói; hệ thống tự tạo ID thật.
3. Chỉ nhập một mã Skill như MS-QA08, không nhập JSON. Tra mã và tên tại DanhMuc. Danh sách lấy từ tổ chức hiện tại; mức kiến thức phải cho phép học bằng module.
4. Chọn Nền tảng, Trung cấp hoặc Nâng cao; chọn loại module; thời lượng module là số nguyên dương tính bằng phút.
5. Lessons: mỗi dòng là một bài. Mã module phải khớp Modules; mã bài học không trùng trong gói. Thứ tự là số nguyên dương, không trùng trong cùng module.
6. Bài đọc trỏ tới lesson/ten-bai.docx; Video trỏ tới video/ten-phim.mp4. Không ghi nội dung dài vào Excel.
7. Tệp nội dung là đường dẫn tương đối, phân biệt chữ hoa/thường. Dùng /; không dùng C:\\..., URL Internet hoặc ../.
8. Word hỗ trợ đoạn văn, tiêu đề, chữ đậm/nghiêng/gạch chân, danh sách, bảng đơn giản và ảnh PNG/JPEG/WebP nhúng. Nội dung được chuyển vào editor, không giữ bố cục trang, phông chữ, đầu/chân trang.
9. Phương trình, biểu đồ, hộp văn bản, tài liệu nhúng, nội dung sửa đổi chưa chấp nhận và ảnh/liên kết dữ liệu bên ngoài không được hỗ trợ; chuyển thành nội dung hoặc ảnh nhúng thông thường trước khi nhập.
10. Thay các dòng và tệp mẫu bằng nội dung thật. Video đi kèm chỉ minh họa phát nội dung, không phải học liệu đầy đủ.
11. Nén module.xlsx, lesson/ và video/ trực tiếp thành một ZIP, không bọc thêm thư mục ngoài. Không dùng RAR, XLSX đơn lẻ hoặc mẫu Markdown/JSON cũ.
12. Tải ZIP lên, xem lỗi theo dòng và xem trước bài đọc/video. Chỉ xác nhận khi mọi lỗi đã được sửa. Gói lỗi không tạo module một phần.
13. Mỗi import tạo bản nháp mới; người import là người phụ trách ban đầu. Không ghi đè module có sẵn, không tự gửi duyệt/phát hành.
Giới hạn: tuân theo dung lượng được cấu hình trên nền tảng; tối đa 5000 dòng mỗi sheet, 200 bài mỗi module và 2000 mục trong ZIP. Không đặt mật khẩu cho ZIP/Word/Excel.
Hai sheet dữ liệu là Modules và Lessons. HuongDan, InstructionsEN và DanhMuc không được nhập thành module."""

ENGLISH_INSTRUCTIONS = """MODULE AND LESSON IMPORT INSTRUCTIONS
1. Extract the template. Keep module.xlsx at ZIP root, DOCX files in lesson/ and MP4 files in video/.
2. Modules has one module per row. Mã liên kết module means module reference (M1, M2); it is batch-only, not the actual generated module ID.
3. Tên module = module title; Mã Skill = one plain Skill code, never JSON. Use DanhMuc for names/codes. Choices belong to this organization; the chosen knowledge level must permit module learning.
4. Mức kiến thức: Nền tảng = Foundation, Trung cấp = Intermediate, Nâng cao = Advanced. Loại module: Bài học và thực hành = Lesson and practice; Thực hành theo tài liệu = Resource-guided practice. Thời lượng (phút) is a positive integer in minutes.
5. Lessons: Mã liên kết module = module reference; Mã liên kết bài học = batch lesson reference; Thứ tự = positive order within a module; Tên bài học = lesson title. Lesson references must be unique in the package; order must be unique per module.
6. Loại bài học: Bài đọc = DOCX reading; Video = uploaded MP4. Tệp nội dung = relative file path such as lesson/example.docx or video/example.mp4.
7. Paths are case-sensitive; use forward slashes. Do not use absolute paths, internet URLs, backslashes or parent traversal.
8. DOCX supports paragraphs, headings, bold/italic/underline, lists, simple tables and embedded PNG/JPEG/WebP images. Content becomes editable; exact page layout, fonts, headers and footers are not preserved.
9. Equations, charts, text boxes, embedded objects, pending tracked changes and external media/data relationships are unsupported. Convert them to ordinary content/embedded images first.
10. Replace sample rows and files with real learning content. Included videos only demonstrate playback, not a complete lesson.
11. ZIP module.xlsx, lesson/ and video/ directly, without an extra enclosing folder. RAR, standalone XLSX and old Markdown/JSON templates are not accepted. Keep sheet names and column headers unchanged.
12. Upload ZIP, review row-specific errors and preview the actual readings/videos. Confirm only after resolving every error. Invalid batches do not create partial modules.
13. Each confirmed import creates new drafts owned by the importing Expert. It never updates existing modules or auto-submits/publishes content.
Limits: configured platform size limits, at most 5000 rows per sheet, 200 lessons per module and 2000 ZIP entries. Do not password-protect the ZIP or Office documents.
Only Modules and Lessons are import data. HuongDan, InstructionsEN and DanhMuc are supporting sheets."""

LEVEL_MAP = {
    "FOUNDATION": "Nền tảng",
    "INTERMEDIATE": "Trung cấp",
    "ADVANCED": "Nâng cao"
}

TYPE_MAP = {
    "LESSON_AND_PRACTICE": "Bài học và thực hành",
    "RESOURCE_GUIDED_PRACTICE": "Thực hành theo tài liệu"
}

def escape_xml(text: str) -> str:
    """Escapes string for XML insertion and filters out illegal control characters."""
    if not text:
        return ""
    # Strip illegal XML chars (preserve \t, \n, \r)
    clean = "".join(ch for ch in text if ch in "\t\n\r" or ord(ch) >= 32)
    return html.escape(clean, quote=True)

def create_docx_bytes(title: str, markdown_body: str) -> bytes:
    """Creates a standard, unencrypted DOCX file as bytes with title and paragraphs."""
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

    doc_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>"""

    paragraphs_xml = []
    
    # Title paragraph
    safe_title = escape_xml(title)
    paragraphs_xml.append(
        f'<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>'
        f'<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">{safe_title}</w:t></w:r></w:p>'
    )
    
    lines = markdown_body.splitlines() if markdown_body else []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        
        # Check headings
        if stripped.startswith("# "):
            h_text = escape_xml(stripped[2:].strip())
            paragraphs_xml.append(
                f'<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>'
                f'<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">{h_text}</w:t></w:r></w:p>'
            )
        elif stripped.startswith("## "):
            h_text = escape_xml(stripped[3:].strip())
            paragraphs_xml.append(
                f'<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>'
                f'<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">{h_text}</w:t></w:r></w:p>'
            )
        elif stripped.startswith("### "):
            h_text = escape_xml(stripped[4:].strip())
            paragraphs_xml.append(
                f'<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr>'
                f'<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">{h_text}</w:t></w:r></w:p>'
            )
        elif stripped.startswith("- ") or stripped.startswith("* "):
            bullet_text = escape_xml(stripped[2:].strip())
            paragraphs_xml.append(
                f'<w:p><w:r><w:t xml:space="preserve">• {bullet_text}</w:t></w:r></w:p>'
            )
        else:
            p_text = escape_xml(stripped)
            paragraphs_xml.append(
                f'<w:p><w:r><w:t xml:space="preserve">{p_text}</w:t></w:r></w:p>'
            )
            
    # Guarantee at least one content paragraph
    if len(paragraphs_xml) == 1:
        paragraphs_xml.append(
            '<w:p><w:r><w:t xml:space="preserve">Nội dung bài học thực hành và lý thuyết nền tảng.</w:t></w:r></w:p>'
        )

    document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {''.join(paragraphs_xml)}
  </w:body>
</w:document>"""

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as docx_zip:
        docx_zip.writestr("[Content_Types].xml", content_types)
        docx_zip.writestr("_rels/.rels", rels)
        docx_zip.writestr("word/_rels/document.xml.rels", doc_rels)
        docx_zip.writestr("word/document.xml", document_xml)
    return buf.getvalue()

def build_workbook(modules_data, lessons_data, skills_catalog) -> bytes:
    """Builds module.xlsx conforming to ModuleImportTemplate styling and structure."""
    wb = openpyxl.Workbook()
    
    # Fonts & Styles
    header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="C2410C", end_color="C2410C", fill_type="solid") # Brand Orange/Amber
    normal_font = Font(name="Arial", size=11)
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center", wrap_text=True)
    
    # 1. HuongDan Sheet
    ws_vi = wb.active
    ws_vi.title = "HuongDan"
    ws_vi.views.sheetView[0].showGridLines = False
    ws_vi.column_dimensions["A"].width = 110
    for row_idx, line in enumerate(VIETNAMESE_INSTRUCTIONS.splitlines(), start=1):
        cell = ws_vi.cell(row=row_idx, column=1, value=line)
        cell.font = normal_font
        cell.alignment = left_align
        ws_vi.row_dimensions[row_idx].height = max(24, int(len(line) / 90.0 * 16 + 8))

    # 2. Modules Sheet
    ws_mod = wb.create_sheet("Modules")
    ws_mod.views.sheetView[0].showGridLines = True
    ws_mod.freeze_panes = "A2"
    mod_headers = ["Mã liên kết module", "Tên module", "Mã Skill", "Mức kiến thức", "Loại module", "Thời lượng (phút)"]
    ws_mod.row_dimensions[1].height = 36
    for col_idx, h in enumerate(mod_headers, start=1):
        cell = ws_mod.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align

    for row_idx, mod in enumerate(modules_data, start=2):
        ws_mod.row_dimensions[row_idx].height = 24
        # moduleRef, title, skillCode, knowledgeLevel, moduleType, durationMinutes
        ws_mod.cell(row=row_idx, column=1, value=mod["moduleRef"]).alignment = center_align
        ws_mod.cell(row=row_idx, column=2, value=mod["title"]).alignment = left_align
        ws_mod.cell(row=row_idx, column=3, value=mod["skillCode"]).alignment = center_align
        ws_mod.cell(row=row_idx, column=4, value=mod["knowledgeLevel"]).alignment = center_align
        ws_mod.cell(row=row_idx, column=5, value=mod["moduleType"]).alignment = center_align
        ws_mod.cell(row=row_idx, column=6, value=mod["durationMinutes"]).alignment = center_align
        for col_idx in range(1, 7):
            ws_mod.cell(row=row_idx, column=col_idx).font = normal_font

    ws_mod.column_dimensions["A"].width = 24
    ws_mod.column_dimensions["B"].width = 52
    ws_mod.column_dimensions["C"].width = 24
    ws_mod.column_dimensions["D"].width = 24
    ws_mod.column_dimensions["E"].width = 32
    ws_mod.column_dimensions["F"].width = 24

    # 3. Lessons Sheet
    ws_les = wb.create_sheet("Lessons")
    ws_les.views.sheetView[0].showGridLines = True
    ws_les.freeze_panes = "A2"
    les_headers = ["Mã liên kết module", "Mã liên kết bài học", "Thứ tự", "Tên bài học", "Loại bài học", "Tệp nội dung"]
    ws_les.row_dimensions[1].height = 36
    for col_idx, h in enumerate(les_headers, start=1):
        cell = ws_les.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align

    for row_idx, les in enumerate(lessons_data, start=2):
        ws_les.row_dimensions[row_idx].height = 24
        # moduleRef, lessonId, order, title, type, contentPath
        ws_les.cell(row=row_idx, column=1, value=les["moduleRef"]).alignment = center_align
        ws_les.cell(row=row_idx, column=2, value=les["lessonId"]).alignment = center_align
        ws_les.cell(row=row_idx, column=3, value=les["order"]).alignment = center_align
        ws_les.cell(row=row_idx, column=4, value=les["title"]).alignment = left_align
        ws_les.cell(row=row_idx, column=5, value=les["type"]).alignment = center_align
        ws_les.cell(row=row_idx, column=6, value=les["contentPath"]).alignment = left_align
        for col_idx in range(1, 7):
            ws_les.cell(row=row_idx, column=col_idx).font = normal_font

    ws_les.column_dimensions["A"].width = 24
    ws_les.column_dimensions["B"].width = 24
    ws_les.column_dimensions["C"].width = 16
    ws_les.column_dimensions["D"].width = 48
    ws_les.column_dimensions["E"].width = 24
    ws_les.column_dimensions["F"].width = 40

    # 4. DanhMuc Sheet
    ws_cat = wb.create_sheet("DanhMuc")
    ws_cat.views.sheetView[0].showGridLines = True
    ws_cat.freeze_panes = "A2"
    cat_headers = ["Mã Skill", "Tên Skill"]
    ws_cat.row_dimensions[1].height = 36
    for col_idx, h in enumerate(cat_headers, start=1):
        cell = ws_cat.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align

    for row_idx, skill in enumerate(skills_catalog, start=2):
        ws_cat.row_dimensions[row_idx].height = 24
        ws_cat.cell(row=row_idx, column=1, value=skill["id"]).alignment = center_align
        ws_cat.cell(row=row_idx, column=2, value=skill["name"]).alignment = left_align
        ws_cat.cell(row=row_idx, column=1).font = normal_font
        ws_cat.cell(row=row_idx, column=2).font = normal_font

    ws_cat.column_dimensions["A"].width = 20
    ws_cat.column_dimensions["B"].width = 75

    # 5. InstructionsEN Sheet
    ws_en = wb.create_sheet("InstructionsEN")
    ws_en.views.sheetView[0].showGridLines = False
    ws_en.column_dimensions["A"].width = 110
    for row_idx, line in enumerate(ENGLISH_INSTRUCTIONS.splitlines(), start=1):
        cell = ws_en.cell(row=row_idx, column=1, value=line)
        cell.font = normal_font
        cell.alignment = left_align
        ws_en.row_dimensions[row_idx].height = max(24, int(len(line) / 90.0 * 16 + 8))

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dataset_path = os.path.join(root_dir, "documents/dataset/module-knowledge/development-complete-release.json")
    ontology_path = os.path.join(root_dir, "documents/dataset/import/ontology_seed-skill-level.json")
    
    output_zip = os.path.join(root_dir, "documents/dataset/import/all-modules-import.zip")
    output_zip_alt = os.path.join(root_dir, "outputs/all-modules-import.zip")

    print(f"Reading dataset: {dataset_path}")
    with open(dataset_path, "r", encoding="utf-8") as f:
        release_data = json.load(f)

    print(f"Reading ontology seed: {ontology_path}")
    with open(ontology_path, "r", encoding="utf-8") as f:
        ontology_data = json.load(f)

    # Build catalog
    skills_map = {}
    for s in ontology_data.get("MicroSkills", []):
        skills_map[s["id"]] = s.get("name", s["id"])

    # Prepare modules and contents
    contents_map = {c["id"]: c for c in release_data.get("contents", [])}
    documents = release_data.get("documents", [])

    print(f"Found {len(documents)} module documents and {len(contents_map)} contents.")

    modules_rows = []
    lessons_rows = []
    docx_files = {} # relative path -> bytes

    for idx, doc in enumerate(documents, start=1):
        mod_ref = f"M{idx}"
        les_ref = f"L{idx}"
        docx_path = f"lesson/m{idx}.docx"

        payload = doc["revisions"][0]["payload"]
        title = payload.get("title", f"Module {mod_ref}").strip()
        if len(title) > 240:
            title = title[:240].strip()

        # Skill code
        teachings = payload.get("teachings", [])
        if teachings and teachings[0].get("skillId"):
            skill_code = teachings[0]["skillId"]
            skill_name = teachings[0].get("skillName", skills_map.get(skill_code, skill_code))
        else:
            skill_code = "MS-DE01"
            skill_name = skills_map.get(skill_code, "Skill")
        
        # Ensure in catalog
        if skill_code not in skills_map:
            skills_map[skill_code] = skill_name

        # Knowledge level & type
        raw_level = payload.get("knowledgeLevel", "FOUNDATION")
        vn_level = LEVEL_MAP.get(raw_level, "Nền tảng")

        raw_type = payload.get("moduleType", "LESSON_AND_PRACTICE")
        vn_type = TYPE_MAP.get(raw_type, "Bài học và thực hành")

        duration = int(payload.get("duration", 30))
        if duration <= 0:
            duration = 30

        modules_rows.append({
            "moduleRef": mod_ref,
            "title": title,
            "skillCode": skill_code,
            "knowledgeLevel": vn_level,
            "moduleType": vn_type,
            "durationMinutes": duration
        })

        # Find content
        cid = "CONTENT-" + doc["id"]
        content = contents_map.get(cid)
        if not content:
            content = payload.get("content", {})

        markdown = content.get("markdown", "")
        les_title = title
        if content.get("lessons") and len(content["lessons"]) > 0:
            first_les = content["lessons"][0]
            if first_les.get("title"):
                les_title = first_les["title"].strip()
            if first_les.get("body"):
                markdown = first_les["body"]

        if len(les_title) > 240:
            les_title = les_title[:240].strip()

        lessons_rows.append({
            "moduleRef": mod_ref,
            "lessonId": les_ref,
            "order": 1,
            "title": les_title,
            "type": "Bài đọc",
            "contentPath": docx_path
        })

        # Generate DOCX
        docx_bytes = create_docx_bytes(les_title, markdown)
        docx_files[docx_path] = docx_bytes

    skills_catalog = [{"id": sid, "name": sname} for sid, sname in sorted(skills_map.items())]

    print(f"Generating module.xlsx with {len(modules_rows)} modules and {len(lessons_rows)} lessons...")
    xlsx_bytes = build_workbook(modules_rows, lessons_rows, skills_catalog)

    print(f"Packing into ZIP...")
    os.makedirs(os.path.dirname(output_zip), exist_ok=True)
    os.makedirs(os.path.dirname(output_zip_alt), exist_ok=True)

    for target_zip_path in [output_zip, output_zip_alt]:
        with zipfile.ZipFile(target_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("module.xlsx", xlsx_bytes)
            zf.writestr("HUONG_DAN_VI.txt", VIETNAMESE_INSTRUCTIONS.encode("utf-8"))
            zf.writestr("INSTRUCTIONS_EN.txt", ENGLISH_INSTRUCTIONS.encode("utf-8"))
            for path, data in docx_files.items():
                zf.writestr(path, data)

        zip_size_mb = os.path.getsize(target_zip_path) / (1024 * 1024)
        print(f"Saved: {target_zip_path} ({zip_size_mb:.2f} MB)")

    print(f"Successfully generated ZIP packages containing all {len(modules_rows)} modules and lessons.")

if __name__ == "__main__":
    main()
