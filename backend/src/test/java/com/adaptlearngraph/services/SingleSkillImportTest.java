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
    ExcelLearningImport service;
    @BeforeEach void setup() {
        when(modules.actor()).thenReturn(new Actor("expert","org",Set.of("EXPERT")));
        when(modules.catalog("MicroSkill")).thenReturn(List.of(new Choice("skill","SQL")));
        when(content.limits()).thenReturn(new Limits(1048576,1024,1048576,1,null,null));
        doAnswer(c->{var entity=c.<LearningImportEntity>getArgument(0);stored.put(entity.getId(),entity.getDocument());return null;}).when(imports).insert(any());
        when(imports.document(any(),eq("org"),eq("expert"))).thenAnswer(c->List.of(stored.get(c.getArgument(0))));
        service=new ExcelLearningImport(modules,content,mock(LearningAssetPort.class),mock(ModuleAuthoringService.class),imports,new ObjectMapper());
    }
    byte[] workbook(String mapping)throws Exception {
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(service.template()));var out=new ByteArrayOutputStream()) {
            book.getSheet("Modules").getRow(1).getCell(5).setCellValue(mapping);
            book.write(out);return out.toByteArray();
        }
    }
    @Test void downloadedTemplateAndImportUseOneSkillWithoutRetiredFields()throws Exception {
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(service.template()))) {
            String example=book.getSheet("Modules").getRow(1).getCell(5).getStringCellValue();
            assertEquals("[{\"skillId\":\"REPLACE_SKILL_ID\"}]",example);
        }
        byte[] bytes=workbook("[{\"skillId\":\"skill\"}]");
        var preview=service.preview("modules.xlsx",bytes.length,new ByteArrayInputStream(bytes));
        assertTrue(preview.errors().isEmpty(),preview.errors().toString());assertEquals(1,preview.modules().size());
        assertEquals("skill",preview.modules().getFirst().module().teachings().getFirst().skillId());
    }
    @Test void multiSkillImportIsRejectedBeforeAnyModuleMutation()throws Exception {
        byte[] bytes=workbook("[{\"skillId\":\"skill\"},{\"skillId\":\"second\"}]");
        var preview=service.preview("modules.xlsx",bytes.length,new ByteArrayInputStream(bytes));
        assertFalse(preview.errors().isEmpty());verify(modules,never()).save(any());verify(modules,never()).saveContent(anyString(),any());
    }
}
