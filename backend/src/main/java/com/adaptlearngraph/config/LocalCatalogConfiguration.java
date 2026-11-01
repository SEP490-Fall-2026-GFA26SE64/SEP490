package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.ConfiguredEmployeeContextAdapter;
import com.adaptlearngraph.services.TargetRoleQueryService;
import com.adaptlearngraph.services.TargetRoleQueryUseCase;
import com.adaptlearngraph.repository.EmployeeContextPort;
import com.adaptlearngraph.repository.TargetRoleCatalogPort;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration(proxyBeanMethods = false)
@Profile("local")
@ConditionalOnProperty(prefix = "catalog.local-actor", name = "enabled", havingValue = "true")
@EnableConfigurationProperties(LocalEmployeeContextProperties.class)
public class LocalCatalogConfiguration {
    @Bean
    EmployeeContextPort localEmployeeContext(LocalEmployeeContextProperties properties) {
        return new ConfiguredEmployeeContextAdapter(properties);
    }

    @Bean
    TargetRoleQueryUseCase targetRoleQueryUseCase(
            EmployeeContextPort employeeContext, TargetRoleCatalogPort catalog) {
        return new TargetRoleQueryService(employeeContext, catalog);
    }
}
