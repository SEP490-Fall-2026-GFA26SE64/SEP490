package com.adaptlearngraph.apis;

import com.adaptlearngraph.config.ModelMapperConfiguration;
import com.adaptlearngraph.entities.domain.JobPosition;
import com.adaptlearngraph.helper.JobPositionMappings;
import com.adaptlearngraph.services.GetJobPositionsUseCase;
import com.adaptlearngraph.services.JobPositionApplicationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@org.springframework.context.annotation.Import({ModelMapperConfiguration.class, JobPositionMappings.class, JobPositionApplicationService.class})
@WebMvcTest(controllers = JobPositionController.class)
class JobPositionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GetJobPositionsUseCase getJobPositionsUseCase;

    @Test
    @WithMockUser
    @DisplayName("GET /api/v1/organizations/{orgId}/job-positions returns mapped list of job positions")
    void listJobPositions_returnsList() throws Exception {
        List<JobPosition> positions = List.of(
                new JobPosition("pos-1", "15-1252.00", "Software Developers", 4, 16.0, 84.0, 22.0, 13.0, 14.0, 77.0, "ACTIVE", "0.9.0", 3, 12),
                new JobPosition("pos-2", "15-1243.00", "Database Architects", 4, 10.0, 75.0, 15.0, 20.0, 30.0, 80.0, "ACTIVE", "0.9.0", 2, 8)
        );

        given(getJobPositionsUseCase.listJobPositions("org-technova")).willReturn(positions);

        mockMvc.perform(get("/api/v1/organizations/org-technova/job-positions")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].code").value("15-1252.00"))
                .andExpect(jsonPath("$[0].name").value("Software Developers"))
                .andExpect(jsonPath("$[0].jobZone").value(4))
                .andExpect(jsonPath("$[1].code").value("15-1243.00"));
    }

    @Test
    @WithMockUser
    @DisplayName("GET /api/v1/organizations/{orgId}/job-positions backward compatible alias returns mapped list")
    void listJobPositions_aliasReturnsList() throws Exception {
        List<JobPosition> positions = List.of(
                new JobPosition("pos-1", "15-1252.00", "Software Developers", 4, 16.0, 84.0, 22.0, 13.0, 14.0, 77.0, "ACTIVE", "0.9.0", 3, 12)
        );

        given(getJobPositionsUseCase.listJobPositions("org-technova")).willReturn(positions);

        mockMvc.perform(get("/api/v1/organizations/org-technova/job-positions")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].code").value("15-1252.00"));
    }

    @Test
    @WithMockUser
    @DisplayName("POST /api/v1/organizations/{orgId}/job-positions creates job position")
    void createJobPosition_success() throws Exception {
        JobPosition created = new JobPosition("15-1252.00", "15-1252.00", "Software Developers", 4, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, "ACTIVE", "0.9.0", 0, 0);
        given(getJobPositionsUseCase.saveJobPosition(eq("org-technova"), any(JobPosition.class))).willReturn(created);

        mockMvc.perform(post("/api/v1/organizations/org-technova/job-positions")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "code": "15-1252.00",
                                    "name": "Software Developers",
                                    "jobZone": 4
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("15-1252.00"))
                .andExpect(jsonPath("$.name").value("Software Developers"));
    }

    @Test
    @WithMockUser
    @DisplayName("DELETE /api/v1/organizations/{orgId}/job-positions/{id} deletes successfully")
    void deleteJobPosition_success() throws Exception {
        mockMvc.perform(delete("/api/v1/organizations/org-technova/job-positions/15-1252.00")
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }
}

