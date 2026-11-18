package com.adaptlearngraph.apis;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.adaptlearngraph.entities.domain.RuleAssessment.Purpose;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import com.adaptlearngraph.services.ScopedAssessmentPolicyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** The current policy API is scoped by purpose and catalog key; request decoding follows authorization. */
class AssessmentPolicyControllerTest {
    private static final String PATH = "/api/v1/assessment-policies/BASELINE/scopes/role-junior";
    private static final UUID KEY = new UUID(0L, 9);
    private final ScopedAssessmentPolicyService policies = mock(ScopedAssessmentPolicyService.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new AssessmentPolicyController(
            policies, new ObjectMapper().findAndRegisterModules())).build();

    private ScopedAssessmentPolicyService.Workspace workspace() {
        return new ScopedAssessmentPolicyService.Workspace(null, null, null, 3, List.of(), 0,
                List.of(), 100, List.of(), 0, List.of());
    }

    @Test
    void createDraftReturnsScopedWorkspaceAndReplaysTheSameCommand() throws Exception {
        when(policies.createHttp(eq("BASELINE"), eq("role-junior"), any())).thenReturn(workspace());
        String body = "{\"commandKey\":\"" + KEY + "\",\"expectedActivationRevision\":3}";
        for (int attempt = 0; attempt < 2; attempt++) {
            mvc.perform(post(PATH + "/draft").contentType("application/json").content(body))
                    .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                    .andExpect(jsonPath("$.activationRevision").value(3));
        }
        verify(policies, times(2)).createHttp("BASELINE", "role-junior", new ScopedAssessmentPolicyService.Create(KEY, 3));
    }

    @Test
    void rejectsMissingUnknownAndFractionalFieldsBeforeCreating() throws Exception {
        for (String body : List.of("{}", "{\"commandKey\":\"" + KEY + "\",\"expectedActivationRevision\":1.5}",
                "{\"commandKey\":\"" + KEY + "\",\"expectedActivationRevision\":3,\"organizationId\":\"spoof\"}")) {
            mvc.perform(post(PATH + "/draft").contentType("application/json").content(body))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        }
        verify(policies, never()).createHttp(any(), anyString(), any());
    }

    @Test
    void checksAuthorizationBeforeDecodingInvalidInput() throws Exception {
        doThrow(new Failure(403, "FORBIDDEN")).when(policies).authorizeHttp("BASELINE");
        mvc.perform(post(PATH + "/draft").contentType("application/json").content("not json"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        verify(policies, never()).createHttp(any(), anyString(), any());
    }

    @Test
    void readsTheRequestedScopeWithoutCaching() throws Exception {
        when(policies.readHttp("BASELINE", "role-junior", 0, 20)).thenReturn(workspace());
        mvc.perform(get(PATH)).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.activationRevision").value(3)).andExpect(jsonPath("$.active").isEmpty());
    }
}
