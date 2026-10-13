package com.adaptlearngraph.competency.domain;

public record RoleGraphSkill(
        String skillId,
        String skillCode,
        String skillName,
        String macroCompetencyCode,
        double targetMastery,
        SkillStatus status) {}
