package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.LearningContent;
import com.adaptlearngraph.entities.LearningImportEntity;
import com.adaptlearngraph.entities.domain.ModuleAuthoring;
import com.adaptlearngraph.repository.LearningAssetPort;
import com.adaptlearngraph.repository.LearningContentPort;
import com.adaptlearngraph.repository.LearningImportJpaRepository;
import com.adaptlearngraph.repository.ModuleAuthoringPort;
import com.adaptlearngraph.services.ModuleAuthoringService.Failure;
import com.adaptlearngraph.entities.domain.LearningContent.Lesson;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.dao.InvalidDataAccessApiUsageException;

import java.io.*;
import java.math.BigDecimal;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;

public final class ExcelLearningImport implements LearningImportUseCase {
    private final java.util.concurrent.Semaphore previews = new java.util.concurrent.Semaphore(1);
    private final ModuleAuthoringPort port;
    private final LearningContentPort content;
    private final LearningAssetPort files;
    private final ModuleAuthoringService modules;
    private final LearningImportJpaRepository imports;
    private final ObjectMapper json;
    private static final List<String> MODULE_COLUMNS = ModuleImportTemplate.MODULE_KEYS;
    private static final List<String> LESSON_COLUMNS = ModuleImportTemplate.LESSON_KEYS;
    private static final List<String> LEGACY_LESSON_COLUMNS = List.of("moduleRef", "lessonId", "order", "title", "type", "contentPath");
    public ExcelLearningImport(
            ModuleAuthoringPort port,
            LearningContentPort content,
            LearningAssetPort files,
            ModuleAuthoringService modules,
            LearningImportJpaRepository imports,
            ObjectMapper json) {
        this.port = port;
        this.content = content;
        this.files = files;
        this.modules = modules;
        this.imports = imports;
        this.json = json;
    }

    private Actor actor() {
        Actor a = port.actor();
        if (!a.expert()) throw new Failure(403, "Expert import required");
        return a;
    }

    @Override
    public byte[] template() { return ModuleImportTemplate.create(port, actor()); }

    @Override
    public byte[] template(String lang) { return ModuleImportTemplate.create(port, actor(), lang); }

    private static String text(org.apache.poi.ss.usermodel.Row row, int col) {
        Cell c = row.getCell(col);
        if (c == null) return "";
        if (c.getCellType() == CellType.FORMULA)
            throw new Failure(400, "Formula cells are not accepted");
        return new DataFormatter(Locale.ROOT).formatCellValue(c).strip();
    }

    private static Map<String, String> values(
            org.apache.poi.ss.usermodel.Row row, List<String> columns) {
        Map<String, String> result = new HashMap<>();
        for (int i = 0; i < columns.size(); i++) {
            String value = text(row, i);
            Cell cell = row.getCell(i);
            if (cell != null
                    && cell.getCellType() == CellType.NUMERIC
                    && Set.of("durationMinutes", "order", "durationSeconds")
                            .contains(columns.get(i)))
                value =
                        BigDecimal.valueOf(cell.getNumericCellValue())
                                .stripTrailingZeros()
                                .toPlainString();
            if (columns.get(i).equals("text")
                    && cell != null
                    && cell.getCellType() == CellType.STRING) value = cell.getStringCellValue();
            result.put(columns.get(i), value);
        }
        return result;
    }

    private static boolean isLegacyLessonsSheet(Sheet sheet) {
        if (sheet == null || sheet.getRow(0) == null) return false;
        String col1 = text(sheet.getRow(0), 1);
        return col1.equalsIgnoreCase("Mã liên kết bài học")
                || col1.equalsIgnoreCase("Lesson Reference")
                || col1.equalsIgnoreCase("Lesson Ref")
                || col1.equalsIgnoreCase("Lesson ID");
    }

    private static boolean matchesModuleHeader(int col, String text) {
        if (text == null) return false;
        String clean = text.strip();
        return switch (col) {
            case 0 -> clean.equalsIgnoreCase("Mã liên kết module") || clean.equalsIgnoreCase("Module Reference") || clean.equalsIgnoreCase("Module Ref");
            case 1 -> clean.equalsIgnoreCase("Tên module") || clean.equalsIgnoreCase("Module Title") || clean.equalsIgnoreCase("Title");
            case 2 -> clean.equalsIgnoreCase("Mã Skill") || clean.equalsIgnoreCase("Skill Code") || clean.equalsIgnoreCase("Skill Code or Name") || clean.equalsIgnoreCase("Skill") || clean.equalsIgnoreCase("Tên Skill");
            case 3 -> clean.equalsIgnoreCase("Mức kiến thức") || clean.equalsIgnoreCase("Knowledge Level") || clean.equalsIgnoreCase("Level");
            case 4 -> clean.equalsIgnoreCase("Loại module") || clean.equalsIgnoreCase("Module Type") || clean.equalsIgnoreCase("Type");
            case 5 -> clean.equalsIgnoreCase("Thời lượng (phút)") || clean.equalsIgnoreCase("Duration (minutes)") || clean.equalsIgnoreCase("Duration");
            default -> false;
        };
    }

    private static boolean matchesLessonHeader(int col, String text, boolean legacy) {
        if (text == null) return false;
        String clean = text.strip();
        if (legacy) {
            return switch (col) {
                case 0 -> clean.equalsIgnoreCase("Mã liên kết module") || clean.equalsIgnoreCase("Module Reference") || clean.equalsIgnoreCase("Module Ref");
                case 1 -> clean.equalsIgnoreCase("Mã liên kết bài học") || clean.equalsIgnoreCase("Lesson Reference") || clean.equalsIgnoreCase("Lesson Ref") || clean.equalsIgnoreCase("Lesson ID");
                case 2 -> clean.equalsIgnoreCase("Thứ tự") || clean.equalsIgnoreCase("Order") || clean.equalsIgnoreCase("Lesson Order");
                case 3 -> clean.equalsIgnoreCase("Tên bài học") || clean.equalsIgnoreCase("Lesson Title") || clean.equalsIgnoreCase("Title");
                case 4 -> clean.equalsIgnoreCase("Loại bài học") || clean.equalsIgnoreCase("Lesson Type") || clean.equalsIgnoreCase("Type");
                case 5 -> clean.equalsIgnoreCase("Tệp nội dung") || clean.equalsIgnoreCase("Content File") || clean.equalsIgnoreCase("Content Path") || clean.equalsIgnoreCase("File");
                default -> false;
            };
        } else {
            return switch (col) {
                case 0 -> clean.equalsIgnoreCase("Mã liên kết module") || clean.equalsIgnoreCase("Module Reference") || clean.equalsIgnoreCase("Module Ref");
                case 1 -> clean.equalsIgnoreCase("Thứ tự") || clean.equalsIgnoreCase("Order") || clean.equalsIgnoreCase("Lesson Order");
                case 2 -> clean.equalsIgnoreCase("Tên bài học") || clean.equalsIgnoreCase("Lesson Title") || clean.equalsIgnoreCase("Title");
                case 3 -> clean.equalsIgnoreCase("Loại bài học") || clean.equalsIgnoreCase("Lesson Type") || clean.equalsIgnoreCase("Type");
                case 4 -> clean.equalsIgnoreCase("Tệp nội dung") || clean.equalsIgnoreCase("Content File") || clean.equalsIgnoreCase("Content Path") || clean.equalsIgnoreCase("File");
                default -> false;
            };
        }
    }

    private static boolean checkHeader(Sheet sheet, boolean isModule) {
        if (sheet == null || sheet.getRow(0) == null)
            throw new Failure(400, "Missing Modules or Lessons sheet");
        if (isModule) {
            for (int i = 0; i < 6; i++) {
                if (!matchesModuleHeader(i, text(sheet.getRow(0), i)))
                    throw new Failure(400, "Template changed. Download the current ZIP template with module.xlsx / Mẫu đã thay đổi. Tải lại mẫu ZIP chứa module.xlsx");
            }
            for (int i = 6; i < sheet.getRow(0).getLastCellNum(); i++) {
                if (!text(sheet.getRow(0), i).isBlank())
                    throw new Failure(400, "Unexpected column. Download the current ZIP template / Cột không hợp lệ. Tải lại mẫu ZIP mới");
            }
            if (sheet.getLastRowNum() > 5000) throw new Failure(400, "Use at most 5000 rows per sheet");
            return false;
        } else {
            boolean legacy = isLegacyLessonsSheet(sheet);
            int cols = legacy ? 6 : 5;
            for (int i = 0; i < cols; i++) {
                if (!matchesLessonHeader(i, text(sheet.getRow(0), i), legacy))
                    throw new Failure(400, "Template changed. Download the current ZIP template with module.xlsx / Mẫu đã thay đổi. Tải lại mẫu ZIP chứa module.xlsx");
            }
            for (int i = cols; i < sheet.getRow(0).getLastCellNum(); i++) {
                if (!text(sheet.getRow(0), i).isBlank())
                    throw new Failure(400, "Unexpected column. Download the current ZIP template / Cột không hợp lệ. Tải lại mẫu ZIP mới");
            }
            if (sheet.getLastRowNum() > 5000) throw new Failure(400, "Use at most 5000 rows per sheet");
            return legacy;
        }
    }

    private static Path resolve(Path root, String relative) {
        if (relative == null
                || relative.isBlank()
                || relative.contains("\\")
                || relative.contains(":")) throw new Failure(400, "Invalid asset path");
        for (Path segment : Path.of(relative))
            if (segment.toString().equals("..") || segment.toString().equals("."))
                throw new Failure(400, "Use a direct relative path without ../ or ./ / Không dùng ../ hoặc ./ trong đường dẫn");
        Path path = root.resolve(relative).normalize();
        if (!path.startsWith(root) || Path.of(relative).isAbsolute())
            throw new Failure(400, "Asset path escapes ZIP");
        return path;
    }

    @Override
    public Preview preview(String filename, long size, InputStream input) {
        Actor a = actor();
        // Read once per import: the per-chunk size guards below must not query the settings row repeatedly.
        var limits = content.limits();
        if (size <= 0 || size > limits.zipBytes())
            throw new Failure(413, "Import exceeds configured package size");
        if (!previews.tryAcquire())
            throw new Failure(429, "Another import is being checked. Retry shortly.");
        Path root = null;
        try {
            root = Files.createTempDirectory("learning-import-");
            Path workbook = root.resolve("module.xlsx");
            if (filename != null && filename.toLowerCase(Locale.ROOT).endsWith(".zip")) {
                long total = 0;
                int count = 0;
                Set<Path> paths = new HashSet<>();
                try (var zip = new ZipInputStream(input)) {
                    ZipEntry entry;
                    byte[] buffer = new byte[65536];
                    while ((entry = zip.getNextEntry()) != null) {
                        if (++count > 2000) throw new Failure(400, "Too many ZIP entries");
                        Path target = resolve(root, entry.getName());
                        if (!paths.add(target)) throw new Failure(400, "Duplicate ZIP path");
                        if (entry.isDirectory()) {
                            Files.createDirectories(target);
                            continue;
                        }
                        Files.createDirectories(target.getParent());
                        try (var out = Files.newOutputStream(target)) {
                            int n;
                            while ((n = zip.read(buffer)) != -1) {
                                total += n;
                                if (total > limits.zipBytes() * 2)
                                    throw new Failure(413, "Expanded ZIP is too large");
                                out.write(buffer, 0, n);
                            }
                        }
                    }
                }
            } else throw new Failure(400,
                    "Upload a ZIP containing module.xlsx, lesson/ DOCX and video/ MP4. Download the new template; RAR, standalone Excel and old Markdown/JSON templates are not accepted / Chỉ nhận ZIP theo mẫu mới, không nhận RAR hoặc Excel đơn lẻ.");
            if (!Files.isRegularFile(workbook) || Files.size(workbook) > 20 * 1024 * 1024)
                throw new Failure(400, "Include module.xlsx at ZIP root (maximum 20 MB) / Đặt module.xlsx ở thư mục gốc ZIP (tối đa 20 MB)");
            List<Problem> errors = new ArrayList<>();
            List<LearningImportUseCase.Row> rows = new ArrayList<>();
            Map<String, List<Map<String, String>>> grouped = new LinkedHashMap<>();
            Set<String> ids = new HashSet<>();
            checkWorkbook(workbook);
            try (var book = new XSSFWorkbook(workbook.toFile())) {
                Sheet moduleSheet = book.getSheet("Modules"),
                        lessonSheet = book.getSheet("Lessons");
                checkHeader(moduleSheet, true);
                boolean legacyLessons = checkHeader(lessonSheet, false);
                List<String> lessonCols = legacyLessons ? LEGACY_LESSON_COLUMNS : LESSON_COLUMNS;
                Set<String> lessonIds = new HashSet<>();
                for (int i = 1; i <= lessonSheet.getLastRowNum(); i++) {
                    var row = lessonSheet.getRow(i);
                    if (row == null) continue;
                    try {
                        var v = values(row, lessonCols);
                        if (v.values().stream().allMatch(String::isBlank)) continue;
                        int order = 1;
                        try {
                            order = Integer.parseInt(v.get("order"));
                        } catch (Exception ex) {
                            throw new Failure(400, "Lesson order must be a positive integer / Thứ tự bài học phải là số nguyên dương");
                        }
                        if (order < 1) throw new Failure(400, "Lesson order must be positive / Thứ tự bài học phải lớn hơn 0");
                        String rawLessonId = v.get("lessonId");
                        String lessonId = (rawLessonId == null || rawLessonId.isBlank())
                                ? v.get("moduleRef") + "_L" + order
                                : rawLessonId;
                        if (!lessonId.matches("[A-Za-z0-9_-]{1,100}")) throw new Failure(400, "Use a lesson reference such as L1 / Dùng mã bài học như L1");
                        if (!lessonIds.add(lessonId)) throw new Failure(400, "Duplicate lesson reference / Mã bài học bị trùng: " + lessonId);
                        v.put("lessonId", lessonId);
                        ModuleAuthoring.text(v.get("title"), "lesson title", 240);
                        v.put("excelRow", Integer.toString(i + 1));
                        grouped.computeIfAbsent(v.get("moduleRef"), k -> new ArrayList<>()).add(v);
                    } catch (RuntimeException e) {
                        errors.add(new Problem("Lessons", i + 1, e.getMessage()));
                    }
                }
                for (int i = 1; i <= moduleSheet.getLastRowNum(); i++) {
                    var row = moduleSheet.getRow(i);
                    if (row == null) continue;
                    String id = "";
                    try {
                        var v = values(row, MODULE_COLUMNS);
                        if (v.values().stream().allMatch(String::isBlank)) continue;
                        id = v.get("moduleRef");
                        if (id == null || !id.matches("[A-Za-z0-9_-]{1,100}")) throw new Failure(400, "moduleRef must contain 1–100 letters, numbers, hyphens or underscores");
                        if (!ids.add(id)) throw new Failure(400, "Duplicate moduleRef");
                        var lessonValues = grouped.getOrDefault(id, List.of());
                        if (lessonValues.size() > 200)
                            throw new Failure(400, "Use at most 200 lessons per module");
                        List<Lesson> lessons = new ArrayList<>();
                        Set<Integer> orders = new HashSet<>();
                        List<Map<String, String>> sorted = new ArrayList<>(lessonValues);
                        sorted.sort(Comparator.comparingInt(x -> Integer.parseInt(x.get("order"))));
                        for (var l : sorted) {
                            int order = Integer.parseInt(l.get("order"));
                            if (order < 1 || !orders.add(order)) {
                                errors.add(new Problem(id, Integer.parseInt(l.get("excelRow")), "Lessons: order must be unique and positive / Thứ tự bài học phải lớn hơn 0 và không trùng trong module"));
                                continue;
                            }
                            try {
                                lessons.add(lesson(root, a, l));
                            } catch (RuntimeException e) {
                                errors.add(
                                        new Problem(
                                                id,
                                                Integer.parseInt(l.get("excelRow")),
                                                "Lessons: " + e.getMessage()));
                            }
                        }
                        String skill = v.get("skillCode");
                        if (skill.isBlank() || skill.contains("[") || skill.contains("{") || skill.contains(","))
                            throw new Failure(400, "Enter one plain Skill code or name, for example MS-QA08, not JSON / Nhập một mã hoặc tên Skill, không dùng JSON");
                        String resolvedSkillId = skill.strip();
                        for (var c : port.catalog("MicroSkill")) {
                            if (c.id().equalsIgnoreCase(resolvedSkillId) || c.name().equalsIgnoreCase(resolvedSkillId)) {
                                resolvedSkillId = c.id();
                                break;
                            }
                        }
                        List<TeachingInput> skills = List.of(new TeachingInput(resolvedSkillId));
                        String level = ModuleImportTemplate.resolveLevel(v.get("knowledgeLevel"));
                        String type = ModuleImportTemplate.resolveType(v.get("moduleType"));
                        if (level == null || type == null) throw new Failure(400, "Choose the knowledge level and module type from the template / Chọn mức kiến thức và loại module trong mẫu");
                        int durationMinutes = 0;
                        String rawDur = v.get("durationMinutes");
                        if (rawDur != null && !rawDur.isBlank()) {
                            try {
                                durationMinutes = Integer.parseInt(rawDur);
                            } catch (NumberFormatException ignored) {}
                        }
                        if (durationMinutes <= 0) {
                            double totalSec = lessons.stream().mapToDouble(Lesson::durationSeconds).sum();
                            durationMinutes = Math.max(1, (int) Math.ceil(totalSec / 60.0));
                        }
                        Save save =
                                new Save(
                                        v.get("title"),
                                        type,
                                        "",
                                        durationMinutes,
                                        List.of(),
                                        skills,
                                        level,
                                        List.of());
                        rows.add(
                                new LearningImportUseCase.Row(
                                        UUID.randomUUID().toString(),
                                        i + 1,
                                        save,
                                        lessons,
                                        null, id));
                    } catch (Exception e) {
                        errors.add(
                                new Problem(
                                        id,
                                        i + 1,
                                        e.getMessage() == null
                                                ? "Invalid module row"
                                                : e.getMessage()));
                    }
                }
            }
            for (String id : grouped.keySet())
                if (!ids.contains(id)) for (var lesson : grouped.get(id))
                    errors.add(new Problem(id, Integer.parseInt(lesson.get("excelRow")), "Lessons: unknown module reference / Mã module của bài học không tồn tại"));
            if (rows.isEmpty()) errors.add(new Problem("", 0, "Include at least one module"));
            String id = UUID.randomUUID().toString();
            Preview p = new Preview(id, rows, errors, List.of(), false);
            imports.insert(
                    new LearningImportEntity(
                            UUID.fromString(id),
                            a.organizationId(),
                            a.id(),
                            json.writeValueAsString(p),
                            "PREVIEW",
                            null,
                            null));
            return validate(id);
        } catch (Failure e) {
            throw e;
        } catch (Exception e) {
            throw new Failure(400, "Cannot read import: " + e.getMessage());
        } finally {
            if (root != null)
                try (var paths = Files.walk(root)) {
                    paths.sorted(Comparator.reverseOrder())
                            .forEach(
                                    p -> {
                                        try {
                                            Files.deleteIfExists(p);
                                        } catch (IOException ignored) {
                                        }
                                    });
                } catch (IOException ignored) {
                }
            previews.release();
        }
    }

    /** Bound expanded OOXML and worksheet structure before materializing a workbook in memory. */
    static void checkWorkbook(Path workbook) throws Exception {
        long total = 0;
        int entries = 0;
        try (var zip = new ZipInputStream(Files.newInputStream(workbook))) {
            ZipEntry entry;
            byte[] buffer = new byte[8192];
            while ((entry = zip.getNextEntry()) != null) {
                if (++entries > 200) throw new Failure(400, "Workbook has too many parts");
                boolean worksheet =
                        entry.getName().startsWith("xl/worksheets/")
                                && entry.getName().endsWith(".xml");
                var xml = worksheet ? new ByteArrayOutputStream() : null;
                long expanded = 0;
                int n;
                while ((n = zip.read(buffer)) != -1) {
                    total += n;
                    expanded += n;
                    if (total > 32L * 1024 * 1024 || expanded > 16L * 1024 * 1024)
                        throw new Failure(413, "Expanded workbook is too large");
                    if (xml != null) xml.write(buffer, 0, n);
                }
                if (xml != null) {
                    var reader = org.apache.poi.util.XMLHelper.newXMLReader();
                    reader.setContentHandler(
                            new org.xml.sax.helpers.DefaultHandler() {
                                int rows;
                                int cells;

                                @Override
                                public void startElement(
                                        String uri,
                                        String local,
                                        String name,
                                        org.xml.sax.Attributes attributes) {
                                    if (local.equals("row")) {
                                        if (++rows > 5001
                                                || attributes.getValue("r") != null
                                                        && Integer.parseInt(
                                                                        attributes.getValue("r"))
                                                                > 5001)
                                            throw new Failure(
                                                    400, "Use at most 5000 data rows per sheet");
                                    }
                                    if (local.equals("c") && ++cells > 60000)
                                        throw new Failure(400, "Workbook has too many cells");
                                    if (local.equals("f"))
                                        throw new Failure(400, "Formula cells are not accepted");
                                }
                            });
                    reader.parse(
                            new org.xml.sax.InputSource(
                                    new ByteArrayInputStream(xml.toByteArray())));
                }
            }
        }
    }

    private Lesson lesson(Path root, Actor a, Map<String, String> l) throws IOException {
        String kind = ModuleImportTemplate.resolveLessonType(l.get("type"));
        if (kind == null) throw new Failure(400, "Choose Bài đọc (Reading) or Video / Chọn loại Bài đọc hoặc Video");
        String relative = l.get("contentPath");
        if (relative == null || relative.isBlank())
            throw new Failure(400, "Missing content file or URL / Thiếu tệp nội dung hoặc đường dẫn video");
        String trimmed = relative.strip();

        if ("VIDEO".equals(kind)) {
            if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                String provider;
                try {
                    var uri = java.net.URI.create(trimmed);
                    String host = uri.getHost();
                    if (host != null) {
                        host = host.toLowerCase(Locale.ROOT);
                        if (Set.of("youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com").contains(host)) {
                            provider = "YOUTUBE";
                        } else if (Set.of("vimeo.com", "www.vimeo.com", "player.vimeo.com").contains(host)) {
                            provider = "VIMEO";
                        } else {
                            throw new Failure(400, "Only YouTube and Vimeo HTTPS links are supported / Chỉ hỗ trợ liên kết YouTube và Vimeo");
                        }
                    } else {
                        throw new Failure(400, "Invalid video URL / Đường dẫn video không hợp lệ");
                    }
                    LearningContent.validateVideoUrl(provider, trimmed);
                } catch (IllegalArgumentException ex) {
                    throw new Failure(400, ex.getMessage());
                }
                return new Lesson(l.get("lessonId"), l.get("title"), "VIDEO", null, null, 1800.0, "MANUAL", provider, null, trimmed);
            }

            String normalized = trimmed;
            if (!normalized.startsWith("video/")) {
                normalized = "video/" + normalized;
            }
            if (!normalized.toLowerCase(Locale.ROOT).endsWith(".mp4")) {
                throw new Failure(400, "Use video/...mp4 or an HTTPS link for video lessons / Video phải dùng video/...mp4 hoặc đường dẫn HTTPS");
            }
            Path file = resolve(root, normalized);
            if (!Files.isRegularFile(file)) throw new Failure(400, "Missing content file / Không tìm thấy tệp: " + normalized);
            if (Files.size(file) > content.limits().videoBytes()) throw new Failure(413, "Video exceeds configured size / Video vượt dung lượng cho phép");
            try (var in = Files.newInputStream(file)) {
                var asset = files.upload(a.organizationId(), a.id(), file.getFileName().toString(), Files.size(file), in);
                if (!"video/mp4".equals(asset.mediaType()) || asset.durationSeconds() == null || asset.durationSeconds() <= 0)
                    throw new Failure(400, "Use a playable MP4 with a valid duration / Dùng MP4 phát được và có thời lượng hợp lệ");
                return new Lesson(l.get("lessonId"), l.get("title"), "VIDEO", null, null, asset.durationSeconds(), "MEDIA", "UPLOAD", asset.id(), null);
            }
        }

        if ("TEXT".equals(kind)) {
            String normalized = trimmed;
            if (!normalized.startsWith("lesson/")) {
                normalized = "lesson/" + normalized;
            }
            if (!normalized.toLowerCase(Locale.ROOT).endsWith(".docx")) {
                throw new Failure(400, "Use lesson/...docx for reading lessons / Bài đọc phải dùng lesson/...docx");
            }
            Path file = resolve(root, normalized);
            if (!Files.isRegularFile(file)) throw new Failure(400, "Missing content file / Không tìm thấy tệp: " + normalized);
            String body = new WordLessonReader(files, a).read(file);
            int words = body.replaceAll("<[^>]+>", " ").strip().split("\\s+").length;
            double seconds = Math.max(60, Math.ceil(words / 200.0) * 60);
            return new Lesson(l.get("lessonId"), l.get("title"), "TEXT", body, "HTML", seconds, "ESTIMATED", null, null, null);
        }

        throw new Failure(400, "Choose Bài đọc (Reading) or Video / Chọn loại Bài đọc hoặc Video");
    }

    private Preview load(String id, boolean lock) {
        Actor a = actor();
        UUID importId;
        try {
            importId = UUID.fromString(id);
        } catch (RuntimeException e) {
            // PostgreSQL rejected a malformed id cast before; keep it a data-access failure.
            throw new InvalidDataAccessApiUsageException("Invalid import id", e);
        }
        var found =
                lock
                        ? imports.lockDocument(importId, a.organizationId(), a.id())
                        : imports.document(importId, a.organizationId(), a.id());
        if (found.isEmpty()) throw new Failure(404, "Import not found");
        try {
            return json.readValue(found.getFirst(), Preview.class);
        } catch (Exception e) {
            throw new Failure(500, "Cannot read import preview");
        }
    }

    @Override
    public Preview validate(String id) {
        Preview p = load(id, false);
        return checked(p);
    }

    private Preview checked(Preview p) {
        Actor a = actor();
        List<Problem> errors = new ArrayList<>(p.errors());
        List<String> owned = new ArrayList<>();
        if (!"DOCX_ZIP_V1".equals(p.format())) {
            errors.add(new Problem("", 0, "Import template changed. Upload the current DOCX ZIP template again / Mẫu import đã thay đổi. Tải lại mẫu ZIP Word mới."));
            return new Preview(p.id(), p.modules(), errors, List.of(), p.committed(), p.format());
        }
        var docs = port.documents(a.organizationId());
        var managed = new HashSet<>(port.managedModuleIds());
        var graph = port.graphModules(a.organizationId());
        Map<String, String> available = new HashMap<>();
        port.catalog("MicroSkill").forEach(c -> {
            available.put(c.id().toLowerCase(Locale.ROOT), c.id());
            available.put(c.name().toLowerCase(Locale.ROOT), c.id());
        });
        for (var row : p.modules())
            try {
                if (row.moduleRef() == null || row.moduleRef().isBlank() || row.expectedVersion() != null)
                    throw new Failure(409, "Import template changed. Upload the current moduleRef template again.");
                UUID.fromString(row.moduleId());
                if (docs.stream().anyMatch(x -> x.id().equals(row.moduleId()))
                        || managed.contains(row.moduleId())
                        || graph.stream().anyMatch(m -> m.metadata().id().equals(row.moduleId())))
                    throw new Failure(409, "Generated module ID is already in use. Upload again.");
                content.prepare(a.organizationId(), a.id(), row.lessons(), true);
                if (!row.moduleId().matches("[A-Za-z0-9_-]{1,100}"))
                    throw new Failure(400, "Invalid module code");
                ModuleAuthoring.text(row.module().title(), "title", 240);
                if (!Set.of("LESSON_AND_PRACTICE", "RESOURCE_GUIDED_PRACTICE")
                                .contains(row.module().moduleType())
                        || row.module().duration() <= 0)
                    throw new Failure(400, "Invalid module type/duration");
                var skills = row.module().teachings();
                if (skills.size()!=1) throw new Failure(400,"Select exactly one skill per module");
                port.requireKnowledge(a.organizationId(), skills.getFirst().skillId(),
                        row.module().knowledgeLevel(), row.module().outcomeCodes());
                for (var t : skills) {
                    String actualSkillId = available.get(t.skillId().toLowerCase(Locale.ROOT));
                    if (actualSkillId == null)
                        throw new Failure(400, "Unknown skill: " + t.skillId());
                    new Teaching(
                            new Metadata(
                                    "validation", "1", "DRAFT", "NEEDS_EXPERT_REVIEW", null, null),
                            actualSkillId,
                            "");
                }
            } catch (RuntimeException e) {
                errors.add(new Problem(row.moduleRef() == null ? row.moduleId() : row.moduleRef(), row.excelRow(), e.getMessage()));
            }
        return new Preview(p.id(), p.modules(), errors, owned, p.committed(), p.format());
    }

    @Override
    public List<Document> commit(String id, boolean confirm) {
        return port.transaction(
                () -> {
                    Preview original = load(id, true);
                    if (original.committed())
                        throw new Failure(409, "This import was already committed");
                    Preview p = checked(original);
                    if (!p.errors().isEmpty())
                        throw new Failure(409, "Resolve all import errors first");
                    if (!p.ownedDuplicates().isEmpty() && !confirm)
                        throw new Failure(409, "Confirm importing new revisions of your modules");
                    List<Document> result = new ArrayList<>();
                    for (var row : p.modules()) {
                        var c =
                                modules.lessons(
                                        row.module().title(),
                                        row.lessons(),
                                        row.module().jobPositionIds());
                        Save m = row.module();
                        result.add(
                                modules.importModule(
                                        row.moduleId(),
                                        new Save(
                                                m.title(),
                                                m.moduleType(),
                                                c.id(),
                                                m.duration(),
                                                m.jobPositionIds(),
                                                m.teachings(), m.knowledgeLevel(), m.outcomeCodes()),
                                        confirm,
                                        row.expectedVersion()));
                    }
                    try {
                        Actor a = actor();
                        imports.commit(
                                UUID.fromString(id),
                                a.organizationId(),
                                a.id(),
                                json.writeValueAsString(
                                        new Preview(
                                                p.id(),
                                                p.modules(),
                                                p.errors(),
                                                p.ownedDuplicates(),
                                                true)));
                    } catch (Exception e) {
                        throw new IllegalStateException(e);
                    }
                    return result;
                });
    }
}
