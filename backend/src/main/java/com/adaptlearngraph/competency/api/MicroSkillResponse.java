package com.adaptlearngraph.competency.api;

import com.adaptlearngraph.competency.domain.MicroSkill;

import java.time.Instant;

public record MicroSkillResponse(
        String id,
        String organizationId,
        String code,
        String name,
        String description,
        String macroCompetencyCode,
        String status,
        Instant createdAt,
        Instant updatedAt) {

    public static MicroSkillResponse fromDomain(MicroSkill skill) {
        return new MicroSkillResponse(
                skill.getId().toString(),
                skill.getOrganizationId(),
                skill.getCode(),
                skill.getName(),
                skill.getDescription(),
                skill.getMacroCompetencyCode(),
                skill.getStatus().name(),
                skill.getCreatedAt(),
                skill.getUpdatedAt());
    }
}
