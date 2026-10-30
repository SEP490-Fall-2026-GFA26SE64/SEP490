package com.adaptlearngraph.assessment.application.port.out;

import com.adaptlearngraph.assessment.domain.BaselineBlueprint;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface BaselineBlueprintStore {
    Optional<BaselineBlueprint> findLatest(UUID blueprintId);

    default Optional<BaselineBlueprint> findLatest(String organizationId, UUID blueprintId) {
        return findLatest(blueprintId);
    }

    default Optional<BaselineBlueprint> findLatestByOccupation(String occupationId) {
        return Optional.empty();
    }

    default Optional<BaselineBlueprint> findLatestByOccupation(
            String organizationId, String occupationId) {
        return findLatestByOccupation(occupationId);
    }

    Optional<BaselineBlueprint> findVersion(UUID blueprintId, int version);

    default Optional<BaselineBlueprint> findVersion(
            String organizationId, UUID blueprintId, int version) {
        return findVersion(blueprintId, version);
    }

    Optional<BaselineBlueprint> findByRequest(UUID actorId, String idempotencyKey);

    void insert(BaselineBlueprint blueprint);

    default void insert(String organizationId, BaselineBlueprint blueprint) {
        insert(blueprint);
    }

    interface ActorPort {
        Optional<Actor> currentActor();
    }

    record Actor(UUID accountId, String organizationId, boolean active, Set<String> roles) {
        public Actor {
            if (organizationId == null || organizationId.isBlank()) {
                throw new IllegalArgumentException("organizationId must not be blank");
            }
            organizationId = organizationId.strip();
            roles = Set.copyOf(roles);
        }

        public boolean isActiveLdManager() {
            return active && roles.contains("LD_MANAGER");
        }
    }

    final class WriteConflict extends RuntimeException {
        public WriteConflict(Throwable cause) {
            super(cause);
        }
    }
}
