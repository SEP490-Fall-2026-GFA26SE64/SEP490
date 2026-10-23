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
@ActiveProfiles("test")
@Import(ResearchSecurityConfiguration.class)
class ResearchSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean ResearchService service;

    @Test void usesExistingAdminPrincipalWithoutAnotherLogin() throws Exception {
        mvc.perform(get("/api/v1/admin/research/session").with(user("portal-admin").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.username").value("portal-admin"));
        mvc.perform(post("/api/v1/admin/research/runs").with(user("portal-admin").roles("ADMIN")).with(csrf())
            .contentType("application/json").content("{\"seed\":42,\"sizes\":[1000]}"))
            .andExpect(status().isAccepted());
        verify(service).start("portal-admin",42L,java.util.List.of(1000),1000);
    }

    @Test void rejectsAnonymousOtherRolesAndSpoofedHeadersOutsideLocal() throws Exception {
        mvc.perform(get("/api/v1/admin/research/runs")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/research/runs").with(user("employee").roles("EMPLOYEE")))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/research/runs").header("X-User-Id","spoof").header("X-User-Role","ADMIN"))
            .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/research/runs").with(user("employee").roles("EMPLOYEE"))
            .header("X-User-Id","spoof").header("X-User-Role","ADMIN")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/research/runs").with(user("admin").roles("ADMIN"))
            .contentType("application/json").content("{\"seed\":42,\"sizes\":[1000]}"))
            .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
    @Test void acceptsCustomCountAndRejectsNonIntegerPayloads() throws Exception {
        mvc.perform(post("/api/v1/admin/research/runs").with(user("admin").roles("ADMIN")).with(csrf())
            .contentType("application/json").content("{\"seed\":42,\"sizes\":[1000],\"iterations\":37}"))
            .andExpect(status().isAccepted());
        verify(service).start("admin",42L,java.util.List.of(1000),37);
        for(String value:java.util.List.of("1.5","null","\"1000\"","2147483648"))
            mvc.perform(post("/api/v1/admin/research/runs").with(user("admin").roles("ADMIN")).with(csrf())
                .contentType("application/json").content("{\"seed\":42,\"sizes\":[1000],\"iterations\":"+value+"}"))
                .andExpect(status().isBadRequest());
        verifyNoMoreInteractions(service);
    }

    @Test void acceptsStudyAndRejectsMixedOrFractionalConfiguration()throws Exception {
        mvc.perform(post("/api/v1/admin/research/runs").with(user("admin").roles("ADMIN")).with(csrf()).contentType("application/json")
            .content("{\"seeds\":[1,2],\"sizes\":[1000],\"pairsPerHop\":7,\"rounds\":3}")).andExpect(status().isAccepted());
        verify(service).startStudy("admin",java.util.List.of(1L,2L),java.util.List.of(1000),7,3);
        for(String body:java.util.List.of("{\"seeds\":[1],\"seed\":1}","{\"seeds\":[1.5],\"sizes\":[1000],\"pairsPerHop\":7,\"rounds\":3}","{\"seeds\":[1],\"sizes\":[1000],\"pairsPerHop\":7,\"rounds\":null}"))
            mvc.perform(post("/api/v1/admin/research/runs").with(user("admin").roles("ADMIN")).with(csrf()).contentType("application/json").content(body)).andExpect(status().isBadRequest());
        verifyNoMoreInteractions(service);
    }

}
