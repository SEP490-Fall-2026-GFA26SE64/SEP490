package com.adaptlearngraph.dtos;

public record CreateMicroSkillCommand(
        String organizationId,
        String code,
        String name,
        String description) {
}
