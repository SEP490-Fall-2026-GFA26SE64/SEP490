package com.adaptlearngraph.learning.infrastructure;

import com.adaptlearngraph.learning.application.port.out.AssessmentActivityGuardPort;
import java.util.Objects;
import java.util.UUID;

/** Local/demo guard used until the assessment owner supplies the real lifecycle query. */
public final class ConfiguredAssessmentActivityGuardAdapter implements AssessmentActivityGuardPort {
    private final boolean assessmentInProgress;

    ConfiguredAssessmentActivityGuardAdapter(boolean assessmentInProgress) {
        this.assessmentInProgress = assessmentInProgress;
    }

    @Override
    public boolean hasBlockingAssessment(UUID learnerId) {
        Objects.requireNonNull(learnerId, "learnerId must not be null");
        if (learnerId.equals(new UUID(0L, 0L))) {
            throw new IllegalArgumentException("learnerId must not be the nil UUID");
        }
        return assessmentInProgress;
    }
}
