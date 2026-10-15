package com.adaptlearngraph.assessment.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentDraftUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.CoverageShortage;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft.Item;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft.PublicationState;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.SkillConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import com.adaptlearngraph.identity.infrastructure.LocalCatalogSecurityConfiguration;

@WebMvcTest(
        controllers = BaselineBlueprintController.class,
        properties = "catalog.local-actor.enabled=true")
@Import(LocalCatalogSecurityConfiguration.class)
@ActiveProfiles("local")
class BaselineBlueprintControllerTest {
    private static final UUID ACTOR_ID = uuid(1);
    private static final UUID BLUEPRINT_ID = uuid(2);
    private static final UUID ASSESSMENT_ID = uuid(3);
    private static final UUID ASSESSMENT_VERSION_ID = uuid(4);
    private static final String HASH = "a".repeat(64);
    private static final Instant NOW = Instant.parse("2026-10-14T15:00:00Z");

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private BaselineBlueprintUseCase blueprints;

    @MockBean
    private BaselineAssessmentDraftUseCase drafts;

    @Test
    void createReturnsNormalizedVersionAndAcceptsLocalCsrfFreeRequest() throws Exception {
        when(blueprints.create(eq("create-key"), any())).thenReturn(blueprint());

        mvc.perform(post("/api/v1/ld/baseline-blueprints")
                        .header("Idempotency-Key", "create-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Java baseline",
                                "roles", List.of(roleRequest(1, 1, 1))))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.blueprintId").value(BLUEPRINT_ID.toString()))
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.roles[0].totalQuestionCount").value(3));
    }

    @Test
    void shortageFailureMapsTo422WithActionableBuckets() throws Exception {
        when(blueprints.create(eq("shortage-key"), any())).thenThrow(new Failure(
                Code.INSUFFICIENT_QUESTION_COVERAGE,
                "Published question coverage is insufficient",
                List.of(new CoverageShortage("role-java", "skill-java", "HARD", 3, 1, 2))));

        mvc.perform(post("/api/v1/ld/baseline-blueprints")
                        .header("Idempotency-Key", "shortage-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Java baseline",
                                "roles", List.of(roleRequest(1, 1, 3))))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_QUESTION_COVERAGE"))
                .andExpect(jsonPath("$.coverageShortages[0].difficulty").value("HARD"))
                .andExpect(jsonPath("$.coverageShortages[0].missing").value(2));
    }

    @Test
    void generatedAssessmentResponseNeverContainsProtectedAnswerMaterial() throws Exception {
        when(drafts.generate(BLUEPRINT_ID, 1, "generate-key")).thenReturn(assessment());

        mvc.perform(post("/api/v1/ld/baseline-blueprints/{blueprintId}/versions/1/assessment-drafts",
                        BLUEPRINT_ID)
                        .header("Idempotency-Key", "generate-key"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentHash").value(HASH))
                .andExpect(jsonPath("$.items[0].prompt").value("What is encapsulation?"))
                .andExpect(jsonPath("$.items[0].responseSchema.options[0]").value("A"))
                .andExpect(jsonPath("$.items[0].protectedKey").doesNotExist())
                .andExpect(jsonPath("$.items[0].answerKey").doesNotExist());
    }

    private static BaselineBlueprint blueprint() {
        return new BaselineBlueprint(
                BLUEPRINT_ID, 1, "Java baseline", null, null, ACTOR_ID,
                "create-key", HASH, NOW, List.of(role()));
    }

    private static BaselineAssessmentDraft assessment() {
        return new BaselineAssessmentDraft(
                ASSESSMENT_VERSION_ID, ASSESSMENT_ID, 1, "Java baseline", BLUEPRINT_ID, 1,
                42L, ACTOR_ID, NOW, HASH, HASH, PublicationState.DRAFT,
                null, null, null, List.of(new Item(
                        1, uuid(5), "role-java", "Java Backend Engineer",
                        "skill-java", "Java Core", "EASY", new BigDecimal("0.3"),
                        "What is encapsulation?", "{\"options\":[\"A\",\"B\"]}")));
    }

    private static RoleConfig role() {
        return new RoleConfig(
                "role-java", "Java Backend Engineer", true,
                new BigDecimal("0.3"), new BigDecimal("0.4"), new BigDecimal("0.3"),
                List.of(new SkillConfig("skill-java", "Java Core", 1, 1, 1)));
    }

    private static Map<String, Object> roleRequest(int easy, int medium, int hard) {
        return Map.of(
                "roleId", "role-java",
                "roleNameSnapshot", "Java Backend Engineer",
                "enabled", true,
                "easyScoreWeight", 0.3,
                "mediumScoreWeight", 0.4,
                "hardScoreWeight", 0.3,
                "skills", List.of(Map.of(
                        "microSkillId", "skill-java",
                        "microSkillNameSnapshot", "Java Core",
                        "easyQuestionCount", easy,
                        "mediumQuestionCount", medium,
                        "hardQuestionCount", hard)));
    }

    private static UUID uuid(long value) {
        return new UUID(0L, value);
    }
}
