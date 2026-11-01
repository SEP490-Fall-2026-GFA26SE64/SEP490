package com.adaptlearngraph.dtos;

import com.adaptlearngraph.entities.SkillStatus;

public record UpdateMicroSkillCommand(
        String organizationId,
        String skillId,
        String name,
        String description,
        String macroCompetencyCode,
        SkillStatus status) {}
