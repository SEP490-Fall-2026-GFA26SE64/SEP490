package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.MicroSkillNode;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Organization-scoped access to {@code :MicroSkill} and the skill-to-skill prerequisite relationships. Reads that join the
 * owning MacroCompetency or return whole prerequisite edges run through {@code Neo4jClient}; no unscoped CRUD is exposed.
 */
public interface MicroSkillNodeRepository extends Repository<MicroSkillNode, String> {

    boolean existsByOrganizationIdAndCode(String organizationId, String code);

    // MERGE with ON CREATE / ON MATCH sets plus re-pointing the single owning MacroCompetency (same organization).
    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MERGE (s:MicroSkill {id: $id})
            ON CREATE SET
                s.organizationId = $organizationId,
                s.code = $code,
                s.name = $name,
                s.description = $description,
                s.definition = $description,
                s.macroCompetencyCode = $macroCompetencyCode,
                s.status = $status,
                s.version = '0.10.0',
                s.reviewStatus = 'APPROVED',
                s.createdAt = datetime($createdAt),
                s.updatedAt = datetime($updatedAt)
            ON MATCH SET
                s.name = $name,
                s.description = $description,
                s.definition = $description,
                s.macroCompetencyCode = $macroCompetencyCode,
                s.status = $status,
                s.updatedAt = datetime($updatedAt)
            WITH s
            OPTIONAL MATCH (oldMacro:MacroCompetency)-[oldRel:HAS_SKILL]->(s)
            WHERE oldMacro.code <> $macroCompetencyCode OR coalesce(oldMacro.organizationId, '') <> $organizationId
            DELETE oldRel
            WITH s
            MERGE (macro:MacroCompetency {code: $macroCompetencyCode, organizationId: $organizationId})
            ON CREATE SET macro.id = randomUUID(), macro.name = $macroCompetencyCode,
                macro.status = 'ACTIVE', macro.createdAt = datetime(), macro.updatedAt = datetime()
            MERGE (macro)-[rel:HAS_SKILL]->(s)
            ON CREATE SET rel.status = 'ACTIVE', rel.createdAt = datetime(), rel.updatedAt = datetime()
            """)
    void merge(@Param("id") String id, @Param("organizationId") String organizationId, @Param("code") String code,
            @Param("name") String name, @Param("description") String description,
            @Param("macroCompetencyCode") String macroCompetencyCode, @Param("status") String status,
            @Param("createdAt") String createdAt, @Param("updatedAt") String updatedAt);

    // Aggregate over four optional relationship patterns.
    @Query("""
            MATCH (s:MicroSkill {id: $id})
            WHERE s.organizationId = $organizationId
            OPTIONAL MATCH (role:TargetRole)-[r:REQUIRES_SKILL]->(s)
            OPTIONAL MATCH (s)-[p1:HAS_SKILL_PREREQUISITE|PREREQUISITE_OF]->()
            OPTIONAL MATCH ()-[p2:HAS_SKILL_PREREQUISITE|PREREQUISITE_OF]->(s)
            OPTIONAL MATCH (:LearningModule)-[t:TEACHES]->(s)
            RETURN count(r) + count(p1) + count(p2) + count(t) AS totalDeps
            """)
    Long countDependencies(@Param("id") String id, @Param("organizationId") String organizationId);

    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MATCH (s:MicroSkill {id: $id})
            WHERE s.organizationId = $organizationId
            DETACH DELETE s
            """)
    void detachDelete(@Param("organizationId") String organizationId, @Param("id") String id);

    // Variable-length path over two relationship types; endpoints are matched by id or code inside one organization.
    @Query("""
            MATCH (source:MicroSkill), (target:MicroSkill)
            WHERE source.organizationId = $organizationId AND target.organizationId = $organizationId
              AND (source.id = $fromSkillId OR source.code = $fromSkillId)
              AND (target.id = $toSkillId OR target.code = $toSkillId)
            MATCH p = (source)-[:HAS_SKILL_PREREQUISITE|PREREQUISITE_OF*1..25]->(target)
            RETURN count(p) > 0 AS hasPath
            """)
    Boolean hasPrerequisitePath(@Param("organizationId") String organizationId,
            @Param("fromSkillId") String fromSkillId, @Param("toSkillId") String toSkillId);

    // Relationship delete: both endpoints must belong to the requesting organization.
    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MATCH (source:MicroSkill)-[rel:HAS_SKILL_PREREQUISITE|PREREQUISITE_OF]->(target:MicroSkill)
            WHERE source.organizationId = $organizationId AND target.organizationId = $organizationId
              AND (source.id = $sourceSkillId OR source.code = $sourceSkillId)
              AND (target.id = $targetSkillId OR target.code = $targetSkillId)
            DELETE rel
            """)
    void deletePrerequisite(@Param("organizationId") String organizationId,
            @Param("sourceSkillId") String sourceSkillId, @Param("targetSkillId") String targetSkillId);
}