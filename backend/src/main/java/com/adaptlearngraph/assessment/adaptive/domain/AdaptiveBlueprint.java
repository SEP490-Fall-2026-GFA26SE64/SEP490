package com.adaptlearngraph.assessment.adaptive.domain;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Immutable adaptive configuration values; eligibility is rechecked through application ports. */
public final class AdaptiveBlueprint {
    private AdaptiveBlueprint() {}

    public record Scope(UUID organizationId, String occupationId) {
        public Scope {
            organizationId = id(organizationId);
            occupationId = text(occupationId);
        }
    }

    /** Total duration only: there is deliberately no seconds-per-question backend default. */
    public record Bounds(int maxQuestions, int timeLimitSeconds) {
        public Bounds {
            positive(maxQuestions);
            positive(timeLimitSeconds);
        }
    }

    public enum ScopePolicy { LEGACY_ROLE_OR_EXPLORATION, FULL_OCCUPATION_V2 }

    /** Dual-format value. Legacy limits are retained only for their original snapshots/receipts. */
    public record Configuration(String name, Bounds exploration, Map<String, Bounds> roles, Bounds occupationBounds) {
        public Configuration(String name, Bounds exploration, Map<String, Bounds> roles) {
            this(name, exploration, roles, null);
        }

        public static Configuration occupation(String name, Bounds bounds) {
            return new Configuration(name, null, Map.of(), Objects.requireNonNull(bounds));
        }

        public Configuration {
            name = text(name);
            roles = roles == null && occupationBounds != null ? Map.of() : Map.copyOf(Objects.requireNonNull(roles));
            roles.keySet().forEach(AdaptiveBlueprint::identifier);
            if (occupationBounds != null) {
                if (exploration != null || !roles.isEmpty()) throw new IllegalArgumentException("Mixed Blueprint scopes");
                if (name.codePointCount(0, name.length()) > 100) throw new IllegalArgumentException("Blueprint name exceeds 100 characters");
                long seconds = occupationBounds.timeLimitSeconds();
                long maximum = occupationBounds.maxQuestions();
                if (seconds < maximum * 30 || seconds > maximum * 120) {
                    throw new IllegalArgumentException("Total duration must allow 30 to 120 seconds per maximum question");
                }
            } else {
                Objects.requireNonNull(exploration, "exploration");
                if (roles.isEmpty()) throw new IllegalArgumentException("Legacy active roles are required");
            }
        }

        public ScopePolicy scopePolicy() {
            return occupationBounds == null ? ScopePolicy.LEGACY_ROLE_OR_EXPLORATION : ScopePolicy.FULL_OCCUPATION_V2;
        }

        public Bounds bounds(Optional<String> originalRole) {
            if (occupationBounds != null) return occupationBounds;
            return originalRole.map(id -> Objects.requireNonNull(roles.get(id), "Unknown pinned Role")).orElse(exploration);
        }
    }

    /** Server-resolved immutable technical identities; never fields editable by L&D. */
    public record VersionPins(UUID modelVersionId, UUID masteryMappingVersionId, UUID parameterSetId) {
        public VersionPins {
            modelVersionId = id(modelVersionId);
            masteryMappingVersionId = id(masteryMappingVersionId);
            parameterSetId = id(parameterSetId);
        }
    }

    public record VersionId(UUID blueprintId, int version) {
        public VersionId {
            blueprintId = id(blueprintId);
            positive(version);
        }
    }

    public record SkillSnapshot(String name, String catalogVersion) {
        public SkillSnapshot {
            name = text(name);
            catalogVersion = text(catalogVersion);
        }
    }

    /** Map keys are stable MicroSkill IDs, deduplicated within this active role. */
    public record RoleSnapshot(String name, String catalogVersion, Map<String, SkillSnapshot> skills) {
        public RoleSnapshot {
            name = text(name);
            catalogVersion = text(catalogVersion);
            skills = Map.copyOf(skills);
            skills.keySet().forEach(AdaptiveBlueprint::identifier);
            if (skills.isEmpty()) throw new IllegalArgumentException("Role skills are required");
        }
    }

    public record Version(Scope scope, VersionId id, Configuration configuration,
                          String occupationNameSnapshot, String catalogFingerprint, VersionPins pins,
                          Map<String, RoleSnapshot> roles, UUID createdBy, Instant createdAt) {
        public Version {
            Objects.requireNonNull(scope, "scope");
            Objects.requireNonNull(id, "id");
            Objects.requireNonNull(configuration, "configuration");
            occupationNameSnapshot = text(occupationNameSnapshot);
            catalogFingerprint = text(catalogFingerprint);
            Objects.requireNonNull(pins, "pins");
            roles = Map.copyOf(roles);
            if (roles.isEmpty() || (configuration.scopePolicy() == ScopePolicy.LEGACY_ROLE_OR_EXPLORATION
                    && !roles.keySet().equals(configuration.roles().keySet()))) {
                throw new IllegalArgumentException("Configuration and active-role snapshots must match");
            }
            createdBy = AdaptiveBlueprint.id(createdBy);
            Objects.requireNonNull(createdAt, "createdAt");
        }
    }

    /** Snapshot of the sole OPEN working revision, not a mutable persistence entity. */
    public record WorkingRevision(Scope scope, UUID blueprintId, UUID workingRevisionId, long revision,
                                  Configuration configuration, UUID updatedBy, Instant updatedAt) {
        public WorkingRevision {
            Objects.requireNonNull(scope, "scope");
            blueprintId = id(blueprintId);
            workingRevisionId = id(workingRevisionId);
            positive(revision);
            Objects.requireNonNull(configuration, "configuration");
            updatedBy = id(updatedBy);
            Objects.requireNonNull(updatedAt, "updatedAt");
        }
    }

    /** Empty current means disabled; version history and already-pinned attempts remain intact. */
    public record Activation(Scope scope, long revision, Optional<VersionId> current,
                             UUID changedBy, Instant changedAt) {
        public Activation {
            Objects.requireNonNull(scope, "scope");
            positive(revision);
            Objects.requireNonNull(current, "current");
            changedBy = id(changedBy);
            Objects.requireNonNull(changedAt, "changedAt");
        }
    }

    private static String text(String value) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Text is required");
        return value.strip();
    }

    private static void identifier(String value) {
        if (!text(value).equals(value)) throw new IllegalArgumentException("ID must be canonical");
    }

    private static UUID id(UUID value) {
        Objects.requireNonNull(value, "id");
        if (value.equals(new UUID(0, 0))) throw new IllegalArgumentException("ID must not be nil");
        return value;
    }

    private static void positive(long value) {
        if (value < 1) throw new IllegalArgumentException("Value must be positive");
    }
}
