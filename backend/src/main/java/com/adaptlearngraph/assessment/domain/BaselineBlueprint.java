package com.adaptlearngraph.assessment.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Immutable configuration used to generate one baseline assessment version. */
public record BaselineBlueprint(
        UUID blueprintId,
        int version,
        String name,
        String occupationId,
        String occupationNameSnapshot,
        UUID createdBy,
        String idempotencyKey,
        String requestHash,
        Instant createdAt,
        List<RoleConfig> roles) {

    public BaselineBlueprint {
        Objects.requireNonNull(blueprintId, "blueprintId must not be null");
        if (version < 1) {
            throw new IllegalArgumentException("version must be positive");
        }
        name = requireText(name, "name");
        occupationId = optionalText(occupationId);
        occupationNameSnapshot = optionalText(occupationNameSnapshot);
        if ((occupationId == null) != (occupationNameSnapshot == null)) {
            throw new IllegalArgumentException("occupation ID and name must both be present or absent");
        }
        Objects.requireNonNull(createdBy, "createdBy must not be null");
        idempotencyKey = requireText(idempotencyKey, "idempotencyKey");
        requestHash = requireText(requestHash, "requestHash");
        Objects.requireNonNull(createdAt, "createdAt must not be null");
        roles = List.copyOf(Objects.requireNonNull(roles, "roles must not be null"));
        if (roles.isEmpty()) {
            throw new IllegalArgumentException("roles must not be empty");
        }
        requireUnique(roles.stream().map(RoleConfig::roleId).toList(), "role IDs");
        roles = roles.stream().sorted(Comparator.comparing(RoleConfig::roleId)).toList();
    }

    public record RoleConfig(
            String roleId,
            String roleNameSnapshot,
            boolean enabled,
            BigDecimal easyScoreWeight,
            BigDecimal mediumScoreWeight,
            BigDecimal hardScoreWeight,
            List<SkillConfig> skills) {

        public RoleConfig {
            roleId = requireText(roleId, "roleId");
            roleNameSnapshot = requireText(roleNameSnapshot, "roleNameSnapshot");
            easyScoreWeight = requireWeight(easyScoreWeight, "easyScoreWeight");
            mediumScoreWeight = requireWeight(mediumScoreWeight, "mediumScoreWeight");
            hardScoreWeight = requireWeight(hardScoreWeight, "hardScoreWeight");
            if (easyScoreWeight.add(mediumScoreWeight).add(hardScoreWeight)
                    .compareTo(BigDecimal.ONE) != 0) {
                throw new IllegalArgumentException("role score weights must total one");
            }
            skills = List.copyOf(Objects.requireNonNull(skills, "skills must not be null"));
            if (skills.isEmpty()) {
                throw new IllegalArgumentException("role skills must not be empty");
            }
            requireUnique(skills.stream().map(SkillConfig::microSkillId).toList(), "micro-skill IDs");
            skills = skills.stream().sorted(Comparator.comparing(SkillConfig::microSkillId)).toList();
        }

        public int totalQuestionCount() {
            return Math.toIntExact(skills.stream().mapToLong(SkillConfig::totalQuestionCount).sum());
        }

        /** New Occupation-scoped participation rule; enabled remains a persisted compatibility field. */
        public boolean participates() {
            return totalQuestionCount() > 0;
        }
    }

    public record SkillConfig(
            String microSkillId,
            String microSkillNameSnapshot,
            int easyQuestionCount,
            int mediumQuestionCount,
            int hardQuestionCount) {

        public SkillConfig {
            microSkillId = requireText(microSkillId, "microSkillId");
            microSkillNameSnapshot = requireText(microSkillNameSnapshot, "microSkillNameSnapshot");
            if (easyQuestionCount < 0 || mediumQuestionCount < 0 || hardQuestionCount < 0) {
                throw new IllegalArgumentException("question counts must not be negative");
            }
        }

        public int totalQuestionCount() {
            return Math.addExact(Math.addExact(easyQuestionCount, mediumQuestionCount), hardQuestionCount);
        }
    }

    private static BigDecimal requireWeight(BigDecimal value, String field) {
        Objects.requireNonNull(value, field + " must not be null");
        if (value.compareTo(BigDecimal.ZERO) < 0 || value.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException(field + " must be in [0,1]");
        }
        return value.stripTrailingZeros();
    }

    private static void requireUnique(List<String> values, String label) {
        Set<String> unique = new HashSet<>(values);
        if (unique.size() != values.size()) {
            throw new IllegalArgumentException(label + " must be unique");
        }
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }

    private static String optionalText(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
