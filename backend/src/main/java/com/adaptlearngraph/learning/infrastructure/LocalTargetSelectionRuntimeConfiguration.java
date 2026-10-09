package com.adaptlearngraph.learning.infrastructure;

import com.adaptlearngraph.catalog.application.port.out.EmployeeContextPort;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleCatalogPort;
import com.adaptlearngraph.learning.application.TargetRoleSelectionService;
import com.adaptlearngraph.learning.application.TargetSelectionCommandProcessor;
import com.adaptlearngraph.learning.application.port.in.TargetRoleSelectionUseCase;
import com.adaptlearngraph.learning.application.port.out.AssessmentActivityGuardPort;
import com.adaptlearngraph.learning.application.port.out.PathwayArchivePort;
import com.adaptlearngraph.learning.application.port.out.SelectionTransactionPort;
import com.adaptlearngraph.learning.application.port.out.TargetRoleSelectionCatalogPort;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionActorPort;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionEventPort;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort;
import java.time.Clock;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Local-only vertical wiring while real identity and downstream adapters remain pending. */
@Configuration(proxyBeanMethods = false)
@Profile("local")
@ConditionalOnProperty(prefix = "catalog.local-actor", name = "enabled", havingValue = "true")
public class LocalTargetSelectionRuntimeConfiguration {
    @Bean
    TargetSelectionActorPort targetSelectionActorPort(EmployeeContextPort employeeContext) {
        return new F01TargetSelectionActorAdapter(employeeContext);
    }

    @Bean
    TargetRoleSelectionCatalogPort targetRoleSelectionCatalogPort(
            TargetRoleCatalogPort catalog,
            NamedParameterJdbcTemplate jdbc) {
        return new F01TargetRoleSelectionCatalogAdapter(catalog, jdbc);
    }

    @Bean
    TargetSelectionCommandProcessor targetSelectionCommandProcessor(
            AssessmentActivityGuardPort assessmentGuard,
            PathwayArchivePort pathways,
            TargetSelectionEventPort events,
            TargetSelectionStorePort store) {
        return new TargetSelectionCommandProcessor(
                assessmentGuard, pathways, events, store, Clock.systemUTC(), UUID::randomUUID);
    }

    @Bean
    TargetRoleSelectionUseCase targetRoleSelectionUseCase(
            TargetSelectionActorPort actors,
            TargetRoleSelectionCatalogPort catalog,
            TargetSelectionStorePort store,
            SelectionTransactionPort transactions,
            TargetSelectionCommandProcessor processor) {
        return new TargetRoleSelectionService(actors, catalog, store, transactions, processor);
    }
}
