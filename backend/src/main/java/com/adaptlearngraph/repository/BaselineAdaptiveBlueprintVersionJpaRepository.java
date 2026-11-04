package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineAdaptiveBlueprintVersionEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Immutable finalized adaptive Blueprint versions and their role/skill snapshots, always scoped by organization and JobPosition. */
public interface BaselineAdaptiveBlueprintVersionJpaRepository
        extends Repository<BaselineAdaptiveBlueprintVersionEntity, BaselineAdaptiveBlueprintVersionEntity.Key>,
        InsertOnlyRepository<BaselineAdaptiveBlueprintVersionEntity> {

    record Header(UUID blueprintId, Integer version, String name, String jobPositionNameSnapshot, String catalogFingerprint,
                  Integer explorationMaxQuestions, Integer explorationTimeLimitSeconds, UUID modelVersionId,
                  UUID masteryMappingVersionId, UUID parameterSetId, UUID createdBy, Instant createdAt, String scopePolicy,
                  Integer jobPositionMaxQuestions, Integer jobPositionTimeLimitSeconds) {}

    record Member(String roleId, String roleNameSnapshot, String roleVersion, Integer maxQuestions, Integer timeLimitSeconds,
                  String microSkillId, String microSkillNameSnapshot, String skillVersion) {}

    @Query("""
            select new com.adaptlearngraph.repository.BaselineAdaptiveBlueprintVersionJpaRepository$Header(v.blueprintId, v.version,
                v.name, v.jobPositionNameSnapshot, v.catalogFingerprint, v.explorationMaxQuestions, v.explorationTimeLimitSeconds,
                v.modelVersionId, v.masteryMappingVersionId, v.parameterSetId, v.createdBy, v.createdAt, v.scopePolicy,
                v.jobPositionMaxQuestions, v.jobPositionTimeLimitSeconds)
            from BaselineAdaptiveBlueprintVersionEntity v
            where v.organizationId = :org and v.jobPositionId = :jobPosition and v.blueprintId = :id and v.version = :version
            """)
    List<Header> header(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId, @Param("id") UUID blueprintId,
            @Param("version") int version);

    @Query("""
            select new com.adaptlearngraph.repository.BaselineAdaptiveBlueprintVersionJpaRepository$Member(role.roleId,
                role.roleNameSnapshot, role.catalogVersion, role.maxQuestions, role.timeLimitSeconds, skill.microSkillId,
                skill.microSkillNameSnapshot, skill.catalogVersion)
            from BaselineAdaptiveBlueprintRoleEntity role
            join BaselineAdaptiveBlueprintSkillEntity skill on skill.blueprintId = role.blueprintId
                and skill.blueprintVersion = role.blueprintVersion and skill.roleId = role.roleId
            join BaselineAdaptiveBlueprintVersionEntity parent on parent.blueprintId = role.blueprintId
                and parent.version = role.blueprintVersion
            where parent.organizationId = :org and parent.jobPositionId = :jobPosition
              and parent.blueprintId = :id and parent.version = :version
            order by role.roleId, skill.microSkillId
            """)
    List<Member> members(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId, @Param("id") UUID blueprintId,
            @Param("version") int version);

    /** Single statement (one snapshot): ACTIVE when activated, RETIRING while an in-progress attempt still pins it. */
    @Query("""
            select case
              when exists (select 1 from BaselineBlueprintActivationEntity a
                where a.organizationId = :org and a.jobPositionId = :jobPosition and a.blueprintId = :blueprint and a.blueprintVersion = :version)
                then 'ACTIVE'
              when exists (select 1 from BaselineAdaptiveAttemptEntity t
                where t.organizationId = :org and t.jobPositionId = :jobPosition and t.blueprintId = :blueprint
                  and t.blueprintVersion = :version and t.state = 'IN_PROGRESS')
                then 'RETIRING'
              else 'INACTIVE' end
            """)
    String status(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId, @Param("blueprint") UUID blueprintId,
            @Param("version") int version);



}
