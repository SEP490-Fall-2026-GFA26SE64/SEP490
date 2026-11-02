package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.AdaptiveAttemptContentPort;
import com.adaptlearngraph.repository.AdaptiveAttemptContextPort;
import com.adaptlearngraph.repository.AdaptiveAttemptFinalizationPort;
import com.adaptlearngraph.repository.AdaptiveAttemptOutcomePort;
import com.adaptlearngraph.repository.AdaptiveAttemptPolicyPort;
import com.adaptlearngraph.repository.AdaptiveAttemptRepositories;
import com.adaptlearngraph.repository.AdaptiveAttemptStore;
import com.adaptlearngraph.repository.BaselineAttemptResultJpaRepository;
import com.adaptlearngraph.repository.JpaAdaptiveAttemptOutcome;
import com.adaptlearngraph.repository.JpaAdaptiveAttemptResultQuery;
import com.adaptlearngraph.repository.PostgresAdvisoryLocks;
import com.adaptlearngraph.services.AdaptiveAttemptFinalizationService;
import com.adaptlearngraph.services.AdaptiveAttemptSubmitService;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.Submitting;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.Results;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;

/** TMP-REQ002-08: finalization is independently opt-in; the worker has a further gate. */
@Configuration(proxyBeanMethods = false)
@Profile("(local | demo) & !prod & !workspace-baseline")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "assessment.baseline.adaptive", name = {"enabled", "persistence.enabled", "eligibility.enabled", "attempts.enabled", "attempts.finalization.enabled"}, havingValue = "true")
@Import(PersistenceConfiguration.class)
public class LocalAdaptiveAttemptFinalizationConfiguration {
    @Bean
    AdaptiveAttemptOutcomePort adaptiveAttemptOutcome(BeanFactory beans, PostgresAdvisoryLocks locks, ObjectMapper mapper, AdaptiveAttemptStore store) {
        return new JpaAdaptiveAttemptOutcome(AdaptiveAttemptRepositories.from(beans::getBean, locks), mapper, store);
    }
    @Bean
    AdaptiveAttemptFinalizationPort adaptiveAttemptFinalization(AdaptiveAttemptStore store, AdaptiveAttemptPolicyPort policies, AdaptiveAttemptOutcomePort outcomes) {
        return new AdaptiveAttemptFinalizationService(store, policies, outcomes);
    }
    @Bean
    Results adaptiveAttemptResults(BaselineAttemptResultJpaRepository results, AdaptiveAttemptContextPort context) {
        return new JpaAdaptiveAttemptResultQuery(results, context);
    }
    @Bean
    Submitting adaptiveAttemptSubmitting(AdaptiveAttemptContextPort context, AdaptiveAttemptStore store,
            AdaptiveAttemptFinalizationPort finalization, AdaptiveAttemptContentPort content) {
        return new AdaptiveAttemptSubmitService(context, store, finalization, content);
    }
}
