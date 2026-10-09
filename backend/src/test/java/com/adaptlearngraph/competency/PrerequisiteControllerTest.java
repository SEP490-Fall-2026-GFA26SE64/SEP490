package com.adaptlearngraph.competency;

import com.adaptlearngraph.competency.api.CreatePrerequisiteRequest;
import com.adaptlearngraph.competency.api.PrerequisiteController;
import com.adaptlearngraph.competency.application.port.in.CreatePrerequisiteCommand;
import com.adaptlearngraph.competency.application.port.in.ManagePrerequisiteUseCase;
import com.adaptlearngraph.competency.domain.PrerequisiteCycleException;
import com.adaptlearngraph.competency.domain.PrerequisiteEdge;
import com.adaptlearngraph.competency.domain.SkillStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PrerequisiteController.class)
@DisplayName("REQ-018-F02: Prerequisite HTTP Controller Tests")
class PrerequisiteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ManagePrerequisiteUseCase managePrerequisiteUseCase;

    @Test
    @WithMockUser
    @DisplayName("REQ-018-F02: GET /api/v1/organizations/{orgId}/prerequisites returns 200 OK")
    void listPrerequisitesReturns200() throws Exception {
        Instant now = Instant.now();
        PrerequisiteEdge edge = new PrerequisiteEdge(
                "s1", "JAVA_CORE", "Java Core",
                "s2", "SPRING_BOOT", "Spring Boot",
                0.60, SkillStatus.ACTIVE, now, now);

        when(managePrerequisiteUseCase.listPrerequisites("org-1")).thenReturn(List.of(edge));

        mockMvc.perform(get("/api/v1/organizations/org-1/prerequisites").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].sourceSkillCode").value("JAVA_CORE"))
                .andExpect(jsonPath("$[0].targetSkillCode").value("SPRING_BOOT"))
                .andExpect(jsonPath("$[0].minMastery").value(0.60));
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-018-F02: POST creates prerequisite edge for DOMAIN_EXPERT")
    void createPrerequisiteReturns201() throws Exception {
        Instant now = Instant.now();
        PrerequisiteEdge edge = new PrerequisiteEdge(
                "s1", "JAVA_CORE", "Java Core",
                "s2", "SPRING_BOOT", "Spring Boot",
                0.60, SkillStatus.ACTIVE, now, now);

        when(managePrerequisiteUseCase.createPrerequisite(any(CreatePrerequisiteCommand.class))).thenReturn(edge);

        CreatePrerequisiteRequest request = new CreatePrerequisiteRequest("s1", "s2", 0.60, SkillStatus.ACTIVE);

        mockMvc.perform(post("/api/v1/organizations/org-1/prerequisites")
                        .with(csrf())
                        .header("X-User-Role", "DOMAIN_EXPERT")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sourceSkillId").value("s1"))
                .andExpect(jsonPath("$.targetSkillId").value("s2"))
                .andExpect(jsonPath("$.minMastery").value(0.60));
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-018-F02: POST returns 400 Bad Request when cyclic dependency detected")
    void createPrerequisiteReturns400OnCycle() throws Exception {
        when(managePrerequisiteUseCase.createPrerequisite(any(CreatePrerequisiteCommand.class)))
                .thenThrow(new PrerequisiteCycleException("Cyclic dependency"));

        CreatePrerequisiteRequest request = new CreatePrerequisiteRequest("s1", "s2", 0.60, SkillStatus.ACTIVE);

        mockMvc.perform(post("/api/v1/organizations/org-1/prerequisites")
                        .with(csrf())
                        .header("X-User-Role", "DOMAIN_EXPERT")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cyclic dependency"));
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-018-F02: POST returns 403 Forbidden for non-expert caller")
    void createPrerequisiteReturns403ForLearner() throws Exception {
        CreatePrerequisiteRequest request = new CreatePrerequisiteRequest("s1", "s2", 0.60, SkillStatus.ACTIVE);

        mockMvc.perform(post("/api/v1/organizations/org-1/prerequisites")
                        .with(csrf())
                        .header("X-User-Role", "LEARNER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-018-F02: DELETE removes prerequisite edge and returns 204 No Content")
    void deletePrerequisiteReturns204() throws Exception {
        doNothing().when(managePrerequisiteUseCase).deletePrerequisite("org-1", "s1", "s2");

        mockMvc.perform(delete("/api/v1/organizations/org-1/prerequisites")
                        .with(csrf())
                        .header("X-User-Role", "DOMAIN_EXPERT")
                        .param("sourceSkillId", "s1")
                        .param("targetSkillId", "s2"))
                .andExpect(status().isNoContent());
    }
}
