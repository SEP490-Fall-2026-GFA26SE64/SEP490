package com.adaptlearngraph.assessment.adaptive.attempt.application.port.out;

import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt.Scope;
import java.util.List;
import java.util.UUID;

/** Server-only scoring after ownership and exact pending presentation/option validation. */
public interface AdaptiveAttemptScoringPort {
    boolean correct(Scope scope, UUID itemVersionId, String selectedOptionId, List<String> presentedOptions);
    /** Missing/malformed trusted key, not an ordinary Employee validation failure. No key in errors. */
    final class TechnicalFailure extends RuntimeException {
        public TechnicalFailure() { super("Pinned item scoring unavailable"); }
    }
}
