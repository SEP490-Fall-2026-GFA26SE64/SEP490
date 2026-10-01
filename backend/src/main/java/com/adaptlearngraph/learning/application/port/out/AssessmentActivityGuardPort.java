package com.adaptlearngraph.learning.application.port.out;

import java.util.UUID;

/** Reports whether a learner currently has an assessment that blocks role change. */
public interface AssessmentActivityGuardPort {
    boolean hasBlockingAssessment(UUID learnerId);

    final class ActivityGuardUnavailableException extends RuntimeException {
        public ActivityGuardUnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
