package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.JdbcAdaptiveBlueprintEligibilityAdapter;
import com.adaptlearngraph.repository.JdbcAdaptiveBlueprintStore;
import com.adaptlearngraph.repository.Neo4jAdaptiveBaselineCatalogAdapter;
import com.adaptlearngraph.repository.AdaptiveBlueprintStore;
import com.adaptlearngraph.repository.AdaptiveBaselineCatalogPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.repository.AdaptiveTechnicalVersionPort;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.sql.DataSource;
import org.neo4j.driver.Driver;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Both gates default off. Even local+prod explicitly excludes this provisional runtime wiring. */
@Configuration(proxyBeanMethods = false)
@Profile("(local | demo) & !prod & !workspace-baseline")
@ConditionalOnProperty(prefix = "assessment.baseline.adaptive.persistence", name = "enabled", havingValue = "true")
@EnableConfigurationProperties(JdbcAdaptiveBlueprintEligibilityAdapter.Properties.class)
@org.springframework.context.annotation.Import(PersistenceConfiguration.class)
public class LocalAdaptiveBlueprintConfiguration {
    @Bean
    AdaptiveBlueprintStore adaptiveBlueprintStore(DataSource dataSource, ObjectMapper mapper,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA)
            org.springframework.transaction.PlatformTransactionManager transactionManager) {
        return new JdbcAdaptiveBlueprintStore(new NamedParameterJdbcTemplate(dataSource), mapper, transactionManager);
    }

    @Bean
    AdaptiveTechnicalVersionPort adaptiveTechnicalVersionPort(com.adaptlearngraph.repository.IrtTechnicalVersionJpaRepository irtVersions) {
        return new com.adaptlearngraph.repository.JpaAdaptiveTechnicalVersionStore(irtVersions);
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
