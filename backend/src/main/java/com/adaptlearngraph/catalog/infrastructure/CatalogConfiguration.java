package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.port.out.TargetRoleCatalogPort;
import org.neo4j.driver.Driver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class CatalogConfiguration {
    @Bean
    TargetRoleCatalogPort targetRoleCatalogPort(Driver driver) {
        return new Neo4jTargetRoleCatalogAdapter(driver);
    }
}
