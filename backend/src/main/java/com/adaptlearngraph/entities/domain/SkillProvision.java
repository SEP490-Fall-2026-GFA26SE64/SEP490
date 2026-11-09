package com.adaptlearngraph.entities.domain;

import java.util.*;

/** Validates the native lists on an owned Skill; it is not a graph node or an achievement. */
public record SkillProvision(List<String> moduleOnlyKnowledgeLevels, List<String> certificateOnlyKnowledgeLevels,
        List<String> foundationOutcomeCodes, List<String> intermediateOutcomeCodes, List<String> advancedOutcomeCodes) {
    public SkillProvision {
        moduleOnlyKnowledgeLevels = levels(moduleOnlyKnowledgeLevels);
        certificateOnlyKnowledgeLevels = levels(certificateOnlyKnowledgeLevels);
        foundationOutcomeCodes = List.of();
        intermediateOutcomeCodes = List.of();
        advancedOutcomeCodes = List.of();
        if (moduleOnlyKnowledgeLevels.stream().anyMatch(certificateOnlyKnowledgeLevels::contains))
            throw new IllegalArgumentException("Module and certificate modes must be disjoint");

    }
    public static SkillProvision empty() { return new SkillProvision(List.of(), List.of(), List.of(), List.of(), List.of()); }
    public static SkillProvision optional(List<String> modules,List<String> certificates,List<String> foundation,List<String> intermediate,List<String> advanced) {
        if (modules == null && certificates == null) return null;
        if (modules == null || certificates == null)
            throw new IllegalArgumentException("Supply both skill provision lists");
        return new SkillProvision(modules,certificates,foundation,intermediate,advanced);
    }
    private static List<String> levels(List<String> values) {
        var result = outcomes(values);
        for (var value : result) KnowledgeLevel.valueOf(value);
        return result;
    }
    private static List<String> outcomes(List<String> values) {
        Objects.requireNonNull(values,"Knowledge configuration list is required");
        if (values.size() > 100 || values.stream().anyMatch(v -> v == null || !v.equals(v.trim()) || v.isBlank() || v.length() > 160)
                || new HashSet<>(values).size() != values.size())
            throw new IllegalArgumentException("Knowledge configuration must contain unique nonblank values (max 100, 160 characters each)");
        return values.stream().sorted().toList();
    }
}
