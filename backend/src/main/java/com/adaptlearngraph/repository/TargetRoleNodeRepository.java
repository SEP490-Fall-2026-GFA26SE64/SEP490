package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.TargetRoleNode;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Organization-scoped access to {@code :TargetRole} and its {@code REQUIRES_SKILL} relationships. Reads that also collect
 * the required skills (or use dynamic filters) run through {@code Neo4jClient} in {@link Neo4jTargetRoleRepository}; no
 * unscoped CRUD is exposed.
 */
public interface TargetRoleNodeRepository extends Repository<TargetRoleNode, String> {

    // A role is addressed by its graph code or by the base code shared by all its versions.
    @Query("""
            MATCH (r:TargetRole)
            WHERE r.organizationId = $organizationId AND (r.code = $code OR r.baseCode = $code)
            RETURN count(r) > 0 AS exists
            """)
    boolean existsByCode(@Param("organizationId") String organizationId, @Param("code") String code);

    // Missing versions count as '1.0'.
    @Query("""
            MATCH (r:TargetRole)
            WHERE r.organizationId = $organizationId
              AND (r.code = $code OR r.baseCode = $code)
              AND coalesce(r.version, '1.0') = $version
            RETURN count(r) > 0 AS exists
            """)
    boolean existsByCodeAndVersion(@Param("organizationId") String organizationId, @Param("code") String code,
            @Param("version") String version);

    // Resolves a client-side alias (id, code or baseCode+version) to the persisted, non-superseded node id.
    @Query("""
            MATCH (existing:TargetRole)
            WHERE existing.organizationId = $organizationId
              AND (existing.id = $id OR existing.code = $id OR (existing.baseCode = $rawCode AND coalesce(existing.version, '1.0') = $version))
              AND coalesce(existing.status, 'ACTIVE') <> 'SUPERSEDED'
            RETURN existing.id AS existingId LIMIT 1
            """)
    Optional<String> findPersistedId(@Param("organizationId") String organizationId, @Param("id") String id,
            @Param("rawCode") String rawCode, @Param("version") String version);

    // Deliberately NOT organization-scoped: the target_role_code uniqueness constraint is global, so a code held by any
    // other node forces a tenant/version suffix. Only a count is returned; no foreign data leaves the query.
    @Query("""
            MATCH (r:TargetRole)
            WHERE r.code = $code AND r.id <> $roleId
            RETURN count(r) AS count
            """)
    long countCodeHolders(@Param("code") String code, @Param("roleId") String roleId);

    // MERGE with distinct ON CREATE / ON MATCH sets (organizationId and createdAt only on create).
    // Note: r.levels property is strictly removed from TargetRole node; levels are stored in :Level nodes via :HAS_LEVEL.
    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MERGE (r:TargetRole {id: $id})
            ON CREATE SET
                r.organizationId = $organizationId,
                r.code = $graphCode,
                r.baseCode = $rawCode,
                r.name = $name,
                r.familyCode = $familyCode,
                r.track = $track,
                r.assignedExpertId = $assignedExpertId,
                r.description = $description,
                r.scope = coalesce($description, r.scope, ''),
                r.responsibilities = $responsibilities,
                r.status = $status,
                r.version = $version,
                r.skillTargets = $skillTargets,
                r.levelCompetencies = $levelCompetencies,
                r.competencyIds = $competencyIds,
                r.createdAt = datetime($createdAt),
                r.updatedAt = datetime($updatedAt),
                r.rejectionReason = $rejectionReason
            ON MATCH SET
                r.code = $graphCode,
                r.baseCode = $rawCode,
                r.name = $name,
                r.familyCode = $familyCode,
                r.track = $track,
                r.assignedExpertId = $assignedExpertId,
                r.description = $description,
                r.scope = coalesce($description, r.scope, ''),
                r.responsibilities = $responsibilities,
                r.status = $status,
                r.version = $version,
                r.skillTargets = $skillTargets,
                r.levelCompetencies = $levelCompetencies,
                r.competencyIds = $competencyIds,
                r.updatedAt = datetime($updatedAt),
                r.rejectionReason = $rejectionReason
            REMOVE r.levels
            """)
    void merge(@Param("id") String id, @Param("organizationId") String organizationId,
            @Param("graphCode") String graphCode, @Param("rawCode") String rawCode, @Param("name") String name,
            @Param("familyCode") String familyCode, @Param("track") String track,
            @Param("assignedExpertId") String assignedExpertId, @Param("description") String description,
            @Param("responsibilities") List<String> responsibilities, @Param("status") String status,
            @Param("version") String version, @Param("skillTargets") String skillTargets,
            @Param("levelCompetencies") String levelCompetencies,
            @Param("competencyIds") List<String> competencyIds, @Param("createdAt") String createdAt,
            @Param("updatedAt") String updatedAt, @Param("rejectionReason") String rejectionReason);

    // Publishing supersedes only previously released versions (ACTIVE / PUBLISHED / UNPUBLISHED) of the same role
    // lineage (base code or code). In-flight revisions (DRAFT / SENT / SUBMITTED / REJECTED) keep their own workflow,
    // and different roles that merely share a display name are never touched. $name is kept for signature stability.
    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MATCH (old:TargetRole)
            WHERE old.organizationId = $organizationId
              AND old.id <> $id
              AND ((old.baseCode IS NOT NULL AND old.baseCode = $rawCode) OR old.code = $rawCode OR old.code = $graphCode)
              AND coalesce(old.status, 'ACTIVE') IN ['ACTIVE', 'PUBLISHED', 'UNPUBLISHED']
              AND ($name IS NULL OR true)
            SET old.status = 'SUPERSEDED', old.updatedAt = datetime($updatedAt)
            """)
    void supersedeOtherVersions(@Param("organizationId") String organizationId, @Param("id") String id,
            @Param("name") String name, @Param("rawCode") String rawCode, @Param("graphCode") String graphCode,
            @Param("updatedAt") String updatedAt);

    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MATCH (r:TargetRole {id: $roleId})-[oldRel:REQUIRES_SKILL]->()
            WHERE r.organizationId = $organizationId
            DELETE oldRel
            """)
    void deleteRequiredSkills(@Param("roleId") String roleId, @Param("organizationId") String organizationId);

    // Relationship write: UNWIND batch, role and skill matched inside the same organization or template; one edge per level.
    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            UNWIND $skills AS item
            MATCH (r:TargetRole {id: $roleId}) WHERE r.organizationId = $organizationId
            MATCH (s:MicroSkill)
            WHERE (s.organizationId IS NULL OR s.organizationId = $organizationId)
              AND (s.id = item.skillId OR s.code = item.skillCode OR s.id = item.skillCode
                   OR toLower(s.id) = toLower(item.skillCode) OR toLower(s.code) = toLower(item.skillCode)
                   OR toLower(s.id) = toLower(item.skillId))
            MERGE (r)-[req:REQUIRES_SKILL {level: item.level}]->(s)
            ON CREATE SET req.createdAt = datetime($updatedAt)
            SET req.targetMastery = toFloat(item.threshold) / 100.0,
                req.status = 'ACTIVE',
                req.updatedAt = datetime($updatedAt)
            """)
    void mergeRequiredSkills(@Param("organizationId") String organizationId, @Param("roleId") String roleId,
            @Param("skills") List<Map<String, Object>> skills, @Param("updatedAt") String updatedAt);

    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MATCH (r:TargetRole)
            WHERE r.organizationId = $organizationId AND r.id = $id
            DETACH DELETE r
            """)
    void detachDelete(@Param("organizationId") String organizationId, @Param("id") String id);
}