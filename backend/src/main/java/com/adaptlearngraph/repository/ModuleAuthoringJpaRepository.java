package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.ModuleAuthoringEntity;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Module authoring documents. Reads and writes are organization-scoped; {@link #moduleIds()} is the deliberate
 * exception because module_id is globally unique and import checks must reject codes used by any organization.
 */
public interface ModuleAuthoringJpaRepository extends Repository<ModuleAuthoringEntity, ModuleAuthoringEntity.Key> {

    @Query("select m.document from ModuleAuthoringEntity m where m.organizationId = :organization")
    List<String> documents(@Param("organization") String organizationId);

    /** Global module code identity (no document data); module_authoring.module_id is UNIQUE across organizations. */
    @Query("select m.moduleId from ModuleAuthoringEntity m")
    List<String> moduleIds();

    // Native: row lock (FOR UPDATE) on the document read as a scalar.
    @Query(value = "SELECT document::text FROM platform.module_authoring WHERE organization_id = :organization"
            + " AND module_id = :module FOR UPDATE", nativeQuery = true)
    List<String> lockDocument(@Param("organization") String organizationId, @Param("module") String moduleId);

    // Native: INSERT ... ON CONFLICT DO UPDATE upsert.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "INSERT INTO platform.module_authoring VALUES (:organization, :module, CAST(:document AS jsonb))"
            + " ON CONFLICT (organization_id, module_id) DO UPDATE SET document = EXCLUDED.document", nativeQuery = true)
    int saveDocument(@Param("organization") String organizationId, @Param("module") String moduleId,
            @Param("document") String document);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("delete from ModuleAuthoringEntity m where m.organizationId = :organization and m.moduleId = :module")
    int deleteDocument(@Param("organization") String organizationId, @Param("module") String moduleId);

    // Native: jsonb_array_elements set-returning function in a LATERAL join over the revision history.
    @Query(value = """
            SELECT m.module_id, r.payload->>'title' FROM platform.module_authoring m
            CROSS JOIN LATERAL (SELECT value->'payload' AS payload FROM jsonb_array_elements(m.document->'revisions')
                WHERE (value->>'number')::integer = (m.document->>'releasedRevision')::integer) r
            WHERE m.organization_id = :organization AND coalesce((m.document->>'archived')::boolean, false) = false
            ORDER BY r.payload->>'title'
            """, nativeQuery = true)
    List<Object[]> releasedModules(@Param("organization") String organizationId);
}
