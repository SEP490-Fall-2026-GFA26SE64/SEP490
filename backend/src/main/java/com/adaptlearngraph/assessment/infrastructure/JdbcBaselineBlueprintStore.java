package com.adaptlearngraph.assessment.infrastructure;

import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.SkillConfig;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

public class JdbcBaselineBlueprintStore implements BaselineBlueprintStore {
    private final NamedParameterJdbcTemplate jdbc;

    public JdbcBaselineBlueprintStore(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<BaselineBlueprint> findLatest(UUID blueprintId) {
        List<Integer> versions = jdbc.query("""
                SELECT max(version) AS version
                FROM platform.baseline_blueprint_version
                WHERE blueprint_id = :blueprintId
                """, Map.of("blueprintId", blueprintId),
                (result, row) -> (Integer) result.getObject("version"));
        if (versions.isEmpty() || versions.getFirst() == null) {
            return Optional.empty();
        }
        return findVersion(blueprintId, versions.getFirst());
    }

    @Override
    public Optional<BaselineBlueprint> findVersion(UUID blueprintId, int version) {
        List<Header> headers = jdbc.query("""
                SELECT blueprint_id, version, name, occupation_id, occupation_name_snapshot,
                       created_by, idempotency_key, request_hash, created_at
                FROM platform.baseline_blueprint_version
                WHERE blueprint_id = :blueprintId AND version = :version
                """, key(blueprintId, version), this::mapHeader);
        if (headers.isEmpty()) {
            return Optional.empty();
        }
        Header header = headers.getFirst();
        List<RoleConfig> roles = jdbc.query("""
                SELECT role_id, role_name_snapshot, enabled,
                       easy_score_weight, medium_score_weight, hard_score_weight
                FROM platform.baseline_blueprint_role
                WHERE blueprint_id = :blueprintId AND blueprint_version = :version
                ORDER BY role_id
                """, key(blueprintId, version), (result, row) -> new RoleConfig(
                result.getString("role_id"), result.getString("role_name_snapshot"),
                result.getBoolean("enabled"), result.getBigDecimal("easy_score_weight"),
                result.getBigDecimal("medium_score_weight"), result.getBigDecimal("hard_score_weight"),
                readSkills(blueprintId, version, result.getString("role_id"))));
        return Optional.of(new BaselineBlueprint(
                header.blueprintId(), header.version(), header.name(), header.occupationId(),
                header.occupationNameSnapshot(), header.createdBy(), header.idempotencyKey(),
                header.requestHash(), header.createdAt(), roles));
    }

    @Override
    public Optional<BaselineBlueprint> findByRequest(UUID actorId, String idempotencyKey) {
        List<BlueprintKey> keys = jdbc.query("""
                SELECT blueprint_id, version
                FROM platform.baseline_blueprint_version
                WHERE created_by = :actorId AND idempotency_key = :idempotencyKey
                """, Map.of("actorId", actorId, "idempotencyKey", idempotencyKey),
                (result, row) -> new BlueprintKey(
                        result.getObject("blueprint_id", UUID.class), result.getInt("version")));
        return keys.isEmpty()
                ? Optional.empty()
                : findVersion(keys.getFirst().blueprintId(), keys.getFirst().version());
    }

    @Override
    @Transactional
    public void insert(BaselineBlueprint blueprint) {
        try {
            jdbc.update("""
                    INSERT INTO platform.baseline_blueprint_version (
                        blueprint_id, version, name, occupation_id, occupation_name_snapshot,
                        created_by, idempotency_key, request_hash, created_at)
                    VALUES (:blueprintId, :version, :name, :occupationId, :occupationName,
                        :createdBy, :idempotencyKey, :requestHash, :createdAt)
                    """, new MapSqlParameterSource()
                    .addValue("blueprintId", blueprint.blueprintId())
                    .addValue("version", blueprint.version())
                    .addValue("name", blueprint.name())
                    .addValue("occupationId", blueprint.occupationId())
                    .addValue("occupationName", blueprint.occupationNameSnapshot())
                    .addValue("createdBy", blueprint.createdBy())
                    .addValue("idempotencyKey", blueprint.idempotencyKey())
                    .addValue("requestHash", blueprint.requestHash())
                    .addValue("createdAt", blueprint.createdAt().atOffset(ZoneOffset.UTC),
                            Types.TIMESTAMP_WITH_TIMEZONE));
            for (RoleConfig role : blueprint.roles()) {
                insertRole(blueprint, role);
                for (SkillConfig skill : role.skills()) {
                    insertSkill(blueprint, role.roleId(), skill);
                }
            }
            jdbc.getJdbcTemplate().execute(
                    "SET CONSTRAINTS platform.baseline_blueprint_role_total, "
                            + "platform.baseline_blueprint_skill_total IMMEDIATE");
        } catch (DuplicateKeyException conflict) {
            throw new WriteConflict(conflict);
        }
    }

    private void insertRole(BaselineBlueprint blueprint, RoleConfig role) {
        jdbc.update("""
                INSERT INTO platform.baseline_blueprint_role (
                    blueprint_id, blueprint_version, role_id, role_name_snapshot, enabled,
                    total_question_count, easy_score_weight, medium_score_weight, hard_score_weight)
                VALUES (:blueprintId, :version, :roleId, :roleName, :enabled,
                    :total, :easyWeight, :mediumWeight, :hardWeight)
                """, new MapSqlParameterSource()
                .addValue("blueprintId", blueprint.blueprintId())
                .addValue("version", blueprint.version())
                .addValue("roleId", role.roleId())
                .addValue("roleName", role.roleNameSnapshot())
                .addValue("enabled", role.enabled())
                .addValue("total", role.totalQuestionCount())
                .addValue("easyWeight", role.easyScoreWeight())
                .addValue("mediumWeight", role.mediumScoreWeight())
                .addValue("hardWeight", role.hardScoreWeight()));
    }

    private void insertSkill(BaselineBlueprint blueprint, String roleId, SkillConfig skill) {
        jdbc.update("""
                INSERT INTO platform.baseline_blueprint_skill (
                    blueprint_id, blueprint_version, role_id, micro_skill_id,
                    micro_skill_name_snapshot, easy_question_count,
                    medium_question_count, hard_question_count)
                VALUES (:blueprintId, :version, :roleId, :skillId,
                    :skillName, :easyCount, :mediumCount, :hardCount)
                """, new MapSqlParameterSource()
                .addValue("blueprintId", blueprint.blueprintId())
                .addValue("version", blueprint.version())
                .addValue("roleId", roleId)
                .addValue("skillId", skill.microSkillId())
                .addValue("skillName", skill.microSkillNameSnapshot())
                .addValue("easyCount", skill.easyQuestionCount())
                .addValue("mediumCount", skill.mediumQuestionCount())
                .addValue("hardCount", skill.hardQuestionCount()));
    }

    private List<SkillConfig> readSkills(UUID blueprintId, int version, String roleId) {
        var parameters = key(blueprintId, version).addValue("roleId", roleId);
        return jdbc.query("""
                SELECT micro_skill_id, micro_skill_name_snapshot,
                       easy_question_count, medium_question_count, hard_question_count
                FROM platform.baseline_blueprint_skill
                WHERE blueprint_id = :blueprintId AND blueprint_version = :version AND role_id = :roleId
                ORDER BY micro_skill_id
                """, parameters, (result, row) -> new SkillConfig(
                result.getString("micro_skill_id"), result.getString("micro_skill_name_snapshot"),
                result.getInt("easy_question_count"), result.getInt("medium_question_count"),
                result.getInt("hard_question_count")));
    }

    private Header mapHeader(ResultSet result, int row) throws SQLException {
        return new Header(
                result.getObject("blueprint_id", UUID.class), result.getInt("version"),
                result.getString("name"), result.getString("occupation_id"),
                result.getString("occupation_name_snapshot"), result.getObject("created_by", UUID.class),
                result.getString("idempotency_key"), result.getString("request_hash"),
                result.getObject("created_at", java.time.OffsetDateTime.class).toInstant());
    }

    private static MapSqlParameterSource key(UUID blueprintId, int version) {
        return new MapSqlParameterSource().addValue("blueprintId", blueprintId).addValue("version", version);
    }

    private record BlueprintKey(UUID blueprintId, int version) {}

    private record Header(UUID blueprintId, int version, String name, String occupationId,
            String occupationNameSnapshot, UUID createdBy, String idempotencyKey,
            String requestHash, Instant createdAt) {}
}
