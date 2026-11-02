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
public interface OrganizationWorkspaceJpaRepository extends Repository<OrganizationWorkspaceEntity, UUID> {
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
}
