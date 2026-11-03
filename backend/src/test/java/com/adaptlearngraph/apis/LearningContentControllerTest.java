package com.adaptlearngraph.apis;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.entities.domain.LearningResources.Asset;
import com.adaptlearngraph.entities.domain.LearningResources.Limits;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Actor;
import com.adaptlearngraph.helper.LearningContentMappings;
import com.adaptlearngraph.helper.ModelMapperFactory;
import com.adaptlearngraph.helper.ModuleAuthoringMappings;
import com.adaptlearngraph.repository.LearningAssetPort;
import com.adaptlearngraph.repository.ModuleAuthoringPort;
import com.adaptlearngraph.services.LearningContentApplicationService;
import com.adaptlearngraph.services.LearningContentService;
import com.adaptlearngraph.services.LearningImportUseCase;
import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** Upload, streaming and settings endpoints keep their contract behind the learning content application service. */
class LearningContentControllerTest {
    private static final String PATH = "/api/v1/module-management";

    private final LearningContentService service = mock(LearningContentService.class);
    private final ModuleAuthoringPort modules = mock(ModuleAuthoringPort.class);
    private final LearningAssetPort files = mock(LearningAssetPort.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new LearningContentController(new LearningContentApplicationService(
            service, modules, files, mock(LearningImportUseCase.class),
            ModelMapperFactory.create(List.of(new ModuleAuthoringMappings(), new LearningContentMappings()))))).build();

    @Test
    void settingsChangeNeverBindsAuditIdentityFromTheBody() throws Exception {
        when(service.limits(any())).thenReturn(new Limits(104857600, 2097152, 104857600, 4, "admin-1", "2026-10-02T00:00:00Z"));

        mvc.perform(put(PATH + "/upload-settings").contentType("application/json")
                        .content("{\"videoBytes\":104857600,\"imageBytes\":2097152,\"zipBytes\":104857600,\"version\":3,"
                                + "\"changedBy\":\"forged\",\"changedAt\":\"2000-01-01T00:00:00Z\"}"))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"videoBytes\":104857600,\"imageBytes\":2097152,\"zipBytes\":104857600,"
                        + "\"version\":4,\"changedBy\":\"admin-1\",\"changedAt\":\"2026-10-02T00:00:00Z\"}", true));
        verify(service).limits(new Limits(104857600, 2097152, 104857600, 3, null, null));

        mvc.perform(put(PATH + "/upload-settings").contentType("application/json")
                        .content("{\"videoBytes\":1,\"imageBytes\":1,\"zipBytes\":1,\"version\":3}"))
                .andExpect(status().isBadRequest());
        verify(service, never()).limits(argThat(limits -> limits.videoBytes() == 1));
    }

    @Test
    void uploadRequiresAnExpertBeforeReadingTheFile() throws Exception {
        when(modules.actor()).thenReturn(new Actor("manager-1", "org-1", Set.of("LD_MANAGER")));

        mvc.perform(multipart(PATH + "/assets").file(new MockMultipartFile("file", "a.png", "image/png", new byte[] {1})))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Expert upload required"));
        verifyNoInteractions(files);
    }

    @Test
    void expertUploadReturnsTheEstablishedAssetShape() throws Exception {
        when(modules.actor()).thenReturn(new Actor("expert-1", "org-1", Set.of("EXPERT")));
        when(files.upload(eq("org-1"), eq("expert-1"), eq("a.png"), eq(1L), any())).thenReturn(asset());

        mvc.perform(multipart(PATH + "/assets").file(new MockMultipartFile("file", "a.png", "image/png", new byte[] {1})))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"id\":\"asset-1\",\"organizationId\":\"org-1\",\"createdBy\":\"expert-1\","
                        + "\"objectKey\":\"org-1/asset-1\",\"filename\":\"a.png\",\"mediaType\":\"image/png\",\"byteSize\":10,"
                        + "\"sha256\":\"" + "e".repeat(64) + "\",\"durationSeconds\":null,\"createdAt\":\"2026-10-01T00:00:00Z\"}", true));
    }

    @Test
    void assetStreamingHonoursRanges() throws Exception {
        when(service.accessibleAsset("asset-1")).thenReturn(asset());
        when(files.open(asset(), 2, 3)).thenReturn(new ByteArrayInputStream(new byte[] {7, 8, 9}));

        var result = mvc.perform(get(PATH + "/assets/asset-1").header("Range", "bytes=2-4")).andReturn();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch(result))
                .andExpect(status().isPartialContent())
                .andExpect(header().string("Content-Range", "bytes 2-4/10"))
                .andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(content().bytes(new byte[] {7, 8, 9}));

        mvc.perform(get(PATH + "/assets/asset-1").header("Range", "bytes=20-"))
                .andExpect(status().isRequestedRangeNotSatisfiable())
                .andExpect(header().string("Content-Range", "bytes */10"));
    }

    private static Asset asset() {
        return new Asset("asset-1", "org-1", "expert-1", "org-1/asset-1", "a.png", "image/png", 10, "e".repeat(64), null,
                "2026-10-01T00:00:00Z");
    }
}