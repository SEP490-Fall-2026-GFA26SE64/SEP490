package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.OrganizationEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface OrganizationJpaRepository extends Repository<OrganizationEntity, UUID> {
    /** Serializes membership changes of one organization (former {@code SELECT ... FOR UPDATE}). */
    @Query(value = "SELECT organization_id FROM platform.organization WHERE organization_id = :organizationId FOR UPDATE",
            nativeQuery = true)
    Optional<UUID> lock(@Param("organizationId") UUID organizationId);

    @Query("select o.status from OrganizationEntity o where o.organizationId = :organizationId")
    Optional<String> status(@Param("organizationId") UUID organizationId);
}
