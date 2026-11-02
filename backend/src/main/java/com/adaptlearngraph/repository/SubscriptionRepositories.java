package com.adaptlearngraph.repository;

/** Spring Data repositories used by the subscription, workspace and payment adapters. */
public record SubscriptionRepositories(OrganizationJpaRepository organizations, OrganizationWorkspaceJpaRepository workspaces,
                                       OrganizationMembershipJpaRepository memberships,
                                       OrganizationMembershipRoleJpaRepository roles, AccountJpaRepository accounts,
                                       PlatformAdministratorJpaRepository platformAdministrators,
                                       WorkspaceAccountProfileJpaRepository profiles, LearnerStateJpaRepository learners,
                                       DepartmentReferenceJpaRepository references,
                                       OrganizationRegistrationJpaRepository registrations,
                                       RegistrationCatalogSelectionJpaRepository catalogSelections,
                                       WorkspaceCatalogImportJpaRepository catalogImports,
                                       SubscriptionJpaRepository subscriptions, SubscriptionPeriodJpaRepository periods,
                                       SubscriptionIntentJpaRepository intents, PaymentOrderJpaRepository orders,
                                       PaymentObservationJpaRepository observations,
                                       PaymentApplicationJpaRepository applications, SubscriptionPlanJpaRepository plans,
                                       SubscriptionPlanVersionJpaRepository planVersions, OutboxEventJpaRepository outbox,
                                       ProcessingJobJpaRepository jobs, AuditEventJpaRepository audit,
                                       PostgresAdvisoryLocks locks) {
}
