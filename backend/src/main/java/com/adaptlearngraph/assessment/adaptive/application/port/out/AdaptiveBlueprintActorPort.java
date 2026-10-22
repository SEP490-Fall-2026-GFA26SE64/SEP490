package com.adaptlearngraph.assessment.adaptive.application.port.out;

import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** Trusted server context only. Employee attempt and calibration authorization have separate ports. */
public interface AdaptiveBlueprintActorPort {
    Optional<Actor> currentActor();

    /** Server-authorized visibility, independent of Catalog/item availability; deny by default. */
    default Set<String> authorizedOccupations(Actor actor) { return Set.of(); }

    record Actor(UUID accountId, UUID organizationId, boolean active, Set<String> roles) {
        public Actor {
            Objects.requireNonNull(accountId, "accountId");
            Objects.requireNonNull(organizationId, "organizationId");
            if (accountId.equals(new UUID(0, 0)) || organizationId.equals(new UUID(0, 0))) {
                throw new IllegalArgumentException("Trusted actor IDs must not be nil");
            }
            roles = Set.copyOf(roles);
        }

        public boolean isActiveLdManager() { return active && roles.contains("LD_MANAGER"); }
    }
}
