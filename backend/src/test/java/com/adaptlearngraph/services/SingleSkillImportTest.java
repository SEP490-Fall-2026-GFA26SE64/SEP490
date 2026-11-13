package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.LearningImportEntity;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;
import com.adaptlearngraph.entities.domain.LearningResources.Limits;
import com.adaptlearngraph.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.*;
import java.io.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class SingleSkillImportTest {
    ModuleAuthoringPort modules=mock(ModuleAuthoringPort.class);
    LearningContentPort content=mock(LearningContentPort.class);
    LearningImportJpaRepository imports=mock(LearningImportJpaRepository.class);
    Map<UUID,String> stored=new HashMap<>();
    ModuleAuthoringService authoring=mock(ModuleAuthoringService.class);
    ExcelLearningImport service;
    @BeforeEach void setup() {
        when(modules.actor()).thenReturn(new Actor("expert","org",Set.of("EXPERT")));
        when(modules.catalog("MicroSkill")).thenReturn(List.of(new Choice("skill","SQL")));
        when(content.limits()).thenReturn(new Limits(1048576,1024,1048576,1,null,null));
        doAnswer(c->{var entity=c.<LearningImportEntity>getArgument(0);stored.put(entity.getId(),entity.getDocument());return null;}).when(imports).insert(any());
        when(imports.document(any(),eq("org"),eq("expert"))).thenAnswer(c->List.of(stored.get(c.getArgument(0))));
        when(imports.lockDocument(any(),eq("org"),eq("expert"))).thenAnswer(c->List.of(stored.get(c.getArgument(0))));
        when(modules.transaction(any())).thenAnswer(c->c.<java.util.function.Supplier<Object>>getArgument(0).get());
        service=new ExcelLearningImport(modules,content,mock(LearningAssetPort.class),authoring,imports,new ObjectMapper());
    }
    byte[] workbook(String mapping)throws Exception {
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(service.template()));var out=new ByteArrayOutputStream()) {
            book.getSheet("Modules").getRow(1).getCell(4).setCellValue(mapping);
            book.getSheet("Modules").getRow(1).getCell(5).setCellValue("FOUNDATION");
            book.write(out);return out.toByteArray();
        }
    }
    @Test void downloadedTemplateAndImportUseOneSkillWithoutRetiredFields()throws Exception {
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(service.template()))) {
            String example=book.getSheet("Modules").getRow(1).getCell(4).getStringCellValue();
            assertEquals("[{\"skillId\":\"REPLACE_SKILL_ID\"}]",example);
            assertEquals("moduleRef",book.getSheet("Modules").getRow(0).getCell(0).getStringCellValue());
            assertEquals("moduleRef",book.getSheet("Lessons").getRow(0).getCell(0).getStringCellValue());
        }
        byte[] bytes=workbook("[{\"skillId\":\"skill\"}]");
        var preview=service.preview("modules.xlsx",bytes.length,new ByteArrayInputStream(bytes));
        assertTrue(preview.errors().isEmpty(),preview.errors().toString());assertEquals(1,preview.modules().size());
        assertEquals("skill",preview.modules().getFirst().module().teachings().getFirst().skillId());
        var mapper=com.adaptlearngraph.helper.ModelMapperFactory.create(List.of(new com.adaptlearngraph.helper.ModuleAuthoringMappings(),new com.adaptlearngraph.helper.LearningContentMappings()));
        var response=mapper.map(preview,com.adaptlearngraph.dtos.LearningContentDto.ImportPreviewResponse.class);
        assertEquals("M1",response.modules().getFirst().moduleRef());
        assertEquals(preview.modules().getFirst().moduleId(),response.modules().getFirst().moduleId());
        assertNull(response.modules().getFirst().expectedVersion());
    }
    @Test void multiSkillImportIsRejectedBeforeAnyModuleMutation()throws Exception {
        byte[] bytes=workbook("[{\"skillId\":\"skill\"},{\"skillId\":\"second\"}]");
        var preview=service.preview("modules.xlsx",bytes.length,new ByteArrayInputStream(bytes));
        assertFalse(preview.errors().isEmpty());verify(modules,never()).save(any());verify(modules,never()).saveContent(anyString(),any());
    }
    @Test void referencesJoinLessonsWhileGeneratedIdsStayStableUntilCommit() throws Exception {
        byte[] bytes;
        try (var book=new XSSFWorkbook(new ByteArrayInputStream(workbook("[{\"skillId\":\"skill\"}]")));var out=new ByteArrayOutputStream()) {
            var module=book.getSheet("Modules").createRow(2);
            for(int c=0;c<6;c++)module.createCell(c).setCellValue(book.getSheet("Modules").getRow(1).getCell(c).getStringCellValue());
            module.getCell(0).setCellValue("M2");module.getCell(1).setCellValue("Second module");
            var lesson=book.getSheet("Lessons").createRow(2);
            for(int c=0;c<11;c++)lesson.createCell(c).setCellValue(book.getSheet("Lessons").getRow(1).getCell(c).getStringCellValue());
            lesson.getCell(0).setCellValue("M2");lesson.getCell(1).setCellValue("second-lesson");lesson.getCell(5).setCellValue("# Second body");
            book.write(out);bytes=out.toByteArray();
        }
        var p=service.preview("modules.xlsx",bytes.length,new ByteArrayInputStream(bytes));
        assertTrue(p.errors().isEmpty(),p.errors().toString());assertEquals(2,p.modules().size());
        assertEquals(List.of("M1","M2"),p.modules().stream().map(LearningImportUseCase.Row::moduleRef).toList());
        var first=p.modules().getFirst();var second=p.modules().get(1);
        assertDoesNotThrow(()->UUID.fromString(first.moduleId()));assertNotEquals(first.moduleId(),second.moduleId());
        assertNotEquals("M1",first.moduleId());assertNull(first.expectedVersion());assertTrue(p.ownedDuplicates().isEmpty());
        assertEquals("second-lesson",second.lessons().getFirst().id());
        assertEquals(first.moduleId(),service.validate(p.id()).modules().getFirst().moduleId());
        var again=service.preview("modules.xlsx",bytes.length,new ByteArrayInputStream(bytes));
        assertNotEquals(first.moduleId(),again.modules().getFirst().moduleId());
        verify(modules,never()).save(any());verify(modules,never()).saveContent(anyString(),any());
    }
    @Test void rejectsOldIdHeadersAndUnmatchedOrDuplicateReferences() throws Exception {
        for(String mode:List.of("old","blank","duplicate","unknown")) {
            byte[] bytes;
            try(var book=new XSSFWorkbook(new ByteArrayInputStream(workbook("[{\"skillId\":\"skill\"}]")));var out=new ByteArrayOutputStream()) {
                if(mode.equals("old"))book.getSheet("Modules").getRow(0).getCell(0).setCellValue("moduleId");
                if(mode.equals("blank"))book.getSheet("Modules").getRow(1).getCell(0).setCellValue("");
                if(mode.equals("unknown"))book.getSheet("Lessons").getRow(1).getCell(0).setCellValue("MISSING");
                if(mode.equals("duplicate")){var row=book.getSheet("Modules").createRow(2);for(int c=0;c<6;c++)row.createCell(c).setCellValue(book.getSheet("Modules").getRow(1).getCell(c).getStringCellValue());}
                book.write(out);bytes=out.toByteArray();
            }
            if(mode.equals("old"))assertThrows(ModuleAuthoringService.Failure.class,()->service.preview("modules.xlsx",bytes.length,new ByteArrayInputStream(bytes)));
            else assertFalse(service.preview("modules.xlsx",bytes.length,new ByteArrayInputStream(bytes)).errors().isEmpty(),mode);
        }
        verify(modules,never()).save(any());
    }
    @Test void commitUsesTheGeneratedPreviewIdentityWithoutUpdatingAnyExistingModule() throws Exception {
        var bytes=workbook("[{\"skillId\":\"skill\"}]");
        var p=service.preview("modules.xlsx",bytes.length,new ByteArrayInputStream(bytes));
        var created=mock(Content.class);when(created.id()).thenReturn("generated-content");
        when(authoring.lessons(anyString(),anyList(),anyList())).thenReturn(created);
        service.commit(p.id(),false);
        verify(authoring).importModule(eq(p.modules().getFirst().moduleId()),any(),eq(false),isNull());
        verify(authoring,never()).update(anyString(),anyLong(),any());
        verify(imports).commit(eq(UUID.fromString(p.id())),eq("org"),eq("expert"),contains("\"committed\":true"));
    }
    @Test void generatedCollisionAndForeignPreviewCannotBeCommitted() throws Exception {
        var bytes=workbook("[{\"skillId\":\"skill\"}]");
        var p=service.preview("modules.xlsx",bytes.length,new ByteArrayInputStream(bytes));
        when(modules.managedModuleIds()).thenReturn(List.of(p.modules().getFirst().moduleId()));
        assertFalse(service.validate(p.id()).errors().isEmpty());
        assertThrows(ModuleAuthoringService.Failure.class,()->service.commit(p.id(),true));
        when(modules.actor()).thenReturn(new Actor("other","foreign",Set.of("EXPERT")));
        assertEquals(404,assertThrows(ModuleAuthoringService.Failure.class,()->service.validate(p.id())).status());
        verifyNoInteractions(authoring);
    }
    @Test void previewsSavedBeforeTheReferenceTemplateRequireReupload() throws Exception {
        var bytes=workbook("[{\"skillId\":\"skill\"}]");
        var p=service.preview("modules.xlsx",bytes.length,new ByteArrayInputStream(bytes));
        stored.computeIfPresent(UUID.fromString(p.id()),(id,json)->json.replace(",\"moduleRef\":\"M1\"",""));
        assertTrue(service.validate(p.id()).errors().stream().anyMatch(e->e.reason().contains("template changed")));
        assertThrows(ModuleAuthoringService.Failure.class,()->service.commit(p.id(),true));
        verifyNoInteractions(authoring);
    }
}
