package com.adaptlearngraph.repository;
import java.util.UUID;

/** Trusted current-catalog selection bridge; application code does not consume another owner's DTO. */
public interface AdaptiveSelectedRolePort {
    Selected current(UUID organization, UUID learner);
    record Selected(String roleId, String jobPositionId, long revision) {}
}
