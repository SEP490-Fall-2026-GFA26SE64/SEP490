package com.adaptlearngraph.dtos;

import com.adaptlearngraph.entities.domain.SkillStatus;

public record UpdateMicroSkillCommand(
        String organizationId,
        String skillId,
        String name,
        String description,
        SkillStatus status,
        com.adaptlearngraph.entities.domain.SkillProvision provision,
        String expectedVersion) {
    public UpdateMicroSkillCommand(String organizationId, String skillId, String name, String description, SkillStatus status) {
        this(organizationId, skillId, name, description, status, null, null);
    }
}
