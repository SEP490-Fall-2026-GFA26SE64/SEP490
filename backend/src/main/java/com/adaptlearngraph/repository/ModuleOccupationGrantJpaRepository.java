package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.ModuleOccupationGrantEntity;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Organization-scoped Expert authoring grants per occupation. */
public interface ModuleOccupationGrantJpaRepository
        extends Repository<ModuleOccupationGrantEntity, ModuleOccupationGrantEntity.Key> {

    @Query("select g.occupationId from ModuleOccupationGrantEntity g"
            + " where g.organizationId = :organization and g.expertId = :expert and g.active = true")
    List<String> activeOccupations(@Param("organization") String organizationId, @Param("expert") String expertId);

    @Query("select new com.adaptlearngraph.entities.ModuleAuthoring$Grant(g.expertId, g.occupationId)"
            + " from ModuleOccupationGrantEntity g where g.organizationId = :organization and g.active = true"
            + " order by g.expertId, g.occupationId")
    List<com.adaptlearngraph.entities.ModuleAuthoring.Grant> activeGrants(@Param("organization") String organizationId);

    // Native: INSERT ... ON CONFLICT DO UPDATE upsert of the grant flag.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "INSERT INTO platform.module_occupation_grant VALUES (:organization, :expert, :occupation, :active)"
            + " ON CONFLICT (organization_id, expert_id, occupation_id) DO UPDATE SET active = EXCLUDED.active",
            nativeQuery = true)
    int save(@Param("organization") String organizationId, @Param("expert") String expertId,
            @Param("occupation") String occupationId, @Param("active") boolean active);
}
