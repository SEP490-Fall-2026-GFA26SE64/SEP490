package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.BaselineBlueprintVersionEntity;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Immutable fixed Blueprint versions with their role and micro-skill quotas. The JobPosition-only and identity-only reads
 * are legacy port methods; organization-scoped variants join the identity's organization.
 */
public interface BaselineBlueprintVersionJpaRepository
        extends Repository<BaselineBlueprintVersionEntity, BaselineBlueprintVersionEntity.Key>,
        InsertOnlyRepository<BaselineBlueprintVersionEntity> {

    record Header(UUID blueprintId, Integer version, String name, String jobPositionId, String jobPositionNameSnapshot,
                  UUID createdBy, String idempotencyKey, String requestHash, Instant createdAt) {}

    record Role(String roleId, String roleNameSnapshot, Boolean enabled, BigDecimal easyScoreWeight,
                BigDecimal mediumScoreWeight, BigDecimal hardScoreWeight) {}

    record Skill(String microSkillId, String microSkillNameSnapshot, Integer easyQuestionCount, Integer mediumQuestionCount,
                 Integer hardQuestionCount) {}

    record Key(UUID blueprintId, Integer version) {}

    String HEADER = """
            select new com.adaptlearngraph.repository.BaselineBlueprintVersionJpaRepository$Header(version.blueprintId,
                version.version, version.name, version.jobPositionId, version.jobPositionNameSnapshot, version.createdBy,
                version.idempotencyKey, version.requestHash, version.createdAt)
            from BaselineBlueprintVersionEntity version
            join BaselineBlueprintEntity identity on identity.blueprintId = version.blueprintId
            where version.blueprintId = :blueprintId and version.version = :version
            """;

    @Query("select max(version.version) from BaselineBlueprintVersionEntity version where version.blueprintId = :blueprintId")
    Integer latestVersion(@Param("blueprintId") UUID blueprintId);

    @Query("""
            select max(version.version) from BaselineBlueprintVersionEntity version
            join BaselineBlueprintEntity identity on identity.blueprintId = version.blueprintId
            where version.blueprintId = :blueprintId and identity.organizationId = :organizationId
            """)
    Integer latestVersion(@Param("organizationId") UUID organizationId, @Param("blueprintId") UUID blueprintId);

    @Query(HEADER)
    List<Header> header(@Param("blueprintId") UUID blueprintId, @Param("version") int version);

    @Query(HEADER + " and identity.organizationId = :organizationId")
    List<Header> header(@Param("organizationId") UUID organizationId, @Param("blueprintId") UUID blueprintId,
            @Param("version") int version);

    @Query("""
            select new com.adaptlearngraph.repository.BaselineBlueprintVersionJpaRepository$Role(role.roleId, role.roleNameSnapshot,
                role.enabled, role.easyScoreWeight, role.mediumScoreWeight, role.hardScoreWeight)
            from BaselineBlueprintRoleEntity role
            where role.blueprintId = :blueprintId and role.blueprintVersion = :version
            order by role.roleId
            """)
    List<Role> roles(@Param("blueprintId") UUID blueprintId, @Param("version") int version);

    @Query("""
            select new com.adaptlearngraph.repository.BaselineBlueprintVersionJpaRepository$Skill(skill.microSkillId,
                skill.microSkillNameSnapshot, skill.easyQuestionCount, skill.mediumQuestionCount, skill.hardQuestionCount)
            from BaselineBlueprintSkillEntity skill
            where skill.blueprintId = :blueprintId and skill.blueprintVersion = :version and skill.roleId = :roleId
            order by skill.microSkillId
            """)
    List<Skill> skills(@Param("blueprintId") UUID blueprintId, @Param("version") int version, @Param("roleId") String roleId);

    @Query("""
            select new com.adaptlearngraph.repository.BaselineBlueprintVersionJpaRepository$Key(version.blueprintId, version.version)
            from BaselineBlueprintVersionEntity version
            where version.createdBy = :actorId and version.idempotencyKey = :idempotencyKey
            """)
    List<Key> byRequest(@Param("actorId") UUID actorId, @Param("idempotencyKey") String idempotencyKey);

    /** Locks every version of a Blueprint whose identity the caller already locked within its organization scope. */
    // Native: row locks (FOR UPDATE) in version order.
    @Query(value = """
            SELECT version
            FROM platform.baseline_blueprint_version
            WHERE blueprint_id = :blueprintId
            ORDER BY version
            FOR UPDATE
            """, nativeQuery = true)
    List<Integer> lockVersions(@Param("blueprintId") UUID blueprintId);

    // Native: SET CONSTRAINTS (checks the deferred role/skill total constraint triggers now) has no JPQL form.
    @Modifying(flushAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "SET CONSTRAINTS platform.baseline_blueprint_role_total, platform.baseline_blueprint_skill_total IMMEDIATE",
            nativeQuery = true)
    void checkTotalsImmediately();
}
