package com.adaptlearngraph.competency.domain;

public enum SkillStatus {
    ACTIVE,
    DRAFT,
    RETIRED;

    public static SkillStatus fromString(String status) {
        if (status == null || status.isBlank()) {
            return ACTIVE;
        }
        return SkillStatus.valueOf(status.trim().toUpperCase());
    }
}
