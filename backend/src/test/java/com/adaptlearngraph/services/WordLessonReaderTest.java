package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.ModuleAuthoring.Actor;
import com.adaptlearngraph.entities.domain.LearningResources.Asset;
import com.adaptlearngraph.repository.*;
import org.apache.poi.xwpf.usermodel.*;
import org.apache.poi.util.Units;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.io.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class WordLessonReaderTest {
    @TempDir Path dir;
    LearningAssetPort assets;
    WordLessonReader reader;
    @BeforeEach void setup() {
        assets=mock(LearningAssetPort.class);
        var sanitizer=new PrivateLearningAssets("http://localhost:9000","test-key","test-secret","test",mock(LearningContentPort.class),mock(LearningVideoVerificationJpaRepository.class));
        when(assets.sanitizedHtml(anyString())).thenAnswer(c->sanitizer.sanitizedHtml(c.getArgument(0)));
        when(assets.upload(eq("org"),eq("expert"),anyString(),anyLong(),any())).thenReturn(new Asset("12345678-1234-1234-1234-123456789012","org","expert","image","image.png","image/png",68,"hash",null,"2026-11-18T00:00:00Z"));
        reader=new WordLessonReader(assets,new Actor("expert","org",Set.of("EXPERT")));
    }
    Path file(XWPFDocument doc)throws Exception { Path file=dir.resolve(UUID.randomUUID()+".docx");try(var out=Files.newOutputStream(file)){doc.write(out);}return file; }
    @Test void preservesHeadingsEmphasisTablesLiteralTextAndEmbeddedImages()throws Exception {
        try(var doc=new XWPFDocument()) {
            var p=doc.createParagraph();p.setStyle("Heading2");p.createRun().setText("Nội dung bài đọc");
            var r=doc.createParagraph().createRun();r.setBold(true);r.setItalic(true);r.setUnderline(UnderlinePatterns.SINGLE);r.setText("<script>literal</script>");
            var table=doc.createTable(1,2);table.getRow(0).getCell(0).setText("Cell one");table.getRow(0).getCell(1).setText("Cell two");
            byte[] png=Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4U0AAAAASUVORK5CYII=");
            var picture=doc.createParagraph().createRun();picture.addPicture(new ByteArrayInputStream(png),XWPFDocument.PICTURE_TYPE_PNG,"image.png",Units.toEMU(10),Units.toEMU(10));
            String html=reader.read(file(doc));
            assertTrue(html.contains("<h2>"));assertTrue(html.contains("<strong>"));assertTrue(html.contains("<em>"));assertTrue(html.contains("<u>"));
            assertTrue(html.contains("&lt;script&gt;literal&lt;/script&gt;"));assertFalse(html.contains("<script>"));
            assertTrue(html.contains("<table>"));assertTrue(html.contains("Cell two"));assertTrue(html.contains("/api/v1/module-management/assets/12345678"));
            verify(assets).upload(eq("org"),eq("expert"),argThat(name->name.endsWith(".png")),eq((long)png.length),any());
        }
    }
    @Test void keepsAdjacentNumberedItemsInOneList()throws Exception {
        try(var doc=new XWPFDocument()) {
            var numbering=doc.createNumbering();
            var abstractNum=org.openxmlformats.schemas.wordprocessingml.x2006.main.CTAbstractNum.Factory.newInstance();
            abstractNum.setAbstractNumId(java.math.BigInteger.ZERO);
            var level=abstractNum.addNewLvl();level.setIlvl(java.math.BigInteger.ZERO);level.addNewStart().setVal(java.math.BigInteger.ONE);
            level.addNewNumFmt().setVal(org.openxmlformats.schemas.wordprocessingml.x2006.main.STNumberFormat.DECIMAL);level.addNewLvlText().setVal("%1.");
            var id=numbering.addNum(numbering.addAbstractNum(new XWPFAbstractNum(abstractNum)));
            for(String text:List.of("First step","Second step")){var p=doc.createParagraph();p.setNumID(id);p.setNumILvl(java.math.BigInteger.ZERO);p.createRun().setText(text);}
            String html=reader.read(file(doc));assertEquals(1,html.split("<ol>",-1).length-1);assertEquals(2,html.split("<li>",-1).length-1);
        }
    }
    @Test void rejectsUnsupportedMainBodyContentBeforeAnyAssetUpload()throws Exception {
        for(String element:List.of("<w:ins><w:r><w:t>Unaccepted</w:t></w:r></w:ins>","<w:object/>","<w:txbxContent/>","<w:footnoteReference w:id=\"1\"/>")) {
            byte[] original;try(var doc=new XWPFDocument()){doc.createParagraph().createRun().setText("Text");original=Files.readAllBytes(file(doc));}
            var parts=SingleSkillImportTest.unzip(original);String xml=new String(parts.get("word/document.xml"),StandardCharsets.UTF_8);
            parts.put("word/document.xml",xml.replace("<w:body>","<w:body>"+element).getBytes(StandardCharsets.UTF_8));
            Path path=dir.resolve(UUID.randomUUID()+".docx");Files.write(path,SingleSkillImportTest.zip(parts));
            assertThrows(ModuleAuthoringService.Failure.class,()->reader.read(path));
        }
        verify(assets,never()).upload(anyString(),anyString(),anyString(),anyLong(),any());
    }
    @Test void rejectsExternalMediaAndExpandedDocumentBombs()throws Exception {
        byte[] original;try(var doc=new XWPFDocument()){doc.createParagraph().createRun().setText("Text");original=Files.readAllBytes(file(doc));}
        var parts=SingleSkillImportTest.unzip(original);
        parts.put("word/_rels/document.xml.rels",("<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rRemote\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image\" Target=\"http://127.0.0.1/internal\" TargetMode=\"External\"/></Relationships>").getBytes(StandardCharsets.UTF_8));
        Path external=dir.resolve("external.docx");Files.write(external,SingleSkillImportTest.zip(parts));assertThrows(ModuleAuthoringService.Failure.class,()->reader.read(external));
        parts=SingleSkillImportTest.unzip(original);parts.put("word/media/bomb.png",new byte[17*1024*1024]);
        Path bomb=dir.resolve("bomb.docx");Files.write(bomb,SingleSkillImportTest.zip(parts));assertThrows(ModuleAuthoringService.Failure.class,()->reader.read(bomb));
        verify(assets,never()).upload(anyString(),anyString(),anyString(),anyLong(),any());
    }
    @Test void rejectsEmptyOrInvalidWord()throws Exception {
        Path invalid=dir.resolve("invalid.docx");Files.writeString(invalid,"Not DOCX");assertThrows(ModuleAuthoringService.Failure.class,()->reader.read(invalid));
        try(var doc=new XWPFDocument()){Path empty=file(doc);assertThrows(ModuleAuthoringService.Failure.class,()->reader.read(empty));}
    }
}
