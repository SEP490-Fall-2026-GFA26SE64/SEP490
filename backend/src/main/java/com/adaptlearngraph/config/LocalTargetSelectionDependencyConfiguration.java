package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.AdaptiveBaselineAssessmentActivityGuardAdapter;
import com.adaptlearngraph.repository.JdbcProvisionalPathwayArchiveAdapter;
import com.adaptlearngraph.repository.AssessmentActivityGuardPort;
import com.adaptlearngraph.repository.PathwayArchivePort;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

@Configuration(proxyBeanMethods = false)
@Profile({"local", "demo"})
@ConditionalOnProperty(
        prefix = "learning.target-selection.local-dependencies",
        name = "enabled",
        havingValue = "true")
public class LocalTargetSelectionDependencyConfiguration {
    @Bean
    AssessmentActivityGuardPort adaptiveBaselineAssessmentActivityGuard(
            NamedParameterJdbcTemplate jdbc) {
        return new AdaptiveBaselineAssessmentActivityGuardAdapter(jdbc);
    }

    @Bean
    PathwayArchivePort provisionalPathwayArchive(
            NamedParameterJdbcTemplate jdbc) {
        return new JdbcProvisionalPathwayArchiveAdapter(jdbc);
    }
}
