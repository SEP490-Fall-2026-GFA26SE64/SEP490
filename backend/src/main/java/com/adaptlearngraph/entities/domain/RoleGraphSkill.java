package com.adaptlearngraph.entities.domain;

public record RoleGraphSkill(
        String skillId,
        String skillCode,
        String skillName,
        double targetMastery,
        SkillStatus status,
        String level) {

    public RoleGraphSkill(
            String skillId,
            String skillCode,
            String skillName,
            double targetMastery,
            SkillStatus status) {
        this(skillId, skillCode, skillName, targetMastery, status, null);
    }
}
