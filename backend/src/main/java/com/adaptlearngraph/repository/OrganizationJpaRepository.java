package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.OrganizationEntity;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface OrganizationJpaRepository extends Repository<OrganizationEntity, UUID>, InsertOnlyRepository<OrganizationEntity> {
    record Access(String status, String setupState, Boolean paid) {}

    record Listed(UUID organizationId, String name, String status, String setupState) {}

    /** Serializes membership changes of one organization (former {@code SELECT ... FOR UPDATE}). */
    @Query(value = "SELECT organization_id FROM platform.organization WHERE organization_id = :organizationId FOR UPDATE",
            nativeQuery = true)
    Optional<UUID> lock(@Param("organizationId") UUID organizationId);

    @Query("select o.status from OrganizationEntity o where o.organizationId = :organizationId")
    Optional<String> status(@Param("organizationId") UUID organizationId);

    @Query("select o.name from OrganizationEntity o where o.organizationId = :organizationId")
    Optional<String> name(@Param("organizationId") UUID organizationId);

    /** Organization status, workspace readiness and whether a paid period covers {@code now}. */
    @Query("""
            select new com.adaptlearngraph.repository.OrganizationJpaRepository$Access(o.status, w.setupState,
                case when exists (select 1 from SubscriptionEntity s join SubscriptionPeriodEntity p on p.subscriptionId = s.subscriptionId
                    where s.organizationId = o.organizationId and p.startsAt <= :now and p.endsAt > :now) then true else false end)
            from OrganizationEntity o left join OrganizationWorkspaceEntity w on w.organizationId = o.organizationId
            where o.organizationId = :organizationId
            """)
    Optional<Access> access(@Param("organizationId") UUID organizationId, @Param("now") Instant now);

    @Query("""
            select new com.adaptlearngraph.repository.OrganizationJpaRepository$Listed(o.organizationId, o.name, o.status, w.setupState)
            from OrganizationEntity o join OrganizationWorkspaceEntity w on w.organizationId = o.organizationId
            order by o.createdAt desc
            """)
    List<Listed> withWorkspaces();

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update OrganizationEntity o set o.status = :status where o.organizationId = :organizationId")
    int setStatus(@Param("organizationId") UUID organizationId, @Param("status") String status);
}
