package com.adaptlearngraph.assessment.adaptive.attempt.application.port.out;

import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt;
import java.math.BigDecimal;
import java.util.Map;

/** Owned transaction only; caller saves the header/receipt. No downstream BKT observations. */
public interface AdaptiveAttemptOutcomePort {
    void persist(Completion completion);
    record Skill(BigDecimal theta, BigDecimal standardError, BigDecimal estimatedMastery,
                 BigDecimal mastery, String confidence) {}
    record Completion(AdaptiveAttempt terminal, int answered, int correct, Map<String, Skill> skills) {
        public Completion { skills = Map.copyOf(skills); }
    }
}
