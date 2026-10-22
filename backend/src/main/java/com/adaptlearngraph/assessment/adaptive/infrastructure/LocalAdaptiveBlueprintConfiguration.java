package com.adaptlearngraph.assessment.adaptive.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintStore;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBaselineCatalogPort;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveTechnicalVersionPort;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.sql.DataSource;
import org.neo4j.driver.Driver;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.JdbcTransactionManager;

/** Both gates default off. Even local+prod explicitly excludes this provisional runtime wiring. */
@Configuration(proxyBeanMethods = false)
@Profile("(local | demo) & !prod")
@ConditionalOnProperty(prefix = "assessment.baseline.adaptive.persistence", name = "enabled", havingValue = "true")
@EnableConfigurationProperties(JdbcAdaptiveBlueprintEligibilityAdapter.Properties.class)
public class LocalAdaptiveBlueprintConfiguration {
    @Bean
    AdaptiveBlueprintStore adaptiveBlueprintStore(DataSource dataSource, ObjectMapper mapper) {
        return new JdbcAdaptiveBlueprintStore(new NamedParameterJdbcTemplate(dataSource), mapper, new JdbcTransactionManager(dataSource));
    }

    @Bean
    AdaptiveTechnicalVersionPort adaptiveTechnicalVersionPort(DataSource dataSource) {
        return new JdbcAdaptiveTechnicalVersionStore(new NamedParameterJdbcTemplate(dataSource));
    }

    @Bean
    @ConditionalOnProperty(prefix = "assessment.baseline.adaptive.eligibility", name = "enabled", havingValue = "true")
    AdaptiveBaselineCatalogPort adaptiveBaselineCatalogPort(Driver driver, ObjectMapper mapper, JdbcAdaptiveBlueprintEligibilityAdapter.Properties settings) {
        return new Neo4jAdaptiveBaselineCatalogAdapter(driver, mapper, settings.organizationId(), settings.occupationIds());
    }

    @Bean
    @ConditionalOnProperty(prefix = "assessment.baseline.adaptive.eligibility", name = "enabled", havingValue = "true")
    AdaptiveBlueprintEligibilityPort adaptiveBlueprintEligibilityPort(DataSource dataSource, AdaptiveBaselineCatalogPort catalog,
            AdaptiveTechnicalVersionPort technical, ObjectMapper mapper, JdbcAdaptiveBlueprintEligibilityAdapter.Properties settings) {
        return new JdbcAdaptiveBlueprintEligibilityAdapter(new NamedParameterJdbcTemplate(dataSource), catalog, technical, mapper, settings);
    }

}
