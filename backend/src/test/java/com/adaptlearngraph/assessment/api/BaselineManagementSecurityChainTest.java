package com.adaptlearngraph.assessment.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.identity.infrastructure.LocalCatalogSecurityConfiguration;
import com.adaptlearngraph.identity.infrastructure.SecurityConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;

/** Exercises local and default deny-all chains together, including local CSRF routing. */
@WebMvcTest(BaselineManagementSecurityChainTest.ManagementEndpoint.class)
@Import({ LocalCatalogSecurityConfiguration.class, SecurityConfiguration.class,
        BaselineManagementSecurityChainTest.ManagementEndpoint.class })
@ActiveProfiles("local")
class BaselineManagementSecurityChainTest {
    @Autowired private MockMvc mvc;

    @Test
    void localManagementGetPostAndPutReachTheirControllerWithoutCsrfToken() throws Exception {
        mvc.perform(get("/api/v1/ld/baseline-assessments"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/ld/baseline-assessments/occupations/occ/blueprint-working-revisions"))
                .andExpect(status().isOk());
        mvc.perform(put("/api/v1/ld/baseline-assessments/occupations/occ/blueprint-working-revisions/working"))
                .andExpect(status().isOk());
    }

    @RestController
    static class ManagementEndpoint {
        @GetMapping("/api/v1/ld/baseline-assessments")
        String list() { return "reachable"; }

        @PostMapping("/api/v1/ld/baseline-assessments/occupations/{occupationId}/blueprint-working-revisions")
        String create() { return "reachable"; }

        @PutMapping("/api/v1/ld/baseline-assessments/occupations/{occupationId}/blueprint-working-revisions/{workingId}")
        String save() { return "reachable"; }
    }
}
