package com.adaptlearngraph.assessment.api;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintCapacityUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintCapacityUseCase.CapacityDetail;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintCapacityUseCase.RoleCapacity;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintCapacityUseCase.SkillCapacity;
import com.adaptlearngraph.assessment.application.port.in.BaselineOccupationCatalogUseCase;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** REQ-002-F02 HTTP mapping for the read-only capacity contract. */
class BaselineOccupationCatalogControllerTest {
    private BaselineBlueprintCapacityUseCase capacity;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        var catalog = mock(BaselineOccupationCatalogUseCase.class);
        capacity = mock(BaselineBlueprintCapacityUseCase.class);
        mvc = MockMvcBuilders.standaloneSetup(
                new BaselineOccupationCatalogController(catalog, capacity)).build();
    }

    @Test
    void returnsOnlyCapacityMetadataAndCounts() throws Exception {
        when(capacity.getAvailableCapacity("occupation-engineering")).thenReturn(new CapacityDetail(
                "occupation-engineering", "catalog-v7", Instant.parse("2026-10-16T08:00:00Z"),
                List.of(new RoleCapacity("role-java", List.of(
                        new SkillCapacity("skill-java", 10, 9, 8))))));

        mvc.perform(get("/api/v1/ld/baseline-blueprint-catalog/occupations/{occupationId}/capacity",
                        "occupation-engineering"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.catalogVersion").value("catalog-v7"))
                .andExpect(jsonPath("$.roles[0].skills[0].availableEasy").value(10))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.matchesPattern(
                                "(?is).*(protected[_-]?key|answer[_-]?key).*"))));
    }

    @Test
    void mapsCapacityFailuresToStableHttpStatusAndCode() throws Exception {
        when(capacity.getAvailableCapacity("missing")).thenThrow(
                new BaselineBlueprintCapacityUseCase.Failure(
                        BaselineBlueprintCapacityUseCase.Code.NOT_FOUND,
                        "Occupation is unavailable"));

        mvc.perform(get("/api/v1/ld/baseline-blueprint-catalog/occupations/missing/capacity"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
