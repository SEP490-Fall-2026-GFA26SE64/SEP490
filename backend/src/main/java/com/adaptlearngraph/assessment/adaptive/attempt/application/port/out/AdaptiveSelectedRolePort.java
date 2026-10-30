package com.adaptlearngraph.assessment.adaptive.attempt.application.port.out;
import java.util.UUID;

/** Trusted current-catalog selection bridge; application code does not consume another owner's DTO. */
public interface AdaptiveSelectedRolePort {
    Selected current(UUID organization, UUID learner);
    record Selected(String roleId, String occupationId, long revision) {}
}
