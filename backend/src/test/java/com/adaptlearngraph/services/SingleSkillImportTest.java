package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.LearningImportEntity;
import com.adaptlearngraph.entities.domain.LearningContent;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;
import com.adaptlearngraph.entities.domain.LearningResources.*;
import com.adaptlearngraph.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.function.Consumer;
import java.util.zip.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class SingleSkillImportTest {
    ModuleAuthoringPort modules;
    LearningContentPort content;
    LearningAssetPort assets;
    LearningImportJpaRepository imports;
    final Map<UUID,String> stored=new HashMap<>();
    ModuleAuthoringService authoring;
    ExcelLearningImport service;
    @BeforeEach void setup() {
        modules=mock(ModuleAuthoringPort.class); content=mock(LearningContentPort.class); assets=mock(LearningAssetPort.class);
        imports=mock(LearningImportJpaRepository.class); authoring=mock(ModuleAuthoringService.class);
        when(modules.actor()).thenReturn(new Actor("expert","org",Set.of("EXPERT")));
        when(modules.catalog("MicroSkill")).thenReturn(List.of(new Choice("MS-QA08","Exploratory testing")));
        when(modules.catalog("ModuleSkill")).thenReturn(List.of(new Choice("MS-QA08","Exploratory testing")));
        when(modules.requireKnowledge(eq("org"),eq("MS-QA08"),anyString(),eq(List.of())))
                .thenAnswer(c->new KnowledgeDefinition(KnowledgeLevel.valueOf(c.getArgument(2)),"1",List.of()));
        when(content.limits()).thenReturn(new Limits(1048576,1048576,1048576,1,null,null));
        when(content.prepare(anyString(),anyString(),anyList(),eq(true))).thenAnswer(c->{List<LearningContent.Lesson> lessons=c.getArgument(2);LearningContent.requireComplete(lessons);return lessons;});
        var sanitizer=new PrivateLearningAssets("http://localhost:9000","test-key","test-secret","test",content,mock(LearningVideoVerificationJpaRepository.class));
        when(assets.sanitizedHtml(anyString())).thenAnswer(c->sanitizer.sanitizedHtml(c.getArgument(0)));
        when(assets.upload(eq("org"),eq("expert"),anyString(),anyLong(),any())).thenAnswer(c->{
            String name=c.getArgument(2);byte[] bytes=c.<InputStream>getArgument(4).readAllBytes();
            boolean video=name.endsWith(".mp4");
            if(video && (bytes.length<12 || !new String(bytes,4,4,StandardCharsets.US_ASCII).equals("ftyp")))throw new ModuleAuthoringService.Failure(400,"Invalid MP4");
            return new Asset(UUID.randomUUID().toString(),"org","expert","test/"+name,name,video?"video/mp4":"image/png",bytes.length,"hash",video?2.0:null,"2026-11-18T00:00:00Z");
        });
        doAnswer(c->{var entity=c.<LearningImportEntity>getArgument(0);stored.put(entity.getId(),entity.getDocument());return null;}).when(imports).insert(any());
        when(imports.document(any(),eq("org"),eq("expert"))).thenAnswer(c->Optional.ofNullable(stored.get(c.getArgument(0))).stream().toList());
        when(imports.lockDocument(any(),eq("org"),eq("expert"))).thenAnswer(c->Optional.ofNullable(stored.get(c.getArgument(0))).stream().toList());
        when(modules.transaction(any())).thenAnswer(c->c.<java.util.function.Supplier<Object>>getArgument(0).get());
        service=new ExcelLearningImport(modules,content,assets,authoring,imports,new ObjectMapper());
    }
    static Map<String,byte[]> unzip(byte[] bytes)throws Exception {
        Map<String,byte[]> entries=new LinkedHashMap<>();try(var zip=new ZipInputStream(new ByteArrayInputStream(bytes))){ZipEntry e;while((e=zip.getNextEntry())!=null)entries.put(e.getName(),zip.readAllBytes());}return entries;
    }
    static byte[] zip(Map<String,byte[]> entries)throws Exception {
        var out=new ByteArrayOutputStream();try(var zip=new ZipOutputStream(out)){for(var e:entries.entrySet()){zip.putNextEntry(new ZipEntry(e.getKey()));zip.write(e.getValue());zip.closeEntry();}}return out.toByteArray();
    }
    byte[] change(Consumer<XSSFWorkbook> edit)throws Exception {
        var entries=unzip(service.template());try(var book=new XSSFWorkbook(new ByteArrayInputStream(entries.get("module.xlsx")));var out=new ByteArrayOutputStream()){edit.accept(book);book.write(out);entries.put("module.xlsx",out.toByteArray());}return zip(entries);
    }
    LearningImportUseCase.Preview preview(byte[] bytes){return service.preview("module.zip",bytes.length,new ByteArrayInputStream(bytes));}
    @Test void templateIsSelfContainedBilingualAndUsesPlainSkillCodes()throws Exception {
        var entries=unzip(service.template());assertEquals(7,entries.size());
        assertTrue(new String(entries.get("HUONG_DAN_VI.txt"),StandardCharsets.UTF_8).contains("HƯỚNG DẪN"));
        assertTrue(new String(entries.get("INSTRUCTIONS_EN.txt"),StandardCharsets.UTF_8).contains("INSTRUCTIONS"));
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(entries.get("module.xlsx")))) {
            assertEquals(ModuleImportTemplate.MODULE_HEADERS.get(2),book.getSheet("Modules").getRow(0).getCell(2).getStringCellValue());
            assertEquals("MS-QA08",book.getSheet("Modules").getRow(1).getCell(2).getStringCellValue());
            assertEquals(4,book.getSheet("Lessons").getLastRowNum());
            assertEquals(4,book.getSheet("Modules").getDataValidations().size());
            assertEquals(3,book.getSheet("Lessons").getDataValidations().size());
            for(int i=1;i<=4;i++){String path=book.getSheet("Lessons").getRow(i).getCell(5).getStringCellValue();assertTrue(entries.get(path).length>100,path);}
        }
        var result=preview(zip(entries));assertTrue(result.errors().isEmpty(),result.errors().toString());
        assertEquals(2,result.modules().size());assertEquals(4,result.modules().stream().mapToInt(r->r.lessons().size()).sum());
        assertEquals("DOCX_ZIP_V1",result.format());
        assertTrue(result.modules().getFirst().lessons().getFirst().body().contains("<table>"));
        assertTrue(result.modules().getFirst().lessons().getFirst().body().contains("<strong>"));
        assertEquals("UPLOAD",result.modules().getFirst().lessons().get(1).videoSource());
        String output=System.getProperty("module.template.output");
        if(output!=null){java.nio.file.Path target=java.nio.file.Path.of(output);java.nio.file.Files.createDirectories(target.toAbsolutePath().getParent());java.nio.file.Files.write(target,zip(entries));}

    }
    @Test void referencesJoinLessonsAndGeneratedIdsRemainStableOnlyWithinPreview()throws Exception {
        byte[] bytes=service.template();var p=preview(bytes);
        assertEquals(List.of("M1","M2"),p.modules().stream().map(LearningImportUseCase.Row::moduleRef).toList());
        for(var row:p.modules()){assertDoesNotThrow(()->UUID.fromString(row.moduleId()));assertNull(row.expectedVersion());assertEquals("MS-QA08",row.module().teachings().getFirst().skillId());}
        assertEquals("FOUNDATION",p.modules().getFirst().module().knowledgeLevel());assertEquals("INTERMEDIATE",p.modules().get(1).module().knowledgeLevel());
        assertEquals("L3",p.modules().get(1).lessons().getFirst().id());
        assertEquals(p.modules().getFirst().moduleId(),service.validate(p.id()).modules().getFirst().moduleId());
        assertNotEquals(p.modules().getFirst().moduleId(),preview(bytes).modules().getFirst().moduleId());
        verify(modules,never()).save(any());verify(modules,never()).saveContent(anyString(),any());
    }
    @Test void plainSkillCodeRejectsJsonMultipleOrUnknownSkillsBeforeCommit()throws Exception {
        for(String value:List.of("[{\"skillId\":\"MS-QA08\"}]","MS-QA08,MS-QA09","missing")) {
            var p=preview(change(book->book.getSheet("Modules").getRow(1).getCell(2).setCellValue(value)));
            assertFalse(p.errors().isEmpty(),value);assertThrows(ModuleAuthoringService.Failure.class,()->service.commit(p.id(),false));
        }
        verifyNoInteractions(authoring);
    }
    @Test void rejectsOldHeadersStandaloneExcelAndRar()throws Exception {
        for(String name:List.of("module.xlsx","module.rar","module.md"))assertEquals(400,assertThrows(ModuleAuthoringService.Failure.class,()->service.preview(name,10,new ByteArrayInputStream(new byte[10]))).status());
        byte[] old=change(book->book.getSheet("Modules").getRow(0).getCell(2).setCellValue("teachings"));
        assertTrue(assertThrows(ModuleAuthoringService.Failure.class,()->preview(old)).getMessage().contains("Template changed"));
    }
    @Test void duplicateUnknownAndInvalidReferencesReportRowsAndBlockEntireBatch()throws Exception {
        for(String mode:List.of("module","lesson","order","unknown","blank","fraction")) {
            byte[] bytes=change(book->{var m=book.getSheet("Modules");var l=book.getSheet("Lessons");switch(mode){
                case "module"->m.getRow(2).getCell(0).setCellValue("M1");
                case "lesson"->l.getRow(2).getCell(1).setCellValue("L1");
                case "order"->l.getRow(2).getCell(2).setCellValue(1);
                case "unknown"->l.getRow(1).getCell(0).setCellValue("MISSING");
                case "blank"->m.getRow(1).getCell(0).setCellValue("");
                case "fraction"->l.getRow(1).getCell(2).setCellValue(1.5);
            }});
            var p=preview(bytes);assertFalse(p.errors().isEmpty(),mode);assertThrows(ModuleAuthoringService.Failure.class,()->service.commit(p.id(),false));
        }
        verifyNoInteractions(authoring);
    }
    @Test void missingWrongTypeAndCorruptContentReportLessonRow()throws Exception {
        for(String path:List.of("lesson/missing.docx","video/qa08-minh-hoa.mp4","lesson/broken.docx")) {
            var entries=unzip(change(book->book.getSheet("Lessons").getRow(1).getCell(5).setCellValue(path)));
            if(path.endsWith("broken.docx"))entries.put(path,"Not Word".getBytes(StandardCharsets.UTF_8));
            var p=preview(zip(entries));assertTrue(p.errors().stream().anyMatch(e->e.row()==2 && e.reason().startsWith("Lessons:")),p.errors().toString());
            assertThrows(ModuleAuthoringService.Failure.class,()->service.commit(p.id(),false));
        }
        verifyNoInteractions(authoring);
    }
    @Test void zipTraversalDuplicateNormalizedPathsAndOversizeAreRejected()throws Exception {
        for(String path:List.of("../outside.docx","/absolute.docx","lesson/../outside.docx","lesson\\bad.docx","C:/bad.docx")) {
            var e=unzip(service.template());e.put(path,new byte[]{1});
            assertThrows(ModuleAuthoringService.Failure.class,()->preview(zip(e)),path);
        }
        var entries=unzip(service.template());entries.put("lesson//qa08-khai-niem.docx",new byte[]{1});assertThrows(ModuleAuthoringService.Failure.class,()->preview(zip(entries)));
        assertEquals(413,assertThrows(ModuleAuthoringService.Failure.class,()->service.preview("x.zip",1048577,new ByteArrayInputStream(new byte[1]))).status());
    }
    @Test void oldCachedPreviewsRequireReuploadEvenWhenModuleReferencesExist()throws Exception {
        var p=preview(service.template());stored.computeIfPresent(UUID.fromString(p.id()),(id,text)->text.replace(",\"format\":\"DOCX_ZIP_V1\"",""));
        assertTrue(service.validate(p.id()).errors().stream().anyMatch(e->e.reason().contains("template changed")));
        assertThrows(ModuleAuthoringService.Failure.class,()->service.commit(p.id(),false));verifyNoInteractions(authoring);
    }
    @Test void commitUsesGeneratedIdentitiesAndNeverUpdatesExistingModules()throws Exception {
        var p=preview(service.template());var generated=new Content("content","Title","Body","text/markdown","1",List.of(),"expert","2026-11-18T00:00:00Z");
        when(authoring.lessons(anyString(),anyList(),anyList())).thenReturn(generated);
        service.commit(p.id(),false);
        for(var row:p.modules())verify(authoring).importModule(eq(row.moduleId()),any(),eq(false),isNull());
        verify(authoring,never()).update(anyString(),anyLong(),any());verify(imports).commit(eq(UUID.fromString(p.id())),eq("org"),eq("expert"),contains("\"committed\":true"));
    }
    @Test void collisionsForeignPreviewsAndWrongRolesCannotCommit()throws Exception {
        var p=preview(service.template());when(modules.managedModuleIds()).thenReturn(List.of(p.modules().getFirst().moduleId()));
        assertThrows(ModuleAuthoringService.Failure.class,()->service.commit(p.id(),false));
        when(modules.actor()).thenReturn(new Actor("other","foreign",Set.of("EXPERT")));
        assertEquals(404,assertThrows(ModuleAuthoringService.Failure.class,()->service.validate(p.id())).status());
        when(modules.actor()).thenReturn(new Actor("manager","org",Set.of("LD_MANAGER")));
        assertEquals(403,assertThrows(ModuleAuthoringService.Failure.class,()->service.template()).status());verifyNoInteractions(authoring);
    }
    @Test void noEligibleSkillProducesAnActionableTemplateError() {
        when(modules.catalog("ModuleSkill")).thenReturn(List.of());
        assertEquals(409,assertThrows(ModuleAuthoringService.Failure.class,()->service.template()).status());
    }
}
