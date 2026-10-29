package com.adaptlearngraph.competency.api;

import com.adaptlearngraph.competency.domain.SkillStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateMicroSkillRequest(
        @NotBlank(message = "name cannot be blank")
        @Size(max = 100, message = "name cannot exceed 100 characters")
        String name,

        @Size(max = 1000, message = "description cannot exceed 1000 characters")
        String description,

        String macroCompetencyCode,

        SkillStatus status) {}
