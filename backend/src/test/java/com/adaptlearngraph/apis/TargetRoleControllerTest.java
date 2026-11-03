package com.adaptlearngraph.apis;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.exception.TargetRoleQueryException;
import com.adaptlearngraph.exception.TargetRoleQueryException.Code;
import com.adaptlearngraph.services.TargetRoleQueryUseCase;
import com.adaptlearngraph.entities.domain.CareerTrack;
import com.adaptlearngraph.entities.domain.TargetRoleDetail;
import com.adaptlearngraph.entities.domain.TargetRoleRequirement;
import com.adaptlearngraph.entities.domain.TargetRoleSummary;
import com.adaptlearngraph.config.LocalCatalogSecurityConfiguration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TargetRoleController.class)
@Import(LocalCatalogSecurityConfiguration.class)
@ActiveProfiles("local")
@TestPropertySource(properties = "catalog.local-actor.enabled=true")
class TargetRoleControllerTest {
    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private TargetRoleQueryUseCase queries;

    @Test
    void returnsListContractAndForwardsOnlyDiscoveryCriteria() throws Exception {
        when(queries.listTargetRoles(" Java ")).thenReturn(List.of(summary()));

        mvc.perform(get("/api/v1/employee/target-roles")
                        .param("search", " Java ")
                        .param("organizationId", "untrusted-org"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("role-1"))
                .andExpect(jsonPath("$[0].track").value("PROFESSIONAL"))
                .andExpect(jsonPath("$[0].requirementCount").value(1));

        verify(queries).listTargetRoles(" Java ");
    }

    @Test
    void returnsDetailContract() throws Exception {
        when(queries.getTargetRole("role-1")).thenReturn(detail());

        mvc.perform(get("/api/v1/employee/target-roles/role-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.familyCode").value("JAVA"))
                .andExpect(jsonPath("$.responsibilities[0]").value("Build APIs"))
                .andExpect(jsonPath("$.requirements[0].skillCode").value("JAVA"))
                .andExpect(jsonPath("$.requirements[0].targetMastery").value(0.7));
    }

    @Test
    void mapsUnavailableAndDependencyFailuresWithoutLeakingCatalogDetails() throws Exception {
        when(queries.getTargetRole("hidden-role")).thenThrow(
                new TargetRoleQueryException(Code.ROLE_NOT_AVAILABLE, "Target role is not available"));
        when(queries.listTargetRoles(null)).thenThrow(
                new TargetRoleQueryException(Code.CATALOG_UNAVAILABLE, "Target-role catalog is unavailable"));

        mvc.perform(get("/api/v1/employee/target-roles/hidden-role"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ROLE_NOT_AVAILABLE"));
        mvc.perform(get("/api/v1/employee/target-roles"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("CATALOG_UNAVAILABLE"));
    }

    @Test
    void mapsActorFailuresToUnauthorizedAndForbidden() throws Exception {
        when(queries.listTargetRoles(null))
                .thenThrow(new TargetRoleQueryException(Code.UNAUTHENTICATED, "Authentication is required"))
                .thenThrow(new TargetRoleQueryException(Code.FORBIDDEN, "Active employee is required"));

        mvc.perform(get("/api/v1/employee/target-roles"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        mvc.perform(get("/api/v1/employee/target-roles"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void localSecurityAllowsOnlyGetForTargetRoleRoutes() throws Exception {
        when(queries.listTargetRoles(null)).thenReturn(List.of());

        mvc.perform(get("/api/v1/employee/target-roles")).andExpect(status().isOk());
        mvc.perform(post("/api/v1/employee/target-roles")).andExpect(status().isForbidden());
    }

    private static TargetRoleSummary summary() {
        return new TargetRoleSummary(
                "role-1", "JAVA_P3", "Java Developer", CareerTrack.PROFESSIONAL,
                "Backend role", 1);
    }

    private static TargetRoleDetail detail() {
        return new TargetRoleDetail(
                "role-1", "JAVA_P3", "Java Developer", "JAVA",
                CareerTrack.PROFESSIONAL, "Backend role", List.of("Build APIs"),
                List.of(new TargetRoleRequirement("skill-1", "JAVA", "Java", 0.7)));
    }
}
