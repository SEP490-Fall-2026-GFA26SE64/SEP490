package com.adaptlearngraph.competency.api;

import com.adaptlearngraph.competency.domain.PrerequisiteEdge;

public record PrerequisiteResponse(
        String sourceSkillId,
        String sourceSkillCode,
        String sourceSkillName,
        String targetSkillId,
        String targetSkillCode,
        String targetSkillName,
        double minMastery,
        String status,
        String createdAt,
        String updatedAt) {

    public static PrerequisiteResponse fromDomain(PrerequisiteEdge edge) {
        return new PrerequisiteResponse(
                edge.sourceSkillId(),
                edge.sourceSkillCode(),
                edge.sourceSkillName(),
                edge.targetSkillId(),
                edge.targetSkillCode(),
                edge.targetSkillName(),
                edge.minMastery(),
                edge.status().name(),
                edge.createdAt().toString(),
                edge.updatedAt().toString());
    }
}
