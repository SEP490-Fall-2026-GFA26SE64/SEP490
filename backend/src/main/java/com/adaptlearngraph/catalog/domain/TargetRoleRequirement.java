package com.adaptlearngraph.catalog.domain;

/** Active micro-skill requirement belonging to a catalog-valid target role. */
public record TargetRoleRequirement(
        String skillId,
        String skillCode,
        String skillName,
        double targetMastery) {

    public TargetRoleRequirement {
        skillId = requireText(skillId, "skillId");
        skillCode = requireText(skillCode, "skillCode");
        skillName = requireText(skillName, "skillName");
        if (!Double.isFinite(targetMastery) || targetMastery < 0.0 || targetMastery > 1.0) {
            throw new IllegalArgumentException("targetMastery must be a finite value in [0,1]");
        }
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }
}
