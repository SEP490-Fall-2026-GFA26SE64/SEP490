package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.LearningModuleNode;
import java.util.List;
import java.util.Map;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Writes of {@code :LearningModule} and its {@code TEACHES} edges. Callers run the tenant guard first in the same
 * {@code neo4jTransactionManager} transaction; list/detail reads aggregate taught skills with legacy defaults and run
 * through {@code Neo4jClient}. No unscoped CRUD is exposed.
 */
public interface LearningModuleNodeRepository extends Repository<LearningModuleNode, String> {

    // Legacy module editor: distinct ON CREATE / ON MATCH sets and a full TEACHES replacement to same-organization skills.
    // Returns one row per linked skill (the module id), so the result is a list.
    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MERGE (mod:LearningModule {id: $id})
            ON CREATE SET
                mod.organizationId = $organizationId,
                mod.title = $title,
                mod.moduleType = $moduleType,
                mod.contentUri = $contentUri,
                mod.contentType = $contentType,
                mod.contentVersion = $contentVersion,
                mod.version = $version,
                mod.status = $status,
                mod.reviewStatus = $reviewStatus,
                mod.durationMinutes = $durationMinutes
            ON MATCH SET
                mod.title = $title,
                mod.moduleType = $moduleType,
                mod.contentUri = $contentUri,
                mod.contentType = $contentType,
                mod.contentVersion = $contentVersion,
                mod.version = $version,
                mod.status = $status,
                mod.reviewStatus = $reviewStatus,
                mod.durationMinutes = $durationMinutes
            WITH mod
            OPTIONAL MATCH (mod)-[oldRel:TEACHES]->(:MicroSkill)
            DELETE oldRel
            WITH mod
            UNWIND $teachesSkillIds AS skillId
            MATCH (s:MicroSkill {id: skillId})
            WHERE s.organizationId = $organizationId
            MERGE (mod)-[:TEACHES]->(s)
            RETURN mod.id AS id
            """)
    List<String> merge(@Param("id") String id, @Param("organizationId") String organizationId, @Param("title") String title,
            @Param("moduleType") String moduleType, @Param("contentUri") String contentUri,
            @Param("contentType") String contentType, @Param("contentVersion") String contentVersion,
            @Param("version") String version, @Param("status") String status, @Param("reviewStatus") String reviewStatus,
            @Param("durationMinutes") int durationMinutes, @Param("teachesSkillIds") List<String> teachesSkillIds);

    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MATCH (m:LearningModule {id: $id})
            WHERE m.organizationId = $organizationId
            DETACH DELETE m
            """)
    void detachDelete(@Param("organizationId") String organizationId, @Param("id") String id);

    // Takes the node's write lock before the publication snapshot comparison (no-op SET).
    @Transactional(TransactionManagers.NEO4J)
    @Query("MATCH (m:LearningModule {id:$id}) SET m.id=m.id")
    void lockForPublication(@Param("id") String id);

    // Replaces the whole property map (SET m=$props), then restores the owning organization.
    @Transactional(TransactionManagers.NEO4J)
    @Query("MERGE (m:LearningModule {id:$id}) SET m=$props, m.organizationId=$organization")
    void replaceProperties(@Param("id") String id, @Param("props") Map<String, Object> properties,
            @Param("organization") String organizationId);

    @Transactional(TransactionManagers.NEO4J)
    @Query("MATCH (m:LearningModule {id:$id})-[t:TEACHES]->(s:MicroSkill) WHERE NOT s.id IN $ids DELETE t")
    void deleteTeachingsExcept(@Param("id") String id, @Param("ids") List<String> skillIds);

    // Both endpoints are matched under the same organization before the TEACHES edge is merged.
    @Transactional(TransactionManagers.NEO4J)
    @Query("MATCH (m:LearningModule {id:$id}) WHERE m.organizationId=$organization UNWIND $teachings AS item "
            + "MATCH (s:MicroSkill {id:item.skillId}) WHERE s.organizationId=$organization MERGE (m)-[t:TEACHES]->(s) SET t=item.props")
    void mergeTeachings(@Param("id") String id, @Param("teachings") List<Map<String, Object>> teachings,
            @Param("organization") String organizationId);
}
