package com.adaptlearngraph.dtos;

public record CreateMicroSkillCommand(
        String organizationId,
        String code,
        String name,
        String description,
        com.adaptlearngraph.entities.domain.SkillProvision provision) {
    public CreateMicroSkillCommand(String organizationId, String code, String name, String description) {
        this(organizationId, code, name, description, null);
    }
}
