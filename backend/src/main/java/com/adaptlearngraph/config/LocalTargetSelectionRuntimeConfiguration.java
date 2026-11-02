package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.CatalogGuardJpaRepository;
import com.adaptlearngraph.repository.F01TargetRoleSelectionCatalogAdapter;
import com.adaptlearngraph.repository.F01TargetSelectionActorAdapter;
import com.adaptlearngraph.repository.EmployeeContextPort;
import com.adaptlearngraph.repository.TargetRoleCatalogPort;
import com.adaptlearngraph.services.TargetRoleSelectionService;
import com.adaptlearngraph.services.TargetSelectionCommandProcessor;
import com.adaptlearngraph.services.TargetRoleSelectionUseCase;
import com.adaptlearngraph.repository.AssessmentActivityGuardPort;
import com.adaptlearngraph.repository.PathwayArchivePort;
import com.adaptlearngraph.repository.SelectionTransactionPort;
import com.adaptlearngraph.repository.TargetRoleSelectionCatalogPort;
import com.adaptlearngraph.repository.TargetSelectionActorPort;
import com.adaptlearngraph.repository.TargetSelectionEventPort;
import com.adaptlearngraph.repository.TargetSelectionStorePort;
import java.time.Clock;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Profile;

/** Local-only vertical wiring while real identity and downstream adapters remain pending. */
@Configuration(proxyBeanMethods = false)
@Profile("local")
@ConditionalOnProperty(prefix = "catalog.local-actor", name = "enabled", havingValue = "true")
@Import(PersistenceConfiguration.class)
public class LocalTargetSelectionRuntimeConfiguration {
    @Bean
    TargetSelectionActorPort targetSelectionActorPort(EmployeeContextPort employeeContext) {
        return new F01TargetSelectionActorAdapter(employeeContext);
    }

    @Bean
    TargetRoleSelectionCatalogPort targetRoleSelectionCatalogPort(
            TargetRoleCatalogPort catalog,
            CatalogGuardJpaRepository references) {
        return new F01TargetRoleSelectionCatalogAdapter(catalog, references);
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
