package com.adaptlearngraph.dtos;

import com.adaptlearngraph.entities.domain.SkillStatus;

public record UpdateMicroSkillCommand(
        String organizationId,
        String skillId,
        String name,
        String description,
        SkillStatus status) {}
