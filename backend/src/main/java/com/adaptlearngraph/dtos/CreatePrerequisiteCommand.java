package com.adaptlearngraph.dtos;

import com.adaptlearngraph.entities.SkillStatus;

public record CreatePrerequisiteCommand(
        String organizationId,
        String sourceSkillId,
        String targetSkillId,
        double minMastery,
        SkillStatus status) {}
