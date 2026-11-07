package com.adaptlearngraph.dtos;

import com.adaptlearngraph.entities.domain.PrerequisiteEdge;

public record PrerequisiteResponse(
        String sourceSkillId,
        String sourceSkillCode,
        String sourceSkillName,
        String targetSkillId,
        String targetSkillCode,
        String targetSkillName,
        String dependentKnowledgeLevel,
        String prerequisiteKnowledgeLevel,
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
                edge.dependentKnowledgeLevel()==null?null:edge.dependentKnowledgeLevel().name(),
                edge.prerequisiteKnowledgeLevel()==null?null:edge.prerequisiteKnowledgeLevel().name(),
                edge.status().name(),
                edge.createdAt().toString(),
                edge.updatedAt().toString());
    }
}
