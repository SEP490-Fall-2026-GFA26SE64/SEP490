package com.adaptlearngraph.learning.application.port.out;

import com.adaptlearngraph.learning.domain.TargetRoleSnapshot;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Resolves a currently selectable role and its PostgreSQL catalog reference. */
public interface TargetRoleSelectionCatalogPort {
    Optional<SelectableTargetRole> findSelectableRole(UUID organizationId, UUID roleId);

    record SelectableTargetRole(
            UUID catalogReferenceId,
            TargetRoleSnapshot snapshot) {

        public SelectableTargetRole {
            catalogReferenceId = requireIdentity(catalogReferenceId, "catalogReferenceId");
            snapshot = Objects.requireNonNull(snapshot, "snapshot must not be null");
        }

        private static UUID requireIdentity(UUID value, String field) {
            Objects.requireNonNull(value, field + " must not be null");
            if (value.equals(new UUID(0L, 0L))) {
                throw new IllegalArgumentException(field + " must not be the nil UUID");
            }
            return value;
        }
    }

    final class CatalogUnavailableException extends RuntimeException {
        public CatalogUnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
