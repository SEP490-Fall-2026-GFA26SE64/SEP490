package com.adaptlearngraph.assessment.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import com.adaptlearngraph.identity.infrastructure.SecurityConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(BaselineBlueprintProductionBoundaryTest.DeniedBaselineEndpoint.class)
@Import(SecurityConfiguration.class)
@ActiveProfiles("starter")
class BaselineBlueprintProductionBoundaryTest {
    @Autowired
    private MockMvc mvc;

    @Test
    void baselineAuthoringRouteRemainsDeniedOutsideLocalProfile() throws Exception {
        mvc.perform(post("/api/v1/ld/baseline-blueprints")
                        .with(csrf())
                        .header("Idempotency-Key", "must-not-reach-controller"))
                .andExpect(status().isUnauthorized());
    }

    @RestController
    static class DeniedBaselineEndpoint {
        @PostMapping("/api/v1/ld/baseline-blueprints")
        String create() {
            return "must not be reached";
        }
    }
}
