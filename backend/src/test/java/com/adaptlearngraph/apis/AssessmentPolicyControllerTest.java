package com.adaptlearngraph.apis;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.Pin;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.Saved;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.State;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.Values;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.Version;
import com.adaptlearngraph.helper.AssessmentPolicyJson;
import com.adaptlearngraph.helper.AssessmentPolicyMappings;
import com.adaptlearngraph.helper.ModelMapperFactory;
import com.adaptlearngraph.services.AssessmentPolicyApplicationService;
import com.adaptlearngraph.services.AssessmentPolicyUseCase;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** Saving a policy version returns 201 (200 on replay); invalid values are rejected before the use case. */
class AssessmentPolicyControllerTest {
    private static final String PATH = "/api/v1/ld/adaptive-baseline-policy";
    private static final UUID KEY = new UUID(0L, 9);

    private final AssessmentPolicyUseCase policies = mock(AssessmentPolicyUseCase.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new AssessmentPolicyController(
            new AssessmentPolicyApplicationService(policies, ModelMapperFactory.create(List.of(new AssessmentPolicyMappings()))),
            new AssessmentPolicyJson(new ObjectMapper()))).build();

    @Test
    void saveReturnsCreatedOrReplayedVersion() throws Exception {
        var values = new Values(0.3, 0.35, 0.5, 2.0);
        var version = new Version(new Pin(new UUID(0L, 1), new UUID(0L, 2), values.hash(), values), 3, new UUID(0L, 4),
                Instant.parse("2026-10-05T10:00:00Z"));
        when(policies.save(eq(KEY), eq(values))).thenReturn(new Saved(version, false), new Saved(version, true));
        String body = "{\"commandKey\":\"" + KEY + "\",\"stopSe\":0.3,\"highConfidenceSe\":0.35,\"mediumConfidenceSe\":0.5,\"k\":2.0}";

        mvc.perform(post(PATH + "/versions").contentType("application/json").content(body))
                .andExpect(status().isCreated())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.version.pin.values.k").value(2.0))
                .andExpect(jsonPath("$.version.version").value(3))
                .andExpect(jsonPath("$.noOp").value(false));
        mvc.perform(post(PATH + "/versions").contentType("application/json").content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.noOp").value(true));
    }

    @Test
    void invalidValuesAreRejectedBeforeSaving() throws Exception {
        mvc.perform(post(PATH + "/versions").contentType("application/json")
                        .content("{\"commandKey\":\"" + KEY + "\",\"stopSe\":0.3,\"highConfidenceSe\":0.5,\"mediumConfidenceSe\":0.4,\"k\":2.0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        verify(policies, never()).save(any(), any());
    }

    @Test
    void readReturnsTheActiveState() throws Exception {
        when(policies.read()).thenReturn(new State(null, 0));

        mvc.perform(get(PATH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activationRevision").value(0))
                .andExpect(jsonPath("$.active").isEmpty());
    }
}