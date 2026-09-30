package com.adaptlearngraph.competency;

import com.adaptlearngraph.competency.api.CreateMicroSkillRequest;
import com.adaptlearngraph.competency.api.MicroSkillController;
import com.adaptlearngraph.competency.application.DuplicateMicroSkillException;
import com.adaptlearngraph.competency.application.port.in.CreateMicroSkillCommand;
import com.adaptlearngraph.competency.application.port.in.CreateMicroSkillUseCase;
import com.adaptlearngraph.competency.domain.MicroSkill;
import com.adaptlearngraph.competency.domain.MicroSkillId;
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
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MicroSkillController.class)
@DisplayName("REQ-012-F01: MicroSkill HTTP Controller Tests")
class MicroSkillControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CreateMicroSkillUseCase createMicroSkillUseCase;

    @Test
    @WithMockUser
    @DisplayName("REQ-012-F01: POST /api/v1/organizations/{orgId}/micro-skills returns 201 Created for DOMAIN_EXPERT")
    void createMicroSkillReturns201() throws Exception {
        UUID skillId = UUID.randomUUID();
        MicroSkill createdSkill = new MicroSkill(
                new MicroSkillId(skillId),
                "org-1",
                "GRAPH_DATABASE",
                "Graph Database",
                "Neo4j and graph concepts",
                "KNOWLEDGE",
                SkillStatus.ACTIVE,
                Instant.now(),
                Instant.now());

        when(createMicroSkillUseCase.createMicroSkill(any(CreateMicroSkillCommand.class)))
                .thenReturn(createdSkill);

        CreateMicroSkillRequest request = new CreateMicroSkillRequest(
                "GRAPH_DATABASE",
                "Graph Database",
                "Neo4j and graph concepts",
                "KNOWLEDGE");

        mockMvc.perform(post("/api/v1/organizations/org-1/micro-skills")
                        .with(csrf())
                        .header("X-User-Role", "DOMAIN_EXPERT")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(skillId.toString()))
                .andExpect(jsonPath("$.code").value("GRAPH_DATABASE"))
                .andExpect(jsonPath("$.name").value("Graph Database"))
                .andExpect(jsonPath("$.macroCompetencyCode").value("KNOWLEDGE"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-012-F01: POST returns 409 Conflict when duplicate skill code exists")
    void createMicroSkillReturns409WhenDuplicate() throws Exception {
        when(createMicroSkillUseCase.createMicroSkill(any(CreateMicroSkillCommand.class)))
                .thenThrow(new DuplicateMicroSkillException("org-1", "GRAPH_DATABASE"));

        CreateMicroSkillRequest request = new CreateMicroSkillRequest(
                "GRAPH_DATABASE",
                "Graph Database",
                "Neo4j and graph concepts",
                "KNOWLEDGE");

        mockMvc.perform(post("/api/v1/organizations/org-1/micro-skills")
                        .with(csrf())
                        .header("X-User-Role", "DOMAIN_EXPERT")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("GRAPH_DATABASE"))
                .andExpect(jsonPath("$.organizationId").value("org-1"));
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-012-F01: POST returns 403 Forbidden when caller is not a DOMAIN_EXPERT")
    void createMicroSkillReturns403ForLearner() throws Exception {
        CreateMicroSkillRequest request = new CreateMicroSkillRequest(
                "GRAPH_DATABASE",
                "Graph Database",
                "Neo4j and graph concepts",
                "KNOWLEDGE");

        mockMvc.perform(post("/api/v1/organizations/org-1/micro-skills")
                        .with(csrf())
                        .header("X-User-Role", "LEARNER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
}
