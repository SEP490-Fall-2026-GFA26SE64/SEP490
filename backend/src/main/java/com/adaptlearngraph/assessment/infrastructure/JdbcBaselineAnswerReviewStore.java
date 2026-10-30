package com.adaptlearngraph.assessment.infrastructure;

import com.adaptlearngraph.assessment.application.port.in.BaselineAnswerReviewUseCase.AnswerItem;
import com.adaptlearngraph.assessment.application.port.out.BaselineAnswerReviewStore;
import java.sql.Types;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

public class JdbcBaselineAnswerReviewStore implements BaselineAnswerReviewStore {
    private final NamedParameterJdbcTemplate jdbc;

    public JdbcBaselineAnswerReviewStore(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional
    public List<AnswerItem> revealAndAudit(
            UUID organizationId, UUID assessmentVersionId, UUID actorId, Instant revealedAt) {
        try {
            List<AnswerItem> items = jdbc.query("""
                    SELECT item.item_version_id, item.protected_key::text AS protected_key_json
                    FROM platform.assessment_version assessment
                    JOIN platform.baseline_assessment_series series
                      ON series.blueprint_id = assessment.blueprint_id
                    JOIN platform.assessment_item manifest
                      ON manifest.assessment_version_id = assessment.assessment_version_id
                    JOIN platform.item_version item
                      ON item.item_version_id = manifest.item_version_id
                    WHERE series.organization_id = :organizationId
                      AND assessment.assessment_version_id = :assessmentVersionId
                      AND assessment.purpose = 'BASELINE'
                    ORDER BY manifest.item_position
                    """, Map.of("organizationId", organizationId,
                            "assessmentVersionId", assessmentVersionId),
                    (result, row) -> new AnswerItem(
                            result.getObject("item_version_id", UUID.class),
                            result.getString("protected_key_json")));
            if (items.isEmpty()) {
                throw new NotFound("Baseline assessment version was not found");
            }
            jdbc.update("""
                    INSERT INTO platform.baseline_answer_reveal_audit (
                        answer_reveal_audit_id, organization_id, assessment_version_id,
                        actor_id, revealed_at, item_count)
                    VALUES (:auditId, :organizationId, :assessmentVersionId,
                        :actorId, :revealedAt, :itemCount)
                    """, new MapSqlParameterSource()
                    .addValue("auditId", UUID.randomUUID())
                    .addValue("organizationId", organizationId)
                    .addValue("assessmentVersionId", assessmentVersionId)
                    .addValue("actorId", actorId)
                    .addValue("revealedAt", revealedAt.atOffset(ZoneOffset.UTC), Types.TIMESTAMP_WITH_TIMEZONE)
                    .addValue("itemCount", items.size()));
            return items;
        } catch (NotFound missing) {
            throw missing;
        } catch (DataAccessException failure) {
            throw new DependencyUnavailable("Protected answers are unavailable", failure);
        }
    }
}
