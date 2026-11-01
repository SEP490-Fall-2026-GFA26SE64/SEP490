package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.*;
import com.adaptlearngraph.catalog.application.ModuleAuthoringService.Failure;
import com.adaptlearngraph.catalog.application.port.in.LearningImportUseCase;
import com.adaptlearngraph.catalog.application.port.out.*;
import com.adaptlearngraph.catalog.domain.*;
import com.adaptlearngraph.catalog.domain.LearningContent.Lesson;
import com.adaptlearngraph.catalog.domain.ModuleAuthoring.*;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.jdbc.core.JdbcTemplate;

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
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private static final List<String> MODULE_COLUMNS =
            List.of("moduleId", "title", "moduleType", "durationMinutes", "priceVnd", "teachings");
    private static final List<String> LESSON_COLUMNS =
            List.of(
                    "moduleId",
                    "lessonId",
                    "order",
                    "title",
                    "type",
                    "text",
                    "markdownPath",
                    "videoSource",
                    "videoUrl",
                    "videoPath",
                    "durationSeconds");

    public ExcelLearningImport(
            ModuleAuthoringPort port,
            LearningContentPort content,
            LearningAssetPort files,
            ModuleAuthoringService modules,
            JdbcTemplate jdbc,
            ObjectMapper json) {
        this.port = port;
        this.content = content;
        this.files = files;
        this.modules = modules;
        this.jdbc = jdbc;
        this.json = json;
    }

    private Actor actor() {
        Actor a = port.actor();
        if (!a.expert()) throw new Failure(403, "Expert import required");
        return a;
    }

    @Override
    public byte[] template() {
        actor();
        try (var workbook = new XSSFWorkbook();
                var out = new ByteArrayOutputStream()) {
            header(workbook.createSheet("Modules"), MODULE_COLUMNS);
            header(workbook.createSheet("Lessons"), LESSON_COLUMNS);
            var instructions = workbook.createSheet("Instructions");
            String[] help = {
                "Modules: one row per module; Lessons: one row per ordered lesson. Remove example"
                        + " rows before importing.",
                "moduleId: new code or your released module code. Existing drafts/reviews block the"
                        + " entire batch.",
                "teachings: JSON array with skillId,"
                        + " teachingFocus, difficultyLevel. Exactly one PRIMARY.",
                "TEXT: inline text (Markdown), or markdownPath inside ZIP. VIDEO: UPLOAD plus"
                        + " videoPath, or YOUTUBE/VIMEO plus videoUrl.",
                "lessonId: stable ID (letters/numbers/hyphens/underscores); preserve it when"
                        + " editing. order: unique positive integer per module.",
                "durationSeconds: required fallback for external video; text may be estimated."
                        + " durationMinutes: positive module duration.",
                "ZIP: modules.xlsx at root; relative asset paths only; Markdown images reference"
                        + " included files. No external images.",
                "Giữ nguyên tên cột. Bài học liên kết bằng moduleId; lỗi ở bất kỳ dòng nào sẽ chặn"
                        + " cả gói."
            };
            for (int i = 0; i < help.length; i++)
                instructions.createRow(i).createCell(0).setCellValue(help[i]);
            var sample = workbook.getSheet("Modules").createRow(1);
            String[] m = {
                "MOD-EXAMPLE",
                "Example module",
                "LESSON_AND_PRACTICE",
                "10",
                "100000",
                "[{\"skillId\":\"REPLACE_SKILL_ID\",\"teachingFocus\":\"PRIMARY\",\"difficultyLevel\":\"LOW\"}]"
            };
            for (int i = 0; i < m.length; i++) sample.createCell(i).setCellValue(m[i]);
            var lesson = workbook.getSheet("Lessons").createRow(1);
            String[] l = {
                "MOD-EXAMPLE",
                "lesson-1",
                "1",
                "Introduction",
                "TEXT",
                "# Introduction\nReplace this example with your lesson.",
                "",
                "",
                "",
                "",
                "60"
            };
            for (int i = 0; i < l.length; i++) lesson.createCell(i).setCellValue(l[i]);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new Failure(500, "Cannot generate template");
        }
    }

    private static void header(Sheet sheet, List<String> columns) {
        var row = sheet.createRow(0);
        for (int i = 0; i < columns.size(); i++) {
            row.createCell(i).setCellValue(columns.get(i));
            sheet.setColumnWidth(i, 6000);
        }
        sheet.createFreezePane(0, 1);
    }

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
                    && Set.of("durationMinutes", "priceVnd", "order", "durationSeconds")
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

    private static void checkHeader(Sheet sheet, List<String> columns) {
        if (sheet == null || sheet.getRow(0) == null)
            throw new Failure(400, "Missing Modules or Lessons sheet");
        for (int i = 0; i < columns.size(); i++)
            if (!columns.get(i).equals(text(sheet.getRow(0), i)))
                throw new Failure(400, "Use the downloaded template without changing column names");
        if (sheet.getLastRowNum() > 5000) throw new Failure(400, "Use at most 5000 rows per sheet");
    }

    private static Path resolve(Path root, String relative) {
        if (relative == null
                || relative.isBlank()
                || relative.contains("\\")
                || relative.contains(":")) throw new Failure(400, "Invalid asset path");
        Path path = root.resolve(relative).normalize();
        if (!path.startsWith(root) || Path.of(relative).isAbsolute())
            throw new Failure(400, "Asset path escapes ZIP");
        return path;
    }

    @Override
    public Preview preview(String filename, long size, InputStream input) {
        Actor a = actor();
        if (size <= 0 || size > content.limits().zipBytes())
            throw new Failure(413, "Import exceeds configured package size");
        if (!previews.tryAcquire())
            throw new Failure(429, "Another import is being checked. Retry shortly.");
        Path root = null;
        try {
            root = Files.createTempDirectory("learning-import-");
            Path workbook = root.resolve("modules.xlsx");
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
                                if (total > content.limits().zipBytes() * 2)
                                    throw new Failure(413, "Expanded ZIP is too large");
                                out.write(buffer, 0, n);
                            }
                        }
                    }
                }
            } else if (filename != null && filename.toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
                try (var out = Files.newOutputStream(workbook)) {
                    byte[] buffer = new byte[65536];
                    long total = 0;
                    int n;
                    while ((n = input.read(buffer)) != -1) {
                        total += n;
                        if (total > Math.min(content.limits().zipBytes(), 20 * 1024 * 1024))
                            throw new Failure(413, "Workbook exceeds supported size");
                        out.write(buffer, 0, n);
                    }
                }
            } else
                throw new Failure(
                        400, "Upload the Excel template or a ZIP containing modules.xlsx");
            if (!Files.exists(workbook) || Files.size(workbook) > 20 * 1024 * 1024)
                throw new Failure(400, "Include modules.xlsx at ZIP root (maximum20MB)");
            List<Problem> errors = new ArrayList<>();
            List<LearningImportUseCase.Row> rows = new ArrayList<>();
            Map<String, List<Map<String, String>>> grouped = new LinkedHashMap<>();
            Set<String> ids = new HashSet<>();
            checkWorkbook(workbook);
            try (var book = new XSSFWorkbook(workbook.toFile())) {
                Sheet moduleSheet = book.getSheet("Modules"),
                        lessonSheet = book.getSheet("Lessons");
                var moduleColumns = new ArrayList<>(MODULE_COLUMNS);
                // Accept the old optional column as inert historical input; never infer membership.
                if (moduleSheet != null
                        && moduleSheet.getRow(0) != null
                        && text(moduleSheet.getRow(0), 5).equals("occupationIds"))
                    moduleColumns.add(5, "occupationIds");
                checkHeader(moduleSheet, moduleColumns);
                checkHeader(lessonSheet, LESSON_COLUMNS);
                for (int i = 1; i <= lessonSheet.getLastRowNum(); i++) {
                    var row = lessonSheet.getRow(i);
                    if (row == null) continue;
                    try {
                        var v = values(row, LESSON_COLUMNS);
                        if (v.values().stream().allMatch(String::isBlank)) continue;
                        v.put("excelRow", Integer.toString(i + 1));
                        grouped.computeIfAbsent(v.get("moduleId"), k -> new ArrayList<>()).add(v);
                    } catch (RuntimeException e) {
                        errors.add(new Problem("Lessons", i + 1, e.getMessage()));
                    }
                }
                for (int i = 1; i <= moduleSheet.getLastRowNum(); i++) {
                    var row = moduleSheet.getRow(i);
                    if (row == null) continue;
                    String id = "";
                    try {
                        var v = values(row, moduleColumns);
                        if (v.values().stream().allMatch(String::isBlank)) continue;
                        id = v.get("moduleId");
                        if (!ids.add(id)) throw new Failure(400, "Duplicate module row");
                        var lessonValues = grouped.getOrDefault(id, List.of());
                        if (lessonValues.size() > 200)
                            throw new Failure(400, "Use at most 200 lessons per module");
                        List<Lesson> lessons = new ArrayList<>();
                        Set<Integer> orders = new HashSet<>();
                        List<Map<String, String>> sorted = new ArrayList<>(lessonValues);
                        sorted.sort(Comparator.comparingInt(x -> Integer.parseInt(x.get("order"))));
                        for (var l : sorted) {
                            int order = Integer.parseInt(l.get("order"));
                            if (order < 1 || !orders.add(order))
                                throw new Failure(400, "Lesson order must be unique and positive");
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
                        var teaching =
                                json.readValue(
                                        v.get("teachings"),
                                        json.getTypeFactory()
                                                .constructCollectionType(
                                                        List.class, TeachingInput.class));
                        @SuppressWarnings("unchecked")
                        List<TeachingInput> skills = (List<TeachingInput>) teaching;
                        Save save =
                                new Save(
                                        v.get("title"),
                                        v.get("moduleType"),
                                        "",
                                        Integer.parseInt(v.get("durationMinutes")),
                                        new BigDecimal(v.get("priceVnd")),
                                        List.of(),
                                        skills);
                        var existing =
                                port.documents(a.organizationId()).stream()
                                        .filter(d -> d.id().equals(v.get("moduleId")))
                                        .findFirst();
                        rows.add(
                                new LearningImportUseCase.Row(
                                        id,
                                        i + 1,
                                        save,
                                        lessons,
                                        existing.map(Document::lockVersion).orElse(null)));
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
                if (!ids.contains(id))
                    errors.add(new Problem(id, 0, "Lessons reference an unknown module row"));
            if (rows.isEmpty()) errors.add(new Problem("", 0, "Include at least one module"));
            String id = UUID.randomUUID().toString();
            Preview p = new Preview(id, rows, errors, List.of(), false);
            jdbc.update(
                    "INSERT INTO"
                        + " platform.learning_import(id,organization_id,actor_id,document,state)"
                        + " VALUES (?::uuid,?,?,?::jsonb,'PREVIEW')",
                    id,
                    a.organizationId(),
                    a.id(),
                    json.writeValueAsString(p));
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
        if (!Set.of("TEXT", "VIDEO").contains(l.get("type")))
            throw new Failure(400, "Lesson type must be TEXT or VIDEO");
        String body = l.get("text"),
                source = l.get("videoSource"),
                asset = null,
                url = l.get("videoUrl");
        double seconds =
                l.get("durationSeconds").isBlank()
                        ? 0
                        : Double.parseDouble(l.get("durationSeconds"));
        if (l.get("type").equals("TEXT")) {
            Path base = root;
            if (!l.get("markdownPath").isBlank()) {
                Path md = resolve(root, l.get("markdownPath"));
                if (!Files.isRegularFile(md))
                    throw new Failure(400, "Missing reading file: " + l.get("markdownPath"));
                if (Files.size(md) > 800000) throw new Failure(400, "Reading file too large");
                body = Files.readString(md);
                base = md.getParent();
            }
            var extensions = List.of(org.commonmark.ext.gfm.tables.TablesExtension.create());
            var document =
                    org.commonmark.parser.Parser.builder()
                            .extensions(extensions)
                            .build()
                            .parse(body);
            Path imageBase = base;
            document.accept(
                    new org.commonmark.node.AbstractVisitor() {
                        @Override
                        public void visit(org.commonmark.node.Image image) {
                            String source = image.getDestination();
                            if (source.startsWith("/api/v1/module-management/assets/")) return;
                            Path imageFile =
                                    resolve(
                                            root,
                                            root.relativize(imageBase.resolve(source).normalize())
                                                    .toString());
                            if (!Files.isRegularFile(imageFile))
                                throw new Failure(400, "Missing image file: " + source);
                            try (var in = Files.newInputStream(imageFile)) {
                                var uploaded =
                                        files.upload(
                                                a.organizationId(),
                                                a.id(),
                                                imageFile.getFileName().toString(),
                                                Files.size(imageFile),
                                                in);
                                if (!uploaded.mediaType().startsWith("image/"))
                                    throw new Failure(400, "Use an image file in a reading lesson");
                                image.setDestination(
                                        "/api/v1/module-management/assets/" + uploaded.id());
                            } catch (IOException error) {
                                throw new Failure(400, "Cannot read image file: " + source);
                            }
                        }
                    });
            body =
                    files.sanitizedHtml(
                            org.commonmark.renderer.html.HtmlRenderer.builder()
                                    .extensions(extensions)
                                    .escapeHtml(true)
                                    .sanitizeUrls(true)
                                    .build()
                                    .render(document));
            return new Lesson(
                    l.get("lessonId"),
                    l.get("title"),
                    "TEXT",
                    body,
                    "HTML",
                    seconds,
                    seconds > 0 ? "MANUAL" : "ESTIMATED",
                    null,
                    null,
                    null);
        }
        if (source.equals("UPLOAD")) {
            Path video = resolve(root, l.get("videoPath"));
            if (!Files.isRegularFile(video))
                throw new Failure(400, "Missing video file: " + l.get("videoPath"));
            try (var in = Files.newInputStream(video)) {
                var uploaded =
                        files.upload(
                                a.organizationId(),
                                a.id(),
                                video.getFileName().toString(),
                                Files.size(video),
                                in);
                asset = uploaded.id();
                seconds = uploaded.durationSeconds();
            }
            url = null;
        }
        return new Lesson(
                l.get("lessonId"),
                l.get("title"),
                "VIDEO",
                null,
                null,
                seconds,
                source.equals("UPLOAD") ? "MEDIA" : "MANUAL",
                source,
                asset,
                url);
    }

    private Preview load(String id, boolean lock) {
        Actor a = actor();
        var found =
                jdbc.queryForList(
                        "SELECT document::text FROM platform.learning_import WHERE id=?::uuid AND"
                                + " organization_id=? AND actor_id=?"
                                + (lock ? " FOR UPDATE" : ""),
                        String.class,
                        id,
                        a.organizationId(),
                        a.id());
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
        var docs = port.documents(a.organizationId());
        var managed = new HashSet<>(port.managedModuleIds());
        var graph = port.graphModules(a.organizationId());
        Set<String> available = new HashSet<>();
        port.catalog("MicroSkill").forEach(c -> available.add(c.id()));
        for (var row : p.modules())
            try {
                var d = docs.stream().filter(x -> x.id().equals(row.moduleId())).findFirst();
                if (d.isPresent()) {
                    if (!a.id().equals(d.get().createdBy()))
                        throw new Failure(403, "This module is managed by another Expert");
                    owned.add(row.moduleId());
                    if (!d.get().current().state().equals("RELEASED")
                            || !Objects.equals(row.expectedVersion(), d.get().lockVersion()))
                        throw new Failure(
                                409, "Existing draft/review or module changed since preview");
                } else if (managed.contains(row.moduleId())
                        || graph.stream().anyMatch(m -> m.metadata().id().equals(row.moduleId())))
                    throw new Failure(409, "Module code is already in use");
                content.prepare(a.organizationId(), a.id(), row.lessons(), true);
                if (!row.moduleId().matches("[A-Za-z0-9_-]{1,100}"))
                    throw new Failure(400, "Invalid module code");
                ModuleAuthoring.text(row.module().title(), "title", 240);
                if (!Set.of("LESSON_AND_PRACTICE", "RESOURCE_GUIDED_PRACTICE")
                                .contains(row.module().moduleType())
                        || row.module().duration() <= 0
                        || row.module().price().signum() <= 0
                        || row.module().price().scale() > 2
                        || !Double.isFinite(row.module().price().doubleValue()))
                    throw new Failure(400, "Invalid module type/duration/price");
                var skills = row.module().teachings();
                if (skills.isEmpty()
                        || skills.size() > 200
                        || skills.stream().filter(t -> t.teachingFocus().equals("PRIMARY")).count()
                                != 1
                        || skills.stream().map(TeachingInput::skillId).distinct().count()
                                != skills.size())
                    throw new Failure(400, "Select unique skills and exactly one PRIMARY");
                for (var t : skills) {
                    new Teaching(
                            new Metadata(
                                    "validation", "1", "DRAFT", "NEEDS_EXPERT_REVIEW", null, null),
                            t.skillId(),
                            "",
                            t.teachingFocus(),
                            t.difficultyLevel());
                    if (!available.contains(t.skillId()))
                        throw new Failure(400, "Unknown skill: " + t.skillId());
                }
            } catch (RuntimeException e) {
                errors.add(new Problem(row.moduleId(), row.excelRow(), e.getMessage()));
            }
        return new Preview(p.id(), p.modules(), errors, owned, p.committed());
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
                                        row.module().occupationIds());
                        Save m = row.module();
                        result.add(
                                modules.importModule(
                                        row.moduleId(),
                                        new Save(
                                                m.title(),
                                                m.moduleType(),
                                                c.id(),
                                                m.duration(),
                                                m.price(),
                                                m.occupationIds(),
                                                m.teachings()),
                                        confirm,
                                        row.expectedVersion()));
                    }
                    try {
                        jdbc.update(
                                "UPDATE platform.learning_import SET"
                                        + " state='COMMITTED',committed_at=now(),document=?::jsonb"
                                        + " WHERE id=?::uuid",
                                json.writeValueAsString(
                                        new Preview(
                                                p.id(),
                                                p.modules(),
                                                p.errors(),
                                                p.ownedDuplicates(),
                                                true)),
                                id);
                    } catch (Exception e) {
                        throw new IllegalStateException(e);
                    }
                    return result;
                });
    }
}
