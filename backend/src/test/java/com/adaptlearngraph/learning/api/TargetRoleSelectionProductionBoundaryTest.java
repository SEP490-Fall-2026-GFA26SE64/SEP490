package com.adaptlearngraph.learning.api;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.identity.infrastructure.SecurityConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(TargetRoleSelectionProductionBoundaryTest.DeniedSelectionEndpoint.class)
@Import(SecurityConfiguration.class)
@ActiveProfiles("starter")
class TargetRoleSelectionProductionBoundaryTest {
    @Autowired
    private MockMvc mvc;

    @Test
    void selectionGetAndPutRemainDeniedWithoutLocalProfileAndActorFlag() throws Exception {
        mvc.perform(get("/api/v1/employee/target-role-selection"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/employee/target-role-selection")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @RestController
    @RequestMapping("/api/v1/employee/target-role-selection")
    static class DeniedSelectionEndpoint {
        @GetMapping
        String current() {
            return "must not be reached";
        }

        @PutMapping
        String choose() {
            return "must not be reached";
        }
    }
}
