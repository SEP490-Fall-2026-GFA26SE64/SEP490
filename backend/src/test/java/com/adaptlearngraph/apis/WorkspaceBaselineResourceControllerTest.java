package com.adaptlearngraph.apis;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.services.WorkspaceBaselineResourceUseCase;
import com.adaptlearngraph.services.WorkspaceBaselineResourceUseCase.Tuple;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** Retained IRT helpers remain testable but are no longer registered as HTTP controllers. */
@SuppressWarnings("deprecation")
class WorkspaceBaselineResourceControllerTest {
    private final WorkspaceBaselineResourceUseCase resources = mock(WorkspaceBaselineResourceUseCase.class);
    private final WorkspaceBaselineResourceController retained = new WorkspaceBaselineResourceController(resources, new ObjectMapper());

    @Test
    void retiredResourceRouteIsNotExposed() throws Exception {
        MockMvcBuilders.standaloneSetup(retained).build()
                .perform(get("/api/v1/ld/adaptive-baseline-resources/job-positions/jobPosition-java"))
                .andExpect(status().isNotFound());
        verifyNoInteractions(resources);
    }

    @Test
    void retainedHelperMapsEligibilityOutageToStable503() {
        when(resources.read("jobPosition-java")).thenThrow(new AdaptiveBlueprintEligibilityPort.DependencyUnavailable("down", null));
        var failure = assertThrows(WorkspaceBaselineResourceUseCase.Failure.class, () -> retained.read("jobPosition-java"));
        var response = retained.failure(failure);
        assertEquals(503, response.getStatusCode().value());
        assertEquals("no-store", response.getHeaders().getCacheControl());
        assertEquals("DEPENDENCY_UNAVAILABLE", response.getBody().get("code"));
    }

    @Test
    void retainedHelperParsesTheExactProvisioningTuple() {
        var desired = new Tuple(new UUID(0L, 1), new UUID(0L, 2), new UUID(0L, 3));
        when(resources.configure(eq("jobPosition-java"), eq(new Tuple(null, null, null)), eq(desired))).thenReturn(desired);
        var response = retained.configure("jobPosition-java", "{\"expected\":{\"bankId\":null,\"modelId\":null,\"mappingId\":null},\"desired\":{\"bankId\":\""
                + desired.bankId() + "\",\"modelId\":\"" + desired.modelId() + "\",\"mappingId\":\"" + desired.mappingId() + "\"}}");
        assertEquals(200, response.getStatusCode().value());
        assertEquals(desired, response.getBody());
    }
}
