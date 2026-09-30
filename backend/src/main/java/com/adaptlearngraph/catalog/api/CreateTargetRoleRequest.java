package com.adaptlearngraph.catalog.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateTargetRoleRequest(
        @NotBlank(message = "Role code is required")
        @Size(min = 2, max = 64, message = "Role code must be between 2 and 64 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Role code must only contain letters, numbers, hyphens, and underscores")
        String code,

        @NotBlank(message = "Role name is required")
        @Size(min = 2, max = 128, message = "Role name must be between 2 and 128 characters")
        String name,

        String domainCode,

        String familyCode,

        @Pattern(regexp = "^(PROFESSIONAL|MANAGEMENT)?$", message = "Track must be either PROFESSIONAL or MANAGEMENT")
        String track,

        String assignedExpertId,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description) {

    public CreateTargetRoleRequest(String code, String name, String familyCode, String track, String description) {
        this(code, name, "ICT", familyCode, track, "", description);
    }
}


