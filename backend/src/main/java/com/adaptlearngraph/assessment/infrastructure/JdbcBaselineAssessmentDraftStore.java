package com.adaptlearngraph.assessment.infrastructure;

import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

public class JdbcBaselineAssessmentDraftStore implements BaselineAssessmentDraftStore {
    private static final String SCORING_VERSION = "BASELINE_BLUEPRINT_WEIGHT_V1";
    private final NamedParameterJdbcTemplate jdbc;

    public JdbcBaselineAssessmentDraftStore(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<CandidateItem> findPublishedCandidates(Set<String> microSkillIds) {
        if (microSkillIds.isEmpty()) {
            return List.of();
        }
        try {
            return jdbc.query("""
                    WITH latest_published AS (
                        SELECT DISTINCT ON (item_id)
                               item_version_id, item_id, version, micro_skill_id,
                               micro_skill_name_snapshot, difficulty, content_hash,
                               prompt, response_schema
                        FROM platform.item_version
                        WHERE publication_state = 'PUBLISHED'
                          AND micro_skill_id IN (:skillIds)
                        ORDER BY item_id, version DESC, item_version_id DESC
                    )
                    SELECT item_version_id, micro_skill_id, micro_skill_name_snapshot,
                           difficulty, content_hash, prompt, response_schema::text AS response_schema_json
                    FROM latest_published
                    ORDER BY micro_skill_id, difficulty, item_version_id
                    """, new MapSqlParameterSource("skillIds", microSkillIds), (result, row) -> new CandidateItem(
                    result.getObject("item_version_id", UUID.class),
                    result.getString("micro_skill_id"),
                    result.getString("micro_skill_name_snapshot"),
                    Difficulty.valueOf(result.getString("difficulty")),
                    result.getString("content_hash"),
                    result.getString("prompt"),
                    result.getString("response_schema_json")));
        } catch (DataAccessException failure) {
            throw unavailable("Published question candidates are unavailable", failure);
        }
    }

    @Override
    public Optional<BaselineAssessmentDraft> findByGenerationRequest(UUID actorId, String idempotencyKey) {
        try {
            List<UUID> ids = jdbc.query("""
                    SELECT assessment_version_id
                    FROM platform.assessment_version
                    WHERE created_by = :actorId
                      AND generation_idempotency_key = :idempotencyKey
                      AND blueprint_id IS NOT NULL
                    """, Map.of("actorId", actorId, "idempotencyKey", idempotencyKey),
                    (result, row) -> result.getObject("assessment_version_id", UUID.class));
            return ids.isEmpty() ? Optional.empty() : findByVersionId(ids.getFirst());
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment generation history is unavailable", failure);
        }
    }

    @Override
    public Optional<BaselineAssessmentDraft> findByVersionId(UUID assessmentVersionId) {
        try {
            List<Header> headers = jdbc.query("""
                    SELECT assessment_version_id, assessment_id, version, title,
                           blueprint_id, blueprint_version, generation_seed,
                           created_by, created_at, generation_request_hash, content_hash,
                           publication_state, reviewed_by, reviewed_at, reviewed_content_hash
                    FROM platform.assessment_version
                    WHERE assessment_version_id = :assessmentVersionId
                      AND purpose = 'BASELINE'
                      AND blueprint_id IS NOT NULL
                    """, Map.of("assessmentVersionId", assessmentVersionId), this::mapHeader);
            if (headers.isEmpty()) {
                return Optional.empty();
            }
            Header header = headers.getFirst();
            List<BaselineAssessmentDraft.Item> items = jdbc.query("""
                    SELECT entry.item_position, entry.item_version_id,
                           entry.role_id, entry.role_name_snapshot, entry.scoring_weight,
                           item.micro_skill_id, item.micro_skill_name_snapshot,
                           item.difficulty, item.prompt,
                           item.response_schema::text AS response_schema_json
                    FROM platform.assessment_item entry
                    JOIN platform.item_version item USING (item_version_id)
                    WHERE entry.assessment_version_id = :assessmentVersionId
                    ORDER BY entry.item_position
                    """, Map.of("assessmentVersionId", assessmentVersionId), (result, row) ->
                    new BaselineAssessmentDraft.Item(
                            result.getInt("item_position"),
                            result.getObject("item_version_id", UUID.class),
                            result.getString("role_id"), result.getString("role_name_snapshot"),
                            result.getString("micro_skill_id"),
                            result.getString("micro_skill_name_snapshot"),
                            result.getString("difficulty"), result.getBigDecimal("scoring_weight"),
                            result.getString("prompt"), result.getString("response_schema_json")));
            return Optional.of(new BaselineAssessmentDraft(
                    header.assessmentVersionId(), header.assessmentId(), header.version(), header.title(),
                    header.blueprintId(), header.blueprintVersion(), header.generationSeed(),
                    header.createdBy(), header.createdAt(), header.generationRequestHash(),
                    header.contentHash(), header.publicationState(), header.reviewedBy(),
                    header.reviewedAt(), header.reviewedContentHash(), items));
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment draft is unavailable", failure);
        }
    }

    @Override
    @Transactional
    public BaselineAssessmentDraft insertNextVersion(NewDraft draft) {
        try {
            List<Integer> locked = jdbc.query("""
                    SELECT version
                    FROM platform.baseline_blueprint_version
                    WHERE blueprint_id = :blueprintId
                    ORDER BY version
                    FOR UPDATE
                    """, blueprintKey(draft), (result, row) -> result.getInt("version"));
            if (!locked.contains(draft.blueprintVersion())) {
                throw new IllegalStateException("Baseline blueprint version disappeared during generation");
            }
            int version = nextVersion(draft.assessmentId());
            jdbc.update("""
                    INSERT INTO platform.assessment_version (
                        assessment_version_id, assessment_id, version, title, purpose,
                        scoring_version, publication_state, content_hash,
                        blueprint_id, blueprint_version, generation_seed,
                        created_by, created_at, generation_idempotency_key, generation_request_hash)
                    VALUES (
                        :assessmentVersionId, :assessmentId, :version, :title, 'BASELINE',
                        :scoringVersion, 'DRAFT', :contentHash,
                        :blueprintId, :blueprintVersion, :generationSeed,
                        :createdBy, :createdAt, :idempotencyKey, :requestHash)
                    """, headerParameters(draft, version));
            int position = 1;
            for (NewItem item : draft.items()) {
                jdbc.update("""
                        INSERT INTO platform.assessment_item (
                            assessment_version_id, item_position, item_version_id,
                            required, scoring_weight, role_id, role_name_snapshot)
                        VALUES (
                            :assessmentVersionId, :position, :itemVersionId,
                            true, :scoringWeight, :roleId, :roleName)
                        """, new MapSqlParameterSource()
                        .addValue("assessmentVersionId", draft.assessmentVersionId())
                        .addValue("position", position++)
                        .addValue("itemVersionId", item.candidate().itemVersionId())
                        .addValue("scoringWeight", item.scoringWeight())
                        .addValue("roleId", item.roleId())
                        .addValue("roleName", item.roleNameSnapshot()));
            }
            return findByVersionId(draft.assessmentVersionId())
                    .orElseThrow(() -> new IllegalStateException("Generated assessment draft could not be reloaded"));
        } catch (DuplicateKeyException conflict) {
            throw new WriteConflict(conflict);
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment draft could not be stored", failure);
        }
    }

    @Override
    public boolean review(
            UUID assessmentVersionId, UUID reviewerId, Instant reviewedAt,
            String expectedContentHash) {
        try {
            return jdbc.update("""
                    UPDATE platform.assessment_version
                    SET reviewed_by = :reviewerId,
                        reviewed_at = :reviewedAt,
                        reviewed_content_hash = :expectedContentHash
                    WHERE assessment_version_id = :assessmentVersionId
                      AND purpose = 'BASELINE'
                      AND blueprint_id IS NOT NULL
                      AND publication_state = 'DRAFT'
                      AND content_hash = :expectedContentHash
                      AND reviewed_content_hash IS NULL
                    """, new MapSqlParameterSource()
                    .addValue("assessmentVersionId", assessmentVersionId)
                    .addValue("reviewerId", reviewerId)
                    .addValue("reviewedAt", reviewedAt.atOffset(ZoneOffset.UTC),
                            Types.TIMESTAMP_WITH_TIMEZONE)
                    .addValue("expectedContentHash", expectedContentHash)) == 1;
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment review could not be stored", failure);
        }
    }

    @Override
    public boolean publish(UUID assessmentVersionId, String expectedContentHash) {
        try {
            return jdbc.update("""
                    UPDATE platform.assessment_version
                    SET publication_state = 'PUBLISHED'
                    WHERE assessment_version_id = :assessmentVersionId
                      AND purpose = 'BASELINE'
                      AND blueprint_id IS NOT NULL
                      AND publication_state = 'DRAFT'
                      AND content_hash = :expectedContentHash
                      AND reviewed_content_hash = :expectedContentHash
                    """, Map.of(
                    "assessmentVersionId", assessmentVersionId,
                    "expectedContentHash", expectedContentHash)) == 1;
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment could not be published", failure);
        }
    }

    private int nextVersion(UUID assessmentId) {
        Integer latest = jdbc.queryForObject("""
                SELECT coalesce(max(version), 0)
                FROM platform.assessment_version
                WHERE assessment_id = :assessmentId
                """, Map.of("assessmentId", assessmentId), Integer.class);
        return Math.addExact(latest == null ? 0 : latest, 1);
    }

    private static MapSqlParameterSource blueprintKey(NewDraft draft) {
        return new MapSqlParameterSource()
                .addValue("blueprintId", draft.blueprintId())
                .addValue("blueprintVersion", draft.blueprintVersion());
    }

    private static MapSqlParameterSource headerParameters(NewDraft draft, int version) {
        return new MapSqlParameterSource()
                .addValue("assessmentVersionId", draft.assessmentVersionId())
                .addValue("assessmentId", draft.assessmentId())
                .addValue("version", version)
                .addValue("title", draft.title())
                .addValue("scoringVersion", SCORING_VERSION)
                .addValue("contentHash", draft.contentHash())
                .addValue("blueprintId", draft.blueprintId())
                .addValue("blueprintVersion", draft.blueprintVersion())
                .addValue("generationSeed", draft.generationSeed())
                .addValue("createdBy", draft.createdBy())
                .addValue("createdAt", draft.createdAt().atOffset(ZoneOffset.UTC),
                        Types.TIMESTAMP_WITH_TIMEZONE)
                .addValue("idempotencyKey", draft.idempotencyKey())
                .addValue("requestHash", draft.requestHash());
    }

    private Header mapHeader(ResultSet result, int row) throws SQLException {
        return new Header(
                result.getObject("assessment_version_id", UUID.class),
                result.getObject("assessment_id", UUID.class), result.getInt("version"),
                result.getString("title"), result.getObject("blueprint_id", UUID.class),
                result.getInt("blueprint_version"), result.getLong("generation_seed"),
                result.getObject("created_by", UUID.class),
                result.getObject("created_at", java.time.OffsetDateTime.class).toInstant(),
                result.getString("generation_request_hash"),
                result.getString("content_hash"),
                BaselineAssessmentDraft.PublicationState.valueOf(
                        result.getString("publication_state")),
                result.getObject("reviewed_by", UUID.class),
                result.getObject("reviewed_at", java.time.OffsetDateTime.class) == null
                        ? null
                        : result.getObject("reviewed_at", java.time.OffsetDateTime.class).toInstant(),
                result.getString("reviewed_content_hash"));
    }

    private static DependencyUnavailable unavailable(String message, Throwable cause) {
        return new DependencyUnavailable(message, cause);
    }

    private record Header(
            UUID assessmentVersionId,
            UUID assessmentId,
            int version,
            String title,
            UUID blueprintId,
            int blueprintVersion,
            long generationSeed,
            UUID createdBy,
            Instant createdAt,
            String generationRequestHash,
            String contentHash,
            BaselineAssessmentDraft.PublicationState publicationState,
            UUID reviewedBy,
            Instant reviewedAt,
            String reviewedContentHash) {}
}
