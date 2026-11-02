package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.CompetencyNode;
import java.util.List;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Organization-scoped writes of {@code :Competency} and its {@code HAS_COMPETENCY}/{@code HAS_SKILL} relationships. Reads
 * aggregate the owning level/role and member skills and run through {@code Neo4jClient} in
 * {@link Neo4jCompetencyRepository}; no unscoped CRUD is exposed.
 */
public interface CompetencyNodeRepository extends Repository<CompetencyNode, String> {

    // MERGE with distinct ON CREATE / ON MATCH sets (organizationId, version and reviewStatus only on create).
    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MERGE (c:Competency {id: $id})
            ON CREATE SET c.organizationId = $organizationId,
                          c.code = $code,
                          c.name = $name,
                          c.description = $description,
                          c.attainmentRule = $attainmentRule,
                          c.status = $status,
                          c.version = $version,
                          c.reviewStatus = 'APPROVED'
            ON MATCH SET c.code = $code,
                         c.name = $name,
                         c.description = $description,
                         c.attainmentRule = $attainmentRule,
                         c.status = $status
            """)
    void merge(@Param("id") String id, @Param("organizationId") String organizationId, @Param("code") String code,
            @Param("name") String name, @Param("description") String description,
            @Param("attainmentRule") String attainmentRule, @Param("status") String status,
            @Param("version") String version);

    // Relationship write: both endpoints must belong to the same organization.
    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MATCH (l:Level {id: $levelId}), (c:Competency {id: $compId})
            WHERE l.organizationId = $organizationId AND c.organizationId = $organizationId
            MERGE (l)-[r:HAS_COMPETENCY]->(c)
            ON CREATE SET r.status = 'ACTIVE', r.version = '0.11.0'
            """)
    void linkLevel(@Param("levelId") String levelId, @Param("compId") String competencyId,
            @Param("organizationId") String organizationId);

    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MATCH (c:Competency {id: $id})-[r:HAS_SKILL]->(:MicroSkill)
            WHERE c.organizationId = $organizationId
            DELETE r
            """)
    void unlinkAllSkills(@Param("id") String id, @Param("organizationId") String organizationId);

    // Skills are referenced by id or code.
    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MATCH (c:Competency {id: $id})-[r:HAS_SKILL]->(s:MicroSkill)
            WHERE c.organizationId = $organizationId
              AND NOT (s.id IN $skillIds OR coalesce(s.code, '') IN $skillIds)
            DELETE r
            """)
    void unlinkSkillsExcept(@Param("id") String id, @Param("skillIds") List<String> skillIds,
            @Param("organizationId") String organizationId);

    // Relationship write: UNWIND batch, both endpoints matched inside the same organization before MERGE.
    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            UNWIND $skillIds AS sid
            MATCH (c:Competency {id: $id}) WHERE c.organizationId = $organizationId
            MATCH (s:MicroSkill) WHERE s.organizationId = $organizationId AND (s.id = sid OR coalesce(s.code, '') = sid)
            WITH DISTINCT c, s
            MERGE (c)-[r:HAS_SKILL]->(s)
            ON CREATE SET r.status = 'ACTIVE', r.version = '0.11.0'
            """)
    void linkSkills(@Param("id") String id, @Param("skillIds") List<String> skillIds,
            @Param("organizationId") String organizationId);

    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MATCH (c:Competency {id: $id})
            WHERE c.organizationId = $organizationId
            DETACH DELETE c
            """)
    void detachDelete(@Param("organizationId") String organizationId, @Param("id") String id);
}