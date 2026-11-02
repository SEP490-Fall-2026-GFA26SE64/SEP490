package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.OrganizationWorkspaceEntity;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Workspace setup state transitions; always conditional on the organization and the PROVISIONING state. */
public interface OrganizationWorkspaceJpaRepository extends Repository<OrganizationWorkspaceEntity, UUID>, InsertOnlyRepository<OrganizationWorkspaceEntity> {
    /** Becomes READY only when the organization already has a paid subscription period. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update OrganizationWorkspaceEntity w set w.setupState = 'READY', w.readyAt = coalesce(w.readyAt, :now),
                w.failureCode = null
            where w.organizationId = :organization and w.setupState = 'PROVISIONING'
              and exists (select 1 from SubscriptionEntity s join SubscriptionPeriodEntity p on p.subscriptionId = s.subscriptionId
                          where s.organizationId = :organization)
            """)
    int markReadyIfSubscribed(@Param("organization") UUID organizationId, @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update OrganizationWorkspaceEntity w set w.setupState = 'FAILED', w.failureCode = :failure
            where w.organizationId = :organization and w.setupState = 'PROVISIONING'
            """)
    int markFailed(@Param("organization") UUID organizationId, @Param("failure") String failureCode);

    record Setup(UUID organizationId, String setupState, Instant readyAt, String failureCode) {}

    @Query("select new com.adaptlearngraph.repository.OrganizationWorkspaceJpaRepository$Setup(w.organizationId, w.setupState, w.readyAt, w.failureCode) from OrganizationWorkspaceEntity w where w.registrationId = :registration")
    java.util.Optional<Setup> setupOf(@Param("registration") UUID registrationId);

    @Query("select w.slug from OrganizationWorkspaceEntity w where w.organizationId = :organization")
    java.util.Optional<String> slug(@Param("organization") UUID organizationId);

    @Query("select count(w) > 0 from OrganizationWorkspaceEntity w where w.organizationId = :organization and w.setupState = 'READY'")
    boolean ready(@Param("organization") UUID organizationId);

    /** After a paid period is applied: READY unless a catalog import of the organization is still unfinished. */
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.transaction.annotation.Transactional(com.adaptlearngraph.constants.TransactionManagers.JPA)
    @Query("""
            update OrganizationWorkspaceEntity w set w.setupState = 'READY', w.readyAt = coalesce(w.readyAt, :now), w.failureCode = null
            where w.organizationId = :organization and w.setupState <> 'READY'
              and not exists (select 1 from WorkspaceCatalogImportEntity c where c.organizationId = w.organizationId and c.state <> 'SUCCEEDED')
            """)
    int markReadyIfCatalogCopied(@Param("organization") UUID organizationId, @Param("now") Instant now);}
