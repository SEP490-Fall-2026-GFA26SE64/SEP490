package com.adaptlearngraph.competency.application.port.in;

public record CreateMicroSkillCommand(
        String organizationId,
        String code,
        String name,
        String description,
        String macroCompetencyCode) {
}
