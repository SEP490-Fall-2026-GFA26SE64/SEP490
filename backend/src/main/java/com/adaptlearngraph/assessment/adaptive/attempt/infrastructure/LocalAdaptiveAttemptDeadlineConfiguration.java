package com.adaptlearngraph.assessment.adaptive.attempt.infrastructure;

import com.adaptlearngraph.assessment.adaptive.attempt.application.AdaptiveAttemptDeadlineWorker;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.infrastructure.JdbcAdaptiveBlueprintEligibilityAdapter;
import java.time.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** TMP-REQ002-08: one isolated local/demo worker; no global scheduling switch or production bean. */
@Configuration(proxyBeanMethods = false)
@Profile("(local | demo) & !prod")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "assessment.baseline.adaptive", name = {"enabled", "persistence.enabled", "eligibility.enabled", "attempts.enabled", "attempts.finalization.enabled", "attempts.deadline-worker.enabled"}, havingValue = "true")
public class LocalAdaptiveAttemptDeadlineConfiguration {
    @Bean
    AdaptiveAttemptDeadlineWorker adaptiveAttemptDeadlineWorker(AdaptiveAttemptStore store, AdaptiveAttemptFinalizationPort finalization,
            JdbcAdaptiveBlueprintEligibilityAdapter.Properties settings,
            @Value("${assessment.baseline.adaptive.attempts.deadline-worker.batch-size:10}") int batchSize) {
        return new AdaptiveAttemptDeadlineWorker(store, finalization, settings.organizationId(), batchSize);
    }
    @Bean(destroyMethod = "shutdown")
    ThreadPoolTaskScheduler adaptiveAttemptDeadlineScheduler() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1); scheduler.setThreadNamePrefix("adaptive-baseline-deadline-"); scheduler.setDaemon(true);
        return scheduler;
    }
    @Bean
    SmartInitializingSingleton adaptiveAttemptDeadlineSchedule(AdaptiveAttemptDeadlineWorker worker,
            @Qualifier("adaptiveAttemptDeadlineScheduler") ThreadPoolTaskScheduler scheduler,
            @Value("${assessment.baseline.adaptive.attempts.deadline-worker.poll-ms:5000}") long pollMs) {
        if (pollMs < 100 || pollMs > 60_000) throw new IllegalArgumentException("Deadline poll must be 100..60000 ms");
        return () -> scheduler.scheduleWithFixedDelay(worker, Instant.now().plusMillis(pollMs), Duration.ofMillis(pollMs));
    }
}
