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

    /** Native JSON revision projection: bounded released candidates from the original authoring owner, not a second module catalog. */
    @Query(value="""
            SELECT m.document::text FROM platform.module_authoring m
            CROSS JOIN LATERAL jsonb_array_elements(m.document->'revisions') r
            WHERE m.organization_id=:organization AND coalesce((m.document->>'archived')::boolean,false)=false
                AND (r->>'number')::integer=(m.document->>'releasedRevision')::integer AND r->>'state'='RELEASED'
                AND r->'payload'->>'knowledgeLevel' IS NOT NULL
                AND EXISTS (SELECT 1 FROM jsonb_array_elements(r->'payload'->'teachings') t WHERE t->>'skillId' IN (:skills))
            ORDER BY m.module_id LIMIT :maximum
            """,nativeQuery=true)
    List<String> releasedCandidates(@Param("organization") String organizationId,@Param("skills") java.util.Collection<String> skills,@Param("maximum") int maximum);
    @Query(value="""
            WITH retained AS (
                SELECT module_id,revision FROM platform.module_learning_pin WHERE organization_id=:organization AND learner_id=:learner
                UNION
                SELECT c.module_id,c.revision FROM platform.learning_module_completion c
                JOIN platform.learning_completion_requirement proof ON proof.organization_id=c.organization_id AND proof.learner_id=c.learner_id AND proof.module_id=c.module_id AND proof.revision=c.revision
                WHERE c.organization_id=:organization AND c.learner_id=:learner
            )
            SELECT m.document::text,p.revision FROM retained p
            JOIN platform.module_authoring m ON m.organization_id=:organization AND m.module_id=p.module_id
            CROSS JOIN LATERAL jsonb_array_elements(m.document->'revisions') r
            WHERE coalesce((m.document->>'archived')::boolean,false)=false
                AND (r->>'number')::integer=p.revision AND r->>'state'='RELEASED'
                AND (m.module_id IN (SELECT jsonb_array_elements_text(CAST(:currentModules AS jsonb)))
                    OR EXISTS (SELECT 1 FROM jsonb_array_elements(r->'payload'->'teachings') t WHERE t->>'skillId' IN (:skills)))
            ORDER BY m.module_id,p.revision LIMIT :maximum
            """,nativeQuery=true)
    List<Object[]> retainedCandidates(@Param("organization") String organizationId,@Param("learner") String learnerId,
            @Param("skills") java.util.Collection<String> skills,@Param("currentModules") String currentModules,@Param("maximum") int maximum);

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
