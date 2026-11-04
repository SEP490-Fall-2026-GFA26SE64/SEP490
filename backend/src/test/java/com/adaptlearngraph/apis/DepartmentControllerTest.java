package com.adaptlearngraph.apis;

import com.adaptlearngraph.config.ModelMapperConfiguration;
import com.adaptlearngraph.entities.domain.Department;
import com.adaptlearngraph.helper.DepartmentMappings;
import com.adaptlearngraph.services.DepartmentApplicationService;
import com.adaptlearngraph.services.GetDepartmentsUseCase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@org.springframework.context.annotation.Import({ModelMapperConfiguration.class, DepartmentMappings.class, DepartmentApplicationService.class})
@WebMvcTest(controllers = DepartmentController.class)
class DepartmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GetDepartmentsUseCase getDepartmentsUseCase;

    @Test
    @WithMockUser
    @DisplayName("GET /api/v1/organizations/{orgId}/departments returns mapped list of departments")
    void listDepartments_returnsList() throws Exception {
        List<Department> departments = List.of(
                new Department("dept-1", "ENG-SWE", "Software Engineering", "Core engineering",
                        "Marcus Vance", "marcus@technova.com", "ACTIVE", "org-technova",
                        "2026-11-04T00:00:00Z", "2026-11-04T00:00:00Z", List.of("15-1252.00"), 1),
                new Department("dept-2", "ENG-DATA", "Data & AI", "Data platform",
                        "Dr. Sarah Chen", "sarah@technova.com", "ACTIVE", "org-technova",
                        "2026-11-04T00:00:00Z", "2026-11-04T00:00:00Z", List.of("15-1243.00"), 1)
        );

        given(getDepartmentsUseCase.listDepartments("org-technova")).willReturn(departments);

        mockMvc.perform(get("/api/v1/organizations/org-technova/departments")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].code").value("ENG-SWE"))
                .andExpect(jsonPath("$[0].name").value("Software Engineering"))
                .andExpect(jsonPath("$[0].jobPositionCount").value(1))
                .andExpect(jsonPath("$[1].code").value("ENG-DATA"));
    }

    @Test
    @WithMockUser
    @DisplayName("POST /api/v1/organizations/{orgId}/departments creates department")
    void createDepartment_returnsCreated() throws Exception {
        Department created = new Department("dept-new", "ENG-SEC", "Cybersecurity", "Security operations",
                "Alex Rivera", "alex@technova.com", "ACTIVE", "org-technova",
                "2026-11-04T00:00:00Z", "2026-11-04T00:00:00Z", List.of("15-1212.00"), 1);

        given(getDepartmentsUseCase.saveDepartment(eq("org-technova"), any(Department.class))).willReturn(created);

        mockMvc.perform(post("/api/v1/organizations/org-technova/departments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "ENG-SEC",
                                  "name": "Cybersecurity",
                                  "description": "Security operations",
                                  "headOfDepartment": "Alex Rivera",
                                  "headEmail": "alex@technova.com",
                                  "status": "ACTIVE",
                                  "linkedJobPositions": ["15-1212.00"]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("ENG-SEC"))
                .andExpect(jsonPath("$.name").value("Cybersecurity"));
    }

    @Test
    @WithMockUser
    @DisplayName("POST /api/v1/organizations/{orgId}/departments/{id}/job-positions links position")
    void linkJobPosition_returnsOk() throws Exception {
        mockMvc.perform(post("/api/v1/organizations/org-technova/departments/dept-1/job-positions")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "jobPositionCode": "15-1252.00"
                                }
                                """))
                .andExpect(status().isOk());
    }
}

