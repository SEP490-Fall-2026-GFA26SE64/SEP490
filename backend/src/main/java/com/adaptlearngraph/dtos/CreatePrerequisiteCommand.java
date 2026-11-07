package com.adaptlearngraph.dtos;

import com.adaptlearngraph.entities.domain.SkillStatus;

public record CreatePrerequisiteCommand(
        String organizationId,
        String sourceSkillId,
        String targetSkillId,
        String dependentKnowledgeLevel,
        String prerequisiteKnowledgeLevel,
        SkillStatus status) {}
