package com.adaptlearngraph.services;

import com.adaptlearngraph.apis.LearningContentController;
import com.adaptlearngraph.helper.*;
import com.adaptlearngraph.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ModuleZipImportApiTest {
    @Test void downloadAdvertisesZipAndMultipartErrorsRetainReferenceAndRow()throws Exception {
        var importer=mock(LearningImportUseCase.class);byte[] bytes={80,75,3,4};when(importer.template()).thenReturn(bytes);
        when(importer.preview(eq("module.zip"),eq(4L),any())).thenReturn(new LearningImportUseCase.Preview("preview",List.of(),List.of(new LearningImportUseCase.Problem("M1",3,"Missing lesson/example.docx")),List.of(),false));
        var app=new LearningContentApplicationService(mock(LearningContentService.class),mock(ModuleAuthoringPort.class),mock(LearningAssetPort.class),importer,ModelMapperFactory.create(List.of(new ModuleAuthoringMappings(),new LearningContentMappings())));
        var mvc=MockMvcBuilders.standaloneSetup(new LearningContentController(app)).build();
        mvc.perform(get("/api/v1/module-management/imports/template")).andExpect(status().isOk()).andExpect(content().contentType("application/zip"))
                .andExpect(header().string("Content-Disposition",org.hamcrest.Matchers.containsString("module-template.zip"))).andExpect(content().bytes(bytes));
        mvc.perform(multipart("/api/v1/module-management/imports").file(new MockMultipartFile("file","module.zip","application/zip",bytes)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.errors[0].moduleId").value("M1")).andExpect(jsonPath("$.errors[0].row").value(3));
        verify(importer).preview(eq("module.zip"),eq(4L),any());
        when(importer.template()).thenThrow(new ModuleAuthoringService.Failure(403,"Expert import required"));
        mvc.perform(get("/api/v1/module-management/imports/template")).andExpect(status().isForbidden());
    }
}
