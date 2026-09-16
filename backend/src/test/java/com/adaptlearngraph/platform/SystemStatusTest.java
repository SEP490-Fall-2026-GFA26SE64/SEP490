package com.adaptlearngraph.platform;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.platform.application.SystemStatusService;
import com.adaptlearngraph.platform.domain.SystemStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("starter")
class SystemStatusTest {
    @Autowired
    private MockMvc mvc;

    @Test
    void servesScaffoldStatusWithoutDatabases() throws Exception {
        mvc.perform(get("/api/v1/system/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.application").value("adapt-learn-graph"))
                .andExpect(jsonPath("$.stage").value("SCAFFOLD"));
    }

    @Test
    void deniesUnimplementedBusinessEndpoints() throws Exception {
        mvc.perform(get("/api/v1/me/profile")).andExpect(status().isUnauthorized());
    }

    @Test
    void retainsCsrfProtection() throws Exception {
        mvc.perform(post("/api/v1/system/status")).andExpect(status().isForbidden());
    }

    @Test
    void applicationServiceWorksWithoutSpring() {
        var expected = new SystemStatus("test", "test-version", "SCAFFOLD");
        var service = new SystemStatusService(() -> expected);
        assertThat(service.getStatus()).isEqualTo(expected);
    }
}