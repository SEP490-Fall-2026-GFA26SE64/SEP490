package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.ModuleJobPositionGrantEntity;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Organization-scoped Expert authoring grants per jobPosition. */
public interface ModuleJobPositionGrantJpaRepository
        extends Repository<ModuleJobPositionGrantEntity, ModuleJobPositionGrantEntity.Key> {

    @Query("select g.jobPositionId from ModuleJobPositionGrantEntity g"
            + " where g.organizationId = :organization and g.expertId = :expert and g.active = true")
    List<String> activeJobPositions(@Param("organization") String organizationId, @Param("expert") String expertId);

    @Query("select new com.adaptlearngraph.entities.domain.ModuleAuthoring$Grant(g.expertId, g.jobPositionId)"
            + " from ModuleJobPositionGrantEntity g where g.organizationId = :organization and g.active = true"
            + " order by g.expertId, g.jobPositionId")
    List<com.adaptlearngraph.entities.domain.ModuleAuthoring.Grant> activeGrants(@Param("organization") String organizationId);

    // Native: INSERT ... ON CONFLICT DO UPDATE upsert of the grant flag.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "INSERT INTO platform.module_job_position_grant VALUES (:organization, :expert, :jobPosition, :active)"
            + " ON CONFLICT (organization_id, expert_id, job_position_id) DO UPDATE SET active = EXCLUDED.active",
            nativeQuery = true)
    int save(@Param("organization") String organizationId, @Param("expert") String expertId,
            @Param("jobPosition") String jobPositionId, @Param("active") boolean active);
}
