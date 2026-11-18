package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.ModuleAuthoring.Actor;
import com.adaptlearngraph.repository.LearningAssetPort;
import org.apache.poi.xwpf.usermodel.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;
import org.xml.sax.Attributes;

/** Converts bounded DOCX body content, never follows external package relationships. */
final class WordLessonReader {
    private final LearningAssetPort assets;
    private final Actor actor;
    private int cells;
    private int pictures;
    private final Map<String, String> uploadedImages = new HashMap<>();
    WordLessonReader(LearningAssetPort assets, Actor actor) { this.assets = assets; this.actor = actor; }

    String read(Path file) throws IOException {
        if (Files.size(file) > 20L * 1024 * 1024) throw fail("Word file exceeds 20 MB / Tệp Word vượt 20 MB");
        checkPackage(file);
        try (var input = Files.newInputStream(file); var doc = new XWPFDocument(input)) {
            String html = assets.sanitizedHtml(blocks(doc.getBodyElements(), doc, 0));
            if (html == null || html.length() > 500_000) throw fail("Word content is too long / Nội dung Word quá dài");
            if (html.replaceAll("<[^>]+>", " ").replace("&nbsp;", " ").isBlank())
                throw fail("Word lesson must contain readable text / Bài đọc Word phải có nội dung văn bản");
            return html;
        } catch (ModuleAuthoringService.Failure error) { throw error; }
        catch (Exception error) { throw fail("Cannot read DOCX. Use an unencrypted Word document / Không đọc được DOCX. Dùng Word không có mật khẩu"); }
    }
    private static ModuleAuthoringService.Failure fail(String text) { return new ModuleAuthoringService.Failure(400, text); }
    private static void checkPackage(Path file) throws IOException {
        long total = 0; int entries = 0; boolean document = false;
        try (var zip = new ZipInputStream(Files.newInputStream(file))) {
            ZipEntry entry; byte[] buffer = new byte[8192];
            while ((entry = zip.getNextEntry()) != null) {
                if (++entries > 500) throw fail("Word has too many package parts");
                String name = entry.getName();
                if (name.startsWith("/") || name.contains("\\") || name.contains("..") || name.contains(":")) throw fail("Unsafe Word package path");
                if (name.toLowerCase(Locale.ROOT).contains("vbaproject") || name.startsWith("word/embeddings/")) throw fail("Embedded objects and macros are not supported / Không hỗ trợ đối tượng nhúng hoặc macro");
                boolean inspect = name.endsWith(".rels") || name.equals("word/document.xml");
                var bytes = inspect ? new ByteArrayOutputStream() : null;
                long part = 0; int n;
                while ((n = zip.read(buffer)) != -1) {
                    total += n; part += n;
                    if (total > 32L * 1024 * 1024 || part > 16L * 1024 * 1024) throw fail("Expanded Word document is too large");
                    if (inspect) bytes.write(buffer, 0, n);
                }
                if (name.equals("word/document.xml")) document = true;
                if (inspect) {
                    try {
                        var reader = org.apache.poi.util.XMLHelper.newXMLReader();
                        reader.setContentHandler(new org.xml.sax.helpers.DefaultHandler() {
                            final Deque<Boolean> drawings = new ArrayDeque<>();
                            @Override public void startElement(String uri, String local, String qName, Attributes attributes) {
                                if (local.equals("drawing")) drawings.push(false);
                                if (local.equals("pic") && !drawings.isEmpty()) { drawings.pop(); drawings.push(true); }
                                if (local.equals("Relationship") && "External".equalsIgnoreCase(attributes.getValue("TargetMode"))) {
                                    String type = attributes.getValue("Type"), target = attributes.getValue("Target");
                                    if (type == null || !type.endsWith("/hyperlink") || target == null || !(target.startsWith("https://") || target.startsWith("http://") || target.startsWith("mailto:")))
                                        throw fail("External media or data links are not supported / Không hỗ trợ liên kết ảnh hoặc dữ liệu bên ngoài");
                                }
                                if (Set.of("altChunk", "object", "txbxContent", "chart", "oMath", "oMathPara", "ins", "del", "moveFrom", "moveTo", "footnoteReference", "endnoteReference", "instrText", "fldSimple", "pict", "vMerge", "gridSpan").contains(local))
                                    throw fail("Unsupported Word content: " + local + ". Use ordinary text, simple tables and embedded images / Chuyển sang văn bản, bảng đơn giản hoặc ảnh nhúng; chấp nhận thay đổi trước khi nhập.");
                            }
                            @Override public void endElement(String uri, String local, String qName) {
                                if (local.equals("drawing") && !drawings.isEmpty() && !drawings.pop())
                                    throw fail("Unsupported Word drawing. Convert it to an embedded image / Chuyển hình vẽ Word thành ảnh nhúng trước khi nhập");
                            }
                        });
                        reader.parse(new org.xml.sax.InputSource(new ByteArrayInputStream(bytes.toByteArray())));
                    } catch (ModuleAuthoringService.Failure error) { throw error; }
                    catch (Exception error) { throw fail("Invalid Word XML / Cấu trúc Word không hợp lệ"); }
                }
            }
        }
        if (!document) throw fail("Use a valid DOCX reading file / Dùng tệp bài đọc DOCX hợp lệ");
    }
    private String blocks(List<IBodyElement> elements, XWPFDocument doc, int depth) throws IOException {
        if (depth > 8) throw fail("Word nesting is too deep");
        var html = new StringBuilder();
        for (int i = 0; i < elements.size();) {
            IBodyElement block = elements.get(i);
            if (block instanceof XWPFParagraph paragraph) {
                if (paragraph.getNumID() != null) {
                    int[] cursor = {i}; html.append(list(elements, cursor, level(paragraph), paragraph.getNumID().toString(), doc)); i = cursor[0];
                } else {
                    String style = paragraph.getStyle(); String tag = "p";
                    if (style != null && style.matches("(?i)Heading ?[1-6]")) tag = "h" + style.replaceAll("\\D", "");
                    else if ("Title".equalsIgnoreCase(style)) tag = "h1";
                    html.append('<').append(tag).append('>').append(runs(paragraph, doc)).append("</").append(tag).append('>'); i++;
                }
            } else if (block instanceof XWPFTable table) {
                html.append("<table><tbody>");
                for (var row : table.getRows()) {
                    html.append("<tr>");
                    for (var cell : row.getTableCells()) {
                        if (++cells > 2000) throw fail("Word contains too many table cells");
                        html.append("<td>").append(blocks(cell.getBodyElements(), doc, depth + 1)).append("</td>");
                    }
                    html.append("</tr>");
                }
                html.append("</tbody></table>"); i++;
            } else throw fail("Unsupported Word block. Convert content controls to ordinary paragraphs / Chuyển nội dung điều khiển thành đoạn văn thông thường");
            if (html.length() > 500_000) throw fail("Word content is too long / Nội dung Word quá dài");
        }
        return html.toString();
    }
    private static int level(XWPFParagraph p) { return p.getNumIlvl() == null ? 0 : p.getNumIlvl().intValue(); }
    private String list(List<IBodyElement> elements, int[] cursor, int level, String number, XWPFDocument doc) throws IOException {
        if (level < 0 || level > 8) throw fail("Word list nesting is too deep");
        XWPFParagraph first = (XWPFParagraph)elements.get(cursor[0]);
        String tag = "bullet".equals(first.getNumFmt()) ? "ul" : "ol";
        var html = new StringBuilder("<" + tag + ">");
        while (cursor[0] < elements.size() && elements.get(cursor[0]) instanceof XWPFParagraph p
                && p.getNumID() != null && p.getNumID().toString().equals(number) && level(p) == level) {
            html.append("<li>").append(runs(p, doc)); cursor[0]++;
            while (cursor[0] < elements.size() && elements.get(cursor[0]) instanceof XWPFParagraph next
                    && next.getNumID() != null && next.getNumID().toString().equals(number) && level(next) > level) {
                html.append(list(elements, cursor, level(next), number, doc));
            }
            html.append("</li>");
        }
        return html.append("</").append(tag).append('>').toString();
    }
    private String runs(XWPFParagraph paragraph, XWPFDocument doc) throws IOException {
        var html = new StringBuilder();
        for (IRunElement element : paragraph.getIRuns()) {
            if (!(element instanceof XWPFRun run)) throw fail("Unsupported Word run / Nội dung Word không được hỗ trợ");
            String text = escape(run.text()).replace("\n", "<br>");
            if (run.isBold()) text = "<strong>" + text + "</strong>";
            if (run.isItalic()) text = "<em>" + text + "</em>";
            if (run.getUnderline() != UnderlinePatterns.NONE) text = "<u>" + text + "</u>";
            if (run instanceof XWPFHyperlinkRun link) {
                var target = link.getHyperlink(doc);
                if (target != null) text = "<a href=\"" + escape(target.getURL()) + "\">" + text + "</a>";
            }
            html.append(text);
            for (var picture : run.getEmbeddedPictures()) {
                if (++pictures > 100) throw fail("Word contains too many images");
                var data = picture.getPictureData();
                if (data == null || !Set.of("png", "jpg", "jpeg", "webp").contains(data.suggestFileExtension().toLowerCase(Locale.ROOT)))
                    throw fail("Use embedded PNG/JPEG/WebP images / Dùng ảnh PNG/JPEG/WebP nhúng");
                String source = uploadedImages.get(data.getFileName());
                if (source == null) {
                    byte[] bytes = data.getData();
                    var asset = assets.upload(actor.organizationId(), actor.id(), data.getFileName(), bytes.length, new ByteArrayInputStream(bytes));
                    if (!asset.mediaType().startsWith("image/")) throw fail("Reading content requires an image asset");
                    source = "/api/v1/module-management/assets/" + asset.id(); uploadedImages.put(data.getFileName(), source);
                }
                html.append("<img src=\"").append(source).append("\" alt=\"").append(escape(picture.getDescription())).append("\">");
            }
        }
        return html.toString();
    }
    private static String escape(String text) { return text == null ? "" : text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;"); }
}
