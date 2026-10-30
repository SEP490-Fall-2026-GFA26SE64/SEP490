package com.adaptlearngraph.assessment.api;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase.OccupationPage;
import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase.OccupationSummary;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft.Item;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft.PublicationState;
import com.adaptlearngraph.identity.infrastructure.LocalCatalogSecurityConfiguration;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = BaselineAssessmentManagementController.class, properties = {
        "catalog.local-actor.enabled=true",
        "assessment.baseline.occupation-catalog.enabled=true"
})
@Import(LocalCatalogSecurityConfiguration.class)
@ActiveProfiles("local")
class BaselineAssessmentManagementControllerTest {
    private static final UUID ASSESSMENT_VERSION_ID = new UUID(0L, 1);

    @Autowired private MockMvc mvc;
    @MockBean private BaselineAssessmentManagementUseCase management;

    @Test
    void listPassesServerSideQueryAndReturnsLifecycleSummary() throws Exception {
        when(management.listOccupations(argThat(query ->
                query.search().equals("java") && query.status().equals("ACTIVE")
                        && query.sort().equals("name_desc") && query.page() == 1 && query.size() == 10)))
                .thenReturn(new OccupationPage(List.of(new OccupationSummary(
                        "occupation-java", "Java Engineer", 3, "NONE", null, null, 2,
                        Instant.parse("2026-10-17T08:00:00Z"))), 1, 10, 11));

        mvc.perform(get("/api/v1/ld/baseline-assessments")
                        .queryParam("search", "java")
                        .queryParam("status", "ACTIVE")
                        .queryParam("sort", "name_desc")
                        .queryParam("page", "1")
                        .queryParam("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].occupationId").value("occupation-java"))
                .andExpect(jsonPath("$.items[0].activeAssessmentVersion").value(2))
                .andExpect(jsonPath("$.total").value(11));
    }

    @Test
    void assessmentDetailNeverSerializesProtectedAnswersOrActorMetadata() throws Exception {
        when(management.getAssessmentVersion(ASSESSMENT_VERSION_ID)).thenReturn(assessment());

        mvc.perform(get("/api/v1/ld/baseline-assessments/assessment-versions/{id}",
                        ASSESSMENT_VERSION_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].prompt").value("What is encapsulation?"))
                .andExpect(jsonPath("$.items[0].responseSchema.options[0]").value("A"))
                .andExpect(jsonPath("$.items[0].protectedKey").doesNotExist())
                .andExpect(jsonPath("$.createdBy").doesNotExist())
                .andExpect(jsonPath("$.generationSeed").doesNotExist());
    }

    @Test
    void staleRevisionIsAStableConflictResponse() throws Exception {
        when(management.getAssessmentVersion(ASSESSMENT_VERSION_ID)).thenThrow(
                new Failure(Code.STALE_ASSESSMENT_REVISION, "Reload the draft"));

        mvc.perform(get("/api/v1/ld/baseline-assessments/assessment-versions/{id}",
                        ASSESSMENT_VERSION_ID))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("STALE_ASSESSMENT_REVISION"))
                .andExpect(jsonPath("$.message").value("Reload the draft"));
    }

    private static BaselineAssessmentDraft assessment() {
        String hash = "a".repeat(64);
        return new BaselineAssessmentDraft(
                ASSESSMENT_VERSION_ID, new UUID(0L, 2), 1, "Java baseline",
                new UUID(0L, 3), 1, 42L, new UUID(0L, 4),
                Instant.parse("2026-10-17T08:00:00Z"), hash, hash, PublicationState.DRAFT,
                null, null, null, List.of(new Item(
                        1, new UUID(0L, 5), "role-java", "Java Engineer",
                        "skill-java", "Java Core", "EASY", new BigDecimal("1.0"),
                        "What is encapsulation?", "{\"options\":[\"A\",\"B\"]}")));
    }
}
