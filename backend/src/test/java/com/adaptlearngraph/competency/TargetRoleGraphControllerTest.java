package com.adaptlearngraph.competency;

import com.adaptlearngraph.competency.api.TargetRoleGraphController;
import com.adaptlearngraph.competency.application.port.in.GetTargetRoleGraphUseCase;
import com.adaptlearngraph.competency.domain.PrerequisiteEdge;
import com.adaptlearngraph.competency.domain.RoleGraphSkill;
import com.adaptlearngraph.competency.domain.SkillStatus;
import com.adaptlearngraph.competency.domain.TargetRoleGraph;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TargetRoleGraphController.class)
@DisplayName("REQ-018-F01: Target Role Graph HTTP Controller Tests")
class TargetRoleGraphControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GetTargetRoleGraphUseCase getTargetRoleGraphUseCase;

    @Test
    @WithMockUser
    @DisplayName("REQ-018-F01: GET target role graph returns 200 with all architectural fields")
    void getTargetRoleGraphReturns200() throws Exception {
        Instant now = Instant.now();
        RoleGraphSkill s1 = new RoleGraphSkill("s1", "JAVA_CORE", "Java Core", "macro-1", 0.70, SkillStatus.ACTIVE);
        RoleGraphSkill s2 = new RoleGraphSkill("s2", "SPRING_BOOT", "Spring Boot", "macro-1", 0.80, SkillStatus.ACTIVE);
        PrerequisiteEdge edge = new PrerequisiteEdge("s1", "JAVA_CORE", "Java Core", "s2", "SPRING_BOOT", "Spring Boot", 0.60, SkillStatus.ACTIVE, now, now);

        TargetRoleGraph graph = new TargetRoleGraph(
                "role-1", "BACKEND_DEV", "Backend Developer", "Engineering",
                "SENIOR", "DRAFT", List.of(s1, s2), List.of(edge)
        );

        when(getTargetRoleGraphUseCase.getTargetRoleGraph("org-1", "role-1")).thenReturn(Optional.of(graph));

        mockMvc.perform(get("/api/v1/organizations/org-1/target-roles/role-1/graph").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roleId").value("role-1"))
                .andExpect(jsonPath("$.roleCode").value("BACKEND_DEV"))
                .andExpect(jsonPath("$.roleName").value("Backend Developer"))
                .andExpect(jsonPath("$.track").value("Engineering"))
                .andExpect(jsonPath("$.seniority").value("SENIOR"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.requiredSkills[0].skillId").value("s1"))
                .andExpect(jsonPath("$.requiredSkills[0].targetMastery").value(0.70))
                .andExpect(jsonPath("$.prerequisites[0].sourceSkillId").value("s1"))
                .andExpect(jsonPath("$.prerequisites[0].targetSkillId").value("s2"))
                .andExpect(jsonPath("$.prerequisites[0].minMastery").value(0.60));
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-018-F01: GET target role graph returns 404 when role not found")
    void getTargetRoleGraphReturns404() throws Exception {
        when(getTargetRoleGraphUseCase.getTargetRoleGraph("org-1", "unknown-role")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/organizations/org-1/target-roles/unknown-role/graph").with(csrf()))
                .andExpect(status().isNotFound());
    }
}
