package com.adaptlearngraph.catalog;

import com.adaptlearngraph.catalog.api.CreateTargetRoleRequest;
import com.adaptlearngraph.catalog.api.OrganizationTargetRoleController;
import com.adaptlearngraph.catalog.application.DuplicateTargetRoleException;
import com.adaptlearngraph.catalog.application.port.in.CreateTargetRoleCommand;
import com.adaptlearngraph.catalog.application.port.in.CreateTargetRoleUseCase;
import com.adaptlearngraph.catalog.application.port.in.ManageTargetRoleUseCase;
import com.adaptlearngraph.catalog.application.port.in.ViewTargetRolesUseCase;
import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;
import com.adaptlearngraph.catalog.domain.TargetRole;
import com.adaptlearngraph.catalog.domain.TargetRoleId;
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
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrganizationTargetRoleController.class)
@DisplayName("REQ-023-F01 & REQ-023-F02: TargetRole HTTP Controller Tests")
class TargetRoleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CreateTargetRoleUseCase createTargetRoleUseCase;

    @MockBean
    private ViewTargetRolesUseCase viewTargetRolesUseCase;

    @MockBean
    private ManageTargetRoleUseCase manageTargetRoleUseCase;


    @Test
    @WithMockUser
    @DisplayName("REQ-023-F01: POST /api/v1/organizations/{orgId}/target-roles returns 201 Created for LD_MANAGER")
    void createTargetRoleReturns201() throws Exception {
        UUID roleId = UUID.randomUUID();
        TargetRole createdRole = new TargetRole(
                new TargetRoleId(roleId),
                "org-1",
                "ROLE_BACKEND_P3",
                "Backend Engineer P3",
                "BACKEND",
                RoleTrack.PROFESSIONAL,
                "Backend role",
                RoleStatus.DRAFT,
                Instant.now(),
                Instant.now());

        when(createTargetRoleUseCase.createTargetRole(any(CreateTargetRoleCommand.class)))
                .thenReturn(createdRole);

        CreateTargetRoleRequest request = new CreateTargetRoleRequest(
                "ROLE_BACKEND_P3",
                "Backend Engineer P3",
                "BACKEND",
                "PROFESSIONAL",
                "Backend role");

        mockMvc.perform(post("/api/v1/organizations/org-1/target-roles")
                        .with(csrf())
                        .header("X-User-Role", "LD_MANAGER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(roleId.toString()))
                .andExpect(jsonPath("$.code").value("ROLE_BACKEND_P3"))
                .andExpect(jsonPath("$.name").value("Backend Engineer P3"))
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-023-F01: POST returns 409 Conflict when duplicate role code exists")
    void createTargetRoleReturns409WhenDuplicate() throws Exception {
        when(createTargetRoleUseCase.createTargetRole(any(CreateTargetRoleCommand.class)))
                .thenThrow(new DuplicateTargetRoleException("org-1", "ROLE_BACKEND_P3"));

        CreateTargetRoleRequest request = new CreateTargetRoleRequest(
                "ROLE_BACKEND_P3",
                "Backend Engineer P3",
                "BACKEND",
                "PROFESSIONAL",
                "Backend role");

        mockMvc.perform(post("/api/v1/organizations/org-1/target-roles")
                        .with(csrf())
                        .header("X-User-Role", "LD_MANAGER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROLE_BACKEND_P3"))
                .andExpect(jsonPath("$.organizationId").value("org-1"));
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-023-F01: POST returns 403 Forbidden when caller is not an L&D Manager or Admin")
    void createTargetRoleReturns403ForLearner() throws Exception {
        CreateTargetRoleRequest request = new CreateTargetRoleRequest(
                "ROLE_BACKEND_P3",
                "Backend Engineer P3",
                "BACKEND",
                "PROFESSIONAL",
                "Backend role");

        mockMvc.perform(post("/api/v1/organizations/org-1/target-roles")
                        .with(csrf())
                        .header("X-User-Role", "LEARNER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-023-F02: GET /api/v1/organizations/{orgId}/target-roles returns 200 OK list")
    void listTargetRolesReturns200() throws Exception {
        TargetRole role = new TargetRole(
                TargetRoleId.generate(),
                "org-1",
                "ROLE_DEV",
                "Developer",
                "DEV",
                RoleTrack.PROFESSIONAL,
                "Desc",
                RoleStatus.DRAFT,
                Instant.now(),
                Instant.now());

        when(viewTargetRolesUseCase.listTargetRoles(eq("org-1"), any()))
                .thenReturn(List.of(role));

        mockMvc.perform(get("/api/v1/organizations/org-1/target-roles")
                        .header("X-User-Role", "LD_MANAGER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("ROLE_DEV"))
                .andExpect(jsonPath("$[0].status").value("DRAFT"));
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-023-F03: PUT /api/v1/organizations/{orgId}/target-roles/{roleId} updates role and returns 200 OK")
    void updateTargetRoleReturns200() throws Exception {
        UUID roleId = UUID.randomUUID();
        TargetRole updatedRole = new TargetRole(
                new TargetRoleId(roleId),
                "org-1",
                "ROLE_CLOUD",
                "Updated Cloud Architect",
                "ICT",
                "CLOUD_DEVOPS",
                RoleTrack.MANAGEMENT,
                "expert-1",
                "Updated description",
                RoleStatus.DRAFT,
                Instant.now(),
                Instant.now());

        when(manageTargetRoleUseCase.updateTargetRole(any()))
                .thenReturn(Optional.of(updatedRole));

        com.adaptlearngraph.catalog.api.UpdateTargetRoleRequest request =
                new com.adaptlearngraph.catalog.api.UpdateTargetRoleRequest(
                        "Updated Cloud Architect",
                        "ICT",
                        "CLOUD_DEVOPS",
                        "MANAGEMENT",
                        "expert-1",
                        "Updated description");

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/organizations/org-1/target-roles/" + roleId)
                        .with(csrf())
                        .header("X-User-Role", "LD_MANAGER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Cloud Architect"))
                .andExpect(jsonPath("$.track").value("MANAGEMENT"))
                .andExpect(jsonPath("$.familyCode").value("CLOUD_DEVOPS"));
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-023-F03: PUT returns 403 Forbidden when caller is not an L&D Manager")
    void updateTargetRoleReturns403ForLearner() throws Exception {
        UUID roleId = UUID.randomUUID();
        com.adaptlearngraph.catalog.api.UpdateTargetRoleRequest request =
                new com.adaptlearngraph.catalog.api.UpdateTargetRoleRequest(
                        "Name", "ICT", "DEV", "PROFESSIONAL", "", "Desc");

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/organizations/org-1/target-roles/" + roleId)
                        .with(csrf())
                        .header("X-User-Role", "LEARNER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-023-F04: DELETE /api/v1/organizations/{orgId}/target-roles/{roleId} returns 204 No Content for LD_MANAGER")
    void deleteTargetRoleReturns204() throws Exception {
        UUID roleId = UUID.randomUUID();
        when(manageTargetRoleUseCase.deleteTargetRole(eq("org-1"), eq(new TargetRoleId(roleId))))
                .thenReturn(true);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/organizations/org-1/target-roles/" + roleId)
                        .with(csrf())
                        .header("X-User-Role", "LD_MANAGER"))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-023-F04: DELETE returns 403 Forbidden when caller is not an L&D Manager")
    void deleteTargetRoleReturns403ForLearner() throws Exception {
        UUID roleId = UUID.randomUUID();
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/organizations/org-1/target-roles/" + roleId)
                        .with(csrf())
                        .header("X-User-Role", "LEARNER"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-011-F01 & REQ-023-F05: GET single role returns 403 Forbidden if domain expert is not assigned")
    void getTargetRoleReturns403ForUnassignedExpert() throws Exception {
        UUID roleId = UUID.randomUUID();
        TargetRole role = new TargetRole(
                new TargetRoleId(roleId),
                "org-1",
                "ROLE_AI",
                "AI Spec",
                "AI",
                "AI_ML",
                RoleTrack.PROFESSIONAL,
                "expert-alpha",
                "Desc",
                RoleStatus.DRAFT,
                Instant.now(),
                Instant.now());

        when(viewTargetRolesUseCase.getTargetRole(eq("org-1"), eq(new TargetRoleId(roleId))))
                .thenReturn(Optional.of(role));

        // Authenticated as expert-beta, but role is assigned to expert-alpha
        mockMvc.perform(get("/api/v1/organizations/org-1/target-roles/" + roleId)
                        .header("X-User-Role", "DOMAIN_EXPERT")
                        .header("X-User-Id", "expert-beta"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-023-F03: PUT returns 200 OK when assigned Domain Expert updates/publishes role")
    void updateTargetRoleReturns200ForAssignedExpert() throws Exception {
        UUID roleId = UUID.randomUUID();
        TargetRole existingRole = new TargetRole(
                new TargetRoleId(roleId),
                "org-1",
                "ROLE_AI",
                "AI Spec",
                "AI",
                "AI_ML",
                RoleTrack.PROFESSIONAL,
                "expert-alpha",
                "Desc",
                RoleStatus.SENT,
                Instant.now(),
                Instant.now());

        TargetRole updatedRole = new TargetRole(
                new TargetRoleId(roleId),
                "org-1",
                "ROLE_AI",
                "AI Spec",
                "AI",
                "AI_ML",
                RoleTrack.PROFESSIONAL,
                "expert-alpha",
                "Desc",
                RoleStatus.ACTIVE,
                Instant.now(),
                Instant.now());

        when(viewTargetRolesUseCase.getTargetRole(eq("org-1"), eq(new TargetRoleId(roleId))))
                .thenReturn(Optional.of(existingRole));
        when(manageTargetRoleUseCase.updateTargetRole(any()))
                .thenReturn(Optional.of(updatedRole));

        com.adaptlearngraph.catalog.api.UpdateTargetRoleRequest request =
                new com.adaptlearngraph.catalog.api.UpdateTargetRoleRequest(
                        "AI Spec", "AI", "AI_ML", "PROFESSIONAL", "expert-alpha", "Desc", "ACTIVE");

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/organizations/org-1/target-roles/" + roleId)
                        .with(csrf())
                        .header("X-User-Role", "DOMAIN_EXPERT")
                        .header("X-User-Id", "expert-alpha")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-023-F03: PUT returns 403 Forbidden when Domain Expert is not assigned to the role")
    void updateTargetRoleReturns403ForUnassignedExpert() throws Exception {
        UUID roleId = UUID.randomUUID();
        TargetRole existingRole = new TargetRole(
                new TargetRoleId(roleId),
                "org-1",
                "ROLE_AI",
                "AI Spec",
                "AI",
                "AI_ML",
                RoleTrack.PROFESSIONAL,
                "expert-alpha",
                "Desc",
                RoleStatus.SENT,
                Instant.now(),
                Instant.now());

        when(viewTargetRolesUseCase.getTargetRole(eq("org-1"), eq(new TargetRoleId(roleId))))
                .thenReturn(Optional.of(existingRole));

        com.adaptlearngraph.catalog.api.UpdateTargetRoleRequest request =
                new com.adaptlearngraph.catalog.api.UpdateTargetRoleRequest(
                        "AI Spec", "AI", "AI_ML", "PROFESSIONAL", "expert-alpha", "Desc", "ACTIVE");

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/organizations/org-1/target-roles/" + roleId)
                        .with(csrf())
                        .header("X-User-Role", "DOMAIN_EXPERT")
                        .header("X-User-Id", "expert-beta")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-023-F05: Domain Expert can no longer reject target roles; PUT with REJECTED returns 400 Bad Request")
    void updateTargetRoleRejectionByExpertReturnsBadRequest() throws Exception {
        UUID roleId = UUID.randomUUID();
        TargetRole existingRole = new TargetRole(
                new TargetRoleId(roleId),
                "org-1",
                "ROLE_AI",
                "AI Spec",
                "AI",
                "AI_ML",
                RoleTrack.PROFESSIONAL,
                "expert-alpha",
                "Desc",
                RoleStatus.SENT,
                Instant.now(),
                Instant.now());

        when(viewTargetRolesUseCase.getTargetRole(eq("org-1"), eq(new TargetRoleId(roleId))))
                .thenReturn(Optional.of(existingRole));

        com.adaptlearngraph.catalog.api.UpdateTargetRoleRequest request =
                new com.adaptlearngraph.catalog.api.UpdateTargetRoleRequest(
                        "AI Spec", "AI", "AI_ML", "PROFESSIONAL", "expert-alpha", "Desc", "REJECTED", "1.0", List.of(), "Skill benchmark threshold too high for junior tier");

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/organizations/org-1/target-roles/" + roleId)
                        .with(csrf())
                        .header("X-User-Role", "DOMAIN_EXPERT")
                        .header("X-User-Id", "expert-alpha")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Domain Experts can no longer reject target roles"));
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-023-F05: Domain Expert can update micro-skills and save draft for an already REJECTED target role")
    void updateTargetRoleWhenAlreadyRejectedAllowsExpertSave() throws Exception {
        UUID roleId = UUID.randomUUID();
        TargetRole existingRole = new TargetRole(
                new TargetRoleId(roleId),
                "org-1",
                "ROLE_AI",
                "AI Spec",
                "AI",
                "AI_ML",
                RoleTrack.PROFESSIONAL,
                "expert-alpha",
                "Desc",
                RoleStatus.REJECTED,
                Instant.now(),
                Instant.now());

        when(viewTargetRolesUseCase.getTargetRole(eq("org-1"), eq(new TargetRoleId(roleId))))
                .thenReturn(Optional.of(existingRole));
        when(manageTargetRoleUseCase.updateTargetRole(any()))
                .thenReturn(Optional.of(existingRole));

        com.adaptlearngraph.catalog.api.UpdateTargetRoleRequest request =
                new com.adaptlearngraph.catalog.api.UpdateTargetRoleRequest(
                        "AI Spec", "AI", "AI_ML", "PROFESSIONAL", "expert-alpha", "Desc", "REJECTED", "1.0", List.of(java.util.Map.of("skillCode", "SKILL_01", "threshold", 80)), "Proposal Rejected: fresher missing skill");

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/organizations/org-1/target-roles/" + roleId)
                        .with(csrf())
                        .header("X-User-Role", "DOMAIN_EXPERT")
                        .header("X-User-Id", "expert-alpha")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-023-F01: POST returns 201 with seniority and responsibilities included")
    void createTargetRoleWithSeniorityAndResponsibilitiesReturns201() throws Exception {
        UUID roleId = UUID.randomUUID();
        TargetRole createdRole = new TargetRole(
                new TargetRoleId(roleId),
                "org-1",
                "ROLE_AI_P4",
                "AI Architect P4",
                "AI",
                "AI_ML",
                RoleTrack.PROFESSIONAL,
                com.adaptlearngraph.catalog.domain.Seniority.P4,
                "expert-chen",
                "Senior AI role",
                List.of("Design neural models", "Deploy graph ML"),
                RoleStatus.DRAFT,
                "1.0",
                "[]",
                Instant.now(),
                Instant.now(),
                null);

        when(createTargetRoleUseCase.createTargetRole(any(CreateTargetRoleCommand.class)))
                .thenReturn(createdRole);

        CreateTargetRoleRequest request = new CreateTargetRoleRequest(
                "ROLE_AI_P4",
                "AI Architect P4",
                "AI",
                "AI_ML",
                "PROFESSIONAL",
                "P4",
                "expert-chen",
                "Senior AI role",
                List.of("Design neural models", "Deploy graph ML"));

        mockMvc.perform(post("/api/v1/organizations/org-1/target-roles")
                        .with(csrf())
                        .header("X-User-Role", "LD_MANAGER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.seniority").value("P4"))
                .andExpect(jsonPath("$.responsibilities[0]").value("Design neural models"))
                .andExpect(jsonPath("$.responsibilities[1]").value("Deploy graph ML"));
    }

    @Test
    @WithMockUser
    @DisplayName("REQ-023-F01: POST returns 400 Bad Request when seniority does not match track")
    void createTargetRoleWithMismatchedSeniorityReturns400() throws Exception {
        CreateTargetRoleRequest request = new CreateTargetRoleRequest(
                "ROLE_INVALID",
                "Invalid Role",
                "ICT",
                "JAVA_BACKEND",
                "PROFESSIONAL",
                "M3",
                "expert-1",
                "Desc",
                List.of());

        mockMvc.perform(post("/api/v1/organizations/org-1/target-roles")
                        .with(csrf())
                        .header("X-User-Role", "LD_MANAGER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));
    }
}
