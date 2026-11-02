package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.CatalogGuardEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Published PostgreSQL catalog references behind the open catalog guard. */
public interface CatalogGuardJpaRepository extends Repository<CatalogGuardEntity, Integer> {

    @Query("""
            select reference.catalogRefId from CatalogGuardEntity guard
            join CatalogReferenceEntity reference on reference.releaseId = guard.releaseId
            where guard.guardId = 1 and guard.state = 'OPEN' and reference.kind = 'TARGET_ROLE' and reference.entityId = :role
            order by reference.confirmedAt desc, reference.catalogRefId
            """)
    List<UUID> openTargetRoleReferences(@Param("role") UUID roleId, Pageable limit);
}
