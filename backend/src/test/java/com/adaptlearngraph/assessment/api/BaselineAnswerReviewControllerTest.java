package com.adaptlearngraph.assessment.api;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.assessment.application.port.in.BaselineAnswerReviewUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineAnswerReviewUseCase.AnswerItem;
import com.adaptlearngraph.assessment.application.port.in.BaselineAnswerReviewUseCase.AnswerReview;
import com.adaptlearngraph.assessment.application.port.in.BaselineAnswerReviewUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineAnswerReviewUseCase.Failure;
import com.adaptlearngraph.identity.infrastructure.LocalCatalogSecurityConfiguration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = BaselineAnswerReviewController.class, properties = {
        "catalog.local-actor.enabled=true", "assessment.baseline.answer-review.enabled=true"})
@Import(LocalCatalogSecurityConfiguration.class)
@ActiveProfiles("local")
class BaselineAnswerReviewControllerTest {
    private static final UUID ASSESSMENT_ID = new UUID(0L, 1);
    private static final UUID ITEM_ID = new UUID(0L, 2);

    @Autowired private MockMvc mvc;
    @MockBean private BaselineAnswerReviewUseCase review;

    @Test
    void revealReturnsDedicatedProtectedPayloadWithNoStoreHeaders() throws Exception {
        when(review.reveal(ASSESSMENT_ID)).thenReturn(new AnswerReview(
                ASSESSMENT_ID, List.of(new AnswerItem(ITEM_ID, "{\"correctOption\":1}"))));
        mvc.perform(get("/api/v1/ld/baseline-assessments/assessment-versions/{id}/protected-answers",
                        ASSESSMENT_ID))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andExpect(header().string("Pragma", "no-cache"))
                .andExpect(jsonPath("$.assessmentVersionId").value(ASSESSMENT_ID.toString()))
                .andExpect(jsonPath("$.items[0].itemVersionId").value(ITEM_ID.toString()))
                .andExpect(jsonPath("$.items[0].protectedKey.correctOption").value(1));
    }

    @Test
    void failuresAreStatusMappedAndNeverCacheable() throws Exception {
        when(review.reveal(ASSESSMENT_ID)).thenThrow(
                new Failure(Code.FORBIDDEN, "Protected answers are not available", null));
        mvc.perform(get("/api/v1/ld/baseline-assessments/assessment-versions/{id}/protected-answers",
                        ASSESSMENT_ID))
                .andExpect(status().isForbidden())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }
}
