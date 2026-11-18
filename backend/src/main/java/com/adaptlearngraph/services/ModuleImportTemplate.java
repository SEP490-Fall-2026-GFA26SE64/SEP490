package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;
import com.adaptlearngraph.repository.ModuleAuthoringPort;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.*;

/** Builds the same self-contained, bilingual ZIP contract that the importer accepts. */
final class ModuleImportTemplate {
    static final List<String> MODULE_HEADERS = List.of("Mã liên kết module", "Tên module", "Mã Skill", "Mức kiến thức", "Loại module", "Thời lượng (phút)");
    static final List<String> LESSON_HEADERS = List.of("Mã liên kết module", "Thứ tự", "Tên bài học", "Loại bài học", "Tệp nội dung");
    static final List<String> MODULE_HEADERS_EN = List.of("Module Reference", "Module Title", "Skill Code or Name", "Knowledge Level", "Module Type", "Duration (minutes)");
    static final List<String> LESSON_HEADERS_EN = List.of("Module Reference", "Order", "Lesson Title", "Lesson Type", "Content File");
    static final List<String> MODULE_KEYS = List.of("moduleRef", "title", "skillCode", "knowledgeLevel", "moduleType", "durationMinutes");
    static final List<String> LESSON_KEYS = List.of("moduleRef", "order", "title", "type", "contentPath");
    static final Map<String, String> LEVELS = Map.of(
        "Nền tảng", "FOUNDATION", "Trung cấp", "INTERMEDIATE", "Nâng cao", "ADVANCED",
        "Foundation", "FOUNDATION", "Intermediate", "INTERMEDIATE", "Advanced", "ADVANCED"
    );
    static final Map<String, String> TYPES = Map.of(
        "Bài học và thực hành", "LESSON_AND_PRACTICE", "Thực hành theo tài liệu", "RESOURCE_GUIDED_PRACTICE",
        "Lesson and practice", "LESSON_AND_PRACTICE", "Resource-guided practice", "RESOURCE_GUIDED_PRACTICE"
    );
    static final Map<String, String> LESSON_TYPES = Map.of(
        "Bài đọc", "TEXT", "Reading", "TEXT",
        "Video", "VIDEO"
    );
    private record Scope(Choice skill, String level) {}

    static String resolveLevel(String raw) {
        if (raw == null) return null;
        String clean = raw.strip();
        for (var e : LEVELS.entrySet()) {
            if (e.getKey().equalsIgnoreCase(clean)) return e.getValue();
        }
        return null;
    }

    static String resolveType(String raw) {
        if (raw == null) return null;
        String clean = raw.strip();
        for (var e : TYPES.entrySet()) {
            if (e.getKey().equalsIgnoreCase(clean)) return e.getValue();
        }
        return null;
    }

    static String resolveLessonType(String raw) {
        if (raw == null) return null;
        String clean = raw.strip();
        for (var e : LESSON_TYPES.entrySet()) {
            if (e.getKey().equalsIgnoreCase(clean)) return e.getValue();
        }
        return null;
    }

    static byte[] create(ModuleAuthoringPort port, Actor actor) {
        return create(port, actor, "vi");
    }

    static byte[] create(ModuleAuthoringPort port, Actor actor, String lang) {
        boolean isEn = "en".equalsIgnoreCase(lang);
        var skills = port.catalog("ModuleSkill");
        var ordered = new ArrayList<>(skills);
        ordered.sort(Comparator.comparingInt(s -> s.id().equals("MS-QA08") ? 0 : 1));
        var scopes = new ArrayList<Scope>();
        outer: for (var skill : ordered) for (String level : List.of("FOUNDATION", "INTERMEDIATE", "ADVANCED")) {
            try {
                if (port.requireKnowledge(actor.organizationId(), skill.id(), level, List.of()) == null) continue;
                scopes.add(new Scope(skill, level));
                if (scopes.size() == 2) break outer;
            } catch (ModuleAuthoringService.Failure unavailable) {
                if (unavailable.status() != 400 && unavailable.status() != 409) throw unavailable;
            }
        }
        if (scopes.isEmpty()) throw new ModuleAuthoringService.Failure(409,
                "Configure an active approved Skill for module learning before downloading the template / Cần có Skill đã duyệt cho phép học bằng module trước khi tải mẫu.");
        if (scopes.size() == 1) scopes.add(scopes.getFirst());
        try (var zipBytes = new ByteArrayOutputStream(); var zip = new ZipOutputStream(zipBytes, StandardCharsets.UTF_8)) {
            add(zip, "module.xlsx", workbook(skills, scopes, isEn));
            add(zip, "HUONG_DAN_VI.txt", vietnamese().getBytes(StandardCharsets.UTF_8));
            add(zip, "INSTRUCTIONS_EN.txt", english().getBytes(StandardCharsets.UTF_8));
            for (int i = 0; i < 2; i++) {
                add(zip, "lesson/" + (i == 0 ? "qa08-khai-niem.docx" : "qa08-thuc-hanh.docx"), reading(scopes.get(i), i));
            }
            try (var video = ModuleImportTemplate.class.getResourceAsStream("/learning-import/sample-video.mp4")) {
                if (video == null) throw new IOException("Sample video is unavailable");
                byte[] bytes = video.readAllBytes();
                add(zip, "video/qa08-minh-hoa.mp4", bytes);
                add(zip, "video/qa08-thuc-hanh.mp4", bytes);
            }
            zip.finish(); return zipBytes.toByteArray();
        } catch (IOException error) { throw new ModuleAuthoringService.Failure(500, "Cannot generate module ZIP template"); }
    }
    private static void add(ZipOutputStream zip, String path, byte[] bytes) throws IOException {
        zip.putNextEntry(new ZipEntry(path)); zip.write(bytes); zip.closeEntry();
    }
    private static String levelLabel(String level) { return LEVELS.entrySet().stream().filter(e -> e.getValue().equals(level)).findFirst().orElseThrow().getKey(); }
    private static byte[] workbook(List<Choice> skills, List<Scope> scopes, boolean isEn) throws IOException {
        try (var book = new XSSFWorkbook(); var out = new ByteArrayOutputStream()) {
            var vi = book.createSheet(isEn ? "InstructionsVI" : "HuongDan");
            var module = book.createSheet("Modules"); var lesson = book.createSheet("Lessons");
            var catalog = book.createSheet(isEn ? "SkillCatalog" : "DanhMuc"); var en = book.createSheet(isEn ? "Instructions" : "InstructionsEN");
            var font = book.createFont(); font.setFontName("Arial"); font.setFontHeightInPoints((short)11);
            var normal = book.createCellStyle(); normal.setFont(font); normal.setWrapText(true); normal.setVerticalAlignment(VerticalAlignment.CENTER);
            var headingFont = book.createFont(); headingFont.setFontName("Arial"); headingFont.setFontHeightInPoints((short)11); headingFont.setBold(true); headingFont.setColor(IndexedColors.WHITE.getIndex());
            var heading = book.createCellStyle(); heading.cloneStyleFrom(normal); heading.setFont(headingFont); heading.setFillForegroundColor(new org.apache.poi.xssf.usermodel.XSSFColor(new byte[]{(byte)194, 65, 12}, new org.apache.poi.xssf.usermodel.DefaultIndexedColorMap())); heading.setFillPattern(FillPatternType.SOLID_FOREGROUND); heading.setAlignment(HorizontalAlignment.CENTER);
            table(module, isEn ? MODULE_HEADERS_EN : MODULE_HEADERS, heading);
            table(lesson, isEn ? LESSON_HEADERS_EN : LESSON_HEADERS, heading);
            table(catalog, isEn ? List.of("Skill Code", "Skill Name") : List.of("Mã Skill", "Tên Skill"), heading);
            int row = 1; for (var skill : skills) values(catalog, row++, normal, skillCode(skill), skill.name());
            catalog.setColumnWidth(0, 20 * 256); catalog.setColumnWidth(1, 75 * 256);
            for (int i = 0; i < 2; i++) {
                Scope scope = scopes.get(i);
                String title = isEn
                        ? (i == 0 ? "Introduction to " + scope.skill().name() : "Hands-on " + scope.skill().name())
                        : (i == 0 ? "Nhập môn " + scope.skill().name() : "Thực hành " + scope.skill().name());
                if (title.length() > 240) title = title.substring(0, 240);
                String levelStr = isEn
                        ? (scope.level().equals("FOUNDATION") ? "Foundation" : "Intermediate")
                        : levelLabel(scope.level());
                String typeStr = isEn ? "Lesson and practice" : "Bài học và thực hành";
                values(module, i + 1, normal, "M" + (i + 1), title, skillCode(scope.skill()), levelStr, typeStr, i == 0 ? 20 : 35);
                values(lesson, i * 2 + 1, normal, "M" + (i + 1), 1,
                        isEn ? (i == 0 ? "Core Concepts" : "Practice and Results") : (i == 0 ? "Khái niệm nền tảng" : "Lập mục tiêu và ghi nhận kết quả"),
                        isEn ? "Reading" : "Bài đọc", "lesson/" + (i == 0 ? "qa08-khai-niem.docx" : "qa08-thuc-hanh.docx"));
                values(lesson, i * 2 + 2, normal, "M" + (i + 1), 2,
                        isEn ? "Sample playback test video" : "Video mẫu để kiểm tra phát nội dung",
                        "Video", "video/" + (i == 0 ? "qa08-minh-hoa.mp4" : "qa08-thuc-hanh.mp4"));
            }
            module.setColumnWidth(1, 52 * 256); module.setColumnWidth(4, 32 * 256);
            lesson.setColumnWidth(0, 22 * 256);
            lesson.setColumnWidth(1, 12 * 256);
            lesson.setColumnWidth(2, 48 * 256);
            lesson.setColumnWidth(3, 24 * 256);
            lesson.setColumnWidth(4, 42 * 256);
            String catalogSheetName = isEn ? "SkillCatalog" : "DanhMuc";
            var skillCodes = book.createName(); skillCodes.setNameName("SkillCodes"); skillCodes.setRefersToFormula("'" + catalogSheetName + "'!$A$2:$A$" + (skills.size() + 1));
            var moduleRefs = book.createName(); moduleRefs.setNameName("ModuleRefs"); moduleRefs.setRefersToFormula("Modules!$A$2:$A$5001");
            list(module, 2, "SkillCodes", null);
            list(module, 3, null, isEn ? new String[]{"Foundation", "Intermediate", "Advanced"} : new String[]{"Nền tảng", "Trung cấp", "Nâng cao"});
            list(module, 4, null, isEn ? new String[]{"Lesson and practice", "Resource-guided practice"} : new String[]{"Bài học và thực hành", "Thực hành theo tài liệu"});
            list(lesson, 0, "ModuleRefs", null);
            list(lesson, 3, null, isEn ? new String[]{"Reading", "Video"} : new String[]{"Bài đọc", "Video"});
            positive(module, 5); positive(lesson, 1);
            highlight(module, "A2:A5001", "AND(A2<>\"\",COUNTIF($A$2:$A$5001,A2)>1)");
            highlight(module, "C2:C5001", "AND(C2<>\"\",COUNTIF(SkillCodes,C2)=0)");
            highlight(lesson, "B2:B5001", "AND(A2<>\"\",B2<>\"\",COUNTIFS($A$2:$A$5001,A2,$B$2:$B$5001,B2)>1)");
            highlight(lesson, "A2:A5001", "AND(A2<>\"\",COUNTIF(INDIRECT(\"Modules!$A$2:$A$5001\"),A2)=0)");
            instructions(vi, vietnamese(), normal); instructions(en, english(), normal);
            book.write(out); return out.toByteArray();
        }
    }
    private static void table(Sheet sheet, List<String> labels, CellStyle heading) {
        sheet.setDisplayGridlines(false); sheet.createFreezePane(0, 1);
        var row = sheet.createRow(0); row.setHeightInPoints(36);
        for (int i = 0; i < labels.size(); i++) { var cell = row.createCell(i); cell.setCellValue(labels.get(i)); cell.setCellStyle(heading); sheet.setColumnWidth(i, 24 * 256); }
    }
    private static void values(Sheet sheet, int index, CellStyle style, Object... values) {
        var row = sheet.createRow(index); row.setHeightInPoints(42);
        for (int i = 0; i < values.length; i++) { var cell = row.createCell(i); cell.setCellStyle(style); if (values[i] instanceof Number n) cell.setCellValue(n.doubleValue()); else cell.setCellValue(values[i].toString()); }
    }
    private static void instructions(Sheet sheet, String text, CellStyle style) {
        sheet.setDisplayGridlines(false); sheet.setColumnWidth(0, 110 * 256);
        int i = 0; for (String line : text.lines().toList()) { values(sheet, i, style, line); sheet.getRow(i++).setHeightInPoints((float)Math.max(30, Math.ceil(line.length() / 90.0) * 16 + 8)); }
    }
    private static void list(Sheet sheet, int col, String name, String[] choices) {
        var helper = sheet.getDataValidationHelper();
        var rule = choices == null ? helper.createFormulaListConstraint(name) : helper.createExplicitListConstraint(choices);
        var validation = helper.createValidation(rule, new CellRangeAddressList(1, 5000, col, col));
        validation.setEmptyCellAllowed(true); validation.setShowErrorBox(true); validation.setErrorStyle(DataValidation.ErrorStyle.STOP);
        validation.createErrorBox("Invalid choice / Lựa chọn không hợp lệ", "Choose a listed value / Chọn giá trị trong danh sách"); sheet.addValidationData(validation);
    }
    private static void highlight(Sheet sheet, String range, String formula) {
        var formatting = sheet.getSheetConditionalFormatting();
        var rule = formatting.createConditionalFormattingRule(formula);
        var fill = rule.createPatternFormatting(); fill.setFillBackgroundColor(IndexedColors.ROSE.getIndex()); fill.setFillPattern(PatternFormatting.SOLID_FOREGROUND);
        rule.createFontFormatting().setFontColorIndex(IndexedColors.DARK_RED.getIndex());
        formatting.addConditionalFormatting(new org.apache.poi.ss.util.CellRangeAddress[]{org.apache.poi.ss.util.CellRangeAddress.valueOf(range)}, rule);
    }
    private static void positive(Sheet sheet, int col) {
        var helper = sheet.getDataValidationHelper();
        var rule = helper.createIntegerConstraint(DataValidationConstraint.OperatorType.GREATER_THAN, "0", null);
        var v = helper.createValidation(rule, new CellRangeAddressList(1, 5000, col, col)); v.setShowErrorBox(true); sheet.addValidationData(v);
    }
    private static byte[] reading(Scope scope, int index) throws IOException {
        try (var doc = new XWPFDocument(); var out = new ByteArrayOutputStream()) {
            var title = doc.createParagraph(); title.setStyle("Title"); var r = title.createRun(); r.setBold(true); r.setFontSize(22); r.setText(index == 0 ? "Bài đọc mẫu về khái niệm nền tảng" : "Bài đọc mẫu về thực hành");
            doc.createParagraph().createRun().setText("Skill: " + scope.skill().id() + " — " + scope.skill().name() + "; " + levelLabel(scope.level()));
            var heading = doc.createParagraph(); heading.setStyle("Heading1"); heading.createRun().setText("Mục tiêu bài học / Learning objectives");
            doc.createParagraph().createRun().setText("Đây là nội dung mẫu để kiểm tra import. Hãy thay bằng kiến thức, hướng dẫn và ví dụ phù hợp với kỹ năng của bạn trước khi gửi duyệt.");
            var bold = doc.createParagraph(); bold.createRun().setText("This is sample learning content. "); var b = bold.createRun(); b.setBold(true); b.setText("Replace it with your actual lesson before review.");
            var table = doc.createTable(3, 2);
            table.getRow(0).getCell(0).setText("Bước / Step"); table.getRow(0).getCell(1).setText("Nội dung / Content");
            table.getRow(1).getCell(0).setText("1"); table.getRow(1).getCell(1).setText("Xác định mục tiêu / Define the objective");
            table.getRow(2).getCell(0).setText("2"); table.getRow(2).getCell(1).setText("Thực hành và ghi nhận kết quả / Practice and record results");
            doc.write(out); return out.toByteArray();
        }
    }
    static String vietnamese() { return """
            HƯỚNG DẪN IMPORT MODULE VÀ BÀI HỌC
            1. Giải nén mẫu. Giữ module.xlsx ở thư mục gốc, Word trong lesson/ và MP4 trong video/ (nếu có video tệp tải lên).
            2. Modules: mỗi dòng là một module. Mã liên kết module (M1, M2) chỉ dùng trong gói; hệ thống tự tạo ID thật.
            3. Chỉ nhập một mã Skill như MS-QA08, không nhập JSON. Tra mã và tên tại DanhMuc. Danh sách lấy từ tổ chức hiện tại; mức kiến thức phải cho phép học bằng module.
            4. Chọn Nền tảng, Trung cấp hoặc Nâng cao; chọn loại module; thời lượng module là số nguyên dương tính bằng phút.
            5. Lessons: mỗi dòng là một bài học gồm 5 cột (Mã liên kết module, Thứ tự, Tên bài học, Loại bài học, Tệp nội dung). Thứ tự là số nguyên dương (1, 2, 3...) trong module; hệ thống tự sinh mã bài học theo module và thứ tự.
            6. Bài đọc: Tệp nội dung trỏ tới tệp Word trong lesson/ (ví dụ lesson/ten-bai.docx hoặc ten-bai.docx).
            7. Video có 2 lựa chọn: (a) Tệp video MP4 đính kèm trong thư mục video/ (ví dụ video/ten-phim.mp4 hoặc ten-phim.mp4); hoặc (b) Đường dẫn trực tiếp từ YouTube / Vimeo (ví dụ https://www.youtube.com/watch?v=... hoặc https://vimeo.com/...) - giải pháp tối ưu cho video dài (30-60+ phút) mà không lo nặng gói ZIP.
            8. Tệp nội dung đính kèm là đường dẫn tương đối, phân biệt chữ hoa/thường. Dùng /; không dùng C:\\..., không dùng ../. Nếu dùng video trực tuyến, điền đầy đủ URL https:// hợp lệ của YouTube hoặc Vimeo.
            9. Word hỗ trợ đoạn văn, tiêu đề, chữ đậm/nghiêng/gạch chân, danh sách, bảng đơn giản và ảnh PNG/JPEG/WebP nhúng. Nội dung được chuyển vào editor, không giữ bố cục trang, phông chữ, đầu/chân trang.
            10. Phương trình, biểu đồ, hộp văn bản, tài liệu nhúng, nội dung sửa đổi chưa chấp nhận và ảnh/liên kết dữ liệu bên ngoài không được hỗ trợ; chuyển thành nội dung hoặc ảnh nhúng thông thường trước khi nhập.
            11. Thay các dòng và tệp mẫu bằng nội dung thật. Video đi kèm chỉ minh họa phát nội dung, không phải học liệu đầy đủ.
            12. Nén module.xlsx cùng các thư mục lesson/ và video/ (nếu có) trực tiếp thành một ZIP, không bọc thêm thư mục ngoài. Không dùng RAR, XLSX đơn lẻ hoặc mẫu Markdown/JSON cũ.
            13. Tải ZIP lên, xem lỗi theo dòng và xem trước bài đọc/video. Chỉ xác nhận khi mọi lỗi đã được sửa. Gói lỗi không tạo module một phần.
            14. Mỗi import tạo bản nháp mới; người import là người phụ trách ban đầu. Không ghi đè module có sẵn, không tự gửi duyệt/phát hành.
            Giới hạn: tuân theo dung lượng được cấu hình trên nền tảng; tối đa 5000 dòng mỗi sheet, 200 bài mỗi module và 2000 mục trong ZIP. Không đặt mật khẩu cho ZIP/Word/Excel.
            Hai sheet dữ liệu là Modules và Lessons. HuongDan, InstructionsEN và DanhMuc không được nhập thành module.
            """; }
    static String english() { return """
            MODULE AND LESSON IMPORT INSTRUCTIONS
            1. Extract the template. Keep module.xlsx at ZIP root, DOCX files in lesson/ and MP4 files in video/ (if uploading local video files).
            2. Modules has one module per row. Mã liên kết module means module reference (M1, M2); it is batch-only, not the actual generated module ID.
            3. Tên module = module title; Mã Skill = one plain Skill code, never JSON. Use DanhMuc for names/codes. Choices belong to this organization; the chosen knowledge level must permit module learning.
            4. Mức kiến thức: Nền tảng = Foundation, Trung cấp = Intermediate, Nâng cao = Advanced. Loại module: Bài học và thực hành = Lesson and practice; Thực hành theo tài liệu = Resource-guided practice. Thời lượng (phút) is a positive integer in minutes.
            5. Lessons has 5 columns: Module reference, Order, Lesson title, Lesson type, Content file/URL. Order is a positive integer (1, 2, 3...) within the module; lesson identifiers are automatically generated.
            6. Reading lessons: Content file points to a Word document in lesson/ (e.g. lesson/example.docx or example.docx).
            7. Video lessons have two options: (a) An MP4 file inside video/ (e.g. video/example.mp4 or example.mp4); or (b) A direct YouTube / Vimeo URL (e.g. https://www.youtube.com/watch?v=... or https://vimeo.com/...) - ideal for long videos (30-60+ mins) without inflating ZIP size.
            8. For local ZIP assets, use relative forward-slash paths (no leading slash, no C:\\, no ../). For online videos, enter a valid HTTPS YouTube or Vimeo URL.
            9. DOCX supports paragraphs, headings, bold/italic/underline, lists, simple tables and embedded PNG/JPEG/WebP images. Content becomes editable; exact page layout, fonts, headers and footers are not preserved.
            10. Equations, charts, text boxes, embedded objects, pending tracked changes and external media/data relationships are unsupported. Convert them to ordinary content/embedded images first.
            11. Replace sample rows and files with real learning content. Included videos only demonstrate playback, not a complete lesson.
            12. ZIP module.xlsx, lesson/ and video/ directly, without an extra enclosing folder. RAR, standalone XLSX and old Markdown/JSON templates are not accepted. Keep sheet names and column headers unchanged.
            13. Upload ZIP, review row-specific errors and preview the actual readings/videos. Confirm only after resolving every error. Invalid batches do not create partial modules.
            14. Each confirmed import creates new drafts owned by the importing Expert. It never updates existing modules or auto-submits/publishes content.
            Limits: configured platform size limits, at most 5000 rows per sheet, 200 lessons per module and 2000 ZIP entries. Do not password-protect the ZIP or Office documents.
            Only Modules and Lessons are import data. HuongDan, InstructionsEN and DanhMuc are supporting sheets.
            """; }
    private static String skillCode(Choice skill) {
        return skill.code() != null && !skill.code().isBlank() ? skill.code() : skill.id();
    }
}
