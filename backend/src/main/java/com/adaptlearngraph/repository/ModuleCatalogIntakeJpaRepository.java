package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.ModuleCatalogIntakeEntity;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Catalog intake assignments. Listing and upserts are organization-scoped; {@link #exists(String)} is a global identity
 * probe because module_catalog_intake.module_id is the primary key across organizations.
 */
public interface ModuleCatalogIntakeJpaRepository extends Repository<ModuleCatalogIntakeEntity, String> {

    @Query("select i.document from ModuleCatalogIntakeEntity i where i.organizationId = :organization order by i.moduleId")
    List<String> documents(@Param("organization") String organizationId);

    /** Whether the globally unique module code already has an intake (no document data is returned). */
    @Query("select count(i) > 0 from ModuleCatalogIntakeEntity i where i.moduleId = :module")
    boolean exists(@Param("module") String moduleId);

    // Native: INSERT ... ON CONFLICT DO UPDATE ... WHERE (only the owning organization may replace its intake).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "INSERT INTO platform.module_catalog_intake VALUES (:module, :organization, CAST(:document AS jsonb))"
            + " ON CONFLICT (module_id) DO UPDATE SET document = EXCLUDED.document"
            + " WHERE module_catalog_intake.organization_id = EXCLUDED.organization_id", nativeQuery = true)
    int save(@Param("module") String moduleId, @Param("organization") String organizationId,
            @Param("document") String document);
}
