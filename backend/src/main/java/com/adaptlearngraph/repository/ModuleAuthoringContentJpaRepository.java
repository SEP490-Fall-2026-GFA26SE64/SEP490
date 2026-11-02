package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.ModuleAuthoringContentEntity;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Organization-scoped, insert-only authoring content snapshots. */
public interface ModuleAuthoringContentJpaRepository extends Repository<ModuleAuthoringContentEntity, ModuleAuthoringContentEntity.Key>,
        InsertOnlyRepository<ModuleAuthoringContentEntity> {

    @Query("select c.document from ModuleAuthoringContentEntity c where c.organizationId = :organization order by c.contentId")
    List<String> documents(@Param("organization") String organizationId);
}
