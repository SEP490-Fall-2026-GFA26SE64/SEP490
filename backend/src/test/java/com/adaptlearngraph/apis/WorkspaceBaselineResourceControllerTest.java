package com.adaptlearngraph.apis;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.services.WorkspaceBaselineResourceUseCase;
import com.adaptlearngraph.services.WorkspaceBaselineResourceUseCase.Tuple;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** Eligibility outages keep the resource API's 503 envelope after translation in the business layer. */
class WorkspaceBaselineResourceControllerTest {
    private static final String PATH = "/api/v1/ld/adaptive-baseline-resources/job-positions/{jobPositionId}";

    private final WorkspaceBaselineResourceUseCase resources = mock(WorkspaceBaselineResourceUseCase.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(
            new WorkspaceBaselineResourceController(resources, new ObjectMapper())).build();

    @Test
    void eligibilityOutageIsAStable503() throws Exception {
        when(resources.read("jobPosition-java")).thenThrow(new AdaptiveBlueprintEligibilityPort.DependencyUnavailable("down", null));

        mvc.perform(get(PATH, "jobPosition-java"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(content().json("{\"code\":\"DEPENDENCY_UNAVAILABLE\"}", true));
    }

    @Test
    void configureReturnsTheProvisionedTuple() throws Exception {
        var desired = new Tuple(new UUID(0L, 1), new UUID(0L, 2), new UUID(0L, 3));
        when(resources.configure(eq("jobPosition-java"), eq(new Tuple(null, null, null)), eq(desired))).thenReturn(desired);

        mvc.perform(put(PATH, "jobPosition-java").contentType("application/json")
                        .content("{\"expected\":{\"bankId\":null,\"modelId\":null,\"mappingId\":null},\"desired\":{\"bankId\":\""
                                + desired.bankId() + "\",\"modelId\":\"" + desired.modelId() + "\",\"mappingId\":\""
                                + desired.mappingId() + "\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bankId").value(desired.bankId().toString()))
                .andExpect(jsonPath("$.mappingId").value(desired.mappingId().toString()));
    }
}