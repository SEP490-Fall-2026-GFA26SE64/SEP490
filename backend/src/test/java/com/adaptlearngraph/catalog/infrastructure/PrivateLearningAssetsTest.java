package com.adaptlearngraph.catalog.infrastructure;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.adaptlearngraph.catalog.application.ModuleAuthoringService;
import com.adaptlearngraph.catalog.application.port.out.*;
import com.adaptlearngraph.catalog.domain.LearningResources.Limits;
import com.adaptlearngraph.catalog.domain.ModuleAuthoring.Actor;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;

class PrivateLearningAssetsTest {
    @TempDir Path temp;
    private final LearningContentPort content = mock(LearningContentPort.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);

    @Test
    void renderedRichTextDropsExecutableContentAndRemoteImagesButKeepsTablesCodeAndPrivateImages() {
        var assets =
                new PrivateLearningAssets(
                        "http://localhost:9000", "test-key", "test-secret", "test", content, jdbc);
        String html =
                assets.sanitizedHtml(
                        "<script>alert(1)</script><table><tr><td>Cell</td></tr></table><pre><code>RETURN"
                            + " 1</code></pre><img src='https://tracker.test/image.png'><img"
                            + " src='/api/v1/module-management/assets/12345678-1234-1234-1234-123456789012'"
                            + " onerror='alert(1)'><a href='javascript:alert(1)'>link</a>");
        assertFalse(html.contains("script"));
        assertFalse(html.contains("tracker.test"));
        assertFalse(html.contains("onerror"));
        assertFalse(html.contains("javascript:"));
        assertTrue(html.contains("<table>"));
        assertTrue(html.contains("<code>"));
        assertTrue(html.contains("/assets/12345678-1234-1234-1234-123456789012"));
        String markdown =
                assets.renderMarkdown(
                        "| Name | Value |\n"
                            + "| --- | --- |\n"
                            + "| Skill | One |\n\n"
                            + "```cypher\n"
                            + "RETURN 1\n"
                            + "```");
        assertTrue(markdown.contains("<table>"));
        assertTrue(markdown.contains("RETURN 1"));
    }

    @Test
    void traversalZipIsRejectedBeforeAnyPersistentWrite() throws Exception {
        var port = mock(ModuleAuthoringPort.class);
        when(port.actor()).thenReturn(new Actor("expert", "org", Set.of("EXPERT")));
        when(content.limits())
                .thenReturn(
                        new Limits(200 * 1048576L, 5 * 1048576L, 500 * 1048576L, 1, null, "time"));
        var importer =
                new ExcelLearningImport(
                        port,
                        content,
                        mock(LearningAssetPort.class),
                        mock(ModuleAuthoringService.class),
                        jdbc,
                        new ObjectMapper());
        var out = new ByteArrayOutputStream();
        try (var zip = new ZipOutputStream(out)) {
            zip.putNextEntry(new ZipEntry("../escape.md"));
            zip.write("escape".getBytes());
            zip.closeEntry();
        }
        assertThrows(
                ModuleAuthoringService.Failure.class,
                () ->
                        importer.preview(
                                "content.zip",
                                out.size(),
                                new ByteArrayInputStream(out.toByteArray())));
        verifyNoInteractions(jdbc);
    }

    @Test
    void mp4ParserRequiresH264AndValidMovieDuration() throws Exception {
        byte[] header = box("ftyp", new byte[8]);
        var movieData = new ByteArrayOutputStream();
        try (var out = new DataOutputStream(movieData)) {
            out.writeInt(0);
            out.writeLong(0);
            out.writeInt(1000);
            out.writeInt(5055);
        }
        var sampleData = new ByteArrayOutputStream();
        try (var out = new DataOutputStream(sampleData)) {
            out.writeInt(0);
            out.writeInt(1);
            out.write(box("avc1", new byte[8]));
        }
        Path valid = temp.resolve("valid.mp4");
        try (var out = Files.newOutputStream(valid)) {
            out.write(header);
            out.write(
                    box(
                            "moov",
                            concat(
                                    box("mvhd", movieData.toByteArray()),
                                    box(
                                            "trak",
                                            box(
                                                    "mdia",
                                                    box(
                                                            "minf",
                                                            box(
                                                                    "stbl",
                                                                    box(
                                                                            "stsd",
                                                                            sampleData
                                                                                    .toByteArray()))))))));
        }
        assertEquals(5.055, PrivateLearningAssets.mp4Duration(valid), .001);
        Path invalid = temp.resolve("invalid.mp4");
        Files.write(invalid, "not a video".getBytes());
        assertThrows(RuntimeException.class, () -> PrivateLearningAssets.mp4Duration(invalid));
    }

    @Test
    void vimeoMetadataCanonicalizationPreservesUnlistedHash() {
        assertEquals(
                "https://vimeo.com/76979871/8272103f6e",
                ExternalLearningVideo.metadataUrl(
                        "VIMEO", "https://player.vimeo.com/video/76979871?h=8272103f6e"));
        assertEquals(
                "https://vimeo.com/19231868",
                ExternalLearningVideo.metadataUrl("VIMEO", "https://vimeo.com/19231868"));
        assertEquals(
                "https://vimeo.com/76979871/8272103f6e",
                ExternalLearningVideo.metadataUrl(
                        "VIMEO", "https://vimeo.com/76979871/8272103f6e"));
    }

    private static byte[] box(String type, byte[] data) throws IOException {
        var bytes = new ByteArrayOutputStream();
        try (var out = new DataOutputStream(bytes)) {
            out.writeInt(8 + data.length);
            out.writeBytes(type);
            out.write(data);
        }
        return bytes.toByteArray();
    }

    private static byte[] concat(byte[] first, byte[] second) throws IOException {
        var bytes = new ByteArrayOutputStream();
        bytes.write(first);
        bytes.write(second);
        return bytes.toByteArray();
    }
}
