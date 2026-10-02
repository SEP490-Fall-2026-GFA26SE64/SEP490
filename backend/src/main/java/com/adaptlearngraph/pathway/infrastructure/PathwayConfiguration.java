package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.PathwayViewService;
import org.neo4j.driver.Driver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * Spring configuration for the Pathway bounded context (REQ-004-F01).
 *
 * <p>Wires up the JDBC adapter, Neo4j name resolver, and the application service so
 * that the API layer only depends on the inbound use-case interfaces.
 */
@Configuration(proxyBeanMethods = false)
public class PathwayConfiguration {

    @Bean
    CatalogNameResolver catalogNameResolver(Driver driver) {
        return new Neo4jCatalogNameResolver(driver);
    }

    @Bean
    PathwayViewJdbcAdapter pathwayViewJdbcAdapter(JdbcClient jdbcClient,
            CatalogNameResolver catalogNameResolver) {
        return new PathwayViewJdbcAdapter(jdbcClient, catalogNameResolver);
    }

    @Bean
    PathwayViewService pathwayViewService(PathwayViewJdbcAdapter adapter) {
        return new PathwayViewService(adapter);
    }
}
