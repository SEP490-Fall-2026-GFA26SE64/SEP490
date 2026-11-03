package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.JpaAdaptiveBlueprintEligibilityAdapter;
import com.adaptlearngraph.repository.AdaptiveBlueprintRepositories;
import com.adaptlearngraph.repository.JpaAdaptiveBlueprintStore;
import com.adaptlearngraph.repository.Neo4jAdaptiveBaselineCatalogAdapter;
import com.adaptlearngraph.repository.AdaptiveBlueprintStore;
import com.adaptlearngraph.repository.AdaptiveBaselineCatalogPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.repository.AdaptiveTechnicalVersionPort;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.adaptlearngraph.repository.Neo4jCypher;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/** Both gates default off. Even local+prod explicitly excludes this provisional runtime wiring. */
@Configuration(proxyBeanMethods = false)
@Profile("(local | demo) & !prod & !workspace-baseline")
@ConditionalOnProperty(prefix = "assessment.baseline.adaptive.persistence", name = "enabled", havingValue = "true")
@EnableConfigurationProperties(JpaAdaptiveBlueprintEligibilityAdapter.Properties.class)
@org.springframework.context.annotation.Import(PersistenceConfiguration.class)
public class LocalAdaptiveBlueprintConfiguration {
    @Bean
    AdaptiveBlueprintStore adaptiveBlueprintStore(org.springframework.beans.factory.BeanFactory beans,
            com.adaptlearngraph.repository.PostgresAdvisoryLocks locks, ObjectMapper mapper,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA)
            org.springframework.transaction.PlatformTransactionManager transactionManager) {
        return new JpaAdaptiveBlueprintStore(AdaptiveBlueprintRepositories.from(beans::getBean, locks), mapper, transactionManager);
    }

    @Bean
    AdaptiveTechnicalVersionPort adaptiveTechnicalVersionPort(com.adaptlearngraph.repository.IrtTechnicalVersionJpaRepository irtVersions) {
        return new com.adaptlearngraph.repository.JpaAdaptiveTechnicalVersionStore(irtVersions);
    }

    @Bean
    @ConditionalOnProperty(prefix = "assessment.baseline.adaptive.eligibility", name = "enabled", havingValue = "true")
    AdaptiveBaselineCatalogPort adaptiveBaselineCatalogPort(Neo4jCypher graph, ObjectMapper mapper, JpaAdaptiveBlueprintEligibilityAdapter.Properties settings) {
        return new Neo4jAdaptiveBaselineCatalogAdapter(graph, mapper, settings.organizationId(), settings.occupationIds());
    }

    @Bean
    @ConditionalOnProperty(prefix = "assessment.baseline.adaptive.eligibility", name = "enabled", havingValue = "true")
    AdaptiveBlueprintEligibilityPort adaptiveBlueprintEligibilityPort(com.adaptlearngraph.repository.ItemVersionJpaRepository itemVersions,
            AdaptiveBaselineCatalogPort catalog,
            AdaptiveTechnicalVersionPort technical, ObjectMapper mapper, JpaAdaptiveBlueprintEligibilityAdapter.Properties settings) {
        return new JpaAdaptiveBlueprintEligibilityAdapter(itemVersions, catalog, technical, mapper, settings);
    }

}
