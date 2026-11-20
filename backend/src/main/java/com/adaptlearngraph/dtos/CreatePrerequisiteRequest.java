package com.adaptlearngraph.dtos;

import jakarta.validation.constraints.NotBlank;

public record CreatePrerequisiteRequest(
        @NotBlank(message = "sourceSkillId cannot be blank")
        String sourceSkillId,

        @NotBlank(message = "targetSkillId cannot be blank")
        String targetSkillId,

        String dependentKnowledgeLevel,
        String prerequisiteKnowledgeLevel,

        SkillStatusDto status) {
    public CreatePrerequisiteRequest(String sourceSkillId, String targetSkillId, SkillStatusDto status) {
        this(sourceSkillId, targetSkillId, null, null, status);
    }
}
