package com.adaptlearngraph.catalog.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

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
        String description,

        String version,

        @Pattern(regexp = "^(DRAFT|SENT|REJECTED|ACTIVE|PUBLISHED|RETIRED)?$", message = "Status must be valid")
        String status,

        List<Map<String, Object>> skillTargets) {

    public CreateTargetRoleRequest(
            String code,
            String name,
            String domainCode,
            String familyCode,
            String track,
            String assignedExpertId,
            String description) {
        this(code, name, domainCode, familyCode, track, assignedExpertId, description, "1.0", "DRAFT", List.of());
    }

    public CreateTargetRoleRequest(String code, String name, String familyCode, String track, String description) {
        this(code, name, "ICT", familyCode, track, "", description, "1.0", "DRAFT", List.of());
    }
}


