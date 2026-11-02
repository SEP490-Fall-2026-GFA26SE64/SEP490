package com.adaptlearngraph.config;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.repository.PostgresAdvisoryLocks;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.neo4j.driver.Driver;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.autoconfigure.transaction.TransactionManagerCustomizers;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.neo4j.core.DatabaseSelectionProvider;
import org.springframework.data.neo4j.core.transaction.Neo4jTransactionManager;
import org.springframework.data.neo4j.repository.config.EnableNeo4jRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;

/**
 * Declares both transaction managers by name so neither auto-configuration wins by ordering. PostgreSQL work runs on
 * {@link TransactionManagers#JPA}; graph work on {@link TransactionManagers#NEO4J}. There is deliberately no chained
 * manager: cross-store flows commit PostgreSQL first and keep their existing compensation steps.
 */
@Configuration(proxyBeanMethods = false)
@Profile("!starter")
@EntityScan(basePackages = "com.adaptlearngraph.entities")
@EnableJpaRepositories(basePackages = "com.adaptlearngraph.repository",
        entityManagerFactoryRef = "entityManagerFactory", transactionManagerRef = TransactionManagers.JPA)
@EnableNeo4jRepositories(basePackages = "com.adaptlearngraph.repository",
        transactionManagerRef = TransactionManagers.NEO4J)
public class PersistenceConfiguration {

    @Bean(TransactionManagers.JPA)
    @Primary
    JpaTransactionManager transactionManager(EntityManagerFactory entityManagerFactory,
            ObjectProvider<TransactionManagerCustomizers> customizers) {
        var manager = new JpaTransactionManager(entityManagerFactory);
        customizers.ifAvailable(customizer -> customizer.customize(manager));
        return manager;
    }

    @Bean(TransactionManagers.NEO4J)
    Neo4jTransactionManager neo4jTransactionManager(Driver driver, ObjectProvider<DatabaseSelectionProvider> databases) {
        return Neo4jTransactionManager.with(driver)
                .withDatabaseSelectionProvider(databases.getIfAvailable(DatabaseSelectionProvider::getDefaultSelectionProvider))
                .build();
    }

    @Bean
    PostgresAdvisoryLocks postgresAdvisoryLocks(EntityManager entityManager) {
        return new PostgresAdvisoryLocks(entityManager);
    }

    @Bean
    com.adaptlearngraph.repository.PlatformAdministratorSeeds platformAdministratorSeeds(
            com.adaptlearngraph.repository.AccountJpaRepository accounts,
            com.adaptlearngraph.repository.PlatformAdministratorJpaRepository administrators,
            com.adaptlearngraph.repository.AuditEventJpaRepository audit, PostgresAdvisoryLocks locks) {
        return new com.adaptlearngraph.repository.PlatformAdministratorSeeds(accounts, administrators, audit, locks);
    }

    @Bean
    com.adaptlearngraph.repository.SubscriptionRepositories subscriptionRepositories(
            org.springframework.beans.factory.ListableBeanFactory beans, PostgresAdvisoryLocks locks) {
        return new com.adaptlearngraph.repository.SubscriptionRepositories(
                beans.getBean(com.adaptlearngraph.repository.OrganizationJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.OrganizationWorkspaceJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.OrganizationMembershipJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.OrganizationMembershipRoleJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.AccountJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.PlatformAdministratorJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.WorkspaceAccountProfileJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.LearnerStateJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.DepartmentReferenceJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.OrganizationRegistrationJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.RegistrationCatalogSelectionJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.WorkspaceCatalogImportJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.SubscriptionJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.SubscriptionPeriodJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.SubscriptionIntentJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.PaymentOrderJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.PaymentObservationJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.PaymentApplicationJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.SubscriptionPlanJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.SubscriptionPlanVersionJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.OutboxEventJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.ProcessingJobJpaRepository.class),
                beans.getBean(com.adaptlearngraph.repository.AuditEventJpaRepository.class), locks);
    }
}
