package com.adaptlearngraph.competency.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateMicroSkillRequest(
        @NotBlank(message = "Micro-skill code is required")
        @Size(min = 2, max = 64, message = "Micro-skill code must be between 2 and 64 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Micro-skill code must only contain letters, numbers, hyphens, and underscores")
        String code,

        @NotBlank(message = "Micro-skill name is required")
        @Size(min = 2, max = 128, message = "Micro-skill name must be between 2 and 128 characters")
        String name,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description,

        @Pattern(regexp = "^(KNOWLEDGE|COMMUNICATION|INNOVATION)?$", message = "Macro competency must be KNOWLEDGE, COMMUNICATION, or INNOVATION")
        String macroCompetencyCode) {
}
