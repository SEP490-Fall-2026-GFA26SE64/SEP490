package com.adaptlearngraph.evaluation;

import com.adaptlearngraph.evaluation.api.ResearchController;
import com.adaptlearngraph.evaluation.application.ResearchService;
import com.adaptlearngraph.identity.infrastructure.ResearchSecurityConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.mockito.Mockito.*;

@WebMvcTest(controllers=ResearchController.class,properties="research.enabled=true")
@ActiveProfiles("local")
@Import(ResearchSecurityConfiguration.class)
class LocalResearchSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean ResearchService service;

    @Test void portalContextAndRealCsrfCookieSupportPollingThenMutation() throws Exception {
        var response=mvc.perform(get("/api/v1/admin/research/session").header("X-User-Id","admin@portal.local")
            .header("X-User-Role","ADMIN")).andExpect(status().isOk()).andReturn().getResponse();
        var json=new com.fasterxml.jackson.databind.ObjectMapper().readTree(response.getContentAsString());
        var cookie=response.getCookie("XSRF-TOKEN");
        org.junit.jupiter.api.Assertions.assertNotNull(cookie);
        var poll=mvc.perform(get("/api/v1/admin/research/runs").header("X-User-Id","admin@portal.local")
            .header("X-User-Role","ADMIN").cookie(cookie)).andExpect(status().isOk()).andReturn().getResponse();
        org.junit.jupiter.api.Assertions.assertNull(poll.getCookie("XSRF-TOKEN"));
        mvc.perform(post("/api/v1/admin/research/runs").header("X-User-Id","admin@portal.local")
            .header("X-User-Role","ADMIN").cookie(cookie)
            .header(json.get("csrfHeader").asText(),json.get("csrfToken").asText())
            .contentType("application/json").content("{\"seed\":42,\"sizes\":[1000]}"))
            .andExpect(status().isAccepted());
        verify(service).start("admin@portal.local",42L,java.util.List.of(1000),1000);
    }

    @Test void missingContextOtherRolesAndMissingCsrfAreDenied() throws Exception {
        mvc.perform(get("/api/v1/admin/research/runs")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/research/runs").header("X-User-Role","ADMIN"))
            .andExpect(status().isUnauthorized());
        for(String role:java.util.List.of("EMPLOYEE","DOMAIN_EXPERT","LD_MANAGER"))
            mvc.perform(get("/api/v1/admin/research/runs").header("X-User-Id","other").header("X-User-Role",role))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/research/runs").with(user("employee").roles("EMPLOYEE"))
            .header("X-User-Id","spoof").header("X-User-Role","ADMIN")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/research/runs").header("X-User-Id","admin@portal.local")
            .header("X-User-Role","ADMIN").contentType("application/json").content("{\"seed\":42,\"sizes\":[1000]}"))
            .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
}
