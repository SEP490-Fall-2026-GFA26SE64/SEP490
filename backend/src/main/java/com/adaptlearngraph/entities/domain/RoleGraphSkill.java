package com.adaptlearngraph.entities.domain;

public record RoleGraphSkill(
        String skillId,
        String skillCode,
        String skillName,
        java.util.List<String> requiredKnowledgeLevels,
        SkillStatus status,
        String level) {

    public RoleGraphSkill {
        requiredKnowledgeLevels = java.util.List.copyOf(requiredKnowledgeLevels);
        if (new java.util.HashSet<>(requiredKnowledgeLevels).size() != requiredKnowledgeLevels.size())
            throw new IllegalArgumentException("Duplicate knowledge levels");
        requiredKnowledgeLevels.forEach(KnowledgeLevel::valueOf);
    }

    public RoleGraphSkill(String skillId, String skillCode, String skillName, double ignoredLegacyTarget, SkillStatus status, String level) {
        this(skillId, skillCode, skillName, java.util.List.of(), status, level);
    }

    public RoleGraphSkill(
            String skillId,
            String skillCode,
            String skillName,
            double targetMastery,
            SkillStatus status) {
        this(skillId, skillCode, skillName, java.util.List.of(), status, null);
    }
}
