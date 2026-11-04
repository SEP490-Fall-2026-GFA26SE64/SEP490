package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.AdaptiveBlueprint.RoleSnapshot;
import com.adaptlearngraph.entities.domain.AdaptiveBlueprint.Scope;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/** Authorized published catalog projection. No learner state or another owner's DTO crosses it. */
public interface AdaptiveBaselineCatalogPort {
    Optional<CatalogSnapshot> findAvailable(Scope scope);

    /** Fingerprint includes active membership paths, not merely the JobPosition version label. */
    record CatalogSnapshot(Scope scope, String jobPositionName, String fingerprint,
                           Map<String, RoleSnapshot> roles) {
        public CatalogSnapshot {
            Objects.requireNonNull(scope, "scope");
            if (jobPositionName == null || jobPositionName.isBlank() || fingerprint == null || fingerprint.isBlank()) {
                throw new IllegalArgumentException("Catalog name and fingerprint required");
            }
            roles = Map.copyOf(roles);
        }
    }
}
