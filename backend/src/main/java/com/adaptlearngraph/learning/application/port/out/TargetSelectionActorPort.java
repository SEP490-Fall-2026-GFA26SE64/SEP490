package com.adaptlearngraph.learning.application.port.out;

import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Supplies trusted identity and tenant context for the current request. */
public interface TargetSelectionActorPort {
    Optional<SelectionActor> currentActor();

    record SelectionActor(
            UUID accountId,
            UUID organizationId,
            boolean active,
            Set<String> roles) {

        public SelectionActor {
            accountId = requireIdentity(accountId, "accountId");
            organizationId = requireIdentity(organizationId, "organizationId");
            Objects.requireNonNull(roles, "roles must not be null");
            roles = roles.stream()
                    .map(role -> requireRole(role).toUpperCase(Locale.ROOT))
                    .collect(Collectors.toUnmodifiableSet());
        }

        public boolean isActiveEmployee() {
            return active && roles.contains("EMPLOYEE");
        }

        private static UUID requireIdentity(UUID value, String field) {
            Objects.requireNonNull(value, field + " must not be null");
            if (value.equals(new UUID(0L, 0L))) {
                throw new IllegalArgumentException(field + " must not be the nil UUID");
            }
            return value;
        }

        private static String requireRole(String value) {
            if (value == null || value.isBlank()) {
                throw new IllegalArgumentException("role must not be blank");
            }
            return value.strip();
        }
    }
}
