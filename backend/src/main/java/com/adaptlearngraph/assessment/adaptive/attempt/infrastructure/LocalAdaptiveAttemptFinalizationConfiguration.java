package com.adaptlearngraph.assessment.adaptive.attempt.infrastructure;

import com.adaptlearngraph.assessment.adaptive.attempt.application.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.Submitting;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.Results;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.sql.DataSource;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** TMP-REQ002-08: finalization is independently opt-in; the worker has a further gate. */
@Configuration(proxyBeanMethods = false)
@Profile("(local | demo) & !prod & !workspace-baseline")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "assessment.baseline.adaptive", name = {"enabled", "persistence.enabled", "eligibility.enabled", "attempts.enabled", "attempts.finalization.enabled"}, havingValue = "true")
public class LocalAdaptiveAttemptFinalizationConfiguration {
    @Bean
    AdaptiveAttemptOutcomePort adaptiveAttemptOutcome(DataSource source, ObjectMapper mapper, AdaptiveAttemptStore store) {
        return new JdbcAdaptiveAttemptOutcome(new NamedParameterJdbcTemplate(source), mapper, store);
    }
    @Bean
    AdaptiveAttemptFinalizationPort adaptiveAttemptFinalization(AdaptiveAttemptStore store, AdaptiveAttemptPolicyPort policies, AdaptiveAttemptOutcomePort outcomes) {
        return new AdaptiveAttemptFinalizationService(store, policies, outcomes);
    }
    @Bean
    Results adaptiveAttemptResults(DataSource source, AdaptiveAttemptContextPort context) {
        return new JdbcAdaptiveAttemptResultQuery(new NamedParameterJdbcTemplate(source), context);
    }
    @Bean
    Submitting adaptiveAttemptSubmitting(AdaptiveAttemptContextPort context, AdaptiveAttemptStore store,
            AdaptiveAttemptFinalizationPort finalization, AdaptiveAttemptContentPort content) {
        return new AdaptiveAttemptSubmitService(context, store, finalization, content);
    }
}
