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
}
