package com.adaptlearngraph.competency.domain;

public record RoleGraphSkill(
        String skillId,
        String skillCode,
        String skillName,
        String macroCompetencyCode,
        double targetMastery,
        SkillStatus status,
        String level) {

    public RoleGraphSkill(
            String skillId,
            String skillCode,
            String skillName,
            String macroCompetencyCode,
            double targetMastery,
            SkillStatus status) {
        this(skillId, skillCode, skillName, macroCompetencyCode, targetMastery, status, null);
    }
}
