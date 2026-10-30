package com.adaptlearngraph.assessment.adaptive.application.port.out;

import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.RoleSnapshot;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Scope;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.VersionPins;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** Server-only catalog/item boundary; no protected answer data crosses this port. */
public interface AdaptiveBlueprintEligibilityPort {
    /**
     * Empty means Occupation unavailable to this scope. Snapshot includes only active roles and
     * active/complete/validly-mapped items. Pins identify a compatible model/mapping and a promoted
     * parameter set. Fail closed when dependencies or approved technical versions are unavailable.
     * Fingerprint must cover membership/eligibility drift, not merely an Occupation version label.
     */
    Optional<Snapshot> resolve(Scope scope);

    /**
     * Recheck current catalog/item eligibility against an existing Blueprint's exact pins for a
     * new start. Never substitute a newer parameter/model/mapping version. This does not re-resolve
     * an in-progress attempt: it continues from its own immutable snapshot.
     */
    Optional<Snapshot> resolvePinned(Scope scope, VersionPins pins);

    record Snapshot(Scope scope, String occupationName, String catalogFingerprint,
                    VersionPins pins, Map<String, RolePool> roles, Coverage coverage) {
        /** Historical callers do not assert full-Occupation feasibility. */
        public Snapshot(Scope scope, String name, String fingerprint, VersionPins pins, Map<String, RolePool> roles) {
            this(scope, name, fingerprint, pins, roles, null);
        }
        public Snapshot {
            Objects.requireNonNull(scope, "scope");
            if (occupationName == null || occupationName.isBlank()
                    || catalogFingerprint == null || catalogFingerprint.isBlank()) {
                throw new IllegalArgumentException("Catalog name and fingerprint are required");
            }
            Objects.requireNonNull(pins, "pins");
            roles = Map.copyOf(roles);
            if (roles.keySet().stream().anyMatch(key -> key.isBlank() || !key.equals(key.strip()))) {
                throw new IllegalArgumentException("Canonical role IDs are required");
            }
        }

        /** Deduplicate by stable item-version identity; never sum role capacities. */
        public Set<UUID> explorationItemVersionIds() {
            return roles.values().stream().flatMap(role -> role.itemVersionIds().stream())
                    .collect(java.util.stream.Collectors.toUnmodifiableSet());
        }
    }

    /** Answer-free data from the same exact pins/items as Snapshot, never client-provided. */
    record Coverage(int minimumPerSkill, int modelMaxResponses, Map<UUID, String> publishedItemSkills) {
        public Coverage {
            if (minimumPerSkill < 1 || modelMaxResponses < minimumPerSkill) {
                throw new IllegalArgumentException("Invalid pinned coverage limits");
            }
            publishedItemSkills = Map.copyOf(publishedItemSkills);
        }
    }

    /** Both sets are deduplicated; only itemVersionIds have complete pinned parameter coverage. */
    record RolePool(RoleSnapshot role, Set<UUID> itemVersionIds,
                    Set<UUID> missingParameterItemVersionIds) {
        public RolePool {
            Objects.requireNonNull(role, "role");
            itemVersionIds = Set.copyOf(itemVersionIds);
            missingParameterItemVersionIds = Set.copyOf(missingParameterItemVersionIds);
            if (!java.util.Collections.disjoint(itemVersionIds, missingParameterItemVersionIds)) {
                throw new IllegalArgumentException("Eligible and parameter-missing pools must be disjoint");
            }
        }
    }

    final class DependencyUnavailable extends RuntimeException {
        public DependencyUnavailable(String message, Throwable cause) { super(message, cause); }
    }
}
