package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.domain.BaselineBlueprint;
import com.adaptlearngraph.entities.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.entities.domain.BaselineBlueprint.SkillConfig;
import com.adaptlearngraph.entities.BaselineBlueprintRoleEntity;
import com.adaptlearngraph.entities.BaselineBlueprintSkillEntity;
import com.adaptlearngraph.entities.BaselineBlueprintVersionEntity;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.transaction.annotation.Transactional;

public class JpaBaselineBlueprintStore implements BaselineBlueprintStore {
    private final BaselineBlueprintJpaRepository identities;
    private final BaselineBlueprintVersionJpaRepository versions;
    private final BaselineBlueprintRoleJpaRepository roles;
    private final BaselineBlueprintSkillJpaRepository skills;

    public JpaBaselineBlueprintStore(BaselineBlueprintJpaRepository identities, BaselineBlueprintVersionJpaRepository versions,
            BaselineBlueprintRoleJpaRepository roles, BaselineBlueprintSkillJpaRepository skills) {
        this.identities = Objects.requireNonNull(identities);
        this.versions = Objects.requireNonNull(versions);
        this.roles = Objects.requireNonNull(roles);
        this.skills = Objects.requireNonNull(skills);
    }

    @Override
    public Optional<BaselineBlueprint> findLatest(UUID blueprintId) {
        Integer version = versions.latestVersion(blueprintId);
        return version == null ? Optional.empty() : findVersion(blueprintId, version);
    }

    @Override
    public Optional<BaselineBlueprint> findLatest(String organizationId, UUID blueprintId) {
        Integer version = versions.latestVersion(organization(organizationId), blueprintId);
        return version == null ? Optional.empty() : findVersion(organizationId, blueprintId, version);
    }

    @Override
    public Optional<BaselineBlueprint> findLatestByJobPosition(String jobPositionId) {
        List<UUID> blueprintIds = identities.byJobPosition(requireText(jobPositionId, "jobPositionId"));
        return blueprintIds.isEmpty() ? Optional.empty() : findLatest(blueprintIds.getFirst());
    }

    @Override
    public Optional<BaselineBlueprint> findLatestByJobPosition(
            String organizationId, String jobPositionId) {
        List<UUID> blueprintIds = identities.identity(organization(organizationId), requireText(jobPositionId, "jobPositionId"));
        return blueprintIds.isEmpty()
                ? Optional.empty()
                : findLatest(organizationId, blueprintIds.getFirst());
    }

    @Override
    public Optional<BaselineBlueprint> findVersion(UUID blueprintId, int version) {
        return findVersion(null, blueprintId, version);
    }

    @Override
    public Optional<BaselineBlueprint> findVersion(
            String organizationId, UUID blueprintId, int version) {
        List<BaselineBlueprintVersionJpaRepository.Header> headers = organizationId == null
                ? versions.header(blueprintId, version)
                : versions.header(organization(organizationId), blueprintId, version);
        if (headers.isEmpty()) {
            return Optional.empty();
        }
        var header = headers.getFirst();
        List<RoleConfig> configured = versions.roles(blueprintId, version).stream().map(role -> new RoleConfig(
                role.roleId(), role.roleNameSnapshot(), Boolean.TRUE.equals(role.enabled()), role.easyScoreWeight(),
                role.mediumScoreWeight(), role.hardScoreWeight(), readSkills(blueprintId, version, role.roleId()))).toList();
        return Optional.of(new BaselineBlueprint(
                header.blueprintId(), header.version(), header.name(), header.jobPositionId(),
                header.jobPositionNameSnapshot(), header.createdBy(), header.idempotencyKey(),
                header.requestHash(), header.createdAt(), configured));
    }

    @Override
    public Optional<BaselineBlueprint> findByRequest(UUID actorId, String idempotencyKey) {
        var keys = versions.byRequest(actorId, idempotencyKey);
        return keys.isEmpty()
                ? Optional.empty()
                : findVersion(keys.getFirst().blueprintId(), keys.getFirst().version());
    }

    @Override
    @Transactional(TransactionManagers.JPA)
    public void insert(BaselineBlueprint blueprint) {
        List<UUID> organizations = identities.actorOrganization(blueprint.createdBy());
        if (organizations.isEmpty()) {
            throw new EmptyResultDataAccessException(1);
        }
        UUID organizationId = organizations.getFirst();
        if (organizationId == null) {
            throw new IllegalStateException("Blueprint actor has no organization");
        }
        insert(organizationId.toString(), blueprint);
    }

    @Override
    @Transactional(TransactionManagers.JPA)
    public void insert(String organizationId, BaselineBlueprint blueprint) {
        try {
            if (blueprint.version() == 1) {
                insertIdentity(organizationId, blueprint);
            }
            versions.insert(new BaselineBlueprintVersionEntity(blueprint.blueprintId(), blueprint.version(), blueprint.name(),
                    blueprint.jobPositionId(), blueprint.jobPositionNameSnapshot(), blueprint.createdBy(),
                    blueprint.createdAt(), blueprint.idempotencyKey(), blueprint.requestHash()));
            for (RoleConfig role : blueprint.roles()) {
                roles.insert(new BaselineBlueprintRoleEntity(blueprint.blueprintId(), blueprint.version(), role.roleId(),
                        role.roleNameSnapshot(), role.enabled(), role.totalQuestionCount(), role.easyScoreWeight(),
                        role.mediumScoreWeight(), role.hardScoreWeight()));
                for (SkillConfig skill : role.skills()) {
                    skills.insert(new BaselineBlueprintSkillEntity(blueprint.blueprintId(), blueprint.version(), role.roleId(),
                            skill.microSkillId(), skill.microSkillNameSnapshot(), skill.easyQuestionCount(),
                            skill.mediumQuestionCount(), skill.hardQuestionCount()));
                }
            }
            versions.checkTotalsImmediately();
        } catch (DataIntegrityViolationException conflict) {
            if (!PostgresErrors.isUniqueViolation(conflict)) {
                throw conflict;
            }
            throw new WriteConflict(conflict);
        }
    }

    private void insertIdentity(String organizationId, BaselineBlueprint blueprint) {
        UUID organization = organization(organizationId);
        identities.ensureFixed(blueprint.blueprintId(), organization, blueprint.jobPositionId(), blueprint.createdBy(),
                blueprint.createdAt());
        long matching = blueprint.jobPositionId() == null
                ? identities.countMatchingWithoutJobPosition(blueprint.blueprintId(), organization)
                : identities.countMatching(blueprint.blueprintId(), organization, blueprint.jobPositionId());
        if (matching != 1) {
            throw new IllegalStateException("Blueprint actor is outside the trusted organization");
        }
    }

    private List<SkillConfig> readSkills(UUID blueprintId, int version, String roleId) {
        return versions.skills(blueprintId, version, roleId).stream().map(skill -> new SkillConfig(
                skill.microSkillId(), skill.microSkillNameSnapshot(), skill.easyQuestionCount(),
                skill.mediumQuestionCount(), skill.hardQuestionCount())).toList();
    }

    /** Former {@code CAST(:organizationId AS uuid)} of the trimmed, required organization text. */
    private static UUID organization(String organizationId) {
        return UUID.fromString(requireText(organizationId, "organizationId"));
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }
}
