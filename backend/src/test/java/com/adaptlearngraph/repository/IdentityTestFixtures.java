package com.adaptlearngraph.repository;

import com.adaptlearngraph.support.JpaTestContext;
import jakarta.persistence.EntityManager;

/** Builds the JPA identity adapters from a {@link JpaTestContext} exactly as the application configuration does. */
public final class IdentityTestFixtures {
    private IdentityTestFixtures() {
    }

    public static JpaWorkspaceIdentityStore identityStore(JpaTestContext context) {
        return new JpaWorkspaceIdentityStore(context.bean(AccountJpaRepository.class),
                context.bean(OrganizationMembershipRoleJpaRepository.class), context.bean(PlatformAdministratorJpaRepository.class),
                context.bean(OrganizationRegistrationJpaRepository.class), context.bean(WorkspaceAccountProfileJpaRepository.class),
                RegistrationPostgresIntegrationTest.registrationStore(context));
    }

    public static PlatformAdministratorSeeds platformSeeds(JpaTestContext context) {
        return new PlatformAdministratorSeeds(context.bean(AccountJpaRepository.class),
                context.bean(PlatformAdministratorJpaRepository.class), context.bean(AuditEventJpaRepository.class),
                new PostgresAdvisoryLocks(context.bean(EntityManager.class)));
    }

    public static SubscriptionRepositories subscriptionRepositories(JpaTestContext c) {
        return new SubscriptionRepositories(c.bean(OrganizationJpaRepository.class), c.bean(OrganizationWorkspaceJpaRepository.class),
                c.bean(OrganizationMembershipJpaRepository.class), c.bean(OrganizationMembershipRoleJpaRepository.class),
                c.bean(AccountJpaRepository.class), c.bean(PlatformAdministratorJpaRepository.class),
                c.bean(WorkspaceAccountProfileJpaRepository.class), c.bean(LearnerStateJpaRepository.class),
                c.bean(DepartmentReferenceJpaRepository.class), c.bean(OrganizationRegistrationJpaRepository.class),
                c.bean(RegistrationCatalogSelectionJpaRepository.class), c.bean(WorkspaceCatalogImportJpaRepository.class),
                c.bean(SubscriptionJpaRepository.class), c.bean(SubscriptionPeriodJpaRepository.class),
                c.bean(SubscriptionIntentJpaRepository.class), c.bean(PaymentOrderJpaRepository.class),
                c.bean(PaymentObservationJpaRepository.class), c.bean(PaymentApplicationJpaRepository.class),
                c.bean(SubscriptionPlanJpaRepository.class), c.bean(SubscriptionPlanVersionJpaRepository.class),
                c.bean(OutboxEventJpaRepository.class), c.bean(ProcessingJobJpaRepository.class), c.bean(AuditEventJpaRepository.class),
                new PostgresAdvisoryLocks(c.bean(EntityManager.class)));
    }

    public static org.springframework.transaction.support.TransactionTemplate jpaTransactions(JpaTestContext context) {
        return new org.springframework.transaction.support.TransactionTemplate(context.transactionManager());
    }
}
