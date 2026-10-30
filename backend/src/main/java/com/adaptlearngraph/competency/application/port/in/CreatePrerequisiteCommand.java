package com.adaptlearngraph.competency.application.port.in;

import com.adaptlearngraph.competency.domain.SkillStatus;

public record CreatePrerequisiteCommand(
        String organizationId,
        String sourceSkillId,
        String targetSkillId,
        double minMastery,
        SkillStatus status) {}
