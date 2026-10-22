package com.adaptlearngraph.learning.infrastructure;

import com.adaptlearngraph.learning.application.port.out.AssessmentActivityGuardPort;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** REQ-001 guard backed by the PostgreSQL-owned REQ-002 adaptive attempt lifecycle. */
public final class AdaptiveBaselineAssessmentActivityGuardAdapter implements AssessmentActivityGuardPort {
    private final NamedParameterJdbcTemplate jdbc;

    AdaptiveBaselineAssessmentActivityGuardAdapter(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = Objects.requireNonNull(jdbc);
    }

    @Override public boolean hasBlockingAssessment(UUID learnerId) {
        Objects.requireNonNull(learnerId, "learnerId must not be null");
        if (learnerId.equals(new UUID(0L, 0L))) throw new IllegalArgumentException("learnerId must not be the nil UUID");
        try {
            return Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS(
                        SELECT 1 FROM platform.baseline_adaptive_attempt attempt
                        JOIN platform.account learner
                          ON learner.account_id=attempt.learner_id
                         AND learner.organization_id=attempt.organization_id
                        WHERE attempt.learner_id=:learner AND attempt.state='IN_PROGRESS')
                    """, Map.of("learner", learnerId), Boolean.class));
        } catch (DataAccessException unavailable) {
            throw new ActivityGuardUnavailableException("Adaptive assessment activity is unavailable", unavailable);
        }
    }
}
