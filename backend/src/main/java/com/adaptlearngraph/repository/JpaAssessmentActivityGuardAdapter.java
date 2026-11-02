package com.adaptlearngraph.repository;

import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.DataAccessException;

/** REQ-001 guard backed by the PostgreSQL-owned REQ-002 adaptive attempt lifecycle (JPA). */
public final class JpaAssessmentActivityGuardAdapter implements AssessmentActivityGuardPort {
    private final BaselineAdaptiveAttemptJpaRepository attempts;

    public JpaAssessmentActivityGuardAdapter(BaselineAdaptiveAttemptJpaRepository attempts) {
        this.attempts = Objects.requireNonNull(attempts);
    }

    @Override
    public boolean hasBlockingAssessment(UUID learnerId) {
        Objects.requireNonNull(learnerId, "learnerId must not be null");
        if (learnerId.equals(new UUID(0L, 0L))) throw new IllegalArgumentException("learnerId must not be the nil UUID");
        try {
            return attempts.hasInProgress(learnerId);
        } catch (DataAccessException unavailable) {
            throw new ActivityGuardUnavailableException("Adaptive assessment activity is unavailable", unavailable);
        }
    }
}