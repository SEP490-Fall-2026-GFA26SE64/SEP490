package com.adaptlearngraph.apis;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.repository.AdaptiveAttemptPolicyPort;
import com.adaptlearngraph.repository.AdaptiveAttemptStore;
import com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.Answering;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.AssessmentScope;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.SelectedRole;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.StartRead;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.Submitting;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.View;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** Store, policy and eligibility failures keep their HTTP status and code after translation in the business layer. */
class AdaptiveAttemptControllerTest {
    private static final UUID ATTEMPT = new UUID(0L, 9);
    private static final String PATH = "/api/v1/employee/baseline-attempts";

    private final StartRead attempts = mock(StartRead.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new AdaptiveAttemptController(attempts)).build();

    @Test
    void startReturnsTheEmployeeSafeViewWithoutCaching() throws Exception {
        when(attempts.startOrResume(any(SelectedRole.class), eq("start-key"))).thenReturn(view());

        mvc.perform(post(PATH).header("Idempotency-Key", "start-key").contentType("application/json")
                        .content("{\"entry\":\"SELECTED_ROLE\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.id").value(ATTEMPT.toString()))
                .andExpect(jsonPath("$.assessmentScope").value("JOB_POSITION"));
    }

    @Test
    void storeFailuresKeepTheirCode() throws Exception {
        when(attempts.resume(ATTEMPT)).thenThrow(new AdaptiveAttemptStore.Failure(AdaptiveAttemptStore.Code.VERSION_CONFLICT));

        mvc.perform(get(PATH + "/{id}", ATTEMPT))
                .andExpect(status().isConflict())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code").value("VERSION_CONFLICT"))
                .andExpect(jsonPath("$.message").value("Adaptive baseline request: VERSION_CONFLICT"));
    }

    @Test
    void policyAndEligibilityOutagesKeepTheirMapping() throws Exception {
        when(attempts.resume(ATTEMPT)).thenThrow(new AdaptiveAttemptPolicyPort.Failure(AdaptiveAttemptPolicyPort.Code.INVALID_POLICY));
        mvc.perform(get(PATH + "/{id}", ATTEMPT))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("POLICY_UNAVAILABLE"));

        doThrow(new AdaptiveAttemptPolicyPort.Failure(AdaptiveAttemptPolicyPort.Code.DEPENDENCY_UNAVAILABLE))
                .when(attempts).resume(ATTEMPT);
        mvc.perform(get(PATH + "/{id}", ATTEMPT))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("DEPENDENCY_UNAVAILABLE"));

        doThrow(new AdaptiveBlueprintEligibilityPort.DependencyUnavailable("down", null)).when(attempts).resume(ATTEMPT);
        mvc.perform(get(PATH + "/{id}", ATTEMPT))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("DEPENDENCY_UNAVAILABLE"));
    }

    @Test
    void answerAndSubmitTranslateOnlyStoreFailures() throws Exception {
        var answering = mock(Answering.class);
        var answers = MockMvcBuilders.standaloneSetup(new AdaptiveAttemptAnswerController(answering)).build();
        String answer = "{\"expectedRevision\":1,\"position\":1,\"itemVersionId\":\"" + new UUID(0L, 5)
                + "\",\"selectedOptionId\":\"A\"}";
        when(answering.answer(any())).thenThrow(new AdaptiveAttemptStore.Failure(AdaptiveAttemptStore.Code.IDEMPOTENCY_CONFLICT));
        answers.perform(post(PATH + "/{id}/answers", ATTEMPT).header("Idempotency-Key", "answer-key")
                        .contentType("application/json").content(answer))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));

        doThrow(new AdaptiveAttemptPolicyPort.Failure(AdaptiveAttemptPolicyPort.Code.INVALID_POLICY)).when(answering).answer(any());
        assertThatThrownBy(() -> answers.perform(post(PATH + "/{id}/answers", ATTEMPT).header("Idempotency-Key", "answer-key")
                        .contentType("application/json").content(answer)))
                .hasRootCauseInstanceOf(AdaptiveAttemptPolicyPort.Failure.class);

        var submitting = mock(Submitting.class);
        when(submitting.submit(any())).thenThrow(new AdaptiveAttemptStore.Failure(AdaptiveAttemptStore.Code.FORBIDDEN));
        MockMvcBuilders.standaloneSetup(new AdaptiveAttemptSubmitController(submitting)).build()
                .perform(post(PATH + "/{id}/submit", ATTEMPT).header("Idempotency-Key", "submit-key")
                        .contentType("application/json").content("{\"expectedRevision\":2}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    private static View view() {
        Instant now = Instant.parse("2026-10-20T08:00:00Z");
        return new View(ATTEMPT, "jobPosition-java", "Java Engineer", "BASELINE", "role-java", "IN_PROGRESS", 1, now,
                now.plusSeconds(3600), now, false, 20, 0, List.of(), AssessmentScope.JOB_POSITION);
    }
}