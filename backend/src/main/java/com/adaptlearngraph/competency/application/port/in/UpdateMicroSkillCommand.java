package com.adaptlearngraph.competency.application.port.in;

import com.adaptlearngraph.competency.domain.SkillStatus;

public record UpdateMicroSkillCommand(
        String organizationId,
        String skillId,
        String name,
        String description,
        String macroCompetencyCode,
        SkillStatus status) {}
