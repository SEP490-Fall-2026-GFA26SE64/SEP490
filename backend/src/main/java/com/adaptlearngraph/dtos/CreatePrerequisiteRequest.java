package com.adaptlearngraph.dtos;

import jakarta.validation.constraints.NotBlank;

public record CreatePrerequisiteRequest(
        @NotBlank(message = "sourceSkillId cannot be blank")
        String sourceSkillId,

        @NotBlank(message = "targetSkillId cannot be blank")
        String targetSkillId,

        @NotBlank String dependentKnowledgeLevel,
        @NotBlank String prerequisiteKnowledgeLevel,

        SkillStatusDto status) {}
