package com.adaptlearngraph.competency.api;

import com.adaptlearngraph.competency.domain.SkillStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

public record CreatePrerequisiteRequest(
        @NotBlank(message = "sourceSkillId cannot be blank")
        String sourceSkillId,

        @NotBlank(message = "targetSkillId cannot be blank")
        String targetSkillId,

        @DecimalMin(value = "0.0", message = "minMastery must be >= 0.0")
        @DecimalMax(value = "1.0", message = "minMastery must be <= 1.0")
        double minMastery,

        SkillStatus status) {}
