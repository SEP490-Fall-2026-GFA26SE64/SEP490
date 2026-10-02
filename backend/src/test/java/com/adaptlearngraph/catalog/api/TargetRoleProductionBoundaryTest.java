package com.adaptlearngraph.catalog.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.identity.infrastructure.SecurityConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(TargetRoleProductionBoundaryTest.DeniedTargetRoleEndpoint.class)
@Import(SecurityConfiguration.class)
@ActiveProfiles("starter")
class TargetRoleProductionBoundaryTest {
    @Autowired
    private MockMvc mvc;

    @Test
    void targetRoleRoutesRemainDeniedWithoutLocalProfileAndActorFlag() throws Exception {
        mvc.perform(get("/api/v1/employee/target-roles"))
                .andExpect(status().isUnauthorized());
    }

    @RestController
    static class DeniedTargetRoleEndpoint {
        @GetMapping("/api/v1/employee/target-roles")
        String list() {
            return "must not be reached";
        }
    }
}
