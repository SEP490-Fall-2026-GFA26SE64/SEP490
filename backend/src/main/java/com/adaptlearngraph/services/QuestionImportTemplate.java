package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.QuestionBank.Choice;
import com.adaptlearngraph.entities.domain.QuestionBank.KnowledgeChoice;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/** Builds a bilingual Question Bank Excel template with dropdown validations and skill catalog. */
final class QuestionImportTemplate {
    private static final List<String> HEADERS_VI = List.of(
        "Nội dung câu hỏi", "Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D",
        "Đáp án đúng (A-D)", "Mã Skill", "Mức kiến thức", "Bắt buộc (true/false)", "Giải thích"
    );
    private static final List<String> HEADERS_EN = List.of(
        "Question Prompt", "Option A", "Option B", "Option C", "Option D",
        "Correct Answer (A-D)", "Skill Code", "Knowledge Level", "Mandatory (true/false)", "Explanation"
    );

    private QuestionImportTemplate() {}

    static byte[] build(List<Choice> skills, List<KnowledgeChoice> knowledge, String lang) throws IOException {
        boolean isEn = "en".equalsIgnoreCase(lang);
        try (var book = new XSSFWorkbook(); var out = new ByteArrayOutputStream()) {
            Sheet guide = book.createSheet(isEn ? "InstructionsEN" : "HuongDan");
            Sheet questions = book.createSheet("Questions");
            Sheet catalog = book.createSheet(isEn ? "SkillCatalog" : "DanhMuc");

            var font = book.createFont();
            font.setFontName("Arial");
            font.setFontHeightInPoints((short) 11);
            var normal = book.createCellStyle();
            normal.setFont(font);
            normal.setWrapText(true);
            normal.setVerticalAlignment(VerticalAlignment.CENTER);

            var headingFont = book.createFont();
            headingFont.setFontName("Arial");
            headingFont.setFontHeightInPoints((short) 11);
            headingFont.setBold(true);
            headingFont.setColor(IndexedColors.WHITE.getIndex());

            var heading = book.createCellStyle();
            heading.cloneStyleFrom(normal);
            heading.setFont(headingFont);
            heading.setFillForegroundColor(new org.apache.poi.xssf.usermodel.XSSFColor(new byte[]{(byte) 194, 65, 12}, new org.apache.poi.xssf.usermodel.DefaultIndexedColorMap()));
            heading.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            heading.setAlignment(HorizontalAlignment.CENTER);

            table(questions, isEn ? HEADERS_EN : HEADERS_VI, heading);
            table(catalog, isEn ? List.of("Skill Code", "Skill Name", "Configured Levels") : List.of("Mã Skill", "Tên Skill", "Mức kiến thức hỗ trợ"), heading);

            int row = 1;
            for (var skill : skills) {
                String levels = knowledge.stream()
                    .filter(k -> skill.id().equals(k.skillId()))
                    .map(k -> levelLabel(k.knowledgeLevel(), isEn))
                    .collect(Collectors.joining(", "));
                values(catalog, row++, normal, skillCode(skill), skill.name(), levels.isBlank() ? "—" : levels);
            }
            catalog.setColumnWidth(0, 22 * 256);
            catalog.setColumnWidth(1, 56 * 256);
            catalog.setColumnWidth(2, 36 * 256);

            Choice firstSkill = skills.isEmpty() ? null : skills.getFirst();
            String firstCode = firstSkill != null ? skillCode(firstSkill) : "MS-SEC01";
            String firstName = firstSkill != null ? firstSkill.name() : (isEn ? "this skill" : "này");
            String firstLevel = firstSkill == null ? "FOUNDATION"
                : knowledge.stream().filter(k -> firstSkill.id().equals(k.skillId())).map(KnowledgeChoice::knowledgeLevel).findFirst().orElse("FOUNDATION");

            values(
                questions,
                1,
                normal,
                isEn ? "Sample question for " + firstName + ": Which practice is recommended?" : "Câu hỏi mẫu cho kỹ năng " + firstName + ": Thực hành nào sau đây là phù hợp nhất?",
                isEn ? "Verify requirements and document key assumptions." : "Kiểm tra yêu cầu và ghi nhận các giả định quan trọng.",
                isEn ? "Skip validation to save time." : "Bỏ qua bước kiểm tra để tiết kiệm thời gian.",
                isEn ? "Ignore error handling in production." : "Không cần xử lý lỗi khi vận hành.",
                isEn ? "Deploy without peer review." : "Triển khai trực tiếp không cần rà soát.",
                "A",
                firstCode,
                levelLabel(firstLevel, isEn),
                "false",
                isEn ? "Documenting and verifying assumptions reduces risk." : "Kiểm tra và ghi nhận giả định giúp giảm thiểu rủi ro."
            );

            int[] widths = {48, 28, 28, 28, 28, 20, 22, 20, 22, 42};
            for (int i = 0; i < widths.length; i++) {
                questions.setColumnWidth(i, widths[i] * 256);
            }

            // Excel dropdown validations on Questions rows 2..5001
            list(questions, 5, null, new String[]{"A", "B", "C", "D"});
            if (!skills.isEmpty()) {
                String catalogSheetName = isEn ? "SkillCatalog" : "DanhMuc";
                var skillCodes = book.createName();
                skillCodes.setNameName("SkillCodes");
                skillCodes.setRefersToFormula("'" + catalogSheetName + "'!$A$2:$A$" + (skills.size() + 1));
                list(questions, 6, "SkillCodes", null);
                highlight(questions, "G2:G5001", "AND(G2<>\"\",COUNTIF(SkillCodes,G2)=0)");
            }
            list(questions, 7, null, isEn ? new String[]{"Foundation", "Intermediate", "Advanced"} : new String[]{"Nền tảng", "Trung cấp", "Nâng cao"});
            list(questions, 8, null, new String[]{"false", "true"});

            instructions(guide, isEn ? englishGuide(firstCode) : vietnameseGuide(firstCode), normal);

            book.write(out);
            return out.toByteArray();
        }
    }

    private static String skillCode(Choice skill) {
        return skill.code() != null && !skill.code().isBlank() ? skill.code() : skill.id();
    }

    private static String levelLabel(String level, boolean isEn) {
        if (level == null) return "";
        return switch (level) {
            case "FOUNDATION" -> isEn ? "Foundation" : "Nền tảng";
            case "INTERMEDIATE" -> isEn ? "Intermediate" : "Trung cấp";
            case "ADVANCED" -> isEn ? "Advanced" : "Nâng cao";
            default -> level;
        };
    }

    private static void table(Sheet sheet, List<String> labels, CellStyle heading) {
        Row row = sheet.createRow(0);
        row.setHeightInPoints(24);
        for (int i = 0; i < labels.size(); i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(labels.get(i));
            cell.setCellStyle(heading);
        }
        sheet.createFreezePane(0, 1);
    }

    private static void values(Sheet sheet, int r, CellStyle style, Object... items) {
        Row row = sheet.createRow(r);
        for (int i = 0; i < items.length; i++) {
            Cell cell = row.createCell(i);
            if (items[i] instanceof Number n) cell.setCellValue(n.doubleValue());
            else cell.setCellValue(items[i] == null ? "" : items[i].toString());
            cell.setCellStyle(style);
        }
    }

    private static void list(Sheet sheet, int col, String formula, String[] values) {
        var helper = sheet.getDataValidationHelper();
        var constraint = formula != null
            ? helper.createFormulaListConstraint(formula)
            : helper.createExplicitListConstraint(values);
        var validation = helper.createValidation(constraint, new CellRangeAddressList(1, 5000, col, col));
        validation.setShowErrorBox(true);
        sheet.addValidationData(validation);
    }

    private static void highlight(Sheet sheet, String area, String formula) {
        var cf = sheet.getSheetConditionalFormatting();
        var rule = cf.createConditionalFormattingRule(formula);
        var fill = rule.createPatternFormatting();
        fill.setFillBackgroundColor(IndexedColors.ROSE.getIndex());
        fill.setFillPattern(PatternFormatting.SOLID_FOREGROUND);
        cf.addConditionalFormatting(new org.apache.poi.ss.util.CellRangeAddress[]{org.apache.poi.ss.util.CellRangeAddress.valueOf(area)}, rule);
    }

    private static void instructions(Sheet sheet, String text, CellStyle style) {
        sheet.setColumnWidth(0, 108 * 256);
        int r = 0;
        for (String line : text.strip().split("\n")) {
            Row row = sheet.createRow(r++);
            Cell cell = row.createCell(0);
            cell.setCellValue(line);
            cell.setCellStyle(style);
        }
    }

    private static String vietnameseGuide(String sampleCode) {
        return """
            HƯỚNG DẪN IMPORT CÂU HỎI TỪ EXCEL
            1. Nhập danh sách câu hỏi vào sheet "Questions". Giữ nguyên dòng tiêu đề cột ở dòng 1.
            2. Cột "Đáp án đúng (A-D)": Chọn A, B, C hoặc D từ dropdown (có thể để trống nếu chỉ lưu bản nháp).
            3. Cột "Mã Skill": Chọn đúng Mã Skill (ví dụ: %s) từ dropdown hoặc đối chiếu trong sheet "DanhMuc".
            4. Cột "Mức kiến thức": Chọn Nền tảng, Trung cấp hoặc Nâng cao từ dropdown (phải thuộc mức kỹ năng đã cấu hình).
            5. Cột "Bắt buộc (true/false)": Chọn true nếu bắt buộc trong Skill Assessment, hoặc false.
            6. Mã câu hỏi sẽ được hệ thống tự động sinh sau khi import.
            7. Chỉ sheet "Questions" được import; "HuongDan" và "DanhMuc" là các sheet tham khảo.
            """.formatted(sampleCode);
    }

    private static String englishGuide(String sampleCode) {
        return """
            QUESTION BANK EXCEL IMPORT GUIDE
            1. Enter your questions in the "Questions" sheet. Keep row 1 column headers unchanged.
            2. "Correct Answer (A-D)": Choose A, B, C, or D from the dropdown (or leave blank for an incomplete draft).
            3. "Skill Code": Choose a valid Skill Code (e.g. %s) from the dropdown or check the "SkillCatalog" sheet.
            4. "Knowledge Level": Choose Foundation, Intermediate, or Advanced from the dropdown (must be configured for the skill).
            5. "Mandatory (true/false)": Choose true if mandatory in Skill Assessment, or false.
            6. Question codes are generated automatically by the system after import.
            7. Only the "Questions" sheet is imported; "InstructionsEN" and "SkillCatalog" are reference sheets.
            """.formatted(sampleCode);
    }
}
