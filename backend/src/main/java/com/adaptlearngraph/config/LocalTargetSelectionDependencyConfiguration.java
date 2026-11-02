package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.JpaAssessmentActivityGuardAdapter;
import com.adaptlearngraph.repository.JpaProvisionalPathwayArchiveAdapter;
import com.adaptlearngraph.repository.PathwayRevisionJpaRepository;
import com.adaptlearngraph.repository.AssessmentActivityGuardPort;
import com.adaptlearngraph.repository.PathwayArchivePort;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration(proxyBeanMethods = false)
@Profile({"local", "demo"})
@ConditionalOnProperty(
        prefix = "learning.target-selection.local-dependencies",
        name = "enabled",
        havingValue = "true")
@org.springframework.context.annotation.Import(PersistenceConfiguration.class)
public class LocalTargetSelectionDependencyConfiguration {
    @Bean
    AssessmentActivityGuardPort adaptiveBaselineAssessmentActivityGuard(
            com.adaptlearngraph.repository.BaselineAdaptiveAttemptJpaRepository attempts) {
        return new JpaAssessmentActivityGuardAdapter(attempts);
    }

    @Bean
    PathwayArchivePort provisionalPathwayArchive(
            PathwayRevisionJpaRepository pathways) {
        return new JpaProvisionalPathwayArchiveAdapter(pathways);
    }
}
