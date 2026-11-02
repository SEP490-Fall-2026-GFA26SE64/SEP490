package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.PlatformCatalogTemplate;
import com.adaptlearngraph.services.PlatformCatalogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration(proxyBeanMethods = false)
@Profile("!starter")
public class PlatformCatalogConfiguration {
    private static final Logger LOG = LoggerFactory.getLogger(PlatformCatalogConfiguration.class);

    @Bean
    PlatformCatalogService platformCatalogService(ObjectMapper json,
            @Value("${platform.catalog.template-path:/seed/ontology_seed.json}") String path) {
        Path source = Path.of(path);
        Optional<PlatformCatalogTemplate> template;
        if (!Files.isRegularFile(source)) {
            LOG.warn("Platform catalog template is unavailable; new organizations can only start with an empty catalog");
            template = Optional.empty();
        } else {
            try {
                template = Optional.of(PlatformCatalogTemplate.load(source, json));
            } catch (Exception invalid) {
                LOG.error("Platform catalog template could not be loaded ({})", invalid.getClass().getSimpleName());
                template = Optional.empty();
            }
        }
        Optional<PlatformCatalogTemplate> loaded = template;
        return new PlatformCatalogService(() -> loaded);
    }

    @Bean
    com.adaptlearngraph.repository.WorkspaceCatalogImportStore workspaceCatalogImportStore(
            org.springframework.jdbc.core.JdbcTemplate jdbc, org.springframework.transaction.PlatformTransactionManager manager) {
        return new com.adaptlearngraph.repository.JdbcWorkspaceCatalogImportStore(jdbc,
                new org.springframework.transaction.support.TransactionTemplate(manager));
    }

    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "workspace.catalog-import.enabled",
            havingValue = "true", matchIfMissing = true)
    com.adaptlearngraph.services.WorkspaceCatalogImportWorker workspaceCatalogImportWorker(
            com.adaptlearngraph.repository.WorkspaceCatalogImportStore store, PlatformCatalogService catalog,
            org.springframework.beans.factory.ObjectProvider<org.neo4j.driver.Driver> driver) {
        return new com.adaptlearngraph.services.WorkspaceCatalogImportWorker(store, catalog,
                new com.adaptlearngraph.repository.Neo4jWorkspaceCatalogWriter(driver::getObject), java.time.Clock.systemUTC());
    }

    @Bean
    @Order(0)
    @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
    SecurityFilterChain platformCatalogSecurity(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/v1/platform-catalog", "/api/v1/platform-catalog/**")
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.GET, "/api/v1/platform-catalog").permitAll()
                        .anyRequest().denyAll())
                .exceptionHandling(exceptions -> exceptions.accessDeniedHandler((request, response, exception) -> {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"code\":\"FORBIDDEN\",\"message\":\"Refresh the page and retry with a valid CSRF token.\"}");
                }))
                .build();
    }
}
