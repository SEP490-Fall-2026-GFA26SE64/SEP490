package com.adaptlearngraph.assessment.adaptive.attempt.application.port.out;

import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.StartTarget;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt.Scope;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttemptSnapshot;
import java.util.UUID;

/** Identity/selection/Catalog anti-corruption boundary; no dependency on another owner's DTOs. */
public interface AdaptiveAttemptContextPort {
    /** Reload active Employee and tenant authorization; no client learner/organization fields. */
    Employee requireEmployee();
    /** Reauthorize a persisted scope without re-resolving current Catalog/selection/Blueprint. */
    void authorizeScope(Employee employee, Scope scope);
    /** Authorize chosen Occupation or derive it from the persisted selected active role. */
    Scope resolveScope(Employee employee, StartTarget target);
    /** New starts only: current Blueprint, fingerprint, role/union pool, exact parameter coverage.
     * Use A1/A3/A4 ports; fail closed on drift/unavailability. Never call for resume/receipt replay.
     */
    AdaptiveAttemptSnapshot resolveStartingSnapshot(Scope scope, StartTarget target);

    record Employee(UUID organizationId, UUID learnerId) {
        public Employee {
            if (organizationId == null || learnerId == null
                    || organizationId.equals(new UUID(0, 0)) || learnerId.equals(new UUID(0, 0))) {
                throw new IllegalArgumentException("Trusted non-nil organization and Employee required");
            }
        }
    }
}
